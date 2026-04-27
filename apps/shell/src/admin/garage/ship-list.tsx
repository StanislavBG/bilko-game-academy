import type { ShipSpec } from '@bilko/boat-shooter-schema';
import { spriteUrl } from './api-client';

interface Props {
  ships: ReadonlyArray<ShipSpec>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ShipList({ ships, selectedId, onSelect }: Props): JSX.Element {
  return (
    <aside className="w-60 shrink-0 border-r border-sea-700 bg-sea-900/60 overflow-y-auto">
      <div className="p-3 text-xs uppercase tracking-wider text-sea-400 border-b border-sea-700">
        Ships ({ships.length})
      </div>
      <ul>
        {ships.map((s) => {
          const active = s.id === selectedId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  active
                    ? 'bg-sea-700 text-gold-400'
                    : 'text-sea-100 hover:bg-sea-800'
                }`}
              >
                <img
                  src={spriteUrl(`player-${s.id}`)}
                  alt=""
                  width={48}
                  height={48}
                  loading="lazy"
                  className="w-12 h-12 object-contain bg-sea-950 rounded"
                  onError={(e) => {
                    // Hide the broken image silently — sprite may not exist yet.
                    (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                  }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block font-display text-sm truncate">{s.displayName}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-sea-300">
                    {s.element}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
