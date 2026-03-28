const express = require("express");
const { getPool } = require("./db");
const {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} = require("./auth");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_DURATION_DAYS = 30;

const PLAN_TO_COURSE = {
  courseClubMonthly: "course-club",
  flagshipCourseOneTime: "flagship-course",
};

const json = (res, status, payload) => res.status(status).json(payload);

const requireInternalSecret = (req, res, next) => {
  const expected = process.env.RAILWAY_INTERNAL_SECRET || "";
  if (!expected) return next();

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token !== expected) {
    return json(res, 401, { error: "Unauthorized." });
  }

  return next();
};

const getSessionTokenFromHeaders = (req) =>
  String(
    req.headers["x-session-token"] ||
      req.headers["x-clipdevs-session"] ||
      String(req.headers.cookie || "")
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("clipdevs_session="))
        ?.split("=")
        .slice(1)
        .join("=") ||
      ""
  ).trim();

const createSessionForUser = async (client, userId) => {
  const sessionToken = createSessionToken();
  const tokenHash = hashSessionToken(sessionToken);

  await client.query(
    `
      insert into user_sessions (user_id, token_hash, expires_at)
      values ($1, $2, now() + interval '30 days')
    `,
    [userId, tokenHash]
  );

  return {
    sessionToken,
    expiresInDays: SESSION_DURATION_DAYS,
  };
};

const getMemberProfileByEmail = async (client, email) => {
  const result = await client.query(
    `
      select
        u.id as user_id,
        u.email,
        u.full_name,
        u.status as account_status,
        s.id as subscription_id,
        s.status as subscription_status,
        s.current_period_end,
        p.plan_code,
        p.display_name,
        coalesce(
          json_agg(
            json_build_object(
              'courseSlug', ca.course_slug,
              'accessStatus', ca.access_status,
              'grantedAt', ca.granted_at,
              'revokedAt', ca.revoked_at
            )
          ) filter (where ca.id is not null),
          '[]'::json
        ) as access
      from users u
      left join subscriptions s on s.user_id = u.id and s.status in ('pending', 'active', 'past_due')
      left join subscription_plans p on p.id = s.plan_id
      left join course_access ca on ca.user_id = u.id
      where u.email = $1
      group by u.id, s.id, p.plan_code, p.display_name
      order by s.created_at desc nulls last
      limit 1
    `,
    [email]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    id: row.user_id,
    email: row.email,
    fullName: row.full_name,
    accountStatus: row.account_status,
    subscriptionId: row.subscription_id,
    subscriptionStatus: row.subscription_status,
    currentPeriodEnd: row.current_period_end,
    planCode: row.plan_code,
    planName: row.display_name,
    access: row.access,
  };
};

const getAuthenticatedUser = async (client, req) => {
  const sessionToken = getSessionTokenFromHeaders(req);
  if (!sessionToken) return null;

  const tokenHash = hashSessionToken(sessionToken);
  const result = await client.query(
    `
      select u.id, u.email, u.full_name, u.status, s.id as session_id
      from user_sessions s
      join users u on u.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
      limit 1
    `,
    [tokenHash]
  );

  if (!result.rows.length) return null;

  await client.query(
    `
      update user_sessions
      set last_used_at = now()
      where id = $1
    `,
    [result.rows[0].session_id]
  );

  return result.rows[0];
};

app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    const pool = getPool();
    await pool.query("select 1");
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
});

