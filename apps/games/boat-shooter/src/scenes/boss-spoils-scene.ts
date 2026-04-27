import Phaser from 'phaser';
import { RunState } from '../run-state';
import { allWeapons } from '../weapons/weapon-catalog';
import { allPassives } from '../weapons/passive-catalog';
import { findEligibleEvolution } from '../weapons/evolutions';
import { CardView } from '../ui/card-view';
import type { Card } from '../ui/card';
import { WEAPON_CARDS } from '../data/weapon-cards';
import { PASSIVE_CARDS } from '../data/passive-cards';

interface BossSpoilsSceneData {
  runState: RunState;
  /** Key of the parent StageScene — accepted for API parity with LevelUpScene
   *  / MerchantScene; the actual resume is delegated to `onClose`. */
  stageKey: string;
  onClose: () => void;
}

/**
 * Boss Spoils overlay (PRD 9). Launched after the loot-gather window
 * and before StageClearScene. Renders 3 CardView picks: weapon (biased
 * toward levelable), passive, and a stat / heal / evolution offer.
 *
 * Caller (StageScene.completeStage) is responsible for resuming the
 * stage scene + chaining to StageClearScene through `onClose`.
 */
export class BossSpoilsScene extends Phaser.Scene {
  static readonly KEY = 'BossSpoilsScene';

  private runState!: RunState;
  private onClose!: () => void;
  private cardViews: CardView[] = [];
  private closed = false;

  constructor() {
    super({ key: BossSpoilsScene.KEY });
  }

  init(data: BossSpoilsSceneData): void {
    this.runState = data.runState;
    this.onClose = data.onClose;
    void data.stageKey;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.fadeIn(220, 0, 0, 0);
    // 1.05× zoom — gentle "spoils camera" push without obscuring card text.
    this.cameras.main.zoomTo(1.05, 240, 'Sine.easeOut');

    this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0, 0);

    this.add.rectangle(W / 2, H * 0.18, W * 0.7, 110, 0x1a1208, 0.92)
      .setStrokeStyle(4, 0xe0b063, 1);
    this.add.text(W / 2, H * 0.18, 'Boss Spoils', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '72px',
      color: '#e0b063',
      stroke: '#000000',
      strokeThickness: 4,
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);

    const cards = this.generateCards();
    const HOTKEYS: Array<'Q' | 'W' | 'E'> = ['Q', 'W', 'E'];
    cards.forEach((card, i) => {
      card.hotkey = HOTKEYS[i];
    });

    const gap = 40;
    const totalW = cards.length * CardView.W + (cards.length - 1) * gap;
    const startX = (W - totalW) / 2 + CardView.W / 2;
    const y = H * 0.55;
    cards.forEach((card, i) => {
      const x = startX + i * (CardView.W + gap);
      this.cardViews.push(new CardView(this, {
        card, x, y,
        playerCoins: this.runState.coins,
        onSelect: (c) => this.commit(c),
      }));
    });

    this.input.keyboard?.on('keydown-Q', () => this.cardViews[0]?.trigger());
    this.input.keyboard?.on('keydown-W', () => this.cardViews[1]?.trigger());
    this.input.keyboard?.on('keydown-E', () => this.cardViews[2]?.trigger());

