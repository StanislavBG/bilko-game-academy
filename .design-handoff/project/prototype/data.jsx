// Static data — Player app + Admin app (config governance).
const STAGES = [
  { n: 1,  id: 'rivermouth',         name: 'Rivermouth',          act: 1, biome: 'Sunlit Delta',   tagline: 'A gentle current. Pirate skiffs scout the mouth.', enemies: ['skiff','kamikaze'], duration: 90 },
  { n: 2,  id: 'inland-channels',    name: 'Inland Channels',     act: 1, biome: 'Sunlit Delta',   tagline: 'Reedy bends. Watch for ramming kamikazes.', enemies: ['kamikaze','gunboat'], duration: 110 },
  { n: 3,  id: 'delta-fleet',        name: 'The Delta Fleet',     act: 1, biome: 'Sunlit Delta',   tagline: 'Three formations, one frigate.', enemies: ['gunboat','frigate'], duration: 130 },
  { n: 4,  id: 'smugglers-cove',     name: "Smuggler's Cove",     act: 1, biome: 'Sunlit Delta',   tagline: 'Hidden chests. Ambush volleys.', enemies: ['skiff','sniper'], duration: 130 },
  { n: 5,  id: 'red-harbor',         name: 'Red Harbor',          act: 1, biome: 'Sunlit Delta',   tagline: 'Boss — Admiral Scurvy.', boss: 'Admiral Scurvy', enemies: ['boss-pirate-king'], duration: 180 },
  { n: 6,  id: 'fog-bay',            name: 'Fog Bay',             act: 2, biome: 'Cursed Fog',     tagline: 'Visibility drops. Things drift.', enemies: ['ghost-skiff','swarm'], duration: 140 },
  { n: 7,  id: 'cursed-passage',     name: 'Cursed Passage',      act: 2, biome: 'Cursed Fog',     tagline: 'Drowned cannon. Listen for the bell.', enemies: ['drowned-cannon','swarm'], duration: 150 },
  { n: 8,  id: 'hallowed-waters',    name: 'Hallowed Waters',     act: 2, biome: 'Cursed Fog',     tagline: 'Boss — the Ghost Commodore.', boss: 'Ghost Commodore', enemies: ['boss-ghost'], duration: 200 },
  { n: 9,  id: 'serpent-narrows',    name: 'Serpent Narrows',     act: 2, biome: 'Cursed Fog',     tagline: 'A wake that follows you.', enemies: ['ghost-skiff','sniper'], duration: 150 },
  { n: 10, id: 'drowned-anchorage',  name: 'Drowned Anchorage',   act: 2, biome: 'Cursed Fog',     tagline: 'Act II finale.', boss: 'Drowned Admiralty', enemies: ['boss-drowned'], duration: 220 },
  { n: 11, id: 'ashfall',            name: 'Ashfall',             act: 3, biome: 'Volcanic Reach', tagline: 'Hot embers on the deck.', enemies: ['ember-skiff','warlord-skiff'], duration: 160 },
  { n: 12, id: 'haunted-crater',     name: 'Haunted Crater',      act: 3, biome: 'Volcanic Reach', tagline: 'Boss — Banshee Galleon.', boss: 'Banshee Galleon', enemies: ['boss-banshee'], duration: 220 },
  { n: 13, id: 'obsidian-plateau',   name: 'Obsidian Plateau',    act: 3, biome: 'Volcanic Reach', tagline: 'Boss — Obsidian Warlord.', boss: 'Obsidian Warlord', enemies: ['boss-obsidian'], duration: 230 },
  { n: 14, id: 'final-gauntlet',     name: 'Final Gauntlet',      act: 3, biome: 'Volcanic Reach', tagline: 'Every fleet, all at once.', enemies: ['skiff','gunboat','frigate','ghost-skiff','ember-skiff'], duration: 280 },
  { n: 15, id: 'kraken-bay',         name: 'Kraken Bay',          act: 3, biome: 'Volcanic Reach', tagline: 'Final — the Kraken Ancient.', boss: 'Kraken Ancient', enemies: ['boss-kraken'], duration: 320 },
];

