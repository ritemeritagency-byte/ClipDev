const getRailwayBaseUrl = () => {
  const value = process.env.RAILWAY_API_BASE_URL || "";
  return value.replace(/\/+$/, "");
};

const forwardToRailway = async (path, payload, options = {}) => {
  const baseUrl = getRailwayBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      status: 503,
      payload: {
        error: "Missing RAILWAY_API_BASE_URL environment variable.",
      },
    };
  }

  const secret = process.env.RAILWAY_INTERNAL_SECRET || "";
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      ...(options.headers || {}),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

  let responsePayload = {};
  try {
    responsePayload = await response.json();
  } catch (error) {
    responsePayload = {
      error: "Railway API returned a non-JSON response.",
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    payload: responsePayload,
  };
};

module.exports = {
  getRailwayBaseUrl,
  forwardToRailway,
};
