import Phaser from 'phaser';
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
    | 'line'        // evenly spaced horizontal row
    | 'cluster'     // small randomized clump
    | 'flank-left'  // pile near left bank
    | 'flank-right' // pile near right bank
    | 'v-formation' // arrow pointing down (Raptor staple)
    | 'echelon'     // diagonal offset line
    | 'crossfire'   // two flanks converging
    | 'boss';
}

export interface StageSpec {
  id: string;
  title: string;
  /** Full stage length before boss (seconds of active play). */
  durationSec: number;
  waves: Wave[];
  /** The boss that ends the stage. Spawns after the last wave. */
  boss: SpawnType;
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

  update(deltaMs: number): void {
    // Once the stage is over, freeze the wave timeline — no new spawns
    // during the loot-gathering window or after the stage-clear overlay.
    if (this.scene.stageEndedAt !== null) return;
    if (this.introBufferMs > 0) {
      this.introBufferMs -= deltaMs;
      return;
    }
    this.elapsedSec += deltaMs / 1000;

    // Spawn due waves.
    while (
      this.nextWaveIdx < this.spec.waves.length &&
      this.spec.waves[this.nextWaveIdx]!.at <= this.elapsedSec
    ) {
      this.runWave(this.spec.waves[this.nextWaveIdx]!);
      this.nextWaveIdx += 1;
    }

    // After all waves and all regular enemies cleared, spawn the boss.
    if (
      !this.bossSpawned &&
      this.nextWaveIdx >= this.spec.waves.length &&
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
}
