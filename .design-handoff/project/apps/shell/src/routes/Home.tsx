import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createGameSave, createLocalLeaderboard } from '@bilko/platform-core';
import type { LeaderboardRow } from '@bilko/game-sdk';

interface GameTile {
  id: string;
  title: string;
  tagline: string;
  available: boolean;
}

const GAMES: GameTile[] = [
  {
    id: 'boat-shooter',
    title: 'Boat Shooter',
    tagline: 'Sail, shoot, stack weapons, survive the Kraken.',
    available: true,
  },
  { id: 'coming-soon-1', title: 'Game 2', tagline: '', available: false },
  { id: 'coming-soon-2', title: 'Game 3', tagline: '', available: false },
  { id: 'coming-soon-3', title: 'Game 4', tagline: '', available: false },
  { id: 'coming-soon-4', title: 'Game 5', tagline: '', available: false },
  { id: 'coming-soon-5', title: 'Game 6', tagline: '', available: false },
];

const BOAT_SHOOTER_STAGES = [
  { n: 1, id: 'stage-1-rivermouth', name: 'Rivermouth', act: 'I' },
  { n: 2, id: 'stage-2-inland-channels', name: 'Inland Channels', act: 'I' },
  { n: 3, id: 'stage-3-delta-fleet', name: 'The Delta Fleet', act: 'I' },
  { n: 4, id: 'stage-4-smugglers-cove', name: "Smuggler's Cove", act: 'I' },
  { n: 5, id: 'stage-5-red-harbor', name: 'Red Harbor — Pirate King', act: 'I' },
  { n: 6, id: 'stage-6-fog-bay', name: 'Fog Bay', act: 'II' },
  { n: 7, id: 'stage-7-cursed-passage', name: 'Cursed Passage', act: 'II' },
  { n: 8, id: 'stage-8-hallowed-waters', name: 'Hallowed Waters — Ghost Commodore', act: 'II' },
  { n: 9, id: 'stage-9-serpent-narrows', name: 'Serpent Narrows', act: 'II' },
  { n: 10, id: 'stage-10-drowned-anchorage', name: 'Drowned Anchorage — Act II Finale', act: 'II' },
  { n: 11, id: 'stage-11-ashfall', name: 'Ashfall', act: 'III' },
  { n: 12, id: 'stage-12-haunted-crater', name: 'Haunted Crater — Banshee', act: 'III' },
  { n: 13, id: 'stage-13-obsidian-plateau', name: 'Obsidian Plateau — Warlord', act: 'III' },
  { n: 14, id: 'stage-14-final-gauntlet', name: 'Final Gauntlet', act: 'III' },
  { n: 15, id: 'stage-15-kraken-bay', name: 'Kraken Bay — FINAL', act: 'III' },
] as const;

interface BoatShooterProgress {
  stagesCleared?: string[];
  gems?: number;
}

// --- Daily challenge (mirrors apps/games/boat-shooter/src/daily.ts) -----------
// Cross-app imports aren't possible (the shell can't pull in game internals),
// so the seed/ship/modifier selection is re-implemented here with identical
// arithmetic. If the game-side formula changes, update this block too.
type DailyModifierId =
  | 'permanent-fog' | 'double-kamikaze' | 'no-repairs' | 'double-crit'
  | 'triple-swarms' | 'rapid-bosses' | 'double-projectiles' | 'halved-hp';

const DAILY_MODIFIER_LABELS: Record<DailyModifierId, string> = {
  'permanent-fog': 'Permanent Fog',
  'double-kamikaze': 'Double Kamikaze',
  'no-repairs': 'No Repairs',
  'double-crit': 'Bloodied Sights (+100% crit)',
  'triple-swarms': 'Triple Swarms',
  'rapid-bosses': 'Rapid Bosses',
  'double-projectiles': 'Enemy Double-Shot',
  'halved-hp': 'Halved HP',
};
const DAILY_MODIFIER_POOL: DailyModifierId[] =
  Object.keys(DAILY_MODIFIER_LABELS) as DailyModifierId[];

type DailyShipId =
  | 'ember-corsair' | 'tempest-fury' | 'frostbound'
  | 'verdant-tide' | 'nightwake';
const DAILY_SHIP_IDS: readonly DailyShipId[] = [
  'ember-corsair', 'tempest-fury', 'frostbound', 'verdant-tide', 'nightwake',
];
const DAILY_SHIP_NAMES: Record<DailyShipId, string> = {
  'ember-corsair': 'Ember Corsair',
  'tempest-fury': 'Tempest Fury',
  'frostbound': 'Frostbound',
  'verdant-tide': 'Verdant Tide',
  'nightwake': 'Nightwake',
};

