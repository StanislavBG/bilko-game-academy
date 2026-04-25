import type { StageSpec } from '../../systems/wave-spawner';

/**
 * Stage 8 — "Hallowed Waters". Boss: Ghost Commodore (B3).
 */
export const STAGE_8: StageSpec = {
  id: 'stage-8-hallowed-waters',
  title: 'Hallowed Waters',
  durationSec: 115,
  waves: [
    { at: 4, spawn: 'ghost-ship', count: 3, pattern: 'line' },
    { at: 14, spawn: 'cursed-swarm', count: 15, pattern: 'cluster' },
    { at: 24, spawn: 'ghost-ship', count: 3, pattern: 'flank-right' },
    { at: 34, spawn: 'sea-serpent', count: 1, pattern: 'cluster' },
    { at: 44, spawn: 'cursed-swarm', count: 25, pattern: 'cluster' },
    { at: 54, spawn: 'ghost-ship', count: 4, pattern: 'cluster' },
    { at: 66, spawn: 'cursed-swarm', count: 30, pattern: 'cluster' },
    { at: 76, spawn: 'ghost-ship', count: 4, pattern: 'line' },
    { at: 88, spawn: 'sea-serpent', count: 2, pattern: 'cluster' },
    { at: 100, spawn: 'cursed-swarm', count: 35, pattern: 'cluster' },
  ],
  boss: 'ghost-commodore',
};
