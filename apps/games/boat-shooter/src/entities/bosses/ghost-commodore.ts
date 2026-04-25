import { ShipwrightChest } from '../../systems/evolution-chest';
import Phaser from 'phaser';
import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { BossBanner } from './boss-banner';
import { WORLD_WIDTH } from '../../constants';

/**
 * B3 Ghost Commodore — HMS Regret. Stage 8 boss.
 *
 * Unique: POSSESSION — attempts to possess the player's boat. Telegraph green
 * aura over 1.5s; if player stays in radius, controls invert + weapons muted
 * for 3s (2s in Phase 3).
 *
 * Phases:
 *   P1: 8-cannon spectral volley /3s; wail /10s; ghost ship summons /18s; no possession yet.
 *   P2: possession /20s; wail /7s; cannon /2s; heavy mortar during possession.
 *   P3: ironclad breaks — commodore spirit free-roams, 20×20 target, 180 px/s,
 *       spectral cannon /0.8s; possession /10s / 2s; cursed swarms /20s.
 */
export const GHOST_COMMODORE_SPEC: EnemySpec = {
  id: 'ghost-commodore',
  maxHp: 250,
  armor: 5,
  speed: 85,
  contactDamage: 4,
  collisionRadius: 70,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 16, gemChance: 1.0, xpOrbs: 6 },
  color: 0x6aa8d8,
  visualRadius: 66,
};

