import Phaser from 'phaser';
import { RunState } from '../run-state';
import type { StageScene } from './stage-scene';

/**
 * Overlay HUD: HP planks, XP bar, coin counter, level, active weapons/passives,
 * stage timer. Rendered in a separate scene running on top of StageScene so it
 * survives scene pauses and doesn't scale with any future world camera.
 */
export class HudScene extends Phaser.Scene {
  static readonly KEY = 'HudScene';

  private runState!: RunState;

  private hpPlanks!: Phaser.GameObjects.Graphics;
  private xpBarBg!: Phaser.GameObjects.Graphics;
  private xpBarFill!: Phaser.GameObjects.Graphics;
  private coinText!: Phaser.GameObjects.Text;
  private gemText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private weaponsText!: Phaser.GameObjects.Text;
  private passivesText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: HudScene.KEY });
  }

  init(data: { runState: RunState }): void {
    this.runState = data.runState;
  }

  create(): void {
    const W = this.scale.width;

    // HP planks — top-left.
    this.hpPlanks = this.add.graphics({ x: 20, y: 20 });
    this.redrawHp();

    // Level + XP bar — top-center.
    this.levelText = this.add.text(W / 2, 20, 'Lvl 1', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '28px',
      color: '#e0b063',
    });
    this.levelText.setOrigin(0.5, 0);

    this.xpBarBg = this.add.graphics({ x: W / 2 - 200, y: 60 });
    this.xpBarFill = this.add.graphics({ x: W / 2 - 200, y: 60 });
    this.xpBarBg.fillStyle(0x0a2a3a, 1).fillRoundedRect(0, 0, 400, 12, 6);
    this.redrawXp();

    // Coins + gems — top-right stacked.
    this.coinText = this.add.text(W - 20, 20, '🪙 0', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '26px',
      color: '#e0b063',
    });
    this.coinText.setOrigin(1, 0);
    this.gemText = this.add.text(W - 20, 52, '💎 0', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '20px',
      color: '#c88aff',
    });
    this.gemText.setOrigin(1, 0);

    // Pause hint — top-right corner, below gems.
    this.add.text(W - 20, 80, 'Esc to pause', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '12px',
      color: '#667',
    }).setOrigin(1, 0);

    // Weapon/passive lists — bottom-left (small, debug-ish in P1).
    this.weaponsText = this.add.text(20, this.scale.height - 80, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '18px',
      color: '#cce4ea',
    });
    this.passivesText = this.add.text(20, this.scale.height - 40, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '18px',
      color: '#99c9d6',
    });
    this.redrawLoadout();

    // Legacy Ship Stats dev panel removed 2026-04-24 — its content is
    // fully superseded by the bottom-left PlayerPropsScene (tab 1).
    this.buildStreakOverlay();

    // Wire up RunState subscriptions.
    this.runState.onRun('hp-changed', () => this.redrawHp());
    this.runState.onRun('xp-changed', () => {
      this.redrawXp();
      this.levelText.setText(`Lvl ${this.runState.level}`);
    });
    this.runState.onRun('level-up', () => {
      this.levelText.setText(`Lvl ${this.runState.level}`);
      this.flashLevel();
    });
    this.runState.onRun('coins-changed', (e) => {
      this.coinText.setText(`🪙 ${e.total}`);
    });
    this.runState.onRun('gems-changed', (e) => {
      this.gemText.setText(`💎 ${e.total}`);
    });
    this.runState.onRun('weapon-gained', () => this.redrawLoadout());
    this.runState.onRun('weapon-leveled', () => this.redrawLoadout());
    this.runState.onRun('passive-gained', () => this.redrawLoadout());
    this.runState.onRun('passive-leveled', () => this.redrawLoadout());
  }

  private redrawHp(): void {
    const plankW = 32;
    const plankH = 16;
    const gap = 4;
    this.hpPlanks.clear();
    for (let i = 0; i < this.runState.maxHp; i++) {
      const color = i < this.runState.hp ? 0xc79448 : 0x3b2a20;
      this.hpPlanks.fillStyle(color, 1).fillRoundedRect(i * (plankW + gap), 0, plankW, plankH, 3);
    }
  }

  private redrawXp(): void {
    const barW = 400;
    const barH = 12;
    const frac = Math.min(1, this.runState.xp / Math.max(1, this.runState.xpToNext()));
    this.xpBarFill.clear().fillStyle(0x3393ac, 1).fillRoundedRect(0, 0, barW * frac, barH, 6);
  }

  private redrawLoadout(): void {
    const w = this.runState.weapons.map((x) => `${x.id}⟨${x.level}⟩`).join(' · ');
    const p = this.runState.passives.map((x) => `${x.id}⟨${x.level}⟩`).join(' · ');
    this.weaponsText.setText(`W: ${w || '—'}`);
    this.passivesText.setText(`P: ${p || '—'}`);
  }

  private flashLevel(): void {
    this.tweens.add({
      targets: this.levelText,
      scale: { from: 1, to: 1.4 },
      yoyo: true,
      duration: 250,
      ease: 'Cubic.Out',
    });
  }

  /* ---------- Dev panel — bottom-left table showing every runtime stat. ---------- */

  // Legacy Ship Stats dev panel + build/refresh methods removed 2026-04-24.
  // All of that content now lives in `scenes/player-props-scene.ts` →
  // PlayerPropsScene (bottom-left, 3-tab). Press `I` to toggle.

  /* ---------- Streak overlay — kill / crit chains, left column. ---------- */

  private killStreakText?: Phaser.GameObjects.Text;
  private critStreakText?: Phaser.GameObjects.Text;
  /** Rolling windows — timestamps of recent kills/crits. Trimmed every 250 ms. */
  private killEvents: number[] = [];
  private critEvents: number[] = [];
  private lastKillChainShown = 0;
  private lastCritChainShown = 0;
  /** Sliding window for "chain" math (ms). */
  private static readonly STREAK_WINDOW_MS = 2000;

  private buildStreakOverlay(): void {
    const baseY = 490;
    this.killStreakText = this.add.text(20, baseY, '', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '28px',
      color: '#ffd13a',
      stroke: '#000',
      strokeThickness: 4,
      fontStyle: 'bold',
    });
    this.killStreakText.setDepth(1400).setAlpha(0);

    this.critStreakText = this.add.text(20, baseY + 36, '', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '22px',
      color: '#8ff0ff',
      stroke: '#000',
      strokeThickness: 3,
      fontStyle: 'bold',
    });
    this.critStreakText.setDepth(1400).setAlpha(0);

    this.attachCombatLog();
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.evaluateStreaks() });
  }

  private attachCombatLog(retries = 20): void {
    const stage = this.scene.get('StageScene') as StageScene | undefined;
    const log = stage?.combatLog;
    if (!log) {
      if (retries > 0) this.time.delayedCall(100, () => this.attachCombatLog(retries - 1));
      return;
    }
    log.onPush((e) => {
      const now = Date.now();
      if (e.kind === 'kill' || (e.kind === 'dealt' && e.kill)) {
        this.killEvents.push(now);
      }
      if (e.kind === 'dealt' && e.isCrit) {
        this.critEvents.push(now);
      }
      this.evaluateStreaks();
    });
  }

  private evaluateStreaks(): void {
    const now = Date.now();
    const windowMs = HudScene.STREAK_WINDOW_MS;
    this.killEvents = this.killEvents.filter((t) => now - t <= windowMs);
    this.critEvents = this.critEvents.filter((t) => now - t <= windowMs);

    if (!this.killStreakText || !this.critStreakText) return;

    const killCount = this.killEvents.length;
    if (killCount >= 3) {
      this.killStreakText.setText(`x${killCount} KILL STREAK`);
      if (killCount !== this.lastKillChainShown) {
        this.lastKillChainShown = killCount;
        this.showStreakText(this.killStreakText);
      }
    } else if (this.killStreakText.alpha > 0) {
      this.tweens.add({ targets: this.killStreakText, alpha: 0, duration: 260 });
      this.lastKillChainShown = 0;
    }

    const critCount = this.critEvents.length;
    if (critCount >= 3) {
      this.critStreakText.setText(`x${critCount} CRIT CHAIN`);
      if (critCount !== this.lastCritChainShown) {
        this.lastCritChainShown = critCount;
        this.showStreakText(this.critStreakText);
      }
    } else if (this.critStreakText.alpha > 0) {
      this.tweens.add({ targets: this.critStreakText, alpha: 0, duration: 260 });
      this.lastCritChainShown = 0;
    }
  }

  private showStreakText(t: Phaser.GameObjects.Text): void {
    const reducedMotion = (() => {
      try {
        return (
          (this.scene.get('StageScene') as StageScene | undefined)?.getCtx().settings.display
            .reducedMotion
        ) === true;
      } catch { return false; }
    })();
    this.tweens.killTweensOf(t);
    t.setAlpha(0);
    if (reducedMotion) {
      this.tweens.add({ targets: t, alpha: 1, duration: 220 });
    } else {
      const baseX = 20;
      t.x = baseX - 40;
      this.tweens.add({
        targets: t,
        x: baseX,
        alpha: 1,
        scale: { from: 1.2, to: 1 },
        duration: 260,
        ease: 'Back.out',
      });
    }
  }
}
