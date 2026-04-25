# Visual Expansion Plan — Act I, Stages 1–3 ("The Sunlit Delta")

Scope-locked to the **first three stages** of the campaign
(`stage-1-rivermouth`, `stage-2-inland-channels`, `stage-3-delta-fleet`).
Goal: make every run *visibly progress* from "rowing out of a sleepy river"
to "charging a Navy battle fleet in open sea" — without changing gameplay
systems that already ship.

This is a pure visual plan. All gameplay (waves, bosses, weapon curves,
status matrix) remains exactly as defined in:
- `04-weapons.md`, `08-enemies.md`, `09-bosses.md`, `11-stages.md`
- `src/data/stages/stage-{1,2,3}.ts`

---

## 1. Audit — what's visually static today

Findings after reading the current Act I surface area:

| Area | File / system | State |
|---|---|---|
| Water | `systems/water-shader.ts` | Stages 1/2/3 all use the same `sunlit` biome → **identical water** across the first 5 minutes of any run. |
| Weather | `systems/weather.ts` | `sunlit` is `// No ambient weather — clear water.` → nothing happens on-screen. |
| Terrain / props | — | No rocks, banks, buoys, kelp, or coastline entities exist for open-water Act I stages. `bank-sniper-tower` is the only shore asset, and it reads as a unit, not terrain. |
| Player ship | `entities/player.ts` (~560 LOC, 80+ parts) | Beautifully detailed, **but identical from the title screen through every run**. No sense of "we just left harbor" vs. "we're at fleet-battle scale". |
| Player projectile | `entities/projectile.ts` | Single universal "two-tone disk + grey smoke trail" look for every weapon. Bow Cannon, Broadside, Harpoon all render as grey dots colored by `color:` param. |
| Muzzle flash | `systems/fx.ts::muzzleFlash` | One generic 6-spark + puff, reused everywhere. No cannon-recoil smoke cone, no directional flash. |
| Weapon animation — Bow Cannon | `weapons/bow-cannon.ts` | No bow-port flash, no shell casing, no water splash where shots land short. Muzzle originates at `player.y - 40` regardless of fire config. |
| Weapon animation — Broadside | `weapons/broadside.ts` | `cannonsPort/cannonsStbd` recoil only animates on manual call — Broadside never invokes `recoilCannons()`. Side cannons fire without visibly recoiling. |

**Consequence:** the first 5 minutes of a new-player's first run look like
the same pond with bigger boats in it. The visible delta between "tutorial
stage" and "Navy fleet engagement" is the enemy sprites only.

---

## 2. Lore alignment — the Sunlit Delta arc

The first three stages form a **single narrative beat**: the captain
breaks out of a riverine backwater, crosses Navy-patrolled channels, and
meets the Delta Fleet in open sea. Every visual decision below is an
instance of that beat.

| Stage | Title | Lore beat | Water feel | Light direction |
|---|---|---|---|---|
| 1 | Rivermouth | Slipping out of a sleepy delta at dawn. | Shallow, brown-green, silty, **reed shadows**. | Low golden-hour sun from port side. |
| 2 | Inland Channels | Weaving through Navy-patrolled cuts between mangrove islands. | Teal shallows + deeper midnight-teal troughs, **bank-cast shadows** across the channel. | Sun directly overhead, harsh shadows. |
| 3 | The Delta Fleet | Open sea; full Navy line of battle. | Deep blue-teal, **whitecap chop**, wind spray. | Late-afternoon sun from starboard, long specular streak toward the camera. |

Reading direction (Act I global): the boat travels **downstream** (scrolls
from river → sea). Stage-to-stage visuals must read as "going somewhere."

---

## 3. Per-stage environmental identity

Each stage gets its own **water sub-variant** + **ambient weather** +
**terrain props pass** — all additive to the existing `sunlit` tint so
we don't disturb the combat-readability tuning done in P4.

### 3.1 Water sub-variants (extend `water-shader.ts`)

