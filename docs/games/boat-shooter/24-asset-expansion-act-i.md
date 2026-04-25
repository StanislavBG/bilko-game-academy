# Asset Expansion — Pixel Quality + Density for Stages 1–3

Scope: raise the **visual fidelity** and **content density** of the
first three stages of Act I so they read as a proper 2026 painterly
shmup, not an MVP demo. Pure asset + compositor work — no gameplay,
no systems.

Companion docs:
- `17-art-bible.md` — style locks, palette, silhouette rules.
- `20-visual-expansion-act-i.md` — stage environmental pass (reeds,
  mangroves, fleet silhouettes).
- `21-starting-ships.md` — elemental ship roster.
- `22-enemy-enhancements.md` — enemy animation + ability plan.

---

## 1. Where we are

### 1.1 Current sprite roster

Generated via `tools/generate-sprites.mjs` (Gemini 2.5 Flash Image):

- **Ships:** `player.png` + 5 elemental variants (ember / tempest /
  frost / verdant / night) — all 1024×1024 painterly. ✅ Flagship
  quality.
- **Enemies (Act I+II+III):** 14 enemy ship types, 8 bosses. 1024×1024
  each. ✅ Good base quality.
- **Pickups:** 3 coin tiers, gem, XP orb, 5 chest variants. ✅
  Adequate but low visual variety.
- **Environmental props:** bank-sniper-tower, bank-bandits,
  mine-layer. **No** rocks, barrels, buoys, lighthouses, merchants,
  treasure islands, wreckage sprites at AI quality — those are all
  code-drawn Graphics today.

### 1.2 Quality gaps

Running the current build on a 2880×1800 retina screen:

| Asset class | Current | Gap |
|---|---|---|
| Player ship | 1024² painterly | ✅ excellent |
| Enemy ships (14) | 1024² painterly | ✅ solid, but 7 look *dated* next to player refresh (scout-skiff, ramming-brigand, patrol-gunboat, bank-sniper-tower, broadside-cutter, powder-keg-kamikaze, mortar-barge) |
| Projectiles | Phaser primitives (style: cannonball / broadside-shell / harpoon / musket-ball / lightning-orb) | ❌ Pixelated close-up; no AI texture; need sprite-backed ammo |
| Muzzle flash | Generic fx-spark texture | ⚠ Works but same sprite reused everywhere |
| Water | Procedural 1024² canvas + per-biome variant | ✅ Good, could push to 2048² for retina |
| Weather | Procedural canvas textures (pollen, god-ray, spray, seabird) | ⚠ Very low-res (4×4 to 14×5 sprites) |
| Scenery props (§20 plan) | Procedural Phaser Graphics | ⚠ Functional but visibly code-drawn |
| Chests | Painterly Gemini sprites | ✅ Good |
| UI icons (skill tree 45 nodes) | None exist | ❌ Missing entirely |
| Portraits (bosses / ships) | None | ❌ Missing |
| Reaction VFX | Procedural particles | ⚠ Could lift with 13 bespoke bursts |
| Vignette | Single radial gradient | ✅ Fine |

### 1.3 Pixel density baseline

- Phaser renders at `WORLD_WIDTH × WORLD_HEIGHT` logical, `FIT` + center.
- Device pixel ratio is NOT currently applied — all canvas textures are
  authored at 1×. On Retina this gets upscaled 2× by the browser and
  softens. ❌
- Pre-baked FX textures now go at 2× (we did this in §20) but the
  *water*, *scenery*, and *UI* are still authored at 1×.

---

## 2. 2026 asset quality norms

What the target bar looks like today:

1. **Authored at 2× minimum**, with 3× source for hero sprites. Every
   canvas-baked texture should size-up from `devicePixelRatio` not
   assume 1×.
2. **Consistent style-lock** across the whole roster — our Gemini
   `STYLE_LOCK` prompt fragment already enforces this, but the
   *earlier enemy sprites* were generated before the player sprite got
   its refresh, so the palette drift is visible.
3. **Element-flagged silhouettes.** A storm variant of a gunboat
   should read as storm at 32×32. Need element rim-badges baked in.
