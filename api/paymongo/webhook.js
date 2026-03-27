const crypto = require("crypto");

const json = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

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
    return json(res, 405, { error: "Method not allowed." });
  }

  const rawBody = await readRawBody(req);
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET || "";
  const signatureHeader = req.headers["paymongo-signature"] || "";

  if (!verifyWebhookSignature(rawBody, signatureHeader, secret)) {
    return json(res, 400, { error: "Invalid PayMongo signature." });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch (error) {
    return json(res, 400, { error: "Invalid JSON payload." });
  }

  const eventType = event?.data?.attributes?.type || "unknown";
  const resource = event?.data?.attributes?.data || null;

  console.log("PayMongo webhook received:", {
    eventType,
    resourceId: resource?.id || null,
    resourceType: resource?.type || null,
    metadata: resource?.attributes?.metadata || null,
  });

  return json(res, 200, {
    received: true,
    eventType,
  });
};
