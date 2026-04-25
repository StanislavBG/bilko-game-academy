import type { StageSpec } from '../../systems/wave-spawner';

/** Stage 12 — "Haunted Crater" — Banshee Galleon mini-boss. */
export const STAGE_12: StageSpec = {
  id: 'stage-12-haunted-crater',
  title: 'Haunted Crater',
  durationSec: 110,
  waves: [
    { at: 3, spawn: 'ghost-ship', count: 3, pattern: 'line' },
    { at: 14, spawn: 'cursed-swarm', count: 30, pattern: 'cluster' },
    { at: 24, spawn: 'sea-serpent', count: 2, pattern: 'cluster' },
    { at: 34, spawn: 'kraken-tentacle', count: 2, pattern: 'cluster' },
    { at: 44, spawn: 'ghost-ship', count: 4, pattern: 'flank-right' },
    { at: 56, spawn: 'cursed-swarm', count: 40, pattern: 'cluster' },
    { at: 66, spawn: 'ramming-brigand', count: 5, pattern: 'cluster' },
    { at: 78, spawn: 'kraken-tentacle', count: 3, pattern: 'cluster' },
    { at: 90, spawn: 'cursed-swarm', count: 50, pattern: 'cluster' },
  ],
  boss: 'banshee-galleon',
};
