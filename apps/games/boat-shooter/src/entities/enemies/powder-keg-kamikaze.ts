import { Enemy } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { getEnemySpec } from '../../content/active-pack';

/**
 * P4 Powder-Keg Kamikaze — suicide bomber. Fuse at HP <50% or within 80px; 1.5s delay then big AoE.
 */

export class PowderKegKamikaze extends Enemy {
  private ignited = false;
  private fuseExpiresAtMs = 0;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, getEnemySpec('powder-keg-kamikaze'), x, y);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x6a3a1a, 1).fillRect(-14, -14, 28, 28);
    g.fillStyle(0x1a0808, 1).fillCircle(0, -18, 6); // fuse bud
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    if (this.statuses.isImmobilized()) return;
    const dt = deltaMs / 1000;
    const p = this.scene.player;

    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.setPos(this.x + (dx / len) * this.spec.speed * dt, this.y + (dy / len) * this.spec.speed * dt);

    // Ignition.
    if (!this.ignited && (this.hp < this.spec.maxHp * 0.5 || len < 80)) {
      this.ignited = true;
      this.fuseExpiresAtMs = this.scene.time.now + 1500;
      // Visual pulse.
      this.scene.tweens.add({
        targets: this.graphics,
        alpha: { from: 1, to: 0.5 },
        yoyo: true,
        repeat: 4,
        duration: 300,
      });
    }

    if (this.ignited && (this.scene.time.now >= this.fuseExpiresAtMs || len < this.spec.collisionRadius + p.radius)) {
      this.explode();
    }
  }

  private explode(): void {
    // AoE damage.
    const r = 100;
    const r2 = r * r;
    const p = this.scene.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    if (dx * dx + dy * dy <= r2) {
      p.takeDamage(4);
    }
    this.scene.enemies.forEachActive((e) => {
      if (e === this) return;
      const ex = e.x - this.x;
      const ey = e.y - this.y;
      if (ex * ex + ey * ey <= r2) {
        e.takeStatusDamage(4, 'burn');
      }
    });
    // Visual.
    const flash = this.scene.add.circle(this.x, this.y, r, 0xff8a3a, 0.8);
    flash.setDepth(5);
    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 0.9, to: 0 },
      scale: { from: 0.6, to: 1.3 },
      duration: 400,
      onComplete: () => flash.destroy(),
    });
    this.kill();
  }
}
