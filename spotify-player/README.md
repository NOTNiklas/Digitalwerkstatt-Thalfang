# Spotify Player Widget

Ein eigenständiges "Jetzt läuft"-Widget, das den aktuellen Wiedergabestatus
**eines fest verbundenen Spotify-Accounts** anzeigt und steuerbar macht
(Play/Pause, vor/zurück). Gedacht als Baustein, der bei Bedarf in eine der
Seiten in diesem Repo eingebettet werden kann – aktuell bewusst als isolierte
Seite unter `/spotify-player/`, damit keine bestehende Kundenseite ungefragt
verändert wird.

**Wichtig:** Das ist **kein** persönlicher Login pro Besucher. Es zeigt allen
Besuchern die Wiedergabe **eines** Accounts – wie ein Radio-Badge, nicht wie
ein "mit Spotify anmelden"-Button. Steuerung (Play/Pause/Skip) über die
Spotify-API erfordert außerdem **Spotify Premium** auf dem verbundenen
Account; ohne Premium funktioniert nur das Lesen des aktuellen Titels.

## Architektur

- `netlify/functions/spotify.js` – Serverless Function, hält Client-Secret
  und Refresh-Token serverseitig, holt bei Bedarf ein frisches Access-Token
  und reicht Anfragen an die Spotify-Web-API weiter (`GET /api/spotify` für
  den aktuellen Titel, `POST /api/spotify {"action":"play|pause|next|previous"}`
  für die Steuerung).
- `scripts/spotify-auth.js` – einmaliges lokales Login-Skript, holt das
  initiale Refresh-Token (siehe unten).
- `spotify-player/` – die eigentliche Widget-Seite (HTML/CSS/JS, keine
  Build-Abhängigkeiten).

## Einrichtung

### 1 · Spotify-App anlegen

1. [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) →
   "Create app".
2. **Redirect URI**: `http://127.0.0.1:8888/callback` eintragen (wird nur für
   den einmaligen lokalen Login gebraucht, siehe Schritt 2).
3. **Client ID** und **Client Secret** notieren.

### 2 · Einmalig lokal anmelden

```bash
SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/spotify-auth.js
```

Öffnet eine Spotify-Login-URL im Terminal (im Browser öffnen und mit dem
Account anmelden, dessen Musik angezeigt werden soll). Nach der Bestätigung
gibt das Skript drei Werte aus.

### 3 · In Netlify eintragen

Die drei ausgegebenen Werte als Umgebungsvariablen im Netlify-Projekt
hinterlegen (Site settings → Environment variables):

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REFRESH_TOKEN=...
```

Danach neu deployen (oder "Clear cache and deploy") – ab dann liefert
`GET /api/spotify` echte Daten. Ohne diese drei Variablen zeigt das Widget
ehrlich "Nicht verbunden" statt kaputter oder erfundener Daten.

### Lokal testen

Netlify Functions brauchen die [Netlify CLI](https://docs.netlify.com/cli/get-started/)
(`netlify dev`), um `/api/spotify` lokal genauso wie in Produktion
bereitzustellen (statische Dateien + Functions zusammen, inkl. der
Redirect-Regel aus `netlify.toml`).

## Bewusst nicht enthalten

- Kein Login-Flow pro Website-Besucher (siehe oben – ein fest verbundener
  Account für alle).
- Kein Shuffle- oder "Merken"-Button (Herz-Icon) aus der Screenshot-Vorlage –
  nicht Teil der Anfrage; ließe sich über `PUT/DELETE /v1/me/tracks` und
  `PUT /v1/me/player/shuffle` ergänzen, falls gewünscht.
- Keine Einbettung in eine der bestehenden Kundenseiten – das Widget ist
  isoliert, bis geklärt ist, wo es tatsächlich erscheinen soll.