4. **Projectile atlases.** Each weapon projectile is a 128² AI sprite
   with 4 rotation frames or a painterly texture. No more bare circles.
5. **Spritesheet parallax.** Background parallax is 3 bands (far banks
   / mid banks / water surface) each at 2×. Adds depth; cheap to ship.
6. **Icon set.** Every weapon, passive, status, reaction, and skill-
   tree node has a 64×64 painterly icon for menus / combat log /
   damage number legibility.
7. **Portraits for named entities.** Bosses + 5 starting ships get a
   256×256 portrait for boss-intros + the picker.

---

## 3. Regen batches

Work organized as 7 Gemini-generation batches. Each uses the existing
`tools/generate-sprites.mjs` pipeline with extended prompts. Each batch
is idempotent + skip-existing so we can iterate without losing work.

### Batch A — Act I enemies (refresh the drifted ones)
- `scout-skiff` — single-mast sloop, crimson sail, Navy colors.
- `ramming-brigand` — pirate ramming skiff, iron spike prow.
- `patrol-gunboat` — navy patrol with 4 cannons, gold trim.
- `bank-sniper-tower` — riverbank stone watchtower, red pennant.
- `broadside-cutter` — pirate multi-gun, 8 cannons, skull sail.
- `powder-keg-kamikaze` — rickety barrel-boat with lit fuse.
- `mortar-barge` — slow wide barge, central tube, armor plates.

Prompts re-generated so they all match the current player-sprite
palette + `STYLE_LOCK`.

### Batch B — Elemental enemy variants
The §22 plan defines variant enemies. Generate themed PNGs for each:
- `patrol-gunboat-storm` — silver hull, lightning-marked sail, blue
  glow along the hull seams.
- `mortar-barge-frost` — frost-blue hull, crystal shell at the tube.
- `scout-skiff-storm` — silver skiff with a lightning-sail stripe.

Plus a **rim-badge** overlay bakery so any future enemy can get an
element tag without regen: a small 48×48 element icon (🔥 ring / ⚡
bolt / ❄ crystal / 🌿 leaf / 🌑 skull) composited onto the stern.

### Batch C — Projectiles
One painterly PNG per projectile style. 128×128 source, authored
**top-aligned** so rotation stays clean:

- `proj-cannonball` — iron sphere with a gun-metal highlight, small
  smoke wisp at the tail.
- `proj-broadside-shell` — elongated red-hot shell with spark halo.
- `proj-harpoon` — wooden shaft, iron head, trailing rope fragment.
- `proj-musket-ball` — small grey sphere, dusty trail.
- `proj-lightning-orb` — white-cyan orb with forked arc bursts.
- `proj-frost-mortar` — blue crystal shell with frost breath.
- `proj-ember-mortar` — orange red-hot shell with ember sparks.
- `proj-ghost-bolt` — spectral purple wisp with skull face.

Compositor step: at boot, sample each projectile sprite and rotate to
match velocity (Phaser `Image.setRotation`). Reduces per-frame cost
vs. 4 hand-painted rotations.

### Batch D — Environmental scenery (replace procedurals)
Current §20 scenery props are Phaser Graphics bakes. Upgrade each to
an AI painterly sprite. 256×128 landscape texture:

- `scenery-reed-clump` — dense river reeds at water line, morning mist.
- `scenery-grass-tuft` — small grass tuft / lily pad floating.
- `scenery-river-log` — half-submerged mossy log.
- `scenery-mud-bar` — silty ochre mid-stream shoal.
- `scenery-stone-marker` — moss-covered boundary stone with carvings.
- `scenery-mangrove-bank` — dense mangrove tree-line, 512×256 strip
  painterly.
- `scenery-mangrove-root` — gnarled root cluster near waterline.
- `scenery-dock-plank` — weathered plank with iron rings.
- `scenery-debris-crate` — tumbling wooden crate.
- `scenery-fleet-silhouette` — hazy distant galleon, 512×128 wide.
- `scenery-blockade-line` — row of distant naval ships, 1024×128 wide.
- `scenery-wreckage` — upturned hull fragment + torn sail.

