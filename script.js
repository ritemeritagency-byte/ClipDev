const mergeCards = document.querySelectorAll(".scroll-merge");

const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle && navLinks) {
  const setNavOpen = (isOpen) => {
    document.body.classList.toggle("nav-open", isOpen);
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
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

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
      } else {
        entry.target.classList.remove("in-view");
      }
    });
  },
  {
    threshold: 0.35,
    rootMargin: "0px 0px -8% 0px",
  }
);

mergeCards.forEach((card) => observer.observe(card));

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

    showFormNotice(websiteBriefForm, "Submitted successfully. We will review your request within 3-7 business days.");
    window.open(buildWhatsAppUrl(payload), "_blank", "noopener");

    websiteBriefForm.reset();
  });
}

const collabForm = document.querySelector("#collab-form");
if (collabForm) {
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
      "New Clipdevs Talent Signup",
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

  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      const hidden = panel.hasAttribute("hidden");
      if (hidden) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
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

