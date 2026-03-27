const { sendJson } = require("../_lib/http");
const { forwardToRailway } = require("../_lib/railway");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const email = (req.body?.email || "").trim().toLowerCase();
  const subscriptionId = (req.body?.subscriptionId || "").trim();
  const reason = (req.body?.reason || "").trim();

  if (!email && !subscriptionId) {
    return sendJson(res, 400, {
      error: "Provide either email or subscriptionId to unsubscribe.",
    });
  }

  try {
    const railwayResponse = await forwardToRailway("/api/memberships/unsubscribe", {
      email: email || null,
      subscriptionId: subscriptionId || null,
      reason: reason || "cancelled_by_member",
      source: "vercel-paymongo-site",
    });

    return sendJson(res, railwayResponse.status, railwayResponse.payload);
  } catch (error) {
    return sendJson(res, 500, {
      error: "Unable to reach the Railway membership API.",
      details: error.message,
    });
  }
};
