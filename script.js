const body = document.body;
const root = document.documentElement;
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const GA4_MEASUREMENT_ID = "";
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

body.classList.add("has-motion-js");

const trackAnalyticsEvent = (eventName, params = {}) => {
  if (!eventName) return;

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
};

const setupGA4 = () => {
  if (!GA4_MEASUREMENT_ID) return;
  if (document.querySelector(`script[src*="${GA4_MEASUREMENT_ID}"]`)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA4_MEASUREMENT_ID);
};

setupGA4();

const syncMotionPreference = () => {
  body.classList.toggle("reduced-motion", reducedMotionQuery.matches);
};

syncMotionPreference();

if (typeof reducedMotionQuery.addEventListener === "function") {
  reducedMotionQuery.addEventListener("change", syncMotionPreference);
} else if (typeof reducedMotionQuery.addListener === "function") {
  reducedMotionQuery.addListener(syncMotionPreference);
}

const normalizePath = (value) => {
  if (!value) return "/";
  const pathname = value.replace(/\/+$/, "");
  return pathname || "/";
};

const getGridRevealMeta = (element) => {
  const group = element.closest(
    ".stats-grid, .subpage-grid, .testimonials-grid, .services-grid, .services-highlight-grid, .policy-grid, .package-grid, .tracks-grid, .steps-grid, .updates-grid, .insight-story-grid, .insights-mosaic, .insights-steps, .workflow-grid, .lead-system-stack"
  );

  if (!group || !element.parentElement || element.parentElement !== group) return null;

  const items = Array.from(group.children);
  const index = items.indexOf(element);

  if (index < 0) return null;

  const directions = ["left", "center", "right"];
  return {
    index,
    direction: directions[index % directions.length],
  };
};

const inferRevealDirection = (element) => {
  if (element.classList.contains("merge-left")) return "left";
  if (element.classList.contains("merge-right")) return "right";
  if (element.classList.contains("merge-center")) return "center";
  if (element.matches(".doc-media, .collab-media-stack, .insights-feature-media")) return "right";
  if (
    element.matches(
      ".about-card, .starter-form, .section-title, .footer-grid, .footer-bottom, .collab-form, .cta-banner"
    )
  ) {
    return "center";
  }

  return getGridRevealMeta(element)?.direction || "center";
};

const getRevealDelay = (element) => {
  const gridMeta = getGridRevealMeta(element);
  if (gridMeta) return Math.min(gridMeta.index * 90, 360);

  if (element.matches(".footer-bottom")) return 120;
  return 0;
};

const revealTargets = Array.from(
  new Set(
    Array.from(
      document.querySelectorAll(
        ".section-title, .stat-card, .featured-case-card, .about-card, .doc-media, .subpage-card, .starter-form, .workflow-step, .testimonial-card, .track-card, .step-card, .policy-item, .package-card, .update-card, .service-card, .service-showcase-card, .lead-system-feature, .insights-feature-media, .insights-feature-copy, .insight-story-card, .insight-panel, .insights-step-card, .cta-banner, .footer-grid, .footer-bottom, .collab-media-stack, .diamond-showcase, .showcase-card, .insight-link-card, .timeline-card"
      )
    )
  )
);

const setVisibleImmediately = (elements) => {
  elements.forEach((element) => element.classList.add("is-visible"));
};

const setupRevealAnimations = () => {
  revealTargets.forEach((element) => {
    element.classList.add("reveal-item", `reveal-${inferRevealDirection(element)}`);
    element.style.setProperty("--reveal-delay", `${getRevealDelay(element)}ms`);
  });

  if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
    setVisibleImmediately(revealTargets);
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -12% 0px",
    }
  );

  revealTargets.forEach((element) => revealObserver.observe(element));
};

const navAnchors = Array.from(document.querySelectorAll(".nav-links a"));

