import type { StageSpec } from '../../systems/wave-spawner';

/**
 * Stage 3 — "The Delta Fleet". Heavy Navy; Delta Commodore boss.
 */
export const STAGE_3: StageSpec = {
  id: 'stage-3-delta-fleet',
  title: 'The Delta Fleet',
  durationSec: 110,
  waves: [
    { at: 3, spawn: 'patrol-gunboat', count: 3, pattern: 'v-formation' },
    { at: 10, spawn: 'scout-skiff', count: 7, pattern: 'crossfire' },
    { at: 18, spawn: 'mortar-barge', count: 1, pattern: 'cluster' },
    { at: 26, spawn: 'patrol-gunboat', count: 3, pattern: 'echelon' },
    { at: 34, spawn: 'bank-sniper-tower', count: 2, pattern: 'flank-right' },
    { at: 42, spawn: 'mortar-barge', count: 2, pattern: 'line' },
    { at: 52, spawn: 'patrol-gunboat', count: 4, pattern: 'crossfire' },
    { at: 62, spawn: 'scout-skiff', count: 9, pattern: 'v-formation' },
    { at: 72, spawn: 'mortar-barge', count: 2, pattern: 'echelon' },
    { at: 82, spawn: 'patrol-gunboat', count: 5, pattern: 'v-formation' },
    { at: 94, spawn: 'scout-skiff', count: 8, pattern: 'crossfire' },
  ],
  boss: 'delta-commodore',
};
