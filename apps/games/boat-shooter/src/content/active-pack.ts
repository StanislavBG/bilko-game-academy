import type {
  AbilityMaps,
  ContentPack,
  EnemyId,
  EnemySpec,
  EnvironmentSpec,
  PassiveId,
  PassiveSpec,
  ShipSpec,
  SpriteManifest,
  StageSpec,
  WeaponId,
  WeaponSpec,
} from '@bilko/boat-shooter-schema';
import { CONTENT_PACK_VERSION } from '@bilko/boat-shooter-schema';
import type { EnemySpec as RuntimeEnemySpec } from '../entities/enemy';
import spritesRaw from '@bilko/boat-shooter-content/data/sprites.json';
import stagesRaw from '@bilko/boat-shooter-content/data/stages.json';
import shipsRaw from '@bilko/boat-shooter-content/data/ships.json';
import enemiesRaw from '@bilko/boat-shooter-content/data/enemies.json';
import environmentsRaw from '@bilko/boat-shooter-content/data/environments.json';
import weaponsRaw from '@bilko/boat-shooter-content/data/weapons.json';
import passivesRaw from '@bilko/boat-shooter-content/data/passives.json';
import abilityMapsRaw from '@bilko/boat-shooter-content/data/ability-maps.json';

/**
 * Active ContentPack — module-scoped so every consumer (stages, ships,
 * sprite-loader, …) reads the same source of truth.
 *
 * **Source of truth.** The canonical JSON files in
 * `packages/boat-shooter-content/data/` are git-tracked and form the
 * SOR. The admin app (dev-only, see apps/shell/src/admin/) writes to
 * those files directly via the local content-server; Vite HMR reloads
 * the imports below; production builds bundle the JSON.
 *
 * Boot pipeline (in apps/games/boat-shooter/src/index.ts):
 *   1. setActivePack(buildBundledPack()).
 *   2. Add Phaser scenes; they may now read getActivePack() at any time.
 *
 * No automatic mutation after boot.
 */

let active: ContentPack | null = null;

/** Set the live pack. Called once at boot before any scene starts. */
export function setActivePack(pack: ContentPack): void {
  active = pack;
}

/**
 * Read the live pack. Throws if called before setActivePack — that
 * indicates a programmer error (a module evaluated content data at
 * import time instead of lazy access). The bundled-default fallback
 * in index.ts ensures real runs always set it.
 */
export function getActivePack(): ContentPack {
  if (!active) {
    throw new Error(
      '[boat-shooter] getActivePack() called before setActivePack(); did boot run?',
    );
  }
  return active;
}

interface SpritesFile { version: 1; entries: SpriteManifest['entries']; }
interface StagesFile { version: 1; stages: StageSpec[]; }
interface ShipsFile { version: 1; ships: ShipSpec[]; }
interface EnemiesFile { version: 1; enemies: EnemySpec[]; }
interface EnvironmentsFile { version: 1; environments: EnvironmentSpec[]; }
interface WeaponsFile { version: 1; weapons: WeaponSpec[]; }
interface PassivesFile { version: 1; passives: PassiveSpec[]; }
type AbilityMapsFile = AbilityMaps & { version: 1 };

/**
 * Lookup an enemy spec by id from the active pack, returning the runtime
 * shape (the schema's EnemySpec is structurally compatible — extra `kind`
 * field is harmless to the runtime). Throws if the id is missing so the
 * factory fails loudly at boot rather than silently spawning a bad enemy.
 * Complexity: O(n) where n = enemy count (29). Linear scan beats a map
 * for a 29-entry list — no allocation churn at boot.
 */
export function getEnemySpec(id: EnemyId): RuntimeEnemySpec {
  const found = getActivePack().enemies.find((e) => e.id === id);
  if (!found) {
    throw new Error(`[boat-shooter] getEnemySpec('${id}') — id not found in active pack`);
  }
  return found as unknown as RuntimeEnemySpec;
}

/**
 * Strict environment lookup. Throws if the id is missing — used by callers
 * that already resolved the id from a stage spec. Complexity O(n), n ≤ ~12.
 */
export function getEnvironment(id: string): EnvironmentSpec {
  const env = getActivePack().environments.find((e) => e.id === id);
  if (!env) {
    throw new Error(`[boat-shooter] getEnvironment('${id}') — id not found in active pack`);
  }
  return env;
}

/**
 * Resolve the EnvironmentSpec for a stage if both (a) the stage references
 * one and (b) the active pack contains it. Returns null when env data is
 * absent so runtime systems can fall back to their existing biome-by-id
 * inference (no behavior change during the rollout).
 * Complexity O(n + m), n = stages (15), m = environments (~12).
 */
export function getEnvironmentForStage(stageId: string): EnvironmentSpec | null {
  const pack = getActivePack();
  const stage = pack.stages.find((s) => s.id === stageId);
  const envId = stage?.environmentId;
  if (!envId) return null;
  return pack.environments.find((e) => e.id === envId) ?? null;
}

/**
 * Lookup a weapon spec by id, or null if the active pack hasn't shipped one
 * yet (the bundled defaults are still empty during the rollout). Callers
 * read `.curves` opportunistically and fall back to in-code defaults.
 * Complexity O(n), n = weapon count (≤13).
 */
export function getWeaponSpec(id: WeaponId): WeaponSpec | null {
  return getActivePack().weapons.find((w) => w.id === id) ?? null;
}

/**
 * Lookup a passive spec by id, or null if the active pack hasn't shipped one
 * yet. Used by `systems/battle.ts` to consume admin-tunable curves when
 * present, with PASSIVE_TIERS as the bundled-default fallback.
 * Complexity O(n), n = passive count (≤8).
 */
export function getPassiveSpec(id: PassiveId): PassiveSpec | null {
  return getActivePack().passives.find((p) => p.id === id) ?? null;
}

/**
 * Build a ContentPack from the bundled JSON imports. This is the
 * fallback path when the content server is unreachable. The bundled
 * data already covers a complete run, so the game is fully playable
 * with no network at all.
 *
 * Runtime systems still read mechanics from their own catalogs in
 * `weapons/` and `entities/` — the JSON-bundled `weapons / passives /
 * environments` arrays carry display + curve metadata for admin tools
 * and any future data-driven readers, not the firing implementation.
 */
export function buildBundledPack(): ContentPack {
  const sprites = spritesRaw as SpritesFile;
  const stages = stagesRaw as StagesFile;
  const ships = shipsRaw as ShipsFile;
  const enemies = enemiesRaw as EnemiesFile;
  const environments = environmentsRaw as EnvironmentsFile;
  const weapons = weaponsRaw as WeaponsFile;
  const passives = passivesRaw as PassivesFile;
  const am = abilityMapsRaw as AbilityMapsFile;

  return {
    version: CONTENT_PACK_VERSION,
    sprites: { version: 1, entries: sprites.entries },
    stages: stages.stages,
    environments: environments.environments,
    enemies: enemies.enemies,
    weapons: weapons.weapons,
    passives: passives.passives,
    ships: ships.ships,
    abilityMaps: { ships: am.ships, enemies: am.enemies, evolutions: am.evolutions },
  };
}
