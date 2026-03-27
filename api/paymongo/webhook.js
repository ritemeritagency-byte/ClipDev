const crypto = require("crypto");
const { sendJson } = require("../_lib/http");
const { forwardToRailway, getRailwayBaseUrl } = require("../_lib/railway");

const readRawBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

const parseSignatureHeader = (value = "") =>
  Object.fromEntries(
    value
      .split(",")
      .map((part) => part.trim().split("=").map((item) => item.trim()))
      .filter(([key, val]) => key && val)
  );

const verifyWebhookSignature = (rawBody, signatureHeader, secret) => {
  if (!secret) return true;

  const parsed = parseSignatureHeader(signatureHeader);
  const signature = parsed.teehmac || parsed.v1;
  if (!signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const rawBody = await readRawBody(req);
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET || "";
  const signatureHeader = req.headers["paymongo-signature"] || "";

  if (!verifyWebhookSignature(rawBody, signatureHeader, secret)) {
    return sendJson(res, 400, { error: "Invalid PayMongo signature." });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch (error) {
    return sendJson(res, 400, { error: "Invalid JSON payload." });
  }

  const eventType = event?.data?.attributes?.type || "unknown";
  const resource = event?.data?.attributes?.data || null;
  const normalizedEvent = {
    provider: "paymongo",
    eventType,
    resourceId: resource?.id || null,
    resourceType: resource?.type || null,
    metadata: resource?.attributes?.metadata || null,
    amount: resource?.attributes?.amount || null,
    currency: resource?.attributes?.currency || null,
    status: resource?.attributes?.status || null,
    paidAt: resource?.attributes?.paid_at || null,
    raw: event,
  };

  console.log("PayMongo webhook received:", {
    eventType,
    resourceId: resource?.id || null,
    resourceType: resource?.type || null,
    metadata: resource?.attributes?.metadata || null,
  });

  let railway = null;
  if (getRailwayBaseUrl()) {
    try {
      railway = await forwardToRailway("/api/paymongo/webhook", normalizedEvent);
    } catch (error) {
      railway = {
        ok: false,
        status: 502,
        payload: {
          error: "Unable to reach Railway webhook endpoint.",
          details: error.message,
        },
      };
    }
  }

  return sendJson(res, 200, {
    received: true,
    eventType,
    forwardedToRailway: Boolean(railway),
    railwayStatus: railway?.status || null,
  });
};