Add three new biome keys without removing `sunlit`:

```ts
export type WaterBiome =
  | 'sunlit' | 'fog' | 'night' | 'volcanic'
  // NEW — Act I sub-variants
  | 'rivermouth' | 'channels' | 'open-sea';
```

Tint tables (deltas from the existing `sunlit` baseline):

```
rivermouth:  bg 0x2a5a4a  hi 0x4a8060  mid 0x3a6a50
             caustic 0xc0e090  tint 0xe8f0c8  alpha 1.00
             +silt particles (ochre dots, low alpha)
channels:    bg 0x0e506a  hi 0x1a7090  mid 0x0e5e78
             caustic 0x9ae0ff  tint 0xe8f6ff  alpha 1.00
             +darker mid-band stripes (shadow of the banks)
open-sea:    bg 0x0a4a78  hi 0x1a709a  mid 0x0a5a88
             caustic 0xa8f0ff  tint 0xffffff  alpha 1.00
             +whitecap glints (bright specks, short lifespan)
```

Biome mapping update (`stage-scene.ts::biomeForStage`):

```
stage-1  → 'rivermouth'
stage-2  → 'channels'
stage-3  → 'open-sea'
stage-4/5 remain on 'sunlit' (Red Harbor/Smuggler's Cove — act-final tone)
```

### 3.2 Ambient weather per stage (extend `weather.ts`)

| Stage | Particles | Density | Color | Motion |
|---|---|---|---|---|
| 1 Rivermouth | Drifting pollen / midges | sparse (freq 600ms) | `0xffe9a0` @ α 0.25 | slow drift `speedX 10–30` |
| 2 Channels | Dappled light patches (soft light rays) | medium (freq 200ms) | `0xffffff` @ α 0.06, ADD blend | vertical streaks `speedY 60–100` |
| 3 Open Sea | Wind spray + sparse seabirds | dense (freq 80ms) | `0xeaf6ff` @ α 0.35 + silhouette birds | `speedX 80–140` from port |

All counts halve under `reducedMotion` — weather system already does this
multiplicatively via `qMult`.

### 3.3 Terrain pass — new prop system

Introduce a lightweight **scenery layer** that scrolls with the water and
takes no collision. This gives each stage a *place*, not just a tint.

Proposed file: `src/systems/scenery.ts`. Draws instanced `Graphics` or
pre-baked canvas textures in a parallax band behind gameplay.

Per-stage scenery manifests:

**Stage 1 — Rivermouth**
- Reed clumps (vertical strokes, `0x4a6a28` → `0x6a8a3a`) along both edges.
- Floating leaves (tiny 3–5 px rhombi, tinted `0x7a9a3a`, slow drift).
- Mud bars mid-channel (ochre oval patches, α 0.35).
- Occasional log with moss (10–14 px sprite, scrolls with water).
- A single **stone marker at the river fork** at y≈300 — the place the
  player's first Brigand wave spawns from.

**Stage 2 — Inland Channels**
- **Bank tree-lines** on left and right edges: parallax-1 (back) silhouette
  palm/mangrove strip, parallax-2 (mid) crown strip with dappled highlights.
- Mangrove root clusters breaking the channel into two lanes at y≈200,
  y≈700, y≈1200.
- Docks / wooden platforms at the bank where Bank Sniper Towers spawn
  (already a unit — just give it a 24×16 plank footprint).
- Floating barrels / broken crate debris between waves.

**Stage 3 — The Delta Fleet**
- No banks. Instead:
  - Distant **friendly pirate galleon silhouettes** at the top-most 40 px
    band (parallax-3) — reinforces "a fleet engagement."
  - Distant **Navy blockade line** at the world top, hazy + monochrome, α 0.3.
  - **Whitecap streaks** in the scrolling layer (already covered in water
    sub-variant, duplicated here as near-water scenery for emphasis).
  - Floating wreckage (planks, sails, an upturned hull) marking the
    fleet's advance — players sail *through* the aftermath of an earlier
    skirmish.

