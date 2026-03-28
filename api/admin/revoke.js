const { sendJson } = require("../_lib/http");
const { forwardToRailway } = require("../_lib/railway");
const { SESSION_COOKIE_NAME, parseCookieHeader } = require("../_lib/cookies");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const cookies = parseCookieHeader(req.headers.cookie || "");
  const sessionToken = cookies[SESSION_COOKIE_NAME] || "";
  if (!sessionToken) {
    return sendJson(res, 401, { error: "Not authenticated." });
  }

  const userId = String(req.body?.userId || "").trim();
  if (!userId) {
    return sendJson(res, 400, { error: "userId is required." });
  }

  try {
    const railwayResponse = await forwardToRailway(
      "/api/admin/revoke",
      { userId },
      {
        method: "POST",
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
        },
      }
    );

    return sendJson(res, railwayResponse.status, railwayResponse.payload);
  } catch (error) {
    return sendJson(res, 500, { error: "Unable to reach the Railway admin API.", details: error.message });
  }
};
