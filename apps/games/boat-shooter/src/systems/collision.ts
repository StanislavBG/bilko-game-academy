import type { StageScene } from '../scenes/stage-scene';
import type { EnemyElement } from '../entities/enemy';
import type { ProjectileStyle } from '../entities/projectile';

/** Map a projectile visual style onto the combat-log element bucket.
 *  Unknown / physical styles fall back to 'physical'. */
function styleToElement(style: ProjectileStyle | undefined): EnemyElement {
  switch (style) {
    case 'broadside-shell': return 'fire';
    case 'lightning-orb':   return 'storm';
    case 'harpoon':         return 'physical';
    case 'musket-ball':     return 'physical';
    case 'cannonball':
    default:                return 'physical';
  }
}

/**
 * Collision system. O(N×M) where N=active projectiles, M=active enemies —
 * fine for P1 at typical densities (<30 projectiles × <20 enemies = 600 checks
 * per frame). Spatial partitioning can come later in P6 if needed.
 *
 * Handles:
 *   1. Player projectile → enemy (damage + pierce + dmg number).
 *   2. Enemy bullet → player (damage).
 *   3. Enemy body → player (contact damage).
 */
export class CollisionSystem {
  readonly scene: StageScene;

  constructor(scene: StageScene) {
    this.scene = scene;
  }

  update(_deltaMs: number): void {
    this.projectileVsEnemy();
    this.enemyBulletVsPlayer();
    this.enemyBodyVsPlayer();
  }

  private projectileVsEnemy(): void {
    const scene = this.scene;
    const pool = scene.weapons.projectiles;

    pool.forEachActive((proj) => {
      if (!proj.active) return;
      scene.enemies.forEachActive((enemy) => {
        if (!proj.active) return;
        if (proj.alreadyHit.has(enemy.runtimeId)) return;

        const dx = proj.sprite.x - enemy.x;
        const dy = proj.sprite.y - enemy.y;
        const r = proj.radius + enemy.spec.collisionRadius;
        if (dx * dx + dy * dy > r * r) return;

        // Hit.
        proj.alreadyHit.add(enemy.runtimeId);
        const hpBefore = enemy.hp;
        const applied = enemy.takeDamage(proj.damage, 0 /* no armor pierce in P1 */, proj.isCrit);
        const killed = hpBefore > 0 && enemy.hp <= 0;
        scene.damageNumbers.spawn(enemy.x, enemy.y - enemy.spec.collisionRadius, applied, {
          crit: proj.isCrit,
        });
        scene.fx.hitSpark(proj.sprite.x, proj.sprite.y, proj.isCrit ? 0xffe066 : 0xffffff);
        if (proj.isCrit) {
          scene.audio.sfxCrit();
          scene.achievements.notifyCrit();
          // White screen-edge pulse on crit dealt — signals the weight of the hit.
          scene.vignette.pulseOnDamage(1, 'white');
        } else {
          scene.audio.sfxHit();
        }
        // Combat log — one entry per damage instance.
        scene.combatLog.push({
          kind: 'dealt',
          time: Date.now(),
          target: enemy.spec.id,
          amount: applied,
          weapon: proj.weaponId,
          isCrit: proj.isCrit,
          element: styleToElement(proj.style),
          kill: killed,
        });

        if (proj.pierceRemaining > 0) {
          proj.pierceRemaining -= 1;
        } else {
          proj.despawn();
        }
      });
    });
  }

  private enemyBulletVsPlayer(): void {
    const scene = this.scene;
    const player = scene.player;
    for (const b of scene.enemies.activeEnemyBullets()) {
      const dx = b.sprite.x - player.x;
      const dy = b.sprite.y - player.y;
      const r = 6 + player.radius;
      if (dx * dx + dy * dy <= r * r) {
        // Route through the player's typed takeDamage so the combat log
        // entry carries the source enemy id + damage type.
        const taken = player.takeDamage(b.damage, {
          source: b.sourceEnemyId ?? 'enemy-bullet',
          type: 'projectile',
        });
        if (taken > 0) {
          scene.damageNumbers.spawn(player.x, player.y - 40, taken);
        }
        scene.enemies.killEnemyBullet(b);
      }
    }
  }

  private enemyBodyVsPlayer(): void {
    const scene = this.scene;
    const player = scene.player;
    scene.enemies.forEachActive((enemy) => {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const r = enemy.spec.collisionRadius + player.radius;
      if (dx * dx + dy * dy <= r * r) {
        const taken = player.takeDamage(enemy.spec.contactDamage, {
          source: enemy.spec.id,
          type: 'contact',
        });
        if (taken > 0) {
          scene.damageNumbers.spawn(player.x, player.y - 40, taken);
        }
      }
    });
  }
}