const setCurrentNavLink = (activeLink) => {
  navAnchors.forEach((link) => {
    const isCurrent = link === activeLink;
    link.classList.toggle("is-current", isCurrent);

    if (isCurrent) {
      const href = link.getAttribute("href") || "";
      link.setAttribute("aria-current", href.startsWith("#") ? "location" : "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
};

const setupNavTracking = () => {
  if (!navAnchors.length) return;

  const currentPath = normalizePath(window.location.pathname);
  const directMatch =
    navAnchors.find((link) => {
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("/")) return false;
      return normalizePath(href) === currentPath;
    }) || null;

  if (directMatch) setCurrentNavLink(directMatch);

  const sectionLinks = navAnchors
    .map((link) => {
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("#")) return null;
      const section = document.querySelector(href);
      if (!section) return null;
      return { link, section };
    })
    .filter(Boolean);

  if (!sectionLinks.length) return;

  const setSectionLink = (link) => {
    setCurrentNavLink(link || directMatch || sectionLinks[0].link);
  };

  setSectionLink(directMatch || sectionLinks[0].link);

  if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
    setSectionLink(sectionLinks[0].link);
    return;
  }

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (!visibleEntries.length) return;

      const activeSection = visibleEntries[0].target;
      const match = sectionLinks.find(({ section }) => section === activeSection);
      if (match) setSectionLink(match.link);
    },
    {
      threshold: [0.25, 0.5, 0.75],
      rootMargin: "-22% 0px -52% 0px",
    }
  );

  sectionLinks.forEach(({ section }) => sectionObserver.observe(section));
};

const setupScrollState = () => {
  const updateScrollState = () => {
    const scrollTop = window.scrollY || window.pageYOffset || 0;
    body.classList.toggle("is-scrolled", scrollTop > 16);

    const scrollable = root.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? scrollTop / scrollable : 0;
    root.style.setProperty("--scroll-progress", progress.toFixed(4));
  };

  let ticking = false;
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateScrollState();
      ticking = false;
    });
  };

  updateScrollState();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
};

setupRevealAnimations();
setupNavTracking();
setupScrollState();

if (navToggle && navLinks) {
  const setNavOpen = (isOpen) => {
    document.body.classList.toggle("nav-open", isOpen);
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    navToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  };

  navToggle.addEventListener("click", () => {
    setNavOpen(!document.body.classList.contains("nav-open"));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setNavOpen(false));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setNavOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) setNavOpen(false);
  });
}

const siteSearchForm = document.querySelector("[data-site-search]");
if (siteSearchForm) {
  const siteSearchInput = siteSearchForm.querySelector("input[name='q']");
  const siteSearchList = siteSearchForm.querySelector("#site-search-list");

  const searchEntries = [
    { label: "Home", url: "/", keywords: ["home", "landing", "clipdevs"] },
    { label: "About", url: "/#about", keywords: ["about", "company", "profile"] },
    { label: "Services", url: "/services", keywords: ["service", "offer", "website", "ads", "database"] },
    { label: "Insights", url: "/insights", keywords: ["insight", "strategy", "framework"] },
    { label: "Portfolio", url: "/portfolio", keywords: ["portfolio", "case", "projects", "results"] },
    { label: "Talent", url: "/collaboration", keywords: ["talent", "join", "collaboration", "apply"] },
    { label: "Contact", url: "/#contact", keywords: ["contact", "whatsapp", "reach"] },
    { label: "Privacy Policy", url: "/privacy", keywords: ["privacy", "policy", "legal"] },
    { label: "Terms of Service", url: "/terms", keywords: ["terms", "service", "legal"] },
    { label: "Talent Terms", url: "/talent-terms", keywords: ["talent terms", "community terms", "legal"] },
    { label: "Applicants Framework", url: "/insights#applicants-framework", keywords: ["100+ daily applicants", "khalid"] },
    { label: "Office Show System", url: "/insights#office-show-system", keywords: ["40+ office shows", "rite merit"] }
  ];

  if (siteSearchList) {
    siteSearchList.innerHTML = searchEntries
      .map((entry) => `<option value="${entry.label}"></option>`)
      .join("");
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
}

document.querySelectorAll(".btn-primary, .project-link, .contact-button").forEach((element) => {
  element.addEventListener("click", () => {
    const label = (element.textContent || "").trim();
    trackAnalyticsEvent("cta_click", {
      cta_label: label || "unknown",
      page_path: window.location.pathname || "/",
    });
  });
});

// Paste your deployed Google Apps Script Web App URL here.
// Example: https://script.google.com/macros/s/AKfycb.../exec
const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycby05ygLXtRFHJVjqQ9sTju23nDqPn8Z_OsdMYuk_UMuEaCl2kZ9ePyj0C6llogUXf94Mg/exec";

const sendToGoogleSheet = async (payload) => {
  if (!GOOGLE_SHEET_WEBHOOK_URL) return;

  const body = JSON.stringify(payload);

  // Prefer sendBeacon because it is more reliable during navigation/new tab opens.
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
    const queued = navigator.sendBeacon(GOOGLE_SHEET_WEBHOOK_URL, blob);
    if (queued) return;
  }

  try {
    await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body,
      keepalive: true,
    });
  } catch (error) {
    console.error("Google Sheets submission failed:", error);
  }
};

