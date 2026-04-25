/**
 * Meta-progression: 7 tracks × 10 levels. Each track spends gems (persistent
 * currency) for permanent stat boosts applied at run start.
 *
 * Cost curve (shared) from docs/games/boat-shooter/14-meta-progression.md:
 *   L1 5, L2 10, L3 20, L4 40, L5 80, L6 150, L7 280, L8 500, L9 800, L10 1200
 */

export type MetaTrackId =
  | 'hull'
  | 'engine'
  | 'cannons'
  | 'crew'
  | 'cargo'
  | 'luck'
  | 'reroll';

export const META_COSTS: readonly number[] = [0, 5, 10, 20, 40, 80, 150, 280, 500, 800, 1200];

export interface MetaTrackDef {
  id: MetaTrackId;
  displayName: string;
  tagline: string;
  /** Per-level human description for the shop UI. */
  levelDescription(level: number): string;
}

export const META_TRACKS: readonly MetaTrackDef[] = [
  {
    id: 'hull',
    displayName: 'Hull',
    tagline: 'Max HP + passive regen at L10.',
    levelDescription: (l) => (l < 10 ? `+${l} max HP (total ${6 + l})` : '+11 max HP, +0.5 HP/s regen when safe'),
  },
  {
    id: 'engine',
    displayName: 'Engine',
    tagline: 'Speed + acceleration; Burst Dash at L10.',
    levelDescription: (l) => (l < 10 ? `+${l * 4}% speed/accel` : '+50% speed, BURST DASH unlocked'),
  },
  {
    id: 'cannons',
    displayName: 'Cannons',
    tagline: 'Base damage + fire rate.',
    levelDescription: (l) => (l < 10 ? `+${l * 3}% base damage` : '+25% dmg + random starting passive each stage'),
  },
  {
    id: 'crew',
    displayName: 'Crew',
    tagline: 'Crit chance + crit multiplier.',
    levelDescription: (l) => (l < 10 ? `+${l * 2}% crit, +${l * 0.05}× crit mult` : '+10% crit, +0.3× mult, +1 projectile all weapons'),
  },
  {
    id: 'cargo',
    displayName: 'Cargo',
    tagline: 'Magnet radius + coin value.',
    levelDescription: (l) => (l < 5 ? `+${l * 10}% magnet` : l < 10 ? `+${l * 15}% magnet, +${(l - 4) * 8}% coin` : '+50% magnet, +40% coin, +1 gem per stage clear'),
  },
  {
    id: 'luck',
    displayName: 'Luck',
    tagline: 'Rare drop shift.',
    levelDescription: (l) => (l < 10 ? `+${l * 5}% luck` : '+50% luck, guaranteed Gold Chest per stage'),
  },
  {
    id: 'reroll',
    displayName: 'Reroll',
    tagline: 'Merchant + level-up reroll.',
    levelDescription: (l) => (l < 10 ? `-${l * 5}% reroll cost, ${Math.min(l, 3)} free rerolls` : 'Infinite free rerolls + BANISH'),
  },
];

export type MetaLevels = Record<MetaTrackId, number>;

export const DEFAULT_META_LEVELS: MetaLevels = {
  hull: 0, engine: 0, cannons: 0, crew: 0, cargo: 0, luck: 0, reroll: 0,
};

export function costOfNext(level: number): number | null {
  if (level >= 10) return null;
  return META_COSTS[level + 1] ?? null;
}

/** Apply meta-track levels to a fresh run (called by StageScene init). */
export function applyMetaToRun(state: {
  maxHpBase?: number;
  hpFlatBonus: number;
  speed: number;
  accel: number;
  baseDamage: number;
  critChance: number;
  critMultiplier: number;
  magnetRadius: number;
  coinValueMult: number;
}, levels: MetaLevels): void {
  // Hull.
  state.hpFlatBonus = levels.hull;
  // Engine.
  if (levels.engine > 0) {
    const mult = 1 + levels.engine * 0.04;
    state.speed *= mult;
    state.accel *= mult;
  }
  // Cannons — +3% base damage per level (cumulative additive).
  if (levels.cannons > 0) {
    state.baseDamage += levels.cannons * 0.03;
  }
  // Crew.
  if (levels.crew > 0) {
    state.critChance += levels.crew * 0.02;
    state.critMultiplier += levels.crew * 0.05;
  }
  // Cargo.
  if (levels.cargo > 0) {
    state.magnetRadius *= 1 + Math.min(5, levels.cargo) * 0.1;
    state.coinValueMult *= 1 + Math.max(0, levels.cargo - 4) * 0.08;
  }
}

/** Luck applied separately — lifted outside RunState for drop calculations. */
export function luckFromMeta(levels: MetaLevels): number {
  return levels.luck * 0.05;
}
