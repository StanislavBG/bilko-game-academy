import { Enemy } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { getEnemySpec } from '../../content/active-pack';

/**
 * N+ Tax-Collector Barge — wider midboss-feeling hazard.
 *
 * 4 HP, 30 px/s, alternates port/starboard cannon fire every 2.5 s. Bigger
 * silhouette + heavier coin drop — feels like a milestone kill.
 */

export class TaxCollectorBarge extends Enemy {
  private fireTimerMs = 1500;
  /** Toggles port (-1) ↔ starboard (+1) per shot. */
  private side: -1 | 1 = -1;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, getEnemySpec('tax-collector-barge'), x, y);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    // Wide hull.
    g.fillStyle(0x5a3a20, 1).fillRect(-30, -22, 60, 44);
    g.fillStyle(0x3a2410, 0.5).fillRect(-30, -2, 60, 1.5);
    // Cargo crates on deck (the "tax money").
    g.fillStyle(0xc8a050, 1).fillRect(-18, -14, 12, 12);
    g.fillStyle(0xc8a050, 1).fillRect(6, -14, 12, 12);
    g.fillStyle(0x2a1a08, 1).fillRect(-18, -14, 12, 1);
    g.fillStyle(0x2a1a08, 1).fillRect(6, -14, 12, 1);
    // Port + starboard cannons.
    g.fillStyle(0x1a1a1a, 1).fillRect(-32, 0, 6, 4);
    g.fillStyle(0x1a1a1a, 1).fillRect(26, 0, 6, 4);
    // Mast.
    g.fillStyle(0x2a1a08, 1).fillRect(-1, -22, 2, 18);
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    if (this.statuses.isImmobilized()) return;
    const dt = deltaMs / 1000;
    const nextY = this.y + this.spec.speed * dt;
    this.setPos(this.x, nextY);

    if (this.y > 1180) { this.active = false; this.container.destroy(); return; }

    this.fireTimerMs -= deltaMs;
    if (this.fireTimerMs <= 0) {
      this.fireSide();
      this.fireTimerMs = 2500;
      this.side = this.side === -1 ? 1 : -1;
    }
  }

  private fireSide(): void {
    const offsetX = this.side * 28;
    const speed = 280;
    // Slight outward angle so the bullets pan into the play area.
    const ang = Math.PI / 2 + this.side * 0.25;
    this.scene.enemies.spawnEnemyBullet(
      this.x + offsetX, this.y,
      Math.cos(ang) * speed, Math.sin(ang) * speed,
      2,
      this.spec.id,
      'cannon',
    );
  }
}
