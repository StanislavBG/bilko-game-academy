import type { CardElement } from '../ui/card';

/**
 * Per-weapon card metadata — element, attack rating, defense rating.
 * Pulled at card-build time so the playing-card UI shows consistent
 * stats without each weapon class having to know about cards.
 *
 * Values are *display* numbers — not the live combat math, just a
 * coarse rating that tells the player "this is a high-attack card."
 * The actual gameplay numbers live in each weapon's `configFor(level)`.
 */

export interface WeaponCardMeta {
  element: CardElement;
  /** Display "attack" rating 1–10. */
  attack: number;
  /** Optional display defense (lighthouse beam = passive shield etc.). */
  defense?: number;
  /** Detail line shown on the card body (overrides taglineShort if set). */
  detail?: string;
}

export const WEAPON_CARDS: Record<string, WeaponCardMeta> = {
  'bow-cannon':       { element: 'physical', attack: 4, detail: 'Reliable forward volley.' },
  'broadside':        { element: 'physical', attack: 6, detail: 'Both flanks fire at once. BOOM-BOOM.' },
  'harpoon':          { element: 'earth',    attack: 5, detail: 'Slow, piercing — yanks small foes in.' },
  'chain-lightning':  { element: 'storm',    attack: 5, detail: 'Zaps the nearest, then chains.' },
  'flamethrower':     { element: 'fire',     attack: 7, detail: 'Forward cone. Burn DoT.' },
  'lighthouse-beam':  { element: 'arcane',   attack: 4, defense: 1, detail: 'Rotating beam sweeps 360°.' },
  'mortar':           { element: 'physical', attack: 8, detail: 'Arc shells with splash.' },
  'fire-arrow-rain':  { element: 'fire',     attack: 6, detail: 'Zone shower; lingering burn patches.' },
  'kraken-ink':       { element: 'shadow',   attack: 4, defense: 1, detail: 'Aura: slow + poison enemies in cloud.' },
  'spinning-axes':    { element: 'physical', attack: 5, defense: 2, detail: 'Orbital melee shield.' },
  'homing-musket':    { element: 'physical', attack: 5, detail: 'Burst of seeking shots.' },
  'stern-mines':      { element: 'fire',     attack: 6, detail: 'Drop-behind explosive trap.' },
  'ghost-crew':       { element: 'shadow',   attack: 5, detail: 'Spectral crew volleys.' },
};