**Depth budget:** scenery layer clamps between depth `-80` and `-60` —
behind gameplay (default 0), in front of water (`-100`). No scenery prop
occludes a ship.

---

## 4. Player ship — visible evolution across the first three stages

The ship is the player's avatar for the whole campaign. Make the first
three stages **earn** the flagship silhouette the player saw at the title
screen: start small, add rigging, add guns.

### Principle
Three **tiers** of the starting ship. Each stage *starts* the player at
that tier's silhouette, regardless of weapons picked. This is a purely
visual overlay on `entities/player.ts::buildDetailedShip()`.

The collision radius (`Player.radius = 42`) and the oval clip mask
(`OVAL_HALF_W=38`, `OVAL_HALF_H=48`) **do not change**. All tier-specific
parts stay inside the same silhouette envelope so hitboxes remain stable.

### Tier 1 — "Sloop of the Rivermouth" (Stage 1)
- Single mast, **one** yardarm (remove the second).
- Plain un-decorated sail (no gold anchor emblem yet).
- **2 cannons per side** instead of 3 (hide the middle pair or draw them
  as covered ports).
- Unpainted hull (default oak) with a simple rope rail, no gold trim.
- Small fishing lantern at stern.
- Captain's flag is a **plain white pennant** — narrower (3 px vs 6 px).
- Wake is **thin** (spawn threshold raised from `speed > 60` to `> 100`).

### Tier 2 — "Delta Cutter" (Stage 2)
- Second yardarm returns; sail gains the gold anchor emblem.
- **3 cannons per side** as today.
- Gold stripe at the gunwale line.
- Captain's flag gains a **crimson stripe** (half-and-half pennant).
- Stern cabin gets its porthole glow.
- Wake spawn threshold back to `> 60`.

### Tier 3 — "Delta Flagship" (Stage 3 — current look)
- Full 80-part build exactly as today, plus:
- **Second mast** (foremast), tiny, with its own yardarm and jib sail — the
  "we're a ship of the line now" cue.
- Figurehead at the bow (gold wedge already exists — make it larger and
  add a tiny pirate-king-hat shadow).
- Full skull/anchor/compass emblem on the mainsail (cosmetic override
  stays, but the default ships with the anchor).
- Signal pennant replaces the plain flag — rectangular with a tail notch.

### Runtime hook
Add `runState.shipTier: 1 | 2 | 3` set by `stage-scene.ts::init()` based
on stage id. `buildDetailedShip()` reads it and skips / adds parts at
construction time. No per-frame cost. Cosmetics (hull/sails) continue to
overlay on top of whichever tier is active.

### Damage-state polish (across all tiers)
Currently the detailed ship doesn't re-render on HP loss — only the
legacy `drawHull()` graphics path does. Wire the same three states into
the detailed ship:

- HP ≤ 75% → one plank seam goes from `0.6` width to `1.2` + darker color.
- HP ≤ 50% → sail alpha drops from `0.85` to `0.7`; add a **tear polygon**
  cut-out along the top edge (kept inside the silhouette envelope).
- HP ≤ 25% → `smokeStack` already wired; additionally tilt the flag angle
  clamp from ±18° to ±35° (dragging in the wind because the mast's
  cracked).

---

## 5. Bullets & weapon animations — Act I weapons only

Only five weapons are realistically available by the end of stage 3
(drafted per level-up from the pool). This plan restricts itself to
*improvements you'd see*, not speculative work on evolutions.

### 5.1 Projectile refactor (`entities/projectile.ts`)

Today every projectile is a two-tone disk. Introduce a `style` tag so
weapons can spawn visibly different shots without changing the pool:

```ts
type ProjectileStyle = 'cannonball' | 'broadside-shell' | 'harpoon'
                    | 'musket-ball' | 'lightning-orb';

interface ProjectileSpawn { /* …existing… */ style: ProjectileStyle; }
```

