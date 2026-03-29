const { sendJson } = require("../../lib/http");
const { forwardToRailway } = require("../../lib/railway");
const { COURSE_CATALOG } = require("../../lib/course-catalog");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const offer = (req.query?.offer || "").trim().toLowerCase();
  if (offer === "course-club-launch") {
    const launchOffer = COURSE_CATALOG.courseClubMonthly?.launchOffer;
    const regularAmount = COURSE_CATALOG.courseClubMonthly?.regularAmount || COURSE_CATALOG.courseClubMonthly?.amount || 99900;

    return sendJson(res, 200, {
      active: true,
      redeemed: 0,
      remaining: launchOffer?.maxRedemptions || 10,
      maxRedemptions: launchOffer?.maxRedemptions || 10,
      discountPercent: launchOffer?.discountPercent || 30,
      regularAmount,
      discountedAmount: launchOffer?.discountedAmount || regularAmount,
      currency: COURSE_CATALOG.courseClubMonthly?.currency || "PHP",
      source: "vercel-local-fallback",
    });
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
