import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants';

/**
 * First-run opening tutorial — §1.1 of docs/games/boat-shooter/26-game-designer-enhancements.md.
 *
 * 5-beat scripted intro played ONCE (gated by `tutorialSeen` in persistent
 * save + fresh run on Stage 1). Beats are all timer-bounded with an
 * early-exit trigger (player input, enemy kill, XP pickup). While active,
 * StageScene.update() skips WaveSpawner.update(dt) so the scripted waves
 * don't step on the tutorial's hand-placed Scout Skiff.
 *
 * Complexity: O(1) per frame — a single active beat at a time, no loops
 * over entities. The cost is one timer + up to ~6 on-screen Game Objects.
 */

type BeatId = 'title' | 'steer' | 'enemy' | 'xp' | 'outro';

interface BeatState {
  id: BeatId;
  startedAtMs: number;
  timeoutMs: number;
  /** Container for the beat's visible UI (text / icons). Destroyed on beat end. */
  ui: Phaser.GameObjects.Container;
}

export class TutorialSystem {
  readonly scene: StageScene;
  /** True while a beat is in-flight. StageScene checks this to pause WaveSpawner. */
  active = false;

  /** Root container — parents every beat's UI so we can destroy everything on abort. */
  private root!: Phaser.GameObjects.Container;
  private beat: BeatState | null = null;
  private playerStartPos: { x: number; y: number } = { x: 0, y: 0 };
  /** Unsubscribe handle for the global enemy-killed listener (ctx.events). */
  private offEnemyKilled: (() => void) | null = null;
  /** Snapshot of runState.xp at the start of the XP beat so we detect the pickup. */
  private xpAtBeatStart = 0;
  /** When a level-up happens during the XP beat it also counts as pickup. */
  private xpBeatLevelBaseline = 0;
  /** Saved-flag promise so `finish()` can chain after the load settles. */
  private completed = false;

  constructor(scene: StageScene) {
    this.scene = scene;
  }

  /** Kick off beat 1. Call ONCE per qualifying stage boot. */
  start(): void {
    if (this.active) return;
    this.active = true;
    this.playerStartPos = { x: this.scene.player.x, y: this.scene.player.y };
    this.root = this.scene.add.container(0, 0);
    this.root.setDepth(1500);
    this.beginBeat('title');
  }

  /** Called every frame from StageScene.update(). */
  tick(_deltaMs: number): void {
    if (!this.active || !this.beat) return;
    const now = this.scene.time.now;
    const elapsed = now - this.beat.startedAtMs;

    // Early-exit triggers per beat.
    switch (this.beat.id) {
      case 'title':
        if (elapsed >= this.beat.timeoutMs) this.advance('title');
        break;
      case 'steer': {
        // Player moved far enough that we can safely call it "intentional input".
        const dx = this.scene.player.x - this.playerStartPos.x;
        const dy = this.scene.player.y - this.playerStartPos.y;
        const moved = Math.hypot(dx, dy) > 20;
        if (moved || elapsed >= this.beat.timeoutMs) this.advance('steer');
        break;
      }
      case 'enemy':
        // Skiff kill is handled by the enemy-killed listener; timeout is backup.
        if (elapsed >= this.beat.timeoutMs) this.advance('enemy');
        break;
      case 'xp': {
        // Detect XP pickup: runState.xp dropped (level-up consumed) OR increased
        // above baseline. Because addXp() also decrements on level-up, a clean
        // "picked up something" check is: level rose OR xp > baseline.
        const rs = this.scene.runState;
        const xpGained = rs.xp > this.xpAtBeatStart || rs.level > this.xpBeatLevelBaseline;
        if (xpGained || elapsed >= this.beat.timeoutMs) this.advance('xp');
        break;
      }
      case 'outro':
        if (elapsed >= this.beat.timeoutMs) this.advance('outro');
        break;
    }
  }

  /** Force-abort (e.g. scene shutdown). Cleans up UI + listeners. */
  abort(): void {
    this.teardownBeat();
    this.offEnemyKilled?.();
    this.offEnemyKilled = null;
    if (this.root && !this.root.scene) return;
    this.root?.destroy();
    this.active = false;
  }

  /* ---------- internals ---------- */

  private beginBeat(id: BeatId): void {
    const ui = this.scene.add.container(0, 0);
    this.root.add(ui);
    let timeout = 4000;

    switch (id) {
      case 'title':
        this.buildTitleCard(ui);
        timeout = 2000;
        break;
      case 'steer':
        this.buildSteerPrompt(ui);
        timeout = 4000;
        break;
      case 'enemy':
        this.buildEnemyPrompt(ui);
        this.spawnTutorialSkiff();
        timeout = 4000;
        break;
      case 'xp':
        this.buildXpPrompt(ui);
        this.xpAtBeatStart = this.scene.runState.xp;
        this.xpBeatLevelBaseline = this.scene.runState.level;
        timeout = 4000;
        break;
      case 'outro':
        this.buildOutroCard(ui);
        timeout = 3000;
        break;
    }

    this.beat = { id, startedAtMs: this.scene.time.now, timeoutMs: timeout, ui };
  }

