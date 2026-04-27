import Phaser from 'phaser';
import { RunState } from '../run-state';
import type { StageScene } from './stage-scene';
import type { CombatLogEntry } from '../systems/combat-log';
import { WEAPON_DEFS } from '../weapons/weapon-catalog';
import { PASSIVE_DEFS } from '../weapons/passive-catalog';
import { prettyName } from './util/pretty-name';
import { HUD_DECK_HEIGHT } from '../constants';

/**
 * Overlay HUD: HP planks, XP bar, coin counter, level, plus a wooden ship-deck
 * bottom-bar that holds the weapon/passive/stat readouts and a chronological
 * combat-event log (PRD 11). Rendered in a separate scene running on top of
 * StageScene so it survives scene pauses and doesn't scale with any future
 * world camera.
 */
export class HudScene extends Phaser.Scene {
  static readonly KEY = 'HudScene';

  /** Bottom wooden HUD occupies the lower 216 px (20% of 1080). */
  private static readonly DECK_H = HUD_DECK_HEIGHT;
  private static readonly DECK_DEPTH = 1100;
  private static readonly LOG_LINES = 8;
  /** Tab strip height inside the deck; rest is the active tab body. */
  private static readonly TAB_STRIP_H = 28;

  private runState!: RunState;

  private hpPlanks!: Phaser.GameObjects.Graphics;
  private xpBarBg!: Phaser.GameObjects.Graphics;
  private xpBarFill!: Phaser.GameObjects.Graphics;
  private coinText!: Phaser.GameObjects.Text;
  private gemText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;

  /** Active tab on the left half of the deck. */
  private activeTab: 'properties' | 'loadout' = 'properties';
  private tabPropsBtn!: Phaser.GameObjects.Text;
  private tabLoadoutBtn!: Phaser.GameObjects.Text;
  private tabUnderline!: Phaser.GameObjects.Graphics;

  /** Properties tab — text nodes pooled by line. */
  private propsLines: Phaser.GameObjects.Text[] = [];
  private propsHpBar!: Phaser.GameObjects.Graphics;
  private propsXpBar!: Phaser.GameObjects.Graphics;

  /** Loadout tab — visual icon grid. */
  private loadoutSlots: Array<{
    bg: Phaser.GameObjects.Graphics;
    icon: Phaser.GameObjects.Image;
    fallback: Phaser.GameObjects.Text;
    name: Phaser.GameObjects.Text;
    pips: Phaser.GameObjects.Text;
    role: 'weapon' | 'passive';
  }> = [];
  private loadoutHeaderWeapons!: Phaser.GameObjects.Text;
  private loadoutHeaderPassives!: Phaser.GameObjects.Text;

  private logText!: Phaser.GameObjects.Text;
  private logUnsubscribe: (() => void) | null = null;
  /** Lifetime kill count for the stats panel (combatLog buffer caps at 200). */
  private killCount = 0;

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

    // Wooden ship-deck bottom bar (PRD 11).
    this.buildDeck();

    this.buildStreakOverlay();

    // Wire up RunState subscriptions.
    this.runState.onRun('hp-changed', () => { this.redrawHp(); this.redrawProperties(); });
    this.runState.onRun('xp-changed', () => {
      this.redrawXp();
      this.levelText.setText(`Lvl ${this.runState.level}`);
      this.redrawProperties();
    });
    this.runState.onRun('level-up', (e) => {
      this.levelText.setText(`Lvl ${this.runState.level}`);
      this.flashLevel();
      this.redrawProperties();
      const stage = this.scene.get('StageScene') as StageScene | undefined;
      stage?.combatLog?.push({ kind: 'levelup', time: Date.now(), level: e.newLevel });
    });
    this.runState.onRun('coins-changed', (e) => {
      this.coinText.setText(`🪙 ${e.total}`);
      this.redrawProperties();
    });
    this.runState.onRun('gems-changed', (e) => {
      this.gemText.setText(`💎 ${e.total}`);
      this.redrawProperties();
    });
    this.runState.onRun('weapon-gained', () => this.redrawLoadout());
    this.runState.onRun('weapon-leveled', () => this.redrawLoadout());
    this.runState.onRun('passive-gained', () => this.redrawLoadout());
    this.runState.onRun('passive-leveled', () => this.redrawLoadout());

    this.redrawProperties();
    this.redrawLoadout();

