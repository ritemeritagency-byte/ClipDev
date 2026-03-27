const { COURSE_CATALOG } = require("./catalog");
const { sendJson } = require("../_lib/http");

const getBaseUrl = (req) => {
  const configured = process.env.PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "https";
  return `${protocol}://${host}`;
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    return sendJson(res, 500, { error: "Missing PAYMONGO_SECRET_KEY environment variable." });
  }

  const courseId = req.body?.courseId;
  const customerEmail = (req.body?.email || "").trim().toLowerCase();
  const customerName = (req.body?.fullName || "").trim();
  const course = courseId ? COURSE_CATALOG[courseId] : null;
  if (!course) {
    return sendJson(res, 400, { error: "Unknown course selection." });
  }

  const baseUrl = getBaseUrl(req);
  const successUrl = `${baseUrl}/courses?payment=success&course=${encodeURIComponent(course.id)}`;
  const cancelUrl = `${baseUrl}/courses?payment=cancelled&course=${encodeURIComponent(course.id)}`;

  try {
    const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            cancel_url: cancelUrl,
            success_url: successUrl,
            description: course.description,
            line_items: [
              {
                currency: course.currency,
                amount: course.amount,
                description: course.description,
                name: course.name,
                quantity: 1,
              },
            ],
            payment_method_types: course.paymentMethodTypes,
            metadata: {
              course_id: course.id,
              course_name: course.name,
            },
            show_description: true,
            show_line_items: true,
          },
        },
      }),
    });

    const payload = await response.json();
    const checkoutUrl = payload?.data?.attributes?.checkout_url;

    if (!response.ok || !checkoutUrl) {
      return sendJson(res, response.status || 502, {
        error: payload?.errors?.[0]?.detail || "PayMongo checkout session creation failed.",
        details: payload?.errors || null,
      });
    }

    return sendJson(res, 200, {
      checkoutUrl,
      courseId: course.id,
      customerEmail: customerEmail || null,
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: "Unable to reach PayMongo.",
      details: error.message,
    });
  }
};
