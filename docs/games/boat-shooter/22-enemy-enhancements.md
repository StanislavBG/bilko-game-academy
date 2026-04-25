# Enemy Enhancements — Foundation, Abilities, Animations

Scope: rebuild the enemy-facing side of combat so every enemy **reads
its intent**, **telegraphs its attack**, **fires at the player**, and
**dies expressively** — with elemental flair where it fits. Focused on
the Act I roster (stages 1–3) but principles apply to every enemy.

Not in this doc:
- New enemy *types*. We enhance the existing 14.
- Boss reworks — bosses already have bespoke choreography (covered in
  `09-bosses.md`).

Companion docs:
- `08-enemies.md` — current enemy stat/behavior spec.
- `20-visual-expansion-act-i.md` — player-side visual pass.
- `21-starting-ships.md` — elemental framework this doc borrows from.

---

## 1. Audit — where we are

### 1.1 Current rendering

`Enemy` base class auto-swaps in `sprite-<id>.png` when it exists (14 of
14 ship-type enemies have a Gemini-generated sprite), falls back to
`drawVisual()` primitives otherwise. Display size is keyed off
`visualRadius × 4.0`, capped for bosses (`× 3.0`).

Idle bob + shadow counter-bob is already in place
(`entities/enemy.ts:136-157`).

Muzzle-flash hooks now exist (`fx.muzzleFlashMusket`) and are wired
into Scout Skiff (`scout-skiff.ts:82`), Patrol Gunboat
(`patrol-gunboat.ts:77`), and Bank Sniper Tower
(`bank-sniper-tower.ts:110`). **Not** yet wired into Mortar Barge,
Broadside Cutter, Mine-Layer, Powder-Keg Kamikaze, Ghost Ship, Sea
Serpent, Kraken Tentacle, Cursed Swarm, Bank Bandits, Grappling
Boarders.

### 1.2 Current aim model

Most ranged enemies use `leadAimAngle()` which already predicts player
velocity two iterations forward. What's missing is the **visible
telegraph** — the player can't see the enemy "aiming" before the shot
lands.

- **Bank Sniper Tower** — has a red laser telegraph (400 ms before
  fire). ✅ Exemplar.
- **Mortar Barge** — shows a landing-circle telegraph (800 ms). ✅
  Exemplar.
- **Everything else** — fires with no pre-roll. The player can't
  anticipate the shot.

### 1.3 Current death

All enemies route through `Enemy.takeDamage → Enemy.destroy()`. Death
currently does a generic particle burst + coin drop. No element flavor.
No faction flavor.

### 1.4 Current size

Spritesheet display sizes (approximate on-screen, @1× zoom):

| Enemy | visualRadius | display px |
|---|---|---|
| Scout Skiff | 22 | 88 |
| Ramming Brigand | 22 | 88 |
| Patrol Gunboat | 30 | 120 |
| Mortar Barge | 36 | 144 |
| Bank Sniper Tower | 28 | 112 |
| Broadside Cutter | 32 | 128 |
| Powder-Keg Kamikaze | 20 | 80 |

The player's current ship renders at ~140 px. Several enemies are
*smaller* than the player — that's backwards for units called
"Gunboats" and "Barges." Target: every non-fodder enemy ≥ player size.

---

## 2. Principles

Five rules every enhancement must satisfy:

1. **Every shot telegraphed.** A ranged enemy has a visible wind-up
   before a projectile spawns. 250–600 ms depending on shot severity.
2. **Every shot aimed at the player.** Lead-aim + visible indicator
   (laser, reticle, charge-glow) so misses feel earned not random.
3. **Element tells the damage type.** Frost shots are blue, fire shots
   are orange, storm shots are white-cyan. Color + impact VFX match.
4. **Scale reads power.** Heavy enemies are visibly bigger than fodder.
   Mini-bosses dwarf regulars. Size ~= HP ordinal.
