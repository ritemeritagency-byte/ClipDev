import {
  body,
  COURSE_PAYMENT_FALLBACK,
  formatPhpAmount,
  trackAnalyticsEvent,
} from "./shared.js";

const setupCoursePaymentLinks = () => {
  const paymentButtons = document.querySelectorAll("[data-payment-link]");
  if (!paymentButtons.length) return;

  const showPaymentStatus = () => {
    if (!body.classList.contains("page-courses")) return;

    const params = new URLSearchParams(window.location.search);
    const status = params.get("payment");
    if (!status || !["success", "cancelled"].includes(status)) return;

    const hero = document.querySelector(".course-hero");
    if (!hero || document.querySelector("[data-payment-status]")) return;

    const banner = document.createElement("div");
    banner.className = `payment-status-banner payment-status-${status}`;
    banner.setAttribute("data-payment-status", "true");
    banner.innerHTML =
      status === "success"
        ? "<strong>Payment received by PayMongo.</strong> We can now confirm access and next steps."
        : "<strong>Checkout was cancelled.</strong> You can try again anytime or message us for help.";

    hero.insertAdjacentElement("afterend", banner);
  };

  showPaymentStatus();

  paymentButtons.forEach((button) => {
    const paymentKey = button.getAttribute("data-payment-link");
    const defaultLabel = (button.textContent || "").trim();
    const form = button.closest("[data-course-payment-form]");
    const statusNode = form?.querySelector("[data-course-payment-status]") || null;

    if (button.tagName === "A") {
      button.setAttribute("href", "#");
    }

    button.addEventListener("click", async (event) => {
      event.preventDefault();

      trackAnalyticsEvent("course_checkout_click", {
        payment_key: paymentKey || "unknown",
        payment_ready: "server_attempt",
        page_path: window.location.pathname || "/",
      });

      if (statusNode) {
        statusNode.textContent = "";
        statusNode.classList.remove("is-error", "is-success");
      }

      if (!paymentKey) {
        window.location.href = COURSE_PAYMENT_FALLBACK;
        return;
      }

      const fullName = (form?.querySelector('input[name="fullName"]')?.value || "").trim();
      const email = (form?.querySelector('input[name="email"]')?.value || "").trim().toLowerCase();

      if (!fullName || !email || !email.includes("@")) {
        if (statusNode) {
          statusNode.textContent = "Enter your full name and a valid email before checkout.";
          statusNode.classList.add("is-error");
        }
        return;
      }

      button.classList.add("is-loading");
      button.setAttribute("aria-busy", "true");
      button.textContent = "Opening checkout...";

      try {
        const memberResponse = await fetch("/api/memberships/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, fullName, planCode: paymentKey }),
        });

        const memberPayload = await memberResponse.json().catch(() => ({}));
        if (!memberResponse.ok) {
          throw new Error(memberPayload?.error || "Unable to prepare your course access.");
        }

        const response = await fetch("/api/paymongo/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: paymentKey, email, fullName }),
        });

        const payload = await response.json().catch(() => ({}));
        const checkoutUrl = payload?.checkoutUrl;

        if (!response.ok || !checkoutUrl) {
          throw new Error(payload?.error || "Unable to create PayMongo checkout session.");
        }

        window.location.href = checkoutUrl;
      } catch (error) {
        console.error("PayMongo checkout failed:", error);
        if (statusNode) {
          statusNode.textContent = error.message || "Unable to open checkout right now.";
          statusNode.classList.add("is-error");
        } else {
          window.location.href = COURSE_PAYMENT_FALLBACK;
        }
      } finally {
        button.classList.remove("is-loading");
        button.removeAttribute("aria-busy");
        button.textContent = defaultLabel;
      }
    });
  });
};

