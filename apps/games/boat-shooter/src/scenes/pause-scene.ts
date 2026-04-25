import Phaser from 'phaser';

interface PauseData {
  stageKey: string;
}

/**
 * Pause overlay — minimal playtest QoL. Resume / Campaign Menu only;
 * settings accessible via the shell already.
 */
export class PauseScene extends Phaser.Scene {
  static readonly KEY = 'PauseScene';
  private data_!: PauseData;

  constructor() {
    super({ key: PauseScene.KEY });
  }

  init(data: PauseData): void {
    this.data_ = data;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.cameras.main.fadeIn(180, 0, 0, 0);
    this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0, 0);

    this.add.text(W / 2, H * 0.3, 'PAUSED', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '96px',
      color: '#e0b063',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5, 0.5);

    this.add.text(W / 2, H * 0.3 + 80, 'Esc or tap Resume to continue', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '22px',
      color: '#cce4ea',
    }).setOrigin(0.5, 0.5);

    const resume = (): void => {
      this.scene.stop();
      this.scene.resume(this.data_.stageKey);
    };

    this.renderButton(W / 2 - 180, H * 0.6, 'Resume', 0x3a5a24, 0x8fce5a, resume);
    this.renderButton(W / 2 + 180, H * 0.6, 'Campaign Menu', 0x264a5a, 0x99c9d6, () => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    this.input.keyboard?.on('keydown-ESC', resume);
  }

  private renderButton(
    x: number,
    y: number,
    label: string,
    fill: number,
    stroke: number,
    onClick: () => void,
  ): void {
    const btn = this.add.rectangle(x, y, 320, 72, fill).setOrigin(0.5, 0.5);
    btn.setStrokeStyle(3, stroke);
    this.add.text(x, y, label, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '24px',
      color: '#cce4ea',
    }).setOrigin(0.5, 0.5);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', onClick);
    btn.on('pointerover', () => btn.setFillStyle(fill + 0x101010));
    btn.on('pointerout', () => btn.setFillStyle(fill));
  }
}
