import type { StageSpec } from '../../systems/wave-spawner';

export const STAGE_11: StageSpec = {
  id: 'stage-11-ashfall',
  title: 'Ashfall',
  durationSec: 110,
  waves: [
    { at: 3, spawn: 'kraken-tentacle', count: 1, pattern: 'cluster' },
    { at: 12, spawn: 'ghost-ship', count: 3, pattern: 'line' },
    { at: 22, spawn: 'mine-layer', count: 2, pattern: 'cluster' },
    { at: 32, spawn: 'cursed-swarm', count: 25, pattern: 'cluster' },
    { at: 42, spawn: 'kraken-tentacle', count: 2, pattern: 'cluster' },
    { at: 52, spawn: 'broadside-cutter', count: 4, pattern: 'line' },
    { at: 62, spawn: 'sea-serpent', count: 2, pattern: 'flank-right' },
    { at: 74, spawn: 'cursed-swarm', count: 40, pattern: 'cluster' },
    { at: 86, spawn: 'kraken-tentacle', count: 3, pattern: 'cluster' },
    { at: 96, spawn: 'ghost-ship', count: 4, pattern: 'cluster' },
  ],
  boss: 'pirate-champion',
};
