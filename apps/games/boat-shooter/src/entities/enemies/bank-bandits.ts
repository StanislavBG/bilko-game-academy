import { Enemy } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { WORLD_HEIGHT } from '../../constants';
import { getEnemySpec } from '../../content/active-pack';

/**
 * Env1 Bank Bandits — low-threat bank-dwellers. Like Bank Sniper Tower but
 * weaker + cheaper; throws axes + occasional musket shots.
 */

export class BankBandits extends Enemy {
  private axeTimerMs = 3000;
  private musketTimerMs = 5000;
  private duckUntilMs = 0;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, getEnemySpec('bank-bandits'), x, y);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x8b5a3a, 1).fillRect(-14, -20, 28, 40);
    g.fillStyle(0x3a1a10, 1).fillCircle(0, -28, 10); // head
    g.fillStyle(0x5a3a20, 1).fillRect(-6, -14, 12, 4); // belt
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const now = this.scene.time.now;
    this.setPos(this.x, this.y + 3);
    if (this.y > WORLD_HEIGHT + 100) {
      this.container.destroy();
      this.active = false;
      return;
    }

    if (now < this.duckUntilMs) return;
    if (Math.random() < 0.003) {
      this.duckUntilMs = now + 500;
      this.graphics.setAlpha(0.4);
      this.scene.time.delayedCall(500, () => this.graphics.setAlpha(1));
      return;
    }

    this.axeTimerMs -= deltaMs;
    if (this.axeTimerMs <= 0) {
      this.throwAxe();
      this.axeTimerMs = 3000;
    }
    this.musketTimerMs -= deltaMs;
    if (this.musketTimerMs <= 0) {
      this.fireMusket();
      this.musketTimerMs = 5000;
    }
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    if (this.scene.time.now < this.duckUntilMs) return 0;
    return super.takeDamage(damage, armorPierce, isCrit);
  }

  private throwAxe(): void {
    const p = this.scene.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const speed = 300;
    this.scene.enemies.spawnEnemyBullet(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 2);
  }

  private fireMusket(): void {
    const p = this.scene.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const speed = 800;
    this.scene.enemies.spawnEnemyBullet(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 1);
  }
}
