import type { PassiveSpec, WeaponSpec } from '@bilko/boat-shooter-schema';

export type AbilityKind = 'weapons' | 'passives';

interface Props {
  kind: AbilityKind;
  weapons: ReadonlyArray<WeaponSpec>;
  passives: ReadonlyArray<PassiveSpec>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function AbilityList({
  kind,
  weapons,
  passives,
  selectedId,
  onSelect,
}: Props): JSX.Element {
  const items: ReadonlyArray<{ id: string; displayName: string; element: string; tier: number }> =
    kind === 'weapons'
      ? [...weapons].sort((a, b) => a.id.localeCompare(b.id)).map((w) => ({
          id: w.id, displayName: w.displayName, element: w.element, tier: w.attackTier,
        }))
      : [...passives].sort((a, b) => a.id.localeCompare(b.id)).map((p) => ({
          id: p.id, displayName: p.displayName, element: p.element, tier: p.defenseTier,
        }));

  return (
    <div>
      <div className="p-3 text-xs uppercase tracking-wider text-sea-400 border-b border-sea-700">
        {kind === 'weapons' ? 'Weapons' : 'Passives'} ({items.length})
      </div>
      <ul>
        {items.map((it) => {
          const active = it.id === selectedId;
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onSelect(it.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  active ? 'bg-sea-700 text-gold-400' : 'text-sea-100 hover:bg-sea-800'
                }`}
              >
                <span className="px-1.5 py-0.5 rounded bg-sea-950 text-[10px] text-gold-400 border border-sea-700 uppercase tracking-wider">
                  {it.element}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-display text-sm truncate">{it.displayName}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-sea-300 truncate">
                    {it.id}
                  </span>
                </span>
                <span className="text-[10px] tabular-nums text-sea-300">T{it.tier}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
