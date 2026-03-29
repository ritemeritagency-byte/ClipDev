const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeAccountType,
  getAdminEmails,
  isAdminEmail,
  getUserRole,
  COURSE_CLUB_LAUNCH_OFFER,
} = require("../lib/config");

test("normalizeAccountType accepts known values and rejects unknown values", () => {
  assert.equal(normalizeAccountType("individual"), "individual");
  assert.equal(normalizeAccountType(" recruitment_agency "), "recruitment_agency");
  assert.equal(normalizeAccountType("enterprise"), null);
  assert.equal(normalizeAccountType(""), null);
});

test("admin helpers merge defaults with env values", () => {
  process.env.ADMIN_EMAILS = "owner@example.com,ADMIN@example.com";

  const admins = getAdminEmails();
  assert.ok(admins.includes("cliperedbagundol@gmail.com"));
  assert.ok(admins.includes("owner@example.com"));
  assert.ok(admins.includes("admin@example.com"));
  assert.equal(isAdminEmail("OWNER@example.com"), true);
  assert.equal(getUserRole("member@example.com"), "member");
  assert.equal(getUserRole("cliperedbagundol@gmail.com"), "admin");

  delete process.env.ADMIN_EMAILS;
});

test("launch offer config exposes expected pricing shape", () => {
  assert.equal(COURSE_CLUB_LAUNCH_OFFER.planCode, "courseClubMonthly");
  assert.equal(typeof COURSE_CLUB_LAUNCH_OFFER.discountPercent, "number");
  assert.equal(COURSE_CLUB_LAUNCH_OFFER.currency, "PHP");
});
