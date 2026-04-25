import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { EVOLUTIONS, findEligibleEvolution } from '../weapons/evolutions';

/**
 * Shipwright Chest (boss drop). On open, checks for an eligible evolution
 * and grants it with a dramatic burst. If no eligible pair is held, drops
 * 2 L-tier coins instead.
 *
 * Final-boss wild-card chest overrides pair requirement and evolves any
 * held L5 weapon (player picks) — P4 polish.
 */
export class ShipwrightChest {
  private scene: StageScene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Graphics;
  private active = true;
  private isFinalBossChest: boolean;

  constructor(scene: StageScene, x: number, y: number, isFinalBossChest = false) {
    this.scene = scene;
    this.isFinalBossChest = isFinalBossChest;
    this.container = scene.add.container(x, y);
    this.container.setDepth(5);
    this.sprite = scene.add.graphics();
    this.drawShipwright();
    this.container.add(this.sprite);

    // Announcement toast.
    const label = scene.add.text(x, y - 50, 'SHIPWRIGHT CHEST', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '28px',
      color: '#ffd85a',
      stroke: '#000',
      strokeThickness: 3,
    });
    label.setOrigin(0.5, 0.5);
    label.setDepth(90);
    scene.tweens.add({
      targets: label,
      y: y - 120,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      onComplete: () => label.destroy(),
    });

    // Glowing pulse.
    scene.tweens.add({
      targets: this.container,
      scale: { from: 1, to: 1.15 },
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.InOut',
    });
  }

  private drawShipwright(): void {
    const g = this.sprite;
    g.clear();
    g.fillStyle(0xffd85a, 1).fillRect(-22, -16, 44, 32);
    g.fillStyle(0xffd85a, 1).fillRect(-24, -5, 48, 21);
    g.lineStyle(3, 0x8a6a00, 1).strokeRect(-22, -16, 44, 32);
    g.lineStyle(3, 0x8a6a00, 1).strokeRect(-24, -5, 48, 21);
    g.fillStyle(0x8a6a00, 1).fillRect(-4, -3, 8, 5);
    // Glow ring.
    g.lineStyle(3, 0xffe89a, 0.6).strokeCircle(0, 0, 34);
  }

  /** Returns center position for proximity checks. */
  position(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }

  update(): void {
    if (!this.active) return;
    const p = this.scene.player;
    const dx = this.container.x - p.x;
    const dy = this.container.y - p.y;
    if (dx * dx + dy * dy <= 60 * 60) {
      this.open();
    }
  }

  private open(): void {
    this.active = false;
    const { x, y } = this.position();
    this.container.destroy();

    const rs = this.scene.runState;
    const evo = this.isFinalBossChest ? this.pickWildCardEvo() : findEligibleEvolution(rs);

    if (evo) {
      rs.grantEvolution(evo.id);
      this.showEvolutionBurst(x, y, evo.displayName);
    } else {
      // Consolation — 2 L-tier coins.
      this.scene.pickups.spawnCoins(x, y, 2, 'large');
    }
  }

  private pickWildCardEvo(): import('../weapons/evolutions').Evolution | null {
    const rs = this.scene.runState;
    // Pick any L5 weapon's evolution; prefer unheld.
    for (const evo of EVOLUTIONS) {
      if (rs.weaponLevel(evo.sourceWeaponId) >= 5 && !rs.hasEvolution(evo.id)) return evo;
    }
    return null;
  }

  private showEvolutionBurst(x: number, y: number, name: string): void {
    // Big particle burst.
    const burst = this.scene.add.circle(x, y, 60, 0xffd85a, 0.9);
    burst.setDepth(55);
    this.scene.tweens.add({
      targets: burst,
      scale: { from: 1, to: 6 },
      alpha: { from: 1, to: 0 },
      duration: 800,
      onComplete: () => burst.destroy(),
    });
    // Name.
    const label = this.scene.add.text(x, y, name, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '56px',
      color: '#ffd85a',
      stroke: '#000',
      strokeThickness: 5,
    });
    label.setOrigin(0.5, 0.5);
    label.setDepth(60);
    this.scene.tweens.add({
      targets: label,
      scale: { from: 0.6, to: 1.4 },
      alpha: { from: 1, to: 0 },
      duration: 1500,
      onComplete: () => label.destroy(),
    });
    // Camera flash.
    this.scene.cameras.main.flash(400, 255, 215, 90);
  }
}

/** Simple manager: StageScene keeps a list of Shipwright Chests and ticks them. */
export class ShipwrightChestSystem {
  private chests: ShipwrightChest[] = [];
  constructor(_scene: StageScene) {
    void _scene;
  }

  add(chest: ShipwrightChest): void {
    this.chests.push(chest);
  }

  update(): void {
    for (const c of this.chests) c.update();
  }
}
