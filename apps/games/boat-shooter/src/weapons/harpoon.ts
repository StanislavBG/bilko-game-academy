import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';

/**
 * W3 Harpoon — auto-nearest piercing line.
 *
 * Per-level (docs/games/boat-shooter/04-weapons.md):
 *   L1: 1 harpoon, every 2.5s, 3 dmg, 3 pierce
 *   L2: 1, every 2.0s, 4 pierce
 *   L3: 2 (staggered), every 2.0s
 *   L4: 2, every 1.5s, 5 pierce
 *   L5: 3, every 1.5s, 6 pierce, +1 dmg
 *
 * "Yank small enemies" special is deferred to the collision handler (P2
 * will implement the yank mechanic; for P1 the harpoon is straight pierce).
 */
export class Harpoon extends Weapon {
  readonly id = 'harpoon';
  private cooldownMs = 0;
  private staggerQueue: Array<{ firesAtMs: number; offset: { dx: number; dy: number } }> = [];

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) return;

    this.cooldownMs -= deltaMs;

    // Flush stagger queue (for L3+ multi-harpoon spec).
    const now = this.scene.time.now;
    while (this.staggerQueue.length > 0 && this.staggerQueue[0]!.firesAtMs <= now) {
      const entry = this.staggerQueue.shift()!;
      this.fireOne(lvl, entry.offset);
    }

    if (this.cooldownMs > 0) return;

    const cfg = this.configFor(lvl);
    this.scheduleVolley(cfg);
    this.cooldownMs = this.withCDR(cfg.intervalMs);
  }

  private configFor(lvl: number): {
    count: number;
    intervalMs: number;
    pierce: number;
    dmg: number;
  } {
    switch (lvl) {
      // PRD 7 buff: 2500→2000ms since elemental is the only starter weapon.
      case 1: return { count: 1, intervalMs: 2000, pierce: 3, dmg: 3 };
      case 2: return { count: 1, intervalMs: 2000, pierce: 4, dmg: 3 };
      case 3: return { count: 2, intervalMs: 2000, pierce: 4, dmg: 3 };
      case 4: return { count: 2, intervalMs: 1500, pierce: 5, dmg: 3 };
      case 5:
      default: return { count: 3, intervalMs: 1500, pierce: 6, dmg: 4 };
    }
  }

  private scheduleVolley(cfg: { count: number }): void {
    const now = this.scene.time.now;
    for (let i = 0; i < cfg.count; i++) {
      // Slight horizontal offset to avoid perfectly stacked harpoons.
      const dx = (i - (cfg.count - 1) / 2) * 18;
      this.staggerQueue.push({
        firesAtMs: now + i * 120, // 120ms between staggered harpoons
        offset: { dx, dy: -40 },
      });
    }
  }

  private fireOne(lvl: number, offset: { dx: number; dy: number }): void {
    const cfg = this.configFor(lvl);
    const player = this.scene.player;
    const nearest = this.scene.enemies.nearestTo(player.x, player.y);
    const speed = 1100;

    let angle = -Math.PI / 2; // default up
    if (nearest) {
      angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    }

    // Sharp white flash along the firing axis; wind-up is implicit in the
    // staggered scheduling, so only the launch flash is shown here.
    this.scene.fx.muzzleFlashHarpoon(player.x + offset.dx, player.y + offset.dy, angle);

    const roll = rollDamage(this.scene.runState, cfg.dmg);
    const proj = this.scene.weapons.projectiles.acquire();
    proj.spawn({
      x: player.x + offset.dx,
      y: player.y + offset.dy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: roll.damage,
      pierce: cfg.pierce,
      ttlMs: 1800,
      radius: 6,
      color: 0xd3d3d3,
      weaponId: this.id,
      isCrit: roll.isCrit,
      style: 'harpoon',
    });
  }
}
