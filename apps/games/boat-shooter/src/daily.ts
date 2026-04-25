/**
 * Daily Challenge — deterministic seed + ship + modifier from the UTC date.
 *
 * Spec: docs/games/boat-shooter/26-game-designer-enhancements.md §1.5.
 *
 * Seed formula: `dayOfYear(todayUTC) * 997 + todayUTC.getFullYear() * 11`
 * taken modulo 2^31 so it stays in a non-negative signed-32-bit range.
 *
 * Every player on the same UTC date gets the same ship + modifier, enabling
 * a per-day leaderboard board keyed by `daily-<YYYY-MM-DD>`.
 */

import { SHIP_IDS, type ShipId } from './data/starting-ships';
import { mulberry32, WEEKLY_MODIFIER_POOL, type ModifierId } from './weekly';

export interface DailyChallenge {
  seed: number;
  modifiers: ModifierId[];
  shipId: ShipId;
  /** ISO `YYYY-MM-DD` in UTC. Used as the leaderboard-board suffix. */
  dateKey: string;
}

const TWO_POW_31 = 2_147_483_648; // 2^31

/** 1-indexed day of the year (Jan 1 = 1). O(1). */
function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((today - start) / 86_400_000) + 1;
}

function dateKeyUTC(d: Date): string {
  const y = d.getUTCFullYear().toString().padStart(4, '0');
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Resolve today's Daily Challenge deterministically.
 *
 * `now` is injectable for tests; defaults to the current wall-clock Date.
 * The computation is O(1) — two RNG draws + a modulo.
 */
export function currentDailyChallenge(now: Date = new Date()): DailyChallenge {
  const doy = dayOfYearUTC(now);
  const year = now.getUTCFullYear();
  const seed = ((doy * 997) + (year * 11)) % TWO_POW_31;

  // Ship rotation — purely index-based off the seed so the same date → same ship
  // without consuming the RNG stream (keeps modifier draw stable).
  const shipId = SHIP_IDS[seed % SHIP_IDS.length] ?? SHIP_IDS[0]!;

  // Modifier pick — 1 modifier (simpler than weekly's 2) via a single RNG draw.
  const rng = mulberry32(seed);
  const pool: ModifierId[] = [...WEEKLY_MODIFIER_POOL];
  const idx = Math.floor(rng() * pool.length);
  const mod = pool[idx] ?? pool[0]!;

  return {
    seed,
    modifiers: [mod],
    shipId,
    dateKey: dateKeyUTC(now),
  };
}
