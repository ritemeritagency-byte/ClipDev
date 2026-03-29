export const setupSiteSearch = () => {
  const siteSearchForm = document.querySelector("[data-site-search]");
  if (!siteSearchForm) return;

  const siteSearchInput = siteSearchForm.querySelector("input[name='q']");
  const siteSearchList = siteSearchForm.querySelector("#site-search-list");

  const searchEntries = [
    { label: "Home", url: "/", keywords: ["home", "landing", "clipdevs"] },
    { label: "About", url: "/#about", keywords: ["about", "company", "profile"] },
    { label: "Courses", url: "/courses", keywords: ["courses", "training", "membership", "checkout", "payment"] },
    { label: "Member Library", url: "/library", keywords: ["library", "member area", "course club", "videos", "vod"] },
    { label: "Login", url: "/login", keywords: ["login", "sign in", "sign up", "account"] },
    { label: "Account", url: "/account", keywords: ["account", "profile", "membership status", "member profile"] },
    { label: "Services", url: "/services", keywords: ["service", "offer", "website", "ads", "database"] },
    { label: "Insights", url: "/insights", keywords: ["insight", "strategy", "framework"] },
    { label: "Blog", url: "/blog", keywords: ["blog", "articles", "guides", "posts"] },
    { label: "10 Years in Recruitment: How I Finally Cracked the Code with Tech", url: "/10-years-recruitment-tech", keywords: ["10 years recruitment", "landbase", "agency automation", "digital recruitment process"] },
    { label: "200 to 300 Applicants a Day: The ChatMaxima Secret to Scaling Your Agency", url: "/chatmaxima-secret-scaling-agency", keywords: ["chatmaxima", "facebook page automation", "200 applicants", "300 applicants", "agency scaling"] },
    { label: "Stop Typing, Start Deploying: Why Google Sheets is the Secret Engine of Your Agency", url: "/google-sheets-secret-engine-agency", keywords: ["google sheets", "data push", "recruitment database", "live data bridge", "lead tracking"] },
    { label: "Website Development", url: "/website-development", keywords: ["website development", "landing page", "web design"] },
    { label: "SEO Services", url: "/seo-services", keywords: ["seo", "search engine optimization", "rankings"] },
    { label: "Facebook & Social Media", url: "/facebook-social-media", keywords: ["facebook", "social media", "marketing"] },
    { label: "Google Sheets Database", url: "/google-sheets-database", keywords: ["google sheets", "database", "tracker"] },
    { label: "A-Z Landbase Agency Process", url: "/landbase-agency-process", keywords: ["landbase", "agency process", "bahrain", "qatar", "uae"] },
    { label: "Portfolio", url: "/portfolio", keywords: ["portfolio", "case", "projects", "results"] },
    { label: "Talent", url: "/collaboration", keywords: ["talent", "join", "collaboration", "apply"] },
    { label: "Contact", url: "/#contact", keywords: ["contact", "whatsapp", "reach"] },
    { label: "Privacy Policy", url: "/privacy", keywords: ["privacy", "policy", "legal"] },
    { label: "Terms of Service", url: "/terms", keywords: ["terms", "service", "legal"] },
    { label: "Talent Terms", url: "/talent-terms", keywords: ["talent terms", "community terms", "legal"] },
    { label: "Applicants Framework", url: "/insights#applicants-framework", keywords: ["100+ daily applicants", "khalid"] },
    { label: "Office Show System", url: "/insights#office-show-system", keywords: ["40+ office shows", "rite merit"] },
  ];

  if (siteSearchList) {
    siteSearchList.innerHTML = searchEntries.map((entry) => `<option value="${entry.label}"></option>`).join("");
  }

  const normalize = (value) => (value || "").toLowerCase().trim();

  const findBestMatch = (rawQuery) => {
    const query = normalize(rawQuery);
    if (!query) return null;

    const exact = searchEntries.find((entry) => normalize(entry.label) === query);
    if (exact) return exact;

    return searchEntries.find((entry) => {
      const label = normalize(entry.label);
      const keywords = (entry.keywords || []).map(normalize);
      return label.includes(query) || keywords.some((keyword) => keyword.includes(query));
    });
  };

  siteSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const rawQuery = siteSearchInput?.value || "";
    const match = findBestMatch(rawQuery);
    if (match) {
      window.location.href = match.url;
      return;
    }

    const query = normalize(rawQuery);
    if (query) {
      window.location.href = `/?q=${encodeURIComponent(rawQuery.trim())}`;
    }
  });

  if (siteSearchInput) {
    siteSearchInput.addEventListener("change", () => {
      const match = findBestMatch(siteSearchInput.value);
      if (match) window.location.href = match.url;
    });
  }
};
