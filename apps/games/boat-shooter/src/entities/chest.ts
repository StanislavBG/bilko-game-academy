import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';

/**
 * Floating chest pickup. Four tiers:
 *   Wooden   — 3-5 M coins, XP orb.
 *   Silver   — 10-15 M coins, 1-2 gems, maybe weapon/passive drop.
 *   Gold     — 25-40 L coins, 3-5 gems, maybe rare drop.
 *   Cursed   — 50/50 either rewards OR ambush-then-rewards.
 *
 * Opens on proximity. For P2 we implement Wooden + Silver + Gold fully; Cursed
 * ambush mechanic is a stub (always gives rewards without triggering the wave).
 */
export type ChestTier = 'wooden' | 'silver' | 'gold' | 'cursed';

interface ChestInstance {
  tier: ChestTier;
  sprite: Phaser.GameObjects.Container;
  x: number;
  y: number;
  ttlMs: number;
  opened: boolean;
  active: boolean;
}

export class ChestSystem {
  private pool: ChestInstance[] = [];
  constructor(private readonly scene: StageScene) {}

  spawn(tier: ChestTier, x: number, y: number): void {
    const container = this.scene.add.container(x, y);
    container.setDepth(4);

    const g = this.scene.add.graphics();
    this.draw(g, tier);
    container.add(g);

    // Floating bob.
    this.scene.tweens.add({
      targets: container,
      y: y - 6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.pool.push({
      tier,
      sprite: container,
      x,
      y,
      ttlMs: 30000,
      opened: false,
      active: true,
    });
  }

  private draw(g: Phaser.GameObjects.Graphics, tier: ChestTier): void {
    const color = tier === 'wooden' ? 0x7a4a24 : tier === 'silver' ? 0xc0c8d0 : tier === 'gold' ? 0xffd85a : 0x5a1a8a;
    const stroke = tier === 'wooden' ? 0x2a1010 : tier === 'silver' ? 0x4a5060 : tier === 'gold' ? 0x8a6a00 : 0x2a0a4a;
    g.fillStyle(color, 1).fillRect(-18, -14, 36, 28);
    g.fillStyle(color, 1).fillRect(-20, -4, 40, 18);
    g.lineStyle(2, stroke, 1).strokeRect(-18, -14, 36, 28);
    g.lineStyle(2, stroke, 1).strokeRect(-20, -4, 40, 18);
    g.fillStyle(stroke, 1).fillRect(-3, -2, 6, 4); // latch
  }

  update(deltaMs: number): void {
    const p = this.scene.player;
    for (const c of this.pool) {
      if (!c.active) continue;
      c.ttlMs -= deltaMs;
      if (c.ttlMs <= 0) {
        this.despawn(c);
        continue;
      }
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      if (dx * dx + dy * dy <= (40 + p.radius) * (40 + p.radius)) {
        this.open(c);
      }
    }
  }

  private open(c: ChestInstance): void {
    if (c.opened) return;
    c.opened = true;
    c.active = false;
    const burst = this.scene.add.circle(c.x, c.y, 30, 0xffd85a, 0.8);
    burst.setDepth(6);
    this.scene.tweens.add({
      targets: burst,
      scale: { from: 1, to: 3 },
      alpha: { from: 0.9, to: 0 },
      duration: 500,
      onComplete: () => burst.destroy(),
    });
    c.sprite.destroy();
    this.dispense(c);
  }

  private dispense(c: ChestInstance): void {
    switch (c.tier) {
      case 'wooden':
        this.scene.pickups.spawnCoins(c.x, c.y, 4, 'medium');
        this.scene.pickups.spawnXpOrbs(c.x, c.y, 1);
        break;
      case 'silver':
        this.scene.pickups.spawnCoins(c.x, c.y, 12, 'medium');
        for (let i = 0; i < 2; i++) this.scene.pickups.spawnGem(c.x, c.y);
        this.scene.pickups.spawnXpOrbs(c.x, c.y, 2);
        break;
      case 'gold':
        this.scene.pickups.spawnCoins(c.x, c.y, 4, 'large');
        for (let i = 0; i < 4; i++) this.scene.pickups.spawnGem(c.x, c.y);
        this.scene.pickups.spawnXpOrbs(c.x, c.y, 3);
        break;
      case 'cursed': {
        const ambush = Math.random() < 0.5;
        this.scene.achievements?.notifyCursedChestOpened();
        const dispenseRewards = (): void => {
          this.scene.pickups.spawnCoins(c.x, c.y, 5, 'large');
          for (let i = 0; i < 5; i++) this.scene.pickups.spawnGem(c.x, c.y);
          this.scene.pickups.spawnXpOrbs(c.x, c.y, 3);
          // 40% chance to yield a treasure map fragment — per PRD §4.9.4.
          if (Math.random() < 0.4) this.scene.runState.mapFragmentsThisStage += 1;
          if (ambush) this.scene.achievements?.notifyCursedAmbushSurvived();
        };
        if (ambush) {
          // Dramatic flash + warning toast, then spawn 5 Ghost Ships around the
          // player, then dispense rewards after the ambush delay.
          this.scene.cameras.main.flash(400, 180, 60, 220);
          const warn = this.scene.add.text(c.x, c.y - 40, 'AMBUSH!', {
            fontFamily: 'Palatino, Georgia, serif',
            fontSize: '48px',
            color: '#c83bff',
            stroke: '#000',
            strokeThickness: 4,
          });
          warn.setOrigin(0.5, 0.5);
          warn.setDepth(60);
          this.scene.tweens.add({
            targets: warn,
            alpha: { from: 1, to: 0 },
            y: c.y - 140,
            duration: 1200,
            onComplete: () => warn.destroy(),
          });
          const player = this.scene.player;
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.2;
            const r = 240;
            this.scene.enemies.spawn(
              'ghost-ship',
              player.x + Math.cos(angle) * r,
              player.y + Math.sin(angle) * r,
            );
          }
          // Dispense rewards a beat later so players experience the ambush first.
          this.scene.time.delayedCall(800, dispenseRewards);
        } else {
          dispenseRewards();
        }
        break;
      }
    }
  }

  private despawn(c: ChestInstance): void {
    c.active = false;
    c.sprite.destroy();
  }
}
