/**
 * Five elemental starting ships + Random.
 *
 * Each config drives:
 *   - Visual identity (hull triad, sail color + emblem, figurehead, lantern).
 *   - Mechanical identity (starter weapon, starter passive, stat tweaks).
 *   - Signature skill-tree branch (data only — UI is a follow-up).
 *
 * Spec: docs/games/boat-shooter/21-starting-ships.md.
 */

export type ShipId =
  | 'ember-corsair'
  | 'tempest-fury'
  | 'frostbound'
  | 'verdant-tide'
  | 'nightwake';

export type ShipElement = 'fire' | 'storm' | 'frost' | 'earth' | 'shadow';

/** A skill-tree node. Data-only in this milestone. */
export interface SkillNode {
  id: string;
  title: string;
  desc: string;
  tier: 1 | 2 | 3;
  branch: 'A' | 'B' | 'C';
}

export interface ShipConfig {
  id: ShipId;
  displayName: string;
  element: ShipElement;
  emoji: string;
  flavor: string;
  /** Dark → mid → light hull triad. Used by Player.buildDetailedShip. */
  hullTriad: [number, number, number];
  /** Main sail tint. */
  sailColor: number;
  /** Per-ship sail emblem drawing kind. `Player` picks the draw routine. */
  sailEmblem: 'phoenix' | 'bolt' | 'snowflake' | 'oakleaf' | 'skull';
  /** Figurehead style — tiny graphic at the bow tip. */
  figurehead: 'flame-crest' | 'lightning-bolt' | 'crystal-shard' | 'wooden-boar' | 'skeletal-arm';
  /** Lantern glow color. */
  lanternColor: number;
  /** Wake tint when the ship cruises. */
  wakeColor: number;

  /** Starter weapon ID (see weapon-catalog.ts). */
  starterWeapon: string;
  /** Starter passive ID (see passive-catalog.ts). */
  starterPassive: string;

  /** Stat tweaks applied at RunState construction. */
  statTweaks: {
    baseDamageMult?: number;
    baseDamageFlat?: number;
    maxHpDelta?: number;
    speedDelta?: number;
    critChanceDelta?: number;
    critMultiplierDelta?: number;
    magnetRadiusDelta?: number;
  };

  /** Signature skill-tree branch — 9 nodes (3 branches × 3 tiers). */
  skillTree: {
    branchName: string;
    nodes: SkillNode[];
  };
}

const EMBER_CORSAIR: ShipConfig = {
  id: 'ember-corsair',
  displayName: 'The Ember Corsair',
  element: 'fire',
  emoji: '🔥',
  flavor: 'They burned three ships of the line and left the water boiling.',
  hullTriad: [0x1a0a04, 0xaa2810, 0xffb040],
  sailColor: 0xf07028,
  sailEmblem: 'phoenix',
  figurehead: 'flame-crest',
  lanternColor: 0xff8a3a,
  wakeColor: 0xff6a30,
  starterWeapon: 'flamethrower',
  starterPassive: 'crows-nest',
  statTweaks: { baseDamageMult: 1.1, maxHpDelta: -1 },
  skillTree: {
    branchName: 'Pyre',
    nodes: [
      { id: 'kiln-1', title: 'Soot Linings', desc: '+10% burn damage', tier: 1, branch: 'A' },
      { id: 'kiln-2', title: 'Blazewood Hull', desc: 'Enemies hit by Burn drop +1 coin', tier: 2, branch: 'A' },
      { id: 'kiln-3', title: 'Solar Furnace', desc: 'Burn ticks every 0.75s (was 1.0s)', tier: 3, branch: 'A' },
      { id: 'pyre-1', title: 'Spitfire', desc: 'Burn spreads to 1 adjacent enemy within 80 px', tier: 1, branch: 'B' },
      { id: 'pyre-2', title: 'Wildfire', desc: 'Spread radius 80 → 140 px', tier: 2, branch: 'B' },
      { id: 'pyre-3', title: 'Conflagration', desc: 'Burning deaths detonate (30 px, 3 dmg)', tier: 3, branch: 'B' },
      { id: 'ash-1', title: 'Scorch Ward', desc: '5% fire resistance; extinguish incoming Burn', tier: 1, branch: 'C' },
      { id: 'ash-2', title: 'Cinder Armor', desc: 'At HP ≤ 50%, radiate 2 dmg/s within 120 px', tier: 2, branch: 'C' },
      { id: 'ash-3', title: 'Forge Reborn', desc: 'Respawn once per stage at 50% HP', tier: 3, branch: 'C' },
    ],
  },
};