    this.attachLog();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.logUnsubscribe) this.logUnsubscribe();
      this.logUnsubscribe = null;
    });
  }

  /* ---------- Wooden deck bottom-bar ---------- */

  private buildDeck(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const deckY = H - HudScene.DECK_H;
    const halfX = W / 2;
    const leftX = 20;
    const tabY = deckY + 6;
    const bodyY = deckY + HudScene.TAB_STRIP_H;

    const g = this.add.graphics();
    g.setDepth(HudScene.DECK_DEPTH);
    this.paintDeck(g, deckY, W, HudScene.DECK_H);

    // Tab strip — two interactive labels at the top of the left half.
    const tabStyle = {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '15px',
      fontStyle: 'bold',
    } as const;
    this.tabPropsBtn = this.add.text(leftX, tabY, 'PROPERTIES', tabStyle)
      .setDepth(HudScene.DECK_DEPTH + 2)
      .setInteractive({ useHandCursor: true });
    this.tabLoadoutBtn = this.add.text(leftX + 140, tabY, 'LOADOUT', tabStyle)
      .setDepth(HudScene.DECK_DEPTH + 2)
      .setInteractive({ useHandCursor: true });
    this.tabPropsBtn.on('pointerdown', () => this.setTab('properties'));
    this.tabLoadoutBtn.on('pointerdown', () => this.setTab('loadout'));

    this.tabUnderline = this.add.graphics().setDepth(HudScene.DECK_DEPTH + 2);

    this.buildPropertiesTab(leftX, bodyY, halfX - 32);
    this.buildLoadoutTab(leftX, bodyY, halfX - 32);

    // Right half — combat log.
    const rightX = halfX + 16;
    this.add.text(rightX, tabY, "SHIP'S LOG", {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#c79448',
    }).setDepth(HudScene.DECK_DEPTH + 1);

    this.logText = this.add.text(rightX, bodyY + 4, '', {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '14px',
      color: '#f1d9a8',
      lineSpacing: 4,
      wordWrap: { width: W / 2 - 32 },
    }).setDepth(HudScene.DECK_DEPTH + 2);

    this.applyTabStyles();
  }

  /** Properties tab — HP planks, XP bar, run stats stacked. */
  private buildPropertiesTab(leftX: number, bodyY: number, _bodyW: number): void {
    const labelStyle = {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '12px',
      color: '#a48560',
    } as const;
    const valStyle = {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '15px',
      color: '#f5e6c0',
      fontStyle: 'bold',
    } as const;

    // Row 1 — HP label + plank bar.
    const hpLabel = this.add.text(leftX, bodyY + 4, 'HP', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.propsHpBar = this.add.graphics({ x: leftX + 36, y: bodyY + 6 }).setDepth(HudScene.DECK_DEPTH + 2);
    const hpVal = this.add.text(leftX, bodyY + 4, '', valStyle).setDepth(HudScene.DECK_DEPTH + 2);
    hpVal.setOrigin(1, 0).setPosition(leftX + 760, bodyY + 4);

    // Row 2 — Level + XP bar.
    const lvLabel = this.add.text(leftX, bodyY + 38, 'LEVEL', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    const lvVal = this.add.text(leftX + 50, bodyY + 36, '', valStyle).setDepth(HudScene.DECK_DEPTH + 2);
    this.propsXpBar = this.add.graphics({ x: leftX + 90, y: bodyY + 42 }).setDepth(HudScene.DECK_DEPTH + 2);
    const xpVal = this.add.text(leftX, bodyY + 36, '', valStyle).setDepth(HudScene.DECK_DEPTH + 2);
    xpVal.setOrigin(1, 0).setPosition(leftX + 760, bodyY + 36);

    // Row 3 — coins / gems / kills.
    const coinsLabel = this.add.text(leftX, bodyY + 76, 'COINS', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    const coinsVal = this.add.text(leftX + 60, bodyY + 74, '', valStyle).setDepth(HudScene.DECK_DEPTH + 2);
    const gemsLabel = this.add.text(leftX + 200, bodyY + 76, 'GEMS', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    const gemsVal = this.add.text(leftX + 250, bodyY + 74, '', valStyle).setDepth(HudScene.DECK_DEPTH + 2);
    const killsLabel = this.add.text(leftX + 400, bodyY + 76, 'KILLS', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    const killsVal = this.add.text(leftX + 450, bodyY + 74, '', valStyle).setDepth(HudScene.DECK_DEPTH + 2);

    // Row 4 — base damage / crit chance.
    const dmgLabel = this.add.text(leftX, bodyY + 110, 'BASE DMG', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    const dmgVal = this.add.text(leftX + 80, bodyY + 108, '', valStyle).setDepth(HudScene.DECK_DEPTH + 2);
    const critLabel = this.add.text(leftX + 200, bodyY + 110, 'CRIT', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    const critVal = this.add.text(leftX + 250, bodyY + 108, '', valStyle).setDepth(HudScene.DECK_DEPTH + 2);
    const magnetLabel = this.add.text(leftX + 400, bodyY + 110, 'MAGNET', labelStyle).setDepth(HudScene.DECK_DEPTH + 2);
    const magnetVal = this.add.text(leftX + 470, bodyY + 108, '', valStyle).setDepth(HudScene.DECK_DEPTH + 2);

    // Order matches redrawProperties() value setters.
    this.propsLines = [
      hpLabel, hpVal,
      lvLabel, lvVal, xpVal,
      coinsLabel, coinsVal, gemsLabel, gemsVal, killsLabel, killsVal,
      dmgLabel, dmgVal, critLabel, critVal, magnetLabel, magnetVal,
    ];
    // Indices used by redrawProperties (kept stable):
    // 1=hpVal  4=lvVal  6=coinsVal  8=gemsVal  10=killsVal  12=dmgVal  14=critVal  16=magnetVal
  }

  /** Loadout tab — 6 weapon icon slots + 6 passive icon slots. */
  private buildLoadoutTab(leftX: number, bodyY: number, bodyW: number): void {
    const headerStyle = {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '12px',
      color: '#c79448',
      fontStyle: 'bold',
    } as const;
    this.loadoutHeaderWeapons = this.add.text(leftX, bodyY + 4, 'WEAPONS', headerStyle)
      .setDepth(HudScene.DECK_DEPTH + 2);
    this.loadoutHeaderPassives = this.add.text(leftX, bodyY + 86, 'PASSIVES', headerStyle)
      .setDepth(HudScene.DECK_DEPTH + 2);

    const slotW = 56;
    const slotH = 56;
    const gap = 8;
    const cols = RunState.MAX_WEAPONS;
    const stride = (bodyW - 8) / cols;

    // Weapon row.
    for (let i = 0; i < cols; i++) {
      this.loadoutSlots.push(this.makeLoadoutSlot(
        leftX + i * stride, bodyY + 22, slotW, slotH, 'weapon',
      ));
    }
    // Passive row.
    for (let i = 0; i < RunState.MAX_PASSIVES; i++) {
      this.loadoutSlots.push(this.makeLoadoutSlot(
        leftX + i * stride, bodyY + 104, slotW, slotH, 'passive',
      ));
    }
    void gap;
  }

  private makeLoadoutSlot(
    x: number, y: number, w: number, h: number, role: 'weapon' | 'passive',
  ): HudScene['loadoutSlots'][number] {
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1810, 0.7).fillRoundedRect(x, y, w, h, 6);
    bg.lineStyle(1.5, role === 'weapon' ? 0xc79448 : 0x5ac8e8, 0.4).strokeRoundedRect(x, y, w, h, 6);
    bg.setDepth(HudScene.DECK_DEPTH + 2);

    const icon = this.add.image(x + w / 2, y + h / 2 - 4, '');
    icon.setDisplaySize(36, 36).setDepth(HudScene.DECK_DEPTH + 3).setVisible(false);

    // Fallback colored dot when no sprite is loaded.
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

  private setTab(tab: 'properties' | 'loadout'): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.applyTabStyles();
  }

  /** Update tab button colors + show/hide each tab body. */
  private applyTabStyles(): void {
    const active = '#e0b063';
    const inactive = '#6a4f30';
    this.tabPropsBtn.setColor(this.activeTab === 'properties' ? active : inactive);
    this.tabLoadoutBtn.setColor(this.activeTab === 'loadout' ? active : inactive);

    // Underline under the active tab.
    const lineY = this.tabPropsBtn.y + this.tabPropsBtn.height + 1;
    const target = this.activeTab === 'properties' ? this.tabPropsBtn : this.tabLoadoutBtn;
    this.tabUnderline.clear();
    this.tabUnderline.fillStyle(0xc79448, 1);
    this.tabUnderline.fillRect(target.x, lineY, target.width, 2);

    const showProps = this.activeTab === 'properties';
    for (const t of this.propsLines) t.setVisible(showProps);
    this.propsHpBar.setVisible(showProps);
    this.propsXpBar.setVisible(showProps);

    const showLoadout = !showProps;
    this.loadoutHeaderWeapons.setVisible(showLoadout);
    this.loadoutHeaderPassives.setVisible(showLoadout);
    for (const slot of this.loadoutSlots) {
      slot.bg.setVisible(showLoadout);
      slot.name.setVisible(showLoadout);
      slot.pips.setVisible(showLoadout);
      // Icon + fallback get re-visible'd by redrawLoadout based on data.
      if (!showLoadout) {
        slot.icon.setVisible(false);
        slot.fallback.setVisible(false);
      }
    }
    if (showLoadout) this.redrawLoadout();
  }

  /**
   * Painted wooden gunwale — 4 horizontal planks with vertical seams every
   * 320 px, an iron band between every plank, and brass corner caps. Pure
   * Graphics primitives so the bar can repaint at any DPR without atlas churn.
   * Complexity: O(W / seam) ≈ constant (~6 seams). Drawn once.
   */
  private paintDeck(g: Phaser.GameObjects.Graphics, y0: number, W: number, H: number): void {
    const planks = 4;
    const plankH = H / planks;
    const woodTones = [0x6e4528, 0x7a4f30, 0x6a4226, 0x583620];
    for (let i = 0; i < planks; i++) {
      g.fillStyle(woodTones[i] ?? 0x6a4226, 1);
      g.fillRect(0, y0 + i * plankH, W, plankH);
      // Highlight band along the top edge of each plank.
      g.fillStyle(0xb38258, 0.18);
      g.fillRect(0, y0 + i * plankH, W, 2);
      // Vertical grain seams every 320 px.
      g.fillStyle(0x000000, 0.18);
      for (let x = 320; x < W; x += 320) {
        g.fillRect(x, y0 + i * plankH + 4, 1, plankH - 8);
      }
      // Iron band — dark stroke between this plank and the next.
      if (i < planks - 1) {
        g.fillStyle(0x1a1410, 1);
        g.fillRect(0, y0 + (i + 1) * plankH - 1, W, 2);
        g.fillStyle(0x4a3a30, 0.6);
        g.fillRect(0, y0 + (i + 1) * plankH + 1, W, 1);
      }
    }
    // Top edge of the deck — heavy iron strake.
    g.fillStyle(0x1a1410, 1);
    g.fillRect(0, y0, W, 3);
    g.fillStyle(0xc79448, 0.55);
    g.fillRect(0, y0 + 3, W, 1);

    // Brass corner caps — small triangles in each corner of the deck rect.
    const cap = 18;
    g.fillStyle(0xc79448, 1);
    // Top-left.
    g.fillTriangle(0, y0, cap, y0, 0, y0 + cap);
    // Top-right.
    g.fillTriangle(W, y0, W - cap, y0, W, y0 + cap);
    // Bottom-left.
    g.fillTriangle(0, y0 + H, cap, y0 + H, 0, y0 + H - cap);
    // Bottom-right.
    g.fillTriangle(W, y0 + H, W - cap, y0 + H, W, y0 + H - cap);

    // Center-left/right vertical divider between weapons + passives + log columns.
    g.fillStyle(0x1a1410, 0.7);
    g.fillRect(W / 2 - 1, y0 + 6, 2, H - 12);
    g.fillStyle(0x1a1410, 0.4);
    g.fillRect(360 + 16, y0 + 22, 1, H - 44);
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
    if (this.activeTab !== 'loadout') return;
    const ws = this.runState.weapons;
    const ps = this.runState.passives;

    for (let i = 0; i < this.loadoutSlots.length; i++) {
      const slot = this.loadoutSlots[i]!;
      const isWeapon = slot.role === 'weapon';
      const idx = isWeapon ? i : i - RunState.MAX_WEAPONS;
      const entry = isWeapon ? ws[idx] : ps[idx];
      if (!entry) {
        slot.icon.setVisible(false);
        slot.fallback.setText('');
        slot.fallback.setVisible(true);
        slot.fallback.setColor(isWeapon ? '#3b2410' : '#1a3a44');
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
        slot.fallback.setVisible(true);
        slot.fallback.setText(name.charAt(0).toUpperCase());
        slot.fallback.setColor(isWeapon ? '#e0b063' : '#5ac8e8');
      }
      slot.name.setText(name.length > 10 ? name.slice(0, 9) + '…' : name);
      slot.pips.setText(this.pips(entry.level));
    }
  }

  /** Visual level pips: ●●●○○ for level 3. */
  private pips(level: number): string {
    return '●'.repeat(level) + '○'.repeat(Math.max(0, 5 - level));
  }

  /** Properties tab — repaints HP planks + stat values + XP bar in place. */
  private redrawProperties(): void {
    if (this.activeTab !== 'properties') return;
    const rs = this.runState;

    // HP plank bar at row 1.
    this.propsHpBar.clear();
    const plankW = 22, plankH = 16, gap = 3;
    for (let i = 0; i < rs.maxHp; i++) {
      const color = i < rs.hp ? 0xc79448 : 0x3b2a20;
      this.propsHpBar.fillStyle(color, 1).fillRoundedRect(i * (plankW + gap), 0, plankW, plankH, 3);
    }
    (this.propsLines[1] as Phaser.GameObjects.Text).setText(`${rs.hp} / ${rs.maxHp}`);

    // Level + XP bar.
    (this.propsLines[3] as Phaser.GameObjects.Text).setText(`${rs.level}`);
    this.propsXpBar.clear();
    const xpFrac = Math.min(1, rs.xp / Math.max(1, rs.xpToNext()));
    this.propsXpBar.fillStyle(0x0a2a3a, 1).fillRoundedRect(0, 0, 240, 8, 4);
    this.propsXpBar.fillStyle(0x3393ac, 1).fillRoundedRect(0, 0, 240 * xpFrac, 8, 4);
    (this.propsLines[4] as Phaser.GameObjects.Text).setText(`${rs.xp} / ${rs.xpToNext()} XP`);

    // Coins / gems / kills.
    (this.propsLines[6] as Phaser.GameObjects.Text).setText(`${rs.coins}`);
    (this.propsLines[8] as Phaser.GameObjects.Text).setText(`${rs.gems}`);
    (this.propsLines[10] as Phaser.GameObjects.Text).setText(`${this.killCount}`);

    // Combat stats.
    (this.propsLines[12] as Phaser.GameObjects.Text).setText(`${rs.baseDamage}`);
    const critPct = Math.round(rs.critChance * 100);
    (this.propsLines[14] as Phaser.GameObjects.Text).setText(`${critPct}%`);
    (this.propsLines[16] as Phaser.GameObjects.Text).setText(`${Math.round(rs.magnetRadius)}`);
  }

  /* ---------- Combat log feed ---------- */

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
      this.redrawProperties();
    });
    this.redrawLog();
  }

  /**
   * Render the last LOG_LINES entries chronologically (oldest at top, newest
   * at the bottom — chat-style). Driven by combatLog.onPush, not the tick.
   */
  private redrawLog(): void {
    const stage = this.scene.get('StageScene') as StageScene | undefined;
    const log = stage?.combatLog;
    if (!log) return;
    const entries = log.latest(HudScene.LOG_LINES).slice().reverse();
    const startMs = stage?.stageStartMs ?? Date.now();
    const lines: string[] = [];
    for (const e of entries) {
      lines.push(this.formatLog(e, startMs));
    }
    while (lines.length < HudScene.LOG_LINES) lines.unshift('');
    this.logText.setText(lines.join('\n'));
  }

  private formatLog(e: CombatLogEntry, startMs: number): string {
    const sec = Math.max(0, Math.floor((e.time - startMs) / 1000));
    const mm = Math.floor(sec / 60).toString().padStart(2, '0');
    const ss = (sec % 60).toString().padStart(2, '0');
    const ts = `[${mm}:${ss}]`;
    switch (e.kind) {
      case 'dealt':
        return `${ts} ${e.isCrit ? 'Crit! ' : ''}${Math.round(e.amount)} → ${prettyName(e.target)}${e.kill ? ' ✝' : ''}`;
      case 'taken':
        return `${ts} ${Math.round(e.amount)} dmg from ${prettyName(e.source)}`;
      case 'kill':
        return `${ts} Slain: ${prettyName(e.target)} (+${e.xp} XP)`;
      case 'dot':
        return `${ts} ${e.status} +${Math.round(e.amount)} → ${prettyName(e.target)}`;
      case 'status':
        return `${ts} ${e.status} ${e.added ? 'on' : '↑'} ${prettyName(e.target)}`;
      case 'reaction':
        return `${ts} Reaction ${e.reaction} → ${prettyName(e.target)}`;
      case 'pickup': {
        const sym = e.pickup === 'coin' ? '◎' : e.pickup === 'gem' ? '◆' : 'XP';
        return `${ts} +${e.amount} ${sym}`;
      }
      case 'levelup':
        return `${ts} LEVEL UP — Lv ${e.level}`;
    }
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
