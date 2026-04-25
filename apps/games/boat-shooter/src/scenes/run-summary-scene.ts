import Phaser from 'phaser';
import type { GameContext } from '@bilko/game-sdk';
import { RunState } from '../run-state';
import { stageById } from '../data/stages';
import { SHIP_CONFIGS, type ShipElement } from '../data/starting-ships';
import { WEAPON_DEFS } from '../weapons/weapon-catalog';
import { PASSIVE_DEFS } from '../weapons/passive-catalog';
import type { CombatLog, CombatLogEntry } from '../systems/combat-log';
import type { StageScene } from './stage-scene';

interface RunSummaryData {
  runState: RunState;
  stageId: string;
  ctx: GameContext;
  stageKey: string;
  /** Invoked when the player taps Continue / Return Home. The launcher owns routing. */
  onContinue?: () => void;
  /** Label for the continue button — "Continue" on stage-clear, "Return Home" on death. */
  continueLabel?: string;
  /** Title shown above the ship header (e.g. "STAGE CLEAR" or "RUN OVER"). */
  title?: string;
  /** Flavor color — parchment gold (stage-clear) vs bloodstained (game-over). */
  accentColor?: number;
}

/**
 * "Captain's Log" run-summary card. Launched by both StageClearScene and
 * GameOverScene as a child overlay. Renders a centered parchment panel
 * showing ship identity, stage reached, three highlight stats, close-call
 * count, an auto-generated build tagline, and two footer buttons.
 *
 * Reads combat log by re-resolving StageScene via `scene.get(stageKey)`.
 * If the stage is no longer active the scene gracefully falls back to
 * empty stats — it will not crash when the user re-enters mid-tear-down.
 */
export class RunSummaryScene extends Phaser.Scene {
  static readonly KEY = 'RunSummaryScene';

  private static readonly CARD_W = 640;
  private static readonly CARD_H = 480;
  private static readonly TEXT_RES = Math.max(2, (typeof window !== 'undefined' ? window.devicePixelRatio : 2) || 2);

  private data_!: RunSummaryData;

  constructor() {
    super({ key: RunSummaryScene.KEY });
  }

