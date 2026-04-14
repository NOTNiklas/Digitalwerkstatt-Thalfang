const DWT_CONFIG = {
  consentKey: "dwt-cookie-consent",
  consentDurationMs: 24 * 60 * 60 * 1000
};

const SELECTORS = {
  header: "[data-header]",
  nav: "[data-nav]",
  navToggle: "[data-nav-toggle]",
  reveal: ".reveal",
  scrollTop: "[data-scroll-top]",
  year: "[data-current-year]",
  form: "[data-contact-form]",
  formFeedback: "[data-form-feedback]",
  submitButton: "[data-submit-button]",
  contactSuccessPanel: "[data-contact-success-panel]",
  contactSuccessModal: "[data-contact-success-modal]",
  contactReset: "[data-contact-reset]",
  contactModalClose: "[data-contact-modal-close]",
  cookieBanner: "[data-cookie-banner]",
  cookieModal: "[data-cookie-modal]",
  analyticsToggle: "[data-analytics-toggle]"
};

let analyticsLoaded = false;

document.addEventListener("DOMContentLoaded", () => {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  if (window.location.pathname.endsWith("/") || /index\.html$/i.test(window.location.pathname)) {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  window.scrollTo(0, 0);
  setCurrentYear();
  initHeader();
  initNavigation();
  initRevealAnimations();
  initHeroMotion();
  initScrollTop();
  initCookieConsent();
  initContactForm();
});

window.addEventListener("pageshow", () => {
  window.scrollTo(0, 0);
});

function setCurrentYear() {
  document.querySelectorAll(SELECTORS.year).forEach((node) => {
    node.textContent = new Date().getFullYear();
  });
}

function initHeader() {
  const header = document.querySelector(SELECTORS.header);
  if (!header) {
    return;
  }

  const updateHeaderState = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 18);
  };

  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });
}

function initNavigation() {
  const nav = document.querySelector(SELECTORS.nav);
  const toggle = document.querySelector(SELECTORS.navToggle);
  const navLinks = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')) : [];

  if (nav && toggle) {
    const setOpen = (isOpen) => {
      nav.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("nav-open", isOpen);
    };

    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      setOpen(!isExpanded);
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) {
        return;
      }

      if (nav.contains(event.target) || toggle.contains(event.target)) {
        return;
      }

      setOpen(false);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 1024) {
        setOpen(false);
      }
    });
  }

  if (!navLinks.length) {
    return;
  }

  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!sections.length) {
    return;
  }

  const linkMap = new Map(
    navLinks.map((link) => [link.getAttribute("href"), link])
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        linkMap.forEach((link) => link.classList.remove("is-active"));
        const activeLink = linkMap.get(`#${entry.target.id}`);
        if (activeLink) {
          activeLink.classList.add("is-active");
        }
      });
    },
    {
      threshold: 0.45,
      rootMargin: "-20% 0px -35% 0px"
    }
  );

  sections.forEach((section) => observer.observe(section));
}

