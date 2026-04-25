import type { StageSpec } from '../../systems/wave-spawner';

export const STAGE_7: StageSpec = {
  id: 'stage-7-cursed-passage',
  title: 'Cursed Passage',
  durationSec: 110,
  waves: [
    { at: 3, spawn: 'ghost-ship', count: 2, pattern: 'line' },
    { at: 12, spawn: 'broadside-cutter', count: 2, pattern: 'cluster' },
    { at: 20, spawn: 'grappling-boarders', count: 3, pattern: 'cluster' },
    { at: 30, spawn: 'cursed-swarm', count: 20, pattern: 'cluster' },
    { at: 40, spawn: 'sea-serpent', count: 1, pattern: 'cluster' },
    { at: 50, spawn: 'ghost-ship', count: 3, pattern: 'flank-left' },
    { at: 60, spawn: 'ramming-brigand', count: 4, pattern: 'cluster' },
    { at: 70, spawn: 'cursed-swarm', count: 25, pattern: 'cluster' },
    { at: 80, spawn: 'ghost-ship', count: 4, pattern: 'line' },
    { at: 92, spawn: 'grappling-boarders', count: 4, pattern: 'cluster' },
  ],
  boss: 'pirate-champion',
};
