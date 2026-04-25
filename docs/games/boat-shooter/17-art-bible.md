# Art Bible — painterly pirate style

## Direction

**Stylized 2D painterly.** Hand-drawn look, vibrant water shader, heavy
particle FX (muzzle flash, splashes, cannon smoke), dynamic lighting.
Target: "painting in motion" on iPad Retina.

- **Resolution target:** 1920×1080 logical; asset source at 2× for Retina.
- **Palette:** warm tropical — teal water, sun-bleached wood, gold, crimson
  sails. Stormy levels shift to cold palette. Act III shifts to hot
  palette with volcanic orange/black.

## Style locks (non-negotiable)

- **Reference style:** one locked style sheet (Midjourney `--sref` URL or
  fixed SDXL LoRA). Every sprite is prompted against it.
- **64-color palette lock:** every sprite post-processed via
  `tools/palette-snap.ts` to snap to the shared palette. See
  `tools/palette.png`.
- **Readable silhouettes:** every enemy and weapon has a distinct silhouette
  at 32×32. Test each sprite by solid-black-fill silhouette comparison before
  committing.
- **No faces on tiny units** (skiffs, kamikazes); faces on named bosses only.

## Per-faction palette + motif

### Navy (Act I)
- Reds, whites, navy blues. Gold trim. Pristine, orderly, cold.
- Sharp corners, proud flags, geometric sail emblems.

### Pirate (cross-act)
- Browns, blood reds, blacks. Dirty gold.
- Tattered sails, rough-hewn hulls, weathered faces on named captains.

### Supernatural (Acts II–III)
- Translucent blues and cyans. Soft glow. Ghostly highlights.
- Drifting motion; partial transparency on ship parts.

### Volcanic (Act III)
- Deep blacks + glowing orange cracks. Heat shimmer post-FX.
- Obsidian textures; lava veins on hulls.

## Particle FX budget

- Muzzle flash: 8-frame sprite animation per weapon.
- Explosions: radial particle burst + smoke cloud + screen-shake ramp.
- Water splash: 4 sizes (ripple, small, medium, big).
- Reaction VFX: per-reaction unique burst (13 total).
- Boss defeats: 2-second cinematic particle sequence.

Post-FX pipelines (Phaser):
- Water caustics shader (reduced-motion mode: off).
- Screen-edge vignette (all biomes, color-shifted per act).
- Heat shimmer (Act III only).
- Fog volumetrics (Act II only).

## UI style

- Palatino / Georgia for flavor text; Inter for HUD numbers.
- Parchment panels for menus (Act I), weathered wood for mid-game, obsidian
  for volcanic.
- Damage numbers: bold drop-shadow, color-coded (yellow crit, red DoT,
  white normal, per-reaction colors).

## Asset directory

See platform doc `10-asset-pipeline.md` for the full directory layout and
tooling.
