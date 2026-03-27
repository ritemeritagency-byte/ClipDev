const { sendJson } = require("../_lib/http");
const { forwardToRailway } = require("../_lib/railway");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const email = (req.query?.email || "").trim().toLowerCase();
  if (!email) {
    return sendJson(res, 400, { error: "Email is required." });
  }

  try {
    const railwayResponse = await forwardToRailway(`/api/memberships/status?email=${encodeURIComponent(email)}`, undefined, {
      method: "GET",
    });

    return sendJson(res, railwayResponse.status, railwayResponse.payload);
  } catch (error) {
    return sendJson(res, 500, {
      error: "Unable to reach the Railway membership API.",
      details: error.message,
    });
  }
};
