import type { StageScene } from '../scenes/stage-scene';

/**
 * Reusable enemy firing-pattern helpers.
 *
 * Inspired by Raptor + classic shmup bullet-hell geometry:
 *   - `fanSpread`  — N bullets in a symmetric wedge around an aim angle
 *   - `radialBurst` — N bullets in a full 360° ring, optionally offset
 *   - `arrowSpread` — tight V/arrow shape around aim
 *   - `twinStream` — two parallel bullets offset sideways from aim
 *   - `spiralShot` — single bullet at a rotating seed angle (caller holds state)
 *   - `aimLead` — predict player position Δt ahead for lead-aim
 *
 * All patterns spawn via `scene.enemies.spawnEnemyBullet(x, y, vx, vy, dmg)`.
 * The caller supplies the origin (usually the enemy's cannon position) and
 * damage. Keeps the math here; behavior stays in the enemy class.
 */

export interface PatternTarget {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

/** Predict target position Δt seconds in the future using current velocity. */
export function aimLead(target: PatternTarget, dtSec: number): { x: number; y: number } {
  return {
    x: target.x + (target.vx ?? 0) * dtSec,
    y: target.y + (target.vy ?? 0) * dtSec,
  };
}

export interface FanSpreadOptions {
  bullets: number;
  spreadDeg: number;
  speed: number;
  damage: number;
}

/** Symmetric wedge — N bullets fanned ±spreadDeg/2 around aim. */
export function fanSpread(
  scene: StageScene,
  fromX: number,
  fromY: number,
  aimAngle: number,
  opt: FanSpreadOptions,
  source?: string,
  bulletKind?: import('../entities/enemy-system').BulletKind,
): void {
  const n = opt.bullets;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) - 0.5; // -0.5..+0.5
    const ang = aimAngle + (t * opt.spreadDeg * Math.PI) / 180;
    scene.enemies.spawnEnemyBullet(
      fromX,
      fromY,
      Math.cos(ang) * opt.speed,
      Math.sin(ang) * opt.speed,
      opt.damage,
      source,
      bulletKind,
    );
  }
}

export interface RadialBurstOptions {
  bullets: number;
  speed: number;
  damage: number;
  angleOffsetRad?: number;
}

/** Full 360° ring of N bullets, optionally rotated by angleOffsetRad. */
export function radialBurst(
  scene: StageScene,
  fromX: number,
  fromY: number,
  opt: RadialBurstOptions,
): void {
  const step = (Math.PI * 2) / opt.bullets;
  const base = opt.angleOffsetRad ?? 0;
  for (let i = 0; i < opt.bullets; i++) {
    const ang = base + i * step;
    scene.enemies.spawnEnemyBullet(
      fromX,
      fromY,
      Math.cos(ang) * opt.speed,
      Math.sin(ang) * opt.speed,
      opt.damage,
    );
  }
}

/** Arrow (V-shape) — two outer bullets wide, apex bullet aimed straight. */
export function arrowSpread(
  scene: StageScene,
  fromX: number,
  fromY: number,
  aimAngle: number,
  speed: number,
  damage: number,
  wideDeg = 20,
  source?: string,
  bulletKind?: import('../entities/enemy-system').BulletKind,
): void {
  fanSpread(scene, fromX, fromY, aimAngle, {
    bullets: 3,
    spreadDeg: wideDeg,
    speed,
    damage,
  }, source, bulletKind);
}

/** Two parallel bullets offset perpendicular to aim — the classic twin cannon. */
export function twinStream(
  scene: StageScene,
  fromX: number,
  fromY: number,
  aimAngle: number,
  speed: number,
  damage: number,
  separation = 14,
): void {
  const perpX = -Math.sin(aimAngle);
  const perpY = Math.cos(aimAngle);
  const vx = Math.cos(aimAngle) * speed;
  const vy = Math.sin(aimAngle) * speed;
  for (const s of [-1, 1]) {
    scene.enemies.spawnEnemyBullet(
      fromX + perpX * separation * s,
      fromY + perpY * separation * s,
      vx,
      vy,
      damage,
    );
  }
}

export interface SpiralShotOptions {
  angleRad: number;
  speed: number;
  damage: number;
}

/** One bullet at `angleRad` — caller owns rotation state for rose curves / spirals. */
export function spiralShot(
  scene: StageScene,
  fromX: number,
  fromY: number,
  opt: SpiralShotOptions,
): void {
  scene.enemies.spawnEnemyBullet(
    fromX,
    fromY,
    Math.cos(opt.angleRad) * opt.speed,
    Math.sin(opt.angleRad) * opt.speed,
    opt.damage,
  );
}

/** Compute lead-aimed angle from source to a moving target. */
export function leadAimAngle(
  sourceX: number,
  sourceY: number,
  target: PatternTarget,
  projectileSpeed: number,
): number {
  // Iterative convergence (2 passes is plenty) — solves t where projectile
  // meets target given target velocity. Cheap; always stable for our speeds.
  let t = 0;
  for (let i = 0; i < 2; i++) {
    const lx = target.x + (target.vx ?? 0) * t;
    const ly = target.y + (target.vy ?? 0) * t;
    t = Math.hypot(lx - sourceX, ly - sourceY) / projectileSpeed;
  }
  const lx = target.x + (target.vx ?? 0) * t;
  const ly = target.y + (target.vy ?? 0) * t;
  return Math.atan2(ly - sourceY, lx - sourceX);
}
