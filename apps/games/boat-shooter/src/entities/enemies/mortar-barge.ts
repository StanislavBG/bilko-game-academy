import { Enemy } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { chargeUp } from '../../systems/enemy-attack-fx';
import { getEnemySpec } from '../../content/active-pack';

/**
 * N3 Mortar Barge — slow heavy area-denial. Fires lead-aimed mortars with
 * telegraphed landing zones.
 */

export class MortarBarge extends Enemy {
  private fireTimerMs = 2500;
  private pendingFire: { predictX: number; predictY: number } | null = null;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, getEnemySpec('mortar-barge'), x, y);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x3a4a3a, 1).fillRect(-22, -30, 44, 60);
    g.fillStyle(0x5a6a5a, 1).fillRect(-16, -24, 32, 12);
    // Mortar tube.
    g.fillStyle(0x808080, 1).fillCircle(0, -4, 10);
    g.lineStyle(2, 0x2a2a2a, 1).strokeCircle(0, -4, 10);
    // Deck detail.
    g.fillStyle(0x2a3020, 1).fillRect(-20, 20, 40, 4);
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    if (this.statuses.isImmobilized()) return;
    const dt = deltaMs / 1000;
    const player = this.scene.player;

    // Hold position at about y = 200 (upper third); move slowly horizontally to face player.
    const targetY = 260;
    const targetX = player.x < this.x ? this.x - 30 * dt : this.x + 30 * dt;
    const dy = targetY - this.y;
    const vy = Math.sign(dy) * Math.min(Math.abs(dy), this.spec.speed * dt);
    this.setPos(targetX, this.y + vy);

    this.fireTimerMs -= deltaMs;
    if (this.fireTimerMs <= 0 && !this.pendingFire) {
      this.beginFireTell(700);
      this.fireTimerMs = 4000;
    }
  }

  /** §5.4 Phase 1 — 700 ms tell: tube tilts, barrel glows, landing reticle. */
  private beginFireTell(duration: number): void {
    const player = this.scene.player;
    const predictX = player.x;
    const predictY = player.y;
    this.pendingFire = { predictX, predictY };

    // Keep the original landing-ring telegraph (diegetic fire marker) since
    // it's the primary readability cue for the mortar; the new reticle only
    // fires if spec.showAimReticle is on — it overlays at the same point.
    const telegraph = this.scene.add.graphics();
    telegraph.lineStyle(3, 0xff3a0a, 0.8).strokeCircle(predictX, predictY, 60);
    telegraph.fillStyle(0xff3a0a, 0.15).fillCircle(predictX, predictY, 60);
    telegraph.setDepth(3);
    this.scene.tweens.add({
      targets: telegraph,
      alpha: { from: 0.3, to: 1 },
      yoyo: true,
      duration: 400,
    });

    this.beginAttackTell(
      duration,
      { x: predictX, y: predictY },
      this.spec.showAimReticle ?? false,
    );
    chargeUp(this.scene, this.x, this.y - 4, this.element, duration);

    // Schedule the wind phase + then fire.
    this.scene.time.delayedCall(duration, () => {
      telegraph.destroy();
      this.onWind();
    });
  }

  /** §5.4 Phase 2 — 200 ms wind: tube pulses. */
  private onWind(): void {
    if (!this.active || !this.pendingFire) return;
    if (this.body && !this.scene.fx.reducedMotion()) {
      this.scene.tweens.add({
        targets: this.body,
        scaleY: 0.94,
        duration: 100,
        yoyo: true,
      });
    }
    this.scene.time.delayedCall(200, () => this.onFire());
  }

  /** §5.4 Phase 3 — impact check + fire flash at landing zone. */
  private onFire(): void {
    if (!this.active || !this.pendingFire) return;
    const { predictX, predictY } = this.pendingFire;
    const dx = this.scene.player.x - predictX;
    const dy = this.scene.player.y - predictY;
    if (dx * dx + dy * dy <= 60 * 60) {
      this.scene.player.takeDamage(2, { source: 'mortar-barge', type: 'projectile' });
    }
    const flash = this.scene.add.circle(predictX, predictY, 60, 0xff6a3a, 0.7);
    flash.setDepth(5);
    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 0.9, to: 0 },
      duration: 250,
      onComplete: () => flash.destroy(),
    });
    this.pendingFire = null;
  }
}