const setupTrainingCheckout = () => {
  document.querySelectorAll("[data-training-checkout]").forEach((button) => {
    const paymentKey = button.getAttribute("data-training-checkout") || "";
    const form = button.closest("[data-training-payment-form]");
    const statusNode = form?.querySelector("[data-training-payment-status]") || null;
    const defaultLabel = (button.textContent || "").trim();

    button.addEventListener("click", async (event) => {
      event.preventDefault();

      const fullName = (form?.querySelector('input[name="fullName"]')?.value || "").trim();
      const email = (form?.querySelector('input[name="email"]')?.value || "").trim().toLowerCase();

      if (statusNode) {
        statusNode.textContent = "";
        statusNode.classList.remove("is-error", "is-success");
      }

      if (!fullName || !email || !email.includes("@")) {
        if (statusNode) {
          statusNode.textContent = "Enter your full name and a valid email before payment.";
          statusNode.classList.add("is-error");
        }
        return;
      }

      button.classList.add("is-loading");
      button.setAttribute("aria-busy", "true");
      button.textContent = "Opening checkout...";

      try {
        const response = await fetch("/api/paymongo/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: paymentKey, email, fullName }),
        });

        const payload = await response.json().catch(() => ({}));
        const checkoutUrl = payload?.checkoutUrl;

        if (!response.ok || !checkoutUrl) {
          throw new Error(payload?.error || "Unable to create PayMongo checkout session.");
        }

        window.location.href = checkoutUrl;
      } catch (error) {
        if (statusNode) {
          statusNode.textContent = error.message || "Unable to open checkout right now.";
          statusNode.classList.add("is-error");
        }
      } finally {
        button.classList.remove("is-loading");
        button.removeAttribute("aria-busy");
        button.textContent = defaultLabel;
      }
    });
  });
};

const setupCourseLaunchOffer = () => {
  const offerSections = document.querySelectorAll("[data-launch-offer-section]");
  if (!offerSections.length) return;

  const updatePriceNode = (selector, amountInCents, suffix) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.innerHTML = `${formatPhpAmount(amountInCents)}<span>${suffix}</span>`;
    });
  };

  fetch("/api/memberships/status?offer=course-club-launch")
    .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
    .then(({ ok, payload }) => {
      if (!ok || !payload) return;

      const active = Boolean(payload.active);
      const remaining = Number(payload.remaining || 0);
      const maxRedemptions = Number(payload.maxRedemptions || 10);
      const regularAmount = Number(payload.regularAmount || 99900);
      const discountedAmount = Number(payload.discountedAmount || regularAmount);
      const discountPercent = Number(payload.discountPercent || 30);

      updatePriceNode("[data-course-price-main]", active ? discountedAmount : regularAmount, active ? " / first month" : " / month");
      updatePriceNode("[data-course-plan-price]", active ? discountedAmount : regularAmount, active ? " / first month" : " / month");

      document.querySelectorAll("[data-course-price-note]").forEach((node) => {
        node.textContent = active ? `Then ${formatPhpAmount(regularAmount)} / month` : `${formatPhpAmount(regularAmount)} regular monthly rate`;
      });

      document.querySelectorAll("[data-course-plan-note]").forEach((node) => {
        node.textContent = active ? `Then ${formatPhpAmount(regularAmount)} / month` : `${formatPhpAmount(regularAmount)} regular monthly rate`;
      });

      document.querySelectorAll("[data-launch-offer-price]").forEach((node) => {
        node.textContent = formatPhpAmount(active ? discountedAmount : regularAmount);
      });

      document.querySelectorAll("[data-launch-offer-regular]").forEach((node) => {
        node.textContent = `${formatPhpAmount(regularAmount)} / month`;
      });

      document.querySelectorAll("[data-launch-offer-remaining]").forEach((node) => {
        node.textContent = active ? `${remaining} of ${maxRedemptions} spots left` : "Launch offer claimed";
      });

      document.querySelectorAll("[data-launch-offer-title]").forEach((node) => {
        node.textContent = active ? `${discountPercent}% off for the first ${maxRedemptions} paid members` : "Launch offer has now been claimed";
      });

      document.querySelectorAll("[data-launch-offer-copy]").forEach((node) => {
        if (active) return;
        node.innerHTML = `The launch discount has been claimed. New members now join at <strong>${formatPhpAmount(
          regularAmount
        )}</strong> per month for full Course Club access.`;
      });

      document.querySelectorAll("[data-launch-offer-badge]").forEach((node) => {
        node.textContent = active ? "Launch Offer" : "Regular Rate";
      });

      document.querySelectorAll("[data-launch-offer-cta]").forEach((node) => {
        node.textContent = active ? "Claim Launch Offer" : "Subscribe Monthly";
      });

      if (!active) {
        offerSections.forEach((section) => {
          section.classList.add("is-inactive");
        });
      }
    })
    .catch(() => {});
};

