import type { StageSpec } from '../../systems/wave-spawner';

/**
 * Stage 5 — "Red Harbor". Act I finale. Pirate King "Admiral Scurvy" boss.
 */
export const STAGE_5: StageSpec = {
  id: 'stage-5-red-harbor',
  title: 'Red Harbor',
  durationSec: 120,
  waves: [
    { at: 3, spawn: 'broadside-cutter', count: 2, pattern: 'line' },
    { at: 10, spawn: 'ramming-brigand', count: 3, pattern: 'cluster' },
    { at: 18, spawn: 'grappling-boarders', count: 2, pattern: 'cluster' },
    { at: 26, spawn: 'powder-keg-kamikaze', count: 2, pattern: 'cluster' },
    { at: 34, spawn: 'broadside-cutter', count: 3, pattern: 'line' },
    { at: 44, spawn: 'mine-layer', count: 1, pattern: 'cluster' },
    { at: 52, spawn: 'ramming-brigand', count: 5, pattern: 'cluster' },
    { at: 62, spawn: 'broadside-cutter', count: 3, pattern: 'flank-left' },
    { at: 70, spawn: 'grappling-boarders', count: 3, pattern: 'cluster' },
    { at: 80, spawn: 'powder-keg-kamikaze', count: 3, pattern: 'cluster' },
    { at: 92, spawn: 'ramming-brigand', count: 6, pattern: 'cluster' },
    { at: 104, spawn: 'broadside-cutter', count: 4, pattern: 'line' },
  ],
  boss: 'pirate-king',
};
