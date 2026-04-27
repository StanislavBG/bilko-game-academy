/**
 * Enemy schema.
 *
 * The runtime keeps Phaser-aware classes; this schema captures only the
 * *data* every enemy needs (stats, drops, element). The runtime maps from
 * `EnemyId` → concrete class via a factory.
 */

/** Every spawnable enemy id — kept in lockstep with the runtime factory. */
export type EnemyId =
  | 'scout-skiff'
  | 'patrol-gunboat'
  | 'ramming-brigand'
  | 'mortar-barge'
  | 'bank-sniper-tower'
  | 'broadside-cutter'
  | 'grappling-boarders'
  | 'powder-keg-kamikaze'
  | 'ghost-ship'
  | 'sea-serpent'
  | 'kraken-tentacle'
  | 'cursed-swarm'
  | 'bank-bandits'
  | 'mine-layer'
  | 'frigate-captain'
  | 'pirate-champion'
  | 'delta-commodore'
  | 'pirate-king'
  | 'ghost-commodore'
  | 'drowned-admiralty'
  | 'obsidian-warlord'
  | 'banshee-galleon'
  | 'kraken-ancient'
  | 'river-fisher-skiff'
  | 'river-fisher-trawler'
  | 'river-fisher-junk'
  | 'river-skiff-bandits'
  | 'tax-collector-barge'
  | 'floating-mine-cluster';

export type EnemyElement =
  | 'physical' | 'fire' | 'storm' | 'frost' | 'earth' | 'shadow';

export type EnemyKind = 'fodder' | 'standard' | 'mini-boss' | 'boss';

export interface EnemyDrops {
  coinsSmall: number;
  coinsMedium: number;
  coinsLarge: number;
  /** 0..1 — probability of a gem drop. */
  gemChance: number;
  xpOrbs: number;
}

export interface EnemySpec {
  id: EnemyId;
  kind: EnemyKind;
  /** Base HP. Bosses use ≥ 60 by convention. */
  maxHp: number;
  armor: number;
  /** Linear speed in px/sec. */
  speed: number;
  contactDamage: number;
  collisionRadius: number;
  drops: EnemyDrops;
  element: EnemyElement;
  /** Numeric color, e.g. 0xc85a2e. Stored as number for direct Phaser use. */
  color: number;
  visualRadius: number;
  /** Override sprite scale (overrides the kind-default in the runtime). */
  spriteScale?: number;
  /** Show the aim-reticle tell — fodder usually `false`. */
  showAimReticle?: boolean;
  /** Death animation hint. Mirrors the runtime's per-class signature deaths
   *  (pop/splinter/chain/cookoff/dissolve/splash/topple). `sink` is kept as
   *  an alias the loader can normalize to `splash` for water-themed enemies. */
  deathStyle?:
    | 'pop'
    | 'splinter'
    | 'chain'
    | 'cookoff'
    | 'dissolve'
    | 'splash'
    | 'topple'
    | 'sink';
}
