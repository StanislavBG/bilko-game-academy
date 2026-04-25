import Phaser from 'phaser';
import { RunState } from '../run-state';

export interface MerchantStockItem {
  kind: 'weapon' | 'passive' | 'stat' | 'heal';
  id: string;
  label: string;
  detail: string;
  costCoins: number;
  apply: () => boolean;
}

interface MerchantSceneData {
  runState: RunState;
  stock: MerchantStockItem[];
  stageKey: string;
  onClose: () => void;
  rerollCostReduction: number;
  makeStock: () => MerchantStockItem[];
}

/**
 * Shipwright Cove merchant overlay. Darkens the stage, shows up to 4 item
 * cards, a reroll button (coin cost), and a "Set Sail" exit. Purchasing
 * removes that item from the stock; close resumes the stage.
 */
export class MerchantScene extends Phaser.Scene {
  static readonly KEY = 'MerchantScene';
  private data_!: MerchantSceneData;
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private labels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: MerchantScene.KEY });
  }

  init(data: MerchantSceneData): void {
    this.data_ = data;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0, 0);

    this.add.text(W / 2, H * 0.12, 'SHIPWRIGHT COVE', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '64px',
      color: '#e0b063',
    }).setOrigin(0.5, 0.5);

    this.add.text(W / 2, H * 0.12 + 60, `Coins: 🪙 ${this.data_.runState.coins}`, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '26px',
      color: '#cce4ea',
    }).setOrigin(0.5, 0.5).setName('coin-label');

    this.renderStock();
    this.renderControls();
  }

  private renderStock(): void {
    this.cards.forEach((c) => c.destroy());
    this.labels.forEach((l) => l.destroy());
    this.cards = [];
    this.labels = [];

    const W = this.scale.width;
    const H = this.scale.height;
    const items = this.data_.stock;
    const cardW = 380;
    const cardH = 220;
    const gap = 30;
    const totalW = items.length * cardW + (items.length - 1) * gap;
    const startX = (W - totalW) / 2;

    items.forEach((item, i) => {
      const x = startX + i * (cardW + gap);
      const y = H * 0.4;
      this.renderItemCard(x, y, cardW, cardH, item);
    });
  }

  private renderItemCard(x: number, y: number, w: number, h: number, item: MerchantStockItem): void {
    const rs = this.data_.runState;
    const affordable = rs.coins >= item.costCoins;

    // Card fill + stroke shift on affordability so the player sees at a
    // glance what they can buy.
    const fill = affordable ? 0x0a4052 : 0x1a2026;
    const strokeColor = affordable ? 0xc79448 : 0x3a4448;
    const card = this.add.rectangle(x, y, w, h, fill).setOrigin(0, 0);
    card.setStrokeStyle(3, strokeColor);
    card.setAlpha(affordable ? 1 : 0.55);
    this.cards.push(card);

    const titleColor = affordable ? '#e0b063' : '#707a80';
    const bodyColor = affordable ? '#cce4ea' : '#8090a0';
    const priceColor = affordable ? '#ffd85a' : '#ff8888';

    this.labels.push(
      this.add.text(x + 20, y + 16, item.label, {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '28px',
        color: titleColor,
        wordWrap: { width: w - 40 },
      }),
    );
    this.labels.push(
      this.add.text(x + 20, y + 60, item.detail, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '16px',
        color: bodyColor,
        wordWrap: { width: w - 40 },
      }),
    );
    this.labels.push(
      this.add.text(x + 20, y + h - 40, `🪙 ${item.costCoins}`, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '24px',
        color: priceColor,
      }),
    );
    // "AFFORDABLE" / "CANNOT AFFORD" chip in top-right.
    this.labels.push(
      this.add.text(x + w - 20, y + 16, affordable ? '✓ OK' : '✗ NEED MORE', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
        color: affordable ? '#8fce5a' : '#ff6a6a',
      }).setOrigin(1, 0),
    );

    card.setInteractive({ useHandCursor: affordable });
    if (affordable) {
      card.on('pointerover', () => card.setFillStyle(0x164a5a));
      card.on('pointerout', () => card.setFillStyle(fill));
    }
    card.on('pointerdown', () => {
      if (rs.coins < item.costCoins) return;
      if (!item.apply()) return;
      rs.spendCoins(item.costCoins);
      const stageScene = this.scene.get('StageScene') as
        | (Phaser.Scene & { achievements?: { notifyMerchantPurchase?: () => void } })
        | undefined;
      stageScene?.achievements?.notifyMerchantPurchase?.();
      this.data_.stock = this.data_.stock.filter((s) => s !== item);
      this.renderStock();
      this.updateCoinLabel();
    });
  }

  private updateCoinLabel(): void {
    const label = this.children.getByName('coin-label') as Phaser.GameObjects.Text | null;
    label?.setText(`Coins: 🪙 ${this.data_.runState.coins}`);
  }

  private renderControls(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const rerollCost = Math.max(5, Math.floor(15 * (1 - this.data_.rerollCostReduction)));
    const rerollBtn = this.add.rectangle(W / 2 - 150, H * 0.85, 240, 60, 0x264a5a).setOrigin(0.5, 0.5);
    rerollBtn.setStrokeStyle(2, 0x99c9d6);
    this.add.text(W / 2 - 150, H * 0.85, `Reroll 🪙 ${rerollCost}`, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '22px',
      color: '#cce4ea',
    }).setOrigin(0.5, 0.5);
    rerollBtn.setInteractive({ useHandCursor: true });
    rerollBtn.on('pointerdown', () => {
      const rs = this.data_.runState;
      if (rs.coins < rerollCost) return;
      rs.addCoins(-rerollCost);
      this.data_.stock = this.data_.makeStock();
      this.renderStock();
      this.updateCoinLabel();
    });

    const setSail = this.add.rectangle(W / 2 + 150, H * 0.85, 240, 60, 0x3a5a24).setOrigin(0.5, 0.5);
    setSail.setStrokeStyle(2, 0x8fce5a);
    this.add.text(W / 2 + 150, H * 0.85, 'Set Sail ➜', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '22px',
      color: '#cce4ea',
    }).setOrigin(0.5, 0.5);
    setSail.setInteractive({ useHandCursor: true });
    setSail.on('pointerdown', () => {
      this.data_.onClose();
      this.scene.stop();
      this.scene.resume(this.data_.stageKey);
    });
  }
}
