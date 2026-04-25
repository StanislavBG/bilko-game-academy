import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { WORLD_HEIGHT } from '../../constants';

/**
 * N4 Bank Sniper Tower — stationary riverbank. High-damage rifle, leads player velocity.
 * Position is fixed on the side bank; despawns when scrolled past.
 */
export const BANK_SNIPER_TOWER_SPEC: EnemySpec = {
  id: 'bank-sniper-tower',
  maxHp: 15,
  armor: 3,
  speed: 0,
  contactDamage: 0,
  collisionRadius: 30,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 1, gemChance: 0.15, xpOrbs: 2 },
  color: 0x6a5a3a,
  visualRadius: 28,
  element: 'physical',
  // Laser is the primary tell; the 2-stage reticle would be redundant.
  showAimReticle: false,
  deathStyle: 'topple',  // tower falls forward + dust at the base
};

export class BankSniperTower extends Enemy {
  private aimLaserActive = false;
  private fireTimerMs = 2000;
  private dodgeUntilMs = 0;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, BANK_SNIPER_TOWER_SPEC, x, y);
  }

  /** Variant: 0 = plain wood, 1 = red-roof garrison, 2 = stone-base watchtower. */
  private readonly variant = Math.floor(Math.random() * 3);

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    const bases = [0x6a5a3a, 0x6a4a2a, 0x808080] as const;
    const roofs = [0x4a3a20, 0xa83030, 0x5a5a5a] as const;
    g.fillStyle(bases[this.variant]!, 1).fillRect(-18, -30, 36, 60);
    g.fillStyle(roofs[this.variant]!, 1).fillRect(-14, -28, 28, 8);
    // Sandbag perimeter at the base (extra detail for stone variant).
    if (this.variant === 2) {
      g.fillStyle(0x9a8a6a, 1).fillRect(-20, 20, 8, 6);
      g.fillStyle(0x9a8a6a, 1).fillRect(12, 20, 8, 6);
    }
    g.fillStyle(0x808080, 1).fillRect(-4, -10, 8, 24);
    // Small red pennant on top.
    g.fillStyle(0xa83030, 1).fillTriangle(0, -34, 8, -32, 0, -28);
    g.lineStyle(2, 0x000, 0.8).strokeRect(-18, -30, 36, 60);
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const now = this.scene.time.now;

    // Drift down at scroll speed so it feels like the river is moving past.
    this.setPos(this.x, this.y + 3);

    if (this.y > WORLD_HEIGHT + 100) {
      // Scrolled off — despawn silently without drops.
      this.container.destroy();
      this.active = false;
      return;
    }

    // Duck periodically (iframes while ducked).
    if (now < this.dodgeUntilMs) return;
    if (Math.random() < 0.005) {
      this.dodgeUntilMs = now + 1000;
      this.graphics.setAlpha(0.4);
      this.scene.time.delayedCall(1000, () => this.graphics.setAlpha(1));
      return;
    }

    this.fireTimerMs -= deltaMs;
    if (this.fireTimerMs <= 400 && !this.aimLaserActive) {
      // §5.5 Laser IS the primary tell; begin it here at 400 ms pre-fire.
      this.aimLaserActive = true;
      this.beginFireTell();
    }
    // §5.5 Wind: 120 ms before the shot, emit a tiny muzzle pre-dot.
    if (this.fireTimerMs <= 120 && this.fireTimerMs > 0 && !this.preDotFired) {
      this.preDotFired = true;
      this.onWind();
    }
    if (this.fireTimerMs <= 0) {
      this.onFire();
      this.fireTimerMs = 2000;
      this.aimLaserActive = false;
      this.preDotFired = false;
    }
  }

  private preDotFired = false;

  /** Phase 1 — draw the aim laser. */
  private beginFireTell(): void {
    this.drawAimLaser();
  }

  /** Phase 2 — 120 ms muzzle pre-dot + tower roof dip. */
  private onWind(): void {
    if (!this.active) return;
    const dot = this.scene.add.circle(this.x, this.y, 3, 0xff4040, 0.9);
    dot.setDepth(9);
    this.scene.tweens.add({
      targets: dot,
      alpha: 0,
      scale: { from: 1, to: 1.6 },
      duration: 120,
      onComplete: () => dot.destroy(),
    });
    if (this.body && !this.scene.fx.reducedMotion()) {
      // Tower dips -4 px (rear roof sag) for the recoil.
      this.scene.tweens.add({
        targets: this.body,
        y: this.body.y - 4,
        duration: 80,
        yoyo: true,
        ease: 'Quad.out',
      });
    }
  }

  private drawAimLaser(): void {
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0xff3a3a, 0.6);
    g.beginPath();
    g.moveTo(this.x, this.y);
    g.lineTo(this.scene.player.x, this.scene.player.y);
    g.strokePath();
    g.setDepth(7);
    this.scene.tweens.add({
      targets: g,
      alpha: { from: 0.6, to: 0 },
      duration: 400,
      onComplete: () => g.destroy(),
    });
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    if (this.scene.time.now < this.dodgeUntilMs) return 0; // iframes while ducked
    return super.takeDamage(damage, armorPierce, isCrit);
  }

  /** Phase 3 — spawn the rifle bullet + muzzle flash + smoke puff. */
  private onFire(): void {
    const player = this.scene.player;
    const leadX = player.x;
    const leadY = player.y;
    const ang = Math.atan2(leadY - this.y, leadX - this.x);
    const speed = 900;
    const vx = Math.cos(ang) * speed;
    const vy = Math.sin(ang) * speed;
    this.scene.fx.muzzleFlashMusket(this.x, this.y, ang);
    this.scene.enemies.spawnEnemyBullet(this.x, this.y, vx, vy, 2, this.spec.id, 'sniper');
  }
}
