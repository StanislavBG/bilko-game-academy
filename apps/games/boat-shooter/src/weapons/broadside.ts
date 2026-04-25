import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';
import { fireThunderclapBroadside } from './evolved-behaviors';

/**
 * W2 Broadside Shot — rhythmic big-gun salvo, both flanks simultaneously.
 *
 * Per-level (docs/games/boat-shooter/04-weapons.md):
 *   L1: 3 cannons/side, every 4.0s, 2 dmg
 *   L2: 4/side
 *   L3: 4/side, every 3.0s
 *   L4: 5/side
 *   L5: 5/side, every 2.5s, +1 dmg, +1 pierce
 *
 * Projectiles fire horizontally left + right with tiny ±4° spread per flank.
 */
export class BroadsideShot extends Weapon {
  readonly id = 'broadside';
  private cooldownMs = 0;

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) return;

    this.cooldownMs -= deltaMs;
    if (this.cooldownMs > 0) return;

    if (this.scene.runState.hasEvolution('thunderclap-broadside')) {
      fireThunderclapBroadside(this.scene);
      this.cooldownMs = this.withCDR(1200);
      return;
    }

    const cfg = this.configFor(lvl);
    this.fireSalvo(cfg);
    this.cooldownMs = this.withCDR(cfg.intervalMs);
  }

  private configFor(lvl: number): {
    perSide: number;
    intervalMs: number;
    pierce: number;
    dmg: number;
  } {
    switch (lvl) {
      case 1: return { perSide: 3, intervalMs: 4000, pierce: 0, dmg: 2 };
      case 2: return { perSide: 4, intervalMs: 4000, pierce: 0, dmg: 2 };
      case 3: return { perSide: 4, intervalMs: 3000, pierce: 0, dmg: 2 };
      case 4: return { perSide: 5, intervalMs: 3000, pierce: 0, dmg: 2 };
      case 5:
      default: return { perSide: 5, intervalMs: 2500, pierce: 1, dmg: 3 };
    }
  }

  private fireSalvo(cfg: { perSide: number; pierce: number; dmg: number }): void {
    const player = this.scene.player;
    const pool = this.scene.weapons.projectiles;
    const speed = 700;

    // Visible recoil on the cannon barrels only — the hull does not move,
    // so player input never fights weapon feedback.
    player.recoilCannons('port');
    player.recoilCannons('starboard');

    for (const sign of [-1, 1] as const) {
      const baseAngle = sign === -1 ? Math.PI : 0; // left vs right

      // One directional muzzle flash + smoke wall per flank.
      this.scene.fx.muzzleFlashCannon(
        player.x + sign * 30,
        player.y,
        baseAngle,
        0xff9b47,
      );
      this.scene.fx.broadsideSmokeWall(player.x + sign * 30, player.y, sign);

      for (let i = 0; i < cfg.perSide; i++) {
        const spreadDeg = cfg.perSide === 1
          ? 0
          : (i / (cfg.perSide - 1)) * 8 - 4; // ±4° total spread
        const angle = baseAngle + (spreadDeg * Math.PI) / 180;
        const roll = rollDamage(this.scene.runState, cfg.dmg);

        const proj = pool.acquire();
        proj.spawn({
          x: player.x + sign * 30,
          y: player.y + (i - (cfg.perSide - 1) / 2) * 6, // stagger vertically slightly
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          damage: roll.damage,
          pierce: cfg.pierce,
          ttlMs: 2000,
          radius: 13, // bumped 10 → 13 for arcade-visible player fire
          color: 0xffd880,
          weaponId: this.id,
          isCrit: roll.isCrit,
          style: 'broadside-shell',
        });
      }
    }
  }
}
