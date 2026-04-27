import type { CardElement } from '../ui/card';

/**
 * Per-passive card metadata — element, defense rating, optional flavour.
 * Mirror of `weapon-cards.ts`. Passives lean defensive so the rating
 * column shown on the card is `defense`, not `attack`.
 */

export interface PassiveCardMeta {
  element: CardElement;
  /** Display "defense" rating 1–10. */
  defense: number;
  /** Optional display attack (some passives boost offense). */
  attack?: number;
  detail?: string;
}

export const PASSIVE_CARDS: Record<string, PassiveCardMeta> = {
  'crows-nest':     { element: 'physical', defense: 1, attack: 3, detail: '+15% damage. Spotter on the rigging.' },
  'copper-hull':    { element: 'physical', defense: 6, detail: '−1 incoming damage. Hardier hull.' },
  'storm-compass':  { element: 'storm',    defense: 2, attack: 3, detail: '+20% crit chance.' },
  'powder-barrel':  { element: 'fire',     defense: 1, attack: 4, detail: '+25% AoE radius on splash hits.' },
  'first-mate':     { element: 'physical', defense: 2, attack: 3, detail: '+1 projectile on Bow Cannon + Broadside.' },
  'cargo-nets':     { element: 'earth',    defense: 3, detail: '+50% magnet radius. +1 coin on every drop.' },
  'spyglass':       { element: 'arcane',   defense: 2, attack: 2, detail: '+10% crit damage. Reveals off-screen.' },
  'admirals-flag':  { element: 'shadow',   defense: 3, attack: 2, detail: '+1 projectile across all weapons.' },
};