### Batch E — Hazards
Current rock + barrel are code-drawn. Regenerate:
- `hazard-rock-small` — barnacle-covered grey rock.
- `hazard-rock-large` — full-lane boulder with barnacles + seagull.
- `hazard-barrel` — destructible powder barrel, warning stripes.
- `hazard-ice-patch` — frozen water patch, slows (Act II cameo).
- `hazard-oil-slick` — black oil sheen, optionally on fire.
- `hazard-mine` — floating sea mine with spikes.

### Batch F — UI icon set
64×64 PNG per icon, transparent background, flat-painterly:

- **Weapons** (13) — cannon, broadside, harpoon, lightning, flame,
  beam, mortar, arrow, ink, axe, musket, mine, ghost.
- **Passives** (8) — crow's nest, copper hull, storm compass, powder
  barrel, first mate, cargo net, spyglass, admiral's flag.
- **Statuses** (10) — burn, wet, freeze, poison, shock, stun, slow,
  shatter, shock-chain, corrode.
- **Reactions** (13) — steam, shock, shatter, scald, conduct,
  convulsion, crystal-venom, vaporize, freezerburn, blastwave,
  magnetize, absolve, cleanse.
- **Skill-tree branches** (15 — 3 branches × 5 ships) — Pyre / Kiln /
  Ash, Gale / Spark / Rime, Chill / Rime / Ward, Root / Grove /
  Drift, Veil / Haunt / Drain.

Total: 59 icons in Batch F.

### Batch G — Portraits & boss intros
256×256 per portrait. Used by:
- Ship picker info panel.
- Boss intro cards.
- Future character sheet / achievement cards.

- 5 ship portraits (ember/tempest/frost/verdant/night).
- 9 boss portraits (frigate-captain / delta-commodore / pirate-king /
  ghost-commodore / drowned-admiralty / banshee-galleon / obsidian-
  warlord / kraken-ancient / pirate-champion).

---

## 4. Pipeline changes

### 4.1 Device pixel ratio integration

In `apps/games/boat-shooter/src/index.ts`:

```ts
const DPR = Math.min(window.devicePixelRatio || 1, 3);
new Phaser.Game({
  ...
  scale: {
    mode: Phaser.Scale.FIT,
    resolution: DPR,              // ← new
    ...
  },
  render: { antialias: true, pixelArt: false, roundPixels: false,
            resolution: DPR },    // ← new
});
```

Then every procedural canvas texture (water, weather, scenery
fallback, FX atlas) takes a `density: DPR` param and upscales its
source canvas accordingly. No change to the draw code — only source
size.

### 4.2 Water texture bump

`systems/water-shader.ts`: 1024² → **2048²** source, tiled with the
existing 1× display size. Cost ≈ +3 MB RAM at boot (negligible),
benefit = crisp ripples at retina zoom.

### 4.3 Weather atlas

Replace procedural 4×4 pollen, 8×220 god-rays, 12×3 spray, 14×5
seabird with painterly PNGs:

- `weather-pollen-speck.png` — 32×32 golden mote with soft glow.
- `weather-god-ray.png` — 64×256 angled light streak.
- `weather-spray-drop.png` — 48×12 horizontal droplet streak.
- `weather-seabird.png` — 48×24 painterly seagull silhouette.
- `weather-mangrove-leaf.png` — 64×32 drifting leaf (new).
- `weather-fog-puff.png` — 256×256 painterly fog plume (replaces the
  64² canvas bake for Act II fog).

### 4.4 Depth / parallax bands

Introduce 3 new parallax layers tied to `systems/scenery.ts`:

- **Far (parallax 0.25):** distant ship silhouettes, horizon line,
  distant mountain range (Act III). Z-depth `-90`.
- **Mid (parallax 0.7):** banks, tree-lines, docks. Z-depth `-78`.
- **Near (parallax 1.0):** scrolls with water. Z-depth `-68`.

Currently we have mid + near only. Add **far**.

---

## 5. Execution sequence

