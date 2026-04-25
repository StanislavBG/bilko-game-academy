import Phaser from 'phaser';
import type { CombatLog, CombatLogEntry } from '../systems/combat-log';
import type { StageScene } from './stage-scene';
import { prettyName } from './util/pretty-name';

/**
 * Combat log overlay — bottom-right. Persistent, minimize-able.
 *
 * Expanded: 320 × 240 with filter pills + scrolling row list.
 * Collapsed: 200 × 28 pill with aggregated last-5-s summary.
 *
 * Subscribes to `StageScene.combatLog.onPush` and repaints incrementally.
 * A URL flag `?combatdebug=1` flips each row to the verbose multi-line
 * format — useful for debugging weapon + reaction interactions.
 */
export class CombatLogScene extends Phaser.Scene {
  static readonly KEY = 'CombatLogScene';

  private stageKey = 'StageScene';
  private log!: CombatLog;
  private unsubscribe: (() => void) | null = null;

  private panel!: Phaser.GameObjects.Container;
  private collapsedPill!: Phaser.GameObjects.Container;
  private rowsText!: Phaser.GameObjects.Text;
  private pillSummary!: Phaser.GameObjects.Text;
  private filterButtons: Record<FilterKey, Phaser.GameObjects.Text> = {} as Record<FilterKey, Phaser.GameObjects.Text>;

  private collapsed = false;
  /** Active filters — all on by default. */
  private filters: Record<FilterKey, boolean> = {
    damage: true,
    kill: true,
    dot: true,
    status: true,
    reaction: true,
  };

  /** Anchored bottom-right; panel origin is the top-left of the 320x240 box. */
  private static readonly PANEL_W = 320;
  private static readonly PANEL_H = 240;
  private static readonly PILL_W = 200;
  private static readonly PILL_H = 28;
  private static readonly MARGIN = 16;

  constructor() {
    super({ key: CombatLogScene.KEY });
  }

  init(data: { stageKey?: string }): void {
    this.stageKey = data.stageKey ?? 'StageScene';
  }

