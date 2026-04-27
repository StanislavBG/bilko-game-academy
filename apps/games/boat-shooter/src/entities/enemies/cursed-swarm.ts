import { Enemy } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { getEnemySpec } from '../../content/active-pack';

/**
 * S4 Cursed Swarm — tiny homing fodder, HP 1, chip damage. Many at once.
 */

export class CursedSwarm extends Enemy {
  constructor(scene: StageScene, x: number, y: number) {
    super(scene, getEnemySpec('cursed-swarm'), x, y);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x3a2a5a, 0.9).fillCircle(0, 0, 8);
    g.lineStyle(1, 0x1a0a3a, 1).strokeCircle(0, 0, 8);
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
  }
}
