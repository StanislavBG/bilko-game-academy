import type { StageSpec } from '../../systems/wave-spawner';

/**
 * Stage 2 — "Inland Channels". Narrower passages, first Bank Sniper Towers.
 * Frigate Captain mini-boss at the end.
 */
export const STAGE_2: StageSpec = {
  id: 'stage-2-inland-channels',
  title: 'Inland Channels',
  durationSec: 100,
  waves: [
    { at: 4, spawn: 'scout-skiff', count: 5, pattern: 'v-formation' },
    { at: 10, spawn: 'bank-sniper-tower', count: 1, pattern: 'flank-left' },
    { at: 18, spawn: 'bank-sniper-tower', count: 1, pattern: 'flank-right' },
    { at: 22, spawn: 'patrol-gunboat', count: 2, pattern: 'echelon' },
    { at: 32, spawn: 'ramming-brigand', count: 3, pattern: 'crossfire' },
    { at: 42, spawn: 'mortar-barge', count: 1, pattern: 'cluster' },
    { at: 50, spawn: 'patrol-gunboat', count: 3, pattern: 'v-formation' },
    { at: 58, spawn: 'scout-skiff', count: 6, pattern: 'crossfire' },
    { at: 66, spawn: 'mortar-barge', count: 2, pattern: 'line' },
    { at: 74, spawn: 'patrol-gunboat', count: 3, pattern: 'echelon' },
    { at: 82, spawn: 'ramming-brigand', count: 4, pattern: 'crossfire' },
    { at: 90, spawn: 'scout-skiff', count: 7, pattern: 'v-formation' },
  ],
  boss: 'frigate-captain',
};
