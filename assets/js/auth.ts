import {
  body,
  bindAccountTypeVisibility,
  bindAvatarUploader,
  escapeHtml,
  fetchCurrentUser,
  formatDateLabel,
  formatMembershipAccess,
  updateAvatarPreview,
} from "./shared.ts";

const setupAuthForms = () => {
  const signupForm = document.querySelector("[data-signup-form]");
  const loginForm = document.querySelector("[data-login-form]");

  const bindPasswordToggles = (form) => {
    if (!form) return;

    form.querySelectorAll("[data-password-toggle]").forEach((button) => {
      const field = button.closest(".password-field");
      const input = field?.querySelector("input");
      if (!input) return;

      button.addEventListener("click", () => {
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        button.textContent = showing ? "Show" : "Hide";
        button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
        button.setAttribute("aria-pressed", String(!showing));
      });
    });
  };

  const bindForm = (form, options) => {
    if (!form) return;

    const statusNode = form.querySelector(options.statusSelector);
    const submitButton = form.querySelector('button[type="submit"]');
    const defaultLabel = submitButton ? submitButton.textContent.trim() : "";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const payload = options.getPayload(form);
      if (statusNode) {
        statusNode.textContent = "";
        statusNode.classList.remove("is-error", "is-success");
      }

      submitButton?.classList.add("is-loading");
      submitButton?.setAttribute("aria-busy", "true");
      if (submitButton) submitButton.textContent = options.loadingLabel;

      try {
        const response = await fetch(options.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error || options.errorMessage);
        }

        if (statusNode) {
          statusNode.textContent = options.successMessage;
          statusNode.classList.add("is-success");
        }

        window.setTimeout(() => {
          window.location.href = options.redirectTo;
        }, 250);
      } catch (error) {
        if (statusNode) {
          statusNode.textContent = error.message || options.errorMessage;
          statusNode.classList.add("is-error");
        }
      } finally {
        submitButton?.classList.remove("is-loading");
        submitButton?.removeAttribute("aria-busy");
        if (submitButton) submitButton.textContent = defaultLabel;
      }
    });
  };

  bindForm(signupForm, {
    endpoint: "/api/auth/signup",
    statusSelector: "[data-signup-status]",
    loadingLabel: "Creating Account...",
    successMessage: "Account created. Redirecting to your profile...",
    errorMessage: "Unable to create account right now.",
    redirectTo: "/account",
    getPayload: (form) => ({
      fullName: (form.querySelector('input[name="fullName"]')?.value || "").trim(),
      email: (form.querySelector('input[name="email"]')?.value || "").trim().toLowerCase(),
      password: String(form.querySelector('input[name="password"]')?.value || ""),
      accountType: String(form.querySelector('select[name="accountType"]')?.value || ""),
      agencyName: (form.querySelector('input[name="agencyName"]')?.value || "").trim(),
      goals: String(form.querySelector('select[name="goals"]')?.value || "").trim(),
      avatarUrl: String(form.querySelector('input[name="avatarUrl"]')?.value || "").trim(),
    }),
  });

  bindForm(loginForm, {
    endpoint: "/api/auth/login",
    statusSelector: "[data-login-status]",
    loadingLabel: "Logging In...",
    successMessage: "Login successful. Redirecting to your profile...",
    errorMessage: "Unable to log in right now.",
    redirectTo: "/account",
    getPayload: (form) => ({
      email: (form.querySelector('input[name="email"]')?.value || "").trim().toLowerCase(),
      password: String(form.querySelector('input[name="password"]')?.value || ""),
    }),
  });

  bindPasswordToggles(signupForm);
  bindPasswordToggles(loginForm);
  bindAvatarUploader(signupForm, { previewSelector: "[data-signup-avatar-preview]" });
  bindAccountTypeVisibility(signupForm);
};