At spawn, the projectile rebuilds its child Graphics once per style
change. Pooled re-use still works; style transitions are rare since pools
are typically bucketed by weapon.

Per-style visuals (all stay within the existing radius):

| Style | Body | Core | Extras |
|---|---|---|---|
| `cannonball` | 9 px near-black sphere | 7 px iron-grey, small highlight top-left | Heat shimmer ring (alpha 0.25, scaled 1.4×), persists 80 ms after spawn |
| `broadside-shell` | 10 px elongated oval aligned to velocity | warm red-brown core | Ember spark trail (ADD blend) instead of grey smoke |
| `harpoon` | 3 px × 32 px bar aligned to velocity | `0xd8deea` shaft, `0x8a5a2a` wooden butt | Rope segment behind — faint line segments fading toward player |
| `musket-ball` (enemy) | 4 px flat grey dot | white core | No trail (current enemy look) |
| `lightning-orb` (W4) | 8 px white core | 16 px outer halo, flickering scale 0.9–1.1 @ 30 Hz | Chain beams already handled outside projectile |

### 5.2 Muzzle flashes — per-weapon signatures (`systems/fx.ts`)

Replace the one-size-fits-all flash with weapon-specific variants:

**`muzzleFlashCannon(x, y, heading)`** — Bow Cannon / Broadside
- Directional **cone** of 3 orange-yellow sparks (40–80 px), short
  lifespan (90 ms).
- One large **ember puff** (12 px, tint `0x7a4a28`, lifespan 450 ms, grows
  scale 0.6 → 1.4, alpha 0.7 → 0).
- One tiny **flash disc** (radius 14 px, additive, white-hot, lifespan
  60 ms) — the "boom."

**`muzzleFlashHarpoon(x, y, heading)`** — Harpoon
- No fire. A **sharp white line** drawn along the firing axis, fades
  120 ms.
- Two small splashes where the harpoon breaks the water surface at launch.

**`muzzleFlashChain(x, y)`** — Chain Lightning
- Radial **arc-cross** of 4 short zig-zag lines, white core, cyan edge.
- Lifespan 120 ms; uses the existing `fx-spark` rotated.

**`muzzleFlashMusket(x, y, heading)`** — enemy muskets
- Smaller version of cannon (spark cone only, no puff), tint `0xff8a4a`.

### 5.3 Per-weapon firing animations

**W1 Bow Cannon Volley**
- Move muzzle origin from `player.y - 40` to the actual **bow tip** of
  the current ship tier (T1: y-36, T2: y-40, T3: y-44). The bow recoil
  should *feel* different at each tier.
- When firing, call a new `player.recoilBow(strength)` that shifts the
  whole container by +6 px on Y for 80 ms then eases back — the ship
  visibly kicks backward on each volley.
- For 2-proj / 3-proj configs, pre-stagger firings by 35 ms so you see
  port-then-starboard, not a simultaneous blob.

**W2 Broadside Shot**
- Wire `player.recoilCannons('port')` and `('starboard')` to fire in the
  **same tick** as the projectiles — currently this animation exists but
  is never invoked by this weapon.
- Add a **gunpowder smoke wall** along the firing side: 4–5 grey puffs
  along y = `-18,-6,0,6,18` with staggered lifespans; drifts outward.
- Camera **roll** tween on the scene camera — ±0.6° yaw for 150 ms. Skip
  under `reducedMotion`.

**W3 Harpoon**
- Pre-fire **wind-up tell** — 180 ms shoulder-glow ring at the bow before
  the shot, telegraphs the slow rhythm the weapon has.
- Fired projectile drags a **rope**: segment-line from player to harpoon
  head, fades after the shot lands or reaches `ttlMs`.
- On impact, the rope "snaps" — 3 small line fragments fly out with
  spark particles.

**W4 Chain Lightning** (may appear by stage 2/3)
- Current chain already looks decent. Add:
  - Pre-zap **target reticle** — 60 ms cyan circle on first target before
    the bolt hits.
  - Residual **burn-in afterimage** along the chain path (60 ms fade).