```
1. Pipeline fixes (blocks everything else).
   1a. Add DPR to Phaser.Game config.
   1b. Bump water-shader source to 2048².
   1c. Wire DPR param into all procedural canvas bakes.
2. Batch A — regenerate 7 Act I enemy sprites with current STYLE_LOCK.
3. Batch C — generate 8 projectile sprites.
   3a. Refactor Projectile.applyStyleVisual to prefer sprite when present.
4. Batch D — generate 12 scenery sprites.
   4a. Refactor SceneryLayer.bake* to prefer sprite when present.
5. Batch E — generate 6 hazard sprites. Wire into HazardSystem.
6. Batch F — 59 UI icons. Integrate into CombatLog, LevelUpScene,
   ship picker, player props panel.
7. Batch B — elemental variants.
8. Batch G — 14 portraits. Wire into boss-intro + ship-picker.
9. Weather atlas refresh (Section 4.3).
10. Far parallax layer (Section 4.4).
11. Acceptance: playtest stages 1→3 + ship picker + any level-up pick.
    - Is every sprite in the frame painterly-quality?
    - Are UI panels and toasts readable at retina + 720p scaled?
    - Do water + banks + scenery visibly gain fidelity side-by-side?
```

Rough effort (solo):
- Step 1: **½ day**.
- Step 2: **½ day** (Gemini generation is fast).
- Steps 3–5: **1 day** (generation + renderer refactors).
- Step 6 (icons): **1 day** (59 icons, chunked).
- Steps 7, 8, 9, 10: **1 day** each.
- Step 11: **½ day**.

Total: **~5.5 days**, parallelizable across batches because each is
a data-only generation.

Generation budget (if Gemini 2.5 Flash Image stays at ~5–8 s/image +
$0 from research quota):
- Batch A: 7 images.
- Batch B: 3 images.
- Batch C: 8 images.
- Batch D: 12 images.
- Batch E: 6 images.
- Batch F: 59 images.
- Batch G: 14 images.
- Total: **109 images**, ~15 min generation time end to end.

---

## 6. Style notes for prompts

Every prompt must prepend the project's `STYLE_LOCK`:

> Stylized 2D painterly sprite, hand-drawn look, pirate / Age-of-Sail
> aesthetic, vibrant tropical palette of teal / sun-bleached wood /
> gold / crimson, readable silhouette at 64×64, crisp outline, single
> centered sprite on a pure-black (#000000) background with alpha=1
> background (NOT transparent — solid black), orthographic top-down
> view, no camera perspective, no text, no watermark.

Adjustments per batch:
- **Projectiles** — the "top-down view" isn't quite right; request
  "side-aligned ammunition silhouette, readable at 32×32."
- **Icons** — request "flat painterly game icon, centered, high
  contrast, clean outline, works on dark UI background."
- **Portraits** — request "character portrait bust, three-quarter
  view, painterly, dramatic lighting from above-left."
- **Hazards** — keep top-down but add "floating at water-line,
  splash ring visible."

All batches post-process through the existing chroma-key-to-
transparent pipeline in `systems/sprite-loader.ts`. No changes needed
to that system.

---

## 7. Acceptance checklist

1. Every rendered sprite in Stages 1–3 comes from a painterly AI bake
   or a 2×-density procedural canvas — no visible 1× primitives.
2. Every weapon-type projectile uses its dedicated sprite at retina
   density.
3. Every scenery prop uses its dedicated sprite when available;
   procedural fallback is bit-identical to current quality.
4. DPR scaling applies; water + weather are crisp on a 2× display.
5. Skill-tree / weapon / passive / status / reaction icons appear in
   LevelUpScene, CombatLog, and the ship-picker info panel at 64²
   retina quality.
6. Parallax far-band renders on stages 1–3 with distant silhouettes
   scrolling at 0.25× the water speed.
7. Gemini batch run: `node tools/generate-sprites.mjs --skip-existing`
   completes 109 images with 0 failures (or all failures are logged
   + re-runnable).

---

## 8. Non-goals

- No gameplay changes.
- No new enemies, bosses, or hazards — just better-looking versions
  of what we have.
- No motion/video assets — all static.
- No Act II or III asset expansion — covered in a later doc.
- No music/SFX — separate audio-bible pass.