export class GhostCommodore extends Enemy {
  private phase: 1 | 2 | 3 = 1;
  private cannonMs = 3000;
  private wailMs = 10000;
  private ghostShipMs = 18000;
  private possessionMs = 20000;
  private swarmMs = 20000;
  private inSpiritForm = false;
  private banner: BossBanner;
  private possessionOverlay: Phaser.GameObjects.Rectangle | null = null;
  private possessedUntilMs = 0;
  private possessionAttemptAt = 0;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, GHOST_COMMODORE_SPEC, x, y);
    this.banner = new BossBanner(scene, 'HMS Regret — Ghost Commodore', () => this.spec.maxHp, () => this.hp);
    this.banner.setPhase('Phase 1: The Hallowed Deck');
    this.banner.redraw();
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    if (this.inSpiritForm) {
      // Spirit — small glowing orb.
      g.fillStyle(0x6aa8d8, 0.9).fillCircle(0, 0, 14);
      g.fillStyle(0xc8e8ff, 0.6).fillCircle(0, 0, 22);
      g.lineStyle(2, 0xc8e8ff, 0.8).strokeCircle(0, 0, 22);
      return;
    }
    // Translucent ironclad.
    g.fillStyle(0x223c5a, 0.75).fillRect(-58, -66, 116, 132);
    g.fillStyle(0x3a6aa0, 0.5).fillTriangle(-56, -66, 56, -66, 0, -90);
    g.fillStyle(0xc8dcff, 0.55).fillRect(-34, -30, 68, 14);
    g.fillStyle(0x6aa8d8, 0.6).fillRect(-4, -66, 8, 66);
    g.lineStyle(3, 0x8ad0ff, 0.85).strokeRect(-58, -66, 116, 132);
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    const taken = super.takeDamage(damage, armorPierce, isCrit);
    this.banner.redraw();
    if (this.phase === 1 && this.hp <= 150) this.enterPhase(2);
    if (this.phase === 2 && this.hp <= 50) this.enterPhase(3);
    return taken;
  }

  private enterPhase(p: 1 | 2 | 3): void {
    this.phase = p;
    if (p === 2) {
      this.banner.setPhase('Phase 2: The Binding');
      this.cannonMs = 2000;
      this.wailMs = 7000;
    } else if (p === 3) {
      this.banner.setPhase('Phase 3: Soul Binding');
      this.inSpiritForm = true;
      this.drawVisual();
      this.spec.color;
      (this as { spec: EnemySpec }).spec = {
        ...this.spec,
        speed: 180,
        collisionRadius: 20,
        visualRadius: 20,
      } as EnemySpec;
      // Spirit form gets smaller + faster.
      this.cannonMs = 800;
      this.possessionMs = 10000;
      this.scene.fx.explosion(this.x, this.y, 160, 0xc8dcff);
    }
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;
    const now = this.scene.time.now;
    const p = this.scene.player;

    // Movement.
    if (this.inSpiritForm) {
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      this.setPos(this.x + (dx / len) * 180 * dt, this.y + (dy / len) * 180 * dt);
    } else {
      // Slow drift at the top of the arena.
      const targetY = 260;
      const targetX = Phaser.Math.Clamp(p.x, 220, WORLD_WIDTH - 220);
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const len = Math.hypot(dx, dy) || 1;
      this.setPos(this.x + (dx / len) * this.spec.speed * dt, this.y + (dy / len) * this.spec.speed * dt);
    }

    // During possession, the boat takes bonus mortar hits.
    if (now < this.possessedUntilMs) {
      // Overlay pulses; controls inversion is applied via player's RunState below.
    }

    this.cannonMs -= deltaMs;
    if (this.cannonMs <= 0) {
      this.fireSpectralVolley();
      this.cannonMs = this.phase === 3 ? 800 : this.phase === 2 ? 2000 : 3000;
    }

    this.wailMs -= deltaMs;
    if (this.wailMs <= 0) {
      this.wail();
      this.wailMs = this.phase === 1 ? 10000 : this.phase === 2 ? 7000 : 3000;
    }

    if (this.phase === 1) {
      this.ghostShipMs -= deltaMs;
      if (this.ghostShipMs <= 0) {
        this.scene.enemies.spawn('ghost-ship', this.x + (Math.random() * 300 - 150), this.y + 80);
        this.ghostShipMs = 18000;
      }
    }

    if (this.phase >= 2) {
      this.possessionMs -= deltaMs;
      if (this.possessionMs <= 0) {
        this.startPossessionAttempt();
        this.possessionMs = this.phase === 3 ? 10000 : 20000;
      }
      // Check possession landing if an attempt is in progress.
      if (this.possessionAttemptAt > 0 && now - this.possessionAttemptAt >= 1500) {
        this.resolvePossessionAttempt();
      }
    }

    if (this.phase === 3) {
      this.swarmMs -= deltaMs;
      if (this.swarmMs <= 0) {
        for (let i = 0; i < 10; i++) {
          this.scene.enemies.spawn('cursed-swarm', p.x + (Math.random() * 300 - 150), p.y - 200);
        }
        this.swarmMs = 20000;
      }
    }
  }

  private fireSpectralVolley(): void {
    const p = this.scene.player;
    const base = Math.atan2(p.y - this.y, p.x - this.x);
    const speed = this.inSpiritForm ? 600 : 460;
    const count = this.inSpiritForm ? 2 : 8;
    for (let i = 0; i < count; i++) {
      const spread = (i / count) * 0.8 - 0.4;
      const ang = base + spread;
      this.scene.enemies.spawnEnemyBullet(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 2);
    }
  }

  private wail(): void {
    // Visual AoE.
    const ring = this.scene.add.circle(this.x, this.y, 120, 0xc8e8ff, 0.4);
    ring.setDepth(8);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 0.8, to: 2.0 },
      alpha: { from: 0.6, to: 0 },
      duration: 600,
      onComplete: () => ring.destroy(),
    });
    const p = this.scene.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    if (dx * dx + dy * dy <= 240 * 240) {
      p.takeDamage(2);
    }
  }

  private startPossessionAttempt(): void {
    this.possessionAttemptAt = this.scene.time.now;
    // Tint the screen-center greenish over 1.5s.
    const p = this.scene.player;
    const ring = this.scene.add.circle(p.x, p.y, 200, 0x7dff5a, 0.3);
    ring.setDepth(50);
    this.scene.tweens.add({
      targets: ring,
      alpha: { from: 0.2, to: 0.7 },
      scale: { from: 0.6, to: 1.2 },
      duration: 1500,
      onComplete: () => ring.destroy(),
    });
  }

  private resolvePossessionAttempt(): void {
    const p = this.scene.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    // If player is near screen-center (simple check: not too far from the middle)
    // OR still close to commodore at resolution time → POSSESSED.
    const possessed = Math.hypot(dx, dy) <= 400 && this.scene.time.now - this.possessionAttemptAt <= 1700;
    if (possessed) {
      const durationMs = this.phase === 3 ? 2000 : 3000;
      this.possessedUntilMs = this.scene.time.now + durationMs;
      // Visual green overlay on the entire screen.
      if (!this.possessionOverlay) {
        this.possessionOverlay = this.scene.add.rectangle(960, 540, 1920, 1080, 0x7dff5a, 0.25);
        this.possessionOverlay.setDepth(1500);
      }
      this.possessionOverlay.setVisible(true);
      // Actual control inversion — the core mechanic.
      p.setInverted(true);
      this.scene.time.delayedCall(durationMs, () => {
        this.possessionOverlay?.setVisible(false);
        p.setInverted(false);
      });
      // Heavy mortar on the player during possession.
      this.scene.time.delayedCall(300, () => {
        this.scene.fx.explosion(p.x, p.y, 100, 0xff3a3a);
        p.takeDamage(5);
      });
    }
    this.possessionAttemptAt = 0;
  }

  override kill(): void {
    this.banner.destroy();
    this.possessionOverlay?.destroy();
    // Release possession if it was active when boss died.
    this.scene.player.setInverted(false);
    for (let i = 0; i < 10; i++) this.scene.pickups.spawnGem(this.x, this.y);
    this.scene.pickups.spawnCoins(this.x, this.y, 7, 'large');
    this.scene.shipwright.add(new ShipwrightChest(this.scene, this.x, this.y - 60));
    super.kill();
  }
}
