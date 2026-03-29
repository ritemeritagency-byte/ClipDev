import {
  buildSubmissionMeta,
  buildWhatsAppUrl,
  sendToGoogleSheet,
  showFormNotice,
  trackAnalyticsEvent,
} from "./shared.js";

const setupGlobalCtaTracking = () => {
  document.querySelectorAll(".btn-primary, .project-link, .contact-button").forEach((element) => {
    element.addEventListener("click", () => {
      const label = (element.textContent || "").trim();
      trackAnalyticsEvent("cta_click", {
        cta_label: label || "unknown",
        page_path: window.location.pathname || "/",
      });
    });
  });
};

const setupStrategyForm = () => {
  const strategyForm = document.querySelector("#strategy-form");
  if (!strategyForm) return;

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
};

const setupWebsiteBriefForm = () => {
  const websiteBriefForm = document.querySelector("#website-brief-form");
  if (!websiteBriefForm) return;

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
};

const setupCollabForm = () => {
  const collabForm = document.querySelector("#collab-form");
  if (!collabForm) return;

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
};

export const setupForms = () => {
  setupGlobalCtaTracking();
  setupStrategyForm();
  setupWebsiteBriefForm();
  setupCollabForm();
};
