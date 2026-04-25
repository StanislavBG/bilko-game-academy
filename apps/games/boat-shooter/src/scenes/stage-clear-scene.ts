import Phaser from 'phaser';
import { RunState } from '../run-state';
import { STAGES, stageById } from '../data/stages';
import type { GameContext } from '@bilko/game-sdk';
import { RunSummaryScene } from './run-summary-scene';

interface StageClearData {
  runState: RunState;
  stageId: string;
  ctx: GameContext;
  stageKey: string;
}

/**
 * End-of-stage safe-haven screen. As of §1.2 this is primarily a thin
 * backdrop + button strip: the rich "Captain's Log" card is rendered by
 * RunSummaryScene, which this scene launches as a child overlay. Buttons:
 *
 *   - Next Stage (when another stage exists)
 *   - Campaign Menu (back to shell home)
 *
 * Keeping the buttons here (rather than in RunSummaryScene) keeps routing
 * logic co-located with the StageScene restart sequence it already owns.
 */
export class StageClearScene extends Phaser.Scene {
  static readonly KEY = 'StageClearScene';
  private data_!: StageClearData;

  constructor() {
    super({ key: StageClearScene.KEY });
  }

  init(data: StageClearData): void {
    this.data_ = data;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Darken background.
    this.add.rectangle(0, 0, W, H, 0x000000, 0.82).setOrigin(0, 0);

    // Buttons — anchored below the run-summary card.
    const stage = stageById(this.data_.stageId);
    const currentIdx = STAGES.findIndex((s) => s.id === stage.id);
    const hasNext = currentIdx >= 0 && currentIdx < STAGES.length - 1;
    const btnY = H - 70;

    if (hasNext) {
      const next = STAGES[currentIdx + 1]!;
      this.renderButton(W / 2 - 180, btnY, `Next: ${next.title}`, 0x3a5a24, 0x8fce5a, () => {
        // Launch StageScene with the next stage.
        this.scene.stop(RunSummaryScene.KEY);
        this.scene.stop();
        this.scene.stop('HudScene');
        this.scene.get('StageScene').scene.restart({
          ctx: this.data_.ctx,
          runState: this.data_.runState,
          stageId: currentIdx + 2, // 1-based stage number
        });
        this.scene.launch('HudScene', { runState: this.data_.runState });
      });
    }

    this.renderButton(W / 2 + 180, btnY, 'Campaign Menu', 0x264a5a, 0x99c9d6, () => {
      // Navigate the browser back to home.
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Launch the Captain's Log overlay as a child scene. It owns the card
    // rendering + Download PNG + Continue-alias button. This scene owns
    // the coarse routing buttons above.
    this.scene.launch(RunSummaryScene.KEY, {
      runState: this.data_.runState,
      stageId: this.data_.stageId,
      ctx: this.data_.ctx,
      stageKey: this.data_.stageKey,
      title: 'STAGE CLEAR',
      continueLabel: hasNext ? 'Next Stage' : 'Campaign Menu',
      accentColor: 0xc79448,
      onContinue: () => {
        if (hasNext) {
          const next = STAGES[currentIdx + 1]!;
          void next;
          this.scene.stop(RunSummaryScene.KEY);
          this.scene.stop();
          this.scene.stop('HudScene');
          this.scene.get('StageScene').scene.restart({
            ctx: this.data_.ctx,
            runState: this.data_.runState,
            stageId: currentIdx + 2,
          });
          this.scene.launch('HudScene', { runState: this.data_.runState });
        } else {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      },
    });
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
