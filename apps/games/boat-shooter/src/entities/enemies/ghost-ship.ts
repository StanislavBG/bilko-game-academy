import { Enemy } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { getEnemySpec } from '../../content/active-pack';

/**
 * S1 Ghost Ship — phasing ranged attacker.
 *   - Goes intangible 1.5s every 5s (0 dmg during phase).
 *   - Immune to Water/Ink.
 *   - Takes ×2 lightning (handled in ChainLightning via 'wet' reaction; here we treat
 *     vulnerability abstractly since ghosts don't become Wet).
 */

export class GhostShip extends Enemy {
  private phaseStartMs = 0;
  private phaseUntilMs = 0;
  private nextPhaseCheckMs = 5000;
  private fireTimerMs = 1500;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, getEnemySpec('ghost-ship'), x, y);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x8abbff, 0.65).fillRect(-16, -24, 32, 48);
    g.fillStyle(0xc8dcff, 0.5).fillTriangle(-16, -24, 16, -24, 0, -36);
    g.lineStyle(2, 0x3a6acc, 0.9).strokeRect(-16, -24, 32, 48);
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const now = this.scene.time.now;
    const dt = deltaMs / 1000;
    const p = this.scene.player;

    // Phase cycle.
    this.nextPhaseCheckMs -= deltaMs;
    if (this.nextPhaseCheckMs <= 0) {
      this.phaseStartMs = now;
      this.phaseUntilMs = now + 1500;
      this.nextPhaseCheckMs = 5000;
    }
    const phasing = now >= this.phaseStartMs && now <= this.phaseUntilMs;
    this.graphics.setAlpha(phasing ? 0.25 : 0.85);

    if (this.statuses.isImmobilized()) return;

    // Drift toward player; pass through walls/rocks (not implemented; we just ignore collisions
    // with environment since there are none yet).
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.setPos(this.x + (dx / len) * this.spec.speed * dt, this.y + (dy / len) * this.spec.speed * dt);

    this.fireTimerMs -= deltaMs;
    if (this.fireTimerMs <= 0) {
      this.fireSpectralCannon();
      this.fireTimerMs = 2500;
    }
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    const now = this.scene.time.now;
    if (now >= this.phaseStartMs && now <= this.phaseUntilMs) return 0;
    return super.takeDamage(damage, armorPierce, isCrit);
  }

  private fireSpectralCannon(): void {
    const p = this.scene.player;
    const baseAng = Math.atan2(p.y - this.y, p.x - this.x);
    const speed = 420;
    for (let i = 0; i < 2; i++) {
      const spread = (i - 0.5) * 10 * Math.PI / 180;
      const ang = baseAng + spread;
      this.scene.enemies.spawnEnemyBullet(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 1);
    }
  }
}