const setupAccountPage = () => {
  if (!body.classList.contains("page-account")) return;

  const statusNode = document.querySelector("[data-account-status]");
  const card = document.querySelector("[data-account-card]");
  const loginCta = document.querySelector("[data-account-login-cta]");
  const logoutButton = document.querySelector("[data-account-logout]");
  const nameNode = document.querySelector("[data-account-name]");
  const emailNode = document.querySelector("[data-account-email]");
  const planBadgeNode = document.querySelector("[data-account-plan-badge]");
  const planNode = document.querySelector("[data-account-plan]");
  const accessNode = document.querySelector("[data-account-access]");
  const profileForm = document.querySelector("[data-account-profile-form]");
  const profileStatusNode = document.querySelector("[data-account-profile-status]");
  const saveButton = document.querySelector("[data-account-save]");
  const coursesNode = document.querySelector("[data-account-courses]");
  const avatarPreview = document.querySelector("[data-account-avatar-preview]");
  const adminCta = document.querySelector("[data-account-admin-cta]");

  const setStatus = (message, tone = "") => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.classList.remove("is-error", "is-success");
    if (tone) statusNode.classList.add(tone);
  };

  const loadAccount = async () => {
    try {
      const user = await fetchCurrentUser();
      if (nameNode) nameNode.textContent = user?.fullName || "Unknown";
      if (emailNode) emailNode.textContent = user?.email || "Unknown";
      if (planBadgeNode) planBadgeNode.textContent = user?.planName || user?.planCode || "Member";
      if (planNode) {
        planNode.textContent = user?.subscriptionStatus
          ? `${user.subscriptionStatus} (${user.planName || user.planCode || "Course Club"})`
          : "No subscription found";
      }
      if (accessNode) accessNode.textContent = formatMembershipAccess(user);
      updateAvatarPreview(avatarPreview, user?.avatarUrl, (user?.fullName || "CD").slice(0, 2).toUpperCase());

      if (profileForm) {
        const fullNameInput = profileForm.querySelector('input[name="fullName"]');
        const emailInput = profileForm.querySelector('input[name="email"]');
        const accountTypeInput = profileForm.querySelector('select[name="accountType"]');
        const agencyNameInput = profileForm.querySelector('input[name="agencyName"]');
        const goalsInput = profileForm.querySelector('textarea[name="goals"]');
        const avatarUrlInput = profileForm.querySelector('input[name="avatarUrl"]');

        if (fullNameInput) fullNameInput.value = user?.fullName || "";
        if (emailInput) emailInput.value = user?.email || "";
        if (accountTypeInput) accountTypeInput.value = user?.accountType || "individual";
        if (agencyNameInput) agencyNameInput.value = user?.agencyName || "";
        if (goalsInput) goalsInput.value = user?.goals || "";
        if (avatarUrlInput) avatarUrlInput.value = user?.avatarUrl || "";
        bindAccountTypeVisibility(profileForm);
      }

      if (coursesNode) {
        const courses = [];
        const accessItems = Array.isArray(user?.access) ? user.access : [];
        if (accessItems.length) {
          accessItems.forEach((item) => {
            courses.push({
              title: item.courseSlug === "course-club" ? "Course Club Library" : item.courseSlug,
              status: item.accessStatus || "unknown",
              copy:
                item.accessStatus === "active"
                  ? "Your membership currently unlocks this library."
                  : "This course access is not active yet.",
            });
          });
        } else {
          courses.push({
            title: "Course Club Library",
            status: user?.subscriptionStatus || "waiting",
            copy: "Your active membership will unlock the current and future training tracks here.",
          });
        }

        coursesNode.innerHTML = courses
          .map(
            (course) => `
              <article class="library-course-card">
                <div class="library-course-meta">
                  <h4>${course.title}</h4>
                  <span>${course.status}</span>
                </div>
                <p>${course.copy}</p>
              </article>
            `
          )
          .join("");
      }

      if (card) card.hidden = false;
      if (loginCta) {
        loginCta.hidden = true;
        loginCta.textContent = "Log In";
      }
      if (logoutButton) logoutButton.hidden = false;
      if (saveButton) saveButton.hidden = false;
      if (adminCta) adminCta.hidden = !user?.isAdmin;
      setStatus("You are logged in.", "is-success");
    } catch {
      if (card) card.hidden = true;
      if (loginCta) {
        loginCta.hidden = false;
        loginCta.textContent = "Log In";
      }
      if (logoutButton) logoutButton.hidden = true;
      if (saveButton) saveButton.hidden = true;
      if (adminCta) adminCta.hidden = true;
      setStatus("You are not logged in yet. Log in to view your member profile.", "is-error");
    }
  };

  bindAvatarUploader(profileForm, { previewSelector: "[data-account-avatar-preview]" });
  bindAccountTypeVisibility(profileForm);

  profileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (profileStatusNode) {
      profileStatusNode.textContent = "";
      profileStatusNode.classList.remove("is-error", "is-success");
    }

    const defaultLabel = saveButton?.textContent || "Save Profile";
    if (saveButton) {
      saveButton.classList.add("is-loading");
      saveButton.setAttribute("aria-busy", "true");
      saveButton.textContent = "Saving...";
    }

    try {
      const response = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: (profileForm.querySelector('input[name="fullName"]')?.value || "").trim(),
          accountType: String(profileForm.querySelector('select[name="accountType"]')?.value || ""),
          agencyName: (profileForm.querySelector('input[name="agencyName"]')?.value || "").trim(),
          goals: (profileForm.querySelector('textarea[name="goals"]')?.value || "").trim(),
          avatarUrl: String(profileForm.querySelector('input[name="avatarUrl"]')?.value || "").trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to save profile right now.");
      }

      if (profileStatusNode) {
        profileStatusNode.textContent = "Profile updated successfully.";
        profileStatusNode.classList.add("is-success");
      }

      await loadAccount();
    } catch (error) {
      if (profileStatusNode) {
        profileStatusNode.textContent = error.message || "Unable to save profile right now.";
        profileStatusNode.classList.add("is-error");
      }
    } finally {
      if (saveButton) {
        saveButton.classList.remove("is-loading");
        saveButton.removeAttribute("aria-busy");
        saveButton.textContent = defaultLabel;
      }
    }
  });

  logoutButton?.addEventListener("click", async () => {
    logoutButton.classList.add("is-loading");
    logoutButton.setAttribute("aria-busy", "true");
    const defaultLabel = logoutButton.textContent.trim();
    logoutButton.textContent = "Logging Out...";

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      logoutButton.classList.remove("is-loading");
      logoutButton.removeAttribute("aria-busy");
      logoutButton.textContent = defaultLabel;
    }
  });

  loadAccount();
};