  private advance(from: BeatId): void {
    this.teardownBeat();
    const order: BeatId[] = ['title', 'steer', 'enemy', 'xp', 'outro'];
    const i = order.indexOf(from);
    const next = i >= 0 && i + 1 < order.length ? order[i + 1]! : null;
    if (next) {
      this.beginBeat(next);
    } else {
      this.finish();
    }
  }

  private teardownBeat(): void {
    if (!this.beat) return;
    const ui = this.beat.ui;
    // Fade-out the beat UI then destroy.
    this.scene.tweens.add({
      targets: ui,
      alpha: 0,
      duration: 200,
      onComplete: () => ui.destroy(),
    });
    this.beat = null;
  }

  private finish(): void {
    if (this.completed) return;
    this.completed = true;
    this.offEnemyKilled?.();
    this.offEnemyKilled = null;
    this.active = false;
    // Persist tutorialSeen. We load-then-merge-then-save to avoid clobbering
    // concurrent writes (stage-clear handler in index.ts also writes progress).
    void this.persistTutorialSeen();
    // Root fades out the same frame the outro card destroys; nothing else to do.
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: 250,
      onComplete: () => this.root.destroy(),
    });
  }

  private async persistTutorialSeen(): Promise<void> {
    const ctx = this.scene.getCtx();
    try {
      // Load without a strict type — we only need to merge one field in.
      const loaded = await ctx.save.load<Record<string, unknown>>('progress', {});
      const merged = { ...(loaded ?? {}), tutorialSeen: true };
      await ctx.save.save('progress', merged);
    } catch {
      // Swallow — a failed save just means the tutorial may replay once. Not fatal.
    }
  }

  /* ---------- beat UI builders ---------- */

  private static readonly TITLE_FONT = 'Palatino, Georgia, serif';
  private static readonly UI_FONT = 'Inter, system-ui, sans-serif';
  private static get textResolution(): number {
    // Device-pixel density — keeps 48px Palatino crisp on retina displays.
    return Math.max(2, window.devicePixelRatio || 1);
  }

  private buildTitleCard(ui: Phaser.GameObjects.Container): void {
    const W = WORLD_WIDTH;
    const H = WORLD_HEIGHT;
    // Dark vignette overlay so the title reads against bright water.
    const bg = this.scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55);
    const text = this.scene.add.text(
      W / 2,
      H / 2,
      'You are Captain Bilko.\nThe Kraken has your first mate.',
      {
        fontFamily: TutorialSystem.TITLE_FONT,
        fontSize: '48px',
        color: '#e0b063',
        align: 'center',
        stroke: '#000',
        strokeThickness: 4,
        resolution: TutorialSystem.textResolution,
      },
    );
    text.setOrigin(0.5, 0.5);
    ui.add([bg, text]);
    ui.setAlpha(0);
    this.scene.tweens.add({ targets: ui, alpha: 1, duration: 350 });
  }

  private buildSteerPrompt(ui: Phaser.GameObjects.Container): void {
    const px = this.scene.player.x;
    const py = this.scene.player.y;
    const label = this.scene.add.text(px, py - 140, 'Drag to steer\nArrow keys to move', {
      fontFamily: TutorialSystem.UI_FONT,
      fontSize: '28px',
      color: '#ffffff',
      align: 'center',
      stroke: '#000',
      strokeThickness: 4,
      resolution: TutorialSystem.textResolution,
    }).setOrigin(0.5, 1);

    // Pulsing hand (circle + emoji-free arrow glyph "↕" replaced with drawn shape).
    const hand = this.scene.add.container(px + 60, py);
    const palm = this.scene.add.circle(0, 0, 14, 0xf5d79a, 1).setStrokeStyle(2, 0x3a2410);
    const pointer = this.scene.add.triangle(0, -18, -6, 6, 6, 6, 0, -8, 0xf5d79a, 1)
      .setStrokeStyle(2, 0x3a2410);
    hand.add([palm, pointer]);
    ui.add([label, hand]);

    // Reduced-motion: static indicator; otherwise gentle scale pulse.
    const reduced = this.scene.fx.reducedMotion();
    if (!reduced) {
      this.scene.tweens.add({
        targets: hand,
        scale: { from: 1, to: 1.25 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  private buildEnemyPrompt(ui: Phaser.GameObjects.Container): void {
    const W = WORLD_WIDTH;
    const label = this.scene.add.text(
      W / 2,
      WORLD_HEIGHT * 0.18,
      'Your cannon fires automatically.\nAim by moving.',
      {
        fontFamily: TutorialSystem.UI_FONT,
        fontSize: '30px',
        color: '#ffffff',
        align: 'center',
        stroke: '#000',
        strokeThickness: 4,
        resolution: TutorialSystem.textResolution,
      },
    ).setOrigin(0.5, 0.5);
    ui.add(label);
    ui.setAlpha(0);
    this.scene.tweens.add({ targets: ui, alpha: 1, duration: 250 });
  }

  private buildXpPrompt(ui: Phaser.GameObjects.Container): void {
    // Find the most-recent XP orb on-screen; fall back to boss-skiff drop site.
    const orb = this.findActiveXpOrb();
    const tx = orb ? orb.x : this.scene.player.x;
    const ty = orb ? orb.y - 60 : this.scene.player.y - 120;
    const label = this.scene.add.text(tx, ty - 40, 'Pick up XP to level up.', {
      fontFamily: TutorialSystem.UI_FONT,
      fontSize: '24px',
      color: '#cfeeff',
      align: 'center',
      stroke: '#000',
      strokeThickness: 3,
      resolution: TutorialSystem.textResolution,
    }).setOrigin(0.5, 1);
    // Arrow pointing down at the orb location.
    const arrow = this.scene.add.triangle(tx, ty, -10, -14, 10, -14, 0, 2, 0x5ac8e8, 1)
      .setStrokeStyle(2, 0x2a8aa8);
    ui.add([label, arrow]);

    const reduced = this.scene.fx.reducedMotion();
    if (!reduced) {
      this.scene.tweens.add({
        targets: arrow,
        y: { from: ty - 6, to: ty + 6 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
    ui.setAlpha(0);
    this.scene.tweens.add({ targets: ui, alpha: 1, duration: 250 });
  }

  private buildOutroCard(ui: Phaser.GameObjects.Container): void {
    const W = WORLD_WIDTH;
    const H = WORLD_HEIGHT;
    const bg = this.scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55);
    const text = this.scene.add.text(W / 2, H / 2, 'Survive 15 stages.\nGood luck, Captain.', {
      fontFamily: TutorialSystem.TITLE_FONT,
      fontSize: '48px',
      color: '#e0b063',
      align: 'center',
      stroke: '#000',
      strokeThickness: 4,
      resolution: TutorialSystem.textResolution,
    }).setOrigin(0.5, 0.5);
    ui.add([bg, text]);
    ui.setAlpha(0);
    this.scene.tweens.add({ targets: ui, alpha: 1, duration: 350 });
  }

  /* ---------- enemy helpers ---------- */

  private spawnTutorialSkiff(): void {
    // Spawn dead-ahead of the player so the auto-fire lesson works.
    const x = this.scene.player.x;
    const y = Math.max(120, this.scene.player.y - WORLD_HEIGHT * 0.4);
    this.scene.enemies.spawn('scout-skiff', x, y);
    // Listen for the kill (the tutorial only cares about scout-skiff kills
    // during the enemy beat; during tutorial the spawner is paused so this
    // is effectively exclusive).
    const ctx = this.scene.getCtx();
    const off = ctx.events.on('enemy-killed', (ev) => {
      if (!this.active || this.beat?.id !== 'enemy') return;
      if (ev.enemyId !== 'scout-skiff') return;
      this.advance('enemy');
    });
    this.offEnemyKilled = off;
  }

  private findActiveXpOrb(): { x: number; y: number } | null {
    // PickupSystem keeps its pool private, but the visual orbs are child
    // graphics on the scene. We do a cheap scan of the pickups pool via a
    // duck-typed accessor — the fallback to null keeps us safe if the pool
    // shape changes in the future.
    const ps = this.scene.pickups as unknown as {
      pool?: Array<{ kind: string; active: boolean; x: number; y: number }>;
    };
    const pool = ps.pool;
    if (!pool) return null;
    for (const p of pool) {
      if (p.active && p.kind === 'xp-orb') return { x: p.x, y: p.y };
    }
    return null;
  }
}

/**
 * Entry predicate — sole consumer is StageScene.create(). Kept here to
 * co-locate with TutorialSystem so future tweaks stay in one file.
 */
export function shouldRunTutorial(opts: {
  stageId: string;
  level: number;
  tutorialSeen: boolean;
  urlFlag: 'force' | 'skip' | 'default';
}): boolean {
  if (opts.urlFlag === 'force') return true;
  if (opts.urlFlag === 'skip') return false;
  if (opts.tutorialSeen) return false;
  if (opts.level !== 1) return false;
  // Stage-1 check — guard against 'stage-10'..'stage-15' false positives by
  // anchoring to the 'stage-1-' prefix (every stage ID is `stage-N-<slug>`).
  return opts.stageId.startsWith('stage-1-');
}
