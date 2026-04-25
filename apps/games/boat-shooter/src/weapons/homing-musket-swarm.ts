import Phaser from 'phaser';
import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';
import type { Enemy } from '../entities/enemy';

/**
 * W11 Homing Musket Swarm — burst of homing projectiles.
 *
 * Per-level:
 *   L1: 3 balls, every 3.0s, 1 dmg, weak homing
 *   L2: 4 balls
 *   L3: 5 balls, every 2.5s
 *   L4: 6 balls, every 2.0s, +1 dmg, strong homing
 *   L5: 8 balls, every 1.5s, +1 dmg, +1 pierce, retarget-after-kill
 */
interface HomingBall {
  sprite: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  ttlMs: number;
  damage: number;
  target: Enemy | null;
  homingStrength: number;
  pierceLeft: number;
  retargets: boolean;
  alreadyHit: Set<number>;
  isCrit: boolean;
  active: boolean;
}

export class HomingMusketSwarm extends Weapon {
  readonly id = 'homing-musket';
  private cooldownMs = 0;
  private pool: HomingBall[] = [];

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) return;
    this.cooldownMs -= deltaMs;
    if (this.cooldownMs <= 0) {
      const cfg = this.configFor(lvl);
      this.fireBurst(cfg, lvl);
      this.cooldownMs = this.withCDR(cfg.intervalMs);
    }
    this.tickBalls(deltaMs);
  }

  private configFor(lvl: number): {
    count: number;
    intervalMs: number;
    dmg: number;
    homing: number;
    pierce: number;
    retargets: boolean;
  } {
    switch (lvl) {
      case 1: return { count: 3, intervalMs: 3000, dmg: 1, homing: 2, pierce: 0, retargets: false };
      case 2: return { count: 4, intervalMs: 3000, dmg: 1, homing: 2, pierce: 0, retargets: false };
      case 3: return { count: 5, intervalMs: 2500, dmg: 1, homing: 2, pierce: 0, retargets: false };
      case 4: return { count: 6, intervalMs: 2000, dmg: 2, homing: 5, pierce: 0, retargets: false };
      case 5:
      default: return { count: 8, intervalMs: 1500, dmg: 3, homing: 6, pierce: 1, retargets: true };
    }
  }

  private fireBurst(cfg: ReturnType<typeof this.configFor>, _lvl: number): void {
    const p = this.scene.player;
    for (let i = 0; i < cfg.count; i++) {
      const ang = (i / cfg.count) * Math.PI * 2;
      const vx = Math.cos(ang) * 150;
      const vy = Math.sin(ang) * 150;
      const target = this.pickTarget();
      const roll = rollDamage(this.scene.runState, cfg.dmg);

      let ball = this.pool.find((b) => !b.active);
      if (!ball) {
        const sprite = this.scene.add.circle(p.x, p.y, 5, 0xdfb86b, 1);
        sprite.setStrokeStyle(1, 0x2a1610);
        sprite.setDepth(9);
        ball = {
          sprite,
          vx: 0,
          vy: 0,
          ttlMs: 0,
          damage: 0,
          target: null,
          homingStrength: 0,
          pierceLeft: 0,
          retargets: false,
          alreadyHit: new Set(),
          isCrit: false,
          active: false,
        };
        this.pool.push(ball);
      }
      ball.sprite.setPosition(p.x, p.y);
      ball.sprite.setVisible(true);
      ball.vx = vx;
      ball.vy = vy;
      ball.ttlMs = 3000;
      ball.damage = roll.damage;
      ball.target = target;
      ball.homingStrength = cfg.homing;
      ball.pierceLeft = cfg.pierce;
      ball.retargets = cfg.retargets;
      ball.isCrit = roll.isCrit;
      ball.alreadyHit.clear();
      ball.active = true;
    }
  }

  private pickTarget(): Enemy | null {
    const enemies: Enemy[] = [];
    this.scene.enemies.forEachActive((e) => enemies.push(e));
    if (enemies.length === 0) return null;
    return enemies[Math.floor(Math.random() * enemies.length)] ?? null;
  }

  private tickBalls(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const b of this.pool) {
      if (!b.active) continue;

      // Re-validate target.
      if (b.target && !b.target.active) b.target = this.pickTarget();

      // Homing.
      if (b.target) {
        const dx = b.target.x - b.sprite.x;
        const dy = b.target.y - b.sprite.y;
        const d = Math.hypot(dx, dy) || 1;
        const steerX = (dx / d) * 800;
        const steerY = (dy / d) * 800;
        b.vx += (steerX - b.vx) * b.homingStrength * dt;
        b.vy += (steerY - b.vy) * b.homingStrength * dt;
      }

      // Cap speed.
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 520) {
        b.vx = (b.vx / sp) * 520;
        b.vy = (b.vy / sp) * 520;
      }

      b.sprite.x += b.vx * dt;
      b.sprite.y += b.vy * dt;
      b.ttlMs -= deltaMs;

      if (b.ttlMs <= 0) {
        b.active = false;
        b.sprite.setVisible(false);
        continue;
      }

      // Hit check.
      this.scene.enemies.forEachActive((e) => {
        if (!b.active) return;
        if (b.alreadyHit.has(e.runtimeId)) return;
        const dx = e.x - b.sprite.x;
        const dy = e.y - b.sprite.y;
        const r = 6 + e.spec.collisionRadius;
        if (dx * dx + dy * dy > r * r) return;

        b.alreadyHit.add(e.runtimeId);
        const applied = e.takeDamage(b.damage, 0, b.isCrit);
        if (applied > 0) this.scene.damageNumbers.spawn(e.x, e.y, applied, { crit: b.isCrit });

        if (b.pierceLeft > 0) {
          b.pierceLeft -= 1;
          if (b.retargets && !e.active) b.target = this.pickTarget();
        } else {
          b.active = false;
          b.sprite.setVisible(false);
        }
      });
    }
  }
}