const setupAdminPage = () => {
  if (!body.classList.contains("page-admin")) return;

  const statusNode = document.querySelector("[data-admin-status]");
  const loginCta = document.querySelector("[data-admin-login-cta]");
  const refreshButton = document.querySelector("[data-admin-refresh]");
  const shell = document.querySelector("[data-admin-shell]");
  const searchInput = document.querySelector("[data-admin-search]");
  const memberList = document.querySelector("[data-admin-member-list]");
  const emptyState = document.querySelector("[data-admin-empty]");
  const totalNode = document.querySelector("[data-admin-total]");
  const activeNode = document.querySelector("[data-admin-active]");
  const viewersNode = document.querySelector("[data-admin-viewers]");
  const recentNode = document.querySelector("[data-admin-recent]");

  let members = [];
  let activeQuery = "";

  const setStatus = (message, tone = "") => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.classList.remove("is-error", "is-success");
    if (tone) statusNode.classList.add(tone);
  };

  const setSummary = (summary = {}) => {
    if (totalNode) totalNode.textContent = String(summary.totalMembers || 0);
    if (activeNode) activeNode.textContent = String(summary.activeMembers || 0);
    if (viewersNode) viewersNode.textContent = String(summary.activeViewers || 0);
    if (recentNode) recentNode.textContent = String(summary.recentSignups || 0);
  };

  const getFilteredMembers = () => {
    const query = activeQuery.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) => {
      const haystack = [
        member?.fullName,
        member?.email,
        member?.agencyName,
        member?.planName,
        member?.planCode,
        member?.subscriptionStatus,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  };

  const renderMembers = () => {
    if (!memberList) return;

    const filteredMembers = getFilteredMembers();
    if (emptyState) emptyState.hidden = filteredMembers.length !== 0;

    memberList.innerHTML = filteredMembers
      .map((member) => {
        const accessItems = Array.isArray(member?.access) ? member.access : [];
        const accessMarkup = accessItems.length
          ? accessItems
              .map(
                (item) => `
                  <span class="admin-access-chip ${item?.accessStatus === "active" ? "is-active" : ""}">
                    ${escapeHtml(item?.courseSlug || "course")} · ${escapeHtml(item?.accessStatus || "unknown")}
                  </span>
                `
              )
              .join("")
          : '<span class="admin-access-chip">No course access</span>';

        const fullName = member?.fullName || "Unnamed member";
        const initials = escapeHtml(fullName.slice(0, 2).toUpperCase());
        const agencyLine = member?.agencyName ? `<span>${escapeHtml(member.agencyName)}</span>` : "";
        const planLabel = member?.planName || member?.planCode || "No plan";
        const subscriptionStatus = member?.subscriptionStatus || "no subscription";
        const showRevoke =
          !member?.isAdmin &&
          (subscriptionStatus === "active" || accessItems.some((item) => item?.accessStatus === "active"));

        return `
          <article class="admin-member-card">
            <div class="admin-member-head">
              <div class="admin-member-avatar" aria-hidden="true">${initials}</div>
              <div class="admin-member-heading">
                <div class="admin-member-title-row">
                  <h3>${escapeHtml(fullName)}</h3>
                  <div class="admin-member-badges">
                    <span class="meta-pill">${escapeHtml(member?.role || "member")}</span>
                    <span class="admin-status-badge ${subscriptionStatus === "active" ? "is-active" : ""}">${escapeHtml(subscriptionStatus)}</span>
                  </div>
                </div>
                <p>${escapeHtml(member?.email || "No email on file")}</p>
                <div class="admin-member-subline">
                  <span>${escapeHtml(planLabel)}</span>
                  ${agencyLine}
                </div>
              </div>
            </div>

            <div class="admin-member-grid">
              <div class="admin-member-panel">
                <h4>Account</h4>
                <p><strong>Type:</strong> ${escapeHtml(member?.accountType || "individual")}</p>
                <p><strong>Status:</strong> ${escapeHtml(member?.accountStatus || "active")}</p>
                <p><strong>Joined:</strong> ${escapeHtml(formatDateLabel(member?.createdAt, "Unknown"))}</p>
                <p><strong>Last seen:</strong> ${escapeHtml(formatDateLabel(member?.lastSeenAt))}</p>
              </div>
              <div class="admin-member-panel">
                <h4>Billing</h4>
                <p><strong>Plan:</strong> ${escapeHtml(planLabel)}</p>
                <p><strong>Subscription:</strong> ${escapeHtml(subscriptionStatus)}</p>
                <p><strong>Current period end:</strong> ${escapeHtml(formatDateLabel(member?.currentPeriodEnd, "Not set"))}</p>
                <p><strong>Last payment:</strong> ${escapeHtml(formatDateLabel(member?.lastPaymentAt, "No payment yet"))}</p>
              </div>
            </div>

            <div class="admin-access-row">
              ${accessMarkup}
            </div>

            <div class="admin-member-actions">
              <a href="mailto:${encodeURIComponent(member?.email || "")}" class="btn-secondary">Email Member</a>
              ${
                showRevoke
                  ? `<button type="button" class="btn-primary admin-revoke-button" data-admin-revoke="${escapeHtml(member?.id || "")}">Revoke Access</button>`
                  : ""
              }
            </div>
          </article>
        `;
      })
      .join("");

    memberList.querySelectorAll("[data-admin-revoke]").forEach((button) => {
      button.addEventListener("click", async () => {
        const userId = button.getAttribute("data-admin-revoke") || "";
        if (!userId) return;

        const confirmed = window.confirm(
          "Revoke this member's active access and cancel their current subscription?"
        );
        if (!confirmed) return;

        const defaultLabel = button.textContent.trim();
        button.classList.add("is-loading");
        button.setAttribute("aria-busy", "true");
        button.textContent = "Revoking...";

        try {
          const response = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });

          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error || "Unable to revoke access right now.");
          }

          setStatus("Member access updated successfully.", "is-success");
          await loadDashboard(true);
        } catch (error) {
          setStatus(error.message || "Unable to revoke access right now.", "is-error");
        } finally {
          button.classList.remove("is-loading");
          button.removeAttribute("aria-busy");
          button.textContent = defaultLabel;
        }
      });
    });
  };

  const loadDashboard = async (silent = false) => {
    try {
      if (!silent) setStatus("Checking admin session...");

      const user = await fetchCurrentUser();
      if (!user?.isAdmin) {
        const error = new Error("Admin access required.");
        error.status = 403;
        throw error;
      }

      const response = await fetch("/api/admin");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload?.error || "Unable to load the admin dashboard.");
        error.status = response.status;
        throw error;
      }

      members = Array.isArray(payload?.members) ? payload.members : [];
      setSummary(payload?.summary || {});
      renderMembers();

      if (loginCta) loginCta.hidden = true;
      if (refreshButton) refreshButton.hidden = false;
      if (shell) shell.hidden = false;
      setStatus(`Admin session confirmed for ${user.fullName || user.email}.`, "is-success");
    } catch (error) {
      setSummary();
      members = [];
      renderMembers();
      if (shell) shell.hidden = true;

      if (error.status === 401) {
        if (loginCta) {
          loginCta.hidden = false;
          loginCta.textContent = "Log In";
        }
        if (refreshButton) refreshButton.hidden = true;
        setStatus("Log in with an admin account to open this dashboard.", "is-error");
        return;
      }

      if (loginCta) loginCta.hidden = true;
      if (refreshButton) refreshButton.hidden = false;
      setStatus(error.message || "Unable to load the admin dashboard.", "is-error");
    }
  };

  searchInput?.addEventListener("input", () => {
    activeQuery = searchInput.value || "";
    renderMembers();
  });

  refreshButton?.addEventListener("click", async () => {
    const defaultLabel = refreshButton.textContent.trim();
    refreshButton.classList.add("is-loading");
    refreshButton.setAttribute("aria-busy", "true");
    refreshButton.textContent = "Refreshing...";

    try {
      await loadDashboard(true);
    } finally {
      refreshButton.classList.remove("is-loading");
      refreshButton.removeAttribute("aria-busy");
      refreshButton.textContent = defaultLabel;
    }
  });

  loadDashboard();
};