function initRevealAnimations() {
  const items = Array.from(document.querySelectorAll(SELECTORS.reveal));
  if (!items.length) {
    return;
  }

  items.forEach((item, index) => {
    item.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 70}ms`);
  });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  const revealIfInView = () => {
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.92 && rect.bottom >= 0) {
        item.classList.add("is-visible");
      }
    });
  };

  items.forEach((item) => observer.observe(item));
  revealIfInView();
  window.addEventListener("load", revealIfInView, { once: true });
}

function initHeroMotion() {
  const hero = document.querySelector(".hero");
  const layers = Array.from(document.querySelectorAll("[data-depth]"));
  const grid = document.querySelector(".hero-grid");

  if (!hero || !layers.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let ticking = false;

  const animate = () => {
    currentX += (pointerX - currentX) * 0.08;
    currentY += (pointerY - currentY) * 0.08;
    const scrollOffset = Math.min(window.scrollY * 0.08, 24);

    layers.forEach((layer) => {
      const depth = Number(layer.dataset.depth || 10);
      const x = (currentX / 100) * depth;
      const y = (currentY / 100) * depth - scrollOffset;
      layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });

    if (grid) {
      grid.style.transform = `translate3d(${currentX * 0.05}px, ${-scrollOffset * 0.6}px, 0)`;
    }

    ticking = false;
  };

  const requestFrame = () => {
    if (ticking) {
      return;
    }
    ticking = true;
    window.requestAnimationFrame(animate);
  };

  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    pointerX = event.clientX - rect.left - rect.width / 2;
    pointerY = event.clientY - rect.top - rect.height / 2;
    requestFrame();
  });

  hero.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
    requestFrame();
  });

  window.addEventListener("scroll", requestFrame, { passive: true });
}

function initScrollTop() {
  const button = document.querySelector(SELECTORS.scrollTop);
  if (!button) {
    return;
  }

  const updateState = () => {
    button.classList.toggle("is-visible", window.scrollY > 520);
  };

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  updateState();
  window.addEventListener("scroll", updateState, { passive: true });
}

function initCookieConsent() {
  const banner = document.querySelector(SELECTORS.cookieBanner);
  const modal = document.querySelector(SELECTORS.cookieModal);
  const analyticsToggle = document.querySelector(SELECTORS.analyticsToggle);
  const gaMeasurementId = (document.body.dataset.gaId || "").trim();
  const analyticsConfigured = isValidGaId(gaMeasurementId);

  if (!banner || !modal || !analyticsToggle) {
    return;
  }

  if (!analyticsConfigured) {
    analyticsToggle.checked = false;
    analyticsToggle.disabled = true;
    analyticsToggle.closest(".cookie-option")?.setAttribute("hidden", "");
  }

  const storedConsent = getStoredConsent();
  const hasFreshConsent = isConsentFresh(storedConsent);

  if (hasFreshConsent) {
    analyticsToggle.checked = analyticsConfigured && Boolean(storedConsent.analytics);
    applyConsent(storedConsent, gaMeasurementId);
  } else {
    disableAnalytics(gaMeasurementId);
    showBanner();
  }

  document.querySelector("[data-cookie-accept-all]")?.addEventListener("click", () => {
    const consent = saveConsent({ necessary: true, analytics: analyticsConfigured });
    analyticsToggle.checked = analyticsConfigured;
    applyConsent(consent, gaMeasurementId);
    hideBanner();
    hideModal();
  });

  document.querySelector("[data-cookie-accept-necessary]")?.addEventListener("click", () => {
    const consent = saveConsent({ necessary: true, analytics: false });
    analyticsToggle.checked = false;
    applyConsent(consent, gaMeasurementId);
    hideBanner();
    hideModal();
  });

  document.querySelector("[data-cookie-open-settings]")?.addEventListener("click", openSettings);
  document.querySelectorAll("[data-open-cookie-settings]").forEach((button) => {
    button.addEventListener("click", openSettings);
  });

  document.querySelectorAll("[data-cookie-close]").forEach((button) => {
    button.addEventListener("click", hideModal);
  });

  document.querySelector("[data-cookie-save-settings]")?.addEventListener("click", () => {
    const consent = saveConsent({
      necessary: true,
      analytics: analyticsToggle.checked
    });
    applyConsent(consent, gaMeasurementId);
    hideBanner();
    hideModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideModal();
    }
  });

  function openSettings() {
    const freshConsent = getStoredConsent();
    analyticsToggle.checked = Boolean(
      analyticsConfigured && freshConsent && freshConsent.analytics && isConsentFresh(freshConsent)
    );
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function showBanner() {
    banner.hidden = false;
  }

  function hideBanner() {
    banner.hidden = true;
  }

  function hideModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
}

function getStoredConsent() {
  try {
    const rawValue = window.localStorage.getItem(DWT_CONFIG.consentKey);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

function isConsentFresh(consent) {
  if (!consent || typeof consent.timestamp !== "number") {
    return false;
  }

  return Date.now() - consent.timestamp < DWT_CONFIG.consentDurationMs;
}

function saveConsent(consent) {
  const payload = {
    necessary: true,
    analytics: Boolean(consent.analytics),
    timestamp: Date.now()
  };

  window.localStorage.setItem(DWT_CONFIG.consentKey, JSON.stringify(payload));
  return payload;
}

function applyConsent(consent, gaMeasurementId) {
  if (consent.analytics) {
    enableAnalytics(gaMeasurementId);
    return;
  }

  disableAnalytics(gaMeasurementId);
}

function enableAnalytics(gaMeasurementId) {
  if (!isValidGaId(gaMeasurementId)) {
    return;
  }

  window[`ga-disable-${gaMeasurementId}`] = false;

  if (!analyticsLoaded) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("consent", "default", {
      analytics_storage: "granted"
    });
    window.gtag("config", gaMeasurementId, {
      anonymize_ip: true,
      transport_type: "beacon"
    });

    analyticsLoaded = true;
    return;
  }

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: "granted"
    });
  }
}

function disableAnalytics(gaMeasurementId) {
  if (!isValidGaId(gaMeasurementId)) {
    return;
  }

  window[`ga-disable-${gaMeasurementId}`] = true;

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: "denied"
    });
  }
}

function isValidGaId(value) {
  return /^G-[A-Z0-9]+$/i.test(value);
}

function initContactForm() {
  const form = document.querySelector(SELECTORS.form);
  if (!form) {
    return;
  }

  const feedback = form.querySelector(SELECTORS.formFeedback);
  const submitButton = form.querySelector(SELECTORS.submitButton);
  const successPanel = document.querySelector(SELECTORS.contactSuccessPanel);
  const successModal = document.querySelector(SELECTORS.contactSuccessModal);
  const resetButton = document.querySelector(SELECTORS.contactReset);
  const modalCloseButtons = document.querySelectorAll(SELECTORS.contactModalClose);

  const openSuccessModal = () => {
    if (!successModal) {
      return;
    }

    successModal.hidden = false;
    successModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("contact-success-open");
  };

  const closeSuccessModal = () => {
    if (!successModal) {
      return;
    }

    successModal.hidden = true;
    successModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("contact-success-open");
  };

  const showForm = () => {
    closeSuccessModal();
    form.hidden = false;
    successPanel?.setAttribute("hidden", "");
  };

  const showSuccessState = () => {
    form.hidden = true;
    successPanel?.removeAttribute("hidden");
    openSuccessModal();
  };

  resetButton?.addEventListener("click", () => {
    showForm();
    const firstField = form.elements.namedItem("name");
    if (firstField instanceof HTMLElement && typeof firstField.focus === "function") {
      firstField.focus();
    }
  });

  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeSuccessModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && successModal && !successModal.hidden) {
      closeSuccessModal();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearFeedback(feedback);

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      privacy: formData.get("privacy") === "on"
    };

    const validation = validateForm(form, payload);
    if (!validation.valid) {
      setFeedback(feedback, validation.message, "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.classList.add("is-loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Die Anfrage konnte nicht gesendet werden.");
      }

      form.reset();
      clearInvalidState(form);
      setFeedback(feedback, "Vielen Dank. Ihre Anfrage wurde erfolgreich versendet.", "success");
      showSuccessState();
    } catch (error) {
      setFeedback(
        feedback,
        error instanceof Error ? error.message : "Beim Versand ist ein Fehler aufgetreten.",
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.classList.remove("is-loading");
    }
  });
}

function validateForm(form, payload) {
  const fields = [
    { name: "name", valid: payload.name.length >= 2, message: "Bitte geben Sie Ihren Namen an." },
    { name: "email", valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email), message: "Bitte geben Sie eine gültige E-Mail-Adresse an." },
    { name: "message", valid: payload.message.length >= 20, message: "Bitte beschreiben Sie Ihr Anliegen mit mindestens 20 Zeichen." },
    { name: "privacy", valid: payload.privacy, message: "Bitte bestätigen Sie die Datenschutzerklärung." }
  ];

  clearInvalidState(form);

  const invalidField = fields.find((field) => !field.valid);
  if (!invalidField) {
    return { valid: true, message: "" };
  }

  const element = form.elements[invalidField.name];
  if (element) {
    element.setAttribute("aria-invalid", "true");
    if (typeof element.focus === "function") {
      element.focus();
    }
  }

  return { valid: false, message: invalidField.message };
}

function clearInvalidState(form) {
  Array.from(form.elements).forEach((element) => {
    if (element instanceof HTMLElement) {
      element.removeAttribute("aria-invalid");
    }
  });
}

function setFeedback(node, message, type) {
  if (!node) {
    return;
  }

  node.textContent = message;
  node.classList.remove("is-success", "is-error");
  node.classList.add(type === "success" ? "is-success" : "is-error");
}

function clearFeedback(node) {
  if (!node) {
    return;
  }

  node.textContent = "";
  node.classList.remove("is-success", "is-error");
}
