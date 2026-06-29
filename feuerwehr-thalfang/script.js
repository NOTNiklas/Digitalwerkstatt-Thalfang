/* =====================================================================
   Freiwillige Feuerwehr Thalfang — interactions
   Vanilla JS · progressive enhancement · a11y & reduced-motion aware
   ===================================================================== */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(pointer: fine)').matches;
  const $  = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

  /* ---------------- Footer year ---------------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Mobile navigation ---------------- */
  const burger   = $('#burger');
  const navLinks = $('#navLinks');
  if (burger && navLinks) {
    const setNav = (open) => {
      navLinks.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
      document.body.style.overflow = open && window.innerWidth <= 760 ? 'hidden' : '';
    };
    burger.addEventListener('click', () => setNav(!navLinks.classList.contains('is-open')));
    navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('is-open')) { setNav(false); burger.focus(); }
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 760) setNav(false); });
  }

  /* ---------------- Nav scroll state + progress bar ---------------- */
  const nav      = $('#nav');
  const progress = $('#scrollProgress');
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (nav) nav.classList.toggle('is-scrolled', y > 24);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------------- Reveal on scroll ---------------- */
  const heroTitle = $('.hero__title');
  if (heroTitle) requestAnimationFrame(() => heroTitle.classList.add('is-in'));

  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // gentle stagger within a viewport batch
          const delay = Math.min(i * 60, 240);
          setTimeout(() => entry.target.classList.add('is-in'), delay);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------------- Animated counters ---------------- */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const animate = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const dur = 1500;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { animate(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------------- Live dispatch clock ---------------- */
  const clock = $('#dispatchClock');
  if (clock) {
    const tick = () => {
      const d = new Date();
      clock.textContent = String(d.getHours()).padStart(2, '0') + ':' +
                          String(d.getMinutes()).padStart(2, '0');
    };
    tick();
    setInterval(tick, 30000);
  }

  /* ---------------- Spotlight + subtle tilt ---------------- */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        const rx = ((y / r.height) - 0.5) * -4;
        const ry = ((x / r.width)  - 0.5) *  4;
        card.style.transform = `translateY(-6px) perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------------- Magnetic buttons ---------------- */
  if (finePointer && !reduceMotion) {
    $$('[data-magnetic]').forEach((el) => {
      const strength = 0.32;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------------- Ember particle canvas ---------------- */
  const canvas = $('#embers');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr, particles, raf, running = true;
    const COLORS = ['#ff6a1a', '#ff9012', '#ffcf4d', '#ff3b2f'];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width  = Math.floor(innerWidth  * dpr);
      h = canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      const base = innerWidth < 700 ? 26 : 54;
      particles = Array.from({ length: base }, () => spawn(true));
    };
    const spawn = (init) => ({
      x: Math.random() * w,
      y: init ? Math.random() * h : h + Math.random() * 60 * dpr,
      r: (Math.random() * 1.8 + 0.6) * dpr,
      vy: (Math.random() * 0.5 + 0.25) * dpr,
      vx: (Math.random() - 0.5) * 0.3 * dpr,
      life: Math.random(),
      flick: Math.random() * 0.04 + 0.01,
      color: COLORS[(Math.random() * COLORS.length) | 0],
    });

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.y -= p.vy;
        p.x += p.vx + Math.sin(p.y * 0.01) * 0.2 * dpr;
        p.life += p.flick;
        const alpha = (0.45 + Math.sin(p.life) * 0.35) * Math.min(1, p.y / (h * 0.85));
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, alpha) * 0.7;
        ctx.shadowBlur = 8 * dpr;
        ctx.shadowColor = p.color;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (p.y < -10 * dpr) Object.assign(p, spawn(false));
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); draw(); });
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) { draw(); } else { cancelAnimationFrame(raf); }
    });
  }

  /* ---------------- Contact / join form ---------------- */
  const form = $('#contactForm');
  if (form) {
    const statusEl = $('#formStatus');
    const submitBtn = $('#formSubmit');
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const setError = (input, msg) => {
      input.setAttribute('aria-invalid', 'true');
      let err = input.parentElement.querySelector('.field-error');
      if (!err) {
        err = document.createElement('p');
        err.className = 'field-error';
        input.parentElement.appendChild(err);
      }
      err.textContent = msg;
      err.classList.add('show');
    };
    const clearError = (input) => {
      input.removeAttribute('aria-invalid');
      const err = input.parentElement.querySelector('.field-error');
      if (err) err.classList.remove('show');
    };

    form.querySelectorAll('input, textarea').forEach((el) =>
      el.addEventListener('input', () => clearError(el)));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());

      // honeypot — silently accept bots
      if (String(data.website || '').trim() !== '') {
        statusEl.textContent = 'Vielen Dank für deine Nachricht!';
        statusEl.className = 'form__status ok';
        form.reset();
        return;
      }

      // validation
      let firstInvalid = null;
      const checks = [
        ['#f-name', (v) => v.trim().length >= 2, 'Bitte gib deinen Namen ein.'],
        ['#f-email', (v) => emailRe.test(v.trim()), 'Bitte gib eine gültige E-Mail-Adresse ein.'],
        ['#f-message', (v) => v.trim().length >= 5, 'Bitte hinterlasse eine kurze Nachricht.'],
      ];
      for (const [sel, ok, msg] of checks) {
        const el = $(sel);
        if (!ok(el.value)) { setError(el, msg); firstInvalid = firstInvalid || el; }
        else clearError(el);
      }
      if (firstInvalid) {
        statusEl.textContent = 'Bitte prüfe die markierten Felder.';
        statusEl.className = 'form__status err';
        firstInvalid.focus();
        return;
      }

      // submit
      submitBtn.disabled = true;
      const label = submitBtn.querySelector('span');
      const original = label.textContent;
      label.textContent = 'Wird gesendet …';
      statusEl.textContent = '';
      statusEl.className = 'form__status';

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          statusEl.textContent = 'Danke! Wir melden uns bei dir. 🔥';
          statusEl.className = 'form__status ok';
          form.reset();
        } else {
          throw new Error('bad response');
        }
      } catch (err) {
        statusEl.innerHTML = 'Senden gerade nicht möglich. Schreib uns direkt: ' +
          '<a href="mailto:info@feuerwehr-thalfang.de">info@feuerwehr-thalfang.de</a>';
        statusEl.className = 'form__status err';
      } finally {
        submitBtn.disabled = false;
        label.textContent = original;
      }
    });
  }
})();
