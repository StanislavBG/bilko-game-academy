import { ShipwrightChest } from '../../systems/evolution-chest';
import Phaser from 'phaser';
import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { BossBanner } from './boss-banner';
import { WORLD_WIDTH } from '../../constants';

/**
 * B5 The Obsidian Warlord — Captain Magmar. Stage 13 boss.
 * Unique: ARENA HAZARDS — lava geysers, lava wave, volcanic bomb showers.
 * Immune to Burn. Fire weapons deal 0 damage.
 */
export const OBSIDIAN_WARLORD_SPEC: EnemySpec = {
  id: 'obsidian-warlord',
  maxHp: 300,
  armor: 6,
  speed: 100,
  contactDamage: 6,
  collisionRadius: 72,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 18, gemChance: 1.0, xpOrbs: 8 },
  color: 0x2a0808,
  visualRadius: 66,
};

const FIRE_WEAPONS = new Set(['flamethrower', 'fire-arrow-rain']);

export class ObsidianWarlord extends Enemy {
  private phase: 1 | 2 | 3 = 1;
  private banner: BossBanner;
  private cannonMs = 3000;
  private firePatchMs = 8000;
  private bombMs = 12000;
  private lavaWaveMs = 15000;
  private eruptionMs = 2000; // only in phase 3

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, OBSIDIAN_WARLORD_SPEC, x, y);
    this.banner = new BossBanner(scene, 'Captain Magmar — Obsidian Warlord', () => this.spec.maxHp, () => this.hp);
    this.banner.setPhase('Phase 1: Eruption');
    this.banner.redraw();
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x1a0404, 1).fillRect(-62, -64, 124, 128);
    // Glowing lava cracks.
    g.lineStyle(3, 0xff6a1a, 0.95);
    g.beginPath();
    g.moveTo(-50, -50); g.lineTo(-20, -10); g.lineTo(-30, 40);
    g.moveTo(50, -50); g.lineTo(10, -20); g.lineTo(40, 50);
    g.strokePath();
    g.fillStyle(0xff6a1a, 0.8).fillCircle(-20, 0, 6);
    g.fillStyle(0xff8a3a, 0.9).fillCircle(20, 20, 5);
    g.fillStyle(0x2a0000, 1).fillTriangle(-62, -64, 62, -64, 0, -92);
    g.fillStyle(0xff3a0a, 1).fillRect(-8, -80, 16, 20); // volcanic flag
    g.lineStyle(4, 0x000, 1).strokeRect(-62, -64, 124, 128);
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    const taken = super.takeDamage(damage, armorPierce, isCrit);
    this.banner.redraw();
    if (this.phase === 1 && this.hp <= 180) this.enterPhase(2);
    if (this.phase === 2 && this.hp <= 60) this.enterPhase(3);
    return taken;
  }

  /** Fire weapons deal 0 damage. Call site in collision.ts would check proj.weaponId. */
  isFireImmune(weaponId: string | undefined): boolean {
    return weaponId !== undefined && FIRE_WEAPONS.has(weaponId);
  }

  private enterPhase(p: 1 | 2 | 3): void {
    this.phase = p;
    if (p === 2) {
      this.banner.setPhase('Phase 2: The Wave');
      this.cannonMs = 2000;
    } else if (p === 3) {
      this.banner.setPhase('Phase 3: Volcanic Rage');
      this.cannonMs = 1500;
    }
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;
    const p = this.scene.player;

    // Sit high in arena; drift slowly.
    const targetY = 280;
    const targetX = Phaser.Math.Clamp(p.x, 260, WORLD_WIDTH - 260);
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.setPos(this.x + (dx / len) * this.spec.speed * dt, this.y + (dy / len) * this.spec.speed * dt);

    this.cannonMs -= deltaMs;
    if (this.cannonMs <= 0) {
      this.fireCannons();
      this.cannonMs = this.phase === 3 ? 1500 : this.phase === 2 ? 2000 : 3000;
    }

    this.firePatchMs -= deltaMs;
    if (this.firePatchMs <= 0) {
      // Drop persistent fire patches on the player's past position.
      this.scene.aoeZone.spawn(p.x, p.y, 90, 8000, 2, 'fire-patch');
      this.firePatchMs = this.phase === 3 ? 2000 : this.phase === 2 ? 5000 : 8000;
    }

    this.bombMs -= deltaMs;
    if (this.bombMs <= 0) {
      this.volcanicBombs();
      this.bombMs = 12000;
    }

    if (this.phase >= 2) {
      this.lavaWaveMs -= deltaMs;
      if (this.lavaWaveMs <= 0) {
        this.lavaWave();
        this.lavaWaveMs = this.phase === 3 ? 10000 : 15000;
      }
    }

    if (this.phase === 3) {
      this.eruptionMs -= deltaMs;
      if (this.eruptionMs <= 0) {
        // Fountain around the ship.
        const ang = Math.random() * Math.PI * 2;
        const r = 120 + Math.random() * 80;
        const fx = this.x + Math.cos(ang) * r;
        const fy = this.y + Math.sin(ang) * r;
        this.scene.fx.explosion(fx, fy, 60, 0xff8a3a);
        this.eruptionMs = 400;
      }
    }
  }

  private fireCannons(): void {
    const p = this.scene.player;
    const base = Math.atan2(p.y - this.y, p.x - this.x);
    const speed = 500;
    for (let i = 0; i < 4; i++) {
      const spread = (i - 1.5) * 0.14;
      const ang = base + spread;
      this.scene.enemies.spawnEnemyBullet(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 3);
    }
  }

  private volcanicBombs(): void {
    for (let i = 0; i < 3; i++) {
      const tx = 200 + Math.random() * (WORLD_WIDTH - 400);
      const ty = 400 + Math.random() * 500;
      const telegraph = this.scene.add.graphics();
      telegraph.lineStyle(3, 0xff3a0a, 0.9).strokeCircle(tx, ty, 80);
      telegraph.fillStyle(0xff3a0a, 0.2).fillCircle(tx, ty, 80);
      telegraph.setDepth(3);
      this.scene.time.delayedCall(1000, () => {
        telegraph.destroy();
        const p = this.scene.player;
        const dx = p.x - tx;
        const dy = p.y - ty;
        if (dx * dx + dy * dy <= 80 * 80) p.takeDamage(4);
        this.scene.fx.explosion(tx, ty, 80, 0xff8a3a);
      });
    }
  }

  private lavaWave(): void {
    // Horizontal wave rolls across from left to right, damages if player touches.
    const y = 500 + Math.random() * 200;
    const wave = this.scene.add.rectangle(-100, y, 200, 120, 0xff6a1a, 0.85);
    wave.setDepth(4);
    wave.setStrokeStyle(3, 0xff3a00);
    this.scene.tweens.add({
      targets: wave,
      x: WORLD_WIDTH + 200,
      duration: 4000,
      onComplete: () => wave.destroy(),
    });
    // Damage check each frame.
    const hitCheck = this.scene.time.addEvent({
      delay: 50,
      repeat: 80,
      callback: () => {
        const p = this.scene.player;
        const dx = p.x - wave.x;
        const dy = p.y - wave.y;
        if (Math.abs(dx) < 100 && Math.abs(dy) < 60) {
          p.takeDamage(6);
        }
      },
    });
    this.scene.time.delayedCall(4000, () => hitCheck.remove());
  }

  override kill(): void {
    this.banner.destroy();
    for (let i = 0; i < 18; i++) this.scene.pickups.spawnGem(this.x, this.y);
    this.scene.pickups.spawnCoins(this.x, this.y, 12, 'large');
    this.scene.fx.explosion(this.x, this.y, 220, 0xff8a3a);
    this.scene.cameras.main.shake(600, 0.02);
    this.scene.shipwright.add(new ShipwrightChest(this.scene, this.x, this.y - 60));
    super.kill();
  }
}
