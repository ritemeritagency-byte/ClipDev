const { sendJson } = require("../../lib/http");
const { forwardToRailway } = require("../../lib/railway");
const { SESSION_COOKIE_NAME, parseCookieHeader, serializeCookie } = require("../../lib/cookies");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const cookies = parseCookieHeader(req.headers.cookie || "");
  const sessionToken = cookies[SESSION_COOKIE_NAME] || "";

  try {
    if (sessionToken) {
      await forwardToRailway("/api/auth/logout", undefined, {
        method: "POST",
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
        },
      });
    }

    res.setHeader(
      "Set-Cookie",
      serializeCookie(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        maxAge: 0,
        path: "/",
        sameSite: "Lax",
        secure: true,
      })
    );

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return sendJson(res, 500, { error: "Unable to log out.", details: error.message });
  }
};
