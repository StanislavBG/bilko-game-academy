import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { createGameSave, createLocalLeaderboard } from '@bilko/platform-core';
import type { LeaderboardRow } from '@bilko/game-sdk';

const BOAT_SHOOTER_STAGES = [
  { n: 1,  id: 'stage-1-rivermouth',      name: 'Rivermouth',         act: 'I' },
  { n: 2,  id: 'stage-2-inland-channels', name: 'Inland Channels',    act: 'I' },
  { n: 3,  id: 'stage-3-delta-fleet',     name: 'The Delta Fleet',    act: 'I' },
  { n: 4,  id: 'stage-4-smugglers-cove',  name: "Smuggler's Cove",    act: 'I' },
  { n: 5,  id: 'stage-5-red-harbor',      name: 'Red Harbor',         act: 'I' },
  { n: 6,  id: 'stage-6-fog-bay',         name: 'Fog Bay',            act: 'II' },
  { n: 7,  id: 'stage-7-cursed-passage',  name: 'Cursed Passage',     act: 'II' },
  { n: 8,  id: 'stage-8-hallowed-waters', name: 'Hallowed Waters',    act: 'II' },
  { n: 9,  id: 'stage-9-serpent-narrows', name: 'Serpent Narrows',    act: 'II' },
  { n: 10, id: 'stage-10-drowned-anchorage', name: 'Drowned Anchorage', act: 'II' },
  { n: 11, id: 'stage-11-ashfall',        name: 'Ashfall',            act: 'III' },
  { n: 12, id: 'stage-12-haunted-crater', name: 'Haunted Crater',     act: 'III' },
  { n: 13, id: 'stage-13-obsidian-plateau', name: 'Obsidian Plateau', act: 'III' },
  { n: 14, id: 'stage-14-final-gauntlet', name: 'Final Gauntlet',     act: 'III' },
  { n: 15, id: 'stage-15-kraken-bay',     name: 'Kraken Bay',         act: 'III' },
] as const;

interface BoatShooterProgress {
  stagesCleared?: string[];
  gems?: number;
}

type DailyModifierId =
  | 'permanent-fog' | 'double-kamikaze' | 'no-repairs' | 'double-crit'
  | 'triple-swarms' | 'rapid-bosses' | 'double-projectiles' | 'halved-hp';

const DAILY_MODIFIER_LABELS: Record<DailyModifierId, string> = {
  'permanent-fog': 'Permanent Fog',
  'double-kamikaze': 'Double Kamikaze',
  'no-repairs': 'No Repairs',
  'double-crit': 'Bloodied Sights',
  'triple-swarms': 'Triple Swarms',
  'rapid-bosses': 'Rapid Bosses',
  'double-projectiles': 'Enemy Double-Shot',
  'halved-hp': 'Halved HP',
};
const DAILY_MODIFIER_POOL: DailyModifierId[] =
  Object.keys(DAILY_MODIFIER_LABELS) as DailyModifierId[];

type DailyShipId = 'ember-corsair' | 'tempest-fury' | 'frostbound' | 'verdant-tide' | 'nightwake';
const DAILY_SHIP_IDS: readonly DailyShipId[] = [
  'ember-corsair', 'tempest-fury', 'frostbound', 'verdant-tide', 'nightwake',
];
const DAILY_SHIP_NAMES: Record<DailyShipId, string> = {
  'ember-corsair': 'Ember Corsair',
  'tempest-fury':  'Tempest Fury',
  'frostbound':    'Frostbound',
  'verdant-tide':  'Verdant Tide',
  'nightwake':     'Nightwake',
};

