/* ============================================================
   HELIX Studio — immersive interactions
   ============================================================ */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp = (a, b, n) => a + (b - a) * n;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Nav + scroll progress ---------- */
  const nav = $("#nav");
  const progress = $("#progress");
  function onScroll() {
    const y = window.scrollY;
    if (nav) nav.classList.toggle("scrolled", y > 20);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
  }
  let scrolling = false;
  window.addEventListener("scroll", () => {
    if (!scrolling) { requestAnimationFrame(() => { onScroll(); scrolling = false; }); scrolling = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = $("#burger");
  const links = $("#navLinks");
  if (burger && links) {
    const close = () => { links.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); };
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$(".reveal");
  const heroTitle = $(".hero__title");
  if (reduced || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("in"));
    if (heroTitle) heroTitle.classList.add("in");
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => io.observe(el));
    if (heroTitle) requestAnimationFrame(() => heroTitle.classList.add("in"));
  }

  /* ---------- Counters ---------- */
  $$("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";
    const run = () => {
      if (reduced) { el.textContent = target + suffix; return; }
      const dur = 1600, start = performance.now();
      const step = (now) => {
        const p = clamp((now - start) / dur, 0, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      const o = new IntersectionObserver((en, ob) => en.forEach((x) => { if (x.isIntersecting) { run(); ob.disconnect(); } }), { threshold: 0.6 });
      o.observe(el);
    } else run();
  });

  /* ---------- Custom cursor + magnetic + tilt (pointer-fine only) ---------- */
  if (fine && !reduced) {
    const cursor = $("#cursor");
    const dot = $(".cursor__dot");
    const ring = $(".cursor__ring");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;

    window.addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    window.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
    window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));

    (function loop() {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      if (dot) { dot.style.left = mx + "px"; dot.style.top = my + "px"; }
      if (ring) { ring.style.left = rx + "px"; ring.style.top = ry + "px"; }
      requestAnimationFrame(loop);
    })();

    $$("[data-cursor]").forEach((el) => {
      const type = el.dataset.cursor;
      el.addEventListener("pointerenter", () => cursor.classList.add(type === "view" ? "is-view" : "is-hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-view", "is-hover"));
    });

    /* Magnetic buttons */
    $$(".magnetic").forEach((el) => {
      const strength = 0.4;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * strength;
        const y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
        const inner = el.querySelector("span");
        if (inner) inner.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
        const inner = el.querySelector("span");
        if (inner) inner.style.transform = "";
      });
    });

    /* 3D tilt cards */
    $$(".tilt").forEach((el) => {
      const inner = el.querySelector(".tilt__inner") || el;
      const max = 12;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rotX = (0.5 - py) * max;
        const rotY = (px - 0.5) * max;
        el.style.perspective = "900px";
        inner.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        const layer = el.querySelector(".card__layer");
        if (layer) { layer.style.setProperty("--mx", px * 100 + "%"); layer.style.setProperty("--my", py * 100 + "%"); }
      });
      el.addEventListener("pointerleave", () => { inner.style.transform = ""; });
    });

    /* Hero chip parallax */
    const scene = $("#heroScene");
    if (scene) {
      const chips = $$(".chip", scene);
      window.addEventListener("pointermove", (e) => {
        const cx = (e.clientX / innerWidth - 0.5);
        const cy = (e.clientY / innerHeight - 0.5);
        chips.forEach((c) => {
          const d = parseFloat(c.dataset.depth) || 0.05;
          c.style.transform = `translate(${cx * d * 600}px, ${cy * d * 600}px)`;
        });
      }, { passive: true });
    }
  }

  /* ---------- Scroll-driven effects (rAF batched) ---------- */
  const heroMorph = $("#heroMorph");
  const morphBlob = $("#morphBlob");
  const htrack = $("#htrack");
  const hwrap = $(".hwrap");

  const radii = [
    "42% 58% 70% 30% / 45% 45% 55% 55%",
    "63% 37% 38% 62% / 56% 44% 56% 44%",
    "38% 62% 63% 37% / 41% 59% 41% 59%",
    "50% 50% 33% 67% / 55% 38% 62% 45%"
  ];

  let raf = null;
  function tick() {
    raf = null;
    const y = window.scrollY;
    const vh = window.innerHeight;

    // hero blob: rotate + drift as you scroll the hero
    if (heroMorph && !reduced) {
      const p = clamp(y / vh, 0, 1.5);
      heroMorph.style.transform = `rotate(${p * 90}deg) scale(${1 + p * 0.12}) translateY(${p * 60}px)`;
    }

    // intro morph blob: morph border-radius + rotate based on its viewport progress
    if (morphBlob && !reduced) {
      const sec = $("#studio");
      if (sec) {
        const r = sec.getBoundingClientRect();
        const prog = clamp((vh - r.top) / (r.height + vh), 0, 1);
        const idx = Math.min(radii.length - 1, Math.floor(prog * (radii.length - 1)));
        morphBlob.style.borderRadius = radii[idx];
        morphBlob.style.transform = `rotate(${prog * 140}deg)`;
        const inner = morphBlob.querySelector("span");
        if (inner) inner.style.transform = `rotate(${-prog * 140}deg)`;
      }
    }

    // horizontal work track: translateX by scroll progress through .hwrap
    if (htrack && hwrap && !reduced && getComputedStyle(hwrap).height !== "auto") {
      const r = hwrap.getBoundingClientRect();
      const total = hwrap.offsetHeight - vh;
      const prog = clamp(-r.top / total, 0, 1);
      const max = htrack.scrollWidth - window.innerWidth;
      htrack.style.transform = `translate3d(${-prog * max}px,0,0)`;
    }
    return raf;
  }
  function requestTick() { if (raf === null) raf = requestAnimationFrame(tick); }

  if (!reduced) {
    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", requestTick);
    requestTick();
  }
})();
