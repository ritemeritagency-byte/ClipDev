const SESSION_COOKIE_NAME = "clipdevs_session";

const parseCookieHeader = (header = "") =>
  Object.fromEntries(
    String(header)
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...rest] = part.split("=");
        return [name, decodeURIComponent(rest.join("=") || "")];
      })
  );

const serializeCookie = (name, value, options = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
};

module.exports = {
  SESSION_COOKIE_NAME,
  parseCookieHeader,
  serializeCookie,
};
