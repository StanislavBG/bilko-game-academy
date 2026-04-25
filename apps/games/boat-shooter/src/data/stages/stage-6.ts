import type { StageSpec } from '../../systems/wave-spawner';

export const STAGE_6: StageSpec = {
  id: 'stage-6-fog-bay',
  title: 'Fog Bay',
  durationSec: 100,
  waves: [
    { at: 4, spawn: 'ghost-ship', count: 2, pattern: 'line' },
    { at: 14, spawn: 'cursed-swarm', count: 12, pattern: 'cluster' },
    { at: 22, spawn: 'ghost-ship', count: 2, pattern: 'flank-left' },
    { at: 32, spawn: 'broadside-cutter', count: 2, pattern: 'flank-right' },
    { at: 42, spawn: 'cursed-swarm', count: 18, pattern: 'cluster' },
    { at: 52, spawn: 'ghost-ship', count: 3, pattern: 'cluster' },
    { at: 62, spawn: 'sea-serpent', count: 1, pattern: 'cluster' },
    { at: 72, spawn: 'cursed-swarm', count: 24, pattern: 'cluster' },
    { at: 82, spawn: 'ghost-ship', count: 3, pattern: 'line' },
  ],
  boss: 'frigate-captain', // filler boss for stage 6; real Act II mini is stage 7
};
