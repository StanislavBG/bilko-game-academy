import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';

/**
 * P3 Grappling Boarders — attach-and-drain harasser. Within 30px, attaches; deals DoT + slows
 * player while attached. Represented simply: chase to touch, then apply DoT while alive and
 * within range.
 */
export const GRAPPLING_BOARDERS_SPEC: EnemySpec = {
  id: 'grappling-boarders',
  maxHp: 5,
  armor: 0,
  speed: 200,
  contactDamage: 1,
  collisionRadius: 20,
  drops: { coinsSmall: 0, coinsMedium: 2, coinsLarge: 0, gemChance: 0, xpOrbs: 1 },
  color: 0x8b2a2a,
  visualRadius: 18,
};

export class GrapplingBoarders extends Enemy {
  private dotAccumMs = 0;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, GRAPPLING_BOARDERS_SPEC, x, y);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x8b2a2a, 1).fillCircle(0, 0, 16);
    g.lineStyle(2, 0x2a1010, 1).strokeCircle(0, 0, 16);
    // "Grapple hooks" as diagonal lines.
    g.lineStyle(2, 0xa0a0a0, 1);
    g.beginPath();
    g.moveTo(-10, -10);
    g.lineTo(-16, -16);
    g.moveTo(10, -10);
    g.lineTo(16, -16);
    g.strokePath();
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

    // Attached DoT — within 30px of player, apply 0.5 dmg/s ignoring iframes.
    if (len < 30 + p.radius) {
      this.dotAccumMs += deltaMs;
      while (this.dotAccumMs >= 1000) {
        this.dotAccumMs -= 1000;
        // Use the damage number system for feedback; bypass iframe by writing directly to RunState.
        this.scene.runState.damage(0.5);
        this.scene.damageNumbers.spawn(p.x, p.y - 40, 0.5, { dot: true });
      }
    }
  }
}
