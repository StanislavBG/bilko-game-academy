import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createLocalLeaderboard } from '@bilko/platform-core';
import type { LeaderboardRow } from '@bilko/game-sdk';

type BoardTab = 'campaign' | 'per-stage' | 'boss' | 'weekly';

const TABS: { id: BoardTab; label: string; key: string }[] = [
  { id: 'campaign', label: 'Campaign (speedrun)', key: 'campaign-normal' },
  { id: 'per-stage', label: 'Per-stage high score', key: 'per-stage-normal' },
  { id: 'boss', label: 'Boss kill times', key: 'boss-kraken-normal' },
  { id: 'weekly', label: 'Weekly Challenge', key: 'weekly' },
];

// Mirrors apps/games/boat-shooter/src/weekly.ts — same algorithm so the
// shell can display this week's modifiers without importing the game module.
type ModifierId =
  | 'permanent-fog' | 'double-kamikaze' | 'no-repairs' | 'double-crit'
  | 'triple-swarms' | 'rapid-bosses' | 'double-projectiles' | 'halved-hp';

const MODIFIER_LABELS: Record<ModifierId, string> = {
  'permanent-fog': 'Permanent Fog (all stages foggy)',
  'double-kamikaze': 'Double Kamikaze (twice as many Powder-Keg)',
  'no-repairs': 'No Repairs (merchant heal disabled)',
  'double-crit': 'Bloodied Sights (+100% crit chance)',
  'triple-swarms': 'Triple Swarms (Cursed Swarm counts ×3)',
  'rapid-bosses': 'Rapid Bosses (boss attack cadence ×0.6)',
  'double-projectiles': 'Enemy Double-Shot (enemy projectiles ×2)',
  'halved-hp': 'Halved HP (player max HP ÷ 2)',
};
const ALL_MODS: ModifierId[] = Object.keys(MODIFIER_LABELS) as ModifierId[];

function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstThursdayDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNr + 3);
  const diffDays = (date.valueOf() - firstThursday.valueOf()) / 86_400_000;
  return { year: date.getUTCFullYear(), week: 1 + Math.round(diffDays / 7) };
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function currentWeekly(): { year: number; week: number; modifiers: ModifierId[] } {
  const { year, week } = isoWeek(new Date());
  const rng = mulberry32(year * 100 + week);
  const pool = [...ALL_MODS];
  const mods: ModifierId[] = [];
  for (let i = 0; i < 2 && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    mods.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return { year, week, modifiers: mods };
}

export function Leaderboards(): JSX.Element {
  const { t } = useTranslation();
  const [tab, setTab] = useState<BoardTab>('campaign');
  const [rows, setRows] = useState<readonly LeaderboardRow[]>([]);
  const weekly = useMemo(currentWeekly, []);

  useEffect(() => {
    const board = TABS.find((b) => b.id === tab);
    if (!board) return;
    const lb = createLocalLeaderboard('boat-shooter', 'guest');
    void lb.fetch(board.key, { limit: 20 }).then(setRows);
  }, [tab]);

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h2 className="font-display text-3xl text-gold-400 mb-6">{t('nav.leaderboards')}</h2>

      <div className="flex gap-2 border-b border-sea-700 mb-4">
        {TABS.map((b) => (
          <button
            key={b.id}
            onClick={() => setTab(b.id)}
            className={`px-4 py-2 text-sm font-sans uppercase tracking-wider transition-colors ${
              tab === b.id
                ? 'text-gold-400 border-b-2 border-gold-500'
                : 'text-sea-300 hover:text-sea-100'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {tab === 'weekly' && (
        <div className="mb-5 rounded border border-gold-600/60 bg-sea-900/60 p-4">
          <div className="text-sm uppercase tracking-wider text-gold-400 mb-2">
            Week {weekly.week}, {weekly.year}
          </div>
          <ul className="text-sm text-sea-100 space-y-1 mb-3">
            {weekly.modifiers.map((m) => (
              <li key={m}>• {MODIFIER_LABELS[m]}</li>
            ))}
          </ul>
          <a
            href="/game/boat-shooter?weekly=1"
            className="inline-block text-xs uppercase tracking-wider px-3 py-1.5 rounded bg-gold-600 text-sea-900 hover:bg-gold-500 font-sans"
          >
            Run this week's challenge
          </a>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-sea-400 text-sm italic py-8 text-center">
          No runs recorded yet. Play Boat Shooter to earn a spot.
        </div>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r) => (
            <li
              key={r.rank}
              className="flex items-center justify-between bg-sea-900 rounded px-4 py-2.5"
            >
              <div className="flex items-center gap-4">
                <span className="font-display text-2xl text-gold-400 w-8 tabular-nums">
                  {r.rank}
                </span>
                <span className="font-sans text-sea-100">{r.username}</span>
              </div>
              <div className="text-right">
                <div className="font-display text-xl text-gold-400 tabular-nums">
                  {r.score.toLocaleString()}
                </div>
                {r.durationMs !== undefined && (
                  <div className="text-xs text-sea-400 tabular-nums">
                    {(r.durationMs / 1000).toFixed(1)}s
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-6 text-xs text-sea-500">
        Local-only for now. Cloud sync + global ranking ships in P7.
      </p>
    </div>
  );
}
