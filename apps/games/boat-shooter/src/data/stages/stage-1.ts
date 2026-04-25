import type { StageSpec } from '../../systems/wave-spawner';

/**
 * Stage 1 — "Rivermouth". Act I intro stage.
 *
 * **Pacing rebalance (user feedback, 2026-04-23):** extended the arc to
 * 120s and halved early density so a first-time player has clear time to
 * kill, level up TWICE before the first Brigand, visit the merchant
 * (spawns at 30s), and reach the boss with a real build.
 *
 * Wave flow:
 *   0-15s:  Very light — 3 scouts total. Teaches movement + cannon feel.
 *   15-35s: Second scout wave + solo Brigand intro (no flanking yet).
 *           Merchant hut spawns at 30s (see merchant.ts).
 *   35-70s: Gunboats arrive one at a time; pairs of scouts fill gaps.
 *   70-100s: Ramp — brigand pairs + gunboat pair.
 *  100-120s: Pre-boss breath; final scout sweep so the player has
 *           a last ammo-and-XP top-up.
 *  120s:    Frigate Captain spawns (after arena clear).
 */
export const STAGE_1: StageSpec = {
  id: 'stage-1-rivermouth',
  title: 'Rivermouth',
  durationSec: 120,
  waves: [
    // 0-15s — 3 slow scouts. Nothing shoots dense yet.
    { at: 5, spawn: 'scout-skiff', count: 2, pattern: 'v-formation' },
    { at: 14, spawn: 'scout-skiff', count: 3, pattern: 'echelon' },

    // 15-35s — solo Brigand intro + small scout wave. Merchant @ 30s.
    { at: 26, spawn: 'ramming-brigand', count: 1, pattern: 'cluster' },
    { at: 34, spawn: 'scout-skiff', count: 3, pattern: 'crossfire' },

    // 35-70s — first Gunboat alone, then scout + brigand fill.
    { at: 46, spawn: 'patrol-gunboat', count: 1, pattern: 'cluster' },
    { at: 56, spawn: 'scout-skiff', count: 4, pattern: 'v-formation' },
    { at: 64, spawn: 'ramming-brigand', count: 1, pattern: 'cluster' },

    // 70-100s — mid-ramp, two gunboats.
    { at: 74, spawn: 'patrol-gunboat', count: 2, pattern: 'line' },
    { at: 84, spawn: 'scout-skiff', count: 4, pattern: 'crossfire' },
    { at: 94, spawn: 'ramming-brigand', count: 2, pattern: 'echelon' },

    // 100-120s — final pre-boss sweep.
    { at: 106, spawn: 'scout-skiff', count: 5, pattern: 'v-formation' },
  ],
  boss: 'frigate-captain',
};
