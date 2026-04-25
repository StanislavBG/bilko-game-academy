/**
 * Passive catalog. Effects are applied by:
 *   - battle.ts `damageMultiplier` for damage-% passives
 *   - various systems (collision, pickup, cooldowns) reading passive levels
 *
 * All 8 P2 passives below; evolutions come in P3.
 */
export interface PassiveDefinition {
  id: string;
  displayName: string;
  taglineShort: string;
}

export const PASSIVE_DEFS: Record<string, PassiveDefinition> = {
  'crows-nest': {
    id: 'crows-nest',
    displayName: "Crow's Nest",
    taglineShort: '+10/18/25/32/40% damage (all weapons).',
  },
  'copper-hull': {
    id: 'copper-hull',
    displayName: 'Copper Hull',
    taglineShort: '-1/-1/-1/-2/-2 dmg taken; +0.1..+0.5s iframe.',
  },
  'storm-compass': {
    id: 'storm-compass',
    displayName: 'Storm Compass',
    taglineShort: '+15/25/35/50/65% lightning dmg; +chains.',
  },
  'powder-barrel': {
    id: 'powder-barrel',
    displayName: 'Powder Barrel',
    taglineShort: '+15/25/35/50/65% explosive dmg; +radius.',
  },
  'first-mate': {
    id: 'first-mate',
    displayName: 'First Mate',
    taglineShort: '-8/-14/-20/-28/-38% cooldown.',
  },
  'cargo-nets': {
    id: 'cargo-nets',
    displayName: 'Cargo Nets',
    taglineShort: '+30..120% magnet; +10..50% coin value.',
  },
  'spyglass': {
    id: 'spyglass',
    displayName: 'Spyglass',
    taglineShort: '+10..50% crit chance; +20..100% crit mult.',
  },
  'admirals-flag': {
    id: 'admirals-flag',
    displayName: "Admiral's Flag",
    taglineShort: '+15..75% XP; -10..50% reroll cost.',
  },
};

export function allPassives(): PassiveDefinition[] {
  return Object.values(PASSIVE_DEFS);
}

/** Per-level tables used by systems to look up a passive's effect. */
export const PASSIVE_TIERS = {
  'crows-nest': { damagePercent: [0, 0.10, 0.18, 0.25, 0.32, 0.40] },
  'copper-hull': {
    dmgReduction: [0, 1, 1, 1, 2, 2], // flat
    iframeBonusMs: [0, 100, 100, 200, 300, 500],
    negateChance: [0, 0, 0, 0, 0, 0.10],
  },
  'storm-compass': {
    lightningPercent: [0, 0.15, 0.25, 0.35, 0.50, 0.65],
    bonusChains: [0, 1, 1, 2, 3, 4],
  },
  'powder-barrel': {
    explosivePercent: [0, 0.15, 0.25, 0.35, 0.50, 0.65],
    radiusPercent: [0, 0.10, 0.15, 0.20, 0.25, 0.35],
  },
  'first-mate': {
    cooldownReduction: [0, 0.08, 0.14, 0.20, 0.28, 0.38],
  },
  'cargo-nets': {
    magnetBonus: [0, 0.30, 0.45, 0.60, 0.80, 1.20],
    coinValueBonus: [0, 0.10, 0.15, 0.25, 0.35, 0.50],
  },
  'spyglass': {
    critChanceBonus: [0, 0.10, 0.18, 0.25, 0.35, 0.50],
    critMultBonus: [0, 0.20, 0.35, 0.50, 0.75, 1.00],
  },
  'admirals-flag': {
    xpPercent: [0, 0.15, 0.25, 0.40, 0.55, 0.75],
    rerollCostReduction: [0, 0.10, 0.20, 0.30, 0.40, 0.50],
  },
} as const;
