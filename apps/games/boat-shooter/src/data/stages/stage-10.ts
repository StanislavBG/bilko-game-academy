import type { StageSpec } from '../../systems/wave-spawner';

/**
 * Stage 10 — "Drowned Anchorage". Act II finale. Boss: Drowned Admiralty (B4) — 3 cursed ships.
 */
export const STAGE_10: StageSpec = {
  id: 'stage-10-drowned-anchorage',
  title: 'Drowned Anchorage',
  durationSec: 120,
  waves: [
    { at: 4, spawn: 'ghost-ship', count: 4, pattern: 'line' },
    { at: 12, spawn: 'cursed-swarm', count: 30, pattern: 'cluster' },
    { at: 24, spawn: 'sea-serpent', count: 2, pattern: 'cluster' },
    { at: 34, spawn: 'kraken-tentacle', count: 2, pattern: 'cluster' },
    { at: 44, spawn: 'ghost-ship', count: 5, pattern: 'flank-right' },
    { at: 56, spawn: 'cursed-swarm', count: 40, pattern: 'cluster' },
    { at: 66, spawn: 'broadside-cutter', count: 4, pattern: 'line' },
    { at: 78, spawn: 'ghost-ship', count: 4, pattern: 'cluster' },
    { at: 88, spawn: 'kraken-tentacle', count: 3, pattern: 'cluster' },
    { at: 100, spawn: 'cursed-swarm', count: 50, pattern: 'cluster' },
  ],
  boss: 'drowned-admiralty',
};
