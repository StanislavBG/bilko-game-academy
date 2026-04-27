import Phaser from 'phaser';
import { RunState } from '../run-state';
import type { StageScene } from './stage-scene';
import type { CombatLogEntry } from '../systems/combat-log';
import { WEAPON_DEFS } from '../weapons/weapon-catalog';
import { PASSIVE_DEFS } from '../weapons/passive-catalog';
import { prettyName } from './util/pretty-name';
import { HUD_DECK_HEIGHT } from '../constants';

/**
 * HUD — wooden ship-deck control board across the bottom 216 px.
 *
 * Three always-visible panels, no tabs, no overlays on the play area:
 *   ┌─── LOADOUT ───────┬─── SHIP ───────┬─── SHIP'S LOG ───┐
 *   │ weapons + passives │ HP/XP/coins... │ chronological log │
 *   └────────────────────┴────────────────┴────────────────────┘
 *
 * The play-area clamp keeps the player above the deck (see stage-scene
 * `clampToPlayArea`). Streak overlays (kill/crit chains) are transient
 * combat feedback drawn in the play area, not part of the HUD chrome.
 */
export class HudScene extends Phaser.Scene {
  static readonly KEY = 'HudScene';

  private static readonly DECK_H = HUD_DECK_HEIGHT;
  private static readonly DECK_DEPTH = 1100;
  private static readonly LOG_LINES = 9;

  /** Column boundaries in world coords (1920 wide). */
  private static readonly COL1_X = 0;     // LOADOUT start
  private static readonly COL2_X = 760;   // SHIP start
  private static readonly COL3_X = 1180;  // LOG start
  private static readonly COL_END = 1920;

  /** Panel header strip height inside the deck. */
  private static readonly HEADER_H = 26;

  private runState!: RunState;

  /* LOADOUT panel */
  private loadoutSlots: Array<{
    bg: Phaser.GameObjects.Graphics;
    icon: Phaser.GameObjects.Image;
    fallback: Phaser.GameObjects.Text;
    name: Phaser.GameObjects.Text;
    pips: Phaser.GameObjects.Text;
    role: 'weapon' | 'passive';
  }> = [];

  /* SHIP panel */
  private shipHpBar!: Phaser.GameObjects.Graphics;
  private shipHpVal!: Phaser.GameObjects.Text;
  private shipLevelVal!: Phaser.GameObjects.Text;
  private shipXpBar!: Phaser.GameObjects.Graphics;
  private shipXpVal!: Phaser.GameObjects.Text;
  private shipCoinsVal!: Phaser.GameObjects.Text;
  private shipGemsVal!: Phaser.GameObjects.Text;
  private shipKillsVal!: Phaser.GameObjects.Text;
  private shipDmgVal!: Phaser.GameObjects.Text;
  private shipCritVal!: Phaser.GameObjects.Text;
  private shipMagnetVal!: Phaser.GameObjects.Text;

  /* LOG panel */
  private logText!: Phaser.GameObjects.Text;
  private logUnsubscribe: (() => void) | null = null;

  /** Lifetime kill count for the SHIP panel (combatLog buffer caps at 200). */
  private killCount = 0;

  constructor() {
    super({ key: HudScene.KEY });
  }

  init(data: { runState: RunState }): void {
    this.runState = data.runState;
  }

