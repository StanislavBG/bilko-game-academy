import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';

/**
 * Env2 Mine-Layer — drops persistent sea mines in the player's path.
 * Flees upstream (toward player's downstream = up the screen) if engaged.
 */
export const MINE_LAYER_SPEC: EnemySpec = {
  id: 'mine-layer',
  maxHp: 5,
  armor: 1,
  speed: 80,
  contactDamage: 1,
  collisionRadius: 26,
  drops: { coinsSmall: 0, coinsMedium: 2, coinsLarge: 0, gemChance: 0.03, xpOrbs: 1 },
  color: 0x3a3a3a,
  visualRadius: 24,
};

interface LayerMine {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  ttlMs: number;
  active: boolean;
}

export class MineLayer extends Enemy {
  private dropTimerMs = 2500;
  private mines: LayerMine[] = [];

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, MINE_LAYER_SPEC, x, y);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x3a3a3a, 1).fillRect(-12, -24, 24, 48);
    g.fillStyle(0x808080, 1).fillCircle(0, 18, 8); // dropper
    g.lineStyle(2, 0x1a1a1a, 1).strokeRect(-12, -24, 24, 48);
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    if (this.statuses.isImmobilized()) return;
    const dt = deltaMs / 1000;
    // Drift upstream (downward in our reversed orientation = away from player)
    this.setPos(this.x, this.y - this.spec.speed * dt * 0.5);

    this.dropTimerMs -= deltaMs;
    if (this.dropTimerMs <= 0) {
      this.dropMine();
      this.dropTimerMs = 2500;
    }
    this.tickMines(deltaMs);
  }

  private dropMine(): void {
    const sprite = this.scene.add.circle(this.x, this.y + 30, 8, 0x1a1a1a, 1);
    sprite.setStrokeStyle(2, 0xff3a0a);
    sprite.setDepth(4);
    this.mines.push({
      sprite,
      x: this.x,
      y: this.y + 30,
      ttlMs: 20000,
      active: true,
    });
  }

  private tickMines(deltaMs: number): void {
    const p = this.scene.player;
    for (const m of this.mines) {
      if (!m.active) continue;
      m.ttlMs -= deltaMs;
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      if (dx * dx + dy * dy <= 60 * 60) {
        this.detonateMine(m);
        continue;
      }
      if (m.ttlMs <= 0) {
        m.active = false;
        m.sprite.destroy();
      }
    }
  }

  private detonateMine(m: LayerMine): void {
    m.active = false;
    m.sprite.destroy();
    const p = this.scene.player;
    const dx = p.x - m.x;
    const dy = p.y - m.y;
    if (dx * dx + dy * dy <= 60 * 60) {
      p.takeDamage(4);
    }
    const flash = this.scene.add.circle(m.x, m.y, 60, 0xff6a3a, 0.7);
    flash.setDepth(5);
    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 0.8, to: 0 },
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }

  override kill(): void {
    // Clean up any remaining mines.
    for (const m of this.mines) if (m.active) m.sprite.destroy();
    super.kill();
  }
}
