import { useMemo } from 'react';
import type { EnvironmentSpec } from '@bilko/boat-shooter-schema';

interface Props {
  environments: ReadonlyArray<EnvironmentSpec>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export function EnvList({
  environments,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
}: Props): JSX.Element {
  const grouped = useMemo(() => {
    const buckets = new Map<string, EnvironmentSpec[]>();
    for (const e of environments) {
      const arr = buckets.get(e.biome) ?? [];
      arr.push(e);
      buckets.set(e.biome, arr);
    }
    for (const arr of buckets.values()) arr.sort((a, b) => a.id.localeCompare(b.id));
    return [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [environments]);

  return (
    <aside className="w-72 shrink-0 border-r border-sea-700 bg-sea-900/60 overflow-y-auto">
      <div className="p-3 text-xs uppercase tracking-wider text-sea-400 border-b border-sea-700 flex items-center justify-between">
        <span>Environments ({environments.length})</span>
        <button
          type="button"
          onClick={onAdd}
          className="px-2 py-0.5 rounded border border-sea-700 text-sea-300 hover:border-gold-500 hover:text-gold-400"
          title="Add environment"
        >
          + Add
        </button>
      </div>
      {grouped.map(([biome, list]) => (
        <section key={biome} className="border-b border-sea-800/60">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-sea-400">
            {biome} ({list.length})
          </div>
          <ul>
            {list.map((env) => {
              const active = env.id === selectedId;
              return (
                <li key={env.id} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => onSelect(env.id)}
                    className={`flex-1 px-3 py-2 text-left transition-colors ${
                      active ? 'bg-sea-700 text-gold-400' : 'text-sea-100 hover:bg-sea-800'
                    }`}
                  >
                    <span className="block font-display text-sm truncate">{env.name}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-sea-300 truncate">
                      {env.weather} · fog {Math.round(env.fogOpacity * 100)}% · scroll ×{env.riverScrollSpeedMul}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete environment "${env.name}"?`)) onDelete(env.id);
                    }}
                    title="Delete environment"
                    className="px-2 text-sea-500 hover:text-red-400"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </aside>
  );
}
