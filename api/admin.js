const { sendJson } = require("../lib/http");
const { forwardToRailway } = require("../lib/railway");
const { SESSION_COOKIE_NAME, parseCookieHeader } = require("../lib/cookies");

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const cookies = parseCookieHeader(req.headers.cookie || "");
  const sessionToken = cookies[SESSION_COOKIE_NAME] || "";
  if (!sessionToken) {
    return sendJson(res, 401, { error: "Not authenticated." });
  }

  const headers = {
    Cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
  };

  try {
    if (req.method === "GET") {
      const railwayResponse = await forwardToRailway("/api/admin/members", undefined, {
        method: "GET",
        headers,
      });

      return sendJson(res, railwayResponse.status, railwayResponse.payload);
    }

    const userId = String(req.body?.userId || "").trim();
    if (!userId) {
      return sendJson(res, 400, { error: "userId is required." });
    }

    const railwayResponse = await forwardToRailway(
      "/api/admin/revoke",
      { userId },
      {
        method: "POST",
        headers,
      }
    );

    return sendJson(res, railwayResponse.status, railwayResponse.payload);
  } catch (error) {
    return sendJson(res, 500, { error: "Unable to reach the Railway admin API.", details: error.message });
  }
};
