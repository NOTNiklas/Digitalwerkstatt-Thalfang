const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1/me/player";

const CONTROL_ENDPOINTS = {
  play: { method: "PUT", path: "/play" },
  pause: { method: "PUT", path: "/pause" },
  next: { method: "POST", path: "/next" },
  previous: { method: "POST", path: "/previous" }
};

// Modul-Scope: bleibt bei "warmen" Function-Invocations zwischen Aufrufen
// erhalten, spart also in der Praxis die meisten Token-Refreshes.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    return handleNowPlaying();
  }

  if (event.httpMethod === "POST") {
    return handleControl(event);
  }

  return response(405, { message: "Methode nicht erlaubt." });
};

function isConfigured() {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REFRESH_TOKEN
  );
}

async function handleNowPlaying() {
  if (!isConfigured()) {
    return response(200, { configured: false });
  }

  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch {
    return response(502, {
      configured: true,
      error: "Spotify-Anmeldung ist abgelaufen oder ungültig. Bitte scripts/spotify-auth.js erneut ausführen."
    });
  }

  let spotifyResponse;
  try {
    spotifyResponse = await fetch(API_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch {
    return response(502, { configured: true, error: "Spotify war nicht erreichbar." });
  }

  if (spotifyResponse.status === 204) {
    return response(200, { configured: true, isPlaying: false });
  }

  if (!spotifyResponse.ok) {
    return response(502, { configured: true, error: "Spotify hat den Wiedergabestatus nicht geliefert." });
  }

  const data = await spotifyResponse.json().catch(() => null);
  if (!data || !data.item) {
    return response(200, { configured: true, isPlaying: false });
  }

  const images = data.item.album && Array.isArray(data.item.album.images) ? data.item.album.images : [];

  return response(200, {
    configured: true,
    isPlaying: Boolean(data.is_playing),
    track: data.item.name,
    artist: (data.item.artists || []).map((a) => a.name).join(", "),
    album: data.item.album ? data.item.album.name : "",
    albumArt: images.length > 0 ? images[0].url : null,
    durationMs: data.item.duration_ms,
    progressMs: data.progress_ms,
    trackUrl: data.item.external_urls ? data.item.external_urls.spotify : null
  });
}

async function handleControl(event) {
  if (!isConfigured()) {
    return response(200, { ok: false, code: "not_configured", message: "Spotify ist noch nicht verbunden." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { ok: false, message: "Ungültige Anfrage." });
  }

  const control = CONTROL_ENDPOINTS[payload.action];
  if (!control) {
    return response(400, { ok: false, message: "Unbekannte Aktion." });
  }

  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch {
    return response(502, {
      ok: false,
      message: "Spotify-Anmeldung ist abgelaufen oder ungültig. Bitte scripts/spotify-auth.js erneut ausführen."
    });
  }

  let spotifyResponse;
  try {
    spotifyResponse = await fetch(`${API_BASE}${control.path}`, {
      method: control.method,
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch {
    return response(502, { ok: false, message: "Spotify war nicht erreichbar." });
  }

  if (spotifyResponse.status === 404) {
    return response(200, {
      ok: false,
      code: "no_active_device",
      message: "Kein aktives Spotify-Gerät gefunden – Spotify auf einem Gerät öffnen und kurz Wiedergabe starten."
    });
  }

  if (spotifyResponse.status === 403) {
    return response(200, {
      ok: false,
      code: "premium_required",
      message: "Diese Steuerung erfordert einen Spotify-Premium-Account."
    });
  }

  if (!spotifyResponse.ok && spotifyResponse.status !== 204) {
    return response(502, { ok: false, message: "Spotify hat die Aktion abgelehnt." });
  }

  return response(200, { ok: true });
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const basicAuth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN
    })
  });

  if (!tokenResponse.ok) {
    throw new Error("token refresh failed");
  }

  const data = await tokenResponse.json();
  cachedToken = data.access_token;
  // 60s Sicherheitsabstand vor dem echten Ablauf.
  cachedTokenExpiresAt = now + Math.max(0, (data.expires_in - 60) * 1000);
  return cachedToken;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}
