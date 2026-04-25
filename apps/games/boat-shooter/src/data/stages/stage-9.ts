import type { StageSpec } from '../../systems/wave-spawner';

export const STAGE_9: StageSpec = {
  id: 'stage-9-serpent-narrows',
  title: 'Serpent Narrows',
  durationSec: 110,
  waves: [
    { at: 3, spawn: 'sea-serpent', count: 1, pattern: 'cluster' },
    { at: 12, spawn: 'cursed-swarm', count: 25, pattern: 'cluster' },
    { at: 22, spawn: 'kraken-tentacle', count: 1, pattern: 'cluster' },
    { at: 32, spawn: 'ghost-ship', count: 3, pattern: 'flank-left' },
    { at: 42, spawn: 'sea-serpent', count: 2, pattern: 'line' },
    { at: 52, spawn: 'cursed-swarm', count: 40, pattern: 'cluster' },
    { at: 62, spawn: 'kraken-tentacle', count: 2, pattern: 'cluster' },
    { at: 72, spawn: 'broadside-cutter', count: 3, pattern: 'line' },
    { at: 82, spawn: 'ghost-ship', count: 4, pattern: 'cluster' },
    { at: 92, spawn: 'sea-serpent', count: 2, pattern: 'cluster' },
  ],
  boss: 'pirate-champion',
};