const ACTS = [
  { n: 1, name: 'Sunlit Delta',   color: 'var(--act-1-warm)',  bg: 'var(--act-1-bg)',  blurb: 'Warm tropics, navy patrols, pirate skiffs.' },
  { n: 2, name: 'Cursed Fog',     color: 'var(--act-2-cool)',  bg: 'var(--act-2-bg)',  blurb: 'Cold mist. Translucent ships. Listen close.' },
  { n: 3, name: 'Volcanic Reach', color: 'var(--act-3-ember)', bg: 'var(--act-3-bg)',  blurb: 'Black water, ember hulls, the Kraken below.' },
];

const META_TRACKS = [
  { id: 'hull',    name: 'Hull',    icon: 'shield',  blurb: 'More health. Regen at level 10.' },
  { id: 'engine',  name: 'Engine',  icon: 'wind',    blurb: 'Faster turns. Burst dash at 10.' },
  { id: 'cannons', name: 'Cannons', icon: 'flame',   blurb: 'More damage on every shot.' },
  { id: 'crew',    name: 'Crew',    icon: 'star',    blurb: 'Bigger, more frequent crits.' },
  { id: 'cargo',   name: 'Cargo',   icon: 'coin',    blurb: 'Pulls coins. Worth more, too.' },
  { id: 'luck',    name: 'Luck',    icon: 'clover',  blurb: 'Rarer drops appear more often.' },
  { id: 'reroll',  name: 'Reroll',  icon: 'dice',    blurb: 'Cheaper, freer rerolls at the merchant.' },
];
const META_COSTS = [0, 5, 10, 20, 40, 80, 150, 280, 500, 800, 1200];

const ACHIEVEMENTS = [
  { id: 'first-blood',     title: 'First Blood',          detail: 'Destroy your first enemy.',         group: 'Combat',     earned: true },
  { id: 'first-crit',      title: 'Dead Aim',             detail: 'Land your first critical hit.',     group: 'Combat',     earned: true },
  { id: 'kill-1000',       title: 'Scourge of the River', detail: 'Destroy 1,000 enemies lifetime.',   group: 'Combat',     earned: true },
  { id: 'combo-100',       title: 'Chained Fury',         detail: 'Reach a 100-kill combo.',           group: 'Combat',     earned: false },
  { id: 'electrocute-10',  title: 'Grounded',             detail: 'Trigger Electrocute 10 times.',     group: 'Combat',     earned: true },
  { id: 'cataclysm',       title: 'Cataclysmic',          detail: 'Trigger Cataclysm.',                group: 'Combat',     earned: false },
  { id: 'first-evo',       title: 'Evolved',              detail: 'Evolve your first weapon.',         group: 'Mastery',    earned: true },
  { id: 'all-evolutions',  title: 'Apex',                 detail: 'Evolve every weapon at least once.',group: 'Mastery',    earned: false },
  { id: 'shatter-boss',    title: 'Shatter Shot',         detail: 'Shatter a boss.',                   group: 'Mastery',    earned: false },
  { id: 'supernova-boss',  title: 'Stellar',              detail: 'Supernova a boss.',                 group: 'Mastery',    earned: false },
  { id: 'act-i',           title: 'Master of the Delta',  detail: 'Clear Act I.',                      group: 'Progression',earned: true },
  { id: 'act-ii',          title: 'Through the Fog',      detail: 'Clear Act II.',                     group: 'Progression',earned: false },
  { id: 'act-iii',         title: 'Tamed the Volcano',    detail: 'Clear Act III.',                    group: 'Progression',earned: false },
  { id: 'clear-normal',    title: 'River Legend',         detail: 'Complete the campaign.',            group: 'Progression',earned: false },
  { id: 'boss-frigate',    title: 'Down Goes the Frigate',detail: 'Defeat HMS Thunderstrike.',         group: 'Bosses',     earned: true },
  { id: 'boss-pirate-king',title: 'Regicide',             detail: 'Defeat Admiral Scurvy.',            group: 'Bosses',     earned: true },
  { id: 'boss-ghost-commodore', title: 'Exorcism',        detail: 'Defeat the Ghost Commodore.',       group: 'Bosses',     earned: false },
  { id: 'boss-kraken',     title: 'Kraken Slayer',        detail: 'Defeat the Kraken Ancient.',        group: 'Bosses',     earned: false },
  { id: '100-gems-run',    title: 'Treasure Hoard',       detail: 'Collect 100 gems in a run.',        group: 'Collection', earned: true },
];

