import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';

/**
 * W7 Mortar — arc ballistic AoE, auto-random enemy target.
 *
 * Per-level (docs/games/boat-shooter/04-weapons.md W7):
 *   L1: 1 shell, every 3.0s, 3 dmg, 80px blast, 1s fuse
 *   L2: 2 shells (staggered 0.3s)
 *   L3: 2 shells, every 2.5s, 100px blast
 *   L4: 3 shells, 120px blast, +1 dmg
 *   L5: 4 shells, every 2.0s, 140px blast, +2 dmg, cluster (3 bomblets)
 *
 * L5 Mastery: 20% double-impact + 20% frost-shell (Freeze 1s in 80px).
 */
export class Mortar extends Weapon {
  readonly id = 'mortar';
  private cooldownMs = 0;

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) return;
    this.cooldownMs -= deltaMs;
    if (this.cooldownMs > 0) return;
    const cfg = this.configFor(lvl);
    this.scheduleVolley(cfg, lvl);
    this.cooldownMs = this.withCDR(cfg.intervalMs);
  }

  private configFor(lvl: number): {
    count: number;
    intervalMs: number;
    dmg: number;
    blastRadius: number;
    cluster: boolean;
  } {
    switch (lvl) {
      case 1: return { count: 1, intervalMs: 3000, dmg: 3, blastRadius: 80, cluster: false };
      case 2: return { count: 2, intervalMs: 3000, dmg: 3, blastRadius: 80, cluster: false };
      case 3: return { count: 2, intervalMs: 2500, dmg: 3, blastRadius: 100, cluster: false };
      case 4: return { count: 3, intervalMs: 2500, dmg: 4, blastRadius: 120, cluster: false };
      case 5:
      default: return { count: 4, intervalMs: 2000, dmg: 6, blastRadius: 140, cluster: true };
    }
  }

  private scheduleVolley(cfg: ReturnType<typeof this.configFor>, lvl: number): void {
    for (let i = 0; i < cfg.count; i++) {
      this.scene.time.delayedCall(i * 300, () => this.fireOne(cfg, lvl));
    }
  }

  private fireOne(cfg: ReturnType<typeof this.configFor>, lvl: number): void {
    // Pick a random active enemy. If none, fire straight forward.
    const enemies = this.activeEnemies();
    const target = enemies.length > 0 ? enemies[Math.floor(Math.random() * enemies.length)]! : null;
    const tx = target ? target.x : this.scene.player.x;
    const ty = target ? target.y : this.scene.player.y - 400;

    const fuseMs = 1000;
    this.drawTelegraph(tx, ty, cfg.blastRadius, fuseMs);
    this.scene.time.delayedCall(fuseMs, () => this.explode(tx, ty, cfg, lvl));
  }

  private activeEnemies(): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    this.scene.enemies.forEachActive((e) => result.push({ x: e.x, y: e.y }));
    return result;
  }

  private drawTelegraph(x: number, y: number, radius: number, fuseMs: number): void {
    const g = this.scene.add.graphics();
    g.setDepth(4);
    g.lineStyle(3, 0xff3a0a, 0.8).strokeCircle(x, y, radius);
    g.fillStyle(0xff3a0a, 0.15).fillCircle(x, y, radius);
    this.scene.tweens.add({
      targets: g,
      alpha: { from: 0.3, to: 0.9 },
      yoyo: true,
      duration: fuseMs / 2,
      onComplete: () => g.destroy(),
    });
  }

  private explode(
    x: number,
    y: number,
    cfg: ReturnType<typeof this.configFor>,
    lvl: number,
  ): void {
    const r2 = cfg.blastRadius * cfg.blastRadius;
    const doubleImpact = lvl === 5 && Math.random() < 0.2;
    const frostShell = lvl === 5 && Math.random() < 0.2;

    for (let pass = 0; pass < (doubleImpact ? 2 : 1); pass++) {
      this.scene.enemies.forEachActive((e) => {
        const dx = e.x - x;
        const dy = e.y - y;
        if (dx * dx + dy * dy > r2) return;
        const roll = rollDamage(this.scene.runState, cfg.dmg);
        const applied = e.takeDamage(roll.damage, 0, roll.isCrit);
        if (applied > 0) {
          this.scene.damageNumbers.spawn(e.x, e.y, applied, { crit: roll.isCrit });
        }
        if (frostShell) e.statuses.apply('freeze', 1000);
      });
    }

    // Visual.
    const flash = this.scene.add.circle(x, y, cfg.blastRadius, 0xffd85a, 0.6);
    flash.setDepth(5);
    this.scene.tweens.add({
      targets: flash,
      scale: { from: 1, to: 1.3 },
      alpha: { from: 0.8, to: 0 },
      duration: 350,
      onComplete: () => flash.destroy(),
    });

    // Cluster bomblets at L5.
    if (cfg.cluster) {
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2 + Math.random() * 0.3;
        const dist = cfg.blastRadius * 0.6;
        const bx = x + Math.cos(ang) * dist;
        const by = y + Math.sin(ang) * dist;
        this.scene.time.delayedCall(300 + i * 80, () => this.explodeBomblet(bx, by, cfg.blastRadius * 0.5, cfg.dmg * 0.5));
      }
    }
  }

  private explodeBomblet(x: number, y: number, radius: number, dmg: number): void {
    const r2 = radius * radius;
    this.scene.enemies.forEachActive((e) => {
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy > r2) return;
      const roll = rollDamage(this.scene.runState, dmg);
      const applied = e.takeDamage(roll.damage, 0, roll.isCrit);
      if (applied > 0) this.scene.damageNumbers.spawn(e.x, e.y, applied, { crit: roll.isCrit });
    });
    const flash = this.scene.add.circle(x, y, radius, 0xffa94a, 0.55);
    flash.setDepth(5);
    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 0.8, to: 0 },
      duration: 250,
      onComplete: () => flash.destroy(),
    });
  }
}