const TEMPEST_FURY: ShipConfig = {
  id: 'tempest-fury',
  displayName: 'The Tempest Fury',
  element: 'storm',
  emoji: '⚡',
  flavor: 'The storm follows her like a stray dog.',
  hullTriad: [0x0a1a3a, 0x2a3a6a, 0xb0c0d0],
  sailColor: 0xe0e8f0,
  sailEmblem: 'bolt',
  figurehead: 'lightning-bolt',
  lanternColor: 0xaaddff,
  wakeColor: 0xaaccff,
  starterWeapon: 'chain-lightning',
  starterPassive: 'storm-compass',
  statTweaks: { critChanceDelta: 0.05, speedDelta: 20 },
  skillTree: {
    branchName: 'Gale',
    nodes: [
      { id: 'spark-1', title: 'Arc Splitter', desc: '+1 chain target', tier: 1, branch: 'A' },
      { id: 'spark-2', title: 'Ionize', desc: 'Chains deal +0.5 dmg per hop', tier: 2, branch: 'A' },
      { id: 'spark-3', title: 'Thunderclap', desc: 'Every 6th chain triggers an 80 px shockwave (3 dmg)', tier: 3, branch: 'A' },
      { id: 'gale-1', title: 'Squall', desc: 'Chain hits apply 0.2 s stun', tier: 1, branch: 'B' },
      { id: 'gale-2', title: 'Hurricane', desc: 'Chain range 150 → 220 px', tier: 2, branch: 'B' },
      { id: 'gale-3', title: 'Eye of the Storm', desc: 'Storm cloud trails the ship with ambient zaps', tier: 3, branch: 'B' },
      { id: 'rime-1', title: 'Lightning Rod', desc: 'Enemy bullets within 60 px get zapped', tier: 1, branch: 'C' },
      { id: 'rime-2', title: 'Static Field', desc: 'Every 5 s of combat, 0.4 s iframe pulse', tier: 2, branch: 'C' },
      { id: 'rime-3', title: 'Tempest Mantle', desc: '-20% incoming non-physical damage', tier: 3, branch: 'C' },
    ],
  },
};

const FROSTBOUND: ShipConfig = {
  id: 'frostbound',
  displayName: 'The Frostbound',
  element: 'frost',
  emoji: '❄',
  flavor: 'Her cannons never fired hot iron. Only cold iron. Colder.',
  hullTriad: [0x4a6a80, 0x7a9aaa, 0xc4d8e4],
  sailColor: 0xf0f8ff,
  sailEmblem: 'snowflake',
  figurehead: 'crystal-shard',
  lanternColor: 0xaaeeff,
  wakeColor: 0xe8f8ff,
  starterWeapon: 'mortar',
  starterPassive: 'copper-hull',
  statTweaks: { maxHpDelta: 2, speedDelta: -20 },
  skillTree: {
    branchName: 'Rime',
    nodes: [
      { id: 'chill-1', title: 'Glacial Shells', desc: 'Mortar freeze chance 20% → 40%', tier: 1, branch: 'A' },
      { id: 'chill-2', title: 'Hoarfrost', desc: 'Frozen enemies take +25% damage', tier: 2, branch: 'A' },
      { id: 'chill-3', title: 'Absolute Zero', desc: 'Splash radius 80 → 120 px; pierces armor', tier: 3, branch: 'A' },
      { id: 'rime-1', title: 'Crystal Cracks', desc: 'Shatter reaction deals +1 dmg', tier: 1, branch: 'B' },
      { id: 'rime-2', title: 'Avalanche', desc: 'Mortar crit auto-triggers shatter', tier: 2, branch: 'B' },
      { id: 'rime-3', title: 'Glass Sea', desc: 'Frozen deaths drop a 3 s 40%-slow ice patch', tier: 3, branch: 'B' },
      { id: 'ward-1', title: 'Frost Armor', desc: 'iframes +0.2 s', tier: 1, branch: 'C' },
      { id: 'ward-2', title: 'Icecap', desc: 'At HP ≤ 50%: 80 px freeze aura (0.5 s/s)', tier: 2, branch: 'C' },
      { id: 'ward-3', title: 'Polar Keel', desc: 'Cold/water enemies deal -25% to you', tier: 3, branch: 'C' },
    ],
  },
};

