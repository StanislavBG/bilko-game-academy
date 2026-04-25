# Player Ship — stats, damage model, cosmetics

## HP model

- **Discrete HP bar.** Base **6 HP**, max (via Hull meta) **17 HP** (at
  Hull L10 including regen milestone).
- Each normal enemy hit = 1 HP; heavy/boss hit = 2 HP.
- **Iframes on hit: 0.9 s** (generous, per earlier decision).
- HP bar rendered as 6–17 "planks" on hull; visible damage state ties to plank count.

## Run-scaling model

**Hybrid.** Both systems stack in every run:

- **XP level-ups.** Kills drop XP orbs; XP fills a bar; on level-up,
  brief pause + **3 picks** (new weapon / passive / stat boost / heal).
  Target 3–5 level-ups per stage.
- **Mid-run pickup buffs.** Grabbed without pausing. Dropped from barrels,
  chests, some enemies.
- **Scaling rule:** passives grant percentages (×), XP picks grant flat (+).
  Passives stack multiplicatively with each other and with base stats.

## Stat axes (all in v1)

**Core (mobility + survival):**
- `maxHP` (6 → 17), `speed` (280 px/s → ~383 with Engine), `acceleration`
  (1200 → 1390), `turnRate` (instant — top-down direct).
- `iframeDuration` (0.9 s baseline).

**Offense:**
- `baseDamage` (1 per projectile, scaled by Cannons meta).
- `fireRate` (3.0 shots/s baseline).
- `projectileCount` (per-weapon; some weapons gain +1 from Crew).
- `projectileSpeed` (800 px/s baseline).
- `critChance` (10% base, **uncapped**).
- `critMultiplier` (1.5× base, **uncapped**).
- `pierceCount` (per-weapon; Cannons meta adds to Bow Cannon).

**Utility:**
- `magnetRadius` (100 px base).
- `coinValueMult` (1.0× base).
- `luck` (0 base; affects drop tables and chest upgrades).
- `cooldownReduction` (0% base, **uncapped**).

## Baseline numeric values (locked — "Brisk arcade")

| Stat | Base |
|------|------|
| Fire rate | 3.0 shots/s |
| Projectile speed | 800 px/s |
| Boat speed | 280 px/s |
| Accel | 1200 px/s² |
| Base damage | 1/projectile |
| Crit | 10% @ 1.5× |
| Iframes | 0.9 s |
| XP per kill | 1–3 (by tier) |
| Level-up cadence | ~every 25 kills early |

## Caps

- **Crit chance: UNCAPPED.** (Overflow at 100%+ enables guaranteed crits
  with possible "super crit" tier — design TBD but reserved.)
- **Cooldown reduction: UNCAPPED.**
- **Crit bypasses armor** fully.
- **Per-weapon projectile count caps** (most weapons hard-cap at 8
  projectiles for legibility + GPU budget).

**⚠ Design risk:** the uncapped scaling + crit-bypass-armor enables
degenerate one-shot builds by Act III. Mitigations: aggressive enemy HP
scaling in Act III and NG+, and making the enabling builds *hard to
assemble* (gated on specific weapon+passive combinations).

## XP orbs

- Auto-magnet at short range; no time-out.
- Never lost unless scrolled off the bottom of the screen (and even then,
  Cargo Nets L5 rescues them).

## Damage state

- HP bar is visible on the boat's hull (plank ticks).
- At HP ≤ 50%: hull cracks start appearing (particle VFX).
- At HP ≤ 25%: sails tear, smoke trail starts.
- At HP = 1: flashing red warning border, low-HP heart-beat audio layer.

## Cosmetics (purchasable with Gems)

- **Hull paint** — 12 variants (oak, ebony, crimson, gold, obsidian, etc.).
- **Sails** — 12 emblems (skull, kraken, rose, compass, etc.).
- **Figurehead** — 12 carvings (mermaid, dragon, skull, eagle, parrot, …).
- **Wake color** — 6 (white, gold, green bioluminescence, red, blue, rainbow).
- **Muzzle flash color** — 6 (yellow, gold, green, purple, cyan, white).

Cosmetics purely visual; no stat impact.

## Meta track → stat axes map

| Meta track | Primary axis | Secondary axis | Milestone perks |
|------------|-------------|----------------|-----------------|
| Hull | maxHP | — | L10 passive regen |
| Engine | speed, accel | — | L10 Burst Dash |
| Cannons | baseDamage, fireRate | pierce (Bow Cannon) | L10 random starting passive |
| Crew | critChance, critMult | +1 projectile on specific weapons | L10 +1 proj ALL projectile weapons |
| Cargo | magnetRadius, coinValueMult | — | L5 free map frag/run, L10 +1 gem/stage |
| Luck | luck | — | L4/L7/L10 chest upgrade milestones |
| Reroll | reroll cost/quality/frequency | — | L10 BANISH (remove options from pool) |

See `14-meta-progression.md` for full per-level tables.
