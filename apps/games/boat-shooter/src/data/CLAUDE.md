# data/ — purpose

Pure-data definitions consumed by systems and scenes. No Phaser imports; safe to import from anywhere. Keep balance and content here so design changes don't touch behavior code.

## Key files
- `stages/index.ts` — `STAGES` array + `stageById(id)`. Exports `STAGE_1..STAGE_15` from sibling files.
- `stages/stage-N.ts` — one `StageSpec` per file: `{ id, title, displayCode, durationSec, waves: Wave[], boss }`.
- `starting-ships.ts` — `SHIP_CONFIGS` (Ember Corsair / Tempest Fury / Frostbound / Verdant Tide / Nightwake), `SHIP_IDS`, `getShipConfig(id)`, `rollRandomShipId()`. Each `ShipConfig` carries hull triad, sail color/emblem, figurehead, lantern, starter weapon+passive, stat tweaks, and a 9-node skill tree.
- `reactions.json` — 13-reaction matrix consumed by `systems/reactions.ts`. Schema: `{ twoWay[], threeWay[], bossDamageScale, perEnemyCooldownMs }`.
- `weapon-cards.ts` — `WEAPON_CARDS` map: per-weapon display element + attack rating + detail line for the `CardView`.
- `passive-cards.ts` — `PASSIVE_CARDS` mirror map: per-passive defense rating + optional attack + detail.

## Key types / contracts
- `StageSpec` (declared in `systems/wave-spawner.ts`) — `{ id, title, displayCode, durationSec, waves, boss }`. `displayCode` is the player-facing label like `1-3`.
- `Wave` — `{ at: seconds, spawn: EnemyType, count, pattern }`. Patterns: `line | cluster | flank-left | flank-right | v-formation | echelon | crossfire | staggered-line | boss`.
- `ShipConfig` — visual + mechanical identity for a starting ship. `statTweaks` is applied at `RunState` construction.
- `WeaponCardMeta` / `PassiveCardMeta` — display-only ratings (1–10). Not the live combat math.
- Reaction shape — `{ id, label, color, requires: StatusId[], consumes: StatusId[], effect: { kind, ... } }`.

## Adding a new stage
1. Create `stages/stage-N.ts` exporting `STAGE_N: StageSpec`.
2. Append the import + push into the `STAGES` array in `stages/index.ts`.
3. Reference an existing `EnemyType` for each wave; new enemies must be registered first (see `entities/CLAUDE.md`).
4. Pick a boss id from the `BOSS_NAMES` list in `wave-spawner.ts` (or register a new boss there).
5. Bump campaign-clear logic if the stage count grows past 15 (currently hardcoded display).

## Adding a new starting ship
1. Add `ShipId` literal to the union in `starting-ships.ts`.
2. Author the `ShipConfig` (don't forget `sailEmblem`, `figurehead`, `statTweaks`, 9 skill nodes).
3. Add to `SHIP_CONFIGS` map and `SHIP_IDS` array.
4. Update `Player.buildDetailedShip` to handle any new emblem/figurehead string.
5. Add the tile to `ship-picker-scene.ts`.

## Adding a new reaction
1. Append to `reactions.json` (`twoWay` or `threeWay`).
2. Add the effect handler kind to `systems/reactions.ts`.
3. If 3-way, ensure its `consumes` set is disjoint from any 2-way you also want to fire.

## Gotchas
- `stageById(id)` accepts both string id and 1-based integer; out-of-range integers are clamped, unknown strings fall back to STAGE_1.
- `displayCode` is player-facing only — never use it as a key.
- `reactions.json` is statically imported — bundlers won't hot-reload schema changes; restart `pnpm dev` after editing.
- `ShipConfig.statTweaks` is *additive* on top of the baselines in `constants.ts`. Don't write absolute values there.
