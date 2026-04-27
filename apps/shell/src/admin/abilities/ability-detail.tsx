import type {
  PassiveSpec,
  ShipSpec,
  SpriteManifest,
  WeaponElement,
  WeaponSpec,
} from '@bilko/boat-shooter-schema';
import {
  PASSIVE_CURVE_KEYS,
  WEAPON_CURVE_KEYS,
  WEAPON_ELEMENTS,
  WEAPON_TIERS,
} from '../garage/constants';
import { SpriteCard } from '../garage/sprite-card';

type Spec = WeaponSpec | PassiveSpec;

interface Props {
  kind: 'weapons' | 'passives';
  ability: Spec;
  sprites: SpriteManifest;
  refetchContent: () => void;
  dirtyKeys: ReadonlySet<string>;
  onChange: (next: Spec) => void;
}

export function AbilityDetail({
  kind,
  ability,
  sprites,
  refetchContent,
  dirtyKeys,
  onChange,
}: Props): JSX.Element {
  // SpriteCard's `ship` prop only reads id + displayName for alt text; the
  // `spriteId` override is what actually picks the asset. Same pattern as
  // the Lair page.
  const cardShip: Pick<ShipSpec, 'id' | 'displayName'> = {
    id: ability.id as unknown as ShipSpec['id'],
    displayName: ability.displayName,
  };
  const tierKey = kind === 'weapons' ? 'attackTier' : 'defenseTier';
  const tierValue = kind === 'weapons'
    ? (ability as WeaponSpec).attackTier
    : (ability as PassiveSpec).defenseTier;
  const curveKeys = kind === 'weapons' ? WEAPON_CURVE_KEYS : PASSIVE_CURVE_KEYS;
  const curves = (ability.curves ?? {}) as Record<string, ReadonlyArray<number> | undefined>;
  const presentCurveKeys = curveKeys.filter((k) => Array.isArray(curves[k]));
  const absentCurveKeys = curveKeys.filter((k) => !Array.isArray(curves[k]));

  function patch<K extends keyof Spec>(key: K, value: Spec[K]): void {
    onChange({ ...ability, [key]: value } as Spec);
  }

  function setCurveCell(curveKey: string, levelIdx: number, value: number): void {
    const existing = curves[curveKey] ?? [0, 0, 0, 0, 0, 0];
    const next = [...existing];
    while (next.length < 6) next.push(0);
    next[levelIdx] = value;
    onChange({ ...ability, curves: { ...curves, [curveKey]: next } } as Spec);
  }

  function addCurve(key: string): void {
    onChange({ ...ability, curves: { ...curves, [key]: [0, 0, 0, 0, 0, 0] } } as Spec);
  }

  function removeCurve(key: string): void {
    const next = { ...curves };
    delete next[key];
    onChange({ ...ability, curves: next } as Spec);
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-4">
      {/* Header */}
      <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
        <h3 className="font-display text-lg text-gold-400 mb-3">Header</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ID (read-only)" dirty={false}>
            <input
              type="text"
              value={ability.id}
              readOnly
              className="w-full px-2 py-1 bg-sea-950 border border-sea-700 rounded text-sea-400 text-sm"
            />
          </Field>
          <Field label="Display name" dirty={dirtyKeys.has('displayName')}>
            <input
              type="text"
              value={ability.displayName}
              onChange={(e) => patch('displayName', e.target.value)}
              className="w-full px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm focus:outline-none focus:border-gold-500"
            />
          </Field>
          <Field label="Tagline" dirty={dirtyKeys.has('taglineShort')}>
            <input
              type="text"
              value={ability.taglineShort}
              onChange={(e) => patch('taglineShort', e.target.value)}
              className="w-full px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm focus:outline-none focus:border-gold-500"
            />
          </Field>
          <Field label="Element" dirty={dirtyKeys.has('element')}>
            <select
              value={ability.element}
              onChange={(e) => patch('element', e.target.value as WeaponElement)}
              className="w-full px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm focus:outline-none focus:border-gold-500"
            >
              {WEAPON_ELEMENTS.map((el) => (
                <option key={el} value={el}>
                  {el}
                </option>
              ))}
            </select>
          </Field>
          <Field label={kind === 'weapons' ? 'Attack tier' : 'Defense tier'} dirty={dirtyKeys.has(tierKey)}>
            <select
              value={tierValue}
              onChange={(e) =>
                patch(tierKey as keyof Spec, Number(e.target.value) as Spec[keyof Spec])
              }
              className="w-full px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm focus:outline-none focus:border-gold-500"
            >
              {WEAPON_TIERS.map((t) => (
                <option key={t} value={t}>
                  T{t}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* Sprite icon */}
      <SpriteCard
        ship={cardShip as ShipSpec}
        sprites={sprites}
        spriteId={`icon-${ability.id}`}
        refetchContent={refetchContent}
      />

      {/* Level curves */}
      <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg text-gold-400">
            Level curves ({presentCurveKeys.length}/{curveKeys.length})
          </h3>
          {absentCurveKeys.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) addCurve(e.target.value);
              }}
              className="px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-xs focus:outline-none focus:border-gold-500"
            >
              <option value="">+ Add curve…</option>
              {absentCurveKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}
        </div>
        {presentCurveKeys.length === 0 && (
          <p className="text-xs italic text-sea-400">
            No curves authored. Add one to drive the runtime from data.
          </p>
        )}
        {presentCurveKeys.length > 0 && (
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-sea-400 uppercase tracking-wider">
                <th className="text-left py-1 pr-2">Key</th>
                {[0, 1, 2, 3, 4, 5].map((lvl) => (
                  <th key={lvl} className="px-1 text-right">L{lvl}</th>
                ))}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {presentCurveKeys.map((key) => {
                const arr = curves[key] ?? [];
                return (
                  <tr key={key}>
                    <td className="py-1 pr-2 text-sea-200">{key}</td>
                    {[0, 1, 2, 3, 4, 5].map((lvl) => (
                      <td key={lvl} className="px-1">
                        <input
                          type="number"
                          step={0.05}
                          value={arr[lvl] ?? 0}
                          onChange={(e) => setCurveCell(key, lvl, Number(e.target.value) || 0)}
                          className="w-full px-1 py-0.5 bg-sea-950 border border-sea-600 rounded text-sea-100 text-xs tabular-nums text-right focus:outline-none focus:border-gold-500"
                        />
                      </td>
                    ))}
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => removeCurve(key)}
                        className="px-1 text-sea-500 hover:text-red-400 text-xs"
                        title="Remove curve"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function Field({
  label,
  dirty,
  children,
}: {
  label: string;
  dirty: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="flex flex-col text-xs text-sea-300">
      <span className="mb-1 uppercase tracking-wider flex items-center gap-1">
        {label}
        {dirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" title="Unsaved" />}
      </span>
      {children}
    </label>
  );
}
