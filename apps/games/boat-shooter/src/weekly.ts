/**
 * Weekly Challenge — deterministic modifiers from the ISO week number.
 *
 * Players can run the same challenge as everyone else in the same week
 * (when cloud-sync leaderboards land, this becomes a genuine competition).
 */

export type ModifierId =
  | 'permanent-fog'
  | 'double-kamikaze'
  | 'no-repairs'
  | 'double-crit'
  | 'triple-swarms'
  | 'rapid-bosses'
  | 'double-projectiles'
  | 'halved-hp';

export interface WeeklyChallenge {
  year: number;
  week: number;
  seed: number;
  modifiers: ModifierId[];
}

/** ISO week number — Thursday-based. */
function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstThursdayDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNr + 3);
  const diffDays = (date.valueOf() - firstThursday.valueOf()) / 86400000;
  return { year: date.getUTCFullYear(), week: 1 + Math.round(diffDays / 7) };
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Canonical modifier pool — shared with the Daily challenge (see daily.ts)
 * so we don't duplicate the list and drift over time.
 */
export const WEEKLY_MODIFIER_POOL: readonly ModifierId[] = [
  'permanent-fog',
  'double-kamikaze',
  'no-repairs',
  'double-crit',
  'triple-swarms',
  'rapid-bosses',
  'double-projectiles',
  'halved-hp',
];

const ALL_MODS: ModifierId[] = [...WEEKLY_MODIFIER_POOL];

/** Shared PRNG — `daily.ts` uses the same algorithm for parity. */
export { mulberry32 };

export function currentWeeklyChallenge(now: Date = new Date()): WeeklyChallenge {
  const { year, week } = isoWeek(now);
  const seed = year * 100 + week;
  const rng = mulberry32(seed);
  // Pick 2 modifiers.
  const mods: ModifierId[] = [];
  const pool = [...ALL_MODS];
  for (let i = 0; i < 2 && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    mods.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return { year, week, seed, modifiers: mods };
}

export const MODIFIER_LABELS: Record<ModifierId, string> = {
  'permanent-fog': 'Permanent Fog (all stages foggy)',
  'double-kamikaze': 'Double Kamikaze (twice as many Powder-Keg)',
  'no-repairs': 'No Repairs (merchant heal disabled)',
  'double-crit': 'Bloodied Sights (+100% crit chance)',
  'triple-swarms': 'Triple Swarms (Cursed Swarm counts ×3)',
  'rapid-bosses': 'Rapid Bosses (boss attack cadence ×0.6)',
  'double-projectiles': 'Enemy Double-Shot (enemy projectiles ×2)',
  'halved-hp': 'Halved HP (player max HP ÷ 2)',
};
