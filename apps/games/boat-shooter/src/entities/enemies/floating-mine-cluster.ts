import { Enemy } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { getEnemySpec } from '../../content/active-pack';

/**
 * N+ Floating Mine Cluster — drifts at river-scroll speed, no fire, big
 * contact damage. Pure dodge-or-shoot puzzle. 2 HP so it isn't free.
 */

export class FloatingMineCluster extends Enemy {
  constructor(scene: StageScene, x: number, y: number) {
    super(scene, getEnemySpec('floating-mine-cluster'), x, y);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    // Three clustered mines.
    const offsets: ReadonlyArray<readonly [number, number]> = [[-10, -6], [10, -6], [0, 8]];
    for (const [dx, dy] of offsets) {
      g.fillStyle(0x2a2a1a, 1).fillCircle(dx, dy, 10);
      g.lineStyle(1.5, 0x6a6a4a, 1).strokeCircle(dx, dy, 10);
      // Spikes.
      for (const [sx, sy] of [[-12, 0], [12, 0], [0, -12], [0, 12]] as const) {
        g.fillStyle(0x5a5a3a, 1).fillCircle(dx + sx * 0.6, dy + sy * 0.6, 1.8);
      }
    }
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    if (this.statuses.isImmobilized()) return;
    const dt = deltaMs / 1000;
    this.setPos(this.x, this.y + this.spec.speed * dt);
    if (this.y > 1180) { this.active = false; this.container.destroy(); }
  }
}
