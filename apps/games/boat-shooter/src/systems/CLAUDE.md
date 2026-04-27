# systems/ — purpose

Stateless / scene-scoped subsystems that the `StageScene` composes. Each system owns one slice of the simulation (combat math, spawning, FX, audio, water, weather, achievements, …).

## Key files
- `battle.ts` — damage math. `rollDamage(state, base, element)`, `damageMultiplier`, `cooldownScalar`, plus per-passive helpers (`cargoNetsCoinBonus`, `admiralsFlagXpBonus`, …). The single place damage is decided.
- `wave-spawner.ts` — `StageSpec` + `Wave` types + the spawner driving the timeline. `BOSS_NAMES` registers boss banners; calls `playBossIntro`.
- `collision.ts` — projectile↔enemy, contact-damage, pickup magnet polling.
- `status.ts` — `StatusId` union (`burn | shock | freeze | wet | poison | …`) and per-enemy `StatusSet`.
- `reactions.ts` — 13-entry reaction matrix (loaded from `data/reactions.json`). 3-way reactions take priority over 2-way; 1.0 s per-enemy CD; bosses take 20% reaction dmg.
- `firing-patterns.ts` — pure helpers for spread/cone/spiral patterns; reused by weapons.
- `merchant.ts` + `evolution-chest.ts` — chest tile spawning, stock generation, evolution prompt logic.
- `fx.ts` — particle system (impact, shockwave, sparkles, water splash, vignette pulses).
- `water-shader.ts` — Phaser shader/material for the river surface; `WaterBiome` controls tint per-stage.
- `weather.ts` — per-biome rain/fog/wind overlays.
- `scenery.ts` — non-collidable parallax props per stage (reeds, lily-pads, fish, debris). Big file (~840 lines): each prop kind has a bake function.
- `sprite-loader.ts` — preload manifest. Extend it when adding any new PNG.
- `ship-compositor.ts` — bakes per-tier (Sloop/Cutter/Flagship) + per-ship hull variants into textures.
- `audio.ts` — procedural WebAudio SFX bank + music loops. Exposes `play(id)` keyed by short strings.
- `achievement-tracker.ts` — observes RunState events + spawn events, emits `achievement` events back through `ctx.events`.
- `combat-log.ts` — ring-buffer of ~100 lines surfaced by `CombatLogScene`.
- `aoe-zone.ts`, `enemy-attack-fx.ts`, `vignette.ts`, `tutorial.ts` — niche overlays / helpers.

## Integration points
- Almost every system takes `StageScene` in its ctor and reads `scene.runState`.
- Damage flow: weapon fires → `WeaponSystem.spawnProjectile` → `CollisionSystem` detects hit → `battle.rollDamage` → `enemy.takeHit` → `StatusSystem` may apply → `ReactionSystem` checks combinations → `FxSystem` emits particles → `CombatLog` logs.
- Pickup flow: enemy dies → drops via `PickupSystem.spawn(...)` → magnet polled per-frame from `runState`-derived radius.

## Adding a new system
1. Create `<name>.ts` exporting a class with `constructor(scene: StageScene)` and `update(deltaMs)` (and `destroy()` if it owns Phaser objects).
2. Construct it in `StageScene.create()` after its dependencies, store on `this`.
3. Tick it from `StageScene.update()` in the right order (input → spawner → AI → weapons → collision → reactions → status → fx → audio).
4. Type the public surface — other systems should call methods, not poke fields.

## Gotchas
- `battle.damageMultiplier` is the canonical buff aggregator. Adding a damage% effect anywhere else risks double-counting.
- `reactions.ts` consumes statuses; the consume order matters — 3-way must run before any 2-way that overlaps.
- `scenery.ts` prop depths must stay between -80 and -60; gameplay sits at depth 0, water at -100. Anything else risks z-fighting.
- `audio.ts` is procedural — adding a new sting means writing a WebAudio recipe, not loading a file.
