import { STAGE_1 } from './stage-1';
import { STAGE_2 } from './stage-2';
import { STAGE_3 } from './stage-3';
import { STAGE_4 } from './stage-4';
import { STAGE_5 } from './stage-5';
import { STAGE_6 } from './stage-6';
import { STAGE_7 } from './stage-7';
import { STAGE_8 } from './stage-8';
import { STAGE_9 } from './stage-9';
import { STAGE_10 } from './stage-10';
import { STAGE_11 } from './stage-11';
import { STAGE_12 } from './stage-12';
import { STAGE_13 } from './stage-13';
import { STAGE_14 } from './stage-14';
import { STAGE_15 } from './stage-15';
import type { StageSpec } from '../../systems/wave-spawner';

/**
 * Full 15-stage campaign registry.
 */
export const STAGES: readonly StageSpec[] = [
  STAGE_1, STAGE_2, STAGE_3, STAGE_4, STAGE_5,
  STAGE_6, STAGE_7, STAGE_8, STAGE_9, STAGE_10,
  STAGE_11, STAGE_12, STAGE_13, STAGE_14, STAGE_15,
];

export function stageById(id: string | number): StageSpec {
  if (typeof id === 'number') {
    return STAGES[Math.max(0, Math.min(STAGES.length - 1, id - 1))] ?? STAGE_1;
  }
  return STAGES.find((s) => s.id === id) ?? STAGE_1;
}
