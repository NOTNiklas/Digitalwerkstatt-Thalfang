/* =========================================================================
   Grundschule Morbach – Interaktion
   Menü-Overlay, Such-Overlay, A+ (Schriftgröße), Kontrast-Toggle,
   Reveal-on-Scroll. Reines Vanilla-JS, barrierefrei.
   ========================================================================= */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- localStorage-Helfer (defensiv) -------------------------------- */
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { /* ignorieren */ }
  }

  /* ---- Einstellungen anwenden (Schriftgröße + Kontrast) -------------- */
  var FONT_STEPS = [1, 1.15, 1.3];
  var fontIndex = parseInt(store("gsm-font") || "0", 10) || 0;

  function applyFont() {
    root.style.setProperty("--font-scale", FONT_STEPS[fontIndex]);
    var btn = doc.querySelector("[data-font-btn]");
    if (btn) btn.setAttribute("aria-pressed", fontIndex > 0 ? "true" : "false");
  }
  function applyContrast() {
    var on = store("gsm-hc") === "1";
    root.classList.toggle("hc", on);
    var btn = doc.querySelector("[data-contrast-btn]");
    if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  applyFont();
  applyContrast();

  /* ---- Generischer Overlay-Helfer ------------------------------------ */
  function setupOverlay(overlay, openers, opts) {
    if (!overlay) return null;
    opts = opts || {};
    var lastFocus = null;

    function focusables() {
      return overlay.querySelectorAll(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
    }
    function open() {
      lastFocus = doc.activeElement;
      overlay.classList.add("open");
      doc.body.classList.add("nav-open");
      openers.forEach(function (b) { b.setAttribute("aria-expanded", "true"); });
      var f = focusables();
      if (f.length) f[0].focus();
      if (opts.onOpen) opts.onOpen();
    }
    function close() {
      overlay.classList.remove("open");
      doc.body.classList.remove("nav-open");
      openers.forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    openers.forEach(function (b) {
      b.addEventListener("click", function () {
        overlay.classList.contains("open") ? close() : open();
      });
    });
    overlay.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", close);
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    doc.addEventListener("keydown", function (e) {
      if (!overlay.classList.contains("open")) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "Tab") {
        var f = focusables();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    return { open: open, close: close };
  }

  /* ---- Menü-Overlay -------------------------------------------------- */
  setupOverlay(
    doc.querySelector("[data-nav-overlay]"),
    Array.prototype.slice.call(doc.querySelectorAll("[data-menu-btn]"))
  );

  /* ---- Such-Overlay -------------------------------------------------- */
  var searchOverlay = doc.querySelector("[data-search-overlay]");
  var searchCtl = setupOverlay(
    searchOverlay,
    Array.prototype.slice.call(doc.querySelectorAll("[data-search-btn]")),
    { onOpen: function () { var i = searchOverlay.querySelector("input"); if (i) { i.value = ""; renderSearch(""); i.focus(); } } }
  );

  // Statischer Seitenindex für die clientseitige Suche
  var PAGES = [
    { t: "Startseite", u: "index.html", k: "home willkommen" },
    { t: "Unsere Schule", u: "unsere-schule.html", k: "ueber schule hunsrueck" },
    { t: "Schulleitung", u: "schulleitung.html", k: "rektor leitung" },
    { t: "Kollegium", u: "kollegium.html", k: "lehrer team lehrkraefte" },
    { t: "Ganztagsschule", u: "ganztagsschule.html", k: "ganztag betreuung nachmittag" },
    { t: "Schwerpunktschule", u: "schwerpunktschule.html", k: "inklusion foerderung" },
    { t: "Schulelternbeirat", u: "schulelternbeirat.html", k: "eltern seb mitwirkung" },
    { t: "Schulsozialarbeit", u: "schulsozialarbeit.html", k: "beratung sozial" },
    { t: "Hausordnung", u: "hausordnung.html", k: "regeln ordnung" },
    { t: "Förderverein", u: "foerderverein.html", k: "verein spenden mitglied" },
    { t: "Termine", u: "termine.html", k: "kalender ferien veranstaltungen" },
    { t: "Aktuelles", u: "aktuelles.html", k: "news neuigkeiten berichte" },
    { t: "Betreuung", u: "betreuung.html", k: "betreuende grundschule download" },
    { t: "Schulbuch- und Materiallisten", u: "materiallisten.html", k: "buecher material liste download" },
    { t: "Fahrkarten", u: "fahrkarten.html", k: "bus fahrkarte schuelerticket download" },
    { t: "Projekte", u: "projekte.html", k: "projekt aktionen" },
    { t: "Kontakt", u: "kontakt.html", k: "adresse telefon email anfahrt" },
    { t: "Datenschutz", u: "datenschutz.html", k: "datenschutz dsgvo" },
    { t: "Impressum", u: "impressum.html", k: "impressum anbieter" }
  ];

  function renderSearch(q) {
    var list = searchOverlay && searchOverlay.querySelector("[data-search-results]");
    if (!list) return;
    q = (q || "").trim().toLowerCase();
    var matches = q
      ? PAGES.filter(function (p) { return (p.t + " " + p.k).toLowerCase().indexOf(q) !== -1; })
      : PAGES;
    if (!matches.length) {
      list.innerHTML = '<li class="empty">Keine Treffer gefunden.</li>';
      return;
    }
    list.innerHTML = matches.map(function (p) {
      return '<li><a href="' + p.u + '">' + p.t + "</a></li>";
    }).join("");
  }
  if (searchOverlay) {
    var input = searchOverlay.querySelector("input");
    if (input) input.addEventListener("input", function () { renderSearch(input.value); });
    renderSearch("");
  }

  /* ---- A+ (Schriftgröße) --------------------------------------------- */
  var fontBtn = doc.querySelector("[data-font-btn]");
  if (fontBtn) {
    fontBtn.addEventListener("click", function () {
      fontIndex = (fontIndex + 1) % FONT_STEPS.length;
      store("gsm-font", String(fontIndex));
      applyFont();
    });
  }

  /* ---- Kontrast-Toggle ----------------------------------------------- */
  var contrastBtn = doc.querySelector("[data-contrast-btn]");
  if (contrastBtn) {
    contrastBtn.addEventListener("click", function () {
      var on = !(store("gsm-hc") === "1");
      store("gsm-hc", on ? "1" : "0");
      applyContrast();
    });
  }

  /* ---- Reveal-on-Scroll ---------------------------------------------- */
  var reveals = doc.querySelectorAll(".reveal");
  if (reveals.length && !reduceMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---- Jahr im Footer ------------------------------------------------ */
  doc.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
