import type { EnemyElement, EnemyKind, EnemySpec } from '@bilko/boat-shooter-schema';
import {
  ENEMY_DEATH_STYLES,
  ENEMY_ELEMENTS,
  ENEMY_KINDS,
  ENEMY_NUMERIC_FIELDS,
  type EnemyNumericKey,
} from '../garage/constants';

interface Props {
  enemy: EnemySpec;
  dirtyKeys: ReadonlySet<string>;
  onChange: (next: EnemySpec) => void;
}

function colorIntToHex(n: number): string {
  return `#${n.toString(16).padStart(6, '0').slice(-6)}`;
}

function hexToColorInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16) | 0;
}

export function EnemyStatsForm({ enemy, dirtyKeys, onChange }: Props): JSX.Element {
  function setNumeric(key: EnemyNumericKey, value: number): void {
    onChange({ ...enemy, [key]: value });
  }

  return (
    <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
      <h3 className="font-display text-lg text-gold-400 mb-3">Stats</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        {ENEMY_NUMERIC_FIELDS.map((f) => {
          const raw = enemy[f.key];
          const value = typeof raw === 'number' ? raw : 0;
          const dirty = dirtyKeys.has(f.key);
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
                onClick={() => setNumeric(f.key, +(value - f.step).toFixed(4))}
              >
                −
              </button>
              <input
                type="number"
                step={f.step}
                value={value}
                onChange={(e) => {
                  const v = e.target.value;
                  setNumeric(f.key, v === '' ? 0 : Number(v));
                }}
                className="w-24 px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm tabular-nums focus:outline-none focus:border-gold-500"
              />
              <button
                type="button"
                className="w-7 h-7 rounded border border-sea-600 text-sea-200 hover:border-gold-500 hover:text-gold-400"
                onClick={() => setNumeric(f.key, +(value + f.step).toFixed(4))}
              >
                +
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <label className="flex-1 text-sm text-sea-200 flex items-center gap-2">
            Element
            {dirtyKeys.has('element') && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            )}
          </label>
          <select
            value={enemy.element}
            onChange={(e) => onChange({ ...enemy, element: e.target.value as EnemyElement })}
            className="bg-sea-950 border border-sea-600 rounded px-2 py-1 text-sm text-sea-100"
          >
            {ENEMY_ELEMENTS.map((el) => (
              <option key={el} value={el}>
                {el}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex-1 text-sm text-sea-200 flex items-center gap-2">
            Kind
            {dirtyKeys.has('kind') && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            )}
          </label>
          <select
            value={enemy.kind}
            onChange={(e) => onChange({ ...enemy, kind: e.target.value as EnemyKind })}
            className="bg-sea-950 border border-sea-600 rounded px-2 py-1 text-sm text-sea-100"
          >
            {ENEMY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex-1 text-sm text-sea-200 flex items-center gap-2">
            Color
            {dirtyKeys.has('color') && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            )}
          </label>
          <input
            type="color"
            value={colorIntToHex(enemy.color)}
            onChange={(e) => onChange({ ...enemy, color: hexToColorInt(e.target.value) })}
            className="w-12 h-8 bg-sea-950 border border-sea-600 rounded cursor-pointer"
          />
          <code className="text-[10px] text-sea-400">0x{enemy.color.toString(16).padStart(6, '0')}</code>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex-1 text-sm text-sea-200 flex items-center gap-2">
            Death style
            {dirtyKeys.has('deathStyle') && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            )}
          </label>
          <select
            value={enemy.deathStyle ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                const next = { ...enemy };
                delete next.deathStyle;
                onChange(next);
              } else {
                onChange({ ...enemy, deathStyle: v as NonNullable<EnemySpec['deathStyle']> });
              }
            }}
            className="bg-sea-950 border border-sea-600 rounded px-2 py-1 text-sm text-sea-100"
          >
            <option value="">(default)</option>
            {ENEMY_DEATH_STYLES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex-1 text-sm text-sea-200 flex items-center gap-2">
            Sprite scale
            {dirtyKeys.has('spriteScale') && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            )}
          </label>
          <input
            type="number"
            step={0.05}
            value={enemy.spriteScale ?? ''}
            placeholder="auto"
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                const next = { ...enemy };
                delete next.spriteScale;
                onChange(next);
              } else {
                onChange({ ...enemy, spriteScale: Number(v) });
              }
            }}
            className="w-24 px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm tabular-nums focus:outline-none focus:border-gold-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex-1 text-sm text-sea-200 flex items-center gap-2">
            <input
              type="checkbox"
              checked={enemy.showAimReticle ?? false}
              onChange={(e) => {
                if (!e.target.checked) {
                  const next = { ...enemy };
                  delete next.showAimReticle;
                  onChange(next);
                } else {
                  onChange({ ...enemy, showAimReticle: true });
                }
              }}
            />
            <span>Show aim reticle</span>
            {dirtyKeys.has('showAimReticle') && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            )}
          </label>
        </div>
      </div>
    </section>
  );
}