function dailyMulberry32(seed: number): () => number {
  let a = seed;
  return (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((today - start) / 86_400_000) + 1;
}

function currentDaily(): {
  seed: number;
  shipId: DailyShipId;
  modifier: DailyModifierId;
  dateKey: string;
} {
  const now = new Date();
  const doy = dayOfYearUTC(now);
  const year = now.getUTCFullYear();
  const seed = ((doy * 997) + (year * 11)) % 2_147_483_648;
  const shipId = DAILY_SHIP_IDS[seed % DAILY_SHIP_IDS.length] ?? DAILY_SHIP_IDS[0]!;
  const rng = dailyMulberry32(seed);
  const modIdx = Math.floor(rng() * DAILY_MODIFIER_POOL.length);
  const modifier = DAILY_MODIFIER_POOL[modIdx] ?? DAILY_MODIFIER_POOL[0]!;
  const y = year.toString().padStart(4, '0');
  const m = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  return { seed, shipId, modifier, dateKey: `${y}-${m}-${day}` };
}

function useBoatShooterProgress(): BoatShooterProgress | null {
  const [progress, setProgress] = useState<BoatShooterProgress | null>(null);
  useEffect(() => {
    const save = createGameSave('boat-shooter');
    void save.load<BoatShooterProgress>('progress', {}).then(setProgress);
  }, []);
  return progress;
}

export function Home(): JSX.Element {
  const { t } = useTranslation();
  const progress = useBoatShooterProgress();
  const cleared = new Set(progress?.stagesCleared ?? []);
  // Stage N is unlocked if Stage N-1 is cleared. Stage 1 is always unlocked.
  const unlockedThrough = BOAT_SHOOTER_STAGES.reduce((acc, s, idx) => {
    if (idx === 0) return 1;
    const prev = BOAT_SHOOTER_STAGES[idx - 1]!;
    return cleared.has(prev.id) ? s.n : acc;
  }, 1);

  return (
    <div className="p-6 md:p-10">
      <p className="font-display text-lg text-sea-200 mb-8">{t('home.tagline')}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} t={t} />
        ))}
      </div>

      <DailyRunTile />

      <section className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-gold-400">Boat Shooter — Campaign</h2>
          <Link to="/meta/boat-shooter" className="text-sm text-sea-200 hover:text-gold-400 border border-sea-600 hover:border-gold-500 rounded px-3 py-1.5">
            💎 Meta Shop
          </Link>
        </div>

        {/* Difficulty picker — appends ?difficulty=X to every stage link below. */}
        <DifficultyPicker />

        <p className="text-sm text-sea-300 mb-4 mt-3">
          Clear stages to unlock the next. {progress && (progress.gems ?? 0) > 0 && `💎 ${progress.gems} gems banked.`}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {BOAT_SHOOTER_STAGES.map((s) => {
            const isCleared = cleared.has(s.id);
            const isLocked = s.n > unlockedThrough;
            const isNext = s.n === unlockedThrough && !isCleared;
            const base = 'rounded-lg border p-3 text-center transition-colors';
            const style = isLocked
              ? `${base} border-sea-800 bg-sea-900/50 text-sea-600 cursor-not-allowed`
              : isCleared
              ? `${base} border-green-700 bg-sea-900 hover:border-green-400`
              : isNext
              ? `${base} border-gold-500 bg-sea-900 hover:border-gold-400 ring-2 ring-gold-500/30`
              : `${base} border-sea-600 bg-sea-900 hover:border-gold-500`;
            const badge = isLocked ? '🔒' : isCleared ? '✓' : isNext ? '▶' : '';
            const content = (
              <>
                <div className="font-display text-lg text-gold-400">Stage {s.n} {badge}</div>
                <div className="text-xs text-sea-200 mt-1">{s.name}</div>
              </>
            );
            const diff = typeof window !== 'undefined' ? (localStorage.getItem('boat-shooter-difficulty') ?? 'normal') : 'normal';
            const diffQ = diff === 'normal' ? '' : `&difficulty=${diff}`;
            return isLocked ? (
              <div key={s.n} className={style}>
                {content}
              </div>
            ) : (
              <Link key={s.n} to={`/game/boat-shooter?stage=${s.n}${diffQ}`} className={style}>
                {content}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DifficultyPicker(): JSX.Element {
  const [diff, setDiff] = useState<string>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('boat-shooter-difficulty') ?? 'normal') : 'normal',
  );
  function choose(d: string): void {
    setDiff(d);
    try { localStorage.setItem('boat-shooter-difficulty', d); } catch { /* ignore */ }
  }
  return (
    <div className="flex gap-2 text-xs font-sans uppercase tracking-wider">
      <span className="text-sea-400 self-center mr-2">Difficulty:</span>
      {(['easy', 'normal', 'hard'] as const).map((d) => (
        <button
          key={d}
          onClick={() => choose(d)}
          className={`px-3 py-1 rounded border transition-colors ${
            diff === d
              ? 'border-gold-500 bg-gold-500/15 text-gold-400'
              : 'border-sea-700 text-sea-300 hover:border-sea-500'
          }`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

function DailyRunTile(): JSX.Element {
  // O(1) seed/ship/modifier lookup, memoized so it stays stable within a
  // session. The calculation is trivial but memoization also pins `dateKey`
  // for the leaderboard-fetch effect below.
  const daily = useMemo(currentDaily, []);
  const [topRows, setTopRows] = useState<readonly LeaderboardRow[]>([]);

  useEffect(() => {
    const lb = createLocalLeaderboard('boat-shooter', 'guest');
    void lb.fetch(`daily-${daily.dateKey}`, { limit: 3 }).then(setTopRows);
  }, [daily.dateKey]);

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-gold-400 mb-3">Today&apos;s Run</h2>
      <Link
        to="/game/boat-shooter?daily=1"
        className="block rounded-lg border border-gold-600/60 bg-gradient-to-br from-sea-800 to-sea-900 hover:border-gold-400 transition-colors p-5 group"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gold-400 mb-1">
              Daily seeded · {daily.dateKey} (UTC)
            </div>
            <div className="font-display text-2xl text-sea-100 mb-2">
              TODAY&apos;S RUN
            </div>
            <div className="text-sm text-sea-200 space-y-0.5">
              <div>Ship: <span className="text-gold-300">{DAILY_SHIP_NAMES[daily.shipId]}</span></div>
              <div>Modifier: <span className="text-gold-300">{DAILY_MODIFIER_LABELS[daily.modifier]}</span></div>
            </div>
          </div>
          <span className="text-xs uppercase tracking-wider font-sans text-sea-300 group-hover:text-gold-400 whitespace-nowrap">
            Play →
          </span>
        </div>

        {topRows.length > 0 && (
          <div className="mt-4 border-t border-sea-700 pt-3">
            <div className="text-xs uppercase tracking-wider text-sea-400 mb-1.5">Top 3 today</div>
            <ol className="space-y-1">
              {topRows.map((r) => (
                <li
                  key={r.rank}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-display text-gold-400 w-5 tabular-nums">{r.rank}</span>
                    <span className="text-sea-100">{r.username}</span>
                  </span>
                  <span className="font-display text-gold-400 tabular-nums">
                    {r.score.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {topRows.length === 0 && (
          <div className="mt-4 border-t border-sea-700 pt-3 text-xs text-sea-400 italic">
            No runs today yet — be first.
          </div>
        )}
      </Link>
    </section>
  );
}

function GameCard({
  game,
  t,
}: {
  game: GameTile;
  t: (key: string) => string;
}): JSX.Element {
  if (!game.available) {
    return (
      <div className="aspect-[4/3] rounded-lg bg-sea-900 border border-sea-700 flex flex-col items-center justify-center text-sea-400">
        <span className="font-display text-xl">{game.title}</span>
        <span className="text-xs uppercase tracking-wider mt-2">{t('home.comingSoon')}</span>
      </div>
    );
  }

  return (
    <Link
      to={`/game/${game.id}`}
      className="aspect-[4/3] rounded-lg bg-gradient-to-br from-sea-700 to-sea-900 border border-sea-600 hover:border-gold-500 transition-colors flex flex-col justify-end p-4 overflow-hidden relative group"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(224,176,99,0.15),transparent_70%)]" />
      <h3 className="font-display text-2xl text-gold-400 relative">{game.title}</h3>
      <p className="text-sm text-sea-200 relative">{game.tagline}</p>
      <span className="absolute top-4 right-4 text-xs uppercase tracking-wider font-sans text-sea-300 group-hover:text-gold-400">
        {t('home.play')} →
      </span>
    </Link>
  );
}
