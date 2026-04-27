import Phaser from 'phaser';
import type { GameContext } from '@bilko/game-sdk';
import type { RunState } from '../run-state';
import type { CombatLog, CombatLogEntry } from '../systems/combat-log';
import type { StageScene } from './stage-scene';
import { prettyName } from './util/pretty-name';

interface PostMortemData {
  runState: RunState;
  stageId: string;
  ctx: GameContext;
  stageKey: string;
  /** Called when the player clicks Continue — parent launches the run summary. */
  onContinue: () => void;
}

/**
 * Death post-mortem — shown before the run summary on GameOverScene.
 *
 * Layout (centered card):
 *   - Big: "Killed by: <source>"
 *   - Sub: "Final blow: <amount> damage (<type>)"
 *   - Last 5 combat-log rows rendered inline (short format)
 *   - Heuristic tip (see pickTip)
 *   - Continue button — fades to the RunSummaryScene.
 */
export class PostMortemScene extends Phaser.Scene {
  static readonly KEY = 'PostMortemScene';

  private static readonly CARD_W = 640;
  private static readonly CARD_H = 480;
  private static readonly TEXT_RES = Math.max(2, (typeof window !== 'undefined' ? window.devicePixelRatio : 2) || 2);

  private data_!: PostMortemData;

  constructor() {
    super({ key: PostMortemScene.KEY });
  }

  init(data: PostMortemData): void {
    this.data_ = data;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const reducedMotion = this.isReducedMotion();

    // Screen vignette.
    this.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0, 0);

    const cardX = (W - PostMortemScene.CARD_W) / 2;
    const cardY = (H - PostMortemScene.CARD_H) / 2;
    const card = this.add.container(cardX, cardY);
    card.setDepth(1800);

    const bg = this.add.rectangle(0, 0, PostMortemScene.CARD_W, PostMortemScene.CARD_H, 0x1a0808, 0.96).setOrigin(0, 0);
    bg.setStrokeStyle(3, 0xff5a5a, 0.9);
    card.add(bg);

    const log = this.resolveCombatLog();
    const lastTaken = findLastTaken(log);

