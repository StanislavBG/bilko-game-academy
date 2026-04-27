import Phaser from 'phaser';
import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';

/**
 * W13 Ghost-Crew Volley — summon ranged burst.
 *
 * Per-level:
 *   L1: 2 ghosts every 5s, 3 shots/ghost, 1 dmg, linger 1s
 *   L2: 3 ghosts, linger 1.5s
 *   L3: 3 ghosts, every 4s, 4 shots each
 *   L4: 4 ghosts, 4 shots, +1 dmg
 *   L5: 5 ghosts, every 3s, 5 shots, +2 dmg, bonus dmg vs Supernatural
 *
 * Ghosts appear briefly around the boat, fire at nearest enemies, fade.
 */
interface Ghost {
  sprite: Phaser.GameObjects.Graphics;
  vanishAt: number;
  shotsLeft: number;
  shotIntervalMs: number;
  sinceShotMs: number;
  damage: number;
  bonusVsSupernatural: boolean;
  active: boolean;
}

export class GhostCrewVolley extends Weapon {
  readonly id = 'ghost-crew';
  private cooldownMs = 0;
  private pool: Ghost[] = [];

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) return;
    this.cooldownMs -= deltaMs;
    if (this.cooldownMs <= 0) {
      const cfg = this.configFor(lvl);
      this.summonGhosts(cfg, lvl);
      this.cooldownMs = this.withCDR(cfg.intervalMs);
    }
    this.tickGhosts(deltaMs, lvl);
  }

  private configFor(lvl: number): {
    count: number;
    intervalMs: number;
    shotsPerGhost: number;
    lingerMs: number;
    dmg: number;
  } {
    // Ghost Armada evolution: 6 permanent ghosts (linger effectively forever).
    if (this.scene.runState.hasEvolution('ghost-armada')) {
      return { count: 6, intervalMs: 99999, shotsPerGhost: 999, lingerMs: 99999, dmg: 3 };
    }
    switch (lvl) {
      // PRD 7 buff: 5000→4000ms since elemental is now the only starter weapon.
      case 1: return { count: 2, intervalMs: 4000, shotsPerGhost: 3, lingerMs: 1000, dmg: 1 };
      case 2: return { count: 3, intervalMs: 5000, shotsPerGhost: 3, lingerMs: 1500, dmg: 1 };
      case 3: return { count: 3, intervalMs: 4000, shotsPerGhost: 4, lingerMs: 1500, dmg: 1 };
      case 4: return { count: 4, intervalMs: 4000, shotsPerGhost: 4, lingerMs: 1500, dmg: 2 };
      case 5:
      default: return { count: 5, intervalMs: 3000, shotsPerGhost: 5, lingerMs: 1500, dmg: 3 };
    }
  }

  private summonGhosts(cfg: ReturnType<typeof this.configFor>, lvl: number): void {
    const p = this.scene.player;
    const bonus = lvl === 5;

    for (let i = 0; i < cfg.count; i++) {
      const ang = (i / cfg.count) * Math.PI * 2;
      const x = p.x + Math.cos(ang) * 80;
      const y = p.y + Math.sin(ang) * 80;

      let ghost = this.pool.find((g) => !g.active);
      if (!ghost) {
        const sprite = this.scene.add.graphics();
        sprite.setDepth(9);
        ghost = {
          sprite,
          vanishAt: 0,
          shotsLeft: 0,
          shotIntervalMs: 0,
          sinceShotMs: 0,
          damage: 0,
          bonusVsSupernatural: false,
          active: false,
        };
        this.pool.push(ghost);
      }
      ghost.sprite.clear();
      ghost.sprite.fillStyle(0x5ac8e8, 0.7).fillCircle(0, 0, 10);
      ghost.sprite.lineStyle(2, 0x2a8aa8, 0.9).strokeCircle(0, 0, 10);
      // Body below circle.
      ghost.sprite.fillStyle(0x5ac8e8, 0.4).fillRect(-6, 5, 12, 20);
      ghost.sprite.setPosition(x, y);
      ghost.sprite.setAlpha(1);
      ghost.vanishAt = this.scene.time.now + cfg.lingerMs;
      ghost.shotsLeft = cfg.shotsPerGhost;
      ghost.shotIntervalMs = cfg.lingerMs / cfg.shotsPerGhost;
      ghost.sinceShotMs = 0;
      ghost.damage = cfg.dmg;
      ghost.bonusVsSupernatural = bonus;
      ghost.active = true;
    }
  }

  private tickGhosts(deltaMs: number, _lvl: number): void {
    const now = this.scene.time.now;
    for (const g of this.pool) {
      if (!g.active) continue;
      g.sinceShotMs += deltaMs;

      if (g.shotsLeft > 0 && g.sinceShotMs >= g.shotIntervalMs) {
        g.sinceShotMs = 0;
        g.shotsLeft -= 1;
        this.fireGhostShot(g);
      }

      if (now >= g.vanishAt) {
        g.active = false;
        g.sprite.setVisible(false);
      }
    }
  }

  private fireGhostShot(g: Ghost): void {
    const target = this.scene.enemies.nearestTo(g.sprite.x, g.sprite.y);
    if (!target) return;
    const ang = Math.atan2(target.y - g.sprite.y, target.x - g.sprite.x);
    const speed = 600;

    // Spawn a tiny ghost projectile via the weapon system's pool.
    const pool = this.scene.weapons.projectiles;
    const roll = rollDamage(this.scene.runState, g.damage);
    const proj = pool.acquire();
    proj.spawn({
      x: g.sprite.x,
      y: g.sprite.y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      damage: roll.damage * (g.bonusVsSupernatural ? 1.0 : 1.0), // supernatural bonus applied at hit site later
      pierce: 0,
      ttlMs: 1500,
      radius: 5,
      color: 0x5ac8e8,
      weaponId: this.id,
      isCrit: roll.isCrit,
    });
  }
}
