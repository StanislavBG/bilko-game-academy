import { useEffect, useState } from 'react';

const CATALOG: Record<string, { title: string; detail: string }> = {
  'first-blood': { title: 'First Blood', detail: 'Destroy your first enemy.' },
  'first-crit': { title: 'Dead Aim', detail: 'Land your first crit.' },
  'combo-100': { title: 'Chained Fury', detail: '100-kill combo.' },
  'first-evo': { title: 'Evolved', detail: 'Evolve your first weapon.' },
  'all-evolutions': { title: 'Apex', detail: 'Evolve every weapon.' },
  'act-i': { title: 'Master of the Delta', detail: 'Clear Act I.' },
  'act-ii': { title: 'Through the Fog', detail: 'Clear Act II.' },
  'act-iii': { title: 'Tamed the Volcano', detail: 'Clear Act III.' },
  'clear-normal': { title: 'River Legend', detail: 'Complete the campaign.' },
  'clear-ngplus': { title: 'Endless Tide', detail: 'Complete an NG+ run.' },
  'boss-frigate': { title: 'Down Goes the Frigate', detail: 'HMS Thunderstrike defeated.' },
  'boss-pirate-king': { title: 'Regicide', detail: 'Admiral Scurvy defeated.' },
  'boss-ghost-commodore': { title: 'Exorcism', detail: 'Ghost Commodore defeated.' },
  'boss-obsidian': { title: 'Ash to Ash', detail: 'Obsidian Warlord defeated.' },
  'boss-kraken': { title: 'Kraken Slayer', detail: 'The Kraken Ancient defeated.' },
  '100-gems-run': { title: 'Treasure Hoard', detail: '100 gems in a run.' },
};

interface ToastItem {
  id: string;
  title: string;
  detail: string;
  at: number;
}

export function AchievementToasts({
  eventSource,
}: {
  eventSource: {
    subscribe(handler: (evt: { type: 'achievement'; id: string }) => void): () => void;
  } | null;
}): JSX.Element {
  const [queue, setQueue] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!eventSource) return;
    return eventSource.subscribe((evt) => {
      if (evt.type !== 'achievement') return;
      const def = CATALOG[evt.id];
      if (!def) return;
      setQueue((q) => [...q, { id: evt.id, title: def.title, detail: def.detail, at: Date.now() }]);
    });
  }, [eventSource]);

  useEffect(() => {
    if (queue.length === 0) return;
    const timeout = window.setTimeout(() => {
      setQueue((q) => q.slice(1));
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [queue]);

  return (
    <div className="fixed top-6 right-6 space-y-2 z-50">
      {queue.map((t) => (
        <div
          key={`${t.id}-${t.at}`}
          className="bg-sea-900 border border-gold-500 rounded-lg p-4 shadow-xl min-w-[280px] animate-in"
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">🏆</div>
            <div>
              <div className="text-xs text-sea-300 uppercase tracking-wider">Achievement</div>
              <div className="font-display text-lg text-gold-400">{t.title}</div>
              <div className="text-xs text-sea-200">{t.detail}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