const HULL_VARIANTS  = ['default', 'oak', 'ebony', 'crimson', 'gold', 'obsidian'];
const SAILS_VARIANTS = ['anchor', 'skull', 'rose', 'compass', 'phoenix'];

// Ships — Admin-configurable, player-selectable.
const SHIPS = [
  { id: 'ember-corsair', name: 'Ember Corsair', tagline: 'Balanced cutter, fire-weighted cannons.', stats: { hull: 3, speed: 3, cannons: 4, luck: 2 }, unlocked: true,  isDefault: true,  baseHp: 60, baseSpeed: 220, fireRate: 1.0 },
  { id: 'tempest-fury',  name: 'Tempest Fury',  tagline: 'Storm-tossed schooner. Fast & electric.', stats: { hull: 2, speed: 5, cannons: 3, luck: 3 }, unlocked: true,  isDefault: false, baseHp: 45, baseSpeed: 290, fireRate: 1.2 },
  { id: 'frostbound',    name: 'Frostbound',    tagline: 'Icebreaker hull, slow but sturdy.',       stats: { hull: 5, speed: 1, cannons: 3, luck: 2 }, unlocked: true,  isDefault: false, baseHp: 95, baseSpeed: 160, fireRate: 0.85 },
  { id: 'verdant-tide',  name: 'Verdant Tide',  tagline: 'Reef-runner. Lucky drops.',                stats: { hull: 3, speed: 3, cannons: 2, luck: 5 }, unlocked: false, isDefault: false, unlockHint: 'Clear Act II to unlock', baseHp: 60, baseSpeed: 220, fireRate: 0.95 },
  { id: 'nightwake',     name: 'Nightwake',     tagline: 'Spectral barque. Crit-heavy.',             stats: { hull: 2, speed: 4, cannons: 4, luck: 3 }, unlocked: false, isDefault: false, unlockHint: 'Defeat the Ghost Commodore', baseHp: 50, baseSpeed: 250, fireRate: 1.1 },
];

