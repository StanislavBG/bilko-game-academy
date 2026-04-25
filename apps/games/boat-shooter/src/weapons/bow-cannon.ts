import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';
import type { StageScene } from '../scenes/stage-scene';
import { fireCannonadeSupreme } from './evolved-behaviors';

/**
 * W1 Bow Cannon Volley — starter weapon, auto-forward.
 *
 * Per-level spec (docs/games/boat-shooter/04-weapons.md):
 *   L1: 1 proj, 3.0 shots/s,  1 dmg, 0 pierce
 *   L2: 2 proj (small spread)
 *   L3: 2 proj, 3.5 shots/s
 *   L4: 3 proj
 *   L5: 3 proj, +1 pierce, +25% dmg
 *
 * Projectiles fire UP the screen (world -Y direction = downstream).
 */
export class BowCannonVolley extends Weapon {
  readonly id = 'bow-cannon';
  private cooldownMs = 0;
  private evolvedShotCounter = { n: 0 };

  constructor(scene: StageScene) {
    super(scene);
  }

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) return;

    this.cooldownMs -= deltaMs;
    if (this.cooldownMs > 0) return;

    if (this.scene.runState.hasEvolution('cannonade-supreme')) {
      fireCannonadeSupreme(this.scene, this.evolvedShotCounter);
      this.cooldownMs = this.withCDR(250); // 4 shots/s
      return;
    }

    const cfg = this.configFor(lvl);
    this.fireVolley(cfg);
    this.cooldownMs = this.withCDR(1000 / cfg.shotsPerSec);
  }

  /**
   * L1 bumped from "1 proj, 3/s, 1 dmg" to "2 proj, 4/s, 1 dmg" so the
   * starter weapon never feels underpowered — the player gets immediate
   * "ship has real guns" feedback. Each L tier stays a visible upgrade.
   */
  private configFor(lvl: number): { count: number; shotsPerSec: number; pierce: number; dmg: number } {
    switch (lvl) {
      case 1:
        return { count: 2, shotsPerSec: 4.0, pierce: 0, dmg: 1 };
      case 2:
        return { count: 3, shotsPerSec: 4.0, pierce: 0, dmg: 1 };
      case 3:
        return { count: 3, shotsPerSec: 5.0, pierce: 0, dmg: 1 };
      case 4:
        return { count: 4, shotsPerSec: 5.0, pierce: 1, dmg: 1 };
      case 5:
      default:
        return { count: 4, shotsPerSec: 5.5, pierce: 2, dmg: 1.25 };
    }
  }

  private fireVolley(cfg: { count: number; pierce: number; dmg: number }): void {
    const player = this.scene.player;
    const pool = this.scene.weapons.projectiles;
    const speed = 800; // px/sec (COMBAT_BASELINE.projectileSpeed)

    // Spread widens with count so higher-level volleys visibly fan out —
    // a 2-proj L1 shoots a tight 8° wedge (clearly twin cannons), while a
    // 4-proj L4+ fans 24° so the player reads "full broadside."
    const spreadDeg = cfg.count >= 4 ? 24 : cfg.count === 3 ? 16 : cfg.count === 2 ? 8 : 0;

    // Origin point at the current ship's bow tip (tier-aware).
    const muzzleY = player.y + player.bowMuzzleY();

    // Tier-aware cannon muzzle flash. No bow-recoil kick — the ship stays
    // anchored so the player's movement intent is never fought by the
    // weapon.
    this.scene.fx.muzzleFlashCannon(player.x, muzzleY, -Math.PI / 2, 0xffd27a);
    this.scene.audio.sfxCannon();

    for (let i = 0; i < cfg.count; i++) {
      const offsetDeg =
        cfg.count === 1
          ? 0
          : (i / (cfg.count - 1)) * spreadDeg - spreadDeg / 2;
      const angle = -Math.PI / 2 + (offsetDeg * Math.PI) / 180;

      const roll = rollDamage(this.scene.runState, cfg.dmg);

      const proj = pool.acquire();
      proj.spawn({
        x: player.x,
        y: muzzleY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: roll.damage,
        pierce: cfg.pierce,
        ttlMs: 2500,
        // Bumped 9 → 12 so cannonballs are clearly visible against water.
        // Paired with the new additive glow halo (projectile.ts) for
        // arcade-standard "player bullets bright + cool + glowing" feel.
        radius: 12,
        color: 0xffffff, // was 0xd8deea — full white pops against teal water
        weaponId: this.id,
        isCrit: roll.isCrit,
        style: 'cannonball',
      });
    }
  }
}
