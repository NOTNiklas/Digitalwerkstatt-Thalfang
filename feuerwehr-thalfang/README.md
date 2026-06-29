# Freiwillige Feuerwehr Thalfang — Website

Moderne, dunkle Landing-Page für eine **Freiwillige Feuerwehr** — visuell
inspiriert von aktuellen *AI-Website*-Designs (Dribbble-Tag `ai-website`),
thematisch aber konsequent auf **Feuer & Rettung** umgemünzt.
Reines **HTML/CSS/JS**, kein Build-Step, keine Abhängigkeiten.

## Designrichtung — „Ember Intelligence“

Die typische AI-Ästhetik (tiefes Dark-Mode, leuchtende Verläufe, Glassmorphism,
Bento-Grids, kinetische Typografie, animierte Partikel, ein Live-„Status“-Panel)
wird hier in **Glut-/Flammenfarben** statt der üblichen Violett-/Blautöne übersetzt.

- **Farbwelt:** warmes Near-Black (`#0a0706`) mit Glut-Verlauf
  Gelb → Orange → Rot (`#ffd24d → #ff9012 → #ff5a1a → #ff2d2d`).
  Sicherheits-Blau (`#4cc6ff`) nur als sparsamer Sekundär-Akzent — angelehnt an die
  Empfehlung der `ui-ux-pro-max`-Skill (*„Alert-Rot + Safety-Blau“*).
- **Typografie:** **Space Grotesk** (Display, technisch-modern) · **Inter** (Fließtext)
  · **JetBrains Mono** (Status, Codes, Kennzahlen — der „Dashboard“-Look).
- **Signature-Element:** ein **Live-Lagestatus-Panel** im Hero („Einsatzbereit“,
  Fahrzeuge 6/6, Ø Ausrückzeit, Digitalfunk-Equalizer, laufende Uhr) — das Pendant
  zum „AI-Status“-Widget moderner Tech-Seiten.

## Umgesetzte Effekte

- **Glut-Partikel** auf `<canvas>` (aufsteigende, flackernde Funken; pausiert bei
  verstecktem Tab, aus bei `prefers-reduced-motion`, reduziert auf kleinen Screens)
- **Ambient-Glows** (animierte Mesh-Blobs) + feine **Film-Grain**-Textur
- **Glassmorphism**-Karten mit Verlaufsrand (`mask-composite`)
- **Bento-Grid** für die Aufgaben, **Spotlight + 3D-Tilt** auf Karten (nur Fine-Pointer)
- **Kinetische Typografie**: zeilenweise maskierter Hero-Reveal, Endlos-Marquee,
  riesiges „112“-Wordmark im Footer
- **Magnetische Buttons**, **Zähler-Animationen**, **Scroll-Progress**, Reveal-on-Scroll

## Inhalt / Sektionen

Hero · Kennzahlen · **Notruf 112** mit den fünf W-Fragen · Aufgaben (Bento) ·
Fuhrpark (horizontale Snap-Galerie) · Jugendfeuerwehr · Aktuelles ·
**Mitmachen** mit Kontaktformular · Kontakt + Karten-Platzhalter · CTA · Footer.

Das Formular sendet per `fetch` an die bestehende Netlify-Function `/api/contact`
(Felder `name`, `email`, `phone`, `company`, `message` + Honeypot `website`) und
fällt bei Fehlern auf eine `mailto:`-Adresse zurück.

## Barrierefreiheit & Performance

- Skip-Link, sichtbare Fokus-Rahmen, ARIA-Labels, `tel:`-Links für den Notruf,
  Formular mit echten Labels, Inline-Validierung und `aria-live`-Status.
- Kontraste für Dark-Mode geprüft (heller Fließtext auf warmem Schwarz).
- Alles Bewegte ist hinter `prefers-reduced-motion` bzw. `pointer: fine` abgesichert
  und fällt auf ein ruhiges, statisches Layout zurück.
- Scroll-Arbeit ist `requestAnimationFrame`-gebündelt; Canvas pausiert im Hintergrund.

## Inhalte — Hinweis

Alle Texte, Kennzahlen, Fahrzeugdaten, Einsatzmeldungen sowie **Impressum** und
**Datenschutz** sind **realistische Platzhalter** und müssen vor einem Live-Gang
durch die offiziellen Angaben der Wehr ersetzt und rechtlich geprüft werden.
Fahrzeug-„Fotos“ sind aktuell stilisierte CSS-Platzhalter mit Typenkürzel.

## Lokal ansehen

```bash
cd feuerwehr-thalfang
python3 -m http.server 8000   # → http://localhost:8000
```

Deployment: Der Ordner wird über die Netlify-Konfiguration des Repos unter
`/feuerwehr-thalfang/` ausgeliefert.

---

Designrichtung erarbeitet mit der **`ui-ux-pro-max`**-Skill
(Pattern: öffentlich/zugänglich · Stil: Dark, immersiv · Glut-Palette auf Near-Black).
