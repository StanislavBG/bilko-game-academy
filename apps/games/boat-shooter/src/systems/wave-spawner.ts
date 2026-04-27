import Phaser from 'phaser';
import type { EnemyFormula, StageSpawnMode } from '@bilko/boat-shooter-schema';
import type { StageScene } from '../scenes/stage-scene';
import type { Enemy } from '../entities/enemy';
import type { EnemyType } from '../entities/enemy-system';
import { WORLD_WIDTH, SAFE_AREA_MARGIN } from '../constants';
import { playBossIntro } from '../entities/bosses/boss-intro';

const BOSS_NAMES: Partial<Record<EnemyType, { name: string; subtitle: string }>> = {
  'frigate-captain': { name: 'HMS THUNDERSTRIKE', subtitle: 'Frigate Captain' },
  'delta-commodore': { name: 'HMS IRONCLAD MAJESTY', subtitle: 'The Delta Commodore' },
  'pirate-champion': { name: 'BLACK BARNACLE', subtitle: 'Pirate Champion' },
  'pirate-king': { name: 'CRIMSON MAW', subtitle: 'Admiral Scurvy — Pirate King' },
  'ghost-commodore': { name: 'HMS REGRET', subtitle: 'The Ghost Commodore' },
  'drowned-admiralty': { name: 'THE DROWNED ADMIRALTY', subtitle: 'Three ships, one soul' },
  'banshee-galleon': { name: 'WAILING VERITY', subtitle: 'Banshee Galleon' },
  'obsidian-warlord': { name: 'CAPTAIN MAGMAR', subtitle: 'Obsidian Warlord' },
  'kraken-ancient': { name: 'THE KRAKEN ANCIENT', subtitle: 'A god of the deep' },
};

export type SpawnType = EnemyType;

export interface Wave {
  /** Seconds into the stage when this wave triggers. */
  at: number;
  /** Enemy type to spawn. */
  spawn: SpawnType;
  /** How many copies to spawn (clustered in a small region). */
  count: number;
  /** Spawn pattern — determines formation. */
  pattern:
    | 'line'             // evenly spaced horizontal row
    | 'cluster'          // small randomized clump
    | 'flank-left'       // pile near left bank
    | 'flank-right'      // pile near right bank
    | 'v-formation'      // arrow pointing down (Raptor staple)
    | 'echelon'          // diagonal offset line
    | 'crossfire'        // two flanks converging
    | 'staggered-line'   // PRD 4 — N enemies dropped one per 200 ms across the width
    | 'boss';
}

export interface StageSpec {
  id: string;
  title: string;
  /**
   * Player-facing label like '1-1', '2-3' (act-stage). Doesn't change the
   * internal `id` — that's hardcoded into 25+ places. Consumed by the HUD
   * banner / run summary / leaderboard label per PRD 3.
   */
  displayCode: string;
  /** Full stage length before boss (seconds of active play). */
  durationSec: number;
  waves: Wave[];
  /** The boss that ends the stage. Spawns after the last wave. */
  boss: SpawnType;
  /** Optional FK into the environments collection — drives water/weather/scenery. */
  environmentId?: string;
  /** Picks `waves` / `formula` / `both`. Defaults to `waves` when absent. */
  spawnMode?: StageSpawnMode;
  /** Optional procedural alternative / supplement to `waves`. */
  enemyFormula?: EnemyFormula;
}

/**
 * WaveSpawner walks through a stage's wave timeline and drops enemies in
 * at scheduled times. After the last wave, it waits until all non-boss
 * enemies are cleared, then spawns the boss. Boss defeat → stage complete.
 */
export class WaveSpawner {
  readonly scene: StageScene;
  readonly spec: StageSpec;

  private elapsedSec = 0;
  private nextWaveIdx = 0;
  private bossSpawned = false;
  private boss: Enemy | null = null;

  constructor(scene: StageScene, spec: StageSpec) {
    this.scene = scene;
    this.spec = spec;
  }

  /** Time (ms) to delay wave spawning at stage start — covers the intro overlay. */
  private introBufferMs = 1500;
  /** Rolling accumulator for the formula spawner's tick cadence (ms). */
  private formulaTimerMs = 0;