function dailyMulberry32(seed: number): () => number {
  let a = seed;
  return (): number => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
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
function currentDaily(): { seed: number; shipId: DailyShipId; modifier: DailyModifierId; dateKey: string } {
  const now = new Date();
  const seed = ((dayOfYearUTC(now) * 997) + (now.getUTCFullYear() * 11)) % 2_147_483_648;
  const shipId = DAILY_SHIP_IDS[seed % DAILY_SHIP_IDS.length] ?? DAILY_SHIP_IDS[0]!;
  const rng = dailyMulberry32(seed);
  const modIdx = Math.floor(rng() * DAILY_MODIFIER_POOL.length);
  const modifier = DAILY_MODIFIER_POOL[modIdx] ?? DAILY_MODIFIER_POOL[0]!;
  const y = now.getUTCFullYear().toString().padStart(4, '0');
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

export function GameHub(): JSX.Element {
  const { gameId } = useParams<{ gameId: string }>();
  if (gameId !== 'boat-shooter') {
    return <Navigate to="/" replace />;
  }
  return <BoatShooterHub />;
}

function BoatShooterHub(): JSX.Element {
  const progress = useBoatShooterProgress();
  const cleared = useMemo(() => new Set(progress?.stagesCleared ?? []), [progress]);
  const unlockedThrough = BOAT_SHOOTER_STAGES.reduce((acc, s, idx) => {
    if (idx === 0) return 1;
    const prev = BOAT_SHOOTER_STAGES[idx - 1]!;
    return cleared.has(prev.id) ? s.n : acc;
  }, 1);

  const daily = useMemo(currentDaily, []);
  const [topRows, setTopRows] = useState<readonly LeaderboardRow[]>([]);
  useEffect(() => {
    const lb = createLocalLeaderboard('boat-shooter', 'guest');
    void lb.fetch(`daily-${daily.dateKey}`, { limit: 3 }).then(setTopRows);
  }, [daily.dateKey]);

  const [diff, setDiff] = useState<string>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('boat-shooter-difficulty') ?? 'normal') : 'normal',
  );
  function chooseDiff(d: string): void {
    setDiff(d);
    try { localStorage.setItem('boat-shooter-difficulty', d); } catch { /* ignore */ }
  }
  const diffQ = diff === 'normal' ? '' : `&difficulty=${diff}`;

  return (
    <div className="h-full flex flex-col overflow-hidden p-3 md:p-4 gap-3">
      {/* Header strip */}
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-baseline gap-3">
          <Link to="/" className="text-xs uppercase tracking-wider text-sea-400 hover:text-gold-400">
            ← Academy
          </Link>
          <h1 className="font-display text-2xl md:text-3xl text-gold-400">Boat Shooter</h1>
          {progress && (progress.gems ?? 0) > 0 && (
            <span className="text-xs text-sea-300">💎 {progress.gems}</span>
          )}
        </div>
        <div className="flex gap-1.5 text-[10px] uppercase tracking-wider">
          {(['easy', 'normal', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => chooseDiff(d)}
              className={`px-2 py-0.5 rounded border transition-colors ${
                diff === d
                  ? 'border-gold-500 bg-gold-500/15 text-gold-400'
                  : 'border-sea-700 text-sea-300 hover:border-sea-500'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </header>

      {/* Top row: stages grid (left, 2/3) + daily run (right, 1/3) */}
      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
        <section className="col-span-2 flex flex-col min-h-0">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="font-display text-sm uppercase tracking-wider text-sea-300">Campaign · 15 stages</h2>
            <Link to="/meta/boat-shooter" className="text-[11px] uppercase tracking-wider text-sea-300 hover:text-gold-400">
              💎 Meta Shop →
            </Link>
          </div>
          <div className="flex-1 grid grid-cols-5 grid-rows-3 gap-1.5 min-h-0">
            {BOAT_SHOOTER_STAGES.map((s) => {
              const isCleared = cleared.has(s.id);
              const isLocked = s.n > unlockedThrough;
              const isNext = s.n === unlockedThrough && !isCleared;
              const base = 'rounded border p-1.5 text-center transition-colors flex flex-col justify-center min-h-0';
              const style = isLocked
                ? `${base} border-sea-800 bg-sea-900/50 text-sea-600 cursor-not-allowed`
                : isCleared
                ? `${base} border-green-700 bg-sea-900 hover:border-green-400`
                : isNext
                ? `${base} border-gold-500 bg-sea-900 hover:border-gold-400 ring-2 ring-gold-500/30`
                : `${base} border-sea-600 bg-sea-900 hover:border-gold-500`;
              const badge = isLocked ? '🔒' : isCleared ? '✓' : isNext ? '▶' : '';
              const inner = (
                <>
                  <div className="font-display text-xs md:text-sm text-gold-400 leading-tight">
                    {s.n} {badge}
                  </div>
                  <div className="text-[10px] md:text-[11px] text-sea-200 truncate leading-tight">{s.name}</div>
                </>
              );
              return isLocked ? (
                <div key={s.n} className={style}>{inner}</div>
              ) : (
                <Link key={s.n} to={`/game/boat-shooter?stage=${s.n}${diffQ}`} className={style}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col min-h-0">
          <h2 className="font-display text-sm uppercase tracking-wider text-sea-300 mb-1">Today&apos;s Run</h2>
          <Link
            to="/game/boat-shooter?daily=1"
            className="flex-1 rounded-lg border border-gold-600/60 bg-gradient-to-br from-sea-800 to-sea-900 hover:border-gold-400 transition-colors p-3 group flex flex-col gap-2 min-h-0 overflow-hidden"
          >
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gold-400 mb-0.5">
                Daily · {daily.dateKey}
              </div>
              <div className="font-display text-base md:text-lg text-sea-100 leading-tight">
                {DAILY_SHIP_NAMES[daily.shipId]}
              </div>
              <div className="text-[11px] text-gold-300">{DAILY_MODIFIER_LABELS[daily.modifier]}</div>
            </div>
            {topRows.length > 0 && (
              <ol className="border-t border-sea-700 pt-1 space-y-0.5">
                {topRows.map((r) => (
                  <li key={r.rank} className="flex items-center justify-between text-[11px]">
                    <span className="flex gap-1.5">
                      <span className="font-display text-gold-400 w-3 tabular-nums">{r.rank}</span>
                      <span className="text-sea-100 truncate max-w-[80px]">{r.username}</span>
                    </span>
                    <span className="font-display text-gold-400 tabular-nums">{r.score.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
            <span className="mt-auto text-[10px] uppercase tracking-wider font-sans text-sea-300 group-hover:text-gold-400 self-end">
              Play →
            </span>
          </Link>
        </section>
      </div>

      {/* Bottom row: design console links */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="font-display text-sm uppercase tracking-wider text-sea-300">Design console</h2>
          <span className="text-[10px] italic text-sea-500">Tune content live, no redeploy</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          <ConsoleLink to="/admin/boat-shooter/garage"       emoji="🛠"  label="Garage"       sub="Ships" />
          <ConsoleLink to="/admin/boat-shooter/enemy-lair"   emoji="🐙" label="Enemy Lair"   sub="29 enemies" />
          <ConsoleLink to="/admin/boat-shooter/levels"       emoji="📜" label="Level Design" sub="15 stages" />
          <ConsoleLink to="/admin/boat-shooter/environments" emoji="🌊" label="Environments" sub="7 biomes" />
          <ConsoleLink to="/admin/boat-shooter/abilities"    emoji="⚡" label="Abilities"    sub="13W · 8P" />
        </div>
      </section>
    </div>
  );
}

function ConsoleLink({
  to, emoji, label, sub,
}: {
  to: string; emoji: string; label: string; sub: string;
}): JSX.Element {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded border border-sea-700 bg-sea-900/60 hover:border-gold-500 hover:bg-sea-900 transition-colors px-2.5 py-2 group"
    >
      <span className="text-xl">{emoji}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-display text-sea-100 group-hover:text-gold-400 truncate">{label}</span>
        <span className="block text-[10px] uppercase tracking-wider text-sea-400 truncate">{sub}</span>
      </span>
    </Link>
  );
}
