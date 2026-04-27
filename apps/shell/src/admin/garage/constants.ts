import type {
  BulletKind,
  EnemyAttack,
  EnemyElement,
  EnemyKind,
  EnemySpec,
  EnvironmentBiome,
  EnvironmentWeather,
  PassiveId,
  PassiveSpec,
  StageSpawnMode,
  WavePattern,
  WeaponElement,
  WeaponId,
  WeaponSpec,
} from '@bilko/boat-shooter-schema';

// Mirror of the WeaponId / PassiveId unions in
// packages/boat-shooter-schema/src/weapon.ts. Hardcoded as a runtime list
// because TS string-literal unions aren't iterable at runtime.
export const WEAPON_IDS: ReadonlyArray<WeaponId> = [
  'bow-cannon',
  'broadside',
  'harpoon',
  'chain-lightning',
  'flamethrower',
  'lighthouse-beam',
  'mortar',
  'fire-arrow-rain',
  'kraken-ink',
  'spinning-axes',
  'homing-musket',
  'stern-mines',
  'ghost-crew',
];

export const PASSIVE_IDS: ReadonlyArray<PassiveId> = [
  'crows-nest',
  'copper-hull',
  'storm-compass',
  'powder-barrel',
  'first-mate',
  'cargo-nets',
  'spyglass',
  'admirals-flag',
];

// baselineDelta tunables — must match ShipBaselineDelta in
// packages/boat-shooter-schema/src/ship.ts.
export const BASELINE_DELTA_FIELDS = [
  { key: 'maxHp', label: 'Max HP', step: 1 },
  { key: 'speed', label: 'Speed', step: 5 },
  { key: 'accel', label: 'Accel', step: 5 },
  { key: 'iframeDurationMs', label: 'I-frame ms', step: 50 },
  { key: 'magnetRadius', label: 'Magnet radius', step: 5 },
  { key: 'coinValueMult', label: 'Coin × mult', step: 0.05 },
  { key: 'critChance', label: 'Crit chance', step: 0.01 },
  { key: 'critMultiplier', label: 'Crit mult', step: 0.05 },
] as const;

export type BaselineDeltaKey = typeof BASELINE_DELTA_FIELDS[number]['key'];

// Mirror of EnemyAttack['kind'] in packages/boat-shooter-schema/src/ability-map.ts.
// Hardcoded for runtime iteration in the kind picker.
export const ATTACK_KINDS: ReadonlyArray<EnemyAttack['kind']> = [
  'forward-fire',
  'aim-spread',
  'radial-burst',
  'mortar-arc',
];

export const BULLET_KINDS: ReadonlyArray<BulletKind> = [
  'musket', 'cannon', 'sniper', 'shadow',
  'venom', 'fire', 'frost', 'storm',
];

export const ENEMY_ELEMENTS: ReadonlyArray<EnemyElement> = [
  'physical', 'fire', 'storm', 'frost', 'earth', 'shadow',
];

export const ENEMY_KINDS: ReadonlyArray<EnemyKind> = [
  'fodder', 'standard', 'mini-boss', 'boss',
];

export const ENEMY_DEATH_STYLES: ReadonlyArray<NonNullable<EnemySpec['deathStyle']>> = [
  'pop', 'splinter', 'chain', 'cookoff', 'dissolve', 'splash', 'topple', 'sink',
];

export const ENEMY_NUMERIC_FIELDS = [
  { key: 'maxHp', label: 'Max HP', step: 1 },
  { key: 'armor', label: 'Armor', step: 1 },
  { key: 'speed', label: 'Speed', step: 5 },
  { key: 'contactDamage', label: 'Contact dmg', step: 1 },
  { key: 'collisionRadius', label: 'Collision r', step: 1 },
  { key: 'visualRadius', label: 'Visual r', step: 1 },
] as const;

export type EnemyNumericKey = typeof ENEMY_NUMERIC_FIELDS[number]['key'];

export const ENEMY_DROP_FIELDS = [
  { key: 'coinsSmall', label: 'Coins (small)', step: 1 },
  { key: 'coinsMedium', label: 'Coins (medium)', step: 1 },
  { key: 'coinsLarge', label: 'Coins (large)', step: 1 },
  { key: 'xpOrbs', label: 'XP orbs', step: 1 },
] as const;

export type EnemyDropKey = typeof ENEMY_DROP_FIELDS[number]['key'];

// Mirrors WavePattern in packages/boat-shooter-schema/src/stage.ts.
export const WAVE_PATTERNS: ReadonlyArray<WavePattern> = [
  'line', 'cluster', 'flank-left', 'flank-right',
  'v-formation', 'echelon', 'crossfire', 'staggered-line', 'boss',
];

export const STAGE_SPAWN_MODES: ReadonlyArray<StageSpawnMode> = [
  'waves', 'formula', 'both',
];

// Mirrors EnvironmentBiome / EnvironmentWeather in packages/boat-shooter-schema/src/environment.ts.
export const ENVIRONMENT_BIOMES: ReadonlyArray<EnvironmentBiome> = [
  'rivermouth', 'inland', 'delta', 'open-sea', 'cursed', 'volcanic', 'frozen', 'storm',
];

export const ENVIRONMENT_WEATHERS: ReadonlyArray<EnvironmentWeather> = [
  'clear', 'rain', 'storm', 'fog', 'ash', 'snow',
];

// Mirrors WeaponElement in packages/boat-shooter-schema/src/weapon.ts.
export const WEAPON_ELEMENTS: ReadonlyArray<WeaponElement> = [
  'fire', 'storm', 'frost', 'earth', 'shadow', 'physical', 'arcane', 'none',
];

export const WEAPON_TIERS: ReadonlyArray<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

// LevelCurve key whitelists — mirror the unions in WeaponSpec / PassiveSpec.
export const WEAPON_CURVE_KEYS: ReadonlyArray<
  Exclude<keyof NonNullable<WeaponSpec['curves']>, undefined>
> = ['damage', 'fireRateMs', 'pierce', 'speed', 'count', 'aoeRadius'];

export const PASSIVE_CURVE_KEYS: ReadonlyArray<
  Exclude<keyof NonNullable<PassiveSpec['curves']>, undefined>
> = [
  'magnetBonus', 'coinValueBonus', 'critChanceBonus', 'critMultBonus',
  'cooldownReduction', 'xpPercent', 'maxHpBonus', 'speedBonus', 'radiusPercent',
];
