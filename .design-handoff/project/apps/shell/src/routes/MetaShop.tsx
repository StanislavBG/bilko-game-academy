import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createGameSave } from '@bilko/platform-core';

/**
 * Boat Shooter Meta Shop — spend persistent gems on the 7 upgrade tracks.
 *
 * Duplicates the tracks + cost curve locally (imported values would require
 * a dev-time import from the game package). Kept in sync by documentation;
 * the source of truth for effects is the game's `meta.ts`.
 */

const META_COSTS = [0, 5, 10, 20, 40, 80, 150, 280, 500, 800, 1200] as const;

type TrackId = 'hull' | 'engine' | 'cannons' | 'crew' | 'cargo' | 'luck' | 'reroll';

const TRACKS: { id: TrackId; name: string; tagline: string; describe(level: number): string }[] = [
  { id: 'hull', name: 'Hull', tagline: 'Max HP + passive regen at L10.', describe: (l) => l < 10 ? `+${l} max HP (total ${6 + l})` : '+11 max HP, +0.5 HP/s regen' },
  { id: 'engine', name: 'Engine', tagline: 'Speed + accel; Burst Dash at L10.', describe: (l) => l < 10 ? `+${l * 4}% speed/accel` : '+50% speed, BURST DASH unlocked' },
  { id: 'cannons', name: 'Cannons', tagline: 'Base damage.', describe: (l) => l < 10 ? `+${l * 3}% damage` : '+25% dmg + random starting passive' },
  { id: 'crew', name: 'Crew', tagline: 'Crit chance + multiplier.', describe: (l) => l < 10 ? `+${l * 2}% crit, +${(l * 0.05).toFixed(2)}× mult` : '+10% crit, +0.3× mult, +1 proj all weapons' },
  { id: 'cargo', name: 'Cargo', tagline: 'Magnet + coin value.', describe: (l) => l < 5 ? `+${l * 10}% magnet` : l < 10 ? `+${l * 15}% magnet, +${(l - 4) * 8}% coin` : '+50% magnet, +40% coin, +1 gem/stage' },
  { id: 'luck', name: 'Luck', tagline: 'Rare drop shift.', describe: (l) => l < 10 ? `+${l * 5}% luck` : '+50% luck, guaranteed Gold Chest per stage' },
  { id: 'reroll', name: 'Reroll', tagline: 'Merchant + level-up reroll.', describe: (l) => l < 10 ? `-${l * 5}% cost, ${Math.min(l, 3)} free rerolls` : 'Infinite free rerolls + BANISH' },
];

type Meta = Record<TrackId, number>;
const DEFAULT_META: Meta = { hull: 0, engine: 0, cannons: 0, crew: 0, cargo: 0, luck: 0, reroll: 0 };

interface Progress {
  gems?: number;
  meta?: Meta;
  mapFragments?: number;
  mapsAssembled?: string[];
}

const MAPS = [
  { id: 'gold-isles', name: 'The Gold Isles', detail: 'Hidden bonus boss.' },
  { id: 'drowned-shrine', name: 'The Drowned Shrine', detail: 'Dodge-only skill room.' },
  { id: 'volcanic-heart', name: 'The Volcanic Heart', detail: '5-minute endless survival.' },
  { id: 'kraken-lair', name: "The Kraken's Lair", detail: 'Harder Kraken variant.' },
  { id: 'admirals-secret', name: "The Admiral's Secret", detail: 'Alternate hard-mode campaign.' },
];
const FRAGMENTS_PER_MAP = 5;