    // Title.
    const title = this.add.text(PostMortemScene.CARD_W / 2, 36, 'POST-MORTEM', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '24px',
      color: '#ff5a5a',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    title.setResolution(PostMortemScene.TEXT_RES);
    card.add(title);

    // "Killed by: <name>" — the showpiece line.
    const killedByName = lastTaken ? prettyName(lastTaken.source) : 'Unknown';
    const killedBy = this.add.text(PostMortemScene.CARD_W / 2, 88, `Killed by: ${killedByName}`, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '28px',
      color: '#ffd85a',
      stroke: '#000',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: PostMortemScene.CARD_W - 40 },
    }).setOrigin(0.5, 0.5);
    killedBy.setResolution(PostMortemScene.TEXT_RES);
    card.add(killedBy);

    // "Final blow: <amount> damage (<type>)"
    const finalBlowText = lastTaken
      ? `Final blow: ${Math.round(lastTaken.amount)} damage (${lastTaken.type})`
      : 'Final blow: unknown';
    const finalBlow = this.add.text(PostMortemScene.CARD_W / 2, 128, finalBlowText, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
      color: '#cce4ea',
    }).setOrigin(0.5, 0.5);
    finalBlow.setResolution(PostMortemScene.TEXT_RES);
    card.add(finalBlow);

    // Last 5 combat-log rows — reuse the short format.
    const recent = lastFiveRows(log);
    const recentHeader = this.add.text(40, 170, 'LAST 5 EVENTS', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '12px',
      color: '#99aab3',
    }).setOrigin(0, 0);
    recentHeader.setResolution(PostMortemScene.TEXT_RES);
    card.add(recentHeader);

    const now = Date.now();
    const rowText = recent.length > 0
      ? recent.map((e) => formatShort(e, now)).join('\n')
      : '(no recent events)';
    const rowsText = this.add.text(40, 192, rowText, {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '12px',
      color: '#cce4ea',
      lineSpacing: 4,
      wordWrap: { width: PostMortemScene.CARD_W - 80 },
    }).setOrigin(0, 0);
    rowsText.setResolution(PostMortemScene.TEXT_RES);
    card.add(rowsText);

    // Heuristic tip.
    const tip = pickTip(log, lastTaken);
    const tipHeader = this.add.text(40, 330, 'CAPTAIN\'S NOTE', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '12px',
      color: '#99aab3',
    }).setOrigin(0, 0);
    tipHeader.setResolution(PostMortemScene.TEXT_RES);
    card.add(tipHeader);

    const tipText = this.add.text(40, 352, tip, {
      fontFamily: 'Palatino, Georgia, serif',
      fontStyle: 'italic',
      fontSize: '16px',
      color: '#f0dca0',
      wordWrap: { width: PostMortemScene.CARD_W - 80 },
    }).setOrigin(0, 0);
    tipText.setResolution(PostMortemScene.TEXT_RES);
    card.add(tipText);

    // Continue button.
    const btn = this.makeButton(
      PostMortemScene.CARD_W / 2,
      PostMortemScene.CARD_H - 42,
      'Continue',
      0x5a2020,
      0xff8a5a,
      () => {
        this.data_.onContinue();
      },
    );
    card.add(btn);

    // Fade-in (alpha-only) — reduced-motion shortens it.
    card.setAlpha(0);
    this.tweens.add({
      targets: card,
      alpha: 1,
      duration: reducedMotion ? 120 : 320,
      ease: 'Sine.easeOut',
    });
  }

  private resolveCombatLog(): CombatLog | null {
    try {
      const scene = this.scene.get(this.data_.stageKey) as StageScene | undefined;
      return scene?.combatLog ?? null;
    } catch {
      return null;
    }
  }

  private isReducedMotion(): boolean {
    try {
      return this.data_.ctx.settings.display.reducedMotion === true;
    } catch {
      return false;
    }
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    fill: number,
    stroke: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const w = 220;
    const h = 48;
    const c = this.add.container(x, y);
    const rect = this.add.rectangle(0, 0, w, h, fill).setOrigin(0.5, 0.5);
    rect.setStrokeStyle(2, stroke);
    rect.setInteractive({ useHandCursor: true });
    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '18px',
      color: '#ffe6d2',
    }).setOrigin(0.5, 0.5);
    txt.setResolution(PostMortemScene.TEXT_RES);
    rect.on('pointerdown', onClick);
    rect.on('pointerover', () => rect.setFillStyle(fill + 0x101010));
    rect.on('pointerout', () => rect.setFillStyle(fill));
    c.add([rect, txt]);
    return c;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * Pure helpers. Exported intent is internal-only; kept module-private.
 * ───────────────────────────────────────────────────────────────────── */

type TakenEntry = Extract<CombatLogEntry, { kind: 'taken' }>;

function findLastTaken(log: CombatLog | null): TakenEntry | null {
  if (!log) return null;
  const entries = log.latest(50); // newest-first
  for (const e of entries) {
    if (e.kind === 'taken') return e;
  }
  return null;
}

/**
 * Return the last 5 entries in chronological order (oldest-first) so the
 * block reads top-to-bottom like a log. latest() gives newest-first; we
 * slice the first 5 then reverse.
 */
function lastFiveRows(log: CombatLog | null): CombatLogEntry[] {
  if (!log) return [];
  return log.latest(5).slice().reverse();
}

