import Phaser from 'phaser';
import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';

/**
 * W6 Lighthouse Beam — rotating 360° beam around the boat.
 *
 * Per-level (docs/games/boat-shooter/04-weapons.md W6):
 *   L1: 600px long, 30°/s rotation, 1 dmg/tick @ 3 ticks/s
 *   L2: 45°/s
 *   L3: 60°/s, 2 dmg/tick
 *   L4: 90°/s, +0.2s slow on hit
 *   L5: 120°/s, 3 dmg/tick, +0.4s slow
 *
 * L5 Mastery (un-evolved): applies Wet 3s on hit.
 *
 * Tick interval: 333ms. An enemy is "in beam" if within `length` of the
 * player AND within 6° of the current beam angle.
 */
export class LighthouseBeam extends Weapon {
  readonly id = 'lighthouse-beam';
  private angleRad = 0;
  private tickAccumMs = 0;
  private beamGraphics: Phaser.GameObjects.Graphics | null = null;

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) {
      this.beamGraphics?.destroy();
      this.beamGraphics = null;
      return;
    }
    const cfg = this.configFor(lvl);
    const dt = deltaMs / 1000;
    this.angleRad += (cfg.rotSpeedDeg * Math.PI / 180) * dt;
    this.drawBeam(cfg);
    this.tickAccumMs += deltaMs;
    const interval = 333;
    while (this.tickAccumMs >= interval) {
      this.tickAccumMs -= interval;
      this.applyTick(cfg, lvl);
    }
  }

  private configFor(lvl: number): {
    length: number;
    rotSpeedDeg: number;
    dmgPerTick: number;
    slowMs: number;
  } {
    switch (lvl) {
      case 1: return { length: 600, rotSpeedDeg: 30, dmgPerTick: 1, slowMs: 0 };
      case 2: return { length: 600, rotSpeedDeg: 45, dmgPerTick: 1, slowMs: 0 };
      case 3: return { length: 600, rotSpeedDeg: 60, dmgPerTick: 2, slowMs: 0 };
      case 4: return { length: 600, rotSpeedDeg: 90, dmgPerTick: 2, slowMs: 200 };
      case 5:
      default: return { length: 600, rotSpeedDeg: 120, dmgPerTick: 3, slowMs: 400 };
    }
  }

  private drawBeam(cfg: ReturnType<typeof this.configFor>): void {
    if (!this.beamGraphics) {
      this.beamGraphics = this.scene.add.graphics();
      this.beamGraphics.setDepth(8);
    }
    const g = this.beamGraphics;
    g.clear();
    const p = this.scene.player;
    const x2 = p.x + Math.cos(this.angleRad) * cfg.length;
    const y2 = p.y + Math.sin(this.angleRad) * cfg.length;

    // Beam core + soft glow.
    g.lineStyle(4, 0xffd85a, 1).beginPath().moveTo(p.x, p.y).lineTo(x2, y2).strokePath();
    g.lineStyle(12, 0xffd85a, 0.25).beginPath().moveTo(p.x, p.y).lineTo(x2, y2).strokePath();
  }

  private applyTick(cfg: ReturnType<typeof this.configFor>, lvl: number): void {
    const p = this.scene.player;
    const lenSq = cfg.length * cfg.length;
    const toleranceDeg = 6;
    const tolRad = toleranceDeg * Math.PI / 180;

    this.scene.enemies.forEachActive((e) => {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > lenSq) return;
      const ang = Math.atan2(dy, dx);
      let delta = ang - this.angleRad;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      if (Math.abs(delta) > tolRad) return;

      const roll = rollDamage(this.scene.runState, cfg.dmgPerTick);
      const applied = e.takeDamage(roll.damage, 0, roll.isCrit);
      if (applied > 0) {
        this.scene.damageNumbers.spawn(e.x, e.y, applied, { crit: roll.isCrit });
      }
      if (cfg.slowMs > 0) {
        e.statuses.apply('poison', cfg.slowMs, { dps: 0 }); // reuse poison's slow effect; no DoT
      }
      if (lvl === 5) {
        e.statuses.apply('wet', 3000);
      }
    });
  }

  override destroy(): void {
    this.beamGraphics?.destroy();
    this.beamGraphics = null;
  }
}
