import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';

/**
 * S4 Cursed Swarm — tiny homing fodder, HP 1, chip damage. Many at once.
 */
export const CURSED_SWARM_SPEC: EnemySpec = {
  id: 'cursed-swarm',
  maxHp: 1,
  armor: 0,
  speed: 180,
  contactDamage: 0.3,
  collisionRadius: 10,
  drops: { coinsSmall: 1, coinsMedium: 0, coinsLarge: 0, gemChance: 0, xpOrbs: 0 },
  color: 0x3a2a5a,
  visualRadius: 8,
  element: 'shadow',
  deathStyle: 'dissolve', // swarm mote vanishes with a single cyan wisp
};

export class CursedSwarm extends Enemy {
  constructor(scene: StageScene, x: number, y: number) {
    super(scene, CURSED_SWARM_SPEC, x, y);
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
