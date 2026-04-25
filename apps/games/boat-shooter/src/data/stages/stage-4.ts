import type { StageSpec } from '../../systems/wave-spawner';

/**
 * Stage 4 — "Smuggler's Cove". First real pirate pressure. Kamikaze intro.
 */
export const STAGE_4: StageSpec = {
  id: 'stage-4-smugglers-cove',
  title: "Smuggler's Cove",
  durationSec: 100,
  waves: [
    { at: 4, spawn: 'ramming-brigand', count: 3, pattern: 'cluster' },
    { at: 12, spawn: 'broadside-cutter', count: 1, pattern: 'flank-right' },
    { at: 20, spawn: 'broadside-cutter', count: 1, pattern: 'flank-left' },
    { at: 28, spawn: 'grappling-boarders', count: 2, pattern: 'cluster' },
    { at: 36, spawn: 'powder-keg-kamikaze', count: 1, pattern: 'cluster' },
    { at: 44, spawn: 'broadside-cutter', count: 2, pattern: 'line' },
    { at: 52, spawn: 'ramming-brigand', count: 4, pattern: 'cluster' },
    { at: 60, spawn: 'grappling-boarders', count: 3, pattern: 'cluster' },
    { at: 68, spawn: 'powder-keg-kamikaze', count: 2, pattern: 'cluster' },
    { at: 78, spawn: 'broadside-cutter', count: 3, pattern: 'line' },
    { at: 88, spawn: 'ramming-brigand', count: 5, pattern: 'cluster' },
  ],
  // Stage 4 ends with the Frigate Captain again as a "stage cap" mini-threat;
  // in the final campaign this will be a Scurvy lieutenant. For now, reuse.
  boss: 'frigate-captain',
};