const VERDANT_TIDE: ShipConfig = {
  id: 'verdant-tide',
  displayName: 'The Verdant Tide',
  element: 'earth',
  emoji: '🌿',
  flavor: 'She was born in a swamp and speaks the language of roots.',
  hullTriad: [0x2a4a18, 0x5a3a10, 0xd8c098],
  sailColor: 0xe8d8a0,
  sailEmblem: 'oakleaf',
  figurehead: 'wooden-boar',
  lanternColor: 0xffce5a,
  wakeColor: 0xaac868,
  starterWeapon: 'harpoon',
  starterPassive: 'spyglass',
  statTweaks: { baseDamageFlat: 0.5, magnetRadiusDelta: 20 },
  skillTree: {
    branchName: 'Grove',
    nodes: [
      { id: 'root-1', title: 'Barbed Shaft', desc: 'Pierce +1', tier: 1, branch: 'A' },
      { id: 'root-2', title: 'Snaring Rope', desc: 'Yanked enemies root for 0.5 s', tier: 2, branch: 'A' },
      { id: 'root-3', title: 'Boar Charge', desc: 'Every 3rd harpoon auto-crits', tier: 3, branch: 'A' },
      { id: 'grove-1', title: 'Green Rot', desc: 'Harpoon kills drop a 2 s 40%-slow patch', tier: 1, branch: 'B' },
      { id: 'grove-2', title: 'Verdant Sap', desc: '1% damage → HP (cap 1 HP / 3 s)', tier: 2, branch: 'B' },
      { id: 'grove-3', title: 'Heartwood', desc: 'Harpoon pierces armor fully', tier: 3, branch: 'B' },
      { id: 'drift-1', title: 'Dowsing Line', desc: '+20 px magnet radius', tier: 1, branch: 'C' },
      { id: 'drift-2', title: "Seafarer's Vow", desc: 'Start each stage with 1 map fragment', tier: 2, branch: 'C' },
      { id: 'drift-3', title: 'Groveheart', desc: 'Stage-clear heals +2 HP (was +1)', tier: 3, branch: 'C' },
    ],
  },
};

const NIGHTWAKE: ShipConfig = {
  id: 'nightwake',
  displayName: 'The Nightwake',
  element: 'shadow',
  emoji: '🌑',
  flavor: 'They never found her crew. Only the lanterns. Still lit.',
  hullTriad: [0x0a0a14, 0x2a1a4a, 0x7a9acc],
  sailColor: 0xb0b8c8,
  sailEmblem: 'skull',
  figurehead: 'skeletal-arm',
  lanternColor: 0xaaffcc,
  wakeColor: 0xaaeecc,
  starterWeapon: 'ghost-crew',
  starterPassive: 'admirals-flag',
  statTweaks: { maxHpDelta: -1, critMultiplierDelta: 0.25 },
  skillTree: {
    branchName: 'Shade',
    nodes: [
      { id: 'veil-1', title: 'Fade', desc: '+0.15 s iframes', tier: 1, branch: 'A' },
      { id: 'veil-2', title: 'Slipwake', desc: 'Dash leaves an afterimage that soaks 1 hit', tier: 2, branch: 'A' },
      { id: 'veil-3', title: 'Shadowcross', desc: 'No contact damage while moving >80% speed', tier: 3, branch: 'A' },
      { id: 'haunt-1', title: 'Spectral Shot', desc: 'Ghost crew fires 2 shots per volley', tier: 1, branch: 'B' },
      { id: 'haunt-2', title: 'Lifeline', desc: 'Kill: +1 temporary crew (5 s, max 3)', tier: 2, branch: 'B' },
      { id: 'haunt-3', title: 'Wailing Hour', desc: 'Every 30 s: free phantom broadside', tier: 3, branch: 'B' },
      { id: 'drain-1', title: 'Hungry Sails', desc: 'Kills grant +1 coin (multiplicative)', tier: 1, branch: 'C' },
      { id: 'drain-2', title: 'Soul Tally', desc: 'Every 30 kills: +1 HP', tier: 2, branch: 'C' },
      { id: 'drain-3', title: 'Pact of Fathoms', desc: 'Bosses drop +1 gem; unlocks haunted re-fight', tier: 3, branch: 'C' },
    ],
  },
};

export const SHIP_CONFIGS: Record<ShipId, ShipConfig> = {
  'ember-corsair': EMBER_CORSAIR,
  'tempest-fury': TEMPEST_FURY,
  'frostbound': FROSTBOUND,
  'verdant-tide': VERDANT_TIDE,
  'nightwake': NIGHTWAKE,
};

export const SHIP_IDS: readonly ShipId[] = [
  'ember-corsair', 'tempest-fury', 'frostbound', 'verdant-tide', 'nightwake',
];

export function getShipConfig(id: ShipId): ShipConfig {
  return SHIP_CONFIGS[id];
}

/** Roll a random real ship (never returns a sentinel). */
export function rollRandomShipId(): ShipId {
  const i = Math.floor(Math.random() * SHIP_IDS.length);
  return SHIP_IDS[i]!;
}