app.post("/api/auth/signup", requireInternalSecret, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const fullName = String(req.body?.fullName || "").trim();
  const password = String(req.body?.password || "");

  if (!email || !email.includes("@")) {
    return json(res, 400, { error: "Valid email is required." });
  }

  if (!fullName) {
    return json(res, 400, { error: "Full name is required." });
  }

  if (password.length < 8) {
    return json(res, 400, { error: "Password must be at least 8 characters." });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const existingUser = await client.query(
      `
        select id, password_hash
        from users
        where email = $1
        limit 1
      `,
      [email]
    );

    let userId;
    if (!existingUser.rows.length) {
      const createdUser = await client.query(
        `
          insert into users (email, full_name, password_hash)
          values ($1, $2, $3)
          returning id
        `,
        [email, fullName, hashPassword(password)]
      );
      userId = createdUser.rows[0].id;
    } else {
      const user = existingUser.rows[0];
      if (user.password_hash) {
        await client.query("rollback");
        return json(res, 409, { error: "An account already exists for this email. Please log in instead." });
      }

      await client.query(
        `
          update users
          set full_name = $2,
              password_hash = $3,
              updated_at = now()
          where id = $1
        `,
        [user.id, fullName, hashPassword(password)]
      );
      userId = user.id;
    }

    const session = await createSessionForUser(client, userId);
    const member = await getMemberProfileByEmail(client, email);

    await client.query("commit");
    return json(res, 200, {
      ok: true,
      sessionToken: session.sessionToken,
      expiresInDays: session.expiresInDays,
      user: member,
    });
  } catch (error) {
    await client.query("rollback");
    return json(res, 500, { error: "Unable to create account.", details: error.message });
  } finally {
    client.release();
  }
});

app.post("/api/auth/login", requireInternalSecret, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !email.includes("@")) {
    return json(res, 400, { error: "Valid email is required." });
  }

  if (!password) {
    return json(res, 400, { error: "Password is required." });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const userResult = await client.query(
      `
        select id, email, password_hash, status
        from users
        where email = $1
        limit 1
      `,
      [email]
    );

    if (!userResult.rows.length) {
      await client.query("rollback");
      return json(res, 401, { error: "Invalid email or password." });
    }

    const user = userResult.rows[0];
    if (user.status !== "active") {
      await client.query("rollback");
      return json(res, 403, { error: "This account is not active." });
    }

    if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
      await client.query("rollback");
      return json(res, 401, { error: "Invalid email or password." });
    }

    const session = await createSessionForUser(client, user.id);
    const member = await getMemberProfileByEmail(client, email);

    await client.query("commit");
    return json(res, 200, {
      ok: true,
      sessionToken: session.sessionToken,
      expiresInDays: session.expiresInDays,
      user: member,
    });
  } catch (error) {
    await client.query("rollback");
    return json(res, 500, { error: "Unable to log in.", details: error.message });
  } finally {
    client.release();
  }
});

app.get("/api/auth/me", requireInternalSecret, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const authUser = await getAuthenticatedUser(client, req);
    if (!authUser) {
      return json(res, 401, { error: "Not authenticated." });
    }

    const member = await getMemberProfileByEmail(client, authUser.email);
    return json(res, 200, {
      ok: true,
      user: member,
    });
  } catch (error) {
    return json(res, 500, { error: "Unable to fetch account.", details: error.message });
  } finally {
    client.release();
  }
});

app.post("/api/auth/logout", requireInternalSecret, async (req, res) => {
  const sessionToken = getSessionTokenFromHeaders(req);
  if (!sessionToken) {
    return json(res, 200, { ok: true });
  }

  try {
    const pool = getPool();
    await pool.query(
      `
        update user_sessions
        set revoked_at = now()
        where token_hash = $1 and revoked_at is null
      `,
      [hashSessionToken(sessionToken)]
    );

    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { error: "Unable to log out.", details: error.message });
  }
});

