const { sendJson } = require("../../lib/http");
const { forwardToRailway } = require("../../lib/railway");
const { SESSION_COOKIE_NAME, parseCookieHeader } = require("../../lib/cookies");
const { buildSignedBunnyEmbedUrl, getBunnyLibraryId, getBunnyTokenKey } = require("../../lib/bunny");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const videoId = String(req.query?.videoId || "").trim();
  if (!videoId) {
    return sendJson(res, 400, { error: "Video ID is required." });
  }

  if (!getBunnyLibraryId() || !getBunnyTokenKey()) {
    return sendJson(res, 503, { error: "Bunny Stream is not configured yet." });
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

    if (!railwayResponse.ok) {
      return sendJson(res, railwayResponse.status, railwayResponse.payload);
    }

    const user = railwayResponse.payload?.user || null;
    const hasActiveAccess = Array.isArray(user?.access)
      ? user.access.some((item) => item?.accessStatus === "active")
      : false;
    const isActive = hasActiveAccess || user?.subscriptionStatus === "active";

    if (!isActive) {
      return sendJson(res, 403, { error: "Active membership required." });
    }

    const expires = Math.floor(Date.now() / 1000) + 60 * 30;
    const embedUrl = buildSignedBunnyEmbedUrl(videoId, expires);
    if (!embedUrl) {
      return sendJson(res, 500, { error: "Unable to prepare the Bunny player." });
    }

    return sendJson(res, 200, {
      embedUrl,
      expires,
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: "Unable to prepare the library player right now.",
      details: error.message,
    });
  }
};
