const COURSE_CATALOG = {
  courseClubMonthly: {
    id: "courseClubMonthly",
    name: "Course Club",
    description: "Monthly subscriber access to the private ClipDevs VOD course library.",
    amount: 99900,
    currency: "PHP",
    paymentMethodTypes: ["gcash", "paymaya", "card"],
  },
  flagshipCourseOneTime: {
    id: "flagshipCourseOneTime",
    name: "Legacy One-Time Course",
    description: "Optional one-time course product if ClipDevs later adds a non-subscription offer.",
    amount: 299900,
    currency: "PHP",
    paymentMethodTypes: ["gcash", "paymaya", "card"],
  },
};

module.exports = {
  COURSE_CATALOG,
};
