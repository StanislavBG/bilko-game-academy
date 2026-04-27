/**
 * Stage / wave schema.
 *
 * Mirrors the runtime types in `apps/games/boat-shooter/src/systems/wave-spawner.ts`
 * but is Phaser-free so the admin app + content package can depend on it.
 */
import type { EnemyId } from './enemy';
import type { EnvironmentId } from './environment';

export type WavePattern =
  | 'line'
  | 'cluster'
  | 'flank-left'
  | 'flank-right'
  | 'v-formation'
  | 'echelon'
  | 'crossfire'
  | 'staggered-line'
  | 'boss';

export interface Wave {
  /** Seconds into the stage when this wave triggers. */
  at: number;
  /** Enemy id to spawn (must exist in the enemy registry). */
  spawn: EnemyId;
  /** Number of copies. */
  count: number;
  pattern: WavePattern;
}

/**
 * Declarative procedural enemy spawner. Used in addition to or instead of
 * explicit `waves`. Spawn cadence ramps from `intensity.start` to
 * `intensity.end` over the stage's duration following the chosen `curve`.
 *
 * Pool entries can gate themselves to a window via `minStartSec`/`maxStartSec`,
 * so e.g. heavy enemies only appear in the back half of a stage.
 */
export interface EnemyFormula {
  kind: 'weighted-random';
  /** Spawn tick cadence in seconds. */
  tickSec: number;
  pool: ReadonlyArray<EnemyFormulaEntry>;
  intensity: {
    /** Spawns per tick at t=0 (typically 1). */
    start: number;
    /** Spawns per tick at t=durationSec. */
    end: number;
    curve: 'linear' | 'exp';
  };
}

export interface EnemyFormulaEntry {
  enemyId: EnemyId;
  /** Relative weight in the random draw. Higher = more frequent. */
  weight: number;
  /** Earliest stage time (sec) this enemy can spawn. Default 0. */
  minStartSec?: number;
  /** Latest stage time (sec) this enemy can spawn. Default durationSec. */
  maxStartSec?: number;
}

/**
 * How the runtime should populate enemies for a stage:
 * - `waves` — only `waves[]` is used (explicit timeline, current behavior).
 * - `formula` — only `enemyFormula` is used (procedural).
 * - `both` — explicit waves PLUS the formula run in parallel.
 */
export type StageSpawnMode = 'waves' | 'formula' | 'both';

export interface StageSpec {
  /** Internal id, e.g. `stage-1-rivermouth`. Used in URLs + leaderboards. */
  id: string;
  /** Player-facing display name. */
  title: string;
  /** Player-facing label `<act>-<stage>` e.g. `1-1`, `2-3`. */
  displayCode: string;
  /** Stage length before the boss spawn, in seconds. */
  durationSec: number;
  /** FK into the environments collection. Drives water/weather/scenery. */
  environmentId: EnvironmentId;
  /** Picks `waves` / `formula` / `both`. Defaults to `waves` if absent. */
  spawnMode?: StageSpawnMode;
  waves: Wave[];
  /** Optional procedural alternative / supplement to `waves`. */
  enemyFormula?: EnemyFormula;
  /** Enemy id spawned after all waves clear. */
  boss: EnemyId;
}