    this.add.text(W / 2, H * 0.92, 'Press Q / W / E or click to claim your spoils', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '15px',
      color: '#99c9d6',
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);
  }

  private commit(card: Card): boolean {
    if (this.closed) return false;
    card.apply(this.runState);
    this.closed = true;
    this.onClose();
    this.scene.stop();
    return true;
  }

  /**
   * Build exactly 3 picks: 1 weapon (level-up biased), 1 passive, 1
   * stat/heal/evolution. Each slot falls back to a stat boost if its
   * preferred pool is empty.
   *
   * Time: O(W + P + E) where W/P/E are catalog sizes — all small constants.
   */
  private generateCards(): Card[] {
    return [
      this.weaponCard(),
      this.passiveCard(),
      this.bonusCard(),
    ];
  }

  private weaponCard(): Card {
    const levelable: Card[] = [];
    const fresh: Card[] = [];
    for (const w of allWeapons()) {
      const held = this.runState.weaponLevel(w.id);
      const meta = WEAPON_CARDS[w.id] ?? { element: 'physical' as const, attack: 4 };
      if (held >= 1 && held < 5) {
        levelable.push({
          id: `spoils:weapon:${w.id}:${held + 1}`,
          kind: 'weapon',
          title: w.displayName,
          detail: `LEVEL ${held + 1} · ${meta.detail ?? w.taglineShort}`,
          stats: { attack: meta.attack + 1, defense: meta.defense, element: meta.element, level: (held + 1) as 1 | 2 | 3 | 4 | 5 },
          iconKey: `sprite-icon-${w.id}`,
          apply: (s) => s.addOrLevelWeapon(w.id),
        });
      } else if (held === 0 && this.runState.weapons.length < 6) {
        fresh.push({
          id: `spoils:weapon:${w.id}`,
          kind: 'weapon',
          title: w.displayName,
          detail: `NEW · ${meta.detail ?? w.taglineShort}`,
          stats: { attack: meta.attack, defense: meta.defense, element: meta.element, level: 1 },
          iconKey: `sprite-icon-${w.id}`,
          apply: (s) => s.addOrLevelWeapon(w.id),
        });
      }
    }
    // Bias toward an existing weapon level-up — "spoils" should feel like
    // a power spike on a weapon you already invested in.
    const pool = levelable.length > 0 ? levelable : fresh;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return pick ?? this.statFallback();
  }

  private passiveCard(): Card {
    const candidates: Card[] = [];
    for (const p of allPassives()) {
      const held = this.runState.passiveLevel(p.id);
      const meta = PASSIVE_CARDS[p.id] ?? { element: 'physical' as const, defense: 3 };
      if (held === 0 && this.runState.passives.length < 6) {
        candidates.push({
          id: `spoils:passive:${p.id}`,
          kind: 'passive',
          title: p.displayName,
          detail: `NEW · ${meta.detail ?? p.taglineShort}`,
          stats: { attack: meta.attack, defense: meta.defense, element: meta.element, level: 1 },
          iconKey: `sprite-icon-${p.id}`,
          apply: (s) => s.addOrLevelPassive(p.id),
        });
      } else if (held >= 1 && held < 5) {
        candidates.push({
          id: `spoils:passive:${p.id}:${held + 1}`,
          kind: 'passive',
          title: p.displayName,
          detail: `LEVEL ${held + 1} · ${meta.detail ?? p.taglineShort}`,
          stats: { attack: meta.attack, defense: meta.defense + 1, element: meta.element, level: (held + 1) as 1 | 2 | 3 | 4 | 5 },
          iconKey: `sprite-icon-${p.id}`,
          apply: (s) => s.addOrLevelPassive(p.id),
        });
      }
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return pick ?? this.statFallback();
  }

  private bonusCard(): Card {
    const evo = findEligibleEvolution(this.runState);
    if (evo) {
      return {
        id: `spoils:evolution:${evo.id}`,
        kind: 'evolution',
        title: evo.displayName,
        detail: `EVOLUTION · ${evo.description}`,
        stats: { attack: 9, element: 'arcane', level: 5 },
        iconKey: `sprite-icon-${evo.sourceWeaponId}`,
        apply: (s) => { s.grantEvolution(evo.id); return true; },
      };
    }
    const roll = Math.random();
    if (roll < 0.5 && this.runState.hp < this.runState.maxHp) {
      return {
        id: 'spoils:heal-5',
        kind: 'heal',
        title: 'Captain’s Repair',
        detail: '+5 HP (capped at max).',
        stats: { defense: 5, element: 'arcane', level: 1 },
        apply: (s) => { s.heal(5); return true; },
      };
    }
    return this.statFallback();
  }

  private statFallback(): Card {
    return {
      id: 'spoils:stat-damage',
      kind: 'stat',
      title: 'Sharpened Steel',
      detail: '+1 base damage on all projectiles.',
      stats: { attack: 1, element: 'physical', level: 1 },
      apply: (s) => { s.baseDamage += 1; return true; },
    };
  }
}