const diamondShowcases = document.querySelectorAll("[data-diamond-showcase]");

diamondShowcases.forEach((showcase) => {
  const tiles = Array.from(showcase.querySelectorAll(".diamond-tile"));
  const previewImage = showcase.querySelector("[data-diamond-preview-image]");
  const previewLabel = showcase.querySelector("[data-diamond-preview-label]");

  if (!tiles.length || !previewImage || !previewLabel) return;

  const applyActive = (index) => {
    const boundedIndex = Math.max(0, Math.min(index, tiles.length - 1));
    const activeTile = tiles[boundedIndex];
    const photo = activeTile.getAttribute("data-photo");
    const label = activeTile.getAttribute("data-label");

    tiles.forEach((tile, tileIndex) => {
      tile.classList.toggle("is-active", tileIndex === boundedIndex);
    });

    if (photo) previewImage.src = photo;
    if (label) {
      previewImage.alt = label;
      previewLabel.textContent = label;
    }
  };

  const updateFromPointer = (event) => {
    const rect = showcase.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(0.9999, x / rect.width));
    const index = Math.floor(ratio * tiles.length);
    applyActive(index);
  };

  tiles.forEach((tile, index) => {
    tile.addEventListener("mouseenter", () => applyActive(index));
    tile.addEventListener("focus", () => applyActive(index));
    tile.addEventListener("click", () => applyActive(index));
  });

  showcase.addEventListener("mousemove", updateFromPointer);

  applyActive(0);
});

const whatsappNumber = "639603780196";
const buildWhatsAppUrl = (text) =>
  `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(text)}`;

const buildSubmissionMeta = () => ({
  submitted_at: new Date().toISOString(),
  source_page: window.location.pathname || "unknown",
});

const showFormNotice = (form, text) => {
  if (!form) return;
  let notice = form.querySelector(".form-notice");
  if (!notice) {
    notice = document.createElement("p");
    notice.className = "form-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    form.appendChild(notice);
  }
  notice.textContent = text;
};

const strategyForm = document.querySelector("#strategy-form");
if (strategyForm) {
  strategyForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = strategyForm.querySelector("[name='name']")?.value?.trim() || "";
    const business = strategyForm.querySelector("[name='business']")?.value?.trim() || "";
    const location = strategyForm.querySelector("[name='location']")?.value?.trim() || "";
    const phone = strategyForm.querySelector("[name='phone']")?.value?.trim() || "";
    const websiteType = strategyForm.querySelector("[name='website_type']")?.value?.trim() || "";
    const message = strategyForm.querySelector("[name='message']")?.value?.trim() || "";

    const payload = [
      "New Strategy Call Request",
      `Name: ${name}`,
      `Business: ${business}`,
      `Location: ${location}`,
      `Phone: ${phone}`,
      `Website Type: ${websiteType}`,
      `Goal: ${message}`,
    ].join("\n");

    sendToGoogleSheet({
      form_type: "strategy_call",
      name,
      business,
      location,
      phone,
      website_type: websiteType,
      message,
      ...buildSubmissionMeta(),
    });
    trackAnalyticsEvent("generate_lead", { form_type: "strategy_call" });

    showFormNotice(strategyForm, "Submitted successfully. We will review your request within 3-7 business days.");
    window.open(buildWhatsAppUrl(payload), "_blank", "noopener");

    strategyForm.reset();
  });
}

const websiteBriefForm = document.querySelector("#website-brief-form");
if (websiteBriefForm) {
  websiteBriefForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = websiteBriefForm.querySelector("[name='name']")?.value?.trim() || "";
    const business = websiteBriefForm.querySelector("[name='business']")?.value?.trim() || "";
    const websiteType = websiteBriefForm.querySelector("[name='website_type']")?.value?.trim() || "";
    const message = websiteBriefForm.querySelector("[name='message']")?.value?.trim() || "";

    const payload = [
      "New Website Starter Brief",
      `Name: ${name}`,
      `Business/Brand: ${business || "Not provided"}`,
      `Website Type: ${websiteType}`,
      `Website Goal: ${message}`,
      "Requested Flow: AI mockup + human quality check + launch support",
    ].join("\n");

    sendToGoogleSheet({
      form_type: "website_brief",
      name,
      business,
      website_type: websiteType,
      message,
      ...buildSubmissionMeta(),
    });
    trackAnalyticsEvent("generate_lead", { form_type: "website_brief" });

    showFormNotice(websiteBriefForm, "Submitted successfully. We will review your request within 3-7 business days.");
    window.open(buildWhatsAppUrl(payload), "_blank", "noopener");

    websiteBriefForm.reset();
  });
}

