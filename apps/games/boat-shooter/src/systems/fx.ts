import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';

/**
 * FX system — centralized particle + visual effects.
 *
 * Wraps Phaser's particle emitters behind a tidy API so weapons, collisions,
 * deaths, and reactions can all call:
 *   scene.fx.muzzleFlash(x, y, color)
 *   scene.fx.explosion(x, y, radius, color)
 *   scene.fx.splash(x, y)
 *   scene.fx.hitSpark(x, y)
 *   scene.fx.wakeBurst(x, y)
 *
 * Runtime textures for particle shapes are generated in create() so we
 * don't depend on asset files.
 */

type TextureKey =
  | 'fx-dot'
  | 'fx-ring'
  | 'fx-smoke'
  | 'fx-spark'
  | 'fx-splash';

export class FxSystem {
  readonly scene: StageScene;
  /**
   * Shared trail emitter — replaces per-frame `scene.add.circle` calls in
   * `projectile.emitTrailDot`, `pickup-system` magnet sparkle, and
   * `enemy-system.emitBulletTrail`. ONE emitter instance vs. thousands of
   * Arc + Tween allocations per second. Phaser pools its particles
   * internally, so emit() is O(1) and the GC pressure goes near-zero.
   * Phaser perf-best-practices reference (2024-2025): always prefer a
   * shared ParticleEmitter over manual GameObject churn for trails/sparks.
   */
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: StageScene) {
    this.scene = scene;
    this.ensureTextures();
    this.buildTrailEmitter();
  }

  /**
   * One emitter, manual emit on demand. `manager.emitParticle` accepts
   * per-particle options — tint, lifespan, scale — so a single emitter
   * serves bullet trails, magnet sparkles, and enemy-bullet trails.
   */
  private buildTrailEmitter(): void {
    this.trailEmitter = this.scene.add.particles(0, 0, 'fx-dot', {
      lifespan: 280,
      scale: { start: 0.6, end: 0.15 },
      alpha: { start: 0.7, end: 0 },
      speed: 0,
      quantity: 0,
      emitting: false,
      blendMode: 'ADD',
    });
    this.trailEmitter.setDepth(8);
  }

  /**
   * Emit a single trail particle at (x, y). Used by every per-frame trail
   * path in the game. Tint/scale can be customised per call.
   * Reduced-motion suppresses the emit entirely (zero cost path).
   */
  trailDot(
    x: number, y: number,
    opts: { tint?: number; scale?: number; lifespan?: number } = {},
  ): void {
    if (this.reducedMotion()) return;
    this.trailEmitter.particleTint = opts.tint ?? 0xffffff;
    if (opts.scale !== undefined) {
      this.trailEmitter.particleScaleX = opts.scale;
      this.trailEmitter.particleScaleY = opts.scale;
    }
    if (opts.lifespan !== undefined) {
      this.trailEmitter.lifespan = opts.lifespan;
    }
    this.trailEmitter.emitParticleAt(x, y, 1);
  }

  /**
   * Pre-bake particle textures at 2× logical resolution. Phaser scales them
   * back down at render time, which gives us crisp edges on Retina / HiDPI
   * displays without a per-pixel cost at runtime. Legacy gameplay code
   * keeps using the same texture keys — only the source bitmaps change.
   */
  private ensureTextures(): void {
    const tex = this.scene.textures;
    if (!tex.exists('fx-dot')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(16, 16, 16);
      g.generateTexture('fx-dot', 32, 32);
      g.destroy();
    }
    if (!tex.exists('fx-ring')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.lineStyle(5, 0xffffff, 1);
      g.strokeCircle(32, 32, 26);
      g.generateTexture('fx-ring', 64, 64);
      g.destroy();
    }
    if (!tex.exists('fx-smoke')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x808080, 0.6);
      g.fillCircle(24, 24, 24);
      g.fillStyle(0xa0a0a0, 0.4);
      g.fillCircle(28, 20, 16);
      g.generateTexture('fx-smoke', 48, 48);
      g.destroy();
    }
    if (!tex.exists('fx-spark')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1);
      g.fillRect(6, 0, 4, 20);
      g.generateTexture('fx-spark', 16, 20);
      g.destroy();
    }
    if (!tex.exists('fx-splash')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xbddff7, 0.85);
      g.fillCircle(16, 16, 10);
      g.fillStyle(0xddeeff, 0.6);
      g.fillCircle(20, 12, 6);
      g.generateTexture('fx-splash', 32, 32);
      g.destroy();
    }
  }

  /** If reduced-motion is on, scale down particle counts + skip screen shake. */
  reducedMotion(): boolean {
    try {
      return this.scene.getCtx().settings.display.reducedMotion === true;
    } catch {
      return false;
    }
  }

  /** Colorblind-aware color remap for damage numbers + reaction bursts. */
  accessibleColor(baseHex: number, kind: 'crit' | 'dot' | 'normal' | 'reaction'): number {
    let palette: string;
    try {
      palette = this.scene.getCtx().settings.display.colorblindPalette;
    } catch {
      return baseHex;
    }
    if (palette === 'none') return baseHex;
    const map: Record<string, Record<string, number>> = {
      crit: { protanopia: 0x0077bb, deuteranopia: 0x0077bb, tritanopia: 0xee7733 },
      dot: { protanopia: 0xee7733, deuteranopia: 0xcc3311, tritanopia: 0x009988 },
      normal: { protanopia: 0xffffff, deuteranopia: 0xffffff, tritanopia: 0xffffff },
      reaction: { protanopia: 0x33bbee, deuteranopia: 0x33bbee, tritanopia: 0xee3377 },
    };
    return map[kind]?.[palette] ?? baseHex;
  }

  /**
   * Directional cannon flash — heavy orange cone, ember puff, bright core.
   * `heading` is the muzzle direction in radians. Used by Bow Cannon and
   * Broadside for shots that read as "boom".
   */
  muzzleFlashCannon(
    x: number,
    y: number,
    heading: number,
    color: number = 0xffd27a,
  ): void {
    const degHeading = (heading * 180) / Math.PI;
    const reduced = this.reducedMotion();
    const mult = reduced ? 0.5 : 1;

    // LONG fire tongue — 10 hot sparks streaking outward.
    const fire = this.scene.add.particles(x, y, 'fx-spark', {
      speed: { min: 260, max: 560 },
      lifespan: { min: 140, max: 260 },
      scale: { start: 1.4, end: 0.1 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      emitting: false,
      tint: [0xffe3a0, 0xffa848, 0xff7028],
      blendMode: 'ADD',
      angle: { min: degHeading - 18, max: degHeading + 18 },
    });
    fire.setDepth(23);
    fire.emitParticle(Math.round(10 * mult));

    // Bigger, slower ember cloud that drifts and fades.
    const embers = this.scene.add.particles(x, y, 'fx-spark', {
      speed: { min: 90, max: 220 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      emitting: false,
      tint: [0xffbf3a, 0xff6a20, 0xaa2a00],
      blendMode: 'ADD',
      angle: { min: degHeading - 45, max: degHeading + 45 },
    });
    embers.setDepth(22);
    embers.emitParticle(Math.round(8 * mult));

    // Grey smoke plume shaped forward.
    const puff = this.scene.add.particles(x, y, 'fx-smoke', {
      speed: { min: 70, max: 150 },
      lifespan: { min: 400, max: 750 },
      scale: { start: 0.8, end: 2 },
      alpha: { start: 0.8, end: 0 },
      quantity: 0,
      emitting: false,
      tint: 0x5a4032,
      angle: { min: degHeading - 30, max: degHeading + 30 },
    });
    puff.setDepth(18);
    puff.emitParticle(Math.round(5 * mult));

    // Two stacked flash discs — one wide low-alpha halo + one tight core —
    // so the blast reads as "big boom" at any zoom level.
    const halo = this.scene.add.image(x, y, 'fx-dot');
    halo.setTint(color);
    halo.setDepth(24);
    halo.setBlendMode(Phaser.BlendModes.ADD);
    halo.setScale(0.4);
    halo.setAlpha(0.75);
    this.scene.tweens.add({
      targets: halo,
      scale: { from: 0.4, to: 1.8 },
      alpha: { from: 0.75, to: 0 },
      duration: 160,
      onComplete: () => halo.destroy(),
    });

    const core = this.scene.add.image(x, y, 'fx-dot');
    core.setTint(0xffffff);
    core.setDepth(25);
    core.setBlendMode(Phaser.BlendModes.ADD);
    core.setScale(0.3);
    core.setAlpha(1);
    this.scene.tweens.add({
      targets: core,
      scale: { from: 0.3, to: 0.9 },
      alpha: { from: 1, to: 0 },
      duration: 90,
      onComplete: () => core.destroy(),
    });

    // No screen shake on cannon fire — user feedback 2026-04-24: firing
    // shake is noise, the only shake we want is on damage *taken* by the
    // player (handled in player.ts::takeDamage). Keeping shake off here
    // even when `!reduced` so settings don't re-enable it accidentally.

    this.scene.time.delayedCall(800, () => {
      fire.destroy();
      embers.destroy();
      puff.destroy();
    });
  }

  /** Sharp linear flash for a harpoon launch — no fire. */
  muzzleFlashHarpoon(x: number, y: number, heading: number): void {
    const len = 40;
    const g = this.scene.add.graphics();
    g.setDepth(24);
    g.setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(2, 0xffffff, 0.95);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(heading) * len, y + Math.sin(heading) * len);
    g.strokePath();
    this.scene.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0 },
      duration: 120,
      onComplete: () => g.destroy(),
    });
    // Two small splashes perpendicular to the shot axis — the harpoon
    // breaks the water surface as it leaves.
    const px = -Math.sin(heading);
    const py = Math.cos(heading);
    this.splash(x + px * 8, y + py * 8);
    this.splash(x - px * 8, y - py * 8);
  }

  /** Radial arc-cross for chain lightning weapons. */
  muzzleFlashChain(x: number, y: number): void {
    const sp = this.scene.add.particles(x, y, 'fx-spark', {
      speed: { min: 80, max: 160 },
      lifespan: { min: 80, max: 140 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      emitting: false,
      tint: 0xaaf0ff,
      blendMode: 'ADD',
      rotate: { min: 0, max: 360 },
    });
    sp.setDepth(24);
    sp.emitParticle(4);
    this.scene.time.delayedCall(200, () => sp.destroy());
  }

  /** Smaller orange flash for enemy muskets. */
  muzzleFlashMusket(x: number, y: number, heading: number): void {
    const degHeading = (heading * 180) / Math.PI;
    const sp = this.scene.add.particles(x, y, 'fx-spark', {
      speed: { min: 120, max: 240 },
      lifespan: { min: 70, max: 120 },
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      emitting: false,
      tint: 0xff8a4a,
      blendMode: 'ADD',
      angle: { min: degHeading - 12, max: degHeading + 12 },
    });
    sp.setDepth(22);
    sp.emitParticle(2);
    this.scene.time.delayedCall(200, () => sp.destroy());
  }

  /**
   * Gunpowder smoke wall trailing a Broadside salvo. `side` is -1 for port,
   * +1 for starboard. Emits a column of 5 staggered grey puffs.
   */
  broadsideSmokeWall(x: number, y: number, side: 1 | -1): void {
    // Denser column of grey puffs — 9 across the full flank height.
    for (const dy of [-24, -18, -12, -6, 0, 6, 12, 18, 24]) {
      const puff = this.scene.add.image(x, y + dy, 'fx-smoke');
      puff.setTint(0x6a5a50);
      puff.setAlpha(0.6);
      puff.setScale(0.35);
      puff.setDepth(17);
      this.scene.tweens.add({
        targets: puff,
        x: x + side * (50 + Math.random() * 30),
        scale: { from: 0.35, to: 1.2 },
        alpha: { from: 0.6, to: 0 },
        duration: 600 + Math.random() * 300,
        onComplete: () => puff.destroy(),
      });
    }
    // Hot ember streaks riding the smoke wall out to sea.
    const embers = this.scene.add.particles(x, y, 'fx-spark', {
      speed: { min: 160, max: 360 },
      lifespan: { min: 260, max: 500 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      emitting: false,
      tint: [0xffd27a, 0xff8a3a, 0xcc4020],
      blendMode: 'ADD',
      angle: side === -1 ? { min: 160, max: 200 } : { min: -20, max: 20 },
    });
    embers.setDepth(22);
    embers.emitParticle(this.reducedMotion() ? 5 : 12);
    this.scene.time.delayedCall(700, () => embers.destroy());
  }

  /** Short flash of sparks + small smoke when a weapon fires. */
  muzzleFlash(x: number, y: number, color: number = 0xffd85a): void {
    const emitter = this.scene.add.particles(x, y, 'fx-spark', {
      speed: { min: 180, max: 360 },
      lifespan: { min: 120, max: 220 },
      scale: { start: 1.0, end: 0.1 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      emitting: false,
      tint: color,
      blendMode: 'ADD',
      rotate: { min: 0, max: 360 },
    });
    emitter.setDepth(20);
    emitter.emitParticle(6);
    // Small puff.
    const puff = this.scene.add.particles(x, y, 'fx-smoke', {
      speed: { min: 40, max: 80 },
      lifespan: { min: 250, max: 400 },
      scale: { start: 0.6, end: 1.0 },
      alpha: { start: 0.5, end: 0 },
      quantity: 0,
      emitting: false,
      tint: 0x808080,
    });
    puff.setDepth(19);
    puff.emitParticle(2);
    this.scene.time.delayedCall(500, () => {
      emitter.destroy();
      puff.destroy();
    });
  }

  /** Big burst — explosion ring + smoke cloud + sparks. */
  explosion(x: number, y: number, radius: number = 80, color: number = 0xff8a3a): void {
    // Shock ring.
    const ring = this.scene.add.image(x, y, 'fx-ring');
    ring.setTint(color);
    ring.setDepth(21);
    ring.setScale(0.5);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 0.4, to: radius / 16 },
      alpha: { from: 1, to: 0 },
      duration: 500,
      onComplete: () => ring.destroy(),
    });

    // Sparks.
    const sparks = this.scene.add.particles(x, y, 'fx-spark', {
      speed: { min: 160, max: 420 },
      lifespan: { min: 260, max: 500 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      emitting: false,
      tint: color,
      rotate: { min: 0, max: 360 },
      blendMode: 'ADD',
    });
    sparks.setDepth(22);
    sparks.emitParticle(16);

    // Smoke.
    const smoke = this.scene.add.particles(x, y, 'fx-smoke', {
      speed: { min: 30, max: 100 },
      lifespan: { min: 600, max: 1200 },
      scale: { start: 0.8, end: 2.0 },
      alpha: { start: 0.7, end: 0 },
      quantity: 0,
      emitting: false,
      tint: 0x606060,
    });
    smoke.setDepth(18);
    smoke.emitParticle(8);

    this.scene.time.delayedCall(1400, () => {
      sparks.destroy();
      smoke.destroy();
    });
  }

  /** Brief splash when something hits the water surface. */
  splash(x: number, y: number): void {
    const splash = this.scene.add.particles(x, y, 'fx-splash', {
      speed: { min: 80, max: 180 },
      lifespan: { min: 300, max: 500 },
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 0.9, end: 0 },
      angle: { min: -120, max: -60 }, // upward arc
      quantity: 0,
      emitting: false,
    });
    splash.setDepth(6);
    splash.emitParticle(5);
    this.scene.time.delayedCall(600, () => splash.destroy());
  }

  /** Small hit-spark feedback when a projectile lands. */
  hitSpark(x: number, y: number, color: number = 0xffffff): void {
    const sp = this.scene.add.particles(x, y, 'fx-spark', {
      speed: { min: 100, max: 240 },
      lifespan: { min: 100, max: 220 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      quantity: 0,
      emitting: false,
      rotate: { min: 0, max: 360 },
      blendMode: 'ADD',
    });
    sp.setDepth(25);
    sp.emitParticle(4);
    this.scene.time.delayedCall(280, () => sp.destroy());
  }

  /** Wake bubbles trailing the boat or fast enemies. Optional tint lets
   *  different ships leave signature wake colors (ember / electric / frost). */
  wakeBurst(x: number, y: number, color?: number): void {
    const wake = this.scene.add.image(x, y, 'fx-splash');
    wake.setAlpha(0.5);
    wake.setScale(0.6);
    wake.setDepth(-50);
    if (color !== undefined) wake.setTint(color);
    this.scene.tweens.add({
      targets: wake,
      scale: { from: 0.4, to: 1.5 },
      alpha: { from: 0.5, to: 0 },
      duration: 900,
      onComplete: () => wake.destroy(),
    });
  }

  /** Projectile afterimage — ghost copies that fade. */
  projectileTrail(x: number, y: number, color: number, radius: number): void {
    const g = this.scene.add.circle(x, y, radius, color, 0.45);
    g.setDepth(9);
    this.scene.tweens.add({
      targets: g,
      alpha: { from: 0.45, to: 0 },
      scale: { from: 1, to: 0.3 },
      duration: 220,
      onComplete: () => g.destroy(),
    });
  }

  /** Preserve texture key typing in case more are added. */
  readonly _textureKeys: readonly TextureKey[] = ['fx-dot', 'fx-ring', 'fx-smoke', 'fx-spark', 'fx-splash'];
}