const setupMemberLibrary = () => {
  if (!body.classList.contains("page-library")) return;

  const statusNode = document.querySelector("[data-library-session-status]");
  const resultCard = document.querySelector("[data-library-session-result]");
  const emailNode = document.querySelector("[data-library-session-email]");
  const planNode = document.querySelector("[data-library-session-plan]");
  const accessNode = document.querySelector("[data-library-session-access]");
  const libraryShell = document.querySelector("[data-library-shell]");
  const loginCta = document.querySelector("[data-library-login-cta]");
  const accountCta = document.querySelector("[data-library-account-cta]");
  const playerFrame = document.querySelector(".library-video-player[data-bunny-video-id]");
  const playerNote = document.querySelector("[data-library-player-note]");

  const setStatus = (message, tone = "") => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.classList.remove("is-error", "is-success");
    if (tone) statusNode.classList.add(tone);
  };

  const loadProtectedPlayer = async () => {
    const videoId = playerFrame?.getAttribute("data-bunny-video-id") || "";
    if (!playerFrame || !videoId || playerFrame.getAttribute("src")) return;

    try {
      if (playerNote) playerNote.textContent = "Loading your protected member lesson...";

      const response = await fetch(`/api/library/player?videoId=${encodeURIComponent(videoId)}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.embedUrl) {
        throw new Error(payload?.error || "Unable to load the member video right now.");
      }

      playerFrame.setAttribute("src", payload.embedUrl);
      if (playerNote) {
        playerNote.textContent =
          "This lesson walks through account creation, bot setup, Google Sheets mapping, Facebook connection, and testing inside your protected member lesson player.";
      }
    } catch (error) {
      if (playerNote) playerNote.textContent = error.message || "Unable to load the member video right now.";
    }
  };

  const renderMember = (user) => {
    if (!resultCard || !emailNode || !planNode || !accessNode) return;
    emailNode.textContent = user?.email || "Unknown";
    planNode.textContent = user?.subscriptionStatus
      ? `${user.subscriptionStatus} (${user.planName || user.planCode || "Course Club"})`
      : "No subscription found";
    accessNode.textContent = formatMembershipAccess(user);
    resultCard.hidden = false;
  };

  const loadLibrary = async () => {
    try {
      const user = await fetchCurrentUser();
      renderMember(user);

      const hasActiveAccess = Array.isArray(user?.access)
        ? user.access.some((item) => item?.accessStatus === "active")
        : false;
      const isActive = hasActiveAccess || user?.subscriptionStatus === "active";

      if (!isActive) {
        if (libraryShell) libraryShell.hidden = true;
        if (loginCta) {
          loginCta.hidden = false;
          loginCta.textContent = "Membership Needed";
          loginCta.setAttribute("href", "/courses#payment-options");
        }
        if (accountCta) accountCta.hidden = false;
        setStatus("You are logged in, but the membership is not active yet.", "is-error");
        return;
      }

      if (libraryShell) libraryShell.hidden = false;
      if (loginCta) loginCta.hidden = true;
      if (accountCta) accountCta.hidden = false;
      await loadProtectedPlayer();
      setStatus("Active membership confirmed. Your library is unlocked below.", "is-success");
    } catch {
      if (libraryShell) libraryShell.hidden = true;
      if (resultCard) resultCard.hidden = true;
      if (loginCta) {
        loginCta.hidden = false;
        loginCta.textContent = "Log In to Continue";
        loginCta.setAttribute("href", "/login");
      }
      if (accountCta) accountCta.hidden = true;
      setStatus("Log in with your member account to unlock the library.", "is-error");
    }
  };

  loadLibrary();
};

export const setupAuthFeatures = () => {
  setupAuthForms();
  setupAccountPage();
  setupAdminPage();
  setupMemberLibrary();
};
