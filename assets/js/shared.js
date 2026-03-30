export const body = document.body;
export const root = document.documentElement;
export const navToggle = document.querySelector(".nav-toggle");
export const navLinks = document.querySelector(".nav-links");
export const GA4_MEASUREMENT_ID = "";
export const COURSE_PAYMENT_FALLBACK =
  "https://api.whatsapp.com/send?phone=639603780196&text=Hi%2C%20I%20want%20help%20buying%20a%20course%20from%20ClipDevs.";
export const GOOGLE_SHEET_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycby05ygLXtRFHJVjqQ9sTju23nDqPn8Z_OsdMYuk_UMuEaCl2kZ9ePyj0C6llogUXf94Mg/exec";
export const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

body.classList.add("has-motion-js");

export const trackAnalyticsEvent = (eventName, params = {}) => {
  if (!eventName) return;

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
};

export const setupGA4 = () => {
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

export const syncMotionPreference = () => {
  body.classList.toggle("reduced-motion", reducedMotionQuery.matches);
};

export const normalizePath = (value) => {
  if (!value) return "/";
  const pathname = value.replace(/\/+$/, "");
  return pathname || "/";
};

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const formatDateLabel = (value, fallback = "No recent activity") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const formatPhpAmount = (amountInCents) => {
  const amount = Math.round(Number(amountInCents || 0) / 100);
  return `PHP ${new Intl.NumberFormat("en-PH").format(amount)}`;
};

export const fetchCurrentUser = async () => {
  const response = await fetch("/api/auth/me");
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error || "Unable to fetch account.");
    error.status = response.status;
    throw error;
  }

  return payload.user || null;
};

export const updateAvatarPreview = (previewNode, value, fallbackText = "CD") => {
  if (!previewNode) return;
  const trimmed = String(value || "").trim();
  if (trimmed) {
    previewNode.style.backgroundImage = `url("${trimmed}")`;
    previewNode.textContent = "";
    previewNode.classList.add("has-image");
  } else {
    previewNode.style.backgroundImage = "";
    previewNode.textContent = fallbackText;
    previewNode.classList.remove("has-image");
  }
};

export const bindAvatarUploader = (form, options = {}) => {
  if (!form) return;
  const fileInput = form.querySelector("[data-avatar-input]");
  const hiddenInput = form.querySelector('input[name="avatarUrl"]');
  const previewNode = form.querySelector(options.previewSelector || "[data-avatar-preview]");
  const fallbackText = options.fallbackText || "CD";

  if (hiddenInput) updateAvatarPreview(previewNode, hiddenInput.value, fallbackText);

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file || !hiddenInput) return;

    const reader = new FileReader();
    reader.onload = () => {
      hiddenInput.value = String(reader.result || "");
      updateAvatarPreview(previewNode, hiddenInput.value, fallbackText);
    };
    reader.readAsDataURL(file);
  });
};

export const bindAccountTypeVisibility = (form) => {
  if (!form) return;
  const select = form.querySelector('select[name="accountType"]');
  const agencyField = form.querySelector("[data-agency-field]");
  const agencyInput = agencyField?.querySelector('input[name="agencyName"]') || null;

  const sync = () => {
    const isAgency = (select?.value || "") === "recruitment_agency";
    if (agencyField) agencyField.hidden = !isAgency;
    if (!isAgency && agencyInput) agencyInput.value = "";
  };

  select?.addEventListener("change", sync);
  sync();
};

export const formatMembershipAccess = (member) => {
  const accessItems = Array.isArray(member?.access) ? member.access : [];
  const activeAccess = accessItems.filter((item) => item?.accessStatus === "active");
  if (!activeAccess.length) return "No active course access";
  return activeAccess.map((item) => `${item.courseSlug}: ${item.accessStatus}`).join(", ");
};

export const sendToGoogleSheet = async (payload) => {
  if (!GOOGLE_SHEET_WEBHOOK_URL) return;

  const bodyPayload = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([bodyPayload], { type: "text/plain;charset=UTF-8" });
    const queued = navigator.sendBeacon(GOOGLE_SHEET_WEBHOOK_URL, blob);
    if (queued) return;
  }

  try {
    await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: bodyPayload,
      keepalive: true,
    });
  } catch (error) {
    console.error("Google Sheets submission failed:", error);
  }
};

const whatsappNumber = "639603780196";
const messengerPageUrl = "https://web.facebook.com/clipdevs";

export const buildWhatsAppUrl = (text) =>
  `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(text)}`;

export const buildMessengerUrl = (text) => {
  const message = (text || "").trim();
  return message ? `${messengerPageUrl}?ref=${encodeURIComponent(message)}` : messengerPageUrl;
};

export const buildSubmissionMeta = () => ({
  submitted_at: new Date().toISOString(),
  source_page: window.location.pathname || "unknown",
});

export const showFormNotice = (form, text) => {
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
