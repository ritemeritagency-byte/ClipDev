const COURSE_CATALOG = {
  courseClubMonthly: {
    id: "courseClubMonthly",
    name: "Course Club",
    description: "Monthly access to the ClipDevs course library and bonus resources.",
    amount: 99900,
    currency: "PHP",
    paymentMethodTypes: ["gcash", "paymaya", "card"],
  },
  flagshipCourseOneTime: {
    id: "flagshipCourseOneTime",
    name: "Flagship Course",
    description: "One-time purchase for the main ClipDevs course offer.",
    amount: 299900,
    currency: "PHP",
    paymentMethodTypes: ["gcash", "paymaya", "card"],
  },
};

module.exports = {
  COURSE_CATALOG,
};
