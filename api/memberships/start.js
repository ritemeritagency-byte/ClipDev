const { sendJson } = require("../_lib/http");
const { COURSE_CATALOG } = require("../paymongo/catalog");
const { forwardToRailway } = require("../_lib/railway");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const email = (req.body?.email || "").trim().toLowerCase();
  const fullName = (req.body?.fullName || "").trim();
  const planCode = (req.body?.planCode || "courseClubMonthly").trim();
  const course = COURSE_CATALOG[planCode];

  if (!email || !email.includes("@")) {
    return sendJson(res, 400, { error: "Valid email is required." });
  }

  if (!fullName) {
    return sendJson(res, 400, { error: "Full name is required." });
  }

  if (!course) {
    return sendJson(res, 400, { error: "Unknown membership plan." });
  }

  try {
    const railwayResponse = await forwardToRailway("/api/memberships/start", {
      email,
      fullName,
      planCode: course.id,
      amount: course.amount,
      currency: course.currency,
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
