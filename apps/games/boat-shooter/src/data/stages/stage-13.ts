import type { StageSpec } from '../../systems/wave-spawner';

/** Stage 13 — "Obsidian Plateau" — Obsidian Warlord boss. */
export const STAGE_13: StageSpec = {
  id: 'stage-13-obsidian-plateau',
  title: 'Obsidian Plateau',
  durationSec: 120,
  waves: [
    { at: 4, spawn: 'ramming-brigand', count: 4, pattern: 'cluster' },
    { at: 14, spawn: 'powder-keg-kamikaze', count: 2, pattern: 'cluster' },
    { at: 24, spawn: 'mortar-barge', count: 2, pattern: 'line' },
    { at: 34, spawn: 'ghost-ship', count: 3, pattern: 'flank-right' },
    { at: 46, spawn: 'powder-keg-kamikaze', count: 3, pattern: 'cluster' },
    { at: 56, spawn: 'broadside-cutter', count: 4, pattern: 'line' },
    { at: 68, spawn: 'ramming-brigand', count: 6, pattern: 'cluster' },
    { at: 80, spawn: 'mortar-barge', count: 2, pattern: 'line' },
    { at: 92, spawn: 'powder-keg-kamikaze', count: 4, pattern: 'cluster' },
    { at: 104, spawn: 'cursed-swarm', count: 30, pattern: 'cluster' },
  ],
  boss: 'obsidian-warlord',
};
