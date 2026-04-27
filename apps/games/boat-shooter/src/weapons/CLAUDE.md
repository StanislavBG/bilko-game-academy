# weapons/ — purpose

Active weapons, passive perks, and weapon evolutions. Every active fire pattern lives here; damage math + element resolution lives in `systems/battle.ts`.

## Key files
- `weapon.ts` — abstract `Weapon` base + `WeaponDefinition` factory shape. `withCDR()` helper applies global cooldown reduction.
- `weapon-catalog.ts` — `WEAPON_DEFS` registry. The single place a new weapon must register to be pickable.
- `weapon-system.ts` — owns the active `Weapon` instances + projectile pool + per-frame `update()`.
- `passive-catalog.ts` — `PASSIVE_DEFS` (8 entries) + `PASSIVE_TIERS` (per-level effect tables, indexed `[0..5]`).
- `evolutions.ts` — `EVOLUTIONS` array: 8 entries pairing source weapon × required passive → evolved id (P3 MVP applies a ×3 dmg multiplier + rename).
- `evolved-behaviors.ts` — bespoke fire-pattern overrides for evolved weapons.

## The 13 weapons
`bow-cannon`, `broadside`, `harpoon`, `chain-lightning`, `flamethrower`, `lighthouse-beam`, `mortar`, `fire-arrow-rain`, `kraken-ink`, `spinning-axes`, `homing-musket`, `stern-mines`, `ghost-crew`.

## The 8 passives
`crows-nest` (universal dmg), `copper-hull` (dmg taken / iframes), `storm-compass` (lightning + chains), `powder-barrel` (explosive + radius), `first-mate` (CDR), `cargo-nets` (magnet + coin value), `spyglass` (crit chance + mult), `admirals-flag` (XP + reroll discount). Each has a 5-step level curve in `PASSIVE_TIERS`.

## The 8 evolutions
`cannonade-supreme` (bow-cannon × powder-barrel), `thunderclap-broadside` (broadside × first-mate), `tempest-cannonade` (chain-lightning × storm-compass), `inferno-breath` (flamethrower × crows-nest), `sawblade-fortress` (spinning-axes × copper-hull), `leviathan-ink` (kraken-ink × spyglass), `minefield` (stern-mines × cargo-nets), `ghost-armada` (ghost-crew × admirals-flag).

## Key types / contracts
- `WeaponDefinition` — `{ id, displayName, taglineShort, create(scene): Weapon }`.
- `Weapon.update(deltaMs)` — called every frame; the weapon decides when to fire.
- `Weapon.level()` — protected helper; reads `runState.weaponLevel(this.id)` (1..5, 0 = not held).
- `PassiveDefinition` — display-only metadata; mechanical effects live in `PASSIVE_TIERS` and are read by `systems/battle.ts`.

## Adding a new weapon
1. Create `<id>.ts` exporting a class extending `Weapon`. Implement `update(deltaMs)`. Use `this.withCDR(baseMs)` for cooldown.
2. Spawn projectiles via `this.scene.weapons.spawnProjectile(...)` — don't construct directly.
3. Register in `WEAPON_DEFS` (`weapon-catalog.ts`).
4. Add display metadata in `data/weapon-cards.ts` (element, attack rating, detail).
5. If evolvable, add an entry to `EVOLUTIONS` and (optionally) a behavior override in `evolved-behaviors.ts`.
6. If it has a sprite icon, preload via `systems/sprite-loader.ts`.

## Adding a new passive
1. Add a `PassiveDefinition` to `PASSIVE_DEFS`.
2. Add a per-level table to `PASSIVE_TIERS` keyed by the same id.
3. Read it from the consumer system (`battle.ts` for damage; `pickup-system.ts` for magnet/coin; `weapon.ts` `withCDR` for cooldown).
4. Add display metadata in `data/passive-cards.ts`.

## Gotchas
- Damage element strings used by `battle.ts` are `'none' | 'lightning' | 'explosive' | 'fire'` — different from `EnemyElement` (which has `physical/storm/frost/earth/shadow`). Don't conflate.
- Crit chance is uncapped on purpose (design doc §4.1). Spyglass adds linearly.
- Weapon level 0 means "not held" — guard reads against that before applying upgrades.
