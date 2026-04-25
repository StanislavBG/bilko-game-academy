# Accessibility & Localization

## Accessibility (all in v1)

1. **Reduced motion mode.** Damps screen shake (50%), flash (30%), particle
   bursts (cap at 100 simultaneous). Also toggles off post-FX pipelines on
   older iPads for performance.
2. **Colorblind palettes.** Three variants (Protanopia, Deuteranopia,
   Tritanopia). Recolors damage numbers, status icons, reaction bursts,
   player/enemy distinction. Uses ColorBrewer-derived palettes.
3. **High contrast / outline mode.** Black outlines on enemies + hazards,
   bright player glow, high-contrast UI.
4. **Subtitles + scalable text.** "Boop" SFX for text bubbles can be
   disabled. Damage numbers and dialogue scalable 100%–200% in
   Settings → Display.

## Input accessibility

- Full **key/gamepad rebinding** in Settings → Controls.
- **Hold-to-fire** toggle (default auto-fire ON → flip to hold-to-fire).
- **One-handed mode** — all actions bindable to one side; iPad layout
  mirrors everything to one half of the screen.

## Localization

- **v1 ships English only** with full i18n plumbing in place.
- All user-facing strings live in
  `packages/platform-core/src/locales/en.json` (flat key → string map).
- `react-i18next` in the shell; a thin custom lookup in Phaser scenes.
- **CI check** rejects hardcoded English strings outside the `locales/`
  folder (lint rule on non-locale source files).
- **Community translations** post-launch via a PR flow: drop a `<lang>.json`
  into the repo, CI validates coverage, we ship it.
- **RTL** deferred until an Arabic / Hebrew translation arrives.

## Future

- Screen-reader ARIA on shell menus + key HUD (P6).
- Full audio description track (post-v1).
- Per-game difficulty overrides (e.g. "more iframes", "slower enemies") — tracked in `99-open-questions.md`.