/** Short-format combat log row. Matches combat-log-scene.ts's formatter. */
function formatShort(e: CombatLogEntry, now: number): string {
  const t = `${Math.max(0, Math.round((now - e.time) / 1000))}s`;
  switch (e.kind) {
    case 'dealt':
      return `[${t}] ⚔ ${Math.round(e.amount)}${e.isCrit ? '!' : ''} → ${prettyName(e.target)}${e.kill ? ' ✝' : ''}`;
    case 'taken':
      return `[${t}] 💥 ${Math.round(e.amount)} ← ${prettyName(e.source)}${e.reduced > 0 ? ` (-${Math.round(e.reduced)} hull)` : ''}`;
    case 'kill':
      return `[${t}] 💀 ${prettyName(e.target)} +${e.xp} xp`;
    case 'dot':
      return `[${t}] 🔥 ${e.status} ${Math.round(e.amount)} → ${prettyName(e.target)}`;
    case 'status':
      return `[${t}] 🌊 ${e.status} ${e.added ? 'applied' : 'stacked'} → ${prettyName(e.target)}`;
    case 'reaction':
      return `[${t}] ✴ ${e.reaction} → ${prettyName(e.target)}`;
    case 'pickup':
      return `[${t}] + ${e.amount} ${e.pickup}`;
    case 'levelup':
      return `[${t}] ★ Level ${e.level}`;
  }
}

/**
 * Inspect the last 15 `taken` entries and pick a single actionable tip.
 *
 * Priority order (first match wins) — higher-signal tips fire before the
 * generic fallback:
 *   1. >50% of sum(amount) from contact damage → suggest Copper Hull / distance.
 *   2. Final blow from a bank-sniper-* source → teach the red-laser dodge cue.
 *   3. >40% of sum(amount) from a single source → name-and-shame that source.
 *   4. `element === 'fire'` is the most common element → suggest Crow's Nest.
 *   5. Fallback — generic "scout dodge lanes" tip.
 */
function pickTip(log: CombatLog | null, lastTaken: TakenEntry | null): string {
  const GENERIC = 'Every stage has a safer dodge lane. Scout it early.';
  if (!log) return GENERIC;

  // Pull newest-first, take up to 15 `taken` rows.
  const entries = log.latest(200);
  const taken: TakenEntry[] = [];
  for (const e of entries) {
    if (e.kind === 'taken') {
      taken.push(e);
      if (taken.length >= 15) break;
    }
  }
  if (taken.length === 0) return GENERIC;

  const total = taken.reduce((a, b) => a + b.amount, 0);
  if (total <= 0) return GENERIC;

  // 1. Contact-damage majority.
  const contactSum = taken.filter((t) => t.type === 'contact').reduce((a, b) => a + b.amount, 0);
  if (contactSum / total > 0.5) {
    return 'Consider Copper Hull or keeping distance.';
  }

  // 2. Bank-sniper final blow.
  if (lastTaken && lastTaken.source.startsWith('bank-sniper')) {
    return "Watch for the red laser — that's the dodge cue.";
  }

  // 3. Single-source dominance.
  const bySource = new Map<string, number>();
  for (const t of taken) {
    bySource.set(t.source, (bySource.get(t.source) ?? 0) + t.amount);
  }
  let worstSource: string | null = null;
  let worstAmount = 0;
  for (const [src, amt] of bySource) {
    if (amt > worstAmount) {
      worstAmount = amt;
      worstSource = src;
    }
  }
  if (worstSource && worstAmount / total > 0.4) {
    return `${prettyName(worstSource)} has been picking you off. Prioritize it earlier.`;
  }

  // 4. Fire element dominance.
  const byElement = new Map<string, number>();
  for (const t of taken) {
    byElement.set(t.element, (byElement.get(t.element) ?? 0) + 1);
  }
  let topElement: string | null = null;
  let topElementCount = 0;
  for (const [el, count] of byElement) {
    if (count > topElementCount) {
      topElementCount = count;
      topElement = el;
    }
  }
  if (topElement === 'fire') {
    return "Fire shots burn on hit; grab Crow's Nest for resistance.";
  }

  return GENERIC;
}
