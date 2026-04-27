import { useMemo, useState } from 'react';
import type { EnemyKind, EnemySpec } from '@bilko/boat-shooter-schema';
import { spriteUrl } from '../garage/api-client';
import { ENEMY_KINDS } from '../garage/constants';

interface Props {
  enemies: ReadonlyArray<EnemySpec>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const KIND_LABEL: Record<EnemyKind, string> = {
  'fodder': 'Fodder',
  'standard': 'Standard',
  'mini-boss': 'Mini-bosses',
  'boss': 'Bosses',
};

export function EnemyList({ enemies, selectedId, onSelect }: Props): JSX.Element {
  // O(n) bucketing — enemies count stays under ~30, well within scalar territory.
  const grouped = useMemo(() => {
    const buckets: Record<EnemyKind, EnemySpec[]> = {
      'fodder': [],
      'standard': [],
      'mini-boss': [],
      'boss': [],
    };
    for (const e of enemies) buckets[e.kind].push(e);
    return buckets;
  }, [enemies]);

  const [collapsed, setCollapsed] = useState<Record<EnemyKind, boolean>>({
    'fodder': false,
    'standard': false,
    'mini-boss': false,
    'boss': false,
  });

  return (
    <aside className="w-60 shrink-0 border-r border-sea-700 bg-sea-900/60 overflow-y-auto">
      <div className="p-3 text-xs uppercase tracking-wider text-sea-400 border-b border-sea-700">
        Enemies ({enemies.length})
      </div>
      {ENEMY_KINDS.map((kind) => {
        const list = grouped[kind];
        const isOpen = !collapsed[kind];
        return (
          <section key={kind} className="border-b border-sea-800/60">
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [kind]: !c[kind] }))}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider text-sea-400 hover:text-gold-400"
            >
              <span>
                {KIND_LABEL[kind]} ({list.length})
              </span>
              <span>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <ul>
                {list.map((e) => {
                  const active = e.id === selectedId;
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(e.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                          active ? 'bg-sea-700 text-gold-400' : 'text-sea-100 hover:bg-sea-800'
                        }`}
                      >
                        <img
                          src={spriteUrl(e.id)}
                          alt=""
                          width={36}
                          height={36}
                          loading="lazy"
                          className="w-9 h-9 object-contain bg-sea-950 rounded"
                          onError={(ev) => {
                            (ev.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                          }}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block font-display text-sm truncate">{e.id}</span>
                          <span className="block text-[10px] uppercase tracking-wider text-sea-300">
                            {e.element}
                          </span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-sea-950 text-[10px] text-sea-200 tabular-nums">
                          {e.maxHp}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {list.length === 0 && (
                  <li className="px-3 py-2 text-[11px] italic text-sea-500">none</li>
                )}
              </ul>
            )}
          </section>
        );
      })}
    </aside>
  );
}
