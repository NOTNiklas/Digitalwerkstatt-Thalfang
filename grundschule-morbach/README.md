# Grundschule Morbach – Website

Neugestaltung der Internetseite der **Grundschule Morbach** (Hunsrück).
Eigenständige, statische Website – reines HTML/CSS/JS, **kein Build-Step**.

## Design

- **Weiß-dominant** mit **grünen Akzenten** (Wald-/Logo-Grün, `#2f6b3c`).
- Warm und familienfreundlich, gut lesbar, barrierefrei.
- Schriften: **Baloo 2** (Überschriften) + **Nunito Sans** (Fließtext), via Google Fonts.
- Design-Tokens in `style.css` (`:root`), Icons als Inline-SVG (Lucide-Stil).

## Funktionen

- **Fullscreen-Menü-Overlay** mit den Spalten *Unsere Schule / Neuigkeiten /
  Downloads / Projekte* (entspricht der vorgegebenen Menüstruktur).
- **Barrierefreiheit:** Skip-Link, sichtbare Fokus-Rahmen, `aria`-Attribute,
  Fokus-Falle im Overlay, `prefers-reduced-motion` respektiert.
- **A+** (Schriftgröße in 3 Stufen) und **Kontrast-Toggle** (hoher Kontrast) –
  Einstellungen werden in `localStorage` gespeichert.
- **Suche** als clientseitiges Overlay über alle Seiten.
- Reveal-Animationen beim Scrollen, aktuelles Jahr im Footer.

## Seitenstruktur

```
Startseite (index.html)
├── Unsere Schule (unsere-schule.html)
│   ├── Schulleitung, Kollegium, Ganztagsschule, Schwerpunktschule,
│   │   Schulelternbeirat, Schulsozialarbeit, Hausordnung, Förderverein
├── Neuigkeiten → Termine, Aktuelles
├── Downloads → Betreuung, Schulbuch- und Materiallisten, Fahrkarten
├── Projekte
├── Kontakt
└── Datenschutz · Impressum
```

## Inhalte – Hinweis

Die **Startseite** verwendet die echten Inhalte der Schule (Begrüßung,
„Unsere Schule"-Text, Aktuelles-Einträge, Kontaktdaten).

Die **Unterseiten** enthalten realistische **Platzhalter-Texte** (jeweils mit
einer gelben Hinweis-Box markiert), da die Live-Seite automatisierten Zugriff
blockiert und die Originalinhalte nicht abgerufen werden konnten. Diese Texte
sollten durch die offiziellen Inhalte der Schule ersetzt werden.

**Bilder** (Logo, Luftbild) sind aktuell Platzhalter (SVG / CSS-Verlauf) und
können in `imgs/` durch echte Dateien ersetzt werden.

## Lokal ansehen

```bash
cd grundschule-morbach
python3 -m http.server 8000
# Browser: http://localhost:8000
```

Deployment: Der Ordner wird über die Netlify-Konfiguration des Repos
automatisch unter `/grundschule-morbach/` ausgeliefert.
