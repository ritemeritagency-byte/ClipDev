const { sendJson } = require("../../lib/http");
const { forwardToRailway } = require("../../lib/railway");
const { SESSION_COOKIE_NAME, parseCookieHeader } = require("../../lib/cookies");

module.exports = async (req, res) => {
  const action = String(req.query?.action || "").trim().toLowerCase();

  if (action === "me") {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return sendJson(res, 405, { error: "Method not allowed." });
    }

    const cookies = parseCookieHeader(req.headers.cookie || "");
    const sessionToken = cookies[SESSION_COOKIE_NAME] || "";
    if (!sessionToken) {
      return sendJson(res, 401, { error: "Not authenticated." });
    }

    try {
      const railwayResponse = await forwardToRailway("/api/auth/me", undefined, {
        method: "GET",
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
        },
      });

      return sendJson(res, railwayResponse.status, railwayResponse.payload);
    } catch (error) {
      return sendJson(res, 500, { error: "Unable to reach the Railway auth API.", details: error.message });
    }
  }

  if (action === "profile") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJson(res, 405, { error: "Method not allowed." });
    }

    const cookies = parseCookieHeader(req.headers.cookie || "");
    const sessionToken = cookies[SESSION_COOKIE_NAME] || "";
    if (!sessionToken) {
      return sendJson(res, 401, { error: "Not authenticated." });
    }

    try {
      const railwayResponse = await forwardToRailway("/api/auth/profile", req.body || {}, {
        method: "POST",
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
        },
      });

      return sendJson(res, railwayResponse.status, railwayResponse.payload);
    } catch (error) {
      return sendJson(res, 500, { error: "Unable to reach the Railway auth API.", details: error.message });
    }
  }

  return sendJson(res, 404, { error: "Not found." });
};
