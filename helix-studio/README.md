# HELIX — Immersive Creative Technology Studio

A modern, trend-forward landing page built to show off contemporary web
techniques: **3D tilt, scroll-morphism, parallax depth and kinetic typography** —
all in vanilla HTML/CSS/JS (no build step, no dependencies).

## Trends & effects implemented

- **3D tilt cards** — mouse-driven `rotateX/rotateY` with `transform-style: preserve-3d` and layered `translateZ` depth (bento + project cards)
- **Scroll-morphism** — blobs that morph their `border-radius` and rotate as they move through the viewport (hero + intro)
- **Scroll-driven horizontal gallery** — a pinned section whose track translates on vertical scroll
- **Sticky stacking cards** — process steps that stack and overlap as you scroll
- **Kinetic typography** — masked line-by-line reveal, outline/stroke text, infinite marquee, giant footer wordmark
- **Custom cursor** — lerped follower ring with `mix-blend-mode: difference` + hover/view states
- **Magnetic buttons** — elements that lean toward the pointer
- **Ambient FX** — animated gradient-mesh blobs + SVG film-grain overlay
- **Parallax** — floating tech chips that react to pointer movement

## Stack

Plain `index.html` + `style.css` + `script.js`. Fonts: **Exo** (display) / **Roboto Mono** (body).
Design direction generated with the `ui-ux-pro-max` skill (immersive/interactive pattern,
studio-purple + waveform-green on near-black).

## Run

```bash
cd helix-studio
python3 -m http.server 8000   # → http://localhost:8000
```

## Notes

- **Accessibility first:** everything heavy is gated behind `prefers-reduced-motion`
  (horizontal scroll, sticky stacks, blob morphs and the custom cursor all fall back to
  a calm, static layout). Skip link + visible focus included.
- **Performance:** scroll work is `requestAnimationFrame`-batched; cursor/tilt/parallax
  run only on fine-pointer (desktop) devices.
- Content (studio name, projects, stats) is fictional demo copy — swap in real data.
