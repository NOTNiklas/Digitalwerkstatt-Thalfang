(function () {
  "use strict";

  const POLL_INTERVAL_MS = 5000;
  const TICK_INTERVAL_MS = 250;
  const RING_CIRCUMFERENCE = 339.3; // 2 * PI * r(54), muss zu style.css passen

  const root = document.querySelector("[data-player]");
  const ring = root.querySelector("[data-ring]");
  const art = root.querySelector("[data-art]");
  const fields = {
    playlist: root.querySelector('[data-field="playlist"]'),
    title: root.querySelector('[data-field="title"]'),
    artist: root.querySelector('[data-field="artist"]'),
    progress: root.querySelector('[data-field="progress"]'),
    duration: root.querySelector('[data-field="duration"]'),
    status: root.querySelector('[data-field="status"]')
  };
  const playBtn = root.querySelector('[data-action="toggle"]');
  const playIcon = playBtn.querySelector('[data-icon="play"]');
  const pauseIcon = playBtn.querySelector('[data-icon="pause"]');
  const controlButtons = root.querySelectorAll("[data-action]");

  let localProgressMs = 0;
  let localDurationMs = 0;
  let lastTickAt = 0;
  let isPlaying = false;
  let currentTrackKey = null;
  let controlsBusy = false;

  function setState(state) {
    root.dataset.state = state;
  }

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function updateRing() {
    const pct = localDurationMs > 0 ? Math.min(1, localProgressMs / localDurationMs) : 0;
    ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - pct));
    fields.progress.textContent = formatTime(localProgressMs);
    fields.duration.textContent = formatTime(localDurationMs);
  }

  function tick() {
    if (!isPlaying) return;
    const now = performance.now();
    const elapsed = lastTickAt ? now - lastTickAt : 0;
    lastTickAt = now;
    localProgressMs = Math.min(localDurationMs, localProgressMs + elapsed);
    updateRing();
  }

  function setControlsDisabled(disabled) {
    controlButtons.forEach((btn) => {
      btn.disabled = disabled;
    });
  }

  async function extractAccentColor(imgUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgUrl;
      });

      const canvas = document.createElement("canvas");
      const size = 16;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      // Zu dunkle/blasse Durchschnittsfarben ergeben einen unsichtbaren Glow –
      // dann lieber beim Standard-Akzent bleiben.
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness < 40) return null;

      return `${r}, ${g}, ${b}`;
    } catch {
      return null; // z.B. CORS-getaintetes Canvas – stiller Fallback auf Standardfarbe
    }
  }

  function renderTrack(data) {
    const trackKey = `${data.track}|${data.artist}|${data.albumArt}`;
    fields.title.textContent = data.track;
    fields.artist.textContent = data.artist;

    if (trackKey !== currentTrackKey) {
      currentTrackKey = trackKey;
      art.innerHTML = "";
      if (data.albumArt) {
        const img = document.createElement("img");
        img.src = data.albumArt;
        img.alt = `Album-Cover: ${data.album || data.track}`;
        art.appendChild(img);
        extractAccentColor(data.albumArt).then((rgb) => {
          if (rgb) root.style.setProperty("--accent-dynamic", rgb);
        });
      }
    }

    localDurationMs = data.durationMs || 0;
    localProgressMs = data.progressMs || 0;
    isPlaying = Boolean(data.isPlaying);
    lastTickAt = isPlaying ? performance.now() : 0;
    updateRing();

    // SVGElement.hidden reflektiert nicht zuverlässig auf das Attribut
    // (anders als bei HTMLElement) — daher explizit über style togglen.
    playIcon.style.display = isPlaying ? "none" : "";
    pauseIcon.style.display = isPlaying ? "" : "none";
    playBtn.setAttribute("aria-label", isPlaying ? "Pausieren" : "Abspielen");

    setState(isPlaying ? "playing" : "paused");
    fields.status.textContent = "";
  }

  function renderIdle() {
    currentTrackKey = null;
    isPlaying = false;
    localProgressMs = 0;
    localDurationMs = 0;
    updateRing();
    fields.title.textContent = "Gerade nichts aktiv";
    fields.artist.textContent = "Spotify auf einem Gerät starten";
    setState("idle");
  }

  function renderNotConfigured() {
    fields.title.textContent = "Nicht verbunden";
    fields.artist.textContent = "–";
    fields.status.textContent = "Spotify ist noch nicht eingerichtet (siehe scripts/spotify-auth.js).";
    setState("not-configured");
  }

  function renderError(message) {
    fields.title.textContent = "Fehler";
    fields.artist.textContent = "–";
    fields.status.textContent = message || "Spotify-Daten konnten nicht geladen werden.";
    setState("error");
  }

  async function poll() {
    try {
      const res = await fetch("/api/spotify");
      const data = await res.json();

      if (!data.configured) {
        renderNotConfigured();
        return;
      }
      if (data.error) {
        renderError(data.error);
        return;
      }
      if (!data.isPlaying && !data.track) {
        renderIdle();
        return;
      }
      renderTrack(data);
    } catch {
      renderError("Server nicht erreichbar.");
    }
  }

  async function sendControl(action) {
    if (controlsBusy) return;
    controlsBusy = true;
    setControlsDisabled(true);

    // Optimistisches UI-Feedback fürs Play/Pause, damit der Klick sich sofort
    // reagierend anfühlt, statt bis zum nächsten Poll auf Feedback zu warten.
    if (action === "toggle") {
      isPlaying = !isPlaying;
      playIcon.style.display = isPlaying ? "none" : "";
      pauseIcon.style.display = isPlaying ? "" : "none";
      lastTickAt = isPlaying ? performance.now() : 0;
    }

    try {
      const res = await fetch("/api/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action === "toggle" ? (isPlaying ? "play" : "pause") : action })
      });
      const data = await res.json();
      if (!data.ok && data.message) {
        fields.status.textContent = data.message;
      }
    } catch {
      fields.status.textContent = "Server nicht erreichbar.";
    } finally {
      // Spotify braucht kurz, bis der neue Zustand über /me/player abrufbar ist.
      setTimeout(async () => {
        await poll();
        setControlsDisabled(false);
        controlsBusy = false;
      }, 700);
    }
  }

  controlButtons.forEach((btn) => {
    btn.addEventListener("click", () => sendControl(btn.dataset.action));
  });

  setInterval(tick, TICK_INTERVAL_MS);
  setInterval(poll, POLL_INTERVAL_MS);
  poll();
})();
