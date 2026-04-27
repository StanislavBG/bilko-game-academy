# boat-shooter-schema — purpose

Phaser-free type definitions for every piece of *content* in Boat Shooter:
sprites, stages, enemies, weapons, passives, ships, ability maps. Both
the game runtime (`@bilko/boat-shooter`) and the upcoming admin / design
app depend on this; nothing here imports a runtime package.

## Key files
- `src/sprite.ts` — `SpriteManifestEntry`, `SpriteCategory`, `SpriteManifest`.
- `src/stage.ts` — `StageSpec`, `Wave`, `WavePattern`.
- `src/enemy.ts` — `EnemyId` (string-literal union), `EnemySpec`, `EnemyDrops`.
- `src/weapon.ts` — `WeaponId`, `PassiveId`, `WeaponSpec`, `PassiveSpec`, `EvolutionPair`.
- `src/ship.ts` — `ShipId`, `ShipSpec`, `ShipBaselineDelta`.
- `src/ability-map.ts` — `ShipAbilityMap`, `EnemyAbilityMap`, `EnemyAttack`, `AbilityMaps`.
- `src/content-pack.ts` — `ContentPack` (the loader output), `ContentPackOverlay`, `CONTENT_PACK_VERSION`.

## Adding a new content kind
1. Add a new `<kind>.ts` with the `Spec` interface + any literal-union ids.
2. Re-export from `src/index.ts`.
3. Add the corresponding field on `ContentPack`.
4. Bump `CONTENT_PACK_VERSION` if the change is breaking.

## Gotchas
- Keep this package Phaser-free. If a field needs a Phaser type
  (e.g. `BlendMode`), encode it as a string enum instead.
- `EnemyId` / `WeaponId` / `PassiveId` / `ShipId` are string-literal
  unions, not `string`. The runtime + admin both rely on them for
  exhaustiveness checks.
- `LevelCurve` arrays are length-6 by convention (index 0 = "not owned",
  1..5 = owned levels). Loaders should validate.
