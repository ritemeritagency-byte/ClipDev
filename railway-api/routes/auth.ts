const express = require("express");
const { getPool } = require("../db");
const { hashPassword, verifyPassword, hashSessionToken } = require("../auth");
const { json } = require("../lib/http");
const { normalizeAccountType } = require("../lib/config");
const {
  requireInternalSecret,
  createSessionForUser,
  getAuthenticatedUser,
  getSessionTokenFromHeaders,
} = require("../lib/session");
const { getMemberProfileByEmail } = require("../lib/members");

const router = express.Router();

router.post("/api/auth/signup", requireInternalSecret, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const fullName = String(req.body?.fullName || "").trim();
  const password = String(req.body?.password || "");
  const accountType = normalizeAccountType(req.body?.accountType);
  const agencyName = String(req.body?.agencyName || "").trim();
  const goals = String(req.body?.goals || "").trim();
  const avatarUrl = String(req.body?.avatarUrl || "").trim();

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
      await client.query(
        `
          update users
          set account_type = $2,
              agency_name = $3,
              goals = $4,
              avatar_url = $5,
              updated_at = now()
          where id = $1
        `,
        [userId, accountType, agencyName || null, goals || null, avatarUrl || null]
      );
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
              account_type = coalesce($4, account_type),
              agency_name = $5,
              goals = $6,
              avatar_url = $7,
              updated_at = now()
          where id = $1
        `,
        [user.id, fullName, hashPassword(password), accountType, agencyName || null, goals || null, avatarUrl || null]
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

router.post("/api/auth/profile", requireInternalSecret, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const authUser = await getAuthenticatedUser(client, req);
    if (!authUser) {
      await client.query("rollback");
      return json(res, 401, { error: "Not authenticated." });
    }

    const fullName = String(req.body?.fullName || "").trim();
    const accountType = normalizeAccountType(req.body?.accountType);
    const agencyName = String(req.body?.agencyName || "").trim();
    const goals = String(req.body?.goals || "").trim();
    const avatarUrl = String(req.body?.avatarUrl || "").trim();

    if (!fullName) {
      await client.query("rollback");
      return json(res, 400, { error: "Full name is required." });
    }

    await client.query(
      `
        update users
        set full_name = $2,
            account_type = $3,
            agency_name = $4,
            goals = $5,
            avatar_url = $6,
            updated_at = now()
        where id = $1
      `,
      [authUser.id, fullName, accountType, agencyName || null, goals || null, avatarUrl || null]
    );

    const user = await getMemberProfileByEmail(client, authUser.email);
    await client.query("commit");
    return json(res, 200, { ok: true, user });
  } catch (error) {
    await client.query("rollback");
    return json(res, 500, { error: "Unable to update profile.", details: error.message });
  } finally {
    client.release();
  }
});

router.post("/api/auth/login", requireInternalSecret, async (req, res) => {
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

router.get("/api/auth/me", requireInternalSecret, async (req, res) => {
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

router.post("/api/auth/logout", requireInternalSecret, async (req, res) => {
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

module.exports = router;
