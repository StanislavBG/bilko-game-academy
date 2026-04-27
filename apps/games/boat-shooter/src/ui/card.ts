import type { RunState } from '../run-state';

/**
 * Card system — playing-card metaphor for boons / shop stock / boss
 * spoils. Replaces the 3 near-identical interfaces (`Pick`, `StockItem`,
 * `MerchantStockItem`) with one unified shape. Stats are optional so a
 * "Heal" or "Reroll" card can omit attack/defense.
 *
 * One Card = one rendered `CardView`. The Card carries:
 *   - identity (id, kind, title, detail)
 *   - playing-card stats (attack, defense, element, level)
 *   - economy (costCoins) and input (hotkey)
 *   - effect (apply: returns true if applied successfully)
 *
 * Rendering lives in `card-view.ts`. Composition (which cards to offer)
 * lives in the consuming scene (LevelUpScene, MerchantScene, BossSpoilsScene).
 */

export type CardElement =
  | 'fire' | 'storm' | 'frost' | 'earth' | 'shadow'
  | 'physical' | 'arcane' | 'none';

export interface CardStats {
  /** Displayed damage / impact rating. Optional — heals don't have it. */
  attack?: number | undefined;
  /** Displayed defense / shield rating. Optional. */
  defense?: number | undefined;
  /** Chromatic family — drives card title-bar tint + element badge. */
  element: CardElement;
  /** Level pip — `1..5`. Cards always carry a level even if static
   *  (`stat`/`heal` cards default to L1 — feels good in pip rows). */
  level: 1 | 2 | 3 | 4 | 5;
}

export type CardKind =
  | 'weapon'      // grant new weapon OR level-up existing
  | 'passive'     // grant new passive OR level-up
  | 'stat'        // permanent stat boost
  | 'heal'        // HP restore
  | 'evolution'   // unlock evolved weapon
  | 'reroll';     // reroll the offer pool (merchant + level-up)

export interface Card {
  /** Stable identifier (used for de-dupe, save state, leaderboard). */
  id: string;
  kind: CardKind;
  title: string;
  /** One- or two-sentence pitch. */
  detail: string;
  stats: CardStats;
  /** Coin cost — only set for merchant stock cards. Level-up + boss
   *  spoils cards omit it. */
  costCoins?: number | undefined;
  /** Keyboard hotkey badge (Q W E R for slots 1–4, T for reroll). */
  hotkey?: 'Q' | 'W' | 'E' | 'R' | 'T' | undefined;
  /** Optional UI sprite key like `sprite-icon-bow-cannon`. */
  iconKey?: string | undefined;
  /** Effect — returns true if successfully applied (e.g., HP not full). */
  apply: (run: RunState) => boolean;
}

/** Card title-bar / element-badge color per element family. */
export const CARD_ELEMENT_COLOR: Record<CardElement, number> = {
  fire:    0xff7028,
  storm:   0x6aa8ff,
  frost:   0x9be0ff,
  earth:   0x8aa040,
  shadow:  0xa080cc,
  arcane:  0xcc88ff,
  physical:0x9a9aaa,
  none:    0xc79448,
};

/** Element label for display under the badge. */
export const CARD_ELEMENT_LABEL: Record<CardElement, string> = {
  fire: 'Fire',
  storm: 'Storm',
  frost: 'Frost',
  earth: 'Earth',
  shadow: 'Shadow',
  arcane: 'Arcane',
  physical: 'Physical',
  none: '—',
};
