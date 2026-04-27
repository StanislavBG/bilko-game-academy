import Phaser from 'phaser';
import { RunState } from '../run-state';
import { allWeapons } from '../weapons/weapon-catalog';
import { allPassives } from '../weapons/passive-catalog';
import { CardView } from '../ui/card-view';
import type { Card } from '../ui/card';
import { WEAPON_CARDS } from '../data/weapon-cards';
import { PASSIVE_CARDS } from '../data/passive-cards';

/**
 * Pause overlay shown when the player levels up. Offers 3 picks drawn
 * from: available weapons (can level), available passives (can level),
 * a small stat boost, and a heal. Resumes the stage on selection.
 *
 * Cards rendered via the shared `CardView` (PRD 6) — same component
 * used by MerchantScene + BossSpoilsScene. Hotkeys Q/W/E (PRD 5)
 * select slots 1/2/3.
 */
export class LevelUpScene extends Phaser.Scene {
  static readonly KEY = 'LevelUpScene';

  private runState!: RunState;
  private stageKey!: string;
  private cardViews: CardView[] = [];

  constructor() {
    super({ key: LevelUpScene.KEY });
  }

  init(data: { runState: RunState; stageKey: string }): void {
    this.runState = data.runState;
    this.stageKey = data.stageKey;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.fadeIn(220, 0, 0, 0);

    // Darken underlying scene.
    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0, 0);

    // Title.
    this.add.text(W / 2, H * 0.2, 'LEVEL UP', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '72px',
      color: '#e0b063',
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);

    this.add.text(W / 2, H * 0.2 + 60, `Level ${this.runState.level}`, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '28px',
      color: '#cce4ea',
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);

    // Generate 3 cards via the shared Card system.
    const cards = this.generateCards(3);
    const HOTKEYS: Array<'Q' | 'W' | 'E'> = ['Q', 'W', 'E'];
    cards.forEach((card, i) => {
      card.hotkey = HOTKEYS[i];
    });

    // Layout — 3 cards in a row.
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

    // Hotkey input — Q/W/E pick slots 1/2/3.
    this.input.keyboard?.on('keydown-Q', () => this.cardViews[0]?.trigger());
    this.input.keyboard?.on('keydown-W', () => this.cardViews[1]?.trigger());
    this.input.keyboard?.on('keydown-E', () => this.cardViews[2]?.trigger());

    // Footer hint.
    this.add.text(W / 2, H * 0.92, 'Press Q / W / E or click to choose', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '15px',
      color: '#99c9d6',
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);
  }

  private commit(card: Card): boolean {
    card.apply(this.runState);
    this.scene.stop();
    this.scene.resume(this.stageKey);
    return true;
  }

  private generateCards(n: number): Card[] {
    const options: Card[] = [];

    // Weapons — new or levelable.
    for (const w of allWeapons()) {
      const held = this.runState.weaponLevel(w.id);
      const meta = WEAPON_CARDS[w.id] ?? { element: 'physical' as const, attack: 4 };
      if (held === 0 && this.runState.weapons.length < 6) {
        options.push({
          id: `weapon:${w.id}`,
          kind: 'weapon',
          title: w.displayName,
          detail: `NEW · ${meta.detail ?? w.taglineShort}`,
          stats: { attack: meta.attack, defense: meta.defense, element: meta.element, level: 1 },
          iconKey: `sprite-icon-${w.id}`,
          apply: (s) => s.addOrLevelWeapon(w.id),
        });
      } else if (held >= 1 && held < 5) {
        options.push({
          id: `weapon:${w.id}:${held + 1}`,
          kind: 'weapon',
          title: w.displayName,
          detail: `LEVEL ${held + 1} · ${meta.detail ?? w.taglineShort}`,
          stats: { attack: meta.attack + 1, defense: meta.defense, element: meta.element, level: (held + 1) as 1 | 2 | 3 | 4 | 5 },
          iconKey: `sprite-icon-${w.id}`,
          apply: (s) => s.addOrLevelWeapon(w.id),
        });
      }
    }

    // Passives — new or levelable.
    for (const p of allPassives()) {
      const held = this.runState.passiveLevel(p.id);
      const meta = PASSIVE_CARDS[p.id] ?? { element: 'physical' as const, defense: 3 };
      if (held === 0 && this.runState.passives.length < 6) {
        options.push({
          id: `passive:${p.id}`,
          kind: 'passive',
          title: p.displayName,
          detail: `NEW · ${meta.detail ?? p.taglineShort}`,
          stats: { attack: meta.attack, defense: meta.defense, element: meta.element, level: 1 },
          iconKey: `sprite-icon-${p.id}`,
          apply: (s) => s.addOrLevelPassive(p.id),
        });
      } else if (held >= 1 && held < 5) {
        options.push({
          id: `passive:${p.id}:${held + 1}`,
          kind: 'passive',
          title: p.displayName,
          detail: `LEVEL ${held + 1} · ${meta.detail ?? p.taglineShort}`,
          stats: { attack: meta.attack, defense: meta.defense + 1, element: meta.element, level: (held + 1) as 1 | 2 | 3 | 4 | 5 },
          iconKey: `sprite-icon-${p.id}`,
          apply: (s) => s.addOrLevelPassive(p.id),
        });
      }
    }

    // Heal — always offered.
    options.push({
      id: 'heal-3',
      kind: 'heal',
      title: 'Repair Kit',
      detail: '+3 HP (capped at max).',
      stats: { defense: 3, element: 'arcane', level: 1 },
      apply: (s) => { s.heal(3); return true; },
    });

    // Stat boost.
    options.push({
      id: 'stat-damage',
      kind: 'stat',
      title: 'Sharpened Steel',
      detail: '+1 base damage on all projectiles.',
      stats: { attack: 1, element: 'physical', level: 1 },
      apply: (s) => { s.baseDamage += 1; return true; },
    });

    Phaser.Utils.Array.Shuffle(options);
    return options.slice(0, n);
  }
}
