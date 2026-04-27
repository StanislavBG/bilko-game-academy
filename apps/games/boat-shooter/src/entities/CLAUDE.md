# entities/ — purpose

Every in-world game object: the Player, the abstract Enemy + concrete enemy/boss subclasses, projectiles, pickups, chests, hazards, decorations, damage numbers.

## Key files
- `enemy.ts` — `Enemy` abstract base. Owns container/body/shadow, status set, hit/death plumbing, contact damage. Subclasses implement movement + fire AI.
- `enemy-system.ts` — `EnemyType` union (every spawnable id) + factory `spawn(type, x, y)` used by `WaveSpawner`. Add a new enemy here.
- `enemies/*.ts` — 18 fodder/standard enemies (scout-skiff, patrol-gunboat, ramming-brigand, mortar-barge, sea-serpent, kraken-tentacle, river-fisher tiers, …).
- `bosses/*.ts` — 9 bosses (frigate-captain, pirate-champion, delta-commodore, pirate-king, ghost-commodore, drowned-admiralty, banshee-galleon, obsidian-warlord, kraken-ancient) plus `boss-banner.ts` + `boss-intro.ts` for the dramatic entrance.
- `player.ts` — composited ship sprite (hull triad + sails + emblem + figurehead + lantern from `ShipConfig`); reads input, drives weapon firing position.
- `projectile.ts` — pooled bullets. `ProjectileStyle` union: `cannonball | broadside-shell | harpoon | musket-ball | lightning-orb`.
- `pickup-system.ts` — coins (S/M/L), gems, XP orbs. Pooled. Magnet pulls based on `runState.magnetRadius` × cargo-nets multiplier.
- `chest.ts` — wave-clear chests + cursed chests; `decorations.ts` — destructible barrels/rocks; `hazards.ts` — driftwood, fishing buoys, treasure crates.
- `damage-number.ts` — pooled floating-text system; pumped by collision/reaction sites.

## Key types / contracts
- `EnemySpec` — declarative stat block: `maxHp`, `armor`, `speed`, `contactDamage`, `collisionRadius`, `drops` table, `element`, `deathStyle`. Subclasses export `*_SPEC` constants.
- `EnemyElement` — `'physical' | 'fire' | 'storm' | 'frost' | 'earth' | 'shadow'`. Drives shot tints + impact FX + death anim.
- `EnemyType` (in `enemy-system.ts`) — string-literal union of every registered enemy id; the spawner only accepts these.
- `ProjectileSpawn` — what `WeaponSystem.spawnProjectile()` consumes.

## Adding a new enemy
1. Create `enemies/<id>.ts` exporting the class (extends `Enemy`) and a `<ID>_SPEC: EnemySpec`.
2. Add the string id to `EnemyType` in `enemy-system.ts` and wire it into the `spawn()` factory `switch`.
3. If it has a sprite, register a load entry in `systems/sprite-loader.ts`.
4. Reference the new id from a stage's `Wave.spawn` in `data/stages/stage-N.ts`.
5. Optional: combat-log label override in `systems/combat-log.ts`; achievement hook in `systems/achievement-tracker.ts`.

## Adding a new boss
Same as enemy plus: register a `BOSS_NAMES` entry in `systems/wave-spawner.ts` so `boss-intro.ts` shows the banner; set `pattern: 'boss'` on the wave that summons it.

## Gotchas
- `Enemy.body` (inner container) holds the sprite — idle bob animates `body`, while AI sets `container.x/y`. Don't bypass that split.
- Pickup coins are sucked toward the player based on `runState` getters (cargo-nets), not a flat radius. Test changes against L0 and L5 cargo-nets.
- Boss intros pause spawning; if you add a boss without `BOSS_NAMES`, the intro is skipped silently.
- River-fisher exports three SPECs from one file (`SKIFF_SPEC`, `TRAWLER_SPEC`, `JUNK_SPEC`) — mirror that layout for tiered enemies.