5. **Death is expressive.** No generic particle poof — death matches
   *how* the enemy died (shatter for frost, ash for fire, vaporize for
   storm crit, splinter for cannon).

---

## 3. Elemental attack palette

Reusable per-element kit for any enemy, boss, hazard, or mod. Each
element has 3 slots: **charge-up tell**, **projectile body**, **impact
VFX**. Implemented once in a new `systems/enemy-attack-fx.ts`; enemies
opt in by declaring their damage element on the spec.

| Element | Charge-up tell (pre-fire) | Projectile body | Impact VFX |
|---|---|---|---|
| **Physical** (default) | Brief 120 ms white flash at muzzle | 4 px grey dot with dark stroke | Splinter-burst + small smoke puff |
| **Fire** 🔥 | 350 ms ember-cone swell with soft glow | 6 px orange core + red outer halo, soft trail | Burn patch (2 s) + rising smoke ring |
| **Storm** ⚡ | 300 ms white-cyan arc building between cannons | 5 px bright core + flickering halo, ADD blend | Branching mini-zigzag to ground + ozone puff |
| **Frost** ❄ | 400 ms frost mist swell around the muzzle | 5 px pale cyan crystal-shape + ice trail | Freeze splinter ring + ice dust |
| **Earth/Shrapnel** 🌿 | 300 ms tremble on the enemy + dust cloud | 5 px brown rock + irregular trail | Shard ring + 3 scattering debris chips |
| **Shadow** 🌑 | 500 ms purple void pulse at muzzle | 5 px dark sphere + cyan ghost-wisp trail | Fading wraith + skull flicker |

Per-enemy element assignments (Act I starting set):

- Scout Skiff → Physical.
- Ramming Brigand → Physical (melee).
- Patrol Gunboat → Physical (but see §5.1 — get a Storm variant!).
- Mortar Barge → Fire (heavy flaming mortar shells).
- Bank Sniper Tower → Physical (precise rifle).
- Broadside Cutter → Physical.
- Powder-Keg Kamikaze → Fire (self-detonates in a burning ring).
- Ghost Ship → Shadow.
- Sea Serpent → Physical + bite-on-contact Poison.
- Cursed Swarm → Shadow.
- Kraken Tentacle → Physical (slam hazard zone).

Variants are signaled by a small **icon badge** baked onto the enemy's
sprite rim (🔥 ring, ⚡ spark, ❄ crystal) — ~1/10th of the sprite area,
positioned stern-side so it doesn't clutter the body read.

---

## 4. Scale-up pass

Increase the sprite-display multiplier and the shadow/rim to match.
Rebalance so the silhouette hierarchy reads at a glance.

| Enemy | Current display | **Proposed display** | Why |
|---|---|---|---|
| Scout Skiff | 88 | **96** | Fodder; stays small. |
| Ramming Brigand | 88 | **104** | Should read as "threatening melee." |
| Powder-Keg Kamikaze | 80 | **92** | Kamikazes are small + desperate. |
| Cursed Swarm | — | **72** | Smallest on-screen; it's a swarm. |
| Patrol Gunboat | 120 | **156** | Now clearly bigger than player sloop. |
| Broadside Cutter | 128 | **164** | A multi-gun ship should dominate its tile. |
| Mortar Barge | 144 | **192** | Slow, heavy, imposing. |
| Bank Sniper Tower | 112 | **140** | Tower should be imposing from shore. |
| Mine-Layer | 128 | **168** | Ugly industrial heft. |
| Bank Bandits | 120 | **152** | Hideout. |
| Grappling Boarders | 96 | **108** | Small longboat. |
| Ghost Ship | 128 | **160** | Ghostly BUT looming. |
| Sea Serpent | 160 | **208** | Serpent body is physically long. |
| Kraken Tentacle | 160 | **216** | Tentacles should fill a lane. |

