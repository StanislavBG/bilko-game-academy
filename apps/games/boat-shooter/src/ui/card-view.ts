import Phaser from 'phaser';
import type { Card } from './card';
import { CARD_ELEMENT_COLOR, CARD_ELEMENT_LABEL } from './card';

/**
 * Phaser primitive that renders one `Card` as a 360 × 280 playing-card.
 *
 * Layout (top → bottom):
 *   - title bar (color = element family)
 *   - element badge + level pips
 *   - icon + attack/defense badges in corners
 *   - title text + detail text
 *   - cost badge (merchant only) + hotkey glyph
 *
 * Hover tween: 1.04× scale-pop + brighter stroke.
 * Click + hotkey both trigger `onSelect()`.
 */

export interface CardViewOptions {
  card: Card;
  /** Center position in the parent scene's coordinate system. */
  x: number;
  y: number;
  /** Player's current coin balance — drives the cost badge color when
   *  the card is unaffordable. Pass 0 if no cost is shown. */
  playerCoins?: number;
  /** Click / keypress callback. Returns true if the selection was
   *  consumed (closes the picker), false to keep the picker open. */
  onSelect: (card: Card) => boolean;
}

export class CardView {
  static readonly W = 360;
  static readonly H = 280;

  readonly container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private titleBar: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private detailText: Phaser.GameObjects.Text;

  /** Ref kept so external code can query / re-style. */
  readonly card: Card;
  private readonly scene: Phaser.Scene;
  private readonly opts: CardViewOptions;

  constructor(scene: Phaser.Scene, opts: CardViewOptions) {
    this.scene = scene;
    this.opts = opts;
    this.card = opts.card;

    const { W, H } = CardView;
    const c = scene.add.container(opts.x, opts.y);
    c.setDepth(1500);
    this.container = c;

    const elemColor = CARD_ELEMENT_COLOR[this.card.stats.element];

    // Body — dark teal w/ element-tinted stroke.
    this.bg = scene.add.rectangle(0, 0, W, H, 0x0a4052, 1)
      .setStrokeStyle(3, elemColor, 0.85);
    c.add(this.bg);

    // Title bar (top 44 px) tinted with the element color.
    this.titleBar = scene.add.rectangle(0, -H / 2 + 22, W, 44, elemColor, 1);
    c.add(this.titleBar);

    // Title text — white-on-element.
    this.titleText = scene.add.text(0, -H / 2 + 22, this.card.title, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: Math.max(2, window.devicePixelRatio || 1),
      wordWrap: { width: W - 80 },
      align: 'center',
    }).setOrigin(0.5, 0.5);
    c.add(this.titleText);

    // Element badge — bottom-left of title bar.
    const badgeText = CARD_ELEMENT_LABEL[this.card.stats.element];
    const elemBadge = scene.add.text(-W / 2 + 12, -H / 2 + 60, badgeText, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#cce4ea',
      backgroundColor: '#000000aa',
      padding: { x: 7, y: 3 },
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0, 0);
    c.add(elemBadge);

    // Level pip row — top-right corner of body.
    const pipY = -H / 2 + 64;
    const lvl = this.card.stats.level;
    for (let i = 0; i < 5; i++) {
      const pip = scene.add.circle(W / 2 - 16 - i * 12, pipY, 4,
        i < lvl ? 0xffd85a : 0x303030, 1)
        .setStrokeStyle(1, 0x000000, 1);
      c.add(pip);
    }

    // Icon (large, centered) — sprite-icon-* if available, else fallback dot.
    if (this.card.iconKey && scene.textures.exists(this.card.iconKey)) {
      const icon = scene.add.image(0, -10, this.card.iconKey);
      const native = icon.width || 1024;
      icon.setScale(96 / native);
      c.add(icon);
    } else {
      // Fallback: colored circle with the kind's first letter.
      const fall = scene.add.circle(0, -10, 36, elemColor, 0.45);
      c.add(fall);
    }

    // Attack badge — bottom-left corner.
    if (this.card.stats.attack !== undefined) {
      const atk = scene.add.text(-W / 2 + 12, H / 2 - 38, `⚔ ${this.card.stats.attack}`, {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ff8a3a',
        stroke: '#000',
        strokeThickness: 3,
        resolution: Math.max(2, window.devicePixelRatio || 1),
      }).setOrigin(0, 0);
      c.add(atk);
    }
    // Defense badge — bottom-right corner.
    if (this.card.stats.defense !== undefined) {
      const def = scene.add.text(W / 2 - 12, H / 2 - 38, `🛡 ${this.card.stats.defense}`, {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#aaeeff',
        stroke: '#000',
        strokeThickness: 3,
        resolution: Math.max(2, window.devicePixelRatio || 1),
      }).setOrigin(1, 0);
      c.add(def);
    }

    // Detail text — center body, below icon.
    this.detailText = scene.add.text(0, 60, this.card.detail, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      color: '#cce4ea',
      align: 'center',
      wordWrap: { width: W - 36 },
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);
    c.add(this.detailText);

    // Cost badge — only for merchant stock.
    if (this.card.costCoins !== undefined) {
      const affordable = (opts.playerCoins ?? 0) >= this.card.costCoins;
      const tint = affordable ? '#ffd85a' : '#ff5050';
      const cost = scene.add.text(0, H / 2 - 16, `💰 ${this.card.costCoins}`, {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: tint,
        stroke: '#000',
        strokeThickness: 3,
        resolution: Math.max(2, window.devicePixelRatio || 1),
      }).setOrigin(0.5, 1);
      c.add(cost);
    }

    // Hotkey glyph — top-right of card.
    if (this.card.hotkey) {
      const keyBg = scene.add.rectangle(W / 2 - 22, -H / 2 + 22, 32, 32, 0x000000, 0.7)
        .setStrokeStyle(2, 0xffffff, 0.85);
      const keyText = scene.add.text(W / 2 - 22, -H / 2 + 22, this.card.hotkey, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
        resolution: Math.max(2, window.devicePixelRatio || 1),
      }).setOrigin(0.5, 0.5);
      c.add(keyBg);
      c.add(keyText);
    }

    // Hover + click.
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => this.setHover(true));
    this.bg.on('pointerout', () => this.setHover(false));
    this.bg.on('pointerdown', () => this.opts.onSelect(this.card));
  }

  /** Trigger selection programmatically (used by hotkey handler). */
  trigger(): boolean {
    return this.opts.onSelect(this.card);
  }

  /** Disable the card (after a successful pick). */
  setEnabled(enabled: boolean): void {
    this.bg.disableInteractive();
    if (enabled) this.bg.setInteractive({ useHandCursor: true });
    this.container.setAlpha(enabled ? 1 : 0.5);
  }

  destroy(): void {
    this.container.destroy();
  }

  private setHover(on: boolean): void {
    const elem = CARD_ELEMENT_COLOR[this.card.stats.element];
    this.bg.setStrokeStyle(on ? 4 : 3, elem, on ? 1 : 0.85);
    this.scene.tweens.add({
      targets: this.container,
      scale: on ? 1.04 : 1,
      duration: 120,
      ease: 'Quad.out',
    });
  }
}
