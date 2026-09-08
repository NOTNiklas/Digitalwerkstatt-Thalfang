# Blockwelt — Minecraft-Klon im Browser

Ein kleiner, komplett client-seitiger Minecraft-Klon: eine prozedural
generierte Voxel-Welt, die direkt im Browser mit WASD + Maus gespielt wird —
kein Build-Schritt, kein Server, kein Account.

## Spielen

```bash
cd minecraft-clone
python3 -m http.server 8000   # → http://localhost:8000
```

(Muss über `http(s)://` bzw. einen lokalen Server laufen, nicht per
`file://`, da ES-Module-Imports das erfordern.)

## Features

- **Prozedurale Welt** — Terrain per fraktalem Perlin-Noise (Hügel, Strände,
  Seen), Bäume werden zufällig platziert. Jeder Seitenaufruf erzeugt eine
  neue Welt (zufälliger Seed).
- **Blöcke abbauen & platzieren** — Linksklick zum Abbauen, Rechtsklick zum
  Platzieren, 7 Blocktypen über die Hotbar (Gras, Erde, Stein, Sand, Holz,
  Laub, Wasser).
- **Ego-Perspektive mit Pointer-Lock** — freies Umsehen per Maus, WASD zum
  Laufen, Springen, Sprinten sowie ein Flugmodus (`F`).
- **Einfache Physik & Kollision** — Schwerkraft, AABB-Kollision gegen das
  Voxel-Raster, damit man nicht durch Wände fällt.
- **Chunk-basiertes Meshing** — die Welt wird in 16×16-Chunks aus
  face-culled, gemergten `BufferGeometry`-Meshes mit Vertexfarben gerendert
  (keine Texturen nötig), damit auch größere Welten flüssig laufen.
- Läuft komplett offline: three.js liegt lokal unter `vendor/` (siehe
  `vendor/THREE_LICENSE.txt`), keine CDN-Abhängigkeit zur Laufzeit.

## Steuerung

| Taste          | Aktion                          |
| -------------- | -------------------------------- |
| `W A S D`      | Bewegen                          |
| Maus           | Umsehen                          |
| Leertaste      | Springen / Fliegen (aufwärts)    |
| Shift          | Sprinten / Fliegen (abwärts)     |
| Linksklick     | Block abbauen                    |
| Rechtsklick    | Block platzieren                 |
| `1`–`7`        | Block in der Hotbar auswählen    |
| Mausrad        | Hotbar-Auswahl wechseln          |
| `F`            | Flugmodus umschalten             |
| `ESC`          | Pause                            |

## Stack

Plain `index.html` + `style.css` + `script.js` (ES-Modul), Rendering mit
[three.js](https://threejs.org/) (lokal vendored, MIT-lizenziert). Keine
Build-Tools, kein Bundler.

## Grenzen / bewusste Vereinfachungen

- Die Welt hat eine feste Größe (64×64 Blöcke, unsichtbare Randwände) statt
  unendlicher Chunk-Generierung — Umfang und Performance wurden für ein
  Demo-Projekt bewusst begrenzt.
- Kein Inventar-/Crafting-System, keine Gegner, kein Tag-Nacht-Zyklus.
- Kollisionsauflösung ist bewusst einfach gehalten (Achsen-weises Cancel
  statt Sweep-Test) — für dieses Tempo ausreichend, aber kein
  physikalisch exaktes Engine-Modell.
