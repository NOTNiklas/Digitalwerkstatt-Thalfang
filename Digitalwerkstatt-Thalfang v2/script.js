const DWT_CONFIG = {
  consentKey: "dwt-v2-cookie-consent",
  consentDurationMs: 183 * 24 * 60 * 60 * 1000
};

const SELECTORS = {
  header: "[data-header]",
  nav: "[data-nav]",
  navToggle: "[data-nav-toggle]",
  navLinks: "[data-nav-link]",
  reveal: ".reveal",
  form: "[data-contact-form]",
  formFeedback: "[data-form-feedback]",
  submitButton: "[data-submit-button]",
  contactSuccessPanel: "[data-contact-success-panel]",
  contactReset: "[data-contact-reset]",
  cookieBanner: "[data-cookie-banner]",
  cookieModal: "[data-cookie-modal]",
  analyticsToggle: "[data-analytics-toggle]",
  currentYear: "[data-current-year]"
};

let analyticsLoaded = false;

document.addEventListener("DOMContentLoaded", () => {
  setCurrentYear();
  initHeader();
  initNavigation();
  initRevealAnimations();
  initCookieConsent();
  initContactForm();
});

function setCurrentYear() {
  document.querySelectorAll(SELECTORS.currentYear).forEach((node) => {
    node.textContent = new Date().getFullYear();
  });
}

function initHeader() {
  const header = document.querySelector(SELECTORS.header);
  if (!header) {
    return;
  }

  const sync = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };

  sync();
  window.addEventListener("scroll", sync, { passive: true });
}

function initNavigation() {
  const nav = document.querySelector(SELECTORS.nav);
  const toggle = document.querySelector(SELECTORS.navToggle);
  const links = Array.from(document.querySelectorAll(SELECTORS.navLinks));
  const currentPage = document.body.dataset.page;

  links.forEach((link) => {
    if (link.dataset.navLink === currentPage) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });

  if (!nav || !toggle) {
    return;
  }

  const setOpen = (isOpen) => {
    nav.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("nav-open", isOpen);
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  links.forEach((link) => {
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

function initRevealAnimations() {
  const items = Array.from(document.querySelectorAll(SELECTORS.reveal));
  if (!items.length) {
    return;
  }

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
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  items.forEach((item) => observer.observe(item));
}

function initCookieConsent() {
  const banner = document.querySelector(SELECTORS.cookieBanner);
  const modal = document.querySelector(SELECTORS.cookieModal);
  const analyticsToggle = document.querySelector(SELECTORS.analyticsToggle);
  const measurementId = String(document.body.dataset.gaId || "").trim();
  const analyticsConfigured = isValidGaId(measurementId);

  if (!banner || !modal || !analyticsToggle) {
    return;
  }

  if (!analyticsConfigured) {
    analyticsToggle.checked = false;
    analyticsToggle.disabled = true;
  }

  const consent = getStoredConsent();
  if (isConsentFresh(consent)) {
    analyticsToggle.checked = analyticsConfigured && Boolean(consent.analytics);
    applyConsent(consent, measurementId);
  } else {
    disableAnalytics(measurementId);
    banner.hidden = false;
  }

  document.querySelector("[data-cookie-accept-all]")?.addEventListener("click", () => {
    const saved = saveConsent({ analytics: analyticsConfigured });
    analyticsToggle.checked = analyticsConfigured;
    applyConsent(saved, measurementId);
    banner.hidden = true;
    closeCookieModal(modal);
  });

  document.querySelector("[data-cookie-accept-necessary]")?.addEventListener("click", () => {
    const saved = saveConsent({ analytics: false });
    analyticsToggle.checked = false;
    applyConsent(saved, measurementId);
    banner.hidden = true;
    closeCookieModal(modal);
  });

  document.querySelector("[data-cookie-save-settings]")?.addEventListener("click", () => {
    const saved = saveConsent({ analytics: analyticsToggle.checked });
    applyConsent(saved, measurementId);
    banner.hidden = true;
    closeCookieModal(modal);
  });

  document.querySelector("[data-cookie-open-settings]")?.addEventListener("click", () => {
    openCookieModal(modal);
  });

  document.querySelectorAll("[data-open-cookie-settings]").forEach((button) => {
    button.addEventListener("click", () => openCookieModal(modal));
  });

  document.querySelectorAll("[data-cookie-close]").forEach((button) => {
    button.addEventListener("click", () => closeCookieModal(modal));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCookieModal(modal);
    }
  });
}

function openCookieModal(modal) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeCookieModal(modal) {
  modal.hidden = true;
  document.body.style.overflow = "";
}

function getStoredConsent() {
  try {
    const raw = window.localStorage.getItem(DWT_CONFIG.consentKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isConsentFresh(consent) {
  return Boolean(
    consent &&
    typeof consent.timestamp === "number" &&
    Date.now() - consent.timestamp < DWT_CONFIG.consentDurationMs
  );
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

function applyConsent(consent, measurementId) {
  if (consent.analytics) {
    enableAnalytics(measurementId);
  } else {
    disableAnalytics(measurementId);
  }
}

function enableAnalytics(measurementId) {
  if (!isValidGaId(measurementId)) {
    return;
  }

  window[`ga-disable-${measurementId}`] = false;

  if (!analyticsLoaded) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("consent", "default", { analytics_storage: "granted" });
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      transport_type: "beacon"
    });

    analyticsLoaded = true;
    return;
  }

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", { analytics_storage: "granted" });
  }
}

function disableAnalytics(measurementId) {
  if (!isValidGaId(measurementId)) {
    return;
  }

  window[`ga-disable-${measurementId}`] = true;

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", { analytics_storage: "denied" });
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
  const resetButton = document.querySelector(SELECTORS.contactReset);

  resetButton?.addEventListener("click", () => {
    if (successPanel) {
      successPanel.hidden = true;
    }
    form.hidden = false;
    form.elements.namedItem("name")?.focus();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Die Anfrage konnte nicht gesendet werden.");
      }

      form.reset();
      clearInvalidState(form);
      form.hidden = true;
      if (successPanel) {
        successPanel.hidden = false;
      }
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
  const rules = [
    { name: "name", valid: payload.name.length >= 2, message: "Bitte geben Sie Ihren Namen an." },
    { name: "email", valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email), message: "Bitte geben Sie eine gültige E-Mail-Adresse an." },
    { name: "message", valid: payload.message.length >= 20, message: "Bitte beschreiben Sie Ihr Anliegen mit mindestens 20 Zeichen." },
    { name: "privacy", valid: payload.privacy, message: "Bitte bestätigen Sie die Datenschutzerklärung." }
  ];

  clearInvalidState(form);

  const invalidRule = rules.find((rule) => !rule.valid);
  if (!invalidRule) {
    return { valid: true, message: "" };
  }

  const field = form.elements[invalidRule.name];
  if (field instanceof HTMLElement) {
    field.setAttribute("aria-invalid", "true");
    field.focus();
  }

  return { valid: false, message: invalidRule.message };
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
  if (message) {
    node.classList.add(type === "success" ? "is-success" : "is-error");
  }
}

function clearFeedback(node) {
  if (!node) {
    return;
  }

  node.textContent = "";
  node.classList.remove("is-success", "is-error");
}
