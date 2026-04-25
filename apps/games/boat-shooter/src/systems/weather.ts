import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../constants';
import type { WaterBiome } from './water-shader';

/**
 * Biome weather overlay — particle-based ambient weather.
 *   sunlit     — no weather (clear skies; fallback for stages 4–5)
 *   rivermouth — drifting pollen / midges (Stage 1)
 *   channels   — dappled god-rays (Stage 2)
 *   open-sea   — wind spray + distant seabirds (Stage 3)
 *   fog        — drifting fog patches across the screen
 *   night      — subtle mist + occasional will-o-wisp glow
 *   volcanic   — ashfall particles drifting downward
 *
 * All particle counts halve under reduced-motion mode.
 */
export class WeatherSystem {
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(private readonly scene: StageScene) {}

  setBiome(biome: WaterBiome): void {
    this.clear();
    this.ensureTextures();
    const reduced = this.scene.fx.reducedMotion();
    const qMult = reduced ? 0.5 : 1;

    switch (biome) {
      case 'fog':
        this.addEmitter('weather-fog-puff', {
          x: { min: -100, max: WORLD_WIDTH + 100 },
          y: { min: 0, max: WORLD_HEIGHT },
          lifespan: 8000,
          scale: { start: 1, end: 2.5 },
          alpha: { start: 0.12, end: 0 },
          speedX: { min: 6, max: 20 },
          frequency: 300 / qMult,
          tint: 0xaac8d8,
          blendMode: 'NORMAL',
        });
        break;
      case 'night':
        this.addEmitter('weather-fog-puff', {
          x: { min: -100, max: WORLD_WIDTH + 100 },
          y: { min: 0, max: WORLD_HEIGHT },
          lifespan: 10000,
          scale: { start: 0.8, end: 2 },
          alpha: { start: 0.08, end: 0 },
          speedX: { min: 2, max: 10 },
          frequency: 800 / qMult,
          tint: 0x5a66aa,
        });
        break;
      case 'volcanic':
        this.addEmitter('weather-ash-flake', {
          x: { min: 0, max: WORLD_WIDTH },
          y: -20,
          lifespan: 10000,
          scale: { start: 0.6, end: 0.9 },
          alpha: { start: 0.6, end: 0 },
          speedY: { min: 40, max: 110 },
          speedX: { min: -20, max: 20 },
          frequency: 80 / qMult,
          tint: 0x555555,
        });
        break;
      case 'rivermouth':
        // Pollen / midges drifting slowly across the screen.
        this.addEmitter('weather-pollen-speck', {
          x: { min: -50, max: WORLD_WIDTH + 50 },
          y: { min: 0, max: WORLD_HEIGHT },
          lifespan: 6000,
          scale: { start: 1, end: 1 },
          alpha: { start: 0.25, end: 0 },
          speedX: { min: 10, max: 30 },
          speedY: { min: -8, max: 8 },
          frequency: 600 / qMult,
          tint: 0xffe9a0,
          blendMode: 'ADD',
        });
        break;
      case 'channels':
        // Dappled god-rays — vertical light streaks, additive blend.
        this.addEmitter('weather-god-ray', {
          x: { min: -50, max: WORLD_WIDTH + 50 },
          y: -60,
          lifespan: 2800,
          scale: { start: 1, end: 1 },
          alpha: { start: 0.06, end: 0 },
          speedY: { min: 60, max: 100 },
          speedX: { min: -8, max: 8 },
          frequency: 200 / qMult,
          tint: 0xffffff,
          blendMode: 'ADD',
        });
        break;
      case 'open-sea':
        // Wind spray — horizontal droplet streaks.
        this.addEmitter('weather-spray-drop', {
          x: -40,
          y: { min: 0, max: WORLD_HEIGHT },
          lifespan: 1800,
          scale: { start: 1, end: 1 },
          alpha: { start: 0.35, end: 0 },
          speedX: { min: 80, max: 140 },
          speedY: { min: -4, max: 4 },
          frequency: 80 / qMult,
          tint: 0xeaf6ff,
        });
        // Distant seabirds — tiny silhouettes drifting across the top band.
        this.addEmitter('weather-seabird', {
          x: -20,
          y: { min: 40, max: 160 },
          lifespan: 12000,
          scale: { start: 1, end: 1 },
          alpha: { start: 0.55, end: 0.55 },
          speedX: { min: 30, max: 55 },
          speedY: { min: -3, max: 3 },
          frequency: 2200 / qMult,
          tint: 0x2a3a4a,
        });
        break;
      case 'sunlit':
      default:
        // No ambient weather — clear water.
        break;
    }
  }

  clear(): void {
    this.emitters.forEach((e) => e.destroy());
    this.emitters = [];
  }

  private addEmitter(
    textureKey: string,
    cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
  ): void {
    const e = this.scene.add.particles(0, 0, textureKey, cfg);
    e.setDepth(800); // above gameplay, below HUD
    this.emitters.push(e);
  }

  private ensureTextures(): void {
    if (!this.scene.textures.exists('weather-fog-puff')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 0.6).fillCircle(32, 32, 30);
      g.fillStyle(0xffffff, 0.3).fillCircle(40, 28, 20);
      g.generateTexture('weather-fog-puff', 64, 64);
      g.destroy();
    }
    if (!this.scene.textures.exists('weather-ash-flake')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
      g.generateTexture('weather-ash-flake', 4, 4);
      g.destroy();
    }
    if (!this.scene.textures.exists('weather-pollen-speck')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1).fillCircle(2, 2, 1.4);
      g.fillStyle(0xffffff, 0.5).fillCircle(2, 2, 2);
      g.generateTexture('weather-pollen-speck', 4, 4);
      g.destroy();
    }
    if (!this.scene.textures.exists('weather-god-ray')) {
      // Narrow vertical gradient streak. Pre-tilted ~8° by drawing inside
      // a wider canvas so motion reads as angled light.
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 0.25).fillRect(3, 0, 2, 220);
      g.fillStyle(0xffffff, 0.12).fillRect(1, 0, 6, 220);
      g.generateTexture('weather-god-ray', 8, 220);
      g.destroy();
    }
    if (!this.scene.textures.exists('weather-spray-drop')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 0.9).fillRect(0, 1, 10, 1);
      g.fillStyle(0xffffff, 0.5).fillRect(0, 0, 6, 1);
      g.generateTexture('weather-spray-drop', 12, 3);
      g.destroy();
    }
    if (!this.scene.textures.exists('weather-seabird')) {
      // Simple seagull silhouette: two stroked arcs forming an "M".
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.lineStyle(1.2, 0xffffff, 1);
      g.beginPath();
      g.moveTo(0, 3);
      g.lineTo(6, 0);
      g.lineTo(12, 3);
      g.strokePath();
      g.generateTexture('weather-seabird', 14, 5);
      g.destroy();
    }
  }
}