Implementation: change `scaleMult` in `entities/enemy.ts:101` from
`maxHp >= 60 ? 3.0 : 4.0` to a **3-tier** curve that reads the new
`EnemySpec.spriteScale` field (default 5.0 for "standard," 4.0 for
fodder, 6.0 for heavy, 3.5 for boss — bosses have their own bigger
textures so the multiplier is lower).

Collision radii **do not** change. We're enlarging the visual
presence, not the hitbox. Keeps the combat balance intact while the
stage feels way more populated.

---

## 5. Per-enemy redesign

Each section below lists: **new scale**, **ability kit**, **firing
animation** (3 phases), **damage flinch**, **death**, **element
variant** (if any).

### 5.1 Scout Skiff — the fodder

**Scale:** 96 px. **HP unchanged.**

**Ability kit.**
- *Primary — Hasty Volley.* Fires 3-bullet spread every 2.4–3.2 s.
  Lead-aimed. Already implemented; tell is new.
- *Secondary (variant) — Signal Flare.* On death, 30% of skiffs drop
  a 0.8 s red flare that alerts other enemies within 300 px to fire
  simultaneously within 0.5 s. Turns a single-skiff wipe into a
  mini-skill moment.

**Firing animation.**
1. **Tell (180 ms):** small white flash pulses at the skiff's bow
   port. Skiff nudges 4 px away from the player (aiming body English).
