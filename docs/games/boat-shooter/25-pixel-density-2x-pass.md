# Pixel-Density 2× Pass — Image Depth & Fidelity Enhancement

Scope: raise the **effective pixel density** of every rendered asset in
the game to at least **2× target display size**, and use that extra
source headroom to add **visual depth** (shadows, specular, rim-light,
fine detail) that the 1× bakes couldn't carry.

**Not** a regeneration of art direction — the existing Gemini sprites
stay. This pass makes everything already shipped render sharper and
composite better.

Companion docs:
- `17-art-bible.md` — style locks.
- `24-asset-expansion-act-i.md` — the first density pass (landed some
  2× work; this doc completes it).

---

## 1. Why now

Current state after landing docs 20/22/23/24:
- Gemini ship/enemy/boss sprites are **1024² native** (great for a
  128 px display at 4× headroom; tight at 256 px display = only 4×
  headroom, borderline at 400 px for boss scale).
- Water texture is **2048²** (bumped in doc 24).
- FX textures (dot/ring/smoke/spark/splash) are **2× source** (bumped
  in doc 20).
- Weather particles are **4–220 px 1× canvases** (undersized).
- Scenery procedural bakes are **60–220 px 1× canvases** (undersized;
  AI sprites swap in where available and render at 2×+).
- Procedural vignette is **512 × 288 1×** → stretched to full world
  (1920 × 1080 target) = ~3× upsample → soft.
- UI text + damage numbers use Phaser Text — Phaser's built-in
  bitmap cache ignores `resolution` unless set explicitly.
- Damage-number strokes, combat-log panel, player-props panel are all
  stroke-authored at 1× into Phaser primitives → pixelated on retina.

