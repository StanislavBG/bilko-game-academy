# Asset Pipeline

**All art and music in v1 is AI-generated** (no commissioned humans). This
is a scope choice to ship the game as a hobby project without a large
art budget. We mitigate the quality risk with style locks and hand edits.

## Visual pipeline

1. **Style-reference lock.** Before generating any game asset, pick **one**
   style reference (Midjourney `--sref` URL or locked SDXL LoRA). Every
   sprite is prompted against it for coherence.
2. **Palette lock.** A shared 64-color pirate palette lives at
   `tools/palette.png`. Generated sprites are post-processed to snap to
   the palette via `tools/palette-snap.ts` (nearest-color per pixel, with
   dithering off to avoid painterly noise).
3. **Generation.** Use Midjourney v7 (or SDXL via ComfyUI with locked
   LoRA). Accept 3–5 rolls per sprite; pick the best.
4. **Hand edit in Aseprite** for critical sprites: 13 weapons, 9 bosses,
   player ship, evolved-weapon VFX. Line cleanup, animation frame
   extraction, alpha fix.
5. **Coherence review.** Before committing a sprite, compare it against
   the existing roster (a mosaic compare tool). Re-generate if it doesn't
   read clearly alongside others.
6. **Animation.**
   - Simple sprites: Aseprite frame-by-frame (8–12 frames/loop).
   - Complex bosses: **Spine** rigs for jointed animations.
   - Particles: Phaser ParticleEditor preset JSON.

## Atlas & tilemap

- **TexturePacker** — one atlas per biome (3) + one UI atlas.
- **Tiled** (.tmx) — one file per stage. Includes collision, spawn, and
  hazard layers. Validated at build time via `tools/stage-validate.ts`.

## Audio pipeline

- **Music.** AI-generated (Suno / Udio) with style tags per act. Review,
  pick, master to -14 LUFS.
- **SFX.** Freesound.org (CC0 / CC-BY) as primary source; Humble Bundle
  / Unity asset-pack libraries as supplement. All normalized to same
  loudness, tagged in a spreadsheet.
- **Reaction stings + weapon SFX** — custom layered from the free
  library using Audacity. Keep < 300 ms each for snappy feel.

## Quality gate

Before shipping any art:
- Palette-snap check passes.
- Coherence review passes.
- Animation plays cleanly at 60 fps in-engine with no frame stutter.
- File size budget respected (typical sprite < 32 KB compressed).

## Directory

```
apps/games/boat-shooter/assets/
├── sprites/
│   ├── weapons/                13 weapon sprites + level-up progression
│   ├── enemies/                per-faction folders
│   ├── bosses/                 per-boss folders
│   ├── player/                 boat, cosmetics
│   └── ui/                     HUD elements
├── atlases/                    TexturePacker output (.json + .png)
├── tilemaps/                   Tiled .tmx files + tileset .png
├── audio/
│   ├── music/                  per-act tracks (ogg + mp3)
│   ├── sfx/
│   │   ├── weapons/
│   │   ├── enemies/
│   │   ├── reactions/
│   │   └── ui/
│   └── stingers/
└── spine/                      boss rigs (.skel + .atlas + .png)
```
