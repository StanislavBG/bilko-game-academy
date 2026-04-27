# Boat Shooter — purpose

Top-down vertical-scrolling shmup with Vampire-Survivors weapon stacking. Shipped as a `GameModule` (`@bilko/boat-shooter`) that the shell mounts into a `<div>` via Phaser 3.

## Key files
- `src/index.ts` — module entry. Builds Phaser game, registers every scene, gates fresh runs through the ship picker, persists progress, handles `?stage=` / `?daily=1` / `?weekly=1` / `?godmode=1` / `?speed=N` URL params.
- `src/run-state.ts` — `RunState` is the single mutable source of truth for a campaign run (HP, weapons, passives, coins, gems, XP, evolutions). Emits `RunEvent`s.
- `src/scenes/stage-scene.ts` — main gameplay scene; owns Player + every system below.
- `src/constants.ts` — `WORLD_WIDTH/HEIGHT`, scroll speed, XP curve, safe-area margins, baseline player + combat stats.
- `src/meta.ts` + `src/weekly.ts` + `src/daily.ts` — meta tracks (persistent) and seeded modifier challenges.
- `assets/sprites/` — pre-baked sprite PNGs; runtime-cached by the PWA (see `vite.config.ts`).

## Scene flow
`Boot (index.ts) → ShipPickerScene (fresh runs only) → StageScene + HudScene (parallel)`
On in-stage events:
- level-up → `LevelUpScene` (pauses StageScene, picks card, resumes)
- chest-shop tile → `MerchantScene` (same pause/resume contract)
- shipwright chest at L5 → evolution prompt
- boss kill → `BossSpoilsScene` (in-progress, mirrors LevelUpScene shape)
- stage end → `StageClearScene` → next `StageScene` or `RunSummaryScene`
- death → `GameOverScene` → `PostMortemScene` → home
Pause overlay = `PauseScene`. Combat log overlay = `CombatLogScene`.

## Loadout shapes
- 5 starting ships in `data/starting-ships.ts`: Ember Corsair (fire), Tempest Fury (storm), Frostbound (frost), Verdant Tide (earth), Nightwake (shadow). Each provides starter weapon + passive + stat tweaks + a 9-node skill tree.
- 13 weapons in `weapons/*.ts` — registered via `WEAPON_DEFS` in `weapon-catalog.ts`.
- 8 passives in `weapons/passive-catalog.ts` (with `PASSIVE_TIERS` per-level tables).
- 8 evolutions in `weapons/evolutions.ts` — L5 weapon + paired L5 passive + Shipwright Chest.
- 9 bosses across 15 stages (`data/stages/`); registered through `entities/enemy-system.ts`.

## Adding a new run-affecting feature
1. Add field to `RunState` (and any persisted shape in `index.ts`'s `BoatShooterProgress` if it should survive across runs).
2. Read it from the system that consumes it (battle / collision / pickup / weapon).
3. If player-visible, surface in HUD (`scenes/hud-scene.ts`) or combat log.
4. If save-bearing, bump the `BoatShooterProgress.version` and write a migration in `mount()`'s `ctx.save.load` step.

## Deploy
Built as part of `pnpm -r build`. Output is consumed by the shell — there is no standalone game build. Sprites are excluded from the precache and fetched from `/boat-shooter-sprites/*.png` on demand.

## Gotchas
- Daily runs lock the ship + bypass the picker + submit to `daily-<dateKey>` board. Don't add picker logic without checking `daily`.
- `runState.gems` and `runState.mapFragmentsThisStage` are reset to 0 on `stage-clear` after merge into persistent progress — mid-stage reads must happen before that hook fires.
- Scenes are added with `false` (not auto-start). Only `index.ts` chooses which one boots.
- DPR is clamped to 3 (Phaser internals); procedural texture bakers still read `window.devicePixelRatio` for retina sourcing.
