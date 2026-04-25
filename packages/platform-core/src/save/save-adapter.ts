import { get, set, del, createStore, type UseStore } from 'idb-keyval';
import type { SaveAdapter } from '@bilko/game-sdk';

/**
 * Per-game SaveAdapter. Each game gets a namespaced subtree of IndexedDB.
 *
 * IndexedDB constraint: object stores can only be added during a versionchange
 * transaction. Creating new stores at runtime (one per namespace) fails after
 * the DB is first opened. Solution: single shared store + namespaced KEYS.
 *
 * Storage layout (single object store):
 *   key = `games/${gameId}/${userKey}`         per-game data
 *   key = `platform/${userKey}`                shell-level data
 *   key = `leaderboard/${gameId}/${board}`     local boards
 */

const ROOT_DB = 'bilko-game-academy';
const ROOT_STORE = 'kv';

let sharedStore: UseStore | null = null;
function getStore(): UseStore {
  if (!sharedStore) sharedStore = createStore(ROOT_DB, ROOT_STORE);
  return sharedStore;
}

export function createGameSave(gameId: string): SaveAdapter {
  const prefix = `games/${gameId}/`;
  return {
    async load<T>(key: string, defaultValue: T): Promise<T> {
      try {
        const value = await get<T>(prefix + key, getStore());
        return value === undefined ? defaultValue : value;
      } catch {
        return defaultValue;
      }
    },
    async save<T>(key: string, value: T): Promise<void> {
      try { await set(prefix + key, value, getStore()); } catch { /* best-effort */ }
    },
    async delete(key: string): Promise<void> {
      try { await del(prefix + key, getStore()); } catch { /* best-effort */ }
    },
  };
}

export function createPlatformSave(): SaveAdapter {
  const prefix = `platform/`;
  return {
    async load<T>(key: string, defaultValue: T): Promise<T> {
      try {
        const value = await get<T>(prefix + key, getStore());
        return value === undefined ? defaultValue : value;
      } catch {
        return defaultValue;
      }
    },
    async save<T>(key: string, value: T): Promise<void> {
      try { await set(prefix + key, value, getStore()); } catch { /* best-effort */ }
    },
    async delete(key: string): Promise<void> {
      try { await del(prefix + key, getStore()); } catch { /* best-effort */ }
    },
  };
}
