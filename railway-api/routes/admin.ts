const express = require("express");
const { getPool } = require("../db");
const { json } = require("../lib/http");
const { isAdminEmail } = require("../lib/config");
const { requireInternalSecret, getAuthenticatedAdmin } = require("../lib/session");
const { getAdminDashboardMembers } = require("../lib/members");

const router = express.Router();

router.get("/api/admin/members", requireInternalSecret, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const { authUser, error, status } = await getAuthenticatedAdmin(client, req, isAdminEmail);
    if (!authUser) {
      return json(res, status || 403, { error: error || "Admin access required." });
    }

    const dashboard = await getAdminDashboardMembers(client);
    return json(res, 200, {
      ok: true,
      summary: dashboard.summary,
      members: dashboard.members,
    });
  } catch (error) {
    return json(res, 500, { error: "Unable to load admin members.", details: error.message });
  } finally {
    client.release();
  }
});

router.post("/api/admin/revoke", requireInternalSecret, async (req, res) => {
  const userId = String(req.body?.userId || "").trim();
  if (!userId) {
    return json(res, 400, { error: "userId is required." });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const { authUser, error, status } = await getAuthenticatedAdmin(client, req, isAdminEmail);
    if (!authUser) {
      await client.query("rollback");
      return json(res, status || 403, { error: error || "Admin access required." });
    }

    const subscriptionResult = await client.query(
      `
        select id
        from subscriptions
        where user_id = $1 and status in ('pending', 'active', 'past_due')
        order by created_at desc
        limit 1
      `,
      [userId]
    );

    const subscriptionId = subscriptionResult.rows[0]?.id || null;

    if (subscriptionId) {
      await client.query(
        `
          update subscriptions
          set status = 'cancelled',
              cancelled_at = now(),
              updated_at = now()
          where id = $1
        `,
        [subscriptionId]
      );
    }

    await client.query(
      `
        update course_access
        set access_status = 'revoked',
            revoked_at = now()
        where user_id = $1 and access_status <> 'revoked'
      `,
      [userId]
    );

    await client.query("commit");
    return json(res, 200, { ok: true, userId, subscriptionId, status: "revoked" });
  } catch (error) {
    await client.query("rollback");
    return json(res, 500, { error: "Unable to revoke access.", details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