  create(): void {
    const stage = this.scene.get(this.stageKey) as StageScene | undefined;
    if (!stage || !stage.combatLog) {
      // Stage hasn't initialized yet — try once more on next frame.
      this.time.delayedCall(50, () => this.create());
      return;
    }
    this.log = stage.combatLog;

    this.buildPanel();
    this.buildCollapsedPill();
    this.layout();

    this.unsubscribe = this.log.onPush(() => this.repaintRows());
    this.repaintRows();
    this.repaintPillSummary();

    // Repaint pill summary every 1 s so the aggregate stays fresh
    // even when no new events land in the window.
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.repaintPillSummary() });

    // Keyboard shortcuts — delegate to local handler.
    this.input.keyboard?.on('keydown-B', () => this.toggle());
    this.input.keyboard?.on('keydown-L', () => this.toggle());

    // Cleanup on scene shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.unsubscribe) this.unsubscribe();
      this.unsubscribe = null;
    });
  }

  private buildPanel(): void {
    const W = CombatLogScene.PANEL_W;
    const H = CombatLogScene.PANEL_H;
    const c = this.add.container(0, 0);
    c.setDepth(1400);

    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0, 0);
    bg.setStrokeStyle(1, 0xc79448, 0.6);
    c.add(bg);

    // Header — title + chevron collapse button.
    const title = this.add.text(8, 6, 'COMBAT LOG', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '14px',
      color: '#e0b063',
    });
    c.add(title);

    const chevron = this.add.text(W - 24, 6, '▾', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '18px',
      color: '#cce4ea',
    });
    chevron.setInteractive({ useHandCursor: true });
    chevron.on('pointerdown', () => this.toggle());
    c.add(chevron);

    // Filter pill row.
    const filterY = 28;
    let x = 8;
    const keys: FilterKey[] = ['damage', 'kill', 'dot', 'status', 'reaction'];
    for (const k of keys) {
      const label = k[0]!.toUpperCase() + k.slice(1);
      const t = this.add.text(x, filterY, `[${label} ✓]`, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
        color: '#cce4ea',
      });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.filters[k] = !this.filters[k];
        t.setText(`[${label} ${this.filters[k] ? '✓' : '✗'}]`);
        t.setColor(this.filters[k] ? '#cce4ea' : '#667788');
        this.repaintRows();
      });
      this.filterButtons[k] = t;
      c.add(t);
      x += t.width + 6;
    }

    // Rows container (scrolling text block).
    this.rowsText = this.add.text(8, 52, '', {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '11px',
      color: '#cce4ea',
      lineSpacing: 3,
      wordWrap: { width: W - 16 },
    });
    this.rowsText.setResolution(2);
    c.add(this.rowsText);

    this.panel = c;
  }

  private buildCollapsedPill(): void {
    const W = CombatLogScene.PILL_W;
    const H = CombatLogScene.PILL_H;
    const c = this.add.container(0, 0);
    c.setDepth(1400);
    c.setVisible(false);

    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0, 0);
    bg.setStrokeStyle(1, 0xc79448, 0.6);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.toggle());
    c.add(bg);

    this.pillSummary = this.add.text(8, 6, 'LOG ▴  0 dmg / 0 kills', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px',
      color: '#cce4ea',
    });
    c.add(this.pillSummary);

    this.collapsedPill = c;
  }

  private toggle(): void {
    this.collapsed = !this.collapsed;
    this.panel.setVisible(!this.collapsed);
    this.collapsedPill.setVisible(this.collapsed);
    if (this.collapsed) this.repaintPillSummary();
  }

  private layout(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const m = CombatLogScene.MARGIN;
    this.panel.setPosition(W - CombatLogScene.PANEL_W - m, H - CombatLogScene.PANEL_H - m);
    this.collapsedPill.setPosition(W - CombatLogScene.PILL_W - m, H - CombatLogScene.PILL_H - m);
  }

  private repaintRows(): void {
    if (this.collapsed) return;
    const now = Date.now();
    const entries = this.log.latest(200);
    const shown: string[] = [];
    const verbose = this.log.isVerbose();
    // Render newest-first. Hard-cap rows at 40 (matches doc §6.2).
    for (const e of entries) {
      if (!this.passesFilter(e)) continue;
      const line = verbose ? this.formatVerbose(e, now) : this.formatShort(e, now);
      shown.push(line);
      if (shown.length >= (verbose ? 12 : 18)) break;
    }
    this.rowsText.setText(shown.join('\n'));
  }

  private repaintPillSummary(): void {
    const a = this.log.recentAggregate(5000);
    this.pillSummary.setText(
      `LOG ▴  ${Math.round(a.dmgDealt)} dmg / ${a.kills} kills${a.crits ? ` / ${a.crits} crit` : ''}`,
    );
  }

  private passesFilter(e: CombatLogEntry): boolean {
    switch (e.kind) {
      case 'dealt':
      case 'taken':
        return this.filters.damage;
      case 'kill':
        return this.filters.kill;
      case 'dot':
        return this.filters.dot;
      case 'status':
        return this.filters.status;
      case 'reaction':
        return this.filters.reaction;
    }
  }

  private formatShort(e: CombatLogEntry, now: number): string {
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
    }
  }

  private formatVerbose(e: CombatLogEntry, now: number): string {
    const t = `${Math.max(0, ((now - e.time) / 1000)).toFixed(1)}s`;
    switch (e.kind) {
      case 'dealt':
        return `[${t}] ⚔ HIT ${prettyName(e.target)}\n  weapon=${e.weapon} | crit=${e.isCrit ? 'yes' : 'no'} | dmg=${Math.round(e.amount)} | element=${e.element}${e.kill ? ' | KILL' : ''}`;
      case 'taken':
        return `[${t}] 💥 HIT ${prettyName(e.source)}→player\n  type=${e.type} | dmg=${Math.round(e.amount)} | reduced=${Math.round(e.reduced)} | element=${e.element}`;
      case 'kill':
        return `[${t}] 💀 KILL ${prettyName(e.target)}\n  xp=${e.xp} | totalDmg=${e.totalDmg}`;
      case 'dot':
        return `[${t}] 🔥 DoT ${e.status}×tick\n  target=${prettyName(e.target)} | amount=${Math.round(e.amount)}`;
      case 'status':
        return `[${t}] 🌊 STATUS ${e.status} ${e.added ? 'applied' : 'stacked'}\n  target=${prettyName(e.target)}`;
      case 'reaction':
        return `[${t}] ✴ REACTION ${e.reaction}\n  target=${prettyName(e.target)}`;
    }
  }
}

type FilterKey = 'damage' | 'kill' | 'dot' | 'status' | 'reaction';
