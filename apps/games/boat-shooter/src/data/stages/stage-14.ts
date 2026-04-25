import type { StageSpec } from '../../systems/wave-spawner';

export const STAGE_14: StageSpec = {
  id: 'stage-14-final-gauntlet',
  title: 'Final Gauntlet',
  durationSec: 130,
  waves: [
    { at: 3, spawn: 'patrol-gunboat', count: 4, pattern: 'line' },
    { at: 10, spawn: 'ramming-brigand', count: 5, pattern: 'cluster' },
    { at: 20, spawn: 'ghost-ship', count: 4, pattern: 'flank-right' },
    { at: 30, spawn: 'mortar-barge', count: 2, pattern: 'line' },
    { at: 40, spawn: 'cursed-swarm', count: 40, pattern: 'cluster' },
    { at: 50, spawn: 'powder-keg-kamikaze', count: 4, pattern: 'cluster' },
    { at: 60, spawn: 'sea-serpent', count: 3, pattern: 'cluster' },
    { at: 72, spawn: 'broadside-cutter', count: 6, pattern: 'line' },
    { at: 84, spawn: 'grappling-boarders', count: 5, pattern: 'cluster' },
    { at: 96, spawn: 'kraken-tentacle', count: 3, pattern: 'cluster' },
    { at: 108, spawn: 'cursed-swarm', count: 60, pattern: 'cluster' },
    { at: 120, spawn: 'kraken-tentacle', count: 4, pattern: 'cluster' },
  ],
  boss: 'banshee-galleon',
};
