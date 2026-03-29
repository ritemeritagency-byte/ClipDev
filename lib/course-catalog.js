const COURSE_CATALOG = {
  courseClubMonthly: {
    id: "courseClubMonthly",
    name: "Course Club Monthly",
    description: "Monthly membership access to the full private ClipDevs VOD course library, including future course videos.",
    amount: 99900,
    regularAmount: 99900,
    currency: "PHP",
    paymentMethodTypes: ["qrph"],
    launchOffer: {
      maxRedemptions: 10,
      discountPercent: 30,
      discountedAmount: 69900,
    },
  },
  flagshipCourseOneTime: {
    id: "flagshipCourseOneTime",
    name: "Legacy One-Time Course",
    description: "Optional one-time course product if ClipDevs later adds a non-subscription offer.",
    amount: 299900,
    currency: "PHP",
    paymentMethodTypes: ["qrph"],
  },
  oneOnOneTrainingWeek: {
    id: "oneOnOneTrainingWeek",
    name: "ClipDevs 1-on-1 Training",
    description:
      "Private 1-week ClipDevs training package covering ChatMaxima setup, Facebook setup, Google Sheets connection, and database workflow.",
    amount: 99900,
    currency: "PHP",
    paymentMethodTypes: ["qrph"],
    successPath: "/courses",
    cancelPath: "/courses",
  },
  freelanceHourlySupport: {
    id: "freelanceHourlySupport",
    name: "ClipDevs Hourly Support",
    description:
      "1-hour online support block for agency setup, Facebook Page setup, ChatMaxima, chatbot work, Google Sheets structure, cold leads support, Facebook Ads support, or landing page tasks.",
    amount: 56000,
    currency: "PHP",
    paymentMethodTypes: ["qrph"],
    successPath: "/services",
    cancelPath: "/services",
  },
};

module.exports = {
  COURSE_CATALOG,
};
