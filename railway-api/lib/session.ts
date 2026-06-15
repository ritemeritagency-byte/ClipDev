const { createSessionToken, hashSessionToken } = require("../auth");
const { json } = require("./http");
const { SESSION_DURATION_DAYS } = require("./config");

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

const getAuthenticatedAdmin = async (client, req, isAdminEmail) => {
  const authUser = await getAuthenticatedUser(client, req);
  if (!authUser) return { error: "Not authenticated.", status: 401 };
  if (!isAdminEmail(authUser.email)) return { error: "Admin access required.", status: 403 };
  return { authUser };
};

module.exports = {
  requireInternalSecret,
  getSessionTokenFromHeaders,
  createSessionForUser,
  getAuthenticatedUser,
  getAuthenticatedAdmin,
};