// Enemies — Admin config + Encyclopedia entries (player-facing).
const ENEMIES = [
  { id: 'skiff',          name: 'Pirate Skiff',     faction: 'Pirate',       hp: 8,   dmg: 4,  speed: 200, acts: [1,3], blurb: 'Light, fast, dies in one shot. Comes in flocks.' },
  { id: 'kamikaze',       name: 'Powder-Keg Boat',  faction: 'Pirate',       hp: 12,  dmg: 18, speed: 240, acts: [1],   blurb: 'Rams you. Explodes on contact.' },
  { id: 'gunboat',        name: 'Navy Gunboat',     faction: 'Navy',         hp: 22,  dmg: 8,  speed: 180, acts: [1],   blurb: 'Two cannons, predictable arc.' },
  { id: 'frigate',        name: 'HMS Thunderstrike',faction: 'Navy',         hp: 80,  dmg: 14, speed: 140, acts: [1],   blurb: 'Mini-boss. Volley broadsides.' },
  { id: 'sniper',         name: 'Crow\'s Nest Sniper', faction: 'Navy',      hp: 14,  dmg: 22, speed: 160, acts: [1,2], blurb: 'Long-range, slow shot. Telegraphed.' },
  { id: 'ghost-skiff',    name: 'Ghost Skiff',      faction: 'Supernatural', hp: 14,  dmg: 8,  speed: 220, acts: [2],   blurb: 'Phases in and out. Hit windows are short.' },
  { id: 'swarm',          name: 'Cursed Swarm',     faction: 'Supernatural', hp: 6,   dmg: 4,  speed: 260, acts: [2],   blurb: 'Eight tiny ships in a swirling cloud.' },
  { id: 'drowned-cannon', name: 'Drowned Cannon',   faction: 'Supernatural', hp: 30,  dmg: 16, speed: 0,   acts: [2],   blurb: 'Fires from beneath the surface.' },
  { id: 'ember-skiff',    name: 'Ember Skiff',      faction: 'Volcanic',     hp: 18,  dmg: 10, speed: 220, acts: [3],   blurb: 'Trails lava. Touch is bad.' },
  { id: 'warlord-skiff',  name: 'Warlord Skiff',    faction: 'Volcanic',     hp: 35,  dmg: 14, speed: 180, acts: [3],   blurb: 'Obsidian-clad. Mid-tier ranged.' },
  { id: 'boss-pirate-king',name: 'Admiral Scurvy', faction: 'Pirate',       hp: 800, dmg: 24, speed: 90,  acts: [1],   isBoss: true, blurb: 'Calls in skiff swarms between phases.' },
  { id: 'boss-ghost',     name: 'Ghost Commodore',  faction: 'Supernatural', hp: 1200,dmg: 28, speed: 110, acts: [2],   isBoss: true, blurb: 'Three phases. Wet enemies during phase 2.' },
  { id: 'boss-drowned',   name: 'Drowned Admiralty',faction: 'Supernatural', hp: 1500,dmg: 30, speed: 70,  acts: [2],   isBoss: true, blurb: 'Surfaces and submerges; the cannons are the boss.' },
  { id: 'boss-banshee',   name: 'Banshee Galleon',  faction: 'Volcanic',     hp: 1600,dmg: 32, speed: 100, acts: [3],   isBoss: true, blurb: 'Wail temporarily silences your weapons.' },
  { id: 'boss-obsidian',  name: 'Obsidian Warlord', faction: 'Volcanic',     hp: 2000,dmg: 36, speed: 90,  acts: [3],   isBoss: true, blurb: 'Hardens; only crits damage during shielding.' },
  { id: 'boss-kraken',    name: 'Kraken Ancient',   faction: 'Volcanic',     hp: 4500,dmg: 40, speed: 60,  acts: [3],   isBoss: true, blurb: 'Final fight. Tentacles, ink, and the abyss.' },
];

// Weapons — Admin config + Encyclopedia entries.
const WEAPONS = [
  { id: 'cannon',       name: 'Bow Cannon',      base: 6,  rate: 1.0, kind: 'projectile', blurb: 'Default broadside. Reliable.' },
  { id: 'flamethrower', name: 'Flamethrower',    base: 3,  rate: 8.0, kind: 'beam',       blurb: 'Short-range cone. Burns, ignites oil.' },
  { id: 'chain-light',  name: 'Chain Lightning', base: 9,  rate: 0.8, kind: 'arc',        blurb: 'Jumps to nearby foes. Loves the Wet status.' },
  { id: 'harpoon',      name: 'Harpoon',         base: 14, rate: 0.6, kind: 'projectile', blurb: 'Pulls small enemies in. Anchors big ones.' },
  { id: 'frost-bomb',   name: 'Frost Bomb',      base: 8,  rate: 0.5, kind: 'aoe',        blurb: 'Slow + Wet on a radius.' },
  { id: 'storm-compass',name: 'Storm Compass',   base: 0,  rate: 0,   kind: 'passive',    blurb: 'Passive. Boosts lightning, range.' },
  { id: 'broadside',    name: 'Broadside',       base: 12, rate: 0.7, kind: 'projectile', blurb: 'Side-fire volley. Wide arc.' },
  { id: 'shadow-orb',   name: 'Shadow Orb',      base: 5,  rate: 1.2, kind: 'orbiter',    blurb: 'Spinning orbiter. Deals contact damage.' },
];

