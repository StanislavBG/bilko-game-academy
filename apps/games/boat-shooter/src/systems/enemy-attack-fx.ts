import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import type { EnemyElement } from '../entities/enemy';

/**
 * Elemental attack FX palette (see docs/games/boat-shooter/22-enemy-enhancements.md §3).
 *
 * Three helpers per element:
 *   - chargeUp(scene, x, y, element, durationMs) — pre-fire wind-up VFX.
 *   - elementBulletTint(element)                 — projectile body tint.
 *   - impactFx(scene, x, y, element)             — on-hit / on-death flourish.
 *
 * All work is O(1) particle emits. Every helper checks scene.fx.reducedMotion()
 * before spawning particles; when reduced motion is on, we render a single
 * static dot as a minimal tell instead of a full animated burst.
 */

/** Returns the projectile-body tint for the given element. */
export function elementBulletTint(element: EnemyElement): number {
  switch (element) {
    case 'fire': return 0xff7428;
    case 'storm': return 0xaaf0ff;
    case 'frost': return 0x9adfff;
    case 'earth': return 0x8a5a2a;
    case 'shadow': return 0x6a2a8a;
    case 'physical':
    default:
      return 0xc8c8c8;
  }
}

/**
 * Draw a pre-fire charge-up tell at `(x,y)` for `durationMs`, flavored by
 * element. Callers are expected to fire the actual projectile(s) when the
 * duration elapses — this function only handles the visual.
 *
 * Returns a disposer the caller can invoke to cancel mid-flight (e.g. if
 * the enemy is killed during the tell).
 */