  update(deltaMs: number): void {
    // Once the stage is over, freeze the wave timeline — no new spawns
    // during the loot-gathering window or after the stage-clear overlay.
    if (this.scene.stageEndedAt !== null) return;
    if (this.introBufferMs > 0) {
      this.introBufferMs -= deltaMs;
      return;
    }
    this.elapsedSec += deltaMs / 1000;

    const mode: StageSpawnMode = this.spec.spawnMode ?? 'waves';
    const runWaves = mode === 'waves' || mode === 'both';
    const runFormula = (mode === 'formula' || mode === 'both') && this.spec.enemyFormula;

    if (runWaves) {
      // Spawn due waves.
      while (
        this.nextWaveIdx < this.spec.waves.length &&
        this.spec.waves[this.nextWaveIdx]!.at <= this.elapsedSec
      ) {
        this.runWave(this.spec.waves[this.nextWaveIdx]!);
        this.nextWaveIdx += 1;
      }
    }

    if (runFormula) {
      this.runFormulaTick(deltaMs);
    }

    // After all waves and all regular enemies cleared, spawn the boss.
    // Formula-only stages skip the wave-index gate (there are no waves to
    // exhaust) but still wait until enemies clear before the boss arrives.
    const wavesExhausted = !runWaves || this.nextWaveIdx >= this.spec.waves.length;
    const formulaExhausted = !runFormula || this.elapsedSec >= this.spec.durationSec;
    if (
      !this.bossSpawned &&
      wavesExhausted &&
      formulaExhausted &&
      this.scene.enemies.count() === 0
    ) {
      this.spawnBoss();
    }

    // Boss defeated → stage complete. Also drop the boss-layer audio cue
    // so the choir pad fades out in sync with the death sting, plus the
    // hit-stop + zoom moment (doc 27 §3 GAP 7) that arcade shmups use to
    // punctuate the final blow.
    if (this.bossSpawned && this.boss && !this.boss.active) {
      this.scene.audio.setBossActive(false);
      this.playBossKillHitStop();
      this.scene.completeStage();
      this.boss = null; // prevent repeat
    }
  }

  /**
   * Hit-stop + camera zoom on boss defeat. 120 ms freeze-frame, then a
   * brief time-slow + 4% zoom for 280 ms before normal time resumes.
   * The stage-scene's multi-speed setup already scales the tween clock,
   * so we pop the Phaser time scale directly and snap back via a timer
   * on real wall-clock ms (setTimeout, not scene.time which is scaled).
   */
  private playBossKillHitStop(): void {
    if (this.scene.fx.reducedMotion()) return;
    const cam = this.scene.cameras.main;
    const baseZoom = cam.zoom;
    const baseTweenScale = this.scene.tweens.timeScale;
    const baseTimeScale = this.scene.time.timeScale;

    // Freeze frame.
    this.scene.tweens.timeScale = 0.01;
    this.scene.time.timeScale = 0.01;
    setTimeout(() => {
      this.scene.tweens.timeScale = 0.3;
      this.scene.time.timeScale = 0.3;
      cam.zoomTo(baseZoom * 1.04, 120, 'Quad.out');
    }, 120);
    setTimeout(() => {
      this.scene.tweens.timeScale = baseTweenScale;
      this.scene.time.timeScale = baseTimeScale;
      cam.zoomTo(baseZoom, 240, 'Quad.inOut');
    }, 400);
  }

  /** True between boss spawn and boss defeat — consumed by adaptive music. */
  bossIsActive(): boolean {
    return this.bossSpawned && this.boss !== null && this.boss.active;
  }

  private runWave(wave: Wave): void {
    const safeLeft = SAFE_AREA_MARGIN + 40;
    const safeRight = WORLD_WIDTH - SAFE_AREA_MARGIN - 40;
    const centerX = WORLD_WIDTH / 2;

    const spawnY = -80; // start above screen, drift in

    // Weekly-challenge density modifiers.
    const rs = this.scene.runState;
    let count = wave.count;
    if (wave.spawn === 'cursed-swarm' && rs.hasWeeklyModifier('triple-swarms')) count *= 3;
    if (wave.spawn === 'powder-keg-kamikaze' && rs.hasWeeklyModifier('double-kamikaze')) count *= 2;

    // PRD 4 — staggered-line drops one per 200 ms across the width.
    if (wave.pattern === 'staggered-line') {
      for (let i = 0; i < count; i++) {
        const x = safeLeft + ((safeRight - safeLeft) * i) / Math.max(1, count - 1);
        this.scene.time.delayedCall(i * 200, () => {
          this.scene.enemies.spawn(wave.spawn, Phaser.Math.Clamp(x, safeLeft, safeRight), spawnY);
        });
      }
      return;
    }

    for (let i = 0; i < count; i++) {
      let x = centerX;
      let y = spawnY;
      switch (wave.pattern) {
        case 'line':
          x = safeLeft + ((safeRight - safeLeft) * i) / Math.max(1, count - 1);
          break;
        case 'cluster':
          x = centerX + (Math.random() * 400 - 200);
          break;
        case 'flank-left':
          x = safeLeft + Math.random() * 60;
          break;
        case 'flank-right':
          x = safeRight - Math.random() * 60;
          break;
        case 'v-formation': {
          // Arrow pointing down — apex first, wings spreading behind.
          const half = (count - 1) / 2;
          const offset = i - half;
          x = centerX + offset * 110;
          y = spawnY - Math.abs(offset) * 70; // wings spawn higher (further behind apex)
          break;
        }
        case 'echelon': {
          // Diagonal staircase — each ship offset right + up from the previous.
          x = safeLeft + 220 + i * 130;
          y = spawnY - i * 60;
          break;
        }
        case 'crossfire': {
          // Two converging flanks — even index = left, odd = right.
          const isLeft = i % 2 === 0;
          x = isLeft ? safeLeft + Math.random() * 80 : safeRight - Math.random() * 80;
          y = spawnY - Math.floor(i / 2) * 80;
          break;
        }
        case 'boss':
          x = centerX;
          break;
      }
      this.scene.enemies.spawn(wave.spawn, Phaser.Math.Clamp(x, safeLeft, safeRight), y);
    }
  }

