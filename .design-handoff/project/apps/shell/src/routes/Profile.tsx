import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createGameSave } from '@bilko/platform-core';

/**
 * Profile — achievements + cosmetics wardrobe for Boat Shooter.
 *
 * For now, focused on Boat Shooter since it's the only game. Future
 * games can get their own sub-tabs or this view can become a "games"
 * selector that drills into per-game profiles.
 */

interface Progress {
  campaignsCleared?: number;
  totalCoinsLifetime?: number;
  gems?: number;
  ngPlus?: number;
  achievements?: string[];
  cosmetics?: { hull: string; sails: string; figurehead: string; wake: string };
  stagesCleared?: string[];
}

const ACH_CATALOG = [
  // Combat mastery
  { id: 'first-blood', title: 'First Blood', detail: 'Destroy your first enemy.' },
  { id: 'kill-1000', title: 'Scourge of the River', detail: 'Destroy 1,000 enemies lifetime.' },
  { id: 'first-crit', title: 'Dead Aim', detail: 'Land your first critical hit.' },
  { id: 'combo-100', title: 'Chained Fury', detail: 'Reach a 100-kill combo.' },
  { id: 'electrocute-10', title: 'Grounded', detail: 'Trigger Electrocute 10 times.' },
  { id: 'cataclysm', title: 'Cataclysmic', detail: 'Trigger Cataclysm.' },
  { id: 'shatter-boss', title: 'Shatter Shot', detail: 'Shatter a boss.' },
  { id: 'supernova-boss', title: 'Stellar', detail: 'Supernova a boss.' },
  { id: 'first-evo', title: 'Evolved', detail: 'Evolve your first weapon.' },
  // Progression
  { id: 'act-i', title: 'Master of the Delta', detail: 'Clear Act I.' },
  { id: 'act-ii', title: 'Through the Fog', detail: 'Clear Act II.' },
  { id: 'act-iii', title: 'Tamed the Volcano', detail: 'Clear Act III.' },
  { id: 'clear-normal', title: 'River Legend', detail: 'Complete the campaign.' },
  { id: 'clear-ngplus', title: 'Endless Tide', detail: 'Complete an NG+ run.' },
  { id: 'all-evolutions', title: 'Apex', detail: 'Evolve every weapon at least once.' },
  // Bosses
  { id: 'boss-frigate', title: 'Down Goes the Frigate', detail: 'Defeat HMS Thunderstrike.' },
  { id: 'boss-pirate-king', title: 'Regicide', detail: 'Defeat Admiral Scurvy.' },
  { id: 'boss-ghost-commodore', title: 'Exorcism', detail: 'Defeat the Ghost Commodore.' },
  { id: 'boss-obsidian', title: 'Ash to Ash', detail: 'Defeat the Obsidian Warlord.' },
  { id: 'boss-kraken', title: 'Kraken Slayer', detail: 'Defeat the Kraken Ancient.' },
  // Collection (abridged)
  { id: '100-gems-run', title: 'Treasure Hoard', detail: 'Collect 100 gems in a run.' },
];

const HULL_VARIANTS = ['default', 'oak', 'ebony', 'crimson', 'gold', 'obsidian'];
const SAILS_VARIANTS = ['anchor', 'skull', 'rose', 'compass', 'phoenix'];

export function Profile(): JSX.Element {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const save = createGameSave('boat-shooter');
    void save.load<Progress>('progress', {}).then(setProgress);
  }, []);

  async function setCosmetic(key: 'hull' | 'sails', val: string): Promise<void> {
    if (!progress || busy) return;
    setBusy(true);
    const save = createGameSave('boat-shooter');
    const full = await save.load<Progress>('progress', {});
    const cosmetics = { hull: 'default', sails: 'anchor', figurehead: 'golden', wake: 'white', ...(full.cosmetics ?? {}) };
    cosmetics[key] = val;
    await save.save('progress', { ...full, cosmetics });
    setProgress({ ...progress, cosmetics });
    setBusy(false);
  }

  if (!progress) return <div className="p-10 text-sea-300">Loading…</div>;

  const achievements = new Set(progress.achievements ?? []);
  const cosmetics = { hull: 'default', sails: 'anchor', figurehead: 'golden', wake: 'white', ...(progress.cosmetics ?? {}) };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h2 className="font-display text-3xl text-gold-400 mb-6">{t('nav.profile')}</h2>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="Campaigns Cleared" value={progress.campaignsCleared ?? 0} />
        <Stat label="Stages Cleared" value={(progress.stagesCleared ?? []).length} />
        <Stat label="NG+" value={progress.ngPlus ?? 0} />
        <Stat label="Lifetime Coins" value={(progress.totalCoinsLifetime ?? 0).toLocaleString()} />
      </section>

      <section className="mb-10">
        <h3 className="font-display text-2xl text-gold-400 mb-3">
          Achievements ({achievements.size}/{ACH_CATALOG.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ACH_CATALOG.map((a) => {
            const earned = achievements.has(a.id);
            return (
              <div
                key={a.id}
                className={`rounded border p-3 ${
                  earned
                    ? 'border-gold-500 bg-sea-900'
                    : 'border-sea-800 bg-sea-900/50 opacity-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className={`font-display ${earned ? 'text-gold-400' : 'text-sea-400'}`}>
                      {a.title}
                    </div>
                    <div className="text-xs text-sea-300 mt-0.5">{a.detail}</div>
                  </div>
                  {earned && <span className="text-gold-400 text-xl">✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="font-display text-2xl text-gold-400 mb-3">Wardrobe</h3>
        <div className="space-y-4">
          <WardrobeRow
            label="Hull"
            current={cosmetics.hull}
            options={HULL_VARIANTS}
            onSelect={(v) => setCosmetic('hull', v)}
          />
          <WardrobeRow
            label="Sails"
            current={cosmetics.sails}
            options={SAILS_VARIANTS}
            onSelect={(v) => setCosmetic('sails', v)}
          />
        </div>
        <p className="text-xs text-sea-500 mt-4">
          Hull & sail variants apply automatically on your next run.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="bg-sea-900 rounded-lg p-3 border border-sea-700">
      <div className="font-display text-3xl text-gold-400 tabular-nums">{value}</div>
      <div className="text-xs text-sea-300 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function WardrobeRow({
  label,
  current,
  options,
  onSelect,
}: {
  label: string;
  current: string;
  options: readonly string[];
  onSelect: (v: string) => void;
}): JSX.Element {
  return (
    <div>
      <div className="text-sea-300 text-sm font-sans mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onSelect(o)}
            className={`px-3 py-1.5 rounded text-sm font-sans capitalize ${
              current === o
                ? 'bg-gold-500 text-sea-900'
                : 'bg-sea-900 border border-sea-700 text-sea-200 hover:border-gold-500'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
