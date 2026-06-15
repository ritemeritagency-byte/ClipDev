const express = require("express");
const { getPool } = require("../db");
const { json } = require("../lib/http");
const { COURSE_CLUB_LAUNCH_OFFER } = require("../lib/config");
const { requireInternalSecret } = require("../lib/session");

const router = express.Router();

router.get("/api/offers/course-club-launch", requireInternalSecret, async (_req, res) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
        select count(distinct p.user_id)::int as redeemed
        from payments p
        join subscriptions s on s.id = p.subscription_id
        join subscription_plans sp on sp.id = s.plan_id
        where sp.plan_code = $1
          and p.status = 'paid'
      `,
      [COURSE_CLUB_LAUNCH_OFFER.planCode]
    );

    const redeemed = Number(result.rows[0]?.redeemed || 0);
    const remaining = Math.max(0, COURSE_CLUB_LAUNCH_OFFER.maxRedemptions - redeemed);

    return json(res, 200, {
      active: remaining > 0,
      redeemed,
      remaining,
      maxRedemptions: COURSE_CLUB_LAUNCH_OFFER.maxRedemptions,
      discountPercent: COURSE_CLUB_LAUNCH_OFFER.discountPercent,
      regularAmount: COURSE_CLUB_LAUNCH_OFFER.regularAmountCents,
      discountedAmount: COURSE_CLUB_LAUNCH_OFFER.discountedAmountCents,
      currency: COURSE_CLUB_LAUNCH_OFFER.currency,
    });
  } catch (error) {
    return json(res, 500, { error: "Unable to load launch offer.", details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
