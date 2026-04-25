import Phaser from 'phaser';
import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';

/**
 * W10 Spinning Boarding-Axes — orbiting melee.
 *
 * Per-level (docs/games/boat-shooter/04-weapons.md W10):
 *   L1: 1 axe, 100px, 1 dmg, 0.3s per-enemy cooldown
 *   L2: 2 axes
 *   L3: 3 axes, +25% rotation
 *   L4: 4 axes, +1 dmg
 *   L5: 6 axes, 120px, +1 pierce-per-tick, knockback
 *
 * Per-enemy hit cooldown prevents double-dipping as the axe passes through.
 */
export class SpinningAxes extends Weapon {
  readonly id = 'spinning-axes';
  private angle = 0;
  private axes: Phaser.GameObjects.Graphics[] = [];
  private hitCooldowns = new Map<number, number>(); // enemyId → next-eligible time

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) {
      this.axes.forEach((g) => g.destroy());
      this.axes = [];
      return;
    }
    // Sawblade Fortress evolution: use an expanded config.
    const evolved = this.scene.runState.hasEvolution('sawblade-fortress');
    const cfg = evolved ? { count: 16, radius: 140, dmg: 3 } : this.configFor(lvl);
    this.ensureAxes(cfg.count);

    const dt = deltaMs / 1000;
    const rotSpeed = (90 * Math.PI / 180) * (lvl >= 3 ? 1.25 : 1);
    this.angle += rotSpeed * dt;

    const p = this.scene.player;
    for (let i = 0; i < cfg.count; i++) {
      const a = this.angle + (i / cfg.count) * Math.PI * 2;
      const x = p.x + Math.cos(a) * cfg.radius;
      const y = p.y + Math.sin(a) * cfg.radius;
      const g = this.axes[i]!;
      g.setPosition(x, y);

      // Hit check.
      this.scene.enemies.forEachActive((e) => {
        const cdUntil = this.hitCooldowns.get(e.runtimeId) ?? 0;
        if (this.scene.time.now < cdUntil) return;
        const dx = e.x - x;
        const dy = e.y - y;
        const r = 20 + e.spec.collisionRadius;
        if (dx * dx + dy * dy > r * r) return;

        const roll = rollDamage(this.scene.runState, cfg.dmg);
        const applied = e.takeDamage(roll.damage, 0, roll.isCrit);
        if (applied > 0) this.scene.damageNumbers.spawn(e.x, e.y, applied, { crit: roll.isCrit });
        this.hitCooldowns.set(e.runtimeId, this.scene.time.now + 300);

        if (lvl === 5) {
          // Knockback.
          const dirX = (e.x - p.x);
          const dirY = (e.y - p.y);
          const len = Math.hypot(dirX, dirY) || 1;
          e.setPos(e.x + (dirX / len) * 40, e.y + (dirY / len) * 40);
        }
      });
    }
  }

  private configFor(lvl: number): { count: number; radius: number; dmg: number } {
    switch (lvl) {
      case 1: return { count: 1, radius: 100, dmg: 1 };
      case 2: return { count: 2, radius: 100, dmg: 1 };
      case 3: return { count: 3, radius: 100, dmg: 1 };
      case 4: return { count: 4, radius: 100, dmg: 2 };
      case 5:
      default: return { count: 6, radius: 120, dmg: 2 };
    }
  }

  private ensureAxes(n: number): void {
    while (this.axes.length < n) {
      const g = this.scene.add.graphics();
      g.fillStyle(0xbfbfbf, 1).fillCircle(0, 0, 10);
      g.lineStyle(2, 0x2a1610, 1).strokeCircle(0, 0, 10);
      // Axe-blade motif.
      g.fillStyle(0x808080, 1).fillTriangle(-14, -2, 14, -2, 0, -14);
      g.fillTriangle(-14, 2, 14, 2, 0, 14);
      g.setDepth(9);
      this.axes.push(g);
    }
    while (this.axes.length > n) {
      this.axes.pop()?.destroy();
    }
  }

  override destroy(): void {
    this.axes.forEach((g) => g.destroy());
    this.axes = [];
  }
}
