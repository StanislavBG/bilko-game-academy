import { Enemy } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { fanSpread, leadAimAngle } from '../../systems/firing-patterns';
import { chargeUp } from '../../systems/enemy-attack-fx';
import { getEnemySpec } from '../../content/active-pack';

/**
 * N2 Patrol Gunboat — ranged backbone; matches player's Y to broadside perpendicular.
 */

export class PatrolGunboat extends Enemy {
  private fireTimerMs = 2000 + Math.random() * 1000;
  private pendingFire: { ang: number } | null = null;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, getEnemySpec('patrol-gunboat'), x, y);
  }

  /** Per-instance variant: 0 = Navy blue (default), 1 = weathered slate,
   *  2 = red-stripe "royal" gunboat. Rolled once per spawn. */
  private readonly variant = Math.floor(Math.random() * 3);

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    const hulls = [0x3a4d6a, 0x2a3a4a, 0x4a4060] as const;
    const stripes = [0xffffff, 0xa0a8b0, 0xa83030] as const;
    const sails = [0xf0f0f0, 0xe0e6ea, 0xffefe0] as const;
    const hull = hulls[this.variant]!;
    const sail = sails[this.variant]!;

    g.fillStyle(hull, 1).fillRect(-16, -28, 32, 56);
    // Gunwale stripe along the side.
    g.fillStyle(stripes[this.variant]!, 0.85).fillRect(-16, 2, 32, 2);
    g.fillStyle(sail, 1).fillTriangle(-14, -28, 14, -28, 0, -44);
    g.fillStyle(0x1a2030, 1).fillRect(-2, -28, 4, 28);
    // Cannon bumps on sides.
    g.fillStyle(0x808080, 1);
    g.fillRect(-20, -8, 4, 4);
    g.fillRect(16, -8, 4, 4);
    g.fillRect(-20, 4, 4, 4);
    g.fillRect(16, 4, 4, 4);
  }

  private readonly homeX: number = this.x;
  private swayPhase = Math.random() * Math.PI * 2;
  private bobPhaseY = Math.random() * Math.PI * 2;
  /** Permanent station Y in the upper third — the boat never descends past this. */
  private readonly stationY = 200 + Math.random() * 180;
  private readonly bandBottom = 440;

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;

    // Galaga-style hover — gunboat parks in the upper third and broadsides
    // from there. Maneuvering returns to the station; never past mid-screen.
    this.swayPhase += dt * 1.0;
    this.bobPhaseY += dt * 0.8;
    const sway = Math.sin(this.swayPhase) * 50;
    const targetX = this.homeX + sway;
    const targetY = this.stationY + Math.sin(this.bobPhaseY) * 25;
    const nextX = this.x + (targetX - this.x) * Math.min(1, dt * 2.2);
    let nextY = this.y + (targetY - this.y) * Math.min(1, dt * 1.6);
    if (nextY > this.bandBottom) {
      nextY = nextY + (this.stationY - nextY) * Math.min(1, dt * 2.5);
    }
    this.setPos(nextX, nextY);

    // Always firing once on station.
    this.fireTimerMs -= deltaMs;
    if (this.fireTimerMs <= 0 && !this.pendingFire) {
      this.beginFireTell(380);
      this.fireTimerMs = 2000;
    }
  }

  /** §5.3 Phase 1 — 380 ms tell: ports glow + dashed reticle at lead point. */
  private beginFireTell(duration: number): void {
    const player = this.scene.player;
    const speed = 480;
    const ang = leadAimAngle(
      this.x,
      this.y,
      { x: player.x, y: player.y, vx: player.vx, vy: player.vy },
      speed,
    );
    const leadX = this.x + Math.cos(ang) * 160;
    const leadY = this.y + Math.sin(ang) * 160;
    this.pendingFire = { ang };
    // Aim reticle disposer is self-scheduling (cleans itself after `duration`),
    // so we discard the returned cancel — the tell will end on its own.
    this.beginAttackTell(
      duration,
      { x: leadX, y: leadY },
      this.spec.showAimReticle ?? false,
    );
    chargeUp(this.scene, this.x, this.y, this.element, duration);
    this.scene.time.delayedCall(duration, () => this.onWind());
  }

  /** §5.3 Phase 2 — 90 ms wind: cannons "retract" visually. */
  private onWind(): void {
    if (!this.active || !this.pendingFire) return;
    if (this.body && !this.scene.fx.reducedMotion()) {
      // Tiny squash to sell the load.
      this.scene.tweens.add({
        targets: this.body,
        scaleX: 0.94,
        scaleY: 1.02,
        duration: 90,
        yoyo: true,
      });
    }
    this.scene.time.delayedCall(90, () => this.onFire());
  }

  /** §5.3 Phase 3 — fire the 5-bullet fan. */
  private onFire(): void {
    if (!this.active || !this.pendingFire) return;
    const { ang } = this.pendingFire;
    const speed = 480;
    this.scene.fx.muzzleFlashMusket(this.x, this.y, ang);
    fanSpread(this.scene, this.x, this.y, ang, {
      bullets: 5,
      spreadDeg: 30,
      speed,
      damage: 1,
    }, this.spec.id, 'cannon');
    this.pendingFire = null;
  }
}
