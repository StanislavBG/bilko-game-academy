import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ContentPack } from '@bilko/boat-shooter-schema';

const DATA_DIR = resolve(process.env['DATA_DIR'] ?? './data');
const SPRITES_DIR = join(DATA_DIR, 'sprites');
const OVERRIDES_PATH = join(DATA_DIR, 'overrides.json');

export type OverrideSection = keyof Omit<ContentPack, 'version'>;

export function ensureDirs(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(SPRITES_DIR)) mkdirSync(SPRITES_DIR, { recursive: true });
}

export function loadOverrides(): Partial<ContentPack> {
  if (!existsSync(OVERRIDES_PATH)) return {};
  const raw = readFileSync(OVERRIDES_PATH, 'utf8').trim();
  if (raw.length === 0) return {};
  try {
    return JSON.parse(raw) as Partial<ContentPack>;
  } catch {
    return {};
  }
}

// Atomic write so a crash mid-write can't leave a half-flushed JSON file.
function atomicWriteFile(path: string, data: Buffer | string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}

export function saveOverrideSection(name: OverrideSection, data: unknown): void {
  const current = loadOverrides();
  const next = { ...current, [name]: data } as Partial<ContentPack>;
  atomicWriteFile(OVERRIDES_PATH, JSON.stringify(next, null, 2));
}

export function loadSpritePath(id: string): string | null {
  const p = join(SPRITES_DIR, `${id}.png`);
  return existsSync(p) ? p : null;
}

export function saveSpritePng(id: string, bytes: Buffer): string {
  const p = join(SPRITES_DIR, `${id}.png`);
  atomicWriteFile(p, bytes);
  return p;
}

export const paths = { DATA_DIR, SPRITES_DIR, OVERRIDES_PATH };