export function chargeUp(
  scene: StageScene,
  x: number,
  y: number,
  element: EnemyElement,
  durationMs: number,
): () => void {
  const reduced = scene.fx.reducedMotion();

  // Reduced-motion fast path: single static dot so the player still sees a tell.
  if (reduced) {
    const dot = scene.add.circle(x, y, 4, elementBulletTint(element), 0.9);
    dot.setDepth(9);
    scene.time.delayedCall(durationMs, () => dot.destroy());
    return () => dot.destroy();
  }

  // Shared disposer state.
  let cancelled = false;
  const toDestroy: Phaser.GameObjects.GameObject[] = [];
  const scheduled: Phaser.Time.TimerEvent[] = [];

  switch (element) {
    case 'physical': {
      // 120 ms white flash at the muzzle. We tick it over the full duration
      // to keep the tell visible for longer shots too.
      const flash = scene.add.image(x, y, 'fx-dot');
      flash.setTint(0xffffff);
      flash.setBlendMode(Phaser.BlendModes.ADD);
      flash.setDepth(22);
      flash.setScale(0.25);
      flash.setAlpha(0.9);
      scene.tweens.add({
        targets: flash,
        alpha: { from: 0.9, to: 0 },
        scale: { from: 0.25, to: 0.6 },
        duration: Math.min(150, durationMs),
        onComplete: () => flash.destroy(),
      });
      toDestroy.push(flash);
      break;
    }
    case 'fire': {
      // Ember-cone swell: particles emit forward with a soft glow halo.
      const halo = scene.add.image(x, y, 'fx-dot');
      halo.setTint(0xff8040);
      halo.setBlendMode(Phaser.BlendModes.ADD);
      halo.setDepth(21);
      halo.setAlpha(0.5);
      halo.setScale(0.25);
      scene.tweens.add({
        targets: halo,
        scale: { from: 0.25, to: 0.9 },
        alpha: { from: 0.5, to: 0.15 },
        duration: durationMs,
      });
      const embers = scene.add.particles(x, y, 'fx-spark', {
        speed: { min: 30, max: 80 },
        lifespan: { min: 220, max: 360 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffcc60, 0xff7028, 0xaa2a00],
        blendMode: 'ADD',
        quantity: 0,
        emitting: false,
        rotate: { min: 0, max: 360 },
      });
      embers.setDepth(21);
      // Ramp up emission — 2 particles per 80 ms, stops at durationMs.
      const steps = Math.floor(durationMs / 80);
      for (let i = 0; i < steps; i++) {
        scheduled.push(
          scene.time.delayedCall(i * 80, () => embers.emitParticle(2)),
        );
      }
      toDestroy.push(halo, embers);
      break;
    }
    case 'storm': {
      // White-cyan arc build — flickering ADD-blended dot.
      const arc = scene.add.image(x, y, 'fx-dot');
      arc.setTint(0xaaf0ff);
      arc.setBlendMode(Phaser.BlendModes.ADD);
      arc.setDepth(22);
      arc.setScale(0.2);
      arc.setAlpha(0.8);
      scene.tweens.add({
        targets: arc,
        scale: { from: 0.2, to: 0.8 },
        alpha: { from: 0.8, to: 0.3 },
        duration: durationMs,
      });
      // Flicker with a separate tween so it reads as arcing electricity.
      scene.tweens.add({
        targets: arc,
        alpha: 1,
        duration: 80,
        yoyo: true,
        repeat: Math.floor(durationMs / 160),
        ease: 'Sine.inOut',
      });
      toDestroy.push(arc);
      break;
    }
    case 'frost': {
      // Mist swell around the muzzle + pale crystal bloom.
      const mist = scene.add.image(x, y, 'fx-smoke');
      mist.setTint(0xcceeff);
      mist.setDepth(20);
      mist.setAlpha(0.55);
      mist.setScale(0.3);
      scene.tweens.add({
        targets: mist,
        scale: { from: 0.3, to: 1.0 },
        alpha: { from: 0.55, to: 0.1 },
        duration: durationMs,
      });
      toDestroy.push(mist);
      break;
    }
    case 'earth': {
      // Tremble: dust puff + small shakes on the muzzle point.
      const dust = scene.add.particles(x, y, 'fx-smoke', {
        speed: { min: 20, max: 50 },
        lifespan: { min: 200, max: 400 },
        scale: { start: 0.3, end: 0.8 },
        alpha: { start: 0.6, end: 0 },
        tint: 0x8a5a2a,
        quantity: 0,
        emitting: false,
      });
      dust.setDepth(19);
      const steps = Math.floor(durationMs / 100);
      for (let i = 0; i < steps; i++) {
        scheduled.push(scene.time.delayedCall(i * 100, () => dust.emitParticle(2)));
      }
      toDestroy.push(dust);
      break;
    }
    case 'shadow': {
      // Void pulse at muzzle — purple ADD-blended dot that slowly grows.
      const pulse = scene.add.image(x, y, 'fx-dot');
      pulse.setTint(0x9c40d4);
      pulse.setBlendMode(Phaser.BlendModes.ADD);
      pulse.setDepth(21);
      pulse.setAlpha(0.4);
      pulse.setScale(0.3);
      scene.tweens.add({
        targets: pulse,
        scale: { from: 0.3, to: 1.2 },
        alpha: { from: 0.4, to: 0 },
        duration: durationMs,
      });
      toDestroy.push(pulse);
      break;
    }
    default: {
      // Unknown element → physical fallback.
      break;
    }
  }

  // Auto-cleanup after the duration, plus a small grace window for particles.
  scene.time.delayedCall(durationMs + 400, () => {
    for (const obj of toDestroy) obj.destroy();
  });

  return () => {
    if (cancelled) return;
    cancelled = true;
    for (const ev of scheduled) ev.remove(false);
    for (const obj of toDestroy) obj.destroy();
  };
}

/**
 * Element-flavored impact burst at `(x,y)`. Used both for projectile hits and
 * as the "finishing" flourish on an element-attributed kill (see Enemy.kill).
 */