  init(data: RunSummaryData): void {
    this.data_ = data;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const rs = this.data_.runState;
    const stageSpec = stageById(this.data_.stageId);
    const ship = SHIP_CONFIGS[rs.shipId];
    const accent = this.data_.accentColor ?? 0xc79448;

    const reducedMotion = this.isReducedMotion();

    // Subtle screen dim behind the card so the parent scene's content recedes.
    // Parent scenes already darken the screen; this is a soft additional vignette.
    this.add.rectangle(0, 0, W, H, 0x000000, 0.25).setOrigin(0, 0);

    // Card container, centered. Use a container so a single fade-in tween can
    // cascade to every child.
    const cardX = (W - RunSummaryScene.CARD_W) / 2;
    const cardY = (H - RunSummaryScene.CARD_H) / 2;
    const card = this.add.container(cardX, cardY);
    card.setDepth(1800);

    // Parchment background: deep navy fill + gold border to read as a ship's
    // logbook page against the war-scene behind it.
    const bg = this.add.rectangle(0, 0, RunSummaryScene.CARD_W, RunSummaryScene.CARD_H, 0x1a1410, 0.95).setOrigin(0, 0);
    bg.setStrokeStyle(3, accent, 0.9);
    card.add(bg);

    // Inner rule lines — parchment decoration.
    const ruleTop = this.add.rectangle(24, 80, RunSummaryScene.CARD_W - 48, 1, accent, 0.35).setOrigin(0, 0);
    const ruleMid = this.add.rectangle(24, 220, RunSummaryScene.CARD_W - 48, 1, accent, 0.25).setOrigin(0, 0);
    const ruleBot = this.add.rectangle(24, RunSummaryScene.CARD_H - 80, RunSummaryScene.CARD_W - 48, 1, accent, 0.35).setOrigin(0, 0);
    card.add([ruleTop, ruleMid, ruleBot]);

    // ─── Header ─────────────────────────────────────────────────────────
    const titleLine = this.data_.title ?? "CAPTAIN'S LOG";
    const titleText = this.add.text(RunSummaryScene.CARD_W / 2, 32, titleLine, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '28px',
      color: this.toHex(accent),
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    titleText.setResolution(RunSummaryScene.TEXT_RES);
    card.add(titleText);

    const headerLabel = `${ship.emoji}  ${ship.displayName}  —  Captain's Log`;
    const headerText = this.add.text(RunSummaryScene.CARD_W / 2, 58, headerLabel, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '20px',
      color: '#f0dca0',
    }).setOrigin(0.5, 0.5);
    headerText.setResolution(RunSummaryScene.TEXT_RES);
    card.add(headerText);

    // Stage sub-header.
    const stageIdx = this.extractStageNumber(stageSpec.id);
    const sub = this.add.text(
      RunSummaryScene.CARD_W / 2,
      100,
      `Stage reached: ${stageIdx} — ${stageSpec.title}`,
      {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '16px',
        color: '#cce4ea',
      },
    ).setOrigin(0.5, 0.5);
    sub.setResolution(RunSummaryScene.TEXT_RES);
    card.add(sub);

    // ─── Three highlight stats row ──────────────────────────────────────
    const log = this.resolveCombatLog();
    const highlights = deriveHighlights(log);
    const statLabels: Array<{ label: string; value: string }> = [
      { label: 'Biggest Hit', value: highlights.maxHit > 0 ? `${highlights.maxHit} dmg` : '—' },
      { label: 'Longest Streak', value: highlights.longestStreak > 0 ? `×${highlights.longestStreak}` : '—' },
      { label: 'Favorite Reaction', value: highlights.favoriteReaction ?? '—' },
    ];
    const statRowY = 140;
    const col = RunSummaryScene.CARD_W / 3;
    statLabels.forEach((s, i) => {
      const cx = col * i + col / 2;
      const label = this.add.text(cx, statRowY, s.label.toUpperCase(), {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px',
        color: '#99aab3',
      }).setOrigin(0.5, 0.5);
      label.setResolution(RunSummaryScene.TEXT_RES);
      card.add(label);
      const value = this.add.text(cx, statRowY + 28, s.value, {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '24px',
        color: '#ffd85a',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);
      value.setResolution(RunSummaryScene.TEXT_RES);
      card.add(value);
    });

    // ─── Close-call count ───────────────────────────────────────────────
    const closeCalls = countCloseCalls(log);
    const ccText = this.add.text(
      RunSummaryScene.CARD_W / 2,
      240,
      `Close calls: ${closeCalls} (dropped to 1 HP)`,
      {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '15px',
        color: closeCalls >= 3 ? '#ff8a5a' : '#cce4ea',
      },
    ).setOrigin(0.5, 0.5);
    ccText.setResolution(RunSummaryScene.TEXT_RES);
    card.add(ccText);

    // ─── Build tagline ──────────────────────────────────────────────────
    const tagline = buildTagline(rs, ship.element);
    const tagText = this.add.text(RunSummaryScene.CARD_W / 2, 280, tagline, {
      fontFamily: 'Palatino, Georgia, serif',
      fontStyle: 'italic',
      fontSize: '19px',
      color: '#f0dca0',
      wordWrap: { width: RunSummaryScene.CARD_W - 80 },
      align: 'center',
    }).setOrigin(0.5, 0.5);
    tagText.setResolution(RunSummaryScene.TEXT_RES);
    card.add(tagText);

    // ─── Run summary lines (level / coins / gems) ───────────────────────
    const lines = [
      `Level ${rs.level}   ·   🪙 ${rs.coins}   ·   💎 ${rs.gems}`,
      `Weapons: ${rs.weapons.length}   ·   Passives: ${rs.passives.length}   ·   Evolutions: ${rs.evolutions.size}`,
    ];
    lines.forEach((line, i) => {
      const t = this.add.text(RunSummaryScene.CARD_W / 2, 330 + i * 24, line, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '15px',
        color: '#cce4ea',
      }).setOrigin(0.5, 0.5);
      t.setResolution(RunSummaryScene.TEXT_RES);
      card.add(t);
    });

    // ─── Footer buttons ─────────────────────────────────────────────────
    const btnY = RunSummaryScene.CARD_H - 42;
    const btnDownload = this.makeButton(160, btnY, 'Download PNG', 0x3a3020, 0xc79448, () => {
      this.downloadAsPng();
    });
    card.add(btnDownload);

    const continueLabel = this.data_.continueLabel ?? 'Continue';
    const btnContinue = this.makeButton(RunSummaryScene.CARD_W - 160, btnY, continueLabel, 0x264a5a, 0x99c9d6, () => {
      if (this.data_.onContinue) this.data_.onContinue();
    });
    card.add(btnContinue);

    // Entry animation: simple fade-in. Reduced motion still gets the fade
    // (it's a non-motion, alpha-only tween), just shorter.
    card.setAlpha(0);
    this.tweens.add({
      targets: card,
      alpha: 1,
      duration: reducedMotion ? 120 : 320,
      ease: 'Sine.easeOut',
    });
  }

  /** Render the current frame to a PNG and trigger a download. Browser-only. */
  private downloadAsPng(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const canvas = this.game.canvas as HTMLCanvasElement | undefined;
    if (!canvas || typeof canvas.toDataURL !== 'function') return;
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `boat-shooter-captains-log-${stamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // WebGL contexts can taint the canvas; swallow silently rather than
      // blow up the UI. A proper Phaser `renderer.snapshot` pass would be
      // the next step if this ever fails in practice.
    }
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

  /** Convert a hex int to a '#rrggbb' string for Phaser text color. */
  private toHex(c: number): string {
    return `#${c.toString(16).padStart(6, '0')}`;
  }

