import type { StageSpec } from '../../systems/wave-spawner';

/** Stage 15 — "Kraken Bay" — the final fight. */
export const STAGE_15: StageSpec = {
  id: 'stage-15-kraken-bay',
  title: 'Kraken Bay',
  durationSec: 60,
  waves: [
    { at: 3, spawn: 'ghost-ship', count: 4, pattern: 'line' },
    { at: 15, spawn: 'cursed-swarm', count: 30, pattern: 'cluster' },
    { at: 30, spawn: 'kraken-tentacle', count: 2, pattern: 'cluster' },
    { at: 45, spawn: 'cursed-swarm', count: 40, pattern: 'cluster' },
  ],
  boss: 'kraken-ancient',
};
