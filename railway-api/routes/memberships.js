const express = require("express");
const { getPool } = require("../db");
const { json } = require("../lib/http");
const { PLAN_TO_COURSE } = require("../lib/config");
const { requireInternalSecret } = require("../lib/session");
const { getMemberProfileByEmail } = require("../lib/members");

const router = express.Router();

router.post("/api/memberships/start", requireInternalSecret, async (req, res) => {
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

router.get("/api/memberships/status", requireInternalSecret, async (req, res) => {
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

router.post("/api/memberships/unsubscribe", requireInternalSecret, async (req, res) => {
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

module.exports = router;
