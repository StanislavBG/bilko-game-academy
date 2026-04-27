import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type {
  AbilityMaps,
  ContentPack,
  EnemySpec,
  EnvironmentSpec,
  PassiveSpec,
  ShipSpec,
  SpriteManifest,
  StageSpec,
  WeaponSpec,
} from '@bilko/boat-shooter-schema';
import { CONTENT_PACK_VERSION } from '@bilko/boat-shooter-schema';

const req = createRequire(import.meta.url);

function readJson<T>(specifier: string): T {
  const path = req.resolve(specifier);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/**
 * Read the canonical JSON files fresh on every call. This is dev-only
 * (the server is local), so the file-IO cost is acceptable in exchange
 * for immediate freshness — when the admin saves, the next /v1/content
 * GET sees the updated bytes without restart or cache invalidation.
 */
export function getBundled(): ContentPack {
  const sprites = readJson<SpriteManifest>('@bilko/boat-shooter-content/data/sprites.json');
  const stagesFile = readJson<{ version: number; stages: StageSpec[] }>(
    '@bilko/boat-shooter-content/data/stages.json',
  );
  const shipsFile = readJson<{ version: number; ships: ShipSpec[] }>(
    '@bilko/boat-shooter-content/data/ships.json',
  );
  const enemiesFile = readJson<{ version: number; enemies: EnemySpec[] }>(
    '@bilko/boat-shooter-content/data/enemies.json',
  );
  const environmentsFile = readJson<{ version: number; environments: EnvironmentSpec[] }>(
    '@bilko/boat-shooter-content/data/environments.json',
  );
  const weaponsFile = readJson<{ version: number; weapons: WeaponSpec[] }>(
    '@bilko/boat-shooter-content/data/weapons.json',
  );
  const passivesFile = readJson<{ version: number; passives: PassiveSpec[] }>(
    '@bilko/boat-shooter-content/data/passives.json',
  );
  const abilityMapsFile = readJson<{ version: number } & AbilityMaps>(
    '@bilko/boat-shooter-content/data/ability-maps.json',
  );

  return {
    version: CONTENT_PACK_VERSION,
    sprites,
    stages: stagesFile.stages,
    environments: environmentsFile.environments,
    enemies: enemiesFile.enemies,
    weapons: weaponsFile.weapons,
    passives: passivesFile.passives,
    ships: shipsFile.ships,
    abilityMaps: {
      ships: abilityMapsFile.ships,
      enemies: abilityMapsFile.enemies,
      evolutions: abilityMapsFile.evolutions,
    },
  };
}
