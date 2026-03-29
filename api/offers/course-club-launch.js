const { sendJson } = require("../_lib/http");
const { forwardToRailway } = require("../_lib/railway");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const railwayResponse = await forwardToRailway(
      "/api/offers/course-club-launch",
      undefined,
      { method: "GET" }
    );

    return sendJson(res, railwayResponse.status, railwayResponse.payload);
  } catch (error) {
    return sendJson(res, 500, {
      error: "Unable to reach the Railway offer API.",
      details: error.message,
    });
  }
};
