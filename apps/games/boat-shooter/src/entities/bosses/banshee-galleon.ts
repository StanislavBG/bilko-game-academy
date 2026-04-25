import { ShipwrightChest } from '../../systems/evolution-chest';
import Phaser from 'phaser';
import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { BossBanner } from './boss-banner';
import { WORLD_WIDTH } from '../../constants';

/**
 * S5 The Banshee Galleon — "Wailing Verity". Stage 12 mini-boss.
 * Drifts through walls (not relevant — no walls), wails, summons Cursed Swarm,
 * phases intangibility in P2.
 */
export const BANSHEE_GALLEON_SPEC: EnemySpec = {
  id: 'banshee-galleon',
  maxHp: 120,
  armor: 5,
  speed: 70,
  contactDamage: 4,
  collisionRadius: 54,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 8, gemChance: 1.0, xpOrbs: 5 },
  color: 0xc8a8ff,
  visualRadius: 50,
};

export class BansheeGalleon extends Enemy {
  private phase: 1 | 2 | 3 = 1;
  private banner: BossBanner;
  private cannonMs = 4000;
  private wailMs = 12000;
  private swarmMs = 15000;
  private ghostShipMs = 20000;
  private intangibleUntil = 0;
  private intangibilityMs = 4000;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, BANSHEE_GALLEON_SPEC, x, y);
    this.banner = new BossBanner(scene, "Wailing Verity — Banshee Galleon", () => this.spec.maxHp, () => this.hp);
    this.banner.setPhase('Phase 1: The Approach');
    this.banner.redraw();
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0xc8a8ff, 0.75).fillRect(-50, -56, 100, 112);
    g.fillStyle(0xe8c8ff, 0.65).fillTriangle(-50, -56, 50, -56, 0, -78);
    g.fillStyle(0x8a6abf, 0.85).fillRect(-30, -30, 60, 16);
    g.lineStyle(3, 0xe8c8ff, 0.9).strokeRect(-50, -56, 100, 112);
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    if (this.scene.time.now < this.intangibleUntil) return 0;
    const taken = super.takeDamage(damage, armorPierce, isCrit);
    this.banner.redraw();
    if (this.phase === 1 && this.hp <= 60) this.enterPhase(2);
    if (this.phase === 2 && this.hp <= 20) this.enterPhase(3);
    return taken;
  }

  private enterPhase(p: 1 | 2 | 3): void {
    this.phase = p;
    if (p === 2) {
      this.banner.setPhase('Phase 2: Phasing');
      this.wailMs = 8000;
      this.intangibilityMs = 4000;
    } else if (p === 3) {
      this.banner.setPhase("Phase 3: Banshee's Fury");
      this.wailMs = 2000;
      this.intangibilityMs = 0; // always vulnerable
    }
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;
    const now = this.scene.time.now;

    // Drift toward player.
    const p = this.scene.player;
    const targetY = 280;
    const targetX = Phaser.Math.Clamp(p.x, 260, WORLD_WIDTH - 260);
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.setPos(this.x + (dx / len) * this.spec.speed * dt, this.y + (dy / len) * this.spec.speed * dt);

    if (this.phase === 2 && now >= this.intangibleUntil && this.intangibilityMs > 0) {
      this.intangibleUntil = now + 2000;
      this.graphics.setAlpha(0.3);
      this.scene.time.delayedCall(2000, () => this.graphics.setAlpha(0.85));
    }

    this.cannonMs -= deltaMs;
    if (this.cannonMs <= 0) {
      this.spectralVolley();
      this.cannonMs = 4000;
    }

    this.wailMs -= deltaMs;
    if (this.wailMs <= 0) {
      this.wail();
      this.wailMs = this.phase === 1 ? 12000 : this.phase === 2 ? 8000 : 2000;
    }

    if (this.phase === 1) {
      this.ghostShipMs -= deltaMs;
      if (this.ghostShipMs <= 0) {
        this.scene.enemies.spawn('ghost-ship', this.x + (Math.random() * 300 - 150), this.y + 80);
        this.ghostShipMs = 20000;
      }
    }
    if (this.phase >= 2) {
      this.swarmMs -= deltaMs;
      if (this.swarmMs <= 0) {
        for (let i = 0; i < 15; i++) {
          this.scene.enemies.spawn('cursed-swarm', p.x + (Math.random() * 300 - 150), p.y - 200);
        }
        this.swarmMs = 15000;
      }
    }
  }

  private spectralVolley(): void {
    const p = this.scene.player;
    const base = Math.atan2(p.y - this.y, p.x - this.x);
    const speed = 440;
    for (let i = 0; i < 6; i++) {
      const spread = (i - 2.5) * 0.12;
      const ang = base + spread;
      this.scene.enemies.spawnEnemyBullet(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 2);
    }
  }

  private wail(): void {
    const ring = this.scene.add.circle(this.x, this.y, 300, 0xc8a8ff, 0.3);
    ring.setDepth(8);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 0.5, to: 2 },
      alpha: { from: 0.5, to: 0 },
      duration: 800,
      onComplete: () => ring.destroy(),
    });
    const p = this.scene.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    if (dx * dx + dy * dy <= 300 * 300) {
      p.takeDamage(3);
    }
  }

  override kill(): void {
    this.banner.destroy();
    for (let i = 0; i < 10; i++) this.scene.pickups.spawnGem(this.x, this.y);
    this.scene.pickups.spawnCoins(this.x, this.y, 8, 'large');
    this.scene.shipwright.add(new ShipwrightChest(this.scene, this.x, this.y - 60));
    super.kill();
  }
}
