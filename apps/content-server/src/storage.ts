import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);

/**
 * Storage layer for the Boat Shooter Admin (single-indie-dev workflow).
 *
 * **Edits go directly to canonical JSON in git** — no overrides overlay,
 * no publish step. The admin saves; `git status` shows the diff; the dev
 * commits + pushes; production builds ship the new JSON.
 *
 * Per-section save targets:
 *   - sprites      → packages/boat-shooter-content/data/sprites.json
 *   - stages       → packages/boat-shooter-content/data/stages.json
 *   - environments → packages/boat-shooter-content/data/environments.json
 *   - enemies      → packages/boat-shooter-content/data/enemies.json
 *   - weapons      → packages/boat-shooter-content/data/weapons.json
 *   - passives     → packages/boat-shooter-content/data/passives.json
 *   - ships        → packages/boat-shooter-content/data/ships.json
 *   - ability-maps → packages/boat-shooter-content/data/ability-maps.json
 *
 * Sprite PNGs land in `apps/games/boat-shooter/assets/sprites/<id>.png`,
 * the same dir Vite + the runtime sprite-loader already read from.
 *
 * The `DATA_DIR` env var is no longer used for SOR storage — kept only as
 * a scratch dir for transient files (e.g. Gemini regen previews).
 */

export type SectionName =
  | 'sprites' | 'stages' | 'environments' | 'enemies'
  | 'weapons' | 'passives' | 'ships' | 'ability-maps';

const SECTION_FILE: Record<SectionName, string> = {
  sprites:        'sprites.json',
  stages:         'stages.json',
  environments:   'environments.json',
  enemies:        'enemies.json',
  weapons:        'weapons.json',
  passives:       'passives.json',
  ships:          'ships.json',
  'ability-maps': 'ability-maps.json',
};

/** Resolve the on-disk path of @bilko/boat-shooter-content via require so
 *  this works both from src/ (tsx) and dist/ (compiled).  */
function contentPackageRoot(): string {
  const pkgPath = require.resolve('@bilko/boat-shooter-content/package.json');
  return dirname(pkgPath);
}

function contentDataDir(): string {
  return join(contentPackageRoot(), 'data');
}

function spritesAssetDir(): string {
  // packages/boat-shooter-content/.. → repo-root → apps/games/boat-shooter/assets/sprites
  return resolve(contentPackageRoot(), '../../apps/games/boat-shooter/assets/sprites');
}

const SCRATCH_DIR = resolve(process.env['DATA_DIR'] ?? './data');

export function ensureDirs(): void {
  if (!existsSync(SCRATCH_DIR)) mkdirSync(SCRATCH_DIR, { recursive: true });
  // Canonical dirs already exist in the repo; create only if missing.
  const data = contentDataDir();
  if (!existsSync(data)) mkdirSync(data, { recursive: true });
  const sprites = spritesAssetDir();
  if (!existsSync(sprites)) mkdirSync(sprites, { recursive: true });
}

function atomicWriteFile(path: string, data: Buffer | string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}

/** Wrap the bare array body in the JSON file's envelope shape so the file
 *  format stays stable (every file is `{ version: 1, <key>: [...] }`). */
function envelope(name: SectionName, data: unknown): Record<string, unknown> {
  switch (name) {
    case 'sprites':       return { version: 1, entries: (data as { entries?: unknown }).entries ?? data };
    case 'stages':        return { version: 1, stages: data };
    case 'environments':  return { version: 1, environments: data };
    case 'enemies':       return { version: 1, enemies: data };
    case 'weapons':       return { version: 1, weapons: data };
    case 'passives':      return { version: 1, passives: data };
    case 'ships':         return { version: 1, ships: data };
    case 'ability-maps':  return { version: 1, ...(data as Record<string, unknown>) };
  }
}

export function saveSection(name: SectionName, data: unknown): string {
  const file = join(contentDataDir(), SECTION_FILE[name]);
  const body = JSON.stringify(envelope(name, data), null, 2) + '\n';
  atomicWriteFile(file, body);
  return file;
}

export function readSection<T>(name: SectionName): T {
  const file = join(contentDataDir(), SECTION_FILE[name]);
  const raw = readFileSync(file, 'utf8');
  return JSON.parse(raw) as T;
}

/** Sprite resolution: canonical first, scratch never (we don't keep an
 *  override layer for sprites either). Returns null if missing. */
export function loadSpritePath(id: string): string | null {
  const p = join(spritesAssetDir(), `${id}.png`);
  return existsSync(p) ? p : null;
}

/** Write a PNG into the canonical sprite asset folder. The dev's next
 *  commit captures it as a real binary diff; Vite HMR / runtime loader
 *  picks it up live. */
export function saveSpritePng(id: string, bytes: Buffer): string {
  const p = join(spritesAssetDir(), `${id}.png`);
  atomicWriteFile(p, bytes);
  return p;
}

export const paths = {
  contentDataDir: contentDataDir(),
  spritesAssetDir: spritesAssetDir(),
  scratchDir: SCRATCH_DIR,
};
