import Phaser from 'phaser';
import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';

/**
 * W12 Stern Mines — drop-behind trap.
 *
 * Per-level:
 *   L1: 1 mine / 2.5s, 3 dmg, 60px blast, 50px proximity, 8s TTL
 *   L2: 1 / 2.0s
 *   L3: 2 (offset), 2.0s
 *   L4: 2, 1.5s, 80px blast
 *   L5: 3 (fan), 1.0s, 100px blast, +1 dmg, chain-detonate
 */
interface Mine {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  blastRadius: number;
  dmg: number;
  ttlMs: number;
  active: boolean;
}

export class SternMines extends Weapon {
  readonly id = 'stern-mines';
  private cooldownMs = 0;
  private pool: Mine[] = [];
  private chainInProgress = false;

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) return;
    this.cooldownMs -= deltaMs;
    if (this.cooldownMs <= 0) {
      const cfg = this.configFor(lvl);
      this.dropMines(cfg);
      this.cooldownMs = this.withCDR(cfg.intervalMs);
    }
    this.tickMines(deltaMs, lvl);
  }

  private configFor(lvl: number): {
    count: number;
    intervalMs: number;
    dmg: number;
    blastRadius: number;
    proximity: number;
  } {
    // Evolved: Minefield — 4 mines/s, 100px blast, persistent (effectively infinite TTL).
    if (this.scene.runState.hasEvolution('minefield')) {
      return { count: 4, intervalMs: 1000, dmg: 5, blastRadius: 100, proximity: 70 };
    }
    switch (lvl) {
      case 1: return { count: 1, intervalMs: 2500, dmg: 3, blastRadius: 60, proximity: 50 };
      case 2: return { count: 1, intervalMs: 2000, dmg: 3, blastRadius: 60, proximity: 50 };
      case 3: return { count: 2, intervalMs: 2000, dmg: 3, blastRadius: 60, proximity: 50 };
      case 4: return { count: 2, intervalMs: 1500, dmg: 3, blastRadius: 80, proximity: 50 };
      case 5:
      default: return { count: 3, intervalMs: 1000, dmg: 4, blastRadius: 100, proximity: 60 };
    }
  }

  private dropMines(cfg: ReturnType<typeof this.configFor>): void {
    const p = this.scene.player;
    const behindY = p.y + 50;
    for (let i = 0; i < cfg.count; i++) {
      const sideOffset = (i - (cfg.count - 1) / 2) * 30;

      let mine = this.pool.find((m) => !m.active);
      if (!mine) {
        const sprite = this.scene.add.circle(p.x + sideOffset, behindY, 8, 0x2a0808, 1);
        sprite.setStrokeStyle(2, 0xff3a0a);
        sprite.setDepth(4);
        mine = { sprite, x: 0, y: 0, blastRadius: 0, dmg: 0, ttlMs: 0, active: false };
        this.pool.push(mine);
      }
      mine.sprite.setPosition(p.x + sideOffset, behindY);
      mine.sprite.setVisible(true);
      mine.x = p.x + sideOffset;
      mine.y = behindY;
      mine.blastRadius = cfg.blastRadius;
      mine.dmg = cfg.dmg;
      mine.ttlMs = 8000;
      mine.active = true;
    }
  }

  private tickMines(deltaMs: number, lvl: number): void {
    for (const m of this.pool) {
      if (!m.active) continue;
      m.ttlMs -= deltaMs;
      const cfg = this.configFor(lvl);

      // Proximity trigger.
      let triggered = false;
      this.scene.enemies.forEachActive((e) => {
        if (triggered) return;
        const dx = e.x - m.x;
        const dy = e.y - m.y;
        if (dx * dx + dy * dy <= cfg.proximity * cfg.proximity) {
          triggered = true;
        }
      });

      if (triggered || m.ttlMs <= 0) {
        this.explode(m, lvl);
      }
    }
  }

  private explode(m: Mine, lvl: number): void {
    m.active = false;
    m.sprite.setVisible(false);
    const r2 = m.blastRadius * m.blastRadius;

    this.scene.enemies.forEachActive((e) => {
      const dx = e.x - m.x;
      const dy = e.y - m.y;
      if (dx * dx + dy * dy > r2) return;
      const roll = rollDamage(this.scene.runState, m.dmg);
      const applied = e.takeDamage(roll.damage, 0, roll.isCrit);
      if (applied > 0) this.scene.damageNumbers.spawn(e.x, e.y, applied, { crit: roll.isCrit });
    });

    // Visual.
    const flash = this.scene.add.circle(m.x, m.y, m.blastRadius, 0xffa94a, 0.7);
    flash.setDepth(5);
    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 0.8, to: 0 },
      scale: { from: 1, to: 1.2 },
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Chain detonate at L5: nearby mines within blast also explode.
    if (lvl === 5 && !this.chainInProgress) {
      this.chainInProgress = true;
      const chainRange = 120;
      const chainR2 = chainRange * chainRange;
      for (const other of this.pool) {
        if (!other.active || other === m) continue;
        const dx = other.x - m.x;
        const dy = other.y - m.y;
        if (dx * dx + dy * dy <= chainR2) {
          this.scene.time.delayedCall(100, () => this.explode(other, lvl));
        }
      }
      this.chainInProgress = false;
    }
  }
}
