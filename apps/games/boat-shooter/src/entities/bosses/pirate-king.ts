import { ShipwrightChest } from '../../systems/evolution-chest';
import Phaser from 'phaser';
import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { BossBanner } from './boss-banner';
import { WORLD_WIDTH } from '../../constants';

/**
 * B2 Pirate King "Admiral Scurvy" — Crimson Maw. Act I finale.
 *
 * Unique mechanic: Boarding Event — during P2, pauses main fight and spawns 6
 * boarders at the deck. P1 version handled abstractly: 6 Grappling Boarders
 * spawn at once in the arena (the camera-zoom UI is P3 polish).
 */
export const PIRATE_KING_SPEC: EnemySpec = {
  id: 'pirate-king',
  maxHp: 220,
  armor: 4,
  speed: 100,
  contactDamage: 5,
  collisionRadius: 70,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 14, gemChance: 1.0, xpOrbs: 6 },
  color: 0x6a0a0a,
  visualRadius: 66,
};

export class PirateKing extends Enemy {
  private phase: 1 | 2 | 3 = 1;
  private banner: BossBanner;
  private cannonMs = 3500;
  private boarderMs = 8000;
  private chainShotMs = 12000;
  private boardingEventsLeft = 2;
  private boardingTriggerHp = [100, 60];

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, PIRATE_KING_SPEC, x, y);
    this.banner = new BossBanner(scene, "Crimson Maw — Admiral Scurvy", () => this.spec.maxHp, () => this.hp);
    this.banner.setPhase("Phase 1: Red Sails");
    this.banner.redraw();
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x6a0a0a, 1).fillRect(-60, -68, 120, 136);
    g.fillStyle(0x2a0000, 1).fillTriangle(-58, -68, 58, -68, 0, -96);
    g.fillStyle(0x2a0000, 1).fillRect(-50, -56, 100, 72);
    g.fillStyle(0xffd85a, 1).fillTriangle(-12, -40, 12, -40, 0, -56); // jolly skull
    g.lineStyle(4, 0x000, 0.9).strokeRect(-60, -68, 120, 136);
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    const taken = super.takeDamage(damage, armorPierce, isCrit);
    this.banner.redraw();
    // Trigger boarding events at 100 and 60 HP (during Phase 2).
    if (this.phase === 2 && this.boardingEventsLeft > 0) {
      const nextThreshold = this.boardingTriggerHp[0];
      if (nextThreshold !== undefined && this.hp <= nextThreshold) {
        this.boardingTriggerHp.shift();
        this.boardingEventsLeft -= 1;
        this.boardingEvent();
      }
    }
    if (this.phase === 1 && this.hp <= 120) this.enterPhase(2);
    if (this.phase === 2 && this.hp <= 40) this.enterPhase(3);
    return taken;
  }

  private enterPhase(p: 1 | 2 | 3): void {
    this.phase = p;
    if (p === 2) this.banner.setPhase("Phase 2: Boarding Deck");
    else if (p === 3) {
      this.banner.setPhase("Phase 3: Death Before Dishonor");
      this.cannonMs = 1500;
    }
  }

  private boardingEvent(): void {
    // Flash the player and spawn 6 Grappling Boarders near them.
    const p = this.scene.player;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const r = 120;
      this.scene.enemies.spawn('grappling-boarders', p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r);
    }
    this.scene.cameras.main.flash(300, 255, 200, 60);
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;
    const p = this.scene.player;

    // Serpentine pursuit.
    const targetY = 260;
    const dy = targetY - this.y;
    const tx = Phaser.Math.Clamp(p.x, 220, WORLD_WIDTH - 220);
    const dx = tx - this.x;
    const len = Math.hypot(dx, dy) || 1;
    this.setPos(this.x + (dx / len) * this.spec.speed * dt, this.y + (dy / len) * this.spec.speed * dt);

    this.cannonMs -= deltaMs;
    if (this.cannonMs <= 0) {
      this.tripleBroadside();
      this.cannonMs = this.phase === 3 ? 1500 : 3500;
    }
    this.boarderMs -= deltaMs;
    if (this.boarderMs <= 0 && this.phase <= 2) {
      this.scene.enemies.spawn('grappling-boarders', this.x + 80, this.y + 80);
      this.scene.enemies.spawn('grappling-boarders', this.x - 80, this.y + 80);
      this.boarderMs = 8000;
    }
    this.chainShotMs -= deltaMs;
    if (this.chainShotMs <= 0) {
      this.chainShot();
      this.chainShotMs = this.phase === 2 ? 6000 : 12000;
    }
  }

  private tripleBroadside(): void {
    const p = this.scene.player;
    const base = Math.atan2(p.y - this.y, p.x - this.x);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const speed = 480;
    for (let i = 0; i < 5; i++) {
      const offset = sign * 60;
      const spread = (i - 2) * 0.12;
      const ang = base + spread;
      this.scene.enemies.spawnEnemyBullet(this.x + offset, this.y + i * 6, Math.cos(ang) * speed, Math.sin(ang) * speed, 2);
      this.scene.fx.muzzleFlash(this.x + offset, this.y + i * 6, 0xff7a3a);
    }
    this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: 1.07, to: 1 },
      scaleY: { from: 0.95, to: 1 },
      duration: 180,
      ease: 'Cubic.out',
    });
    this.scene.cameras.main.shake(140, 0.006);
    this.scene.audio.sfxCannon();
  }

  private chainShot(): void {
    const p = this.scene.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const perpX = -Math.sin(ang);
    const perpY = Math.cos(ang);
    const speed = 400;
    for (const sign of [-1, 1]) {
      this.scene.enemies.spawnEnemyBullet(
        this.x + perpX * 20 * sign,
        this.y + perpY * 20 * sign,
        Math.cos(ang) * speed,
        Math.sin(ang) * speed,
        3,
      );
    }
  }

  override kill(): void {
    this.banner.destroy();
    for (let i = 0; i < 8; i++) this.scene.pickups.spawnGem(this.x, this.y);
    this.scene.pickups.spawnCoins(this.x, this.y, 12, 'large');
    this.scene.shipwright.add(new ShipwrightChest(this.scene, this.x, this.y - 60));
    super.kill();
  }
}
