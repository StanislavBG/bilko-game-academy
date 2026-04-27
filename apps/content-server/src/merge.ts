import type {
  AbilityMaps,
  ContentPack,
  EnemySpec,
  EnvironmentSpec,
  PassiveSpec,
  ShipSpec,
  SpriteManifest,
  SpriteManifestEntry,
  StageSpec,
  WeaponSpec,
} from '@bilko/boat-shooter-schema';

// id-keyed merge: override entries replace bundled by id; new ids appended.
// O(n + m) — single pass per side, n = bundled.length, m = override.length.
function mergeById<T extends { id: string }>(
  base: ReadonlyArray<T>,
  over: ReadonlyArray<T> | undefined,
): ReadonlyArray<T> {
  if (!over || over.length === 0) return base;
  const seen = new Map<string, T>();
  for (const e of base) seen.set(e.id, e);
  for (const e of over) seen.set(e.id, e);
  return Array.from(seen.values());
}

function mergeSprites(
  base: SpriteManifest,
  over: Partial<SpriteManifest> | undefined,
): SpriteManifest {
  if (!over || !over.entries) return base;
  const merged = mergeById<SpriteManifestEntry>(base.entries, over.entries);
  return { version: base.version, entries: [...merged] };
}

function mergeAbilityMaps(
  base: AbilityMaps,
  over: Partial<AbilityMaps> | undefined,
): AbilityMaps {
  if (!over) return base;
  return {
    ships: over.ships ?? base.ships,
    enemies: over.enemies ?? base.enemies,
    evolutions: over.evolutions ?? base.evolutions,
  };
}

export function mergePack(
  bundled: ContentPack,
  overrides: Partial<ContentPack>,
): ContentPack {
  return {
    version: bundled.version,
    sprites: mergeSprites(bundled.sprites, overrides.sprites as Partial<SpriteManifest> | undefined),
    stages: mergeById<StageSpec>(bundled.stages, overrides.stages),
    environments: mergeById<EnvironmentSpec>(bundled.environments, overrides.environments),
    enemies: mergeById<EnemySpec>(bundled.enemies, overrides.enemies),
    weapons: mergeById<WeaponSpec>(bundled.weapons, overrides.weapons),
    passives: mergeById<PassiveSpec>(bundled.passives, overrides.passives),
    ships: mergeById<ShipSpec>(bundled.ships, overrides.ships),
    abilityMaps: mergeAbilityMaps(bundled.abilityMaps, overrides.abilityMaps),
  };
}
