/**
 * ContentPack — the single object both the game runtime and the admin app
 * consume. The runtime loads the default pack from
 * `@bilko/boat-shooter-content`; the admin app may overlay edits on top.
 *
 * Pack version is bumped when an incompatible field rename / removal lands.
 * Loaders should `assert` the version and refuse to run otherwise.
 */
import type { SpriteManifest } from './sprite';
import type { StageSpec } from './stage';
import type { EnemySpec } from './enemy';
import type { WeaponSpec, PassiveSpec } from './weapon';
import type { ShipSpec } from './ship';
import type { EnvironmentSpec } from './environment';
import type { AbilityMaps } from './ability-map';

export const CONTENT_PACK_VERSION = 1 as const;

export interface ContentPack {
  version: typeof CONTENT_PACK_VERSION;
  sprites: SpriteManifest;
  stages: ReadonlyArray<StageSpec>;
  environments: ReadonlyArray<EnvironmentSpec>;
  enemies: ReadonlyArray<EnemySpec>;
  weapons: ReadonlyArray<WeaponSpec>;
  passives: ReadonlyArray<PassiveSpec>;
  ships: ReadonlyArray<ShipSpec>;
  abilityMaps: AbilityMaps;
}

/**
 * Partial pack used by the admin app's localStorage / JSON-import overlay.
 * The runtime merges entry-by-entry: `entries.find(id) ?? base`. Missing
 * sections fall through to the base pack.
 */
export interface ContentPackOverlay {
  version: typeof CONTENT_PACK_VERSION;
  sprites?: Partial<SpriteManifest>;
  stages?: ReadonlyArray<StageSpec>;
  environments?: ReadonlyArray<EnvironmentSpec>;
  enemies?: ReadonlyArray<EnemySpec>;
  weapons?: ReadonlyArray<WeaponSpec>;
  passives?: ReadonlyArray<PassiveSpec>;
  ships?: ReadonlyArray<ShipSpec>;
  abilityMaps?: Partial<AbilityMaps>;
}
