import { body, root, navToggle, navLinks, normalizePath, reducedMotionQuery, buildMessengerUrl } from "./shared.js";

const navAnchors = Array.from(document.querySelectorAll(".nav-links a"));

const setupSiteIntro = () => {
  if (!body.classList.contains("page-home")) return;

  const intro = document.querySelector(".site-intro");
  if (!intro) {
    body.classList.add("intro-complete");
    return;
  }

  const finishIntro = () => {
    body.classList.add("intro-complete");
  };

  if (reducedMotionQuery.matches) {
    finishIntro();
    return;
  }

  window.setTimeout(finishIntro, 1800);
};

const setupHomeHeroMedia = () => {
  if (!body.classList.contains("page-home")) return;

  const heroFrame = document.querySelector(".hero-video-frame");
  const heroVideo = heroFrame?.querySelector(".hero-video");
  if (!heroFrame || !heroVideo) return;

  const showFallback = () => {
    heroFrame.classList.add("is-video-fallback");
    heroFrame.classList.remove("is-video-ready");
  };

  const showVideo = () => {
    heroFrame.classList.add("is-video-ready");
    heroFrame.classList.remove("is-video-fallback");
  };

  const firstSource = heroVideo.querySelector("source")?.getAttribute("src") || "";
  if (!firstSource) {
    showFallback();
    return;
  }

  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  heroVideo.playsInline = true;

  heroVideo.addEventListener("loadeddata", showVideo, { once: true });
  heroVideo.addEventListener("playing", showVideo, { once: true });
  heroVideo.addEventListener("error", showFallback, { once: true });

  heroVideo.load();

  if (heroVideo.readyState >= 2) {
    showVideo();
    return;
  }

  window.setTimeout(() => {
    if (heroVideo.readyState < 2) showFallback();
  }, 1200);
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
  return { index, direction: directions[index % directions.length] };
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

const setupRevealAnimations = () => {
  const revealTargets = Array.from(
    new Set(
      Array.from(
        document.querySelectorAll(
          ".section-title, .stat-card, .featured-case-card, .about-card, .doc-media, .subpage-card, .starter-form, .workflow-step, .testimonial-card, .track-card, .step-card, .policy-item, .package-card, .update-card, .service-card, .service-showcase-card, .lead-system-feature, .insights-feature-media, .insights-feature-copy, .insight-story-card, .insight-panel, .insights-step-card, .cta-banner, .footer-grid, .footer-bottom, .collab-media-stack, .diamond-showcase, .showcase-card, .insight-link-card, .timeline-card, .scroll-merge"
        )
      )
    )
  );

  const setVisibleImmediately = (elements) => {
    elements.forEach((element) => element.classList.add("is-visible"));
  };

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

const setupMegaMenu = () => {
  if (!navLinks) return;

  const megaMenus = [
    {
      href: "/services",
      menuClass: "nav-mega-services",
      menuHtml: `
        <div class="nav-mega-grid">
          <section class="nav-mega-col">
            <p class="nav-mega-label"><i class="fas fa-laptop-code"></i> Core Services</p>
            <div class="nav-mega-links">
              <a class="nav-mega-card" href="/website-development"><strong>Website Development</strong><span>Business websites, landing pages, and conversion-focused builds.</span></a>
              <a class="nav-mega-card" href="/seo-services"><strong>SEO Services</strong><span>Search-ready page structure and on-page visibility improvements.</span></a>
              <a class="nav-mega-card" href="/google-sheets-database"><strong>Google Sheets Database</strong><span>Trackers and workflow-ready dashboards for daily monitoring.</span></a>
            </div>
          </section>
          <section class="nav-mega-col">
            <p class="nav-mega-label"><i class="fas fa-bullhorn"></i> Marketing & Social</p>
            <div class="nav-mega-links">
              <a class="nav-mega-card" href="/facebook-social-media"><strong>Facebook Page & Social Media</strong><span>Page setup, content support, and message flow improvements.</span></a>
              <a class="nav-mega-card" href="/facebook-social-media"><strong>Social Media Marketing</strong><span>Campaign ideas, posting support, and audience growth direction.</span></a>
              <a class="nav-mega-card" href="/blog"><strong>Blog</strong><span>Published articles, lessons, and practical updates from our work.</span></a>
            </div>
          </section>
          <section class="nav-mega-col">
            <p class="nav-mega-label"><i class="fas fa-diagram-project"></i> Agency Systems</p>
            <div class="nav-mega-links">
              <a class="nav-mega-card" href="/landbase-agency-process"><strong>A-Z Landbase Agency Process</strong><span>Bahrain, Qatar, and UAE recruitment workflow guidance.</span></a>
              <a class="nav-mega-card" href="/insights#applicants-framework"><strong>Applicants Framework</strong><span>How stronger positioning and funnel flow produced 100+ daily applicants.</span></a>
              <a class="nav-mega-card" href="/insights#office-show-system"><strong>Office Show System</strong><span>The follow-up and conversion logic behind 40+ office shows.</span></a>
            </div>
          </section>
        </div>
        <div class="nav-mega-footer">
          <a class="nav-mega-cta" href="/services">View All Services</a>
        </div>
      `,
    },
    {
      href: "/blog",
      menuClass: "nav-mega-blog",
      menuHtml: `
        <div class="nav-mega-grid">
          <section class="nav-mega-col">
            <p class="nav-mega-label"><i class="fas fa-user-tie"></i> Founder Story</p>
            <div class="nav-mega-links">
              <a class="nav-mega-card" href="/10-years-recruitment-tech"><strong>10 Years in Recruitment</strong><span>The founder story behind GCC recruitment experience and the shift into systems-driven agency work.</span></a>
            </div>
          </section>
          <section class="nav-mega-col">
            <p class="nav-mega-label"><i class="fas fa-robot"></i> Automation</p>
            <div class="nav-mega-links">
              <a class="nav-mega-card" href="/chatmaxima-secret-scaling-agency"><strong>ChatMaxima Secret to Scaling</strong><span>How Facebook Page automation can help agencies handle 200 to 300 applicants a day.</span></a>
            </div>
          </section>
          <section class="nav-mega-col">
            <p class="nav-mega-label"><i class="fas fa-table"></i> Database Systems</p>
            <div class="nav-mega-links">
              <a class="nav-mega-card" href="/google-sheets-secret-engine-agency"><strong>Google Sheets Secret Engine</strong><span>Why a structured tracker still works as the real-time engine behind recruitment follow-up.</span></a>
              <a class="nav-mega-card" href="/google-sheets-database"><strong>Google Sheets Database Service</strong><span>See the service behind the systems and trackers mentioned in the article.</span></a>
            </div>
          </section>
        </div>
        <div class="nav-mega-footer">
          <a class="nav-mega-cta" href="/blog">Open Blog Hub</a>
        </div>
      `,
    },
  ];

  const configuredItems = megaMenus
    .map((config) => {
      const triggerLink = navLinks.querySelector(`a[href="${config.href}"]`);
      const triggerItem = triggerLink?.closest("li");
      if (!triggerLink || !triggerItem) return null;

      triggerItem.classList.add("has-mega-menu");
      triggerLink.classList.add("nav-mega-trigger");

      if (!triggerLink.querySelector(".fa-chevron-down")) {
        const icon = document.createElement("i");
        icon.className = "fas fa-chevron-down";
        icon.setAttribute("aria-hidden", "true");
        triggerLink.appendChild(icon);
      }

      if (!triggerItem.querySelector(".nav-mega-menu")) {
        const menu = document.createElement("div");
        menu.className = "nav-mega-menu";
        if (config.menuClass) menu.classList.add(config.menuClass);
        menu.setAttribute("aria-hidden", "true");
        menu.innerHTML = config.menuHtml;
        triggerItem.appendChild(menu);
      }

      return {
        ...config,
        triggerLink,
        triggerItem,
        menu: triggerItem.querySelector(".nav-mega-menu"),
      };
    })
    .filter(Boolean);

  if (!configuredItems.length) return;

  const setMegaOpen = (targetItem, isOpen) => {
    configuredItems.forEach(({ triggerItem, menu }) => {
      const shouldOpen = triggerItem === targetItem ? isOpen : false;
      triggerItem.classList.toggle("is-mega-open", shouldOpen);
      menu?.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
    });
  };

  configuredItems.forEach(({ triggerLink, triggerItem }) => {
    triggerLink.addEventListener("click", (event) => {
      const isDesktop = window.innerWidth > 768;
      event.preventDefault();
      if (!isDesktop && !document.body.classList.contains("nav-open")) {
        window.location.href = triggerLink.href;
        return;
      }
      setMegaOpen(triggerItem, !triggerItem.classList.contains("is-mega-open"));
    });

    triggerItem.querySelectorAll(".nav-mega-menu a").forEach((link) => {
      link.addEventListener("click", () => setMegaOpen(triggerItem, false));
    });
  });

  document.addEventListener("click", (event) => {
    configuredItems.forEach(({ triggerItem }) => {
      if (!triggerItem.contains(event.target)) setMegaOpen(triggerItem, false);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    configuredItems.forEach(({ triggerItem }) => setMegaOpen(triggerItem, false));
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      configuredItems.forEach(({ triggerItem }) => setMegaOpen(triggerItem, false));
    }
  });
};

const setupMobileNav = () => {
  if (!navToggle || !navLinks) return;

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
};

const setupDiamondShowcases = () => {
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
};

const setupMessengerWidget = () => {
  const waWidget = document.querySelector("[data-wa-widget]");
  if (!waWidget) return;

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

    document.addEventListener("click", (event) => {
      if (panel.hidden) return;
      if (waWidget.contains(event.target)) return;
      setPanelOpen(false);
    });
  }

  if (send && input) {
    send.addEventListener("click", () => {
      const raw = input.value.trim() || "Hi, I want help with my website or recruitment project.";
      window.open(buildMessengerUrl(raw), "_blank", "noopener");
    });
  }
};

export const setupExperience = () => {
  setupRevealAnimations();
  setupNavTracking();
  setupScrollState();
  setupSiteIntro();
  setupHomeHeroMedia();
  setupMegaMenu();
  setupMobileNav();
  setupDiamondShowcases();
  setupMessengerWidget();
};
