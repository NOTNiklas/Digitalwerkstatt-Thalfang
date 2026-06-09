# TV Hermeskeil – Volleyball

Eine moderne, professionelle One-Page-Website für die Volleyball-Abteilung des
TV Hermeskeil. Glassmorphism-Design, Scroll-Animationen und vollständig responsiv.

## Features

- **Glass-Design** – frosted-glass Karten (`backdrop-filter`), animierter Verlaufs-Hintergrund mit Orbs
- **Scroll-Animationen** – Reveal-on-Scroll (IntersectionObserver), animierte Zähler, Scroll-Fortschrittsbalken, sticky Glass-Navigation
- **Athletische Typografie** – Barlow Condensed / Barlow (Google Fonts)
- **Vollständige Vereinsstruktur** – Hero, Über uns, Teams, Trainingszeiten, Erfolge, Trainerteam, News, Galerie, Mitgliedschafts-CTA, Kontaktformular, Footer
- **Barrierearm** – Skip-Link, sichtbare Fokuszustände, `aria`-Labels, semantisches HTML, `prefers-reduced-motion` respektiert
- **Responsive** – getestet für 375 / 768 / 1024 / 1440 px; Trainingsplan wird auf Mobil zu Karten umgebaut

## Struktur

```
tv-hermeskeil-volleyball/
├── index.html   # Markup & Inhalte
├── style.css    # Design-System (CSS-Variablen) & Glass-Theme
├── script.js    # Scroll-Logik, Menü, Zähler, Formular
└── README.md
```

## Lokal ansehen

Reine statische Seite – einfach `index.html` im Browser öffnen, oder:

```bash
cd tv-hermeskeil-volleyball
python3 -m http.server 8000
# http://localhost:8000
```

## Hinweise

- Inhalte (Spielklassen, Trainingszeiten, Namen, News) sind Platzhalter und sollten
  mit den echten Daten des Vereins ersetzt werden.
- Das Kontaktformular nutzt einen Demo-Handler in `script.js`. Für echten Versand
  ein Backend/Service (z. B. Netlify Forms oder Formspree) anbinden.
- Impressums-/Datenschutz-Links im Footer sind Platzhalter (`#`).
