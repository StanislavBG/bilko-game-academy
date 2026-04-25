import type { FetchOpts, LeaderboardAPI, LeaderboardEntry, LeaderboardRow } from '@bilko/game-sdk';
import { createPlatformSave } from '../save/save-adapter';

/**
 * Local-only leaderboard stub for P1–P4. Stores the top 100 rows per board
 * in IndexedDB. Supabase cloud sync is wired in during P5 via the same
 * LeaderboardAPI interface (different implementation).
 */

const save = createPlatformSave();
const KEY_PREFIX = 'leaderboard/';
const MAX_ROWS = 100;

export function createLocalLeaderboard(gameId: string, username: string): LeaderboardAPI {
  return {
    async submit(entry: LeaderboardEntry): Promise<void> {
      const key = `${KEY_PREFIX}${gameId}/${entry.board}`;
      const existing = await save.load<LeaderboardRow[]>(key, []);
      const row: LeaderboardRow = {
        rank: 0, // recalculated below
        username,
        score: entry.score,
        ...(entry.durationMs !== undefined ? { durationMs: entry.durationMs } : {}),
        submittedAt: new Date().toISOString(),
        ...(entry.meta !== undefined ? { meta: entry.meta } : {}),
      };
      const updated = [...existing, row]
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_ROWS)
        .map((r, i) => ({ ...r, rank: i + 1 }));
      await save.save(key, updated);
    },
    async fetch(board: string, opts: FetchOpts = {}): Promise<readonly LeaderboardRow[]> {
      const key = `${KEY_PREFIX}${gameId}/${board}`;
      const rows = await save.load<LeaderboardRow[]>(key, []);
      return rows.slice(0, opts.limit ?? MAX_ROWS);
    },
  };
}