const setupPaywallModal = () => {
  const modal = document.querySelector("[data-paywall-modal]");
  const openButtons = document.querySelectorAll("[data-open-paywall]");
  const closeButtons = document.querySelectorAll("[data-close-paywall]");
  if (!modal || !openButtons.length) return;

  const openModal = () => {
    modal.hidden = false;
    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  };

  openButtons.forEach((button) => {
    button.addEventListener("click", openModal);
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
};

const setupMembershipManagement = () => {
  const form = document.querySelector("[data-membership-form]");
  if (!form) return;

  const emailInput = form.querySelector('input[name="membershipEmail"]');
  const statusNode = form.querySelector("[data-membership-status]");
  const checkButton = form.querySelector("[data-membership-check]");
  const unsubscribeButton = form.querySelector("[data-membership-unsubscribe]");
  const resultCard = document.querySelector("[data-membership-result]");
  const resultEmail = document.querySelector("[data-membership-email]");
  const resultPlan = document.querySelector("[data-membership-plan]");
  const resultAccess = document.querySelector("[data-membership-access]");

  const setStatus = (message, tone = "") => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.classList.remove("is-error", "is-success");
    if (tone) statusNode.classList.add(tone);
  };

  const readEmail = () => (emailInput?.value || "").trim().toLowerCase();

  const renderMembership = (member) => {
    if (!resultCard || !resultEmail || !resultPlan || !resultAccess) return;

    const accessItems = Array.isArray(member?.access) ? member.access : [];
    const activeAccess = accessItems
      .filter((item) => item?.accessStatus)
      .map((item) => `${item.courseSlug}: ${item.accessStatus}`)
      .join(", ");

    resultEmail.textContent = member?.email || "Unknown email";
    resultPlan.textContent = member?.subscriptionStatus
      ? `${member.subscriptionStatus} (${member.planName || member.planCode || "Course Club"})`
      : "No membership record found";
    resultAccess.textContent = activeAccess || "No course access attached yet";
    resultCard.hidden = false;
  };

  const setLoading = (button, isLoading, label) => {
    if (!button) return;
    button.classList.toggle("is-loading", isLoading);
    button.setAttribute("aria-busy", isLoading ? "true" : "false");
    button.textContent = isLoading ? label : button.getAttribute("data-default-label") || button.textContent;
  };

  [checkButton, unsubscribeButton].forEach((button) => {
    if (button) button.setAttribute("data-default-label", button.textContent.trim());
  });

  checkButton?.addEventListener("click", async () => {
    const email = readEmail();
    if (!email || !email.includes("@")) {
      setStatus("Enter the same email used during checkout first.", "is-error");
      return;
    }

    setStatus("");
    setLoading(checkButton, true, "Checking...");

    try {
      const response = await fetch(`/api/memberships/status?email=${encodeURIComponent(email)}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to check membership right now.");
      }

      renderMembership(payload.member);
      setStatus("Membership record found.", "is-success");
    } catch (error) {
      if (resultCard) resultCard.hidden = true;
      setStatus(error.message || "Unable to check membership right now.", "is-error");
    } finally {
      setLoading(checkButton, false, "Checking...");
      if (checkButton) checkButton.textContent = checkButton.getAttribute("data-default-label") || "Check Membership";
    }
  });

  unsubscribeButton?.addEventListener("click", async () => {
    const email = readEmail();
    if (!email || !email.includes("@")) {
      setStatus("Enter the membership email before requesting unsubscribe.", "is-error");
      return;
    }

    setStatus("");
    setLoading(unsubscribeButton, true, "Cancelling...");

    try {
      const response = await fetch("/api/memberships/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason: "cancelled_by_member" }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to cancel membership right now.");
      }

      if (resultCard) resultCard.hidden = true;
      setStatus("Membership cancellation requested. Access should be removed from the active state.", "is-success");
    } catch (error) {
      setStatus(error.message || "Unable to cancel membership right now.", "is-error");
    } finally {
      setLoading(unsubscribeButton, false, "Cancelling...");
      if (unsubscribeButton) {
        unsubscribeButton.textContent = unsubscribeButton.getAttribute("data-default-label") || "Unsubscribe";
      }
    }
  });
};

export const setupCommerce = () => {
  setupCoursePaymentLinks();
  setupTrainingCheckout();
  setupCourseLaunchOffer();
  setupPaywallModal();
  setupMembershipManagement();
};
