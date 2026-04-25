import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';

/**
 * P1 Ramming Brigand — aggressive melee pressure. Enters "Ram Mode" on line-of-sight.
 */
export const RAMMING_BRIGAND_SPEC: EnemySpec = {
  id: 'ramming-brigand',
  maxHp: 3,
  armor: 0,
  speed: 240,
  contactDamage: 4,
  collisionRadius: 24,
  drops: { coinsSmall: 0, coinsMedium: 1, coinsLarge: 0, gemChance: 0, xpOrbs: 1 },
  color: 0x5a2a2a,
  visualRadius: 22,
  deathStyle: 'splinter', // chunks + prow shard fly out
};

export class RammingBrigand extends Enemy {
  private inRamMode = false;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, RAMMING_BRIGAND_SPEC, x, y);
  }

  /** Three visual variants: standard, burnt-black, iron-reinforced. */
  private readonly variant = Math.floor(Math.random() * 3);

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    const hulls = [0x5a2a2a, 0x3a1818, 0x4a3030] as const;
    const sails = [0x2a0808, 0x180404, 0x303030] as const;
    const spikes = [0xaaaaaa, 0x808080, 0xc0a858] as const; // standard / dull / brass
    g.fillStyle(hulls[this.variant]!, 1).fillRect(-10, -18, 20, 36);
    g.fillStyle(sails[this.variant]!, 1).fillTriangle(-10, -18, 10, -18, 0, -30);
    // Menacing spike on the prow (colour per variant).
    g.fillStyle(spikes[this.variant]!, 1).fillTriangle(-4, 18, 4, 18, 0, 28);
    // Iron-band reinforcement on variant 2.
    if (this.variant === 2) {
      g.fillStyle(0x2a1a10, 1).fillRect(-10, -2, 20, 2);
    }
  }

  /** Committed charge vector — locked when ram mode triggers. */
  private ramDx = 0;
  private ramDy = 1;
  private chargeDoneAt: number | null = null;
  private readonly stationY = 160 + Math.random() * 180;
  private swayPhase = Math.random() * Math.PI * 2;
  private readonly homeX = this.x;

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;
    const player = this.scene.player;
    const now = this.scene.time.now;

    // Three behaviors: roost (top-half hover), charge (locked dive), retreat.
    if (this.inRamMode) {
      if (this.chargeDoneAt === null) {
        const speed = this.spec.speed * 1.5;
        this.setPos(this.x + this.ramDx * speed * dt, this.y + this.ramDy * speed * dt);
        // Charge ends after 1.0 s OR after passing the player.
        if (this.y > player.y + 80 || this.y > 900) {
          this.chargeDoneAt = now;
        }
      } else {
        // Retreat upward back to the patrol station.
        const speed = this.spec.speed * 1.1;
        this.setPos(
          this.x + (this.homeX - this.x) * Math.min(1, dt * 1.2),
          this.y - speed * dt,
        );
        if (this.y <= this.stationY) {
          this.inRamMode = false;
          this.chargeDoneAt = null;
        }
      }
    } else {
      // Patrol the upper band with a side-to-side sway, ready to commit a charge.
      this.swayPhase += dt * 1.6;
      const targetX = this.homeX + Math.sin(this.swayPhase) * 80;
      const nextX = this.x + (targetX - this.x) * Math.min(1, dt * 2.0);
      const nextY = this.y + (this.stationY - this.y) * Math.min(1, dt * 1.5);
      this.setPos(nextX, nextY);

      const dx = player.x - this.x;
      const dy = player.y - this.y;
      if (dx * dx + dy * dy < 600 * 600 && dy > 80) {
        this.inRamMode = true;
        const len = Math.hypot(dx, dy) || 1;
        this.ramDx = dx / len;
        this.ramDy = dy / len;
      }
    }

    if (this.y > 1180 || this.x < -120 || this.x > 2040) {
      this.active = false;
      this.container.destroy();
    }
  }
}
