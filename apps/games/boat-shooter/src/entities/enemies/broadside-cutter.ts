import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { fanSpread } from '../../systems/firing-patterns';
import { chargeUp } from '../../systems/enemy-attack-fx';

/**
 * P2 Broadside Cutter — "drunk cannons"; pirate ranged. Fires in random directions
 * sometimes hitting its own allies.
 */
export const BROADSIDE_CUTTER_SPEC: EnemySpec = {
  id: 'broadside-cutter',
  maxHp: 7,
  armor: 1,
  speed: 140,
  contactDamage: 2,
  collisionRadius: 32,
  drops: { coinsSmall: 0, coinsMedium: 2, coinsLarge: 0, gemChance: 0.05, xpOrbs: 1 },
  color: 0x5a3a24,
  visualRadius: 30,
  element: 'physical',
  showAimReticle: false,
  deathStyle: 'chain',   // flank-magazine cascade, bow-to-stern
};

export class BroadsideCutter extends Enemy {
  private fireTimerMs = 2000;
  private pendingFire: { baseAng: number } | null = null;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, BROADSIDE_CUTTER_SPEC, x, y);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x5a3a24, 1).fillRect(-14, -26, 28, 52);
    g.fillStyle(0x2a1a10, 1).fillTriangle(-14, -26, 14, -26, 0, -38);
    g.fillStyle(0x8b4d1c, 1).fillRect(-2, -26, 4, 18);
  }

  private readonly homeX = this.x;
  private swayPhase = Math.random() * Math.PI * 2;
  private holdY = 260 + Math.random() * 200;

  update(deltaMs: number): void {
    if (!this.active) return;
    if (this.statuses.isImmobilized()) return;
    const dt = deltaMs / 1000;

    // Raptor-style: descend to a hold-Y, then drift at half speed.
    this.swayPhase += dt * 1.6;
    const sway = Math.sin(this.swayPhase) * 60;
    const targetX = this.homeX + sway;
    const nextX = this.x + (targetX - this.x) * Math.min(1, dt * 2.4);
    const ySpeed = this.y < this.holdY ? this.spec.speed : this.spec.speed * 0.4;
    this.setPos(nextX, this.y + ySpeed * dt);

    if (this.y > 1120) {
      this.active = false;
      this.container.destroy();
      return;
    }

    this.fireTimerMs -= deltaMs;
    if (this.fireTimerMs <= 0 && !this.pendingFire) {
      this.beginFireTell(300);
      this.fireTimerMs = 2200;
    }
  }

  /** §5.6 Phase 1 — 300 ms tell: flank cannon ports glow orange. */
  private beginFireTell(duration: number): void {
    const baseAng = Math.PI / 2 + (Math.random() - 0.5) * (50 * Math.PI / 180);
    this.pendingFire = { baseAng };
    const leadX = this.x + Math.cos(baseAng) * 140;
    const leadY = this.y + Math.sin(baseAng) * 140;
    this.beginAttackTell(
      duration,
      { x: leadX, y: leadY },
      this.spec.showAimReticle ?? false,
    );
    chargeUp(this.scene, this.x, this.y, this.element, duration);
    this.scene.time.delayedCall(duration, () => this.onWind());
  }

  /** §5.6 Phase 2 — 80 ms wind: cannons recoil into ports. */
  private onWind(): void {
    if (!this.active || !this.pendingFire) return;
    if (this.body && !this.scene.fx.reducedMotion()) {
      this.scene.tweens.add({
        targets: this.body,
        scaleX: 0.95,
        duration: 80,
        yoyo: true,
      });
    }
    this.scene.time.delayedCall(80, () => this.onFire());
  }

  /** §5.6 Phase 3 — fire the 7-bullet fan. */
  private onFire(): void {
    if (!this.active || !this.pendingFire) return;
    const { baseAng } = this.pendingFire;
    this.scene.fx.muzzleFlashMusket(this.x, this.y, baseAng);
    fanSpread(this.scene, this.x, this.y, baseAng, {
      bullets: 7,
      spreadDeg: 60,
      speed: 380,
      damage: 1,
    });
    this.pendingFire = null;
  }
}
