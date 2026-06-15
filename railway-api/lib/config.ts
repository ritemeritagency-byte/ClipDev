const SESSION_DURATION_DAYS = 30;
const DEFAULT_ADMIN_EMAILS = ["cliperedbagundol@gmail.com"];
const TEST_ACCESS_EMAILS = ["cliperedbagundol@gmail.com"];

const PLAN_TO_COURSE = {
  courseClubMonthly: "course-club",
  flagshipCourseOneTime: "flagship-course",
};

const COURSE_CLUB_LAUNCH_OFFER = {
  planCode: "courseClubMonthly",
  maxRedemptions: 10,
  discountPercent: 30,
  regularAmountCents: 99900,
  discountedAmountCents: 69900,
  currency: "PHP",
};

const normalizeAccountType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  return normalized === "recruitment_agency" || normalized === "individual" ? normalized : null;
};

const getAdminEmails = () =>
  Array.from(
    new Set([
      ...DEFAULT_ADMIN_EMAILS,
      ...String(process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ])
  );

const isAdminEmail = (email) => getAdminEmails().includes(String(email || "").trim().toLowerCase());
const isTestAccessEmail = (email) => TEST_ACCESS_EMAILS.includes(String(email || "").trim().toLowerCase());
const getUserRole = (email) => (isAdminEmail(email) ? "admin" : "member");

module.exports = {
  SESSION_DURATION_DAYS,
  PLAN_TO_COURSE,
  COURSE_CLUB_LAUNCH_OFFER,
  normalizeAccountType,
  getAdminEmails,
  isAdminEmail,
  isTestAccessEmail,
  getUserRole,
};
