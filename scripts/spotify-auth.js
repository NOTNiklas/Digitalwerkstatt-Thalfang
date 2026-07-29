#!/usr/bin/env node
/**
 * Einmaliger lokaler Login gegen die Spotify-Web-API.
 *
 * Warum ein separates Skript und keine Netlify Function: Der Authorization-
 * Code-Flow braucht einen Browser-Redirect zurück auf eine lokal erreichbare
 * Adresse. Netlify Functions sind zustandslos und haben keinen dauerhaften
 * Speicher – das Refresh-Token muss also einmalig hier lokal geholt und
 * danach manuell als Netlify-Umgebungsvariable eingetragen werden. Ein
 * Refresh-Token aus diesem klassischen Flow (mit Client-Secret, nicht PKCE)
 * bleibt gültig, bis der Zugriff widerrufen wird – kein wiederkehrender
 * manueller Schritt nötig.
 *
 * Nutzung:
 *   SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/spotify-auth.js
 *
 * Voraussetzung: In der Spotify-Developer-Dashboard-App muss
 * "http://127.0.0.1:8888/callback" als Redirect-URI eingetragen sein.
 */

const http = require("http");
const crypto = require("crypto");

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = ["user-read-currently-playing", "user-read-playback-state", "user-modify-playback-state"];

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Bitte SPOTIFY_CLIENT_ID und SPOTIFY_CLIENT_SECRET als Umgebungsvariablen setzen.");
  process.exit(1);
}

const state = crypto.randomBytes(16).toString("hex");

const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
authorizeUrl.searchParams.set("client_id", clientId);
authorizeUrl.searchParams.set("response_type", "code");
authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authorizeUrl.searchParams.set("scope", SCOPES.join(" "));
authorizeUrl.searchParams.set("state", state);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const returnedState = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<p>Spotify hat die Anmeldung abgelehnt: ${escapeHtml(error)}</p>`);
    console.error(`Spotify-Fehler: ${error}`);
    server.close();
    return;
  }

  if (returnedState !== state || !code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<p>Ungültige Antwort (state stimmt nicht überein). Bitte erneut versuchen.</p>");
    server.close();
    return;
  }

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      })
    });

    const data = await tokenResponse.json();

    if (!tokenResponse.ok || !data.refresh_token) {
      throw new Error(data.error_description || "Kein Refresh-Token in der Antwort.");
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<p>Erfolgreich verbunden. Dieses Fenster kann geschlossen werden.</p>");

    console.log("\nErfolgreich verbunden. Diese drei Werte als Umgebungsvariablen in Netlify eintragen:\n");
    console.log(`SPOTIFY_CLIENT_ID=${clientId}`);
    console.log(`SPOTIFY_CLIENT_SECRET=${clientSecret}`);
    console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token}\n`);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<p>Der Token-Austausch ist fehlgeschlagen. Details stehen im Terminal.</p>");
    console.error("Token-Austausch fehlgeschlagen:", err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log("Diese URL im Browser öffnen und mit dem gewünschten Spotify-Account anmelden:\n");
  console.log(authorizeUrl.toString());
  console.log(`\nWarte auf Redirect nach ${REDIRECT_URI} ...`);
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}
