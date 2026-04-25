import Phaser from 'phaser';
import { RunState } from '../run-state';
import type { GameContext } from '@bilko/game-sdk';
import { stageById } from '../data/stages';
import { PostMortemScene } from './post-mortem-scene';
import { RunSummaryScene } from './run-summary-scene';

interface GameOverData {
  runState: RunState;
  stageId: string;
  ctx: GameContext;
  /** StageScene key — passed through so child scenes can read the combat log.
   *  Defaults to 'StageScene' when absent (e.g. older callers).            */
  stageKey?: string;
}

/**
 * Game Over overlay — shown when player HP hits 0. As of §1.3 this is
 * a thin backdrop + Restart/Campaign button strip. Two child scenes run
 * the show:
 *
 *   1. PostMortemScene — launched first. Shows killed-by, final blow,
 *      last 5 log rows, and a heuristic tip.
 *   2. RunSummaryScene — launched by the post-mortem's Continue button.
 *      Shows the Captain's Log card (shared with stage-clear).
 */
export class GameOverScene extends Phaser.Scene {
  static readonly KEY = 'GameOverScene';
  private data_!: GameOverData;

  constructor() {
    super({ key: GameOverScene.KEY });
  }

  init(data: GameOverData): void {
    this.data_ = data;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const stage = stageById(this.data_.stageId);
    const stageKey = this.data_.stageKey ?? 'StageScene';

    // Soft camera fade-in so the game-over overlay doesn't snap in abruptly.
    this.cameras.main.fadeIn(450, 0, 0, 0);

    // Red-tinted darkening — deeper than stage-clear's neutral shroud.
    this.add.rectangle(0, 0, W, H, 0x2a0808, 0.85).setOrigin(0, 0);

    // Static banner above the card. Keeping a short "YOUR SHIP HAS SUNK"
    // line gives the post-mortem somewhere to sit visually.
    const banner = this.add.text(W / 2, 80, 'YOUR SHIP HAS SUNK', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '40px',
      color: '#ff5a5a',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);
    banner.setResolution(Math.max(2, (typeof window !== 'undefined' ? window.devicePixelRatio : 2) || 2));

    const lostIn = this.add.text(W / 2, 118, `Lost in ${stage.title}`, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '18px',
      color: '#cce4ea',
    }).setOrigin(0.5, 0.5);
    lostIn.setResolution(Math.max(2, (typeof window !== 'undefined' ? window.devicePixelRatio : 2) || 2));

    // Bottom-row buttons (persistent — both post-mortem and run-summary
    // overlay on top; these stay visible so the player can bail out).
    const btnY = H - 70;
    this.renderButton(W / 2 - 180, btnY, 'Restart Stage', 0x3a5a24, 0x8fce5a, () => this.restartStage());
    this.renderButton(W / 2 + 180, btnY, 'Campaign Menu', 0x264a5a, 0x99c9d6, () => this.goHome());

    // Launch the post-mortem first. When the player clicks its Continue
    // button, it tears itself down and hands off to the Captain's Log.
    this.scene.launch(PostMortemScene.KEY, {
      runState: this.data_.runState,
      stageId: this.data_.stageId,
      ctx: this.data_.ctx,
      stageKey,
      onContinue: () => {
        this.scene.stop(PostMortemScene.KEY);
        this.scene.launch(RunSummaryScene.KEY, {
          runState: this.data_.runState,
          stageId: this.data_.stageId,
          ctx: this.data_.ctx,
          stageKey,
          title: 'RUN OVER',
          continueLabel: 'Return Home',
          accentColor: 0xff5a5a,
          onContinue: () => this.goHome(),
        });
      },
    });
  }

  private restartStage(): void {
    const rs = this.data_.runState;
    const stage = stageById(this.data_.stageId);
    const freshRun = new RunState(rs.meta, rs.ngPlus, rs.difficulty);
    this.scene.stop(PostMortemScene.KEY);
    this.scene.stop(RunSummaryScene.KEY);
    this.scene.stop('HudScene');
    this.scene.stop();
    const stageScene = this.scene.get('StageScene');
    stageScene.scene.restart({
      ctx: this.data_.ctx,
      runState: freshRun,
      stageId: this.extractStageNumber(stage.id),
    });
    this.scene.launch('HudScene', { runState: freshRun });
  }

  private goHome(): void {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private extractStageNumber(id: string): number {
    const m = /stage-(\d+)/.exec(id);
    return m && m[1] ? Number(m[1]) : 1;
  }

  private renderButton(
    x: number,
    y: number,
    label: string,
    fill: number,
    stroke: number,
    onClick: () => void,
  ): void {
    const btn = this.add.rectangle(x, y, 320, 52, fill).setOrigin(0.5, 0.5);
    btn.setStrokeStyle(3, stroke);
    const t = this.add.text(x, y, label, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '20px',
      color: '#cce4ea',
    }).setOrigin(0.5, 0.5);
    t.setResolution(Math.max(2, (typeof window !== 'undefined' ? window.devicePixelRatio : 2) || 2));
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', onClick);
    btn.on('pointerover', () => btn.setFillStyle(fill + 0x101010));
    btn.on('pointerout', () => btn.setFillStyle(fill));
  }
}