export function MetaShop(): JSX.Element {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const save = createGameSave('boat-shooter');
    void save.load<Progress>('progress', {}).then((p) => {
      setProgress({
        gems: p.gems ?? 0,
        meta: { ...DEFAULT_META, ...(p.meta ?? {}) },
        mapFragments: p.mapFragments ?? 0,
        mapsAssembled: p.mapsAssembled ?? [],
      });
    });
  }, []);

  async function assembleMap(mapId: string): Promise<void> {
    if (!progress || busy) return;
    const frags = progress.mapFragments ?? 0;
    const assembled = progress.mapsAssembled ?? [];
    if (frags < FRAGMENTS_PER_MAP || assembled.includes(mapId)) return;
    setBusy(true);
    const save = createGameSave('boat-shooter');
    const full = await save.load<Progress>('progress', {});
    const newAssembled = [...(full.mapsAssembled ?? []), mapId];
    const next = { ...full, mapFragments: (full.mapFragments ?? 0) - FRAGMENTS_PER_MAP, mapsAssembled: newAssembled };
    await save.save('progress', next);
    setProgress({
      ...progress,
      mapFragments: next.mapFragments,
      mapsAssembled: newAssembled,
    });
    setBusy(false);
  }

  async function purchase(track: TrackId): Promise<void> {
    if (!progress || busy) return;
    const level = progress.meta?.[track] ?? 0;
    if (level >= 10) return;
    const cost = META_COSTS[level + 1];
    if (cost === undefined || (progress.gems ?? 0) < cost) return;
    setBusy(true);
    const save = createGameSave('boat-shooter');
    const full = await save.load<Progress & { version?: 1 }>('progress', {});
    const meta = { ...DEFAULT_META, ...(full.meta ?? {}) };
    meta[track] = level + 1;
    const next = { ...full, meta, gems: (full.gems ?? 0) - cost };
    await save.save('progress', next);
    setProgress({ gems: next.gems, meta });
    setBusy(false);
  }

  if (!progress) return <div className="p-10 text-sea-300">Loading…</div>;

  const gems = progress.gems ?? 0;
  const meta = progress.meta ?? DEFAULT_META;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-3xl text-gold-400">Boat Shooter — Meta Shop</h2>
          <p className="text-sea-300 text-sm mt-1">Spend gems on permanent upgrades that apply to every run.</p>
        </div>
        <div className="text-right">
          <div className="font-display text-4xl text-gold-400">💎 {gems}</div>
          <div className="text-xs text-sea-400 uppercase">gems banked</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {TRACKS.map((t) => {
          const level = meta[t.id];
          const maxed = level >= 10;
          const nextCost = maxed ? null : (META_COSTS[level + 1] ?? null);
          const canAfford = !maxed && nextCost !== null && gems >= nextCost;

          return (
            <div key={t.id} className="rounded-lg border border-sea-700 bg-sea-900 p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display text-xl text-gold-400">{t.name}</h3>
                <span className="text-xs text-sea-300 uppercase tracking-wider">Lvl {level}/10</span>
              </div>
              <p className="text-xs text-sea-400 mb-3">{t.tagline}</p>

              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-2 rounded ${i < level ? 'bg-gold-500' : 'bg-sea-800'}`}
                  />
                ))}
              </div>

              <div className="text-sm text-sea-200 mb-3">
                {level > 0 ? `Current: ${t.describe(level)}` : <em className="text-sea-400">No upgrades yet.</em>}
                {!maxed && (
                  <div className="text-sea-300 mt-1">Next: {t.describe(level + 1)}</div>
                )}
              </div>

              {maxed ? (
                <div className="text-center py-2 bg-sea-800 rounded text-gold-400 text-sm">MAXED</div>
              ) : (
                <button
                  disabled={!canAfford || busy}
                  onClick={() => purchase(t.id)}
                  className={`w-full py-2 rounded font-sans text-sm ${
                    canAfford
                      ? 'bg-gold-500/80 hover:bg-gold-500 text-sea-900 cursor-pointer'
                      : 'bg-sea-800 text-sea-600 cursor-not-allowed'
                  }`}
                >
                  Upgrade — 💎 {nextCost}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <section className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-gold-400">Treasure Maps</h3>
          <div className="text-sea-300 text-sm">
            🗺️ {progress.mapFragments ?? 0} fragments · {FRAGMENTS_PER_MAP} per map
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {MAPS.map((m) => {
            const assembled = (progress.mapsAssembled ?? []).includes(m.id);
            const canAssemble = (progress.mapFragments ?? 0) >= FRAGMENTS_PER_MAP && !assembled;
            return (
              <div key={m.id} className="rounded border border-sea-700 bg-sea-900 p-3">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="font-display text-gold-400">{m.name}</div>
                    <div className="text-xs text-sea-300 mt-0.5">{m.detail}</div>
                  </div>
                  {assembled && <span className="text-gold-400 text-sm">✓ Assembled</span>}
                </div>
                {!assembled && (
                  <button
                    disabled={!canAssemble || busy}
                    onClick={() => assembleMap(m.id)}
                    className={`mt-2 w-full py-1.5 rounded text-xs ${
                      canAssemble
                        ? 'bg-gold-500/80 hover:bg-gold-500 text-sea-900'
                        : 'bg-sea-800 text-sea-600 cursor-not-allowed'
                    }`}
                  >
                    Assemble (🗺️ {FRAGMENTS_PER_MAP})
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-8 text-center">
        <Link to="/" className="text-sea-300 hover:text-gold-400 text-sm">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