**W5 Flamethrower** (reaches stage 3 in most builds)
- Swap the existing cone from "orange rectangle" to a **layered three-
  gradient cone** (inner yellow, mid orange, outer red-smoke), refreshed
  at 30 Hz for shimmer.
- Ember particles that flake off the cone edge and drift upward
  (lifespan 400 ms, speedY -60…-20).
- Ground patches scorched by the cone stay 250 ms after the cone passes
  (low-alpha charcoal ellipse that fades). Already a gameplay patch for
  evolved — re-use the same sprite at reduced opacity.

### 5.4 Impact reactions

When a projectile ends its life, dispatch a **style-aware hit** instead
of the current shared `hitSpark`:

| Style | On-hit |
|---|---|
| cannonball | 3 iron sparks + 1 smoke puff + splinter debris (4 tiny brown rects) |
| broadside-shell | 1 mini-explosion (reuse `explosion(r=30)`) + ember shower |
| harpoon | rope-snap + impact "thunk" particle (arrow-like lines converging) |
| lightning-orb | arc-flash + 2 branching zigzags to nearest 2 enemies (visual only) |

---

## 6. Evolution stages — enumerated visual tiers

This is the explicit, ordered list the user asked for. "Evolution" here
refers to the **visual tier curve** of the starting experience, not the
weapon-Evolution system (which doesn't trigger until late in Act I/II).

```
ST-1  Rivermouth
      water:    rivermouth (silty green-teal)
      weather:  pollen/midges
      scenery:  reeds, leaves, logs, mud bars, stone marker
      ship:     T1 "Sloop of the Rivermouth" — 1 mast, 2 guns/side, plain sail
      bullets:  cannonball (grey iron), muzzle-cannon, bow-recoil on fire
      bosses:   Frigate Captain (existing sprite, no visual change)

ST-2  Inland Channels
      water:    channels (darker mid-band stripes, bank shadows)
      weather:  dappled god-rays
      scenery:  mangrove banks, root clusters, dock planks, debris
      ship:     T2 "Delta Cutter" — 3 guns/side, anchor emblem, gold stripe
      bullets:  cannonball + broadside-shell (red-brown ember); broadside
                side-cannons now visibly recoil; gunpowder smoke wall;
                camera roll on salvo
      bosses:   Frigate Captain (existing)

ST-3  The Delta Fleet
      water:    open-sea (deep blue-teal, whitecap glints)
      weather:  wind spray + distant seabirds
      scenery:  friendly galleons silhouettes (top band), distant Navy
                blockade line (hazy), floating wreckage
      ship:     T3 "Delta Flagship" — 2 masts, figurehead, full emblem,
                signal pennant
      bullets:  + harpoon (rope drag + snap), chain-lightning reticle,
                flamethrower layered cone with embers
      bosses:   Delta Commodore (existing)
```

Damage-state polish applies uniformly across all three tiers.

---

## 7. Sequence execution — ordered task list

Dependencies flow top → bottom. Steps 1–2 unlock everything else; steps
3–6 are independent and can be parallelized after.

```
1.  Biome extension
    a. Extend WaterBiome type with 'rivermouth' | 'channels' | 'open-sea'.
    b. Add TINTS entries + seeded canvas variants in water-shader.ts.
    c. Update stage-scene.ts::biomeForStage() mapping.
    d. Verify `water-*` textures are gc-safe (they're already cached per
       key, so new keys just add ~1 MB each — budget check).

2.  Weather extension
    a. Add 'rivermouth' / 'channels' / 'open-sea' branches to
       WeatherSystem::setBiome().
    b. New particle textures: weather-pollen-speck, weather-god-ray,
       weather-spray-drop, weather-seabird (tiny silhouette 6×3).
    c. Reduce-motion paths already handled by qMult.

3.  Scenery system (new)
    a. Create systems/scenery.ts with a SceneryLayer class owning a
       ParticleEmitter + a Container of static props.
    b. Per-stage manifest loader — keyed by stage id.
    c. Author the three manifests (reeds, mangroves, fleet silhouettes)
       as canvas-pre-baked textures; one PNG per prop type so they can
       later be swapped with AI sprites.
    d. Hook into stage-scene.ts after water init, before enemy system.

4.  Player ship tiers
    a. Add runState.shipTier (1|2|3); set in stage-scene.ts::init().
    b. Gate the foremast / second yardarm / emblem / figurehead in
       buildDetailedShip() on shipTier.
    c. Re-validate collision + mask alignment at every tier (same oval).
    d. Damage-state wiring: tear polygon on sail @ ≤50%, flag clamp
       expand @ ≤25%, extra plank seam darken @ ≤75%.

5.  Projectile style refactor
    a. Add ProjectileStyle enum + field to ProjectileSpawn.
    b. Projectile::spawn rebuilds child Graphics on style change; pools
       already re-use containers.
    c. Migrate the 5 Act I weapons to pass style; leave enemy muskets as
       'musket-ball'.

6.  FX — per-weapon signatures
    a. Add muzzleFlashCannon/Harpoon/Chain/Musket to FxSystem.
    b. Replace generic muzzleFlash calls in bow-cannon.ts,
       broadside.ts, harpoon.ts, chain-lightning.ts.
    c. Wire player.recoilCannons() from Broadside (fix: currently
       unused).
    d. Add player.recoilBow() and call from Bow Cannon on fire.
    e. Style-aware impact effects in collision.ts::onProjectileHit.

7.  Acceptance pass
    a. Playtest stage 1 → 2 → 3 back-to-back on one run — confirm each
       feels distinct.
    b. Screenshot sheet: 3 stages × 3 moments (idle, firing, boss intro)
       = 9 stills. Commit to docs/games/boat-shooter/screens/ for
       regression.
    c. Reduced-motion playthrough — no particle storm, weather still
       legible.
    d. Colorblind palettes (none/protanopia/deuteranopia/tritanopia) —
       scenery + ember colors don't merge with reaction VFX.
    e. Build size budget: water textures + new particle atlases ≤ +300 KB
       gz on initial chunk; scenery PNGs lazy-loaded per stage.
```

Estimated effort (solo, senior eng velocity):
- Step 1+2: **½ day** (pure config + PRNG tuning).
- Step 3:   **1½ days** (the only system that's actually new).
- Step 4:   **1 day** (careful; mask alignment regressions are easy).
- Step 5:   **1 day**.
- Step 6:   **1 day**.
- Step 7:   **½ day**.

Total: **~5.5 days** for a fully-shipped Act I visual expansion.

---

## 8. Acceptance criteria

A new player who starts a run and plays through stages 1–3 should be
able to answer, without prompting:

1. *"Where am I right now?"* — the water, weather, and scenery should
   tell them "river" vs. "channel" vs. "open sea."
2. *"Is my ship stronger than at the start?"* — the silhouette change
   should read pre-L5, without needing the stat readout.
3. *"What's each of my weapons doing?"* — watching 3 seconds of combat
   should make each equipped weapon's role visually obvious from its
   projectile + muzzle + impact.

If any of those three fail in playtest, the stage visuals aren't
shipping — the weapon curves and enemy AI already do the rest.

---

## 9. Non-goals (explicitly out of scope)

- No changes to weapon balance, enemy HP, damage numbers, or reactions.
- No new enemies, bosses, or boss-intro animations.
- No UI / HUD changes, achievement toasts, or leaderboard work.
- No AI sprite regeneration (existing Gemini sprites stay as-is).
- No Act II / III visual work — deliberately deferred.
- No changes to the water shader's **GLSL-equivalent**; still canvas-baked.

Act II sub-variants + ship tiers 4–5 are reserved for a follow-up doc
(`21-visual-expansion-act-ii.md`) once Act I lands and playtests.
