import Phaser from 'phaser';
import { RunState } from '../run-state';
import { CardView } from '../ui/card-view';
import type { Card, CardElement } from '../ui/card';
import { WEAPON_CARDS } from '../data/weapon-cards';
import { PASSIVE_CARDS } from '../data/passive-cards';

/**
 * Legacy stock-item shape — kept exported because `merchant.ts` (the
 * spawner system) emits items in this format. We translate to `Card`
 * at scene-build time so MerchantScene + LevelUpScene + BossSpoilsScene
 * all share a single render path.
 */
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
 * Shipwright Cove merchant overlay. Renders up to 4 stock cards via
 * the shared `CardView` (PRD 6) plus a reroll + Set Sail control row.
 * Hotkeys (PRD 5): Q/W/E/R buy slot 1/2/3/4, T rerolls, Enter exits.
 */
export class MerchantScene extends Phaser.Scene {
  static readonly KEY = 'MerchantScene';
  private data_!: MerchantSceneData;
  private cardViews: CardView[] = [];
  private coinLabel!: Phaser.GameObjects.Text;

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
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);

    this.coinLabel = this.add.text(W / 2, H * 0.12 + 60,
      `Coins: 🪙 ${this.data_.runState.coins}`, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '26px',
        color: '#cce4ea',
        resolution: Math.max(2, window.devicePixelRatio || 1),
      }).setOrigin(0.5, 0.5);

    this.renderStock();
    this.renderControls();

    // Hotkey input — Q/W/E/R buy slots 1-4; T rerolls; Enter sets sail.
    this.input.keyboard?.on('keydown-Q', () => this.cardViews[0]?.trigger());
    this.input.keyboard?.on('keydown-W', () => this.cardViews[1]?.trigger());
    this.input.keyboard?.on('keydown-E', () => this.cardViews[2]?.trigger());
    this.input.keyboard?.on('keydown-R', () => this.cardViews[3]?.trigger());
    this.input.keyboard?.on('keydown-T', () => this.attemptReroll());
    this.input.keyboard?.on('keydown-ENTER', () => this.exit());
    this.input.keyboard?.on('keydown-SPACE', () => this.exit());

    // Footer hint.
    this.add.text(W / 2, H * 0.97, 'Q/W/E/R buy · T reroll · Enter set sail', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      color: '#99c9d6',
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);
  }

  private renderStock(): void {
    this.cardViews.forEach((c) => c.destroy());
    this.cardViews = [];

    const W = this.scale.width;
    const H = this.scale.height;
    const items = this.data_.stock.slice(0, 4);
    const HOTKEYS: Array<'Q' | 'W' | 'E' | 'R'> = ['Q', 'W', 'E', 'R'];

    const gap = 30;
    const totalW = items.length * CardView.W + (items.length - 1) * gap;
    const startX = (W - totalW) / 2 + CardView.W / 2;
    const y = H * 0.5;

    items.forEach((item, i) => {
      const card = this.itemToCard(item);
      card.hotkey = HOTKEYS[i];
      const x = startX + i * (CardView.W + gap);
      this.cardViews.push(new CardView(this, {
        card, x, y,
        playerCoins: this.data_.runState.coins,
        onSelect: () => this.purchase(item),
      }));
    });
  }

  /**
   * Translate a legacy `MerchantStockItem` (from `systems/merchant.ts`)
   * into a `Card`. Element + atk/def metadata pulled from the per-kind
   * data shims in `data/weapon-cards.ts` + `data/passive-cards.ts`.
   */
  private itemToCard(item: MerchantStockItem): Card {
    let element: CardElement = 'physical';
    let attack: number | undefined;
    let defense: number | undefined;
    let level: 1 | 2 | 3 | 4 | 5 = 1;
    let iconKey: string | undefined;
    if (item.kind === 'weapon') {
      const meta = WEAPON_CARDS[item.id];
      if (meta) { element = meta.element; attack = meta.attack; defense = meta.defense; }
      iconKey = `sprite-icon-${item.id}`;
      level = (this.data_.runState.weaponLevel(item.id) + 1) as 1 | 2 | 3 | 4 | 5;
      if (level < 1) level = 1; if (level > 5) level = 5;
    } else if (item.kind === 'passive') {
      const meta = PASSIVE_CARDS[item.id];
      if (meta) { element = meta.element; attack = meta.attack; defense = meta.defense; }
      iconKey = `sprite-icon-${item.id}`;
      level = (this.data_.runState.passiveLevel(item.id) + 1) as 1 | 2 | 3 | 4 | 5;
      if (level < 1) level = 1; if (level > 5) level = 5;
    } else if (item.kind === 'heal') {
      element = 'arcane'; defense = 3;
    } else if (item.kind === 'stat') {
      element = 'physical'; attack = 1;
    }
    return {
      id: `merchant:${item.id}`,
      kind: item.kind,
      title: item.label,
      detail: item.detail,
      stats: { attack, defense, element, level },
      costCoins: item.costCoins,
      iconKey,
      apply: () => item.apply(),
    };
  }

  private purchase(item: MerchantStockItem): boolean {
    const rs = this.data_.runState;
    if (rs.coins < item.costCoins) return false;
    if (!item.apply()) return false;
    rs.spendCoins(item.costCoins);
    const stageScene = this.scene.get('StageScene') as
      | (Phaser.Scene & { achievements?: { notifyMerchantPurchase?: () => void } })
      | undefined;
    stageScene?.achievements?.notifyMerchantPurchase?.();
    this.data_.stock = this.data_.stock.filter((s) => s !== item);
    this.renderStock();
    this.updateCoinLabel();
    return true;
  }

  private attemptReroll(): void {
    const rs = this.data_.runState;
    const rerollCost = Math.max(5, Math.floor(15 * (1 - this.data_.rerollCostReduction)));
    if (rs.coins < rerollCost) return;
    rs.addCoins(-rerollCost);
    this.data_.stock = this.data_.makeStock();
    this.renderStock();
    this.updateCoinLabel();
  }

  private exit(): void {
    this.data_.onClose();
    this.scene.stop();
    this.scene.resume(this.data_.stageKey);
  }

  private updateCoinLabel(): void {
    this.coinLabel.setText(`Coins: 🪙 ${this.data_.runState.coins}`);
  }

  private renderControls(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const rerollCost = Math.max(5, Math.floor(15 * (1 - this.data_.rerollCostReduction)));
    const rerollBtn = this.add.rectangle(W / 2 - 150, H * 0.88, 240, 56, 0x264a5a).setOrigin(0.5, 0.5);
    rerollBtn.setStrokeStyle(2, 0x99c9d6);
    this.add.text(W / 2 - 150, H * 0.88, `[T] Reroll 🪙 ${rerollCost}`, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '20px',
      color: '#cce4ea',
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);
    rerollBtn.setInteractive({ useHandCursor: true });
    rerollBtn.on('pointerdown', () => this.attemptReroll());

    const setSail = this.add.rectangle(W / 2 + 150, H * 0.88, 240, 56, 0x3a5a24).setOrigin(0.5, 0.5);
    setSail.setStrokeStyle(2, 0x8fce5a);
    this.add.text(W / 2 + 150, H * 0.88, '[Enter] Set Sail ➜', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '20px',
      color: '#cce4ea',
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);
    setSail.setInteractive({ useHandCursor: true });
    setSail.on('pointerdown', () => this.exit());
  }
}