const LB_CAMPAIGN = [
  { rank: 1, username: 'Marlowe',    score: 248_300, durationMs: 1_812_400 },
  { rank: 2, username: 'Tideling',   score: 231_870, durationMs: 1_902_120 },
  { rank: 3, username: 'BananaCpt',  score: 224_400, durationMs: 1_998_900 },
  { rank: 4, username: 'KaiKai',     score: 219_002, durationMs: 2_011_500 },
  { rank: 5, username: 'You',        score: 196_240, durationMs: 2_140_220, you: true },
  { rank: 6, username: 'OtterCove',  score: 184_800, durationMs: 2_240_990 },
  { rank: 7, username: 'Saltwise',   score: 171_220, durationMs: 2_388_110 },
  { rank: 8, username: 'Bilge',      score: 152_400, durationMs: 2_502_900 },
];
const LB_DAILY = [
  { rank: 1, username: 'Tideling', score: 38_400 },
  { rank: 2, username: 'Marlowe',  score: 35_120 },
  { rank: 3, username: 'You',      score: 32_980, you: true },
];
const LB_BOSSES = [
  { rank: 1, username: 'Marlowe', score: 0, durationMs: 41_200 },
  { rank: 2, username: 'You',     score: 0, durationMs: 47_800, you: true },
  { rank: 3, username: 'Saltwise',score: 0, durationMs: 49_330 },
];

const TREASURE_MAPS = [
  { id: 'gold-isles',     name: 'The Gold Isles',     detail: 'Hidden bonus boss with rare drops.' },
  { id: 'drowned-shrine', name: 'The Drowned Shrine', detail: 'Dodge-only skill room.' },
  { id: 'volcanic-heart', name: 'The Volcanic Heart', detail: '5-minute endless survival.' },
  { id: 'kraken-lair',    name: "The Kraken's Lair",  detail: 'Harder Kraken variant.' },
  { id: 'admirals-secret',name: "The Admiral's Secret", detail: 'Alternate hard-mode campaign.' },
];

const DAILY_RUN = {
  dateKey: new Date().toISOString().slice(0,10),
  shipName: 'Tempest Fury',
  shipBlurb: 'Storm-tossed schooner. Fast, fragile, electric.',
  modifierLabel: 'Bloodied Sights',
  modifierBlurb: '+100% crit chance. Every shot is a roll of the dice.',
};

const INITIAL_STATE = {
  gems: 274, mapFragments: 7,
  stagesCleared: ['rivermouth', 'inland-channels', 'delta-fleet', 'smugglers-cove', 'red-harbor'],
  meta: { hull: 4, engine: 3, cannons: 5, crew: 2, cargo: 3, luck: 1, reroll: 2 },
  cosmetics: { hull: 'gold', sails: 'compass' },
  selectedShip: 'ember-corsair',
  defaultShip: 'ember-corsair',  // player-tweakable default for new runs
  mapsAssembled: ['gold-isles'],
  campaignsCleared: 0, ngPlus: 0, totalCoinsLifetime: 124_320,
  difficulty: 'normal',
};

Object.assign(window, {
  STAGES, ACTS, META_TRACKS, META_COSTS, ACHIEVEMENTS,
  HULL_VARIANTS, SAILS_VARIANTS, SHIPS, ENEMIES, WEAPONS,
  LB_CAMPAIGN, LB_DAILY, LB_BOSSES,
  INITIAL_STATE, TREASURE_MAPS, DAILY_RUN,
});
