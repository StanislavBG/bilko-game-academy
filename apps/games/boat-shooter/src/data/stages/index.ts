import type { StageSpec } from '../../systems/wave-spawner';
import { getActivePack } from '../../content/active-pack';

/**
 * Full 15-stage campaign registry.
 *
 * Stages live in the runtime ContentPack (bundled defaults overlaid
 * with whatever the content server returned at boot). All public
 * surface here reads through `getActivePack()` so a pack swap at boot
 * propagates without re-importing modules at consumer sites.
 *
 * Lookups are O(n) over the stage list (n=15) — fine for the call
 * frequencies (scene init, end-of-stage routing). The runtime never
 * mid-session-mutates the pack, so no cache invalidation is needed
 * if a hot path emerges later.
 */

/** All stages in campaign order. Reads the active pack each call. */
export function allStages(): readonly StageSpec[] {
  return getActivePack().stages as readonly StageSpec[];
}

/**
 * Resolve a stage by string id or 1-based integer index. Out-of-range
 * indices clamp to the campaign bounds; unknown string ids fall back
 * to the first stage. Mirrors the earlier API so callers don't deal
 * with optional-undefined.
 */
export function stageById(id: string | number): StageSpec {
  const stages = allStages();
  const first = stages[0];
  if (!first) throw new Error('[boat-shooter] active ContentPack has no stages');
  if (typeof id === 'number') {
    const i = Math.max(0, Math.min(stages.length - 1, id - 1));
    return stages[i] ?? first;
  }
  return stages.find((s) => s.id === id) ?? first;
}
