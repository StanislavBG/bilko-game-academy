import type { ShipBaselineDelta, ShipSpec } from '@bilko/boat-shooter-schema';
import { BASELINE_DELTA_FIELDS, type BaselineDeltaKey } from './constants';

interface Props {
  ship: ShipSpec;
  dirtyKeys: ReadonlySet<string>;
  onChange: (next: ShipSpec) => void;
}

export function StatsForm({ ship, dirtyKeys, onChange }: Props): JSX.Element {
  function setField(key: BaselineDeltaKey, value: number | undefined): void {
    const nextDelta: ShipBaselineDelta = { ...ship.baselineDelta };
    if (value === undefined) {
      delete nextDelta[key];
    } else {
      nextDelta[key] = value;
    }
    onChange({ ...ship, baselineDelta: nextDelta });
  }

  return (
    <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
      <h3 className="font-display text-lg text-gold-400 mb-3">Stats — baselineDelta</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        {BASELINE_DELTA_FIELDS.map((f) => {
          const raw = ship.baselineDelta[f.key];
          const value = typeof raw === 'number' ? raw : '';
          const dirty = dirtyKeys.has(`baselineDelta.${f.key}`);
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
                onClick={() => {
                  const cur = typeof raw === 'number' ? raw : 0;
                  setField(f.key, +(cur - f.step).toFixed(4));
                }}
              >
                −
              </button>
              <input
                type="number"
                step={f.step}
                value={value}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') setField(f.key, undefined);
                  else setField(f.key, Number(v));
                }}
                className="w-24 px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm tabular-nums focus:outline-none focus:border-gold-500"
              />
              <button
                type="button"
                className="w-7 h-7 rounded border border-sea-600 text-sea-200 hover:border-gold-500 hover:text-gold-400"
                onClick={() => {
                  const cur = typeof raw === 'number' ? raw : 0;
                  setField(f.key, +(cur + f.step).toFixed(4));
                }}
              >
                +
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
