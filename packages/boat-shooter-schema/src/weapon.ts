/**
 * Weapon + passive schemas.
 *
 * The runtime owns the firing implementation; this schema captures the
 * declarative metadata: id, display, level curve, evolution pair, card
 * presentation. The admin app reads/writes these without touching code.
 */

export type WeaponId =
  | 'bow-cannon'
  | 'broadside'
  | 'harpoon'
  | 'chain-lightning'
  | 'flamethrower'
  | 'lighthouse-beam'
  | 'mortar'
  | 'fire-arrow-rain'
  | 'kraken-ink'
  | 'spinning-axes'
  | 'homing-musket'
  | 'stern-mines'
  | 'ghost-crew';

export type PassiveId =
  | 'crows-nest'
  | 'copper-hull'
  | 'storm-compass'
  | 'powder-barrel'
  | 'first-mate'
  | 'cargo-nets'
  | 'spyglass'
  | 'admirals-flag';

export type WeaponElement =
  | 'fire' | 'storm' | 'frost' | 'earth' | 'shadow' | 'physical' | 'arcane' | 'none';

/** Per-level numeric tweaks. Length is always 6 (index 0 = "not owned"). */
export type LevelCurve<K extends string> = Partial<Record<K, readonly number[]>>;

export interface WeaponSpec {
  id: WeaponId;
  displayName: string;
  taglineShort: string;
  element: WeaponElement;
  /** Card-render attack badge (1..5 stars). */
  attackTier: 1 | 2 | 3 | 4 | 5;
  /** Numeric per-level curves — keyed by tunable name. */
  curves?: LevelCurve<'damage' | 'fireRateMs' | 'pierce' | 'speed' | 'count' | 'aoeRadius'>;
}

export interface PassiveSpec {
  id: PassiveId;
  displayName: string;
  taglineShort: string;
  element: WeaponElement;
  /** Card-render defense badge (1..5 stars). */
  defenseTier: 1 | 2 | 3 | 4 | 5;
  /** Numeric per-level curves — keyed by tunable name. */
  curves?: LevelCurve<'magnetBonus' | 'coinValueBonus' | 'critChanceBonus' | 'critMultBonus' | 'cooldownReduction' | 'xpPercent' | 'maxHpBonus' | 'speedBonus' | 'radiusPercent'>;
}

export interface EvolutionPair {
  /** Result weapon id (the evolved form). */
  result: string;
  /** Required weapon at L5. */
  weapon: WeaponId;
  /** Required passive at L5. */
  passive: PassiveId;
}