app.post("/api/memberships/start", requireInternalSecret, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const fullName = String(req.body?.fullName || "").trim();
  const planCode = String(req.body?.planCode || "").trim();

  if (!email || !email.includes("@")) {
    return json(res, 400, { error: "Valid email is required." });
  }

  if (!fullName) {
    return json(res, 400, { error: "Full name is required." });
  }

  if (!planCode) {
    return json(res, 400, { error: "Plan code is required." });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const userResult = await client.query(
      `
        insert into users (email, full_name)
        values ($1, $2)
        on conflict (email) do update
        set full_name = excluded.full_name,
            updated_at = now()
        returning id, email, full_name
      `,
      [email, fullName]
    );

    const planResult = await client.query(
      `
        select id, plan_code, display_name, billing_interval, amount_cents, currency
        from subscription_plans
        where plan_code = $1 and is_active = true
        limit 1
      `,
      [planCode]
    );

    if (!planResult.rows.length) {
      await client.query("rollback");
      return json(res, 404, { error: "Plan not found." });
    }

    const user = userResult.rows[0];
    const plan = planResult.rows[0];

    const existingActive = await client.query(
      `
        select s.id, s.status, s.current_period_end
        from subscriptions s
        where s.user_id = $1 and s.plan_id = $2 and s.status in ('pending', 'active')
        order by s.created_at desc
        limit 1
      `,
      [user.id, plan.id]
    );

    let subscription = existingActive.rows[0];
    if (!subscription) {
      const insertSubscription = await client.query(
        `
          insert into subscriptions (user_id, plan_id, status)
          values ($1, $2, 'pending')
          returning id, status, created_at
        `,
        [user.id, plan.id]
      );
      subscription = insertSubscription.rows[0];
    }

    await client.query(
      `
        insert into course_access (user_id, course_slug, access_status, subscription_id)
        values ($1, $2, 'pending', $3)
        on conflict (user_id, course_slug) do update
        set access_status = 'pending',
            subscription_id = excluded.subscription_id,
            revoked_at = null
      `,
      [user.id, PLAN_TO_COURSE[plan.plan_code] || plan.plan_code, subscription.id]
    );

    await client.query("commit");
    return json(res, 200, {
      ok: true,
      user,
      subscription,
      plan,
    });
  } catch (error) {
    await client.query("rollback");
    return json(res, 500, { error: "Unable to start membership.", details: error.message });
  } finally {
    client.release();
  }
});

app.get("/api/memberships/status", requireInternalSecret, async (req, res) => {
  const email = String(req.query?.email || "").trim().toLowerCase();
  if (!email) {
    return json(res, 400, { error: "Email is required." });
  }

  try {
    const pool = getPool();
    const member = await getMemberProfileByEmail(pool, email);
    if (!member) {
      return json(res, 404, { error: "Member not found." });
    }

    return json(res, 200, {
      ok: true,
      member,
    });
  } catch (error) {
    return json(res, 500, { error: "Unable to fetch membership status.", details: error.message });
  }
});

app.post("/api/memberships/unsubscribe", requireInternalSecret, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const subscriptionId = String(req.body?.subscriptionId || "").trim();

  if (!email && !subscriptionId) {
    return json(res, 400, { error: "Provide email or subscriptionId." });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const subscriptionResult = await client.query(
      `
        select s.id, s.user_id
        from subscriptions s
        join users u on u.id = s.user_id
        where ($1 <> '' and u.email = $1) or ($2 <> '' and s.id::text = $2)
        order by s.created_at desc
        limit 1
      `,
      [email, subscriptionId]
    );

    if (!subscriptionResult.rows.length) {
      await client.query("rollback");
      return json(res, 404, { error: "Subscription not found." });
    }

    const subscription = subscriptionResult.rows[0];

    await client.query(
      `
        update subscriptions
        set status = 'cancelled',
            cancelled_at = now(),
            updated_at = now()
        where id = $1
      `,
      [subscription.id]
    );

    await client.query(
      `
        update course_access
        set access_status = 'revoked',
            revoked_at = now()
        where subscription_id = $1
      `,
      [subscription.id]
    );

    await client.query("commit");
    return json(res, 200, { ok: true, subscriptionId: subscription.id, status: "cancelled" });
  } catch (error) {
    await client.query("rollback");
    return json(res, 500, { error: "Unable to unsubscribe member.", details: error.message });
  } finally {
    client.release();
  }
});

