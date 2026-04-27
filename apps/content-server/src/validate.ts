/** Validator key — like the URL section name but with `abilityMaps`
 *  camelCase to match the schema's ContentPack key. */
export type SectionKey =
  | 'sprites' | 'stages' | 'environments' | 'enemies'
  | 'weapons' | 'passives' | 'ships' | 'abilityMaps';

export interface ValidateResult {
  ok: boolean;
  reason?: string;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function arrayOfObjectsWithId(v: unknown): boolean {
  if (!Array.isArray(v)) return false;
  for (const e of v) {
    if (!isObject(e)) return false;
    if (typeof (e as { id?: unknown }).id !== 'string') return false;
  }
  return true;
}

export function validateSection(name: SectionKey, body: unknown): ValidateResult {
  switch (name) {
    case 'sprites': {
      if (!isObject(body)) return { ok: false, reason: 'sprites must be an object' };
      if (body['version'] !== 1) return { ok: false, reason: 'sprites.version must be 1' };
      if (!Array.isArray(body['entries'])) {
        return { ok: false, reason: 'sprites.entries must be an array' };
      }
      for (const e of body['entries'] as unknown[]) {
        if (!isObject(e)) return { ok: false, reason: 'sprites.entries[*] must be objects' };
        if (typeof e['id'] !== 'string') return { ok: false, reason: 'sprite entry needs id' };
        if (typeof e['category'] !== 'string') return { ok: false, reason: 'sprite entry needs category' };
        if (typeof e['prompt'] !== 'string') return { ok: false, reason: 'sprite entry needs prompt' };
        if (typeof e['required'] !== 'boolean') return { ok: false, reason: 'sprite entry needs required:boolean' };
      }
      return { ok: true };
    }
    case 'stages':
    case 'enemies':
    case 'weapons':
    case 'passives':
    case 'ships':
      if (!arrayOfObjectsWithId(body)) {
        return { ok: false, reason: `${name} must be an array of objects with string id` };
      }
      return { ok: true };
    case 'environments': {
      if (!Array.isArray(body)) return { ok: false, reason: 'environments must be an array' };
      for (const e of body as unknown[]) {
        if (!isObject(e)) return { ok: false, reason: 'environments[*] must be objects' };
        if (typeof e['id'] !== 'string') return { ok: false, reason: 'environment entry needs id' };
        if (typeof e['biome'] !== 'string') return { ok: false, reason: 'environment entry needs biome' };
        if (!Array.isArray(e['waterPaletteHex'])) {
          return { ok: false, reason: 'environment entry needs waterPaletteHex array' };
        }
        if (typeof e['weather'] !== 'string') return { ok: false, reason: 'environment entry needs weather' };
      }
      return { ok: true };
    }
    case 'abilityMaps': {
      if (!isObject(body)) return { ok: false, reason: 'abilityMaps must be an object' };
      if (!Array.isArray(body['ships'])) return { ok: false, reason: 'abilityMaps.ships must be array' };
      if (!Array.isArray(body['enemies'])) return { ok: false, reason: 'abilityMaps.enemies must be array' };
      if (!Array.isArray(body['evolutions'])) return { ok: false, reason: 'abilityMaps.evolutions must be array' };
      return { ok: true };
    }
    default:
      return { ok: false, reason: `unknown section: ${String(name)}` };
  }
}

const URL_TO_KEY: Record<string, SectionKey> = {
  sprites: 'sprites',
  stages: 'stages',
  ships: 'ships',
  enemies: 'enemies',
  weapons: 'weapons',
  passives: 'passives',
  environments: 'environments',
  'ability-maps': 'abilityMaps',
};

export function urlSectionToKey(name: string): SectionKey | null {
  return URL_TO_KEY[name] ?? null;
}
