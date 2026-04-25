import { ShipwrightChest } from '../../systems/evolution-chest';
import Phaser from 'phaser';
import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { BossBanner } from './boss-banner';
import { WORLD_WIDTH } from '../../constants';

/**
 * P5 Pirate Champion "Black Barnacle" Captain Mort — 3-phase Act II mini-boss.
 *
 * P1 (100→40): triple broadside 3.5s; 2 Grappling Boarders/8s; chain-shot/12s.
 * P2 (40→10): same + Mort's pistol @3s; ramming brigands /10s.
 * P3 (10→0): Charge mode — high-speed ram only.
 */
export const PIRATE_CHAMPION_SPEC: EnemySpec = {
  id: 'pirate-champion',
  maxHp: 90,
  armor: 4,
  speed: 110,
  contactDamage: 4,
  collisionRadius: 56,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 5, gemChance: 1.0, xpOrbs: 3 },
  color: 0x7a1a1a,
  visualRadius: 52,
};

export class PirateChampion extends Enemy {
  private phase: 1 | 2 | 3 = 1;
  private cannonMs = 3500;
  private boarderMs = 8000;
  private chainShotMs = 12000;
  private pistolMs = 2000;
  private brigandMs = 10000;
  private chargeMode = false;
  private banner: BossBanner;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, PIRATE_CHAMPION_SPEC, x, y);
    this.banner = new BossBanner(scene, "'Black Barnacle' Captain Mort", () => this.spec.maxHp, () => this.hp);
    this.banner.setPhase("Phase 1: The Flagship");
    this.banner.redraw();
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x7a1a1a, 1).fillRect(-38, -56, 76, 112);
    g.fillStyle(0x2a0000, 1).fillTriangle(-38, -56, 38, -56, 0, -80);
    g.fillStyle(0xffd85a, 1).fillRect(-10, -30, 20, 16); // flag
    g.fillStyle(0x2a1010, 1).fillRect(-2, -56, 4, 56); // mast
    g.lineStyle(3, 0x000, 0.9).strokeRect(-38, -56, 76, 112);
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    const taken = super.takeDamage(damage, armorPierce, isCrit);
    this.banner.redraw();
    if (this.phase === 1 && this.hp <= 40) this.enterPhase(2);
    else if (this.phase === 2 && this.hp <= 10) this.enterPhase(3);
    return taken;
  }

  private enterPhase(p: 1 | 2 | 3): void {
    this.phase = p;
    if (p === 2) {
      this.banner.setPhase("Phase 2: Boarding Party");
      this.cannonMs = 2500;
    } else if (p === 3) {
      this.banner.setPhase("Phase 3: Death or Glory");
      this.chargeMode = true;
    }
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;
    const p = this.scene.player;

    if (this.chargeMode) {
      // Pure charge toward player at high speed.
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      const chargeSpeed = 220;
      this.setPos(this.x + (dx / len) * chargeSpeed * dt, this.y + (dy / len) * chargeSpeed * dt);
      return;
    }

    // Serpentine approach toward upper part of screen.
    const targetY = 240;
    const dy = targetY - this.y;
    const targetX = Phaser.Math.Clamp(p.x, 200, WORLD_WIDTH - 200);
    const dx = targetX - this.x;
    const len = Math.hypot(dx, dy) || 1;
    this.setPos(this.x + (dx / len) * this.spec.speed * dt, this.y + (dy / len) * this.spec.speed * dt);

    this.cannonMs -= deltaMs;
    if (this.cannonMs <= 0) {
      this.fireTripleBroadside();
      this.cannonMs = this.phase === 1 ? 3500 : 2500;
    }

    this.boarderMs -= deltaMs;
    if (this.boarderMs <= 0 && this.phase <= 2) {
      this.scene.enemies.spawn('grappling-boarders', this.x + (Math.random() * 200 - 100), this.y + 60);
      this.scene.enemies.spawn('grappling-boarders', this.x + (Math.random() * 200 - 100), this.y + 60);
      this.boarderMs = 8000;
    }

    this.chainShotMs -= deltaMs;
    if (this.chainShotMs <= 0) {
      this.chainShot();
      this.chainShotMs = this.phase === 1 ? 12000 : 6000;
    }

    if (this.phase === 2) {
      this.pistolMs -= deltaMs;
      if (this.pistolMs <= 0) {
        this.firePistol();
        this.pistolMs = 2000;
      }
      this.brigandMs -= deltaMs;
      if (this.brigandMs <= 0) {
        this.scene.enemies.spawn('ramming-brigand', this.x + 200, this.y + 60);
        this.scene.enemies.spawn('ramming-brigand', this.x - 200, this.y + 60);
        this.brigandMs = 10000;
      }
    }
  }

  private fireTripleBroadside(): void {
    const p = this.scene.player;
    const base = Math.atan2(p.y - this.y, p.x - this.x);
    const speed = 460;
    for (let i = -2; i <= 2; i++) {
      const ang = base + i * 0.12;
      this.scene.enemies.spawnEnemyBullet(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 2);
    }
  }

  private firePistol(): void {
    const p = this.scene.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const speed = 900;
    this.scene.enemies.spawnEnemyBullet(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 3);
  }

  private chainShot(): void {
    // Pair of linked cannonballs (represented as two close projectiles).
    const p = this.scene.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const perpX = -Math.sin(ang);
    const perpY = Math.cos(ang);
    const speed = 380;
    for (const sign of [-1, 1]) {
      this.scene.enemies.spawnEnemyBullet(
        this.x + perpX * 16 * sign,
        this.y + perpY * 16 * sign,
        Math.cos(ang) * speed,
        Math.sin(ang) * speed,
        3,
      );
    }
  }

  override kill(): void {
    this.banner.destroy();
    for (let i = 0; i < 3; i++) this.scene.pickups.spawnGem(this.x, this.y);
    this.scene.pickups.spawnCoins(this.x, this.y, 5, 'large');
    this.scene.shipwright.add(new ShipwrightChest(this.scene, this.x, this.y - 60));
    super.kill();
  }
}
