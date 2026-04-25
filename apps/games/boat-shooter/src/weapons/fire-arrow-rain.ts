import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';

/**
 * W8 Fire-Arrow Rain — arc drop zone with Burn DoT.
 *
 * Per-level (docs/games/boat-shooter/04-weapons.md W8):
 *   L1: 120x120, every 4.0s, 6 arrows over 1s, 1 dmg each, +Burn 1/s × 2s
 *   L2: 150x150, 8 arrows
 *   L3: 150x150, every 3.5s, 10 arrows
 *   L4: 180x180, 12 arrows, +1 dmg
 *   L5: 200x200, every 3.0s, 16 arrows, +2 dmg, lingering 3s fire patch
 *
 * L5 Mastery: fire patch duration ×2; 20% frost-arrows (Freeze 1s).
 */
export class FireArrowRain extends Weapon {
  readonly id = 'fire-arrow-rain';
  private cooldownMs = 0;

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) return;
    this.cooldownMs -= deltaMs;
    if (this.cooldownMs > 0) return;
    const cfg = this.configFor(lvl);
    this.rainArrows(cfg, lvl);
    this.cooldownMs = this.withCDR(cfg.intervalMs);
  }

  private configFor(lvl: number): {
    zoneSize: number;
    intervalMs: number;
    arrows: number;
    dmgPerArrow: number;
    burnDps: number;
    burnMs: number;
    lingerMs: number;
  } {
    switch (lvl) {
      case 1: return { zoneSize: 120, intervalMs: 4000, arrows: 6, dmgPerArrow: 1, burnDps: 1, burnMs: 2000, lingerMs: 0 };
      case 2: return { zoneSize: 150, intervalMs: 4000, arrows: 8, dmgPerArrow: 1, burnDps: 1, burnMs: 2000, lingerMs: 0 };
      case 3: return { zoneSize: 150, intervalMs: 3500, arrows: 10, dmgPerArrow: 1, burnDps: 1, burnMs: 2000, lingerMs: 0 };
      case 4: return { zoneSize: 180, intervalMs: 3500, arrows: 12, dmgPerArrow: 2, burnDps: 1, burnMs: 2000, lingerMs: 0 };
      case 5:
      default: return { zoneSize: 200, intervalMs: 3000, arrows: 16, dmgPerArrow: 3, burnDps: 2, burnMs: 3000, lingerMs: 3000 };
    }
  }

  private rainArrows(cfg: ReturnType<typeof this.configFor>, lvl: number): void {
    const p = this.scene.player;
    const zx = p.x;
    const zy = p.y - 300; // "ahead" = up (downstream direction)
    const half = cfg.zoneSize / 2;

    // Telegraph marker.
    const marker = this.scene.add.rectangle(zx, zy, cfg.zoneSize, cfg.zoneSize, 0xff6b2a, 0.2);
    marker.setStrokeStyle(2, 0xff3a0a);
    marker.setDepth(3);
    this.scene.time.delayedCall(800, () => marker.destroy());

    const frostMode = lvl === 5 && Math.random() < 0.2;

    // Arrows rain over ~1 second.
    for (let i = 0; i < cfg.arrows; i++) {
      this.scene.time.delayedCall(Math.random() * 1000, () => {
        const ax = zx + (Math.random() * cfg.zoneSize - half);
        const ay = zy + (Math.random() * cfg.zoneSize - half);
        this.strikeArrow(ax, ay, cfg.dmgPerArrow, cfg.burnDps, cfg.burnMs, frostMode);
      });
    }

    // Lingering fire patch at L5 (+mastery ×2).
    if (cfg.lingerMs > 0) {
      this.scene.aoeZone.spawn(
        zx,
        zy,
        cfg.zoneSize / 2,
        cfg.lingerMs * (lvl === 5 ? 2 : 1),
        1,
        'fire-patch',
      );
    }
  }

  private strikeArrow(
    x: number,
    y: number,
    dmg: number,
    burnDps: number,
    burnMs: number,
    frost: boolean,
  ): void {
    // Visual: short line from above, fading.
    const g = this.scene.add.graphics();
    const sx = x + (Math.random() * 10 - 5);
    const sy = y - 80;
    g.lineStyle(2, frost ? 0xa8e0ff : 0xffd85a, 1).beginPath().moveTo(sx, sy).lineTo(x, y).strokePath();
    g.setDepth(6);
    this.scene.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0 },
      duration: 300,
      onComplete: () => g.destroy(),
    });

    // Damage + status.
    const r2 = 20 * 20;
    this.scene.enemies.forEachActive((e) => {
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy > r2) return;
      const roll = rollDamage(this.scene.runState, dmg);
      const applied = e.takeDamage(roll.damage, 0, roll.isCrit);
      if (applied > 0) this.scene.damageNumbers.spawn(e.x, e.y, applied, { crit: roll.isCrit });
      if (frost) e.statuses.apply('freeze', 1000);
      else e.statuses.apply('burn', burnMs, { dps: burnDps, weaponId: this.id });
    });
  }
}
