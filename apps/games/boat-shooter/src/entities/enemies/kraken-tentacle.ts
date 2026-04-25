import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';

/**
 * S3 Kraken Tentacle — periodic hazard. Telegraph 2s, then a 3s sweep arc,
 * then retreats. Kill while exposed for loot.
 */
export const KRAKEN_TENTACLE_SPEC: EnemySpec = {
  id: 'kraken-tentacle',
  maxHp: 20,
  armor: 3,
  speed: 0,
  contactDamage: 5,
  collisionRadius: 36,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 1, gemChance: 0.2, xpOrbs: 2 },
  color: 0x5a2a8a,
  visualRadius: 34,
  deathStyle: 'splash', // tentacle whips back into the water with a splash ring
};

type TentacleState = 'telegraph' | 'exposed' | 'sweep' | 'retreating';

export class KrakenTentacle extends Enemy {
  private state: TentacleState = 'telegraph';
  private stateUntilMs = 0;
  private sweepCenterX = 0;
  private sweepCenterY = 0;
  private sweepStartAngle = 0;
  private sweepArc = 0;
  private sweepPhase = 0;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, KRAKEN_TENTACLE_SPEC, x, y);
    this.sweepCenterX = x;
    this.sweepCenterY = y;
    this.stateUntilMs = scene.time.now + 2000;

    // Draw a telegraph ring.
    const ring = scene.add.graphics();
    ring.lineStyle(4, 0x5a2a8a, 0.5).strokeCircle(x, y, 80);
    ring.setDepth(2);
    scene.tweens.add({
      targets: ring,
      alpha: { from: 0.3, to: 1 },
      yoyo: true,
      repeat: 3,
      duration: 500,
      onComplete: () => ring.destroy(),
    });

    this.sweepStartAngle = Math.random() * Math.PI * 2;
    this.sweepArc = Math.PI; // 180° arc
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x5a2a8a, 1).fillCircle(0, 0, 32);
    g.lineStyle(2, 0x2a1050, 1).strokeCircle(0, 0, 32);
    // Suckers.
    g.fillStyle(0x2a1050, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.fillCircle(Math.cos(a) * 20, Math.sin(a) * 20, 3);
    }
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const now = this.scene.time.now;
    const dt = deltaMs / 1000;

    switch (this.state) {
      case 'telegraph':
        // Stay below waterline (invisible, no damage).
        this.graphics.setAlpha(0.3);
        if (now >= this.stateUntilMs) {
          this.state = 'sweep';
          this.stateUntilMs = now + 3000;
          this.graphics.setAlpha(1);
        }
        break;
      case 'sweep': {
        this.sweepPhase += dt / 3; // 0 → 1 over 3s
        const ang = this.sweepStartAngle + this.sweepArc * this.sweepPhase;
        const radius = 80;
        const x = this.sweepCenterX + Math.cos(ang) * radius;
        const y = this.sweepCenterY + Math.sin(ang) * radius;
        this.setPos(x, y);
        if (now >= this.stateUntilMs) {
          this.state = 'retreating';
          this.stateUntilMs = now + 500;
        }
        break;
      }
      case 'retreating':
        this.graphics.setAlpha(Math.max(0, (this.stateUntilMs - now) / 500));
        if (now >= this.stateUntilMs) {
          // No drops (retreated unharmed).
          this.container.destroy();
          this.active = false;
        }
        break;
      default:
        break;
    }
  }
}
