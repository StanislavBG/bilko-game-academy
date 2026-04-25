import Phaser from 'phaser';
import { RunState } from '../run-state';
import { getShipConfig } from '../data/starting-ships';
import type { StageScene } from './stage-scene';

/**
 * Bottom-left player-properties overlay. Three tabs: Ship / Loadout / Status.
 * See docs/games/boat-shooter/23-hud-and-combat-log.md §7.
 *
 * Refreshes at 150 ms cadence — cheaper than event-wiring every RunState
 * field, and imperceptible for a stat panel.
 */
type Tab = 'ship' | 'loadout' | 'status';

export class PlayerPropsScene extends Phaser.Scene {
  static readonly KEY = 'PlayerPropsScene';

  private stageKey = 'StageScene';
  private runState!: RunState;

  private panel!: Phaser.GameObjects.Container;
  private collapsedPill!: Phaser.GameObjects.Container;
  private bodyText!: Phaser.GameObjects.Text;
  private tabButtons: Record<Tab, Phaser.GameObjects.Text> = {} as Record<Tab, Phaser.GameObjects.Text>;
  private pillSummary!: Phaser.GameObjects.Text;

  private tab: Tab = 'ship';
  private collapsed = false;

  private static readonly PANEL_W = 320;
  private static readonly PANEL_H = 260;
  private static readonly PILL_W = 220;
  private static readonly PILL_H = 28;
  private static readonly MARGIN = 16;

  constructor() {
    super({ key: PlayerPropsScene.KEY });
  }

  init(data: { stageKey?: string; runState: RunState }): void {
    this.stageKey = data.stageKey ?? 'StageScene';
    this.runState = data.runState;
  }

  create(): void {
    this.buildPanel();
    this.buildCollapsedPill();
    this.layout();
    this.refresh();
    // Cheap periodic redraw — panel is read-only and stats tick rarely.
    this.time.addEvent({ delay: 150, loop: true, callback: () => this.refresh() });

    // Keyboard toggle. `I` (for Info) avoids the `P` pause binding in stage-scene.
    this.input.keyboard?.on('keydown-I', () => this.toggle());
  }

  private buildPanel(): void {
    const W = PlayerPropsScene.PANEL_W;
    const H = PlayerPropsScene.PANEL_H;
    const c = this.add.container(0, 0);
    c.setDepth(1400);

    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0, 0);
    bg.setStrokeStyle(1, 0xc79448, 0.6);
    c.add(bg);

    const title = this.add.text(8, 6, 'SHIP PROPERTIES', {
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

    // Tabs.
    const tabs: Tab[] = ['ship', 'loadout', 'status'];
    let x = 8;
    const tabY = 28;
    for (const t of tabs) {
      const label = t[0]!.toUpperCase() + t.slice(1);
      const btn = this.add.text(x, tabY, ` ${label} `, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px',
        color: '#cce4ea',
        // `undefined` would be rejected by exactOptionalPropertyTypes;
        // use fully-transparent rgba to match the inactive style below.
        backgroundColor: t === this.tab ? '#264a5a' : 'rgba(0,0,0,0)',
      });
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.tab = t;
        for (const k of tabs) {
          this.tabButtons[k].setStyle({
            backgroundColor: k === this.tab ? '#264a5a' : 'rgba(0,0,0,0)',
          });
        }
        this.refresh();
      });
      this.tabButtons[t] = btn;
      c.add(btn);
      x += btn.width + 8;
    }

    this.bodyText = this.add.text(10, 56, '', {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '12px',
      color: '#cce4ea',
      lineSpacing: 3,
      wordWrap: { width: W - 20 },
    });
    this.bodyText.setResolution(2);
    c.add(this.bodyText);

    this.panel = c;
  }

  private buildCollapsedPill(): void {
    const W = PlayerPropsScene.PILL_W;
    const H = PlayerPropsScene.PILL_H;
    const c = this.add.container(0, 0);
    c.setDepth(1400);
    c.setVisible(false);

    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0, 0);
    bg.setStrokeStyle(1, 0xc79448, 0.6);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.toggle());
    c.add(bg);

    this.pillSummary = this.add.text(8, 6, 'PROPS ▴', {
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
    if (this.collapsed) this.refreshPillSummary();
  }

  private layout(): void {
    const H = this.scale.height;
    const m = PlayerPropsScene.MARGIN;
    this.panel.setPosition(m, H - PlayerPropsScene.PANEL_H - m);
    this.collapsedPill.setPosition(m, H - PlayerPropsScene.PILL_H - m);
  }

  private refresh(): void {
    if (this.collapsed) return this.refreshPillSummary();
    const rs = this.runState;
    if (!rs) return;
    const lines = (() => {
      switch (this.tab) {
        case 'ship':    return this.renderShipTab(rs);
        case 'loadout': return this.renderLoadoutTab(rs);
        case 'status':  return this.renderStatusTab(rs);
      }
    })();
    this.bodyText.setText(lines.join('\n'));
  }

  private refreshPillSummary(): void {
    const rs = this.runState;
    if (!rs) return;
    this.pillSummary.setText(
      `PROPS ▴  ${rs.weapons.length} wpn / ${rs.passives.length} pass`,
    );
  }

  private renderShipTab(rs: RunState): string[] {
    const cfg = getShipConfig(rs.shipId);
    const pad = (label: string, value: string | number): string =>
      `${label.padEnd(14)}${value}`;
    return [
      `${cfg.emoji} ${cfg.displayName}`,
      '',
      pad('HP', `${Math.round(rs.hp * 10) / 10} / ${rs.maxHp}`),
      pad('Speed', `${Math.round(rs.speed)} px/s`),
      pad('Crit', `${(rs.critChance * 100).toFixed(0)}% × ${rs.critMultiplier.toFixed(2)}×`),
      pad('Damage ×', rs.damageMultiplier.toFixed(2)),
      pad('Base dmg', rs.baseDamage.toFixed(2)),
      pad('Magnet', `${Math.round(rs.magnetRadius)} px`),
      pad('Accel', `${Math.round(rs.accel)} px/s²`),
      pad('Coin ×', rs.coinValueMult.toFixed(2)),
    ];
  }

  private renderLoadoutTab(rs: RunState): string[] {
    const lines: string[] = ['Weapons:'];
    if (rs.weapons.length === 0) lines.push('  —');
    for (const w of rs.weapons) lines.push(`  • ${w.id.padEnd(22)}L${w.level}`);
    lines.push('', 'Passives:');
    if (rs.passives.length === 0) lines.push('  —');
    for (const p of rs.passives) lines.push(`  • ${p.id.padEnd(22)}L${p.level}`);
    lines.push('', 'Evolutions:');
    if (rs.evolutions.size === 0) lines.push('  — (none yet)');
    else for (const e of rs.evolutions) lines.push(`  ★ ${e}`);
    return lines;
  }

  private renderStatusTab(rs: RunState): string[] {
    const stage = this.scene.get(this.stageKey) as StageScene | undefined;
    const stageId = stage?.getStageId?.() ?? '—';
    return [
      `XP ${rs.xp}/${rs.xpToNext()}   Level ${rs.level}`,
      `Gems ${rs.gems}`,
      `Map fragments: ${rs.mapFragmentsThisStage}`,
      `Coins: ${rs.coins}`,
      '',
      `Difficulty: ${rs.difficulty}${rs.godmode ? ' (godmode)' : ''}`,
      `NG+: ${rs.ngPlus}`,
      `Stage: ${stageId}`,
    ];
  }
}
