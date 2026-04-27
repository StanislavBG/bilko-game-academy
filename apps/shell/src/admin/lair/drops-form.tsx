import type { EnemyDrops, EnemySpec } from '@bilko/boat-shooter-schema';
import { ENEMY_DROP_FIELDS, type EnemyDropKey } from '../garage/constants';

interface Props {
  enemy: EnemySpec;
  dirtyKeys: ReadonlySet<string>;
  onChange: (next: EnemySpec) => void;
}

export function DropsForm({ enemy, dirtyKeys, onChange }: Props): JSX.Element {
  function setDrop(key: EnemyDropKey, value: number): void {
    const nextDrops: EnemyDrops = { ...enemy.drops, [key]: value };
    onChange({ ...enemy, drops: nextDrops });
  }

  return (
    <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
      <h3 className="font-display text-lg text-gold-400 mb-3">Drops</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        {ENEMY_DROP_FIELDS.map((f) => {
          const raw = enemy.drops[f.key];
          const value = typeof raw === 'number' ? raw : 0;
          const dirty = dirtyKeys.has(`drops.${f.key}`);
          return (
            <div key={f.key} className="flex items-center gap-2">
              <label className="flex-1 text-sm text-sea-200 flex items-center gap-2">
                <span>{f.label}</span>
                {dirty && (
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-amber-400"
                    title="Unsaved change"
                  />
                )}
              </label>
              <button
                type="button"
                className="w-7 h-7 rounded border border-sea-600 text-sea-200 hover:border-gold-500 hover:text-gold-400"
                onClick={() => setDrop(f.key, Math.max(0, value - f.step))}
              >
                −
              </button>
              <input
                type="number"
                step={f.step}
                min={0}
                value={value}
                onChange={(e) => {
                  const v = e.target.value;
                  setDrop(f.key, v === '' ? 0 : Number(v));
                }}
                className="w-24 px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm tabular-nums focus:outline-none focus:border-gold-500"
              />
              <button
                type="button"
                className="w-7 h-7 rounded border border-sea-600 text-sea-200 hover:border-gold-500 hover:text-gold-400"
                onClick={() => setDrop(f.key, value + f.step)}
              >
                +
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-sea-200">
          <span>Gem chance</span>
          {dirtyKeys.has('drops.gemChance') && (
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          )}
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={enemy.drops.gemChance}
          onChange={(e) =>
            onChange({ ...enemy, drops: { ...enemy.drops, gemChance: Number(e.target.value) } })
          }
          className="flex-1"
        />
        <span className="w-14 text-right tabular-nums text-sm text-sea-100">
          {(enemy.drops.gemChance * 100).toFixed(0)}%
        </span>
      </div>
    </section>
  );
}
