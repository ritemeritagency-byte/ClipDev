const test = require("node:test");
const assert = require("node:assert/strict");

const { getSessionTokenFromHeaders } = require("../lib/session");

test("getSessionTokenFromHeaders prefers explicit custom headers", () => {
  const req = {
    headers: {
      "x-session-token": "from-header",
      cookie: "clipdevs_session=from-cookie",
    },
  };

  assert.equal(getSessionTokenFromHeaders(req), "from-header");
});

test("getSessionTokenFromHeaders falls back to cookie parsing", () => {
  const req = {
    headers: {
      cookie: "foo=bar; clipdevs_session=encoded%20value",
    },
  };

  assert.equal(getSessionTokenFromHeaders(req), "encoded%20value");
});