On a 2× Retina display (the user's reported environment), this means
roughly **60% of pixels are upsampled**, and that's exactly what the
user perceives as "soft" / "low-density."

---

## 2. The 2× density contract

For every asset with a native resolution and a target display size:

```
source_pixels  >=  2  *  display_pixels_at_render_time
```

Applied per render context:
- **Full-screen elements** (water, vignette) target DPR-aware
  `WORLD_WIDTH × devicePixelRatio`. On a 2× retina panel at 1920×1080
  logical, that's **3840 × 2160 source**.
- **Ship/enemy sprites at 140–200 px display** need **≥ 400 px**
  source for 2× headroom + a generous aspect margin. The 1024² Gemini
  sprites satisfy this today. ✅
- **Boss sprites at 320–480 px display** need **≥ 960 px** source.
  1024² ships it, but only by 7%. Gemini can do 2048 × 2048 (see §4).
- **Icons at 64 px display** need **≥ 128 px** source. Generated 1024²
  easily satisfies, but compositor has to sample down cleanly.
- **Particles at ≤ 32 px** need **≥ 64 px** source. FX + weather must
  be at least 64 px per-particle.
- **Small UI / HUD text** — must set `resolution: devicePixelRatio` on
  every Phaser Text so fonts rasterize at 2× into Phaser's cache.

---

## 3. Per-asset-class plan

### 3.1 Gemini sprites — opt-in 2× regen

Path A: keep 1024² for small units (they already satisfy 2× at normal
display); push 2048² for:

- **Player ship** and 5 elemental variants.
- **Every boss** (8 images). At boss-intro scale they occupy ~480 px,
  so 1024² is a 2.1× margin — tight.
- **Frigate Captain / Delta Commodore / Pirate King** in particular
  (mid-Act I bosses) benefit most.

Regen strategy: extend `tools/generate-sprites.mjs` with a per-spec
`scale2x: true` flag that requests 2048² by appending "square
2048×2048 canvas" to the prompt. Gemini 2.5 Flash Image reliably
produces 1536–2048 outputs for that request. Cost: same call rate,
slightly longer decode.

Acceptance: generated PNG is ≥ 1536² in one dimension AND has the
same painterly + palette lock.

### 3.2 Procedural canvas bakes — unconditional 2×

Apply DPR-aware doubling to every `make.graphics` / `createCanvas`
texture. Pattern:

```ts
const DPR = Math.min(window.devicePixelRatio || 1, 3);
const baseW = 64, baseH = 64;          // logical target size
const srcW = baseW * 2 * DPR;          // source bake @ 2× × dpr
const canvas = document.createElement('canvas');
canvas.width = srcW;
canvas.height = srcH;
ctx.scale(srcW / baseW, srcH / baseH); // draw in logical units
// … draw as usual at 1× coords …
scene.textures.addCanvas(key, canvas);
// At use-site: image.setDisplaySize(baseW, baseH);
```

Targets:

| System | Current | Target | Why |
|---|---|---|---|
| `vignette.ts` (main + pulse textures) | 512 × 288 1× | 1024 × 576 + DPR | Full-screen stretch makes softness obvious |
| `fx.ts` (dot/ring/smoke/spark/splash) | 2× (already) | DPR-adaptive | Phaser scales up on retina; need DPR on top of the 2× |
| `weather.ts` (5 particle textures) | 4×4 / 8×220 / 12×3 / 14×5 / 64×64 | 2× + DPR | Particle detail is all-or-nothing |
| `scenery.ts` procedural bakes | 60–220 px 1× | 2× + DPR | Fallback path stays viable for missing-sprite cases |
| `water-shader.ts` | 2048² (already bumped) | Keep; tint overlay needs DPR | Ripple detail already crisp |
| `enemy-attack-fx.ts` (reticle bake) | Graphics primitives | Canvas-bake at 2× + DPR | Reticle ring was added w/ no density thought |

### 3.3 Phaser Text at retina

Every `scene.add.text(...)` should pass `resolution: Math.max(2, DPR)`
so text renders crisp at 2× minimum:

```ts
this.add.text(x, y, 'KILL STREAK', {
  fontFamily: 'Palatino, Georgia, serif',
  fontSize: '36px',
  resolution: Math.max(2, window.devicePixelRatio || 1),
  ...
});
```

Touchpoints (from code greps):
- `scenes/hud-scene.ts` — HP bar labels, streak overlay.
- `scenes/level-up-scene.ts` — pick cards.
- `scenes/combat-log-scene.ts` — log rows + filter pills (**critical**
  — smallest font in game).
- `scenes/player-props-scene.ts` — stat tables + tabs.
- `scenes/merchant-scene.ts`, `scenes/stage-clear-scene.ts`,
  `scenes/game-over-scene.ts`, `scenes/ship-picker-scene.ts`,
  `scenes/pause-scene.ts` — all menu copy.
- `entities/damage-number.ts` — the highest-frequency text in game.

Implementation: add a `crispTextStyle(styleObj)` helper that injects
`resolution: Math.max(2, DPR)` and route every `add.text` call
through it. Takes ~60 min across the codebase.

### 3.4 Chroma-key pipeline at 2×

`systems/sprite-loader.ts::chromaKeyBlackToTransparent` already
draws the source image into a canvas at native size and replaces the
texture. For 2× headroom, no change — the native source is already
1024²+. But the edge-antialias window (brightness 24–80) is tuned at
1× and creates a slight halo at 2× zoom. Widen to 16–96 for softer
feathering at retina:

```ts
if (brightness <= 16)       d[i+3] = 0;
else if (brightness <= 96)  d[i+3] = Math.floor(a * ((brightness-16)/80));
```

Small change. Eliminates the subtle cyan fringe around darker ship
hulls at 2× zoom.

### 3.5 Ship-compositor overlays

`systems/ship-compositor.ts` bakes 5 elemental variants from the base
player sprite at **native source size** (1024²). That's 2× of a
512 px display. Keep that. But:

- **Specular pass** currently adds a single soft radial highlight. At
  2× we can afford a **two-pass** specular: one broad low-alpha + one
  tight high-alpha at the same center. Adds perceivable depth to the
  hull.
- **Rim-light pass** (NEW) — draw a faint bright outline along the
  top-left alpha edge of the sprite using `source-atop` + an
  inverted-displacement trick. Sells "light from upper-left" on every
  ship uniformly. Only costs one extra canvas pass per variant at
  boot.

### 3.6 Damage numbers

`entities/damage-number.ts` now has tiered rendering (doc 23). All
text-based → benefits from the resolution fix in §3.3. Additionally:

- **Stroke width** is authored at 1× and scales with fontSize. Retina
  renders fine lines. Bump stroke thickness +1 px on tiers "big" and
  above so they remain readable when the numbers shrink during fade.
- **Crit + mega-crit** — add a soft drop-shadow via a duplicate text
  offset by (1, 1) at 40% alpha. Gives depth without a blend mode.

### 3.7 Vignette pulse

Already a 2× canvas (`512 × 288`). Bump to `1024 × 576` per §3.2, and
add a **second concentric gradient band** at 0.7 radial distance so
the pulse has two-tier falloff instead of linear. More "impact-y"
feel without more work per frame.

---

## 4. Execution ordering

Ordered so early steps unlock later tuning. Every step is
independently shippable.

```
1. DPR helper utility   (blocks §3.2 + §3.3)
   → src/util/dpr.ts   exports `DPR` and `dprScaledCanvasSize(w, h)`.
2. Phaser Text helper
   → src/util/crisp-text.ts  exports `crispTextStyle(s)`.
3. Procedural bake pass (§3.2) — route every current canvas bake
   through the DPR helper. 7 files to touch (weather, scenery,
   vignette, fx, enemy-attack-fx, any future bakers).
4. Scene text pass (§3.3) — grep `add.text(`, apply crispTextStyle.
5. Chroma-key widening (§3.4) — single-file change.
6. Ship compositor depth (§3.5) — add rim-light + two-tier specular.
7. Damage-number drop-shadow + stroke bump (§3.6).
8. Vignette pulse bump (§3.7).
9. Gemini 2× regen of bosses + player ship + ship variants (§3.1).
   Run `tools/generate-sprites.mjs --only=…` with `scale2x` flag.
10. Regression pass: 2× retina playthrough stages 1–3 + a boss.
    Spot-check: no blurry text, no halo fringe on sprites, pulse +
    damage numbers look punchier than the 1× baseline.
```

Effort:
- Steps 1, 2: 45 min (helpers).
- Step 3: 1 day (7 bakers, careful to preserve visuals).
- Step 4: 1 hour (mechanical find/replace).
- Step 5: 15 min.
- Step 6: 2 hours.
- Step 7: 1 hour.
- Step 8: 30 min.
- Step 9: 30 min generation + review.
- Step 10: 1 hour.

**Total: ~2 days.** The single-biggest visual win per minute is Step
4 (crisp text everywhere).

---

## 5. Size / perf budget

Disk / memory impact of going 2× across the board:

| Asset | 1× | 2× | Δ |
|---|---|---|---|
| Water texture (per biome, 7 biomes) | 1× 1MB | 2× 4MB each | +21 MB RAM at full biome coverage (only 1–2 loaded at once → actual +3–8 MB) |
| Vignette pair | 2× 1MB | 2× 4MB | +6 MB RAM |
| FX atlas (5 particles) | 2× tiny | 2× tiny | negligible |
| Weather particles (5) | ~0 | ~0.5 MB total | negligible |
| Scenery bakes (13 kinds) | ~3 MB total | ~12 MB total | +9 MB RAM (only loaded when the biome uses them) |
| Gemini 2× regen (boss + player set, ~15 images) | ~12 MB disk | ~36 MB disk | +24 MB disk, +0 RAM (lazy-loaded) |

Budget ceiling: adds ~40 MB RAM peak during a stage, mostly water +
scenery. Phaser WebGL handles this easily on every target device
(iPad Air 2020 and up). Acceptable.

PWA precache grows from 1976 KiB to ~3.5 MB — still well inside the
Service Worker practical cache limit. Accept.

---

## 6. Acceptance criteria

At 2× retina / 150% Windows scaling / iPad Retina:

1. No Phaser Text element is visibly blurry (corner anti-alias
   visible on letters, no staircase pixels).
2. No sprite edge has a black/cyan halo from chroma-key (§3.4 widened
   feather).
3. Every full-screen gradient (vignette, pulse) transitions smoothly
   (no banding visible in a 0–1 alpha ramp).
4. Damage numbers at the smallest tier (tiny / dot) are readable at
   arm's length on an iPad held at 500 mm.
5. Procedural scenery props (when the AI sprite is absent) look
   identically-crisp to the AI variant on a 2× screen.
6. Boss intro cards sized at ~480 px display visibly gain detail over
   current renderings (eyes / stitching / rigging crisper).
7. Build passes; PWA precache < 4 MB.

---

## 7. Non-goals

- No Act II / Act III asset work.
- No new art / no art-direction changes.
- No per-platform adaptation (we don't gate density by device class
  beyond DPR clamp ≤ 3).
- No video / motion assets.
- No animation frames (still-image density only).
- No audio impact.

---

## 8. Open questions

1. Should we bump the Gemini model to `gemini-2.5-flash-image-preview`
   for the 2× boss regen if it's ever released with higher output
   resolution? Check at regen time.
2. The DPR clamp of `3` was chosen for 4K/5K panels. Do we want a
   setting toggle for low-end devices to clamp at 1 even on retina?
   (Would recover ~15 MB RAM.) Future work.
3. Does Phaser 3.90 honor `scale.resolution` at all anymore? The doc
   24 change was applied through a cast because the field was typed
   out. We should verify runtime behavior — if the cast is a no-op,
   our canvas-bakers must own the DPR math independently (which this
   plan already assumes).