  create(): void {
    this.buildDeck();
    this.buildStreakOverlay();

    this.runState.onRun('hp-changed',     () => this.redrawShip());
    this.runState.onRun('xp-changed',     () => this.redrawShip());
    this.runState.onRun('level-up',       (e) => {
      this.redrawShip();
      this.flashLevel();
      const stage = this.scene.get('StageScene') as StageScene | undefined;
      stage?.combatLog?.push({ kind: 'levelup', time: Date.now(), level: e.newLevel });
    });
    this.runState.onRun('coins-changed', () => this.redrawShip());
    this.runState.onRun('gems-changed',  () => this.redrawShip());
    this.runState.onRun('weapon-gained',  () => this.redrawLoadout());
    this.runState.onRun('weapon-leveled', () => this.redrawLoadout());
    this.runState.onRun('passive-gained', () => this.redrawLoadout());
    this.runState.onRun('passive-leveled',() => this.redrawLoadout());

    this.redrawShip();
    this.redrawLoadout();

    this.attachLog();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.logUnsubscribe) this.logUnsubscribe();
      this.logUnsubscribe = null;
    });
  }

  /* ───────────────────────── DECK ───────────────────────── */

  private buildDeck(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const deckY = H - HudScene.DECK_H;

    const g = this.add.graphics();
    g.setDepth(HudScene.DECK_DEPTH);
    this.paintDeck(g, deckY, W, HudScene.DECK_H);

    // Build each panel — header + body within column bounds.
    this.buildPanelHeader('LOADOUT',    HudScene.COL1_X, HudScene.COL2_X, deckY);
    this.buildPanelHeader('SHIP',       HudScene.COL2_X, HudScene.COL3_X, deckY);
    this.buildPanelHeader("SHIP'S LOG", HudScene.COL3_X, HudScene.COL_END, deckY);

    const bodyY = deckY + HudScene.HEADER_H + 6;
    this.buildLoadoutPanel(HudScene.COL1_X + 14, bodyY, HudScene.COL2_X - HudScene.COL1_X - 28);
    this.buildShipPanel(HudScene.COL2_X + 14, bodyY, HudScene.COL3_X - HudScene.COL2_X - 28);
    this.buildLogPanel(HudScene.COL3_X + 14, bodyY, HudScene.COL_END - HudScene.COL3_X - 28);
  }

  /** Painted wood + brass + dividers. Drawn once on create(). */
  private paintDeck(g: Phaser.GameObjects.Graphics, y0: number, W: number, H: number): void {
    const planks = 4;
    const plankH = H / planks;
    const woodTones = [0x6e4528, 0x7a4f30, 0x6a4226, 0x583620];
    for (let i = 0; i < planks; i++) {
      g.fillStyle(woodTones[i] ?? 0x6a4226, 1);
      g.fillRect(0, y0 + i * plankH, W, plankH);
      g.fillStyle(0xb38258, 0.18);
      g.fillRect(0, y0 + i * plankH, W, 2);
      g.fillStyle(0x000000, 0.18);
      for (let x = 320; x < W; x += 320) {
        g.fillRect(x, y0 + i * plankH + 4, 1, plankH - 8);
      }
      if (i < planks - 1) {
        g.fillStyle(0x1a1410, 1);
        g.fillRect(0, y0 + (i + 1) * plankH - 1, W, 2);
        g.fillStyle(0x4a3a30, 0.6);
        g.fillRect(0, y0 + (i + 1) * plankH + 1, W, 1);
      }
    }
    // Top edge — heavy iron strake.
    g.fillStyle(0x1a1410, 1);
    g.fillRect(0, y0, W, 3);
    g.fillStyle(0xc79448, 0.55);
    g.fillRect(0, y0 + 3, W, 1);

    // Brass corner caps.
    const cap = 18;
    g.fillStyle(0xc79448, 1);
    g.fillTriangle(0, y0, cap, y0, 0, y0 + cap);
    g.fillTriangle(W, y0, W - cap, y0, W, y0 + cap);
    g.fillTriangle(0, y0 + H, cap, y0 + H, 0, y0 + H - cap);
    g.fillTriangle(W, y0 + H, W - cap, y0 + H, W, y0 + H - cap);

    // Vertical dividers at panel boundaries — iron strake + brass highlight.
    for (const x of [HudScene.COL2_X, HudScene.COL3_X]) {
      g.fillStyle(0x1a1410, 0.95);
      g.fillRect(x - 1, y0 + 6, 2, H - 12);
      g.fillStyle(0xc79448, 0.35);
      g.fillRect(x + 1, y0 + 6, 1, H - 12);
    }
  }

  /** Brass-tagged panel header — placed in the first 26 px of each column. */
  private buildPanelHeader(label: string, x0: number, x1: number, deckY: number): void {
    const g = this.add.graphics();
    g.setDepth(HudScene.DECK_DEPTH + 1);
    // Subtle ribbon under the header text.
    g.fillStyle(0x1a1410, 0.4);
    g.fillRect(x0 + 8, deckY + 2, x1 - x0 - 16, 3);
    g.fillStyle(0xc79448, 0.7);
    g.fillRect(x0 + 8, deckY + 5, x1 - x0 - 16, 1);

    this.add.text(x0 + 14, deckY + 6, label, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#f0c97a',
      stroke: '#1a1410',
      strokeThickness: 1,
    }).setDepth(HudScene.DECK_DEPTH + 2);
  }

  /* ───────────────────── LOADOUT ───────────────────── */

  private buildLoadoutPanel(x: number, y: number, w: number): void {
    const subStyle = {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '11px',
      color: '#a48560',
      fontStyle: 'bold',
    } as const;
    this.add.text(x, y, 'WEAPONS', subStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.add.text(x, y + 84, 'PASSIVES', subStyle).setDepth(HudScene.DECK_DEPTH + 2);

    const slotW = 56;
    const slotH = 56;
    const cols = RunState.MAX_WEAPONS;
    const stride = (w - 2) / cols;

    for (let i = 0; i < cols; i++) {
      this.loadoutSlots.push(this.makeLoadoutSlot(x + i * stride, y + 16, slotW, slotH, 'weapon'));
    }
    for (let i = 0; i < RunState.MAX_PASSIVES; i++) {
      this.loadoutSlots.push(this.makeLoadoutSlot(x + i * stride, y + 100, slotW, slotH, 'passive'));
    }
  }

  private makeLoadoutSlot(
    x: number, y: number, w: number, h: number, role: 'weapon' | 'passive',
  ): HudScene['loadoutSlots'][number] {
    const accent = role === 'weapon' ? 0xc79448 : 0x5ac8e8;
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1810, 0.7).fillRoundedRect(x, y, w, h, 6);
    bg.lineStyle(1.5, accent, 0.35).strokeRoundedRect(x, y, w, h, 6);
    bg.setDepth(HudScene.DECK_DEPTH + 2);

    const icon = this.add.image(x + w / 2, y + h / 2 - 4, '');
    icon.setDisplaySize(36, 36).setDepth(HudScene.DECK_DEPTH + 3).setVisible(false);

    const fallback = this.add.text(x + w / 2, y + h / 2 - 6, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '20px',
      color: role === 'weapon' ? '#e0b063' : '#5ac8e8',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(HudScene.DECK_DEPTH + 3);

    const name = this.add.text(x + w / 2, y + h - 16, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '9px',
      color: '#f5e6c0',
    }).setOrigin(0.5, 0.5).setDepth(HudScene.DECK_DEPTH + 3);

    const pips = this.add.text(x + w / 2, y + h - 4, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '8px',
      color: '#c79448',
    }).setOrigin(0.5, 1).setDepth(HudScene.DECK_DEPTH + 3);

    return { bg, icon, fallback, name, pips, role };
  }

  private redrawLoadout(): void {
    const ws = this.runState.weapons;
    const ps = this.runState.passives;
    for (let i = 0; i < this.loadoutSlots.length; i++) {
      const slot = this.loadoutSlots[i]!;
      const isWeapon = slot.role === 'weapon';
      const idx = isWeapon ? i : i - RunState.MAX_WEAPONS;
      const entry = isWeapon ? ws[idx] : ps[idx];
      if (!entry) {
        slot.icon.setVisible(false);
        slot.fallback.setText('').setVisible(true).setColor(isWeapon ? '#3b2410' : '#1a3a44');
        slot.name.setText('');
        slot.pips.setText('');
        continue;
      }
      const def = isWeapon ? WEAPON_DEFS[entry.id] : PASSIVE_DEFS[entry.id];
      const name = def?.displayName ?? prettyName(entry.id);
      const iconKey = `sprite-icon-${entry.id}`;
      if (this.textures.exists(iconKey)) {
        slot.icon.setTexture(iconKey).setVisible(true);
        slot.fallback.setVisible(false);
      } else {
        slot.icon.setVisible(false);
        slot.fallback.setVisible(true)
          .setText(name.charAt(0).toUpperCase())
          .setColor(isWeapon ? '#e0b063' : '#5ac8e8');
      }
      slot.name.setText(name.length > 10 ? name.slice(0, 9) + '…' : name);
      slot.pips.setText('●'.repeat(entry.level) + '○'.repeat(Math.max(0, 5 - entry.level)));
    }
  }

  /* ───────────────────── SHIP ───────────────────── */

  private buildShipPanel(x: number, y: number, w: number): void {
    const labelStyle = {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '10px',
      color: '#a48560',
    } as const;
    const valStyle = {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      color: '#f5e6c0',
      fontStyle: 'bold',
    } as const;
    const numStyle = {
      ...valStyle,
      fontSize: '15px',
    } as const;

    // Row 1 — HP plank bar + numeric value.
    this.add.text(x, y, 'HP', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.shipHpBar = this.add.graphics({ x: x + 24, y: y + 1 }).setDepth(HudScene.DECK_DEPTH + 2);
    this.shipHpVal = this.add.text(x + w, y, '', valStyle)
      .setOrigin(1, 0).setDepth(HudScene.DECK_DEPTH + 2);

    // Row 2 — LEVEL big + XP bar with current/next.
    this.add.text(x, y + 28, 'LV', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.shipLevelVal = this.add.text(x + 22, y + 22, '1', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '22px',
      color: '#f0c97a',
      fontStyle: 'bold',
    }).setDepth(HudScene.DECK_DEPTH + 2);
    this.shipXpBar = this.add.graphics({ x: x + 60, y: y + 36 }).setDepth(HudScene.DECK_DEPTH + 2);
    this.shipXpVal = this.add.text(x + w, y + 30, '', {
      ...valStyle, fontSize: '11px', color: '#cce4ea',
    }).setOrigin(1, 0).setDepth(HudScene.DECK_DEPTH + 2);

    // Row 3 — Coins · Gems · Kills (3 cells across the panel width).
    const cellW = w / 3;
    const r3 = y + 64;
    this.add.text(x + cellW * 0, r3, 'COINS', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.shipCoinsVal = this.add.text(x + cellW * 0, r3 + 12, '0', numStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.add.text(x + cellW * 1, r3, 'GEMS', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.shipGemsVal = this.add.text(x + cellW * 1, r3 + 12, '0', numStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.add.text(x + cellW * 2, r3, 'KILLS', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.shipKillsVal = this.add.text(x + cellW * 2, r3 + 12, '0', numStyle).setDepth(HudScene.DECK_DEPTH + 2);

    // Row 4 — DMG · CRIT · MAGNET.
    const r4 = y + 104;
    this.add.text(x + cellW * 0, r4, 'DMG', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.shipDmgVal = this.add.text(x + cellW * 0, r4 + 12, '1', numStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.add.text(x + cellW * 1, r4, 'CRIT', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.shipCritVal = this.add.text(x + cellW * 1, r4 + 12, '0%', numStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.add.text(x + cellW * 2, r4, 'MAGNET', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.shipMagnetVal = this.add.text(x + cellW * 2, r4 + 12, '0', numStyle).setDepth(HudScene.DECK_DEPTH + 2);
  }

  private redrawShip(): void {
    const rs = this.runState;

    // HP planks.
    this.shipHpBar.clear();
    const plankW = 14, plankH = 14, gap = 3;
    for (let i = 0; i < rs.maxHp; i++) {
      const color = i < rs.hp ? 0xc79448 : 0x3b2a20;
      this.shipHpBar.fillStyle(color, 1).fillRoundedRect(i * (plankW + gap), 0, plankW, plankH, 3);
    }
    this.shipHpVal.setText(`${rs.hp} / ${rs.maxHp}`);

    // Level + XP.
    this.shipLevelVal.setText(`${rs.level}`);
    const xpFrac = Math.min(1, rs.xp / Math.max(1, rs.xpToNext()));
    const xpW = 250;
    this.shipXpBar.clear();
    this.shipXpBar.fillStyle(0x0a2a3a, 1).fillRoundedRect(0, 0, xpW, 6, 3);
    this.shipXpBar.fillStyle(0x3393ac, 1).fillRoundedRect(0, 0, xpW * xpFrac, 6, 3);
    this.shipXpVal.setText(`${rs.xp}/${rs.xpToNext()} XP`);

    // Coins / gems / kills.
    this.shipCoinsVal.setText(`${rs.coins}`);
    this.shipGemsVal.setText(`${rs.gems}`);
    this.shipKillsVal.setText(`${this.killCount}`);

    // Combat stats.
    this.shipDmgVal.setText(`${rs.baseDamage}`);
    this.shipCritVal.setText(`${Math.round(rs.critChance * 100)}%`);
    this.shipMagnetVal.setText(`${Math.round(rs.magnetRadius)}`);
  }

  private flashLevel(): void {
    this.tweens.add({
      targets: this.shipLevelVal,
      scale: { from: 1, to: 1.4 },
      yoyo: true,
      duration: 250,
      ease: 'Cubic.Out',
    });
  }

  /* ───────────────────── LOG ───────────────────── */

  private buildLogPanel(x: number, y: number, w: number): void {
    this.logText = this.add.text(x, y, '', {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '13px',
      color: '#f1d9a8',
      lineSpacing: 4,
      wordWrap: { width: w },
    }).setDepth(HudScene.DECK_DEPTH + 2);
  }

  private attachLog(retries = 20): void {
    const stage = this.scene.get('StageScene') as StageScene | undefined;
    const log = stage?.combatLog;
    if (!log) {
      if (retries > 0) this.time.delayedCall(100, () => this.attachLog(retries - 1));
      return;
    }
    this.logUnsubscribe = log.onPush((e) => {
      if (e.kind === 'kill' || (e.kind === 'dealt' && e.kill)) {
        this.killCount += 1;
      }
      this.redrawLog();
      this.redrawShip();
    });
    this.redrawLog();
  }

  private redrawLog(): void {
    const stage = this.scene.get('StageScene') as StageScene | undefined;
    const log = stage?.combatLog;
    if (!log) return;
    const entries = log.latest(HudScene.LOG_LINES).slice().reverse();
    const startMs = stage?.stageStartMs ?? Date.now();
    const lines: string[] = [];
    for (const e of entries) lines.push(this.formatLog(e, startMs));
    while (lines.length < HudScene.LOG_LINES) lines.unshift('');
    this.logText.setText(lines.join('\n'));
  }

  private formatLog(e: CombatLogEntry, startMs: number): string {
    const sec = Math.max(0, Math.floor((e.time - startMs) / 1000));
    const mm = Math.floor(sec / 60).toString().padStart(2, '0');
    const ss = (sec % 60).toString().padStart(2, '0');
    const ts = `[${mm}:${ss}]`;
    switch (e.kind) {
      case 'dealt':    return `${ts} ${e.isCrit ? 'Crit! ' : ''}${Math.round(e.amount)} → ${prettyName(e.target)}${e.kill ? ' ✝' : ''}`;
      case 'taken':    return `${ts} ${Math.round(e.amount)} dmg from ${prettyName(e.source)}`;
      case 'kill':     return `${ts} Slain: ${prettyName(e.target)} (+${e.xp} XP)`;
      case 'dot':      return `${ts} ${e.status} +${Math.round(e.amount)} → ${prettyName(e.target)}`;
      case 'status':   return `${ts} ${e.status} ${e.added ? 'on' : '↑'} ${prettyName(e.target)}`;
      case 'reaction': return `${ts} Reaction ${e.reaction} → ${prettyName(e.target)}`;
      case 'pickup': {
        const sym = e.pickup === 'coin' ? '◎' : e.pickup === 'gem' ? '◆' : 'XP';
        return `${ts} +${e.amount} ${sym}`;
      }
      case 'levelup':  return `${ts} LEVEL UP — Lv ${e.level}`;
    }
  }

  /* ───────── Streak feedback (transient combat overlay) ───────── */

  private killStreakText?: Phaser.GameObjects.Text;
  private critStreakText?: Phaser.GameObjects.Text;
  private killEvents: number[] = [];
  private critEvents: number[] = [];
  private lastKillChainShown = 0;
  private lastCritChainShown = 0;
  private static readonly STREAK_WINDOW_MS = 2000;

  private buildStreakOverlay(): void {
    const baseY = 460;
    this.killStreakText = this.add.text(40, baseY, '', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '28px', color: '#ffd13a',
      stroke: '#000', strokeThickness: 4, fontStyle: 'bold',
    }).setDepth(1400).setAlpha(0);
    this.critStreakText = this.add.text(40, baseY + 36, '', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '22px', color: '#8ff0ff',
      stroke: '#000', strokeThickness: 3, fontStyle: 'bold',
    }).setDepth(1400).setAlpha(0);

    this.attachCombatLogStreaks();
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.evaluateStreaks() });
  }

  private attachCombatLogStreaks(retries = 20): void {
    const stage = this.scene.get('StageScene') as StageScene | undefined;
    const log = stage?.combatLog;
    if (!log) {
      if (retries > 0) this.time.delayedCall(100, () => this.attachCombatLogStreaks(retries - 1));
      return;
    }
    log.onPush((e) => {
      const now = Date.now();
      if (e.kind === 'kill' || (e.kind === 'dealt' && e.kill)) this.killEvents.push(now);
      if (e.kind === 'dealt' && e.isCrit) this.critEvents.push(now);
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
      const baseX = 40;
      t.x = baseX - 40;
      this.tweens.add({
        targets: t,
        x: baseX, alpha: 1,
        scale: { from: 1.2, to: 1 },
        duration: 260, ease: 'Back.out',
      });
    }
  }
}