export function impactFx(
  scene: StageScene,
  x: number,
  y: number,
  element: EnemyElement,
): void {
  if (scene.fx.reducedMotion()) return;

  switch (element) {
    case 'physical': {
      // Splinter-burst + small smoke puff.
      const splinters = scene.add.particles(x, y, 'fx-spark', {
        speed: { min: 120, max: 280 },
        lifespan: { min: 200, max: 380 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0x9a6a3a, 0x6a4020, 0x3a2010],
        quantity: 0,
        emitting: false,
        rotate: { min: 0, max: 360 },
      });
      splinters.setDepth(22);
      splinters.emitParticle(8);
      scene.time.delayedCall(500, () => splinters.destroy());
      break;
    }
    case 'fire': {
      // Burn patch + rising smoke ring.
      const patch = scene.add.circle(x, y, 18, 0xcc3a10, 0.55);
      patch.setDepth(5);
      scene.tweens.add({
        targets: patch,
        alpha: 0,
        scale: { from: 1, to: 1.6 },
        duration: 1800,
        onComplete: () => patch.destroy(),
      });
      const embers = scene.add.particles(x, y, 'fx-spark', {
        speed: { min: 80, max: 220 },
        lifespan: { min: 260, max: 460 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffd27a, 0xff6a20, 0xaa2a00],
        blendMode: 'ADD',
        quantity: 0,
        emitting: false,
      });
      embers.setDepth(22);
      embers.emitParticle(10);
      scene.time.delayedCall(700, () => embers.destroy());
      break;
    }
    case 'storm': {
      // Zigzag spark-ring + ozone puff.
      const sparks = scene.add.particles(x, y, 'fx-spark', {
        speed: { min: 160, max: 360 },
        lifespan: { min: 180, max: 320 },
        scale: { start: 1.0, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffffff, 0xaaf0ff, 0x88bbee],
        blendMode: 'ADD',
        quantity: 0,
        emitting: false,
        rotate: { min: 0, max: 360 },
      });
      sparks.setDepth(22);
      sparks.emitParticle(12);
      scene.time.delayedCall(500, () => sparks.destroy());
      break;
    }
    case 'frost': {
      // Freeze splinter ring + ice dust.
      const shards = scene.add.particles(x, y, 'fx-spark', {
        speed: { min: 140, max: 300 },
        lifespan: { min: 220, max: 400 },
        scale: { start: 1.1, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xeaffff, 0xaad8ff, 0x5a9fcc],
        blendMode: 'ADD',
        quantity: 0,
        emitting: false,
        rotate: { min: 0, max: 360 },
      });
      shards.setDepth(22);
      shards.emitParticle(12);
      scene.time.delayedCall(600, () => shards.destroy());
      break;
    }
    case 'earth': {
      // Shard ring + scattering debris.
      const chips = scene.add.particles(x, y, 'fx-spark', {
        speed: { min: 100, max: 240 },
        lifespan: { min: 260, max: 500 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0x8a5a2a, 0x6a4020, 0x3a2010],
        quantity: 0,
        emitting: false,
        rotate: { min: 0, max: 360 },
      });
      chips.setDepth(22);
      chips.emitParticle(8);
      scene.time.delayedCall(700, () => chips.destroy());
      break;
    }
    case 'shadow': {
      // Fading wraith wisps upward.
      const wisps = scene.add.particles(x, y, 'fx-smoke', {
        speed: { min: 40, max: 100 },
        lifespan: { min: 500, max: 900 },
        scale: { start: 0.6, end: 1.4 },
        alpha: { start: 0.8, end: 0 },
        tint: [0x33bbee, 0x6a2a8a, 0x220a44],
        blendMode: 'ADD',
        quantity: 0,
        emitting: false,
        angle: { min: -110, max: -70 },
      });
      wisps.setDepth(22);
      wisps.emitParticle(6);
      scene.time.delayedCall(1100, () => wisps.destroy());
      break;
    }
    default:
      break;
  }
}
