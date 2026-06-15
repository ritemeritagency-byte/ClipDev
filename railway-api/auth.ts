const crypto = require("crypto");

const PASSWORD_PREFIX = "scrypt";
const SESSION_TOKEN_BYTES = 32;

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${PASSWORD_PREFIX}$${salt}$${derived}`;
};

const verifyPassword = (password, storedHash = "") => {
  const [prefix, salt, hash] = String(storedHash).split("$");
  if (prefix !== PASSWORD_PREFIX || !salt || !hash) return false;

  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;

  return crypto.timingSafeEqual(derived, expected);
};

const createSessionToken = () => crypto.randomBytes(SESSION_TOKEN_BYTES).toString("hex");

const hashSessionToken = (token) =>
  crypto.createHash("sha256").update(String(token || "")).digest("hex");

module.exports = {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
};
