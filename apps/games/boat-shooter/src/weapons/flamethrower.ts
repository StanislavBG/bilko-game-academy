import Phaser from 'phaser';
import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';
import { tickInfernoBreath } from './evolved-behaviors';

/**
 * W5 Flamethrower — auto-forward cone, continuous ticks, applies Burn.
 *
 * Per-level (docs/games/boat-shooter/04-weapons.md W5):
 *   L1: 60° cone, 180px, 1.0 dmg/tick @ 5 ticks/s, Burn 1/s × 2s
 *   L2: 70°, 200px
 *   L3: 70°, 200px, 1.5 dmg/tick
 *   L4: 80°, 240px, Burn 2/s
 *   L5: 90°, 280px, 2.0 dmg/tick, Burn 2/s × 4s, ignites oil slicks
 *
 * A semi-transparent cone sprite represents the flame. Damage is applied
 * on a 200ms tick to all enemies inside the cone.
 */
export class Flamethrower extends Weapon {
  readonly id = 'flamethrower';
  private tickAccumMs = 0;
  private coneGraphics: Phaser.GameObjects.Graphics | null = null;

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) {
      if (this.coneGraphics) {
        this.coneGraphics.destroy();
        this.coneGraphics = null;
      }
      return;
    }

    if (this.scene.runState.hasEvolution('inferno-breath')) {
      // Evolved — 360° aura at 8 ticks/s.
      if (this.coneGraphics) {
        this.coneGraphics.destroy();
        this.coneGraphics = null;
      }
      const tickIntervalMs = 1000 / 8;
      this.tickAccumMs += deltaMs;
      while (this.tickAccumMs >= tickIntervalMs) {
        this.tickAccumMs -= tickIntervalMs;
        tickInfernoBreath(this.scene);
      }
      return;
    }

    const cfg = this.configFor(lvl);
    this.drawCone(cfg);

    const tickIntervalMs = 1000 / 5;
    this.tickAccumMs += deltaMs;
    while (this.tickAccumMs >= tickIntervalMs) {
      this.tickAccumMs -= tickIntervalMs;
      this.applyTick(cfg);
    }
  }

  private configFor(lvl: number): {
    coneDeg: number;
    range: number;
    dmgPerTick: number;
    burnDps: number;
    burnMs: number;
  } {
    switch (lvl) {
      // PRD 7 buff: dmgPerTick 1.0 → 1.25 since the elemental is now the only starter weapon.
      case 1: return { coneDeg: 60, range: 180, dmgPerTick: 1.25, burnDps: 1, burnMs: 2000 };
      case 2: return { coneDeg: 70, range: 200, dmgPerTick: 1.0, burnDps: 1, burnMs: 2000 };
      case 3: return { coneDeg: 70, range: 200, dmgPerTick: 1.5, burnDps: 1, burnMs: 2000 };
      case 4: return { coneDeg: 80, range: 240, dmgPerTick: 1.5, burnDps: 2, burnMs: 2000 };
      case 5:
      default: return { coneDeg: 90, range: 280, dmgPerTick: 2.0, burnDps: 2, burnMs: 4000 };
    }
  }

  private drawCone(cfg: ReturnType<typeof this.configFor>): void {
    if (!this.coneGraphics) {
      this.coneGraphics = this.scene.add.graphics();
      this.coneGraphics.setDepth(8);
    }
    const g = this.coneGraphics;
    g.clear();
    const p = this.scene.player;
    const halfAngle = (cfg.coneDeg / 2) * (Math.PI / 180);
    const centerAngle = -Math.PI / 2; // upward
    const leftA = centerAngle - halfAngle;
    const rightA = centerAngle + halfAngle;

    g.fillStyle(0xff6b2a, 0.4);
    g.beginPath();
    g.moveTo(p.x, p.y - 40);
    g.arc(p.x, p.y - 40, cfg.range, leftA, rightA);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xffd85a, 0.6).strokePath();
  }

  private applyTick(cfg: ReturnType<typeof this.configFor>): void {
    const p = this.scene.player;
    const r2 = cfg.range * cfg.range;
    const halfCone = (cfg.coneDeg / 2) * (Math.PI / 180);
    const centerAngle = -Math.PI / 2;

    this.scene.enemies.forEachActive((e) => {
      const dx = e.x - p.x;
      const dy = e.y - (p.y - 40);
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) return;
      const ang = Math.atan2(dy, dx);
      let delta = ang - centerAngle;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      if (Math.abs(delta) > halfCone) return;

      const roll = rollDamage(this.scene.runState, cfg.dmgPerTick);
      const applied = e.takeDamage(roll.damage, 0, roll.isCrit);
      if (applied > 0) {
        this.scene.damageNumbers.spawn(e.x, e.y, applied, { crit: roll.isCrit });
      }
      e.statuses.apply('burn', cfg.burnMs, { dps: cfg.burnDps, weaponId: this.id });
    });
  }

  override destroy(): void {
    this.coneGraphics?.destroy();
  }
}
