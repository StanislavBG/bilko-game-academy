import Phaser from 'phaser';
import { WORLD_WIDTH } from '../../constants';

const BAR_W = 640;
const BAR_H = 18;

/**
 * Shared boss banner UI: name + HP bar + phase label. Handles its own
 * redraw; pass it in the boss update() / takeDamage paths.
 */
export class BossBanner {
  readonly name: Phaser.GameObjects.Text;
  readonly hpBg: Phaser.GameObjects.Graphics;
  readonly hpFill: Phaser.GameObjects.Graphics;
  readonly phaseLabel: Phaser.GameObjects.Text;
  private hpTrail!: Phaser.GameObjects.Graphics;
  private scene_!: Phaser.Scene;
  private displayFrac = 1;
  private trailFrac = 1;

  constructor(
    scene: Phaser.Scene,
    title: string,
    private readonly maxHpProvider: () => number,
    private readonly hpProvider: () => number,
  ) {
    this.name = scene.add.text(WORLD_WIDTH / 2, 100, title, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '34px',
      color: '#e0b063',
      stroke: '#000',
      strokeThickness: 3,
    });
    this.name.setOrigin(0.5, 0.5);
    this.name.setDepth(90);

    this.hpBg = scene.add.graphics({ x: WORLD_WIDTH / 2 - BAR_W / 2, y: 130 });
    this.hpBg.fillStyle(0x2a0808, 0.9).fillRoundedRect(0, 0, BAR_W, BAR_H, 6);
    this.hpBg.setDepth(90);

    this.hpFill = scene.add.graphics({ x: WORLD_WIDTH / 2 - BAR_W / 2, y: 130 });
    this.hpFill.setDepth(91);

    // A secondary "wound-trail" bar behind the main fill — stays visible
    // briefly after a hit so big bursts feel weighty.
    this.hpTrail = scene.add.graphics({ x: WORLD_WIDTH / 2 - BAR_W / 2, y: 130 });
    this.hpTrail.setDepth(90.5);
    this.scene_ = scene;

    this.phaseLabel = scene.add.text(WORLD_WIDTH / 2, 165, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffb833',
    });
    this.phaseLabel.setOrigin(0.5, 0.5);
    this.phaseLabel.setDepth(90);
  }

  redraw(): void {
    const target = Math.max(0, this.hpProvider() / this.maxHpProvider());
    // Main red fill — smooth tween.
    this.scene_.tweens.add({
      targets: this,
      displayFrac: target,
      duration: 280,
      ease: 'Cubic.out',
      onUpdate: () => {
        this.hpFill
          .clear()
          .fillStyle(0xc23b3b, 1)
          .fillRoundedRect(0, 0, BAR_W * this.displayFrac, BAR_H, 6);
      },
    });
    // Trail — lags the main bar, fades from orange to transparent.
    this.scene_.tweens.add({
      targets: this,
      trailFrac: target,
      duration: 700,
      delay: 180,
      ease: 'Quad.out',
      onUpdate: () => {
        this.hpTrail
          .clear()
          .fillStyle(0xff9a3a, 0.7)
          .fillRoundedRect(0, 0, BAR_W * this.trailFrac, BAR_H, 6);
      },
    });
  }

  setPhase(label: string): void {
    this.phaseLabel.setText(label);
  }

  destroy(): void {
    this.name.destroy();
    this.hpBg.destroy();
    this.hpFill.destroy();
    this.hpTrail.destroy();
    this.phaseLabel.destroy();
  }
}