2. **Wind (80 ms):** two tiny spark particles eject forward ("priming
   the match").
3. **Fire (frame):** 3 bullets spawn from the bow port. Existing
   musket muzzle flash fires here. Skiff recoils -3 px backward.

**Damage flinch.** Red tint 90 ms + 4 px push backward.

**Death.** "Splinter pop" — 8 brown rectangular debris + 1 sail scrap
tumbling + splash ring. Lasts 420 ms before cleanup.

**Variant.** *Red Skiff* — 20% spawn rate (Stage 3 only). Physical →
**Storm** reflavoring: silver hull, lightning-marked sail, bullets are
zappy cyan, hit inflicts Wet (0.5 s). No gameplay rebalance; pure
elemental flavor gate.

### 5.2 Ramming Brigand — the melee threat

**Scale:** 104 px.

**Ability kit.**
- *Primary — Ram Charge.* Already implemented (locks vector for
  ~1 s, retreats). Telegraph is new.
- *Secondary — Spike-Grind.* On charge-contact with the player, leaves
  a 1 s oil slick behind its tail (60 px, slow).

**Charge animation.**
1. **Tell (400 ms):** red crosshair segment draws from Brigand's prow
   to the player's current position + 0.3 s of predicted velocity. The
   Brigand rocks rear-down ("crouch before pounce").
2. **Wind (150 ms):** prow-spike glows orange, tail raises, dust puff.
3. **Charge:** locked-direction dash at 1.5× speed (unchanged), spark
   particles streaming behind.

**Damage flinch.** Red tint 120 ms + brief 5° angular wobble.

**Death.** "Splinter bomb" — dark-wood plank shards fly outward on a
wider cone than the skiff's pop; the spike pinwheels off. 600 ms.

### 5.3 Patrol Gunboat — the ranged backbone

**Scale:** 156 px. Clearly bigger than the player.

**Ability kit.**
- *Primary — 5-Bullet Fan.* Every 2.0 s, 30° wedge. Already
  implemented.
- *Secondary — Broadside Sweep.* Every **third** fan, fires from both
  flanks simultaneously (10 bullets total, 2×5°-offset wedges). Gates
  behind a 500 ms telegraph so the player sees it coming.

**Firing animation.**
1. **Tell (380 ms):** both side-cannon ports glow a slowly-brightening
   white-orange. A faint dashed-line indicator shows where the center
   bullet will go (short, 60 px).
2. **Wind (90 ms):** cannons visibly retract 4 px ("loading").
3. **Fire (frame):** 5-bullet fan spawns, muzzle flash, gunboat
   recoils 5 px backward, gunpowder smoke wall drifts sideways.

**Damage flinch.** Red tint 120 ms + 6 px pushback.

**Death.** "Magazine cookoff" — 600 ms staggered 3-explosion chain
walking from bow to stern, each leaving a smoke plume. Final
explosion is 2× larger. Player gets a brief ducking-moment if they're
within 120 px.

**Variant.** *Tempest Gunboat* — Stage 3 reward. Storm element. Hull
silver-blue; fan-bullets are lightning orbs; impact applies Wet 0.5 s.
Has a special Secondary: every 4th fan is 5 **chain-lightning** shots
that arc to the player at half speed but pierce armor.

### 5.4 Mortar Barge — the area-denial heavy

**Scale:** 192 px. The biggest regular enemy in Act I.

**Ability kit.**
- *Primary — Mortar Arc.* Already implemented with 800 ms landing
  telegraph; fire element.
- *Secondary — Incendiary Rain.* Every 6 s (layered on the primary),
  drops 3 mini-mortars in a triangle formation around a lead position,
  each with its own 600 ms telegraph. Bigger threat when the player
  hugs one corner.
- *Unique — Barge Bombard.* HP below 40% → Mortar fires in pairs, same
  predicted position but offset by 60 px so one shell hits even if the
  player dodges.

**Firing animation.**
1. **Tell (700 ms):** mortar tube tilts toward the aim arc, an orange
   glow fills the barrel, a wisp of smoke rises.
2. **Wind (200 ms):** the tube pulses; an orange "+X" cue flashes at
   the predicted landing zone (telegraph already exists — we reuse it).
3. **Fire (frame):** tube pivots vertical, shell puff leaves muzzle,
   shell arcs visible (new: draw a 600 ms parabolic trajectory in
   faint orange so the player can *see* the shell in flight, not just
   the landing ring).

**Damage flinch.** Red tint + tube jitter (shakes for 150 ms).

**Death.** "Mortar cookoff" — 800 ms: tube topples forward, HULL
explosion ring (80 px, 3 dmg if player is inside), smoke column
persists 2 s as a cosmetic marker.

**Variant.** *Frost Barge* — Stage 9 cameo. Frost element. Shells
explode into ice patches (3 s, 40% slow).

### 5.5 Bank Sniper Tower — the precision threat

**Scale:** 140 px (unchanged scale multiplier but the spec gets a
dedicated badge).

**Ability kit.**
- *Primary — Aimed Rifle Shot.* 400 ms laser telegraph → shot.
  Already implemented. ✅
- *Secondary — Stickler.* Every 4th shot is "stuck" — telegraph lasts
  1.0 s but the shot deals 3 dmg instead of 2. Rewards patient dodging.
- *Defense — Duck.* Random 0.5% per tick. Already implemented.

**Firing animation.** Laser is the tell. We add:
- *Pre-laser charge* (120 ms): a small red dot appears at the rifle
  muzzle before the laser line extends.
- *Fire recoil:* the tower's roof dips -4 px, smoke puff.

**Damage flinch.** Wood-chip particle burst on hit (different from
ship damage).

**Death.** "Tower collapse" — top slab falls forward 90° with a
creaking audio cue; base crumbles 400 ms later. Smoke column.

### 5.6 Broadside Cutter — the pirate flank-gunner

**Scale:** 164 px.

**Ability kit.**
- *Primary — Alternating Broadside.* Every 2.5 s fires 3 bullets from
  ONE flank at a time, alternating sides. Player's side depends on
  which flank is facing. Lead-aimed.
- *Secondary — Grapeshot Barrage.* HP below 50% → the next primary
  becomes 6 bullets in a random scatter (pain zone for close play).

**Firing animation.**
1. **Tell (300 ms):** the firing flank's 3 cannon ports glow orange;
   small sparks drip.
2. **Wind (80 ms):** cannons recoil into their ports ("loading").
3. **Fire:** bullets spawn, port muzzle flashes, stomach-shake on the
   hull (local tween, no camera).

**Damage flinch.** Red tint + 8 px rotational wobble (it's a
weathered cutter, so it jiggles).

**Death.** "Powder detonation" — both flanks chain-explode outward in
succession, ending on a central mast-drop.

### 5.7 Powder-Keg Kamikaze — the suicide bomber

**Scale:** 92 px.

**Ability kit.**
- *Primary — Pursue.* Moves toward the player continuously.
- *Unique — Detonate.* On contact OR when HP hits 0, explodes in a
  120 px ring for 4 dmg.

**Detonation animation.**
1. **Tell (700 ms):** fuse at the top sparks faster and faster, a
   red ring pulses under the keg (player can see exactly the blast
   radius before it detonates — skill-expressive).
2. **Wind (120 ms):** keg compresses vertically, fuse goes white-hot.
3. **Fire:** full 120 px explosion, big orange flash, 2× reduced-motion
   screen shake, 10 embers raining outward.

**Damage flinch.** Red tint + flash-accelerates the fuse tell.

**Death.** Always detonation — no separate death state. Cleaner.

### 5.8 Ghost Ship — the shadow harasser

**Scale:** 160 px. Already has a ghostly Gemini sprite with alpha 0.78.

**Ability kit.**
- *Primary — Phantom Volley.* Fires 3 slow, curving shadow-bullets
  that home weakly toward the player for 1.2 s, then straight.
- *Secondary — Phase Through.* Ghost Ships are **invulnerable** for
  0.4 s every 4 s while they "phase" (sprite alpha dips to 0.3, no
  shadow). Player must time shots.

**Firing animation.**
1. **Tell (500 ms):** purple void pulse at the deck; 3 wisps rise
   from the hull and coalesce forward.
2. **Wind (120 ms):** wisps condense into shadow spheres.
3. **Fire:** 3 shadow-bullets launch with cyan wisp trails.

**Damage flinch.** Brief alpha flicker instead of tint — ghosts don't
bleed red, they dissipate a bit.

**Death.** "Soul release" — the hull fades to pure silhouette, then
a 6-wisp upward burst carries the soul off-screen over 800 ms.
Doubles as a visual treasure map — wisps trail toward the nearest
unclaimed coin drop.

### 5.9 Sea Serpent — the lane-controller

**Scale:** 208 px. Long, not tall.

**Ability kit.**
- *Primary — Sinuous Advance.* Moves in a sine-wave path, takes up
  a full lane width.
- *Unique — Venom Bite.* On contact, applies Poison (3 dmg/s for 4 s,
  no iframes against the DoT).
- *Secondary — Scale Spit.* Every 3 s, spits 3 green venom blobs
  forward (lead-aimed).

**Firing animation.**
1. **Tell (250 ms):** jaw opens, green glow in the throat, tongue
   flickers out.
2. **Wind (80 ms):** head rears back ~6 px.
3. **Fire:** jaw snaps forward; 3 green blobs launch with dripping
   trails.

**Damage flinch.** Tint toward green (poison splash back on self),
150 ms, + body S-curve spasm.

**Death.** "Serpent collapse" — segment-by-segment body splash from
head to tail, 900 ms. Each segment drops a tiny green coin (visual
only; coin drops are per-enemy, not per-segment).

### 5.10 Kraken Tentacle — the arena hazard

**Scale:** 216 px. Fills a lane.

**Ability kit.**
- *Primary — Emerge.* Grows out of the water over 600 ms with a
  telegraphed ring (player sees where it's coming up).
- *Primary — Slam.* Tentacle sweeps to target the player's predicted
  position over 800 ms.
- *Secondary — Sucker Grab.* Tentacle end-circle lingers after the
  slam for 1.5 s; if the player is standing on it when it retracts,
  they're yanked 80 px toward the tentacle's origin.

**Animation.**
1. **Tell (600 ms):** ripple + rising bubbles at the emerge site, then
   the tentacle tip lifts above the water.
2. **Wind (200 ms):** tentacle rears back, water cascades off.
3. **Slam:** 800 ms arcing motion to the predicted target, crashing
   splash on contact.

**Damage flinch.** Ripple outward from hit point along the tentacle's
length. No tint (not a ship).

**Death.** "Tentacle retract" — the tentacle whips back into the water
over 400 ms, leaving a turbulence ring and 3 sucker-prints on the
surface (cosmetic, 1 s).

### 5.11 Cursed Swarm — the pressure element

**Scale:** 72 px each (per swarm mote), packs spawn in groups of 8–10.

**Ability kit.**
- *Primary — Pursue + Devour.* Swarm flows toward the player like a
  fluid; on contact, each mote deals 0.5 dmg and dies.
- *Secondary — Regen.* Every 3 s, 1 mote reconstitutes from ambient
  shadow if fewer than 3 motes remain in a swarm (up to the starting
  count). Makes the swarm an attrition check.

**Animation.** Pure swim: 2-frame flicker of each mote, tail-whip
particles. Death = mote shrinks and fades with a cyan wisp.

### 5.12 Bank Bandits — the ambush shore

**Scale:** 152 px.

**Ability kit.**
- *Primary — Shore Volley.* Two bandits take turns firing aimed
  rifles at the player. Each shot is high damage (3 dmg) but slow
  (every 1.5 s, alternating bandit).
- *Secondary — Whistle.* At HP ≤ 50%, whistles in a bonus Brigand
  wave once per bandit-spawn.

**Firing animation.** Same structure as Sniper Tower, but two side-by-
side muzzles taking turns.

### 5.13 Grappling Boarders — the drag threat

**Scale:** 108 px.

**Ability kit.**
- *Primary — Grapple.* Fires a hook that sticks to the player if it
  lands (600 ms telegraph line, 800 ms flight). If attached, tugs the
  player 80 px toward the Boarder over 1 s — disruptive, not
  damaging.
- *Secondary — Cut the rope.* Player can shoot the grapple line to
  sever it (line has 2 HP). Rewarding skill play.

**Firing animation.** Rope line telegraphs the grapple's flight path
for the full 600 ms, then the hook flies. Telegraph is a dashed line.

**Death.** Plank-break splash — boaters fall off, then the boat
splinters.

### 5.14 Mine-Layer — the drop-behind

**Scale:** 168 px.

**Ability kit.**
- *Primary — Drop Mines.* Every 2 s, drops a 60 px mine behind its
  stern. Mines float for 8 s, then detonate.
- *Secondary — Distress Dash.* At HP ≤ 40%, speed +50% and mine-drop
  interval halves.

**Firing animation.**
1. **Tell (150 ms):** stern ramp lowers slightly, a yellow light
   flashes.
2. **Drop:** mine slides off with a small splash.

**Death.** All dropped mines that haven't detonated **do detonate
instantly** in a chain (with a 80 ms cascade) — rewards sinking the
Layer before its mine field is built up.

---

## 6. Universal enhancements

Applied once in `Enemy` base, benefit every subclass:

### 6.1 Aim reticle
When any enemy begins a "tell" phase, optionally draw a 2-stage aim
reticle at the lead-aim point:

- **Stage A (half the tell duration):** faint dashed ring.
- **Stage B (remainder):** solid thin ring + crosshair.

Controlled by `EnemySpec.showAimReticle: boolean`. Default **off** for
fodder, **on** for Gunboat / Mortar Barge / Sniper / Ghost Ship /
Kraken Tentacle.

### 6.2 Damage flinch baseline
Every `takeDamage` gets:
- Red tint 0xff5050 for 100 ms (already partially implemented).
- 2 px pushback away from the hit vector.
- If the damage ≥ 20% of maxHp in one hit: **1 px rotational wobble
  for 200 ms** to sell the impact.

Exception: ghost-element enemies use alpha-flicker instead of red
tint.

### 6.3 Death-by-element
Route death through a switch on the **last damage type**:

- Physical → existing splinter-pop.
- Fire → burn-to-ash: sprite turns black for 80 ms, then crumbles into
  400 ms of rising ash flakes.
- Storm → vaporize: sprite fades to white for 60 ms, then a radial
  spark burst with a residual scorch disc on the water.
- Frost → shatter-ring: sprite stretches +20% briefly, then bursts
  into 12 triangular ice shards radiating outward; crackle SFX.
- Earth/shrapnel → granulate: sprite shakes once, then fragments into
  8 rocky pieces that fall below the water plane.
- Shadow → soul-release: sprite fades to pure cyan silhouette, then a
  6-wisp upward burst (already specified for Ghost Ship; generalizes).

Kill attribution runs on a small `lastHitElement` field written by
the projectile system on `takeDamage`.

### 6.4 Formation fire
When multiple enemies of the same type are on-screen and in a shared
wave formation (`wave.pattern === 'v-formation' | 'line'`), their fire
timers **align within ±100 ms** after the first member fires. Makes a
V-formation feel like a squad, not 5 individuals.

Add a lightweight `formation.ts` system: a wave registers itself, each
member reports its fire readiness, the system emits a shared "fire
now" tick to all members when the leader pulls first.

### 6.5 Spawn tell
Expand the existing pop-in (`entities/enemy.ts:122`) to a **directional
spawn** — the enemy slides in from its spawn edge over 400 ms with a
wake trail, rather than teleporting in with a scale pop. Sells "a boat
is coming around the river bend," not "an enemy appeared."

---

## 7. Ability roster — one-page quick-reference

| Enemy | Primary | Secondary / Unique | Element | Scale | New? |
|---|---|---|---|---|---|
| Scout Skiff | Hasty Volley | Signal Flare (on death) | Physical | 96 | flare |
| Ramming Brigand | Ram Charge | Spike-Grind oil slick | Physical | 104 | oil |
| Patrol Gunboat | 5-Bullet Fan | Broadside Sweep (every 3rd) | Physical | 156 | sweep |
| Tempest Gunboat (v) | Chain Fan | Lightning Orb salvo | Storm | 156 | full |
| Mortar Barge | Mortar Arc | Incendiary Rain + Barge Bombard | Fire | 192 | both |
| Frost Barge (v) | Frost Mortar | Ice-patch Rain | Frost | 192 | full |
| Bank Sniper Tower | Aimed Rifle | Stickler + Duck | Physical | 140 | stickler |
| Broadside Cutter | Alt. Broadside | Grapeshot Barrage | Physical | 164 | grape |
| Powder-Keg Kamikaze | Pursue | Detonate (explicit) | Fire | 92 | — |
| Ghost Ship | Phantom Volley | Phase Through | Shadow | 160 | phase |
| Sea Serpent | Sinuous Advance | Venom Bite + Scale Spit | Physical+Poison | 208 | spit |
| Kraken Tentacle | Emerge + Slam | Sucker Grab (yank) | Physical | 216 | grab |
| Cursed Swarm | Pursue + Devour | Regen | Shadow | 72 | regen |
| Bank Bandits | Shore Volley | Whistle wave summon | Physical | 152 | whistle |
| Grappling Boarders | Grapple | Cut-the-rope | Physical | 108 | cut |
| Mine-Layer | Drop Mines | Distress Dash | Physical | 168 | dash |

**"New?"** marks abilities not yet in code.

---

## 8. Execution sequence

Steps 1 → 3 are the foundation; 4 → 6 apply the new ability kits on
top. Safe to ship 1–3 without the secondaries and still feel the
improvement.

```
1. Foundation pass  (unlocks everything else)
   1a. Add EnemySpec.element: 'physical'|'fire'|'storm'|'frost'|'earth'|'shadow'
       (default 'physical'). Plumbs to bullet color + impact FX.
   1b. Add EnemySpec.spriteScale: number (default 5.0).
       Replace the 3.0/4.0 heuristic in enemy.ts with this field.
   1c. Add EnemySpec.showAimReticle: boolean.
   1d. Wire lastHitElement on Enemy, set by projectile/weapon on hit.

2. Universal animations
   2a. systems/enemy-attack-fx.ts — central palette for each element's
       charge-up / projectile-body / impact triad.
   2b. Reticle renderer in `Enemy.beginAttackTell(duration, leadPoint)`.
   2c. Directional spawn-in (enemy.ts line ~122).
   2d. Damage flinch baseline (red tint + 2 px pushback + wobble).
   2e. Death-by-element switch in `Enemy.destroy`.

3. Per-enemy fire-phase retrofit
   For each ranged enemy, split current fire() into:
     - beginFireTell(duration, leadPoint)  → starts telegraphs
     - onWind()                            → sets local visuals (cannon recoil etc.)
     - onFire()                            → spawns projectiles + SFX
   Existing Mortar Barge + Sniper Tower already follow this pattern.

4. Secondary abilities (first three are the high-impact ones)
   4a. Patrol Gunboat "Broadside Sweep" (every 3rd fan).
   4b. Mortar Barge "Incendiary Rain" + "Barge Bombard" phase.
   4c. Scout Skiff "Signal Flare" death effect.
   (then Bank Sniper Stickler, Cutter Grapeshot, Kamikaze explicit fuse ring,
    Ghost Ship Phase-Through, Sea Serpent Venom Spit, etc.)

5. Elemental variants (ship Stage 3+)
   5a. Tempest Gunboat — Storm reskin + chain-lightning secondary.
   5b. Frost Barge     — Frost reskin (Act II cameo).
   5c. Red Skiff      — Storm-lite reskin.

6. Formation fire system (systems/formation.ts)
   V-formation and line waves fire together once leader pulls first.

Acceptance: playthrough stages 1→3 with godmode off.
  - Can you name every enemy's element from its color/badge?
  - Does every ranged shot have a visible tell?
  - Does every enemy look bigger than it did?
  - Does each death feel different from the one next to it?
If yes to all four, we ship.
```

Estimated effort (solo, senior pace):
- Step 1: **½ day** (data plumbing).
- Step 2: **1½ days** (new FX system + reticle + death variants).
- Step 3: **1 day** (retrofit 10 enemies through the phase split).
- Step 4: **1½ days** (6 new secondary abilities).
- Step 5: **½ day** (pure reskin + stat tag).
- Step 6: **½ day** (formation bookkeeping is light).

Total: **~5.5 days** for the full enhancement pass.

---

## 9. Non-goals

- No new enemy types. We enhance the 14 existing.
- No boss behavior changes (bosses own their choreography).
- No HP rebalance. Difficulty stays; what changes is *readability*.
- No AI overhaul — enemies still follow their current movement AI,
  just with richer tells and richer death.
- No multiplayer — none of this assumes a coop context.

---

## 10. Open questions

1. **Element-damage-to-player mapping.** Should a Fire-mortar hit
   apply Burn on the player (currently stacks only against enemies)?
   If yes, we need a small player-side status system — worth it for
   readability parity?
2. **Aim reticle vs. screen clutter.** Is a reticle on *every* ranged
   enemy too busy in Stage 2+ when 6 enemies fire at once? Possible
   mitigation: show reticles only for *heavy* enemies (Mortar, Sniper,
   Gunboat-Sweep, Ghost Phantom Volley). Fodder stays tell-only.
3. **Variant spawn rate tuning.** 20% for Red Skiff is a guess; needs
   playtest to see whether Storm reflavoring feels special or
   overwhelming.
4. **Death-by-element on physical-typed player weapons.** Default case
   is "splinter-pop," but should crits gain a slight vaporize effect
   regardless of element? (Might be worth a small polish branch.)
