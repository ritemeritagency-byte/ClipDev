const { sendJson } = require("../_lib/http");
const { forwardToRailway } = require("../_lib/railway");
const { SESSION_COOKIE_NAME, serializeCookie } = require("../_lib/cookies");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const email = (req.body?.email || "").trim().toLowerCase();
  const fullName = (req.body?.fullName || "").trim();
  const password = String(req.body?.password || "");

  try {
    const railwayResponse = await forwardToRailway("/api/auth/signup", {
      email,
      fullName,
      password,
    });

    const sessionToken = railwayResponse.payload?.sessionToken;
    if (railwayResponse.ok && sessionToken) {
      res.setHeader(
        "Set-Cookie",
        serializeCookie(SESSION_COOKIE_NAME, sessionToken, {
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
          sameSite: "Lax",
          secure: true,
        })
      );
    }

    return sendJson(res, railwayResponse.status, railwayResponse.payload);
  } catch (error) {
    return sendJson(res, 500, { error: "Unable to reach the Railway auth API.", details: error.message });
  }
};
