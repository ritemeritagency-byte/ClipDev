import { sendJson } from "../../lib/http";

const getGoogleSheetWebhookUrl = () => String(process.env.GOOGLE_SHEET_WEBHOOK_URL || "").trim();

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const webhookUrl = getGoogleSheetWebhookUrl();
  if (!webhookUrl) {
    return sendJson(res, 503, { error: "Google Sheets webhook is not configured." });
  }

  const payload = req.body || {};

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let responsePayload: any = {};
    try {
      responsePayload = await response.json();
    } catch {
      responsePayload = { ok: response.ok };
    }

    return sendJson(res, response.status, responsePayload);
  } catch (error: any) {
    return sendJson(res, 500, {
      error: "Unable to submit the form.",
      details: error.message,
    });
  }
}
