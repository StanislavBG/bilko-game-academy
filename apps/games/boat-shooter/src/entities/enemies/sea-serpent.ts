import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';

/**
 * S2 Sea Serpent — multi-segment weaving threat. For P2 we model as single enemy
 * with wider collision. Full segment-by-segment dismemberment is P3+ polish.
 */
export const SEA_SERPENT_SPEC: EnemySpec = {
  id: 'sea-serpent',
  maxHp: 18,
  armor: 1,
  speed: 140,
  contactDamage: 3,
  collisionRadius: 40,
  drops: { coinsSmall: 0, coinsMedium: 2, coinsLarge: 1, gemChance: 0.1, xpOrbs: 3 },
  color: 0x2a7a4a,
  visualRadius: 38,
  deathStyle: 'splash', // serpent collapses — heavy water splash ring
};

export class SeaSerpent extends Enemy {
  private phase = 0;
  private spitTimerMs = 3000;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, SEA_SERPENT_SPEC, x, y);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x2a7a4a, 1).fillCircle(0, 0, 36);
    g.lineStyle(2, 0x0a3a1a, 1).strokeCircle(0, 0, 36);
    g.fillStyle(0xffd84a, 1).fillCircle(-10, -6, 4); // eye
    g.fillCircle(10, -6, 4);
    g.fillStyle(0x4a2020, 1).fillTriangle(-14, 16, 14, 16, 0, 30); // maw
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    if (this.statuses.isImmobilized()) return;
    const dt = deltaMs / 1000;
    this.phase += dt * 1.2;
    const p = this.scene.player;

    // Weave across the screen heading toward player's y.
    const dy = p.y - this.y;
    const weave = Math.sin(this.phase) * 120;
    const targetX = p.x + weave;
    const dx = targetX - this.x;
    const len = Math.hypot(dx, dy) || 1;
    this.setPos(this.x + (dx / len) * this.spec.speed * dt, this.y + (dy / len) * this.spec.speed * dt);

    this.spitTimerMs -= deltaMs;
    if (this.spitTimerMs <= 0) {
      this.spitVenom();
      this.spitTimerMs = 4000;
    }
  }

  private spitVenom(): void {
    const p = this.scene.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const speed = 340;
    this.scene.enemies.spawnEnemyBullet(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 2);
  }
}
