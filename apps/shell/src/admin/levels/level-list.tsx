import { useMemo } from 'react';
import type { StageSpec } from '@bilko/boat-shooter-schema';

interface Props {
  stages: ReadonlyArray<StageSpec>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddStage: (act: string) => void;
  onDeleteStage: (id: string) => void;
}

const ACTS = ['1', '2', '3'] as const;

function actOf(stage: StageSpec): string {
  const head = stage.displayCode.split('-')[0];
  return head && /^[1-9]$/.test(head) ? head : '?';
}

export function LevelList({
  stages,
  selectedId,
  onSelect,
  onAddStage,
  onDeleteStage,
}: Props): JSX.Element {
  const grouped = useMemo(() => {
    const buckets: Record<string, StageSpec[]> = { '1': [], '2': [], '3': [], '?': [] };
    for (const s of stages) {
      const a = actOf(s);
      (buckets[a] ?? buckets['?']!).push(s);
    }
    for (const k of Object.keys(buckets)) {
      buckets[k]!.sort((a, b) => a.displayCode.localeCompare(b.displayCode));
    }
    return buckets;
  }, [stages]);

  return (
    <aside className="w-60 shrink-0 border-r border-sea-700 bg-sea-900/40 overflow-y-auto">
      {ACTS.map((act) => {
        const list = grouped[act] ?? [];
        return (
          <section key={act} className="py-2">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[10px] uppercase tracking-wider text-sea-500">Act {act}</span>
              <button
                type="button"
                onClick={() => onAddStage(act)}
                className="text-sea-500 hover:text-gold-400 text-xs"
                title="Add stage"
              >
                +
              </button>
            </div>
            <ul>
              {list.map((s) => {
                const active = s.id === selectedId;
                return (
                  <li key={s.id} className="flex items-stretch group">
                    <button
                      type="button"
                      onClick={() => onSelect(s.id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                        active ? 'bg-sea-700 text-gold-400' : 'text-sea-200 hover:bg-sea-800/60'
                      }`}
                    >
                      <span className="tabular-nums text-[10px] text-sea-400 w-7">{s.displayCode}</span>
                      <span className="truncate">{s.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete "${s.title}"?`)) onDeleteStage(s.id);
                      }}
                      title="Delete"
                      className="px-2 text-sea-700 group-hover:text-sea-500 hover:!text-red-400"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </aside>
  );
}