  private spawnBoss(): void {
    this.bossSpawned = true;
    const info = BOSS_NAMES[this.spec.boss as EnemyType];
    if (info) playBossIntro(this.scene, info.name, info.subtitle);
    this.boss = this.scene.enemies.spawn(this.spec.boss, WORLD_WIDTH / 2, -120);
    // Cue the boss audio layer — adaptive music locks the choir pad on.
    this.scene.audio.setBossActive(true);
  }

  /** Fraction (0..1) of time progressed, not counting the boss fight. */
  progress(): number {
    return Math.min(1, this.elapsedSec / this.spec.durationSec);
  }

  /**
   * Procedural alternative to the explicit wave timeline. Accumulates dt
   * until at least one tick interval has elapsed, then fires `spawns` enemies
   * drawn weighted-randomly from the pool. The pool is filtered by each
   * entry's `[minStartSec, maxStartSec]` window so heavy enemies can be
   * gated to the back half of the stage.
   *
   * Cap at 5 spawns per tick so a misconfigured curve can't flood the
   * world with enemies.
   * Complexity: O(spawns × pool.length) per tick — pool ≤ ~6, spawns ≤ 5.
   */
  private runFormulaTick(deltaMs: number): void {
    const formula = this.spec.enemyFormula;
    if (!formula) return;
    this.formulaTimerMs += deltaMs;
    const tickMs = Math.max(50, formula.tickSec * 1000);
    if (this.formulaTimerMs < tickMs) return;
    this.formulaTimerMs -= tickMs;

    const spawns = evalFormulaAt(formula, this.elapsedSec, this.spec.durationSec);
    if (spawns <= 0) return;

    const safeLeft = SAFE_AREA_MARGIN + 40;
    const safeRight = WORLD_WIDTH - SAFE_AREA_MARGIN - 40;
    const eligible = formula.pool.filter(
      (p) =>
        this.elapsedSec >= (p.minStartSec ?? 0) &&
        this.elapsedSec <= (p.maxStartSec ?? this.spec.durationSec),
    );
    if (eligible.length === 0) return;
    const totalWeight = eligible.reduce((s, p) => s + Math.max(0, p.weight), 0);
    if (totalWeight <= 0) return;

    for (let i = 0; i < spawns; i++) {
      let r = Math.random() * totalWeight;
      let pick = eligible[0]!;
      for (const entry of eligible) {
        r -= Math.max(0, entry.weight);
        if (r <= 0) { pick = entry; break; }
      }
      const x = Phaser.Math.Clamp(
        safeLeft + Math.random() * (safeRight - safeLeft),
        safeLeft, safeRight,
      );
      this.scene.enemies.spawn(pick.enemyId as EnemyType, x, -80);
    }
  }
}

/**
 * Pure evaluator — returns the integer spawn count this formula would emit
 * on a tick at `elapsedSec` of a stage that runs for `durationSec`. Easy to
 * verify by inspection; isolated from Phaser so unit tests / admin previews
 * can exercise the curve without booting a scene.
 *
 * Curve options:
 *   - 'linear' lerps `start → end` over t = elapsed/duration (clamped).
 *   - 'exp'    squares t before lerping, biasing spawns to the back half.
 * Result is rounded, clamped to [0, 5].
 */
export function evalFormulaAt(
  formula: EnemyFormula,
  elapsedSec: number,
  durationSec: number,
): number {
  const denom = Math.max(0.001, durationSec);
  const t = Math.max(0, Math.min(1, elapsedSec / denom));
  const shaped = formula.intensity.curve === 'exp' ? t * t : t;
  const raw = formula.intensity.start + (formula.intensity.end - formula.intensity.start) * shaped;
  return Math.max(0, Math.min(5, Math.round(raw)));
}
