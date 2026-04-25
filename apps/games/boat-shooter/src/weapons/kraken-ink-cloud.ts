import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';
import { tickLeviathanInk } from './evolved-behaviors';
import Phaser from 'phaser';

/**
 * W9 Kraken-Ink Cloud — aura trailing the boat.
 *
 * Per-level (docs/games/boat-shooter/04-weapons.md W9):
 *   L1: 120px, 1 dmg/tick @ 2 ticks/s, -20% slow
 *   L2: 140px
 *   L3: 160px, 1.5 dmg/tick
 *   L4: 180px, 3 ticks/s, -30% slow
 *   L5: 220px, 4 ticks/s, 2 dmg/tick, -40% slow, +Poison 1/s × 3s post-exit, applies Wet while inside
 *
 * Visually rendered as a semi-transparent purple disc at the boat's position
 * that trails slightly behind due to movement lag.
 */
export class KrakenInkCloud extends Weapon {
  readonly id = 'kraken-ink';
  private tickAccumMs = 0;
  private disc: Phaser.GameObjects.Arc | null = null;
  private trailX = 0;
  private trailY = 0;

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) {
      this.disc?.destroy();
      this.disc = null;
      return;
    }

    const cfg = this.configFor(lvl);
    const p = this.scene.player;

    if (!this.disc) {
      this.disc = this.scene.add.circle(p.x, p.y, cfg.radius, 0x5a2a8a, 0.4);
      this.disc.setDepth(2);
      this.trailX = p.x;
      this.trailY = p.y;
    }

    // Smooth trail.
    const dt = deltaMs / 1000;
    const trailLag = 2.5;
    this.trailX += (p.x - this.trailX) * trailLag * dt;
    this.trailY += (p.y - this.trailY) * trailLag * dt;
    this.disc.setPosition(this.trailX, this.trailY);
    this.disc.setRadius(cfg.radius);

    const intervalMs = 1000 / cfg.ticksPerSec;
    this.tickAccumMs += deltaMs;
    while (this.tickAccumMs >= intervalMs) {
      this.tickAccumMs -= intervalMs;
      this.applyTick(cfg, lvl);
    }

    // Leviathan Ink evolution: periodic tentacle slams.
    if (this.scene.runState.hasEvolution('leviathan-ink')) {
      tickLeviathanInk(this.scene, this.trailX, this.trailY);
    }
  }

  private configFor(lvl: number): {
    radius: number;
    dmgPerTick: number;
    ticksPerSec: number;
  } {
    switch (lvl) {
      case 1: return { radius: 120, dmgPerTick: 1, ticksPerSec: 2 };
      case 2: return { radius: 140, dmgPerTick: 1, ticksPerSec: 2 };
      case 3: return { radius: 160, dmgPerTick: 1.5, ticksPerSec: 2 };
      case 4: return { radius: 180, dmgPerTick: 1.5, ticksPerSec: 3 };
      case 5:
      default: return { radius: 220, dmgPerTick: 2, ticksPerSec: 4 };
    }
  }

  private applyTick(cfg: ReturnType<typeof this.configFor>, lvl: number): void {
    const r2 = cfg.radius * cfg.radius;
    this.scene.enemies.forEachActive((e) => {
      const dx = e.x - this.trailX;
      const dy = e.y - this.trailY;
      if (dx * dx + dy * dy > r2) return;

      const roll = rollDamage(this.scene.runState, cfg.dmgPerTick);
      const applied = e.takeDamage(roll.damage, 0, roll.isCrit);
      if (applied > 0) this.scene.damageNumbers.spawn(e.x, e.y, applied, { crit: roll.isCrit });

      e.statuses.apply('poison', 1000, { dps: 1 });
      if (lvl === 5) e.statuses.apply('wet', 2000);
    });
  }

  override destroy(): void {
    this.disc?.destroy();
    this.disc = null;
  }
}