  private extractStageNumber(id: string): number {
    const m = /stage-(\d+)/.exec(id);
    return m && m[1] ? Number(m[1]) : 1;
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    fill: number,
    stroke: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const w = 200;
    const h = 46;
    const c = this.add.container(x, y);
    const rect = this.add.rectangle(0, 0, w, h, fill).setOrigin(0.5, 0.5);
    rect.setStrokeStyle(2, stroke);
    rect.setInteractive({ useHandCursor: true });
    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '17px',
      color: '#cce4ea',
    }).setOrigin(0.5, 0.5);
    txt.setResolution(RunSummaryScene.TEXT_RES);
    rect.on('pointerdown', onClick);
    rect.on('pointerover', () => rect.setFillStyle(fill + 0x101010));
    rect.on('pointerout', () => rect.setFillStyle(fill));
    c.add([rect, txt]);
    return c;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * Derivation helpers — pure functions over the combat log. Exported for
 * tests and for the post-mortem scene's shared computations.
 * ───────────────────────────────────────────────────────────────────── */

interface Highlights {
  maxHit: number;
  longestStreak: number;
  favoriteReaction: string | null;
}

/**
 * Walk the combat log once to extract run highlights. Complexity: O(n) over
 * log entries (n ≤ 200 ring buffer). Kill streak is the max count of `kill`
 * or `dealt&kill` events within any 2000 ms sliding window; mirrors the
 * HUD's streak logic so the number lines up with what the player saw.
 */
function deriveHighlights(log: CombatLog | null): Highlights {
  if (!log) return { maxHit: 0, longestStreak: 0, favoriteReaction: null };
  const entries = log.latest(200);
  // latest() returns newest-first; reverse for time-ordered sliding window.
  const chrono: CombatLogEntry[] = entries.slice().reverse();

  let maxHit = 0;
  const reactionCounts = new Map<string, number>();
  const killTimes: number[] = [];

  for (const e of chrono) {
    if (e.kind === 'dealt') {
      if (e.amount > maxHit) maxHit = Math.round(e.amount);
      if (e.kill) killTimes.push(e.time);
    } else if (e.kind === 'kill') {
      killTimes.push(e.time);
    } else if (e.kind === 'reaction') {
      reactionCounts.set(e.reaction, (reactionCounts.get(e.reaction) ?? 0) + 1);
    }
  }

  // Longest streak — max count in a 2000 ms sliding window. Two-pointer, O(n).
  const WINDOW = 2000;
  let longestStreak = 0;
  let left = 0;
  for (let right = 0; right < killTimes.length; right++) {
    while (left < right && killTimes[right]! - killTimes[left]! > WINDOW) left++;
    const count = right - left + 1;
    if (count > longestStreak) longestStreak = count;
  }

  let favoriteReaction: string | null = null;
  let bestCount = 0;
  for (const [name, count] of reactionCounts) {
    if (count > bestCount) {
      bestCount = count;
      favoriteReaction = name;
    }
  }

  return { maxHit, longestStreak, favoriteReaction };
}

/**
 * Count "close calls": heavy damage spikes the player took in short order.
 *
 * The ideal signal is "taken events where HP dropped to 1 within 10 s",
 * but the combat log doesn't snapshot HP per entry. Proxy: within any
 * 10 s window, count "heavy" taken events (amount ≥ 5). A run with many
 * heavy spikes was a run of repeated close calls.
 *
 * Complexity: O(n) over log entries.
 */
function countCloseCalls(log: CombatLog | null): number {
  if (!log) return 0;
  const entries = log.latest(200).slice().reverse();
  let count = 0;
  for (const e of entries) {
    if (e.kind !== 'taken') continue;
    if (e.amount >= 5) count += 1;
  }
  return count;
}

const ELEMENT_ADJECTIVES: Record<ShipElement, string> = {
  fire: 'Burning',
  storm: 'Crackling',
  frost: 'Icebound',
  earth: 'Rooted',
  shadow: 'Haunting',
};

/**
 * Build a "A <adjective> <weapon>/<passive> build" tagline. Picks the
 * first-held weapon + passive (which matches the starter for a typical run
 * and is a sensible "signature" choice in any case). Falls back to
 * "A <adjective> voyage" if the player has nothing held (shouldn't happen).
 */
function buildTagline(rs: RunState, element: ShipElement): string {
  const adj = ELEMENT_ADJECTIVES[element];
  const topWeapon = rs.weapons[0];
  const topPassive = rs.passives[0];
  const wName = topWeapon ? WEAPON_DEFS[topWeapon.id]?.displayName ?? topWeapon.id : null;
  const pName = topPassive ? PASSIVE_DEFS[topPassive.id]?.displayName ?? topPassive.id : null;
  if (wName && pName) return `A ${adj} ${wName} / ${pName} build.`;
  if (wName) return `A ${adj} ${wName} run.`;
  return `A ${adj} voyage.`;
}