const collabForm = document.querySelector("#collab-form");
if (collabForm) {
  const progressPills = Array.from(collabForm.querySelectorAll(".progress-pill"));
  const formSteps = Array.from(collabForm.querySelectorAll(".form-step"));

  const setActiveFormStep = (index) => {
    progressPills.forEach((pill, pillIndex) => {
      pill.classList.toggle("active", pillIndex === index);
    });

    formSteps.forEach((step, stepIndex) => {
      step.classList.toggle("is-active", stepIndex === index);
    });
  };

  formSteps.forEach((step, index) => {
    step.addEventListener("focusin", () => setActiveFormStep(index));

    if (window.matchMedia("(hover: hover)").matches) {
      step.addEventListener("mouseenter", () => setActiveFormStep(index));
    }
  });

  setActiveFormStep(0);

  collabForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = collabForm.querySelector("[name='name']")?.value?.trim() || "";
    const phone = collabForm.querySelector("[name='phone']")?.value?.trim() || "";
    const location = collabForm.querySelector("[name='location']")?.value?.trim() || "";
    const role = collabForm.querySelector("[name='role']")?.value?.trim() || "";
    const stack = collabForm.querySelector("[name='stack']")?.value?.trim() || "";
    const buildType = collabForm.querySelector("[name='build_type']")?.value?.trim() || "";
    const message = collabForm.querySelector("[name='message']")?.value?.trim() || "";

    const payload = [
      "New ClipDevs Talent Signup",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Location: ${location}`,
      `Current Level: ${role}`,
      `Skills/Tools: ${stack || "Not provided"}`,
      `Wants to Build: ${buildType}`,
      `Why Join: ${message}`,
    ].join("\n");

    sendToGoogleSheet({
      form_type: "talent_signup",
      name,
      phone,
      location,
      role,
      stack,
      build_type: buildType,
      message,
      ...buildSubmissionMeta(),
    });
    trackAnalyticsEvent("generate_lead", { form_type: "talent_signup" });

    showFormNotice(collabForm, "Application sent. We will review your profile within 3-7 business days.");
    window.open(buildWhatsAppUrl(payload), "_blank", "noopener");

    collabForm.reset();
  });
}

const waWidget = document.querySelector("[data-wa-widget]");
if (waWidget) {
  const toggle = waWidget.querySelector("[data-wa-toggle]");
  const panel = waWidget.querySelector("[data-wa-panel]");
  const input = waWidget.querySelector("[data-wa-input]");
  const send = waWidget.querySelector("[data-wa-send]");
  let closeTimer = null;

  const setPanelOpen = (isOpen) => {
    if (!toggle || !panel) return;

    window.clearTimeout(closeTimer);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    waWidget.classList.toggle("is-open", isOpen);

    if (isOpen) {
      panel.hidden = false;
      panel.setAttribute("aria-hidden", "false");
      window.requestAnimationFrame(() => {
        waWidget.classList.add("is-open");
      });
      input?.focus();
      return;
    }

    panel.setAttribute("aria-hidden", "true");
    closeTimer = window.setTimeout(() => {
      if (!waWidget.classList.contains("is-open")) panel.hidden = true;
    }, 220);
  };

  if (toggle && panel) {
    if (!panel.id) panel.id = "wa-panel";
    toggle.setAttribute("aria-controls", panel.id);
    toggle.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");

    toggle.addEventListener("click", () => {
      setPanelOpen(panel.hidden);
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        waWidget.classList.remove("is-open");
        setPanelOpen(false);
        toggle.focus();
      }
    });
  }

  if (send && input) {
    send.addEventListener("click", () => {
      const raw = input.value.trim() || "Hi, I want help with my website or recruitment project.";
      window.open(buildWhatsAppUrl(raw), "_blank", "noopener");
    });
  }
}


