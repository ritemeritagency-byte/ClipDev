const express = require("express");
const { getPool } = require("../db");
const { json } = require("../lib/http");
const { PLAN_TO_COURSE } = require("../lib/config");
const { requireInternalSecret } = require("../lib/session");

const router = express.Router();

router.post("/api/paymongo/webhook", requireInternalSecret, async (req, res) => {
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

module.exports = router;
