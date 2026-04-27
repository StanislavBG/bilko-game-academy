import { Enemy } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { getEnemySpec } from '../../content/active-pack';

/**
 * N+ River Skiff Bandits — fragile pop-fodder that fires forward.
 *
 * 1 HP, 60 px/s, fires a single straight-down musket ball every 5 s. Brigand
 * variant of the river-fisher — same dumb behavior, different silhouette.
 */

export class RiverSkiffBandits extends Enemy {
  private fireTimerMs = 2000 + Math.random() * 2000;
  private swayPhase = Math.random() * Math.PI * 2;
  private readonly homeX: number;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, getEnemySpec('river-skiff-bandits'), x, y);
    this.homeX = x;
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x9a3a3a, 1).fillRect(-10, -18, 20, 36);
    g.fillStyle(0x2a1610, 1).fillRect(-1, -18, 2, 14);
    g.fillStyle(0x4a2010, 1).fillTriangle(-10, -18, 10, -18, 0, -28);
    g.fillStyle(0xe8c060, 1).fillCircle(0, -2, 3);
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    if (this.statuses.isImmobilized()) return;
    const dt = deltaMs / 1000;
    this.swayPhase += dt * 1.4;
    const targetX = this.homeX + Math.sin(this.swayPhase) * 40;
    const nextX = this.x + (targetX - this.x) * Math.min(1, dt * 1.6);
    const nextY = this.y + this.spec.speed * dt;
    this.setPos(nextX, nextY);

    if (this.y > 1180) { this.active = false; this.container.destroy(); return; }

    this.fireTimerMs -= deltaMs;
    if (this.fireTimerMs <= 0) {
      this.fireForward();
      this.fireTimerMs = 5000;
    }
  }

  private fireForward(): void {
    this.scene.enemies.spawnEnemyBullet(
      this.x, this.y,
      0, 320,
      1,
      this.spec.id,
      'musket',
    );
  }
}
