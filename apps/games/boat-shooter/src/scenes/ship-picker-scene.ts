import Phaser from 'phaser';
import type { GameContext } from '@bilko/game-sdk';
import { RunState } from '../run-state';
import {
  getShipConfig, rollRandomShipId,
  type ShipConfig, type ShipId,
} from '../data/starting-ships';

/**
 * Starting-ship picker. Shows the five elemental ships + a Random tile.
 * Clicking a tile selects it; clicking SET SAIL launches StageScene
 * with the chosen shipId. Runs once per fresh run, before Stage 1.
 */
export class ShipPickerScene extends Phaser.Scene {
  static readonly KEY = 'ShipPickerScene';

  private ctx!: GameContext;
  private runState!: RunState;
  private stageId: string | number | undefined;
  private cosmetics!: { hull: string; sails: string; figurehead: string; wake: string };

  /** Current selection. 'random' is a sentinel — resolved to a real ID at launch. */
  private selection: ShipId | 'random' = 'ember-corsair';
  /** Pre-rolled random choice so the Random tile can reveal it before launch. */
  private randomRoll: ShipId = rollRandomShipId();

  private tiles: Map<ShipId | 'random', Phaser.GameObjects.Container> = new Map();
  private infoTitle!: Phaser.GameObjects.Text;
  private infoFlavor!: Phaser.GameObjects.Text;
  private infoStats!: Phaser.GameObjects.Text;
  private infoTree!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: ShipPickerScene.KEY });
  }

  init(data: {
    ctx: GameContext;
    runState: RunState;
    stageId?: string | number;
    cosmetics: { hull: string; sails: string; figurehead: string; wake: string };
  }): void {
    this.ctx = data.ctx;
    this.runState = data.runState;
    this.stageId = data.stageId;
    this.cosmetics = data.cosmetics;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#0a2a3a');
    this.cameras.main.fadeIn(350, 0, 0, 0);

    // Parchment backdrop.
    this.add.rectangle(W / 2, H / 2, W - 120, H - 120, 0x1a1a20, 0.78)
      .setStrokeStyle(2, 0xc79448, 0.9);

    this.add.text(W / 2, 90, 'CHOOSE YOUR SHIP', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '84px',
      color: '#e0b063',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5);

    this.add.text(W / 2, 160, 'Five elemental vessels. Six rolls. One campaign.', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '24px',
      color: '#cce4ea',
    }).setOrigin(0.5, 0.5);

    // ---------- Tile grid (3 columns × 2 rows) ----------
    const grid: (ShipId | 'random')[] = [
      'ember-corsair', 'tempest-fury', 'frostbound',
      'verdant-tide', 'nightwake', 'random',
    ];
    const gridTop = 220;
    const tileW = 300;
    const tileH = 200;
    const gapX = 30;
    const gapY = 20;
    const gridW = 3 * tileW + 2 * gapX;
    const gridX0 = W / 2 - gridW / 2;

    for (let i = 0; i < grid.length; i++) {
      const id = grid[i]!;
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = gridX0 + col * (tileW + gapX) + tileW / 2;
      const y = gridTop + row * (tileH + gapY) + tileH / 2;
      const tile = this.makeTile(id, x, y, tileW, tileH);
      this.tiles.set(id, tile);
    }

    // ---------- Info panel ----------
    const infoTop = gridTop + 2 * (tileH + gapY) + 10;
    this.infoTitle = this.add.text(W / 2, infoTop, '', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '44px',
      color: '#ffd85a',
    }).setOrigin(0.5, 0.5);
    this.infoFlavor = this.add.text(W / 2, infoTop + 52, '', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '22px',
      color: '#cce4ea',
      fontStyle: 'italic',
    }).setOrigin(0.5, 0.5);
    this.infoStats = this.add.text(W / 2, infoTop + 94, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '20px',
      color: '#e0e8ef',
      align: 'center',
    }).setOrigin(0.5, 0.5);
    this.infoTree = this.add.text(W / 2, infoTop + 128, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '20px',
      color: '#aab8c0',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    // ---------- SET SAIL button ----------
    const btnY = H - 110;
    const btnW = 320;
    const btnH = 70;
    const btnBg = this.add.rectangle(W / 2, btnY, btnW, btnH, 0x3a6a40, 1)
      .setStrokeStyle(2, 0xffd85a, 1).setInteractive({ useHandCursor: true });
    const btnText = this.add.text(W / 2, btnY, 'SET SAIL', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '36px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x4a8a50));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x3a6a40));
    btnBg.on('pointerdown', () => this.launchStage());
    void btnText;

    // Initial selection highlight.
    this.selectShip('ember-corsair');

    // Keyboard shortcuts — 1..6 pick a tile, Enter launches.
    this.input.keyboard?.on('keydown-ONE', () => this.selectShip('ember-corsair'));
    this.input.keyboard?.on('keydown-TWO', () => this.selectShip('tempest-fury'));
    this.input.keyboard?.on('keydown-THREE', () => this.selectShip('frostbound'));
    this.input.keyboard?.on('keydown-FOUR', () => this.selectShip('verdant-tide'));
    this.input.keyboard?.on('keydown-FIVE', () => this.selectShip('nightwake'));
    this.input.keyboard?.on('keydown-SIX', () => this.selectShip('random'));
    this.input.keyboard?.on('keydown-ENTER', () => this.launchStage());
  }

  private makeTile(
    id: ShipId | 'random',
    x: number, y: number, w: number, h: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, 0x2a3a4a, 1)
      .setStrokeStyle(2, 0x3a5a70, 1)
      .setInteractive({ useHandCursor: true });
    container.add(bg);

    if (id === 'random') {
      const emoji = this.add.text(0, -48, '🎲', {
        fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif',
        fontSize: '56px',
      }).setOrigin(0.5, 0.5);
      container.add(emoji);
      const name = this.add.text(0, 12, 'Random', {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '32px',
        color: '#ffd85a',
      }).setOrigin(0.5, 0.5);
      container.add(name);
      const sub = this.add.text(0, 48, 'Fate picks for you', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '16px',
        color: '#aab8c0',
      }).setOrigin(0.5, 0.5);
      container.add(sub);
    } else {
      const cfg = getShipConfig(id);
      const emoji = this.add.text(0, -58, cfg.emoji, {
        fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif',
        fontSize: '40px',
      }).setOrigin(0.5, 0.5);
      container.add(emoji);
      // Tiny ship preview — a hull shape tinted with the triad's mid color.
      const preview = this.add.polygon(0, -20, [
        0, -16, 6, -10, 8, 0, 6, 10, -6, 10, -8, 0, -6, -10,
      ], cfg.hullTriad[1], 1).setStrokeStyle(1, cfg.hullTriad[0], 1);
      container.add(preview);
      const sail = this.add.polygon(0, -20, [
        -4, -3, 4, -3, 5, 0, 4, 3, -4, 3, -5, 0,
      ], cfg.sailColor, 0.9);
      container.add(sail);
      const name = this.add.text(0, 18, cfg.displayName, {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '24px',
        color: '#ffd85a',
      }).setOrigin(0.5, 0.5);
      container.add(name);
      const sub = this.add.text(0, 48, `${cfg.element.toUpperCase()} · ${cfg.skillTree.branchName}`, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '16px',
        color: '#aab8c0',
      }).setOrigin(0.5, 0.5);
      container.add(sub);
    }

    bg.on('pointerover', () => {
      if (this.selection !== id) bg.setStrokeStyle(2, 0xcce4ea, 1);
    });
    bg.on('pointerout', () => {
      if (this.selection !== id) bg.setStrokeStyle(2, 0x3a5a70, 1);
    });
    bg.on('pointerdown', () => this.selectShip(id));
    // Expose the bg rect on the container so highlight code can reach it.
    (container as unknown as { bg: Phaser.GameObjects.Rectangle }).bg = bg;

    return container;
  }

  private selectShip(id: ShipId | 'random'): void {
    this.selection = id;

    // Refresh all tile highlights.
    for (const [tileId, tile] of this.tiles) {
      const bg = (tile as unknown as { bg: Phaser.GameObjects.Rectangle }).bg;
      if (tileId === id) {
        bg.setStrokeStyle(3, 0xffd85a, 1);
        bg.setFillStyle(0x3a5a70, 1);
      } else {
        bg.setStrokeStyle(2, 0x3a5a70, 1);
        bg.setFillStyle(0x2a3a4a, 1);
      }
    }

    if (id === 'random') {
      // Pre-reveal which ship the random roll currently points to so the
      // player can re-roll by clicking again.
      const revealed = getShipConfig(this.randomRoll);
      this.infoTitle.setText(`Fate rolls… ${revealed.displayName}`);
      this.infoFlavor.setText('Click Random again to re-roll before you set sail.');
      this.infoStats.setText(
        `Starter: ${this.weaponName(revealed.starterWeapon)}  ·  Passive: ${this.passiveName(revealed.starterPassive)}`,
      );
      this.infoTree.setText(`Branch: ${revealed.skillTree.branchName}`);
      // Re-roll on subsequent clicks.
      this.randomRoll = rollRandomShipId();
      return;
    }

    const cfg = getShipConfig(id);
    this.infoTitle.setText(`${cfg.emoji}  ${cfg.displayName}`);
    this.infoFlavor.setText(`“${cfg.flavor}”`);
    this.infoStats.setText(
      `Starter: ${this.weaponName(cfg.starterWeapon)}  ·  Passive: ${this.passiveName(cfg.starterPassive)}  ·  ${this.statTweakLabel(cfg)}`,
    );
    this.infoTree.setText(
      `Skill branch: ${cfg.skillTree.branchName} — ${cfg.skillTree.nodes.length} nodes across 3 tiers`,
    );
  }

  private launchStage(): void {
    const chosen: ShipId = this.selection === 'random' ? this.randomRoll : this.selection;

    // Persist the chosen ship on runState BEFORE launching so StageScene
    // sees it via `runState.shipId` even if the user passed no explicit
    // shipId through init-data.
    this.runState.shipId = chosen;

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('StageScene', {
        ctx: this.ctx,
        runState: this.runState,
        stageId: this.stageId,
        cosmetics: this.cosmetics,
        shipId: chosen,
      });
    });
  }

  private weaponName(id: string): string {
    // Local pretty-names. The weapon catalog exports displayName but
    // importing it here would pull in every weapon class — not worth it
    // for a title screen.
    const names: Record<string, string> = {
      'bow-cannon': 'Bow Cannon',
      'broadside': 'Broadside',
      'harpoon': 'Harpoon',
      'chain-lightning': 'Chain Lightning',
      'flamethrower': 'Flamethrower',
      'lighthouse-beam': 'Lighthouse Beam',
      'mortar': 'Mortar',
      'fire-arrow-rain': 'Fire-Arrow Rain',
      'kraken-ink': 'Kraken-Ink Cloud',
      'spinning-axes': 'Spinning Axes',
      'homing-musket': 'Homing Muskets',
      'stern-mines': 'Stern Mines',
      'ghost-crew': 'Ghost-Crew Volley',
    };
    return names[id] ?? id;
  }

  private passiveName(id: string): string {
    const names: Record<string, string> = {
      'crows-nest': "Crow's Nest",
      'copper-hull': 'Copper Hull',
      'storm-compass': 'Storm Compass',
      'powder-barrel': 'Powder Barrel',
      'first-mate': 'First Mate',
      'cargo-nets': 'Cargo Nets',
      'spyglass': 'Spyglass',
      'admirals-flag': "Admiral's Flag",
    };
    return names[id] ?? id;
  }

  private statTweakLabel(cfg: ShipConfig): string {
    const parts: string[] = [];
    const t = cfg.statTweaks;
    if (t.baseDamageMult) parts.push(`dmg ×${t.baseDamageMult.toFixed(2)}`);
    if (t.baseDamageFlat) parts.push(`+${t.baseDamageFlat} dmg`);
    if (t.maxHpDelta) parts.push(`${t.maxHpDelta > 0 ? '+' : ''}${t.maxHpDelta} HP`);
    if (t.speedDelta) parts.push(`${t.speedDelta > 0 ? '+' : ''}${t.speedDelta} spd`);
    if (t.critChanceDelta) parts.push(`+${Math.round(t.critChanceDelta * 100)}% crit`);
    if (t.critMultiplierDelta) parts.push(`+${t.critMultiplierDelta.toFixed(2)}× crit mult`);
    if (t.magnetRadiusDelta) parts.push(`+${t.magnetRadiusDelta} magnet`);
    return parts.length ? parts.join(' · ') : 'baseline stats';
  }
}