app.post("/api/paymongo/webhook", requireInternalSecret, async (req, res) => {
  const event = req.body || {};
  const eventType = String(event.eventType || "unknown");
  const metadata = event.metadata || {};
  const planCode = String(metadata.course_id || "").trim() || "courseClubMonthly";

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(
      `
        insert into webhook_events (provider, provider_event_id, event_type, payload, processed_at)
        values ($1, $2, $3, $4::jsonb, now())
      `,
      [event.provider || "paymongo", event.resourceId || null, eventType, JSON.stringify(event)]
    );

    if (!["payment.paid", "checkout_session.payment.paid"].includes(eventType)) {
      await client.query("commit");
      return json(res, 200, { ok: true, ignored: true, eventType });
    }

    const paidEmail = String(metadata.email || metadata.customer_email || "").trim().toLowerCase();
    if (!paidEmail) {
      await client.query("commit");
      return json(res, 200, { ok: true, ignored: true, reason: "No email in metadata." });
    }

    const userResult = await client.query(
      `
        insert into users (email, full_name)
        values ($1, $2)
        on conflict (email) do update
        set updated_at = now()
        returning id, email
      `,
      [paidEmail, metadata.full_name || paidEmail]
    );

    const user = userResult.rows[0];
    const planResult = await client.query(
      `select id, plan_code from subscription_plans where plan_code = $1 limit 1`,
      [planCode]
    );

    if (!planResult.rows.length) {
      await client.query("commit");
      return json(res, 200, { ok: true, ignored: true, reason: "Plan not found." });
    }

    const plan = planResult.rows[0];
    const subscriptionResult = await client.query(
      `
        select id
        from subscriptions
        where user_id = $1 and plan_id = $2 and status in ('pending', 'active', 'past_due')
        order by created_at desc
        limit 1
      `,
      [user.id, plan.id]
    );

    let subscriptionId = subscriptionResult.rows[0]?.id || null;
    if (!subscriptionId) {
      const newSubscription = await client.query(
        `
          insert into subscriptions (
            user_id,
            plan_id,
            provider_checkout_id,
            status,
            starts_at,
            current_period_end
          )
          values ($1, $2, $3, 'active', now(), now() + interval '30 days')
          returning id
        `,
        [user.id, plan.id, event.resourceId || null]
      );
      subscriptionId = newSubscription.rows[0].id;
    } else {
      await client.query(
        `
          update subscriptions
          set status = 'active',
              provider_checkout_id = coalesce($2, provider_checkout_id),
              starts_at = coalesce(starts_at, now()),
              current_period_end = now() + interval '30 days',
              updated_at = now()
          where id = $1
        `,
        [subscriptionId, event.resourceId || null]
      );
    }

    await client.query(
      `
        insert into payments (
          user_id,
          subscription_id,
          provider,
          provider_event_id,
          provider_payment_id,
          provider_checkout_id,
          amount_cents,
          currency,
          status,
          raw_payload,
          paid_at
        )
        values ($1, $2, 'paymongo', $3, $4, $5, $6, $7, 'paid', $8::jsonb, $9)
      `,
      [
        user.id,
        subscriptionId,
        event.resourceId || null,
        event.resourceId || null,
        event.resourceId || null,
        Number(event.amount || 0),
        event.currency || "PHP",
        JSON.stringify(event.raw || event),
        event.paidAt || new Date().toISOString(),
      ]
    );

    await client.query(
      `
        insert into course_access (user_id, course_slug, access_status, subscription_id, granted_at, revoked_at)
        values ($1, $2, 'active', $3, now(), null)
        on conflict (user_id, course_slug) do update
        set access_status = 'active',
            subscription_id = excluded.subscription_id,
            granted_at = now(),
            revoked_at = null
      `,
      [user.id, PLAN_TO_COURSE[plan.plan_code] || plan.plan_code, subscriptionId]
    );

    await client.query("commit");
    return json(res, 200, { ok: true, processed: true, eventType, email: paidEmail });
  } catch (error) {
    await client.query("rollback");
    return json(res, 500, { error: "Unable to process webhook.", details: error.message });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`Railway API listening on port ${PORT}`);
});
