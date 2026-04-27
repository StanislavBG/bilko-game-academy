/**
 * Shell-side mirror of Boat Shooter content. Used by player routes
 * (Home, Campaign, Encyclopedia, Shipyard) to render without pulling
 * in @bilko/boat-shooter (which would defeat lazy-loading the game).
 *
 * If anything in the actual content pack drifts, update here too.
 */

export interface ShellStage {
  n: number;
  id: string;
  name: string;
  act: 1 | 2 | 3;
  biome: 'Sunlit Delta' | 'Cursed Fog' | 'Volcanic Reach';
  tagline: string;
  boss?: string;
}

export const BOAT_SHOOTER_STAGES: ReadonlyArray<ShellStage> = [
  { n: 1,  id: 'stage-1-rivermouth',         name: 'Rivermouth',          act: 1, biome: 'Sunlit Delta',   tagline: 'A gentle current. Pirate skiffs scout the mouth.' },
  { n: 2,  id: 'stage-2-inland-channels',    name: 'Inland Channels',     act: 1, biome: 'Sunlit Delta',   tagline: 'Reedy bends. Watch for ramming kamikazes.' },
  { n: 3,  id: 'stage-3-delta-fleet',        name: 'The Delta Fleet',     act: 1, biome: 'Sunlit Delta',   tagline: 'Three formations, one frigate.' },
  { n: 4,  id: 'stage-4-smugglers-cove',     name: "Smuggler's Cove",     act: 1, biome: 'Sunlit Delta',   tagline: 'Hidden chests. Ambush volleys.' },
  { n: 5,  id: 'stage-5-red-harbor',         name: 'Red Harbor',          act: 1, biome: 'Sunlit Delta',   tagline: 'Boss — Admiral Scurvy.', boss: 'Admiral Scurvy' },
  { n: 6,  id: 'stage-6-fog-bay',            name: 'Fog Bay',             act: 2, biome: 'Cursed Fog',     tagline: 'Visibility drops. Things drift.' },
  { n: 7,  id: 'stage-7-cursed-passage',     name: 'Cursed Passage',      act: 2, biome: 'Cursed Fog',     tagline: 'Drowned cannon. Listen for the bell.' },
  { n: 8,  id: 'stage-8-hallowed-waters',    name: 'Hallowed Waters',     act: 2, biome: 'Cursed Fog',     tagline: 'Boss — the Ghost Commodore.', boss: 'Ghost Commodore' },
  { n: 9,  id: 'stage-9-serpent-narrows',    name: 'Serpent Narrows',     act: 2, biome: 'Cursed Fog',     tagline: 'A wake that follows you.' },
  { n: 10, id: 'stage-10-drowned-anchorage', name: 'Drowned Anchorage',   act: 2, biome: 'Cursed Fog',     tagline: 'Act II finale.', boss: 'Drowned Admiralty' },
  { n: 11, id: 'stage-11-ashfall',           name: 'Ashfall',             act: 3, biome: 'Volcanic Reach', tagline: 'Hot embers on the deck.' },
  { n: 12, id: 'stage-12-haunted-crater',    name: 'Haunted Crater',      act: 3, biome: 'Volcanic Reach', tagline: 'Boss — Banshee Galleon.', boss: 'Banshee Galleon' },
  { n: 13, id: 'stage-13-obsidian-plateau',  name: 'Obsidian Plateau',    act: 3, biome: 'Volcanic Reach', tagline: 'Boss — Obsidian Warlord.', boss: 'Obsidian Warlord' },
  { n: 14, id: 'stage-14-final-gauntlet',    name: 'Final Gauntlet',      act: 3, biome: 'Volcanic Reach', tagline: 'Every fleet, all at once.' },
  { n: 15, id: 'stage-15-kraken-bay',        name: 'Kraken Bay',          act: 3, biome: 'Volcanic Reach', tagline: 'Final — the Kraken Ancient.', boss: 'Kraken Ancient' },
];

export const ACTS = [
  { n: 1, name: 'Sunlit Delta',   tone: 'delta' as const, color: 'var(--act-1-warm)',  bg: 'var(--act-1-bg)',  blurb: 'Warm tropics, navy patrols, pirate skiffs.' },
  { n: 2, name: 'Cursed Fog',     tone: 'fog'   as const, color: 'var(--act-2-cool)',  bg: 'var(--act-2-bg)',  blurb: 'Cold mist. Translucent ships. Listen close.' },
  { n: 3, name: 'Volcanic Reach', tone: 'lava'  as const, color: 'var(--act-3-ember)', bg: 'var(--act-3-bg)',  blurb: 'Black water, ember hulls, the Kraken below.' },
];

export interface ShellShip {
  id: string;
  name: string;
  tagline: string;
  unlocked: boolean;
  unlockHint?: string;
}

export const SHIPS: ReadonlyArray<ShellShip> = [
  { id: 'ember-corsair', name: 'Ember Corsair', tagline: 'Balanced cutter, fire-weighted cannons.',  unlocked: true },
  { id: 'tempest-fury',  name: 'Tempest Fury',  tagline: 'Storm-tossed schooner. Fast & electric.',  unlocked: true },
  { id: 'frostbound',    name: 'Frostbound',    tagline: 'Icebreaker hull, slow but sturdy.',         unlocked: true },
  { id: 'verdant-tide',  name: 'Verdant Tide',  tagline: 'Reef-runner. Lucky drops.',                  unlocked: false, unlockHint: 'Clear Act II to unlock' },
  { id: 'nightwake',     name: 'Nightwake',     tagline: 'Spectral barque. Crit-heavy.',               unlocked: false, unlockHint: 'Defeat the Ghost Commodore' },
];

export interface ShellEnemy {
  id: string; name: string; faction: string; hp: number; dmg: number; speed: number;
  acts: ReadonlyArray<number>; blurb: string; isBoss?: boolean;
}

export const ENEMIES: ReadonlyArray<ShellEnemy> = [
  { id: 'scout-skiff',          name: 'Scout Skiff',         faction: 'Pirate',       hp: 1,    dmg: 1,  speed: 150, acts: [1,3], blurb: 'Light, fast, dies in one shot. Comes in flocks.' },
  { id: 'powder-keg-kamikaze',  name: 'Powder-Keg Boat',     faction: 'Pirate',       hp: 4,    dmg: 6,  speed: 160, acts: [1],   blurb: 'Rams you. Explodes on contact.' },
  { id: 'patrol-gunboat',       name: 'Patrol Gunboat',      faction: 'Navy',         hp: 5,    dmg: 1,  speed: 100, acts: [1],   blurb: 'Two cannons, predictable arc.' },
  { id: 'frigate-captain',      name: 'HMS Thunderstrike',   faction: 'Navy',         hp: 60,   dmg: 3,  speed: 80,  acts: [1],   blurb: 'Mini-boss. Volley broadsides.', isBoss: true },
  { id: 'bank-sniper-tower',    name: "Crow's Nest Sniper",  faction: 'Navy',         hp: 6,    dmg: 2,  speed: 0,   acts: [1,2], blurb: 'Long-range, slow shot. Telegraphed.' },
  { id: 'ghost-ship',           name: 'Ghost Skiff',         faction: 'Supernatural', hp: 3,    dmg: 1,  speed: 130, acts: [2],   blurb: 'Phases in and out. Hit windows are short.' },
  { id: 'cursed-swarm',         name: 'Cursed Swarm',        faction: 'Supernatural', hp: 2,    dmg: 1,  speed: 200, acts: [2],   blurb: 'Tiny ships in a swirling cloud.' },
  { id: 'sea-serpent',          name: 'Sea Serpent',         faction: 'Supernatural', hp: 12,   dmg: 3,  speed: 110, acts: [2],   blurb: 'Coils through the river — head, body, tail are all hits.' },
  { id: 'kraken-tentacle',      name: 'Kraken Tentacle',     faction: 'Supernatural', hp: 18,   dmg: 4,  speed: 0,   acts: [2,3], blurb: 'Surfaces and lashes; only the tip is vulnerable.' },
  { id: 'broadside-cutter',     name: 'Broadside Cutter',    faction: 'Pirate',       hp: 8,    dmg: 2,  speed: 90,  acts: [1,2], blurb: 'Stops midstream and unloads both sides.' },
  { id: 'pirate-king',          name: 'Admiral Scurvy',      faction: 'Pirate',       hp: 220,  dmg: 6,  speed: 90,  acts: [1],   blurb: 'Calls in skiff swarms between phases.', isBoss: true },
  { id: 'ghost-commodore',      name: 'Ghost Commodore',     faction: 'Supernatural', hp: 320,  dmg: 7,  speed: 110, acts: [2],   blurb: 'Three phases. Wet enemies during phase 2.', isBoss: true },
  { id: 'drowned-admiralty',    name: 'Drowned Admiralty',   faction: 'Supernatural', hp: 380,  dmg: 8,  speed: 70,  acts: [2],   blurb: 'Surfaces and submerges; the cannons are the boss.', isBoss: true },
  { id: 'banshee-galleon',      name: 'Banshee Galleon',     faction: 'Volcanic',     hp: 420,  dmg: 8,  speed: 100, acts: [3],   blurb: 'Wail temporarily silences your weapons.', isBoss: true },
  { id: 'obsidian-warlord',     name: 'Obsidian Warlord',    faction: 'Volcanic',     hp: 520,  dmg: 9,  speed: 90,  acts: [3],   blurb: 'Hardens; only crits damage during shielding.', isBoss: true },
  { id: 'kraken-ancient',       name: 'Kraken Ancient',      faction: 'Volcanic',     hp: 900,  dmg: 10, speed: 60,  acts: [3],   blurb: 'Final fight. Tentacles, ink, and the abyss.', isBoss: true },
];

export interface ShellWeapon {
  id: string; name: string; kind: 'projectile' | 'beam' | 'arc' | 'aoe' | 'orbiter' | 'passive';
  blurb: string;
}

export const WEAPONS: ReadonlyArray<ShellWeapon> = [
  { id: 'bow-cannon',      name: 'Bow Cannon',       kind: 'projectile', blurb: 'Default broadside. Reliable.' },
  { id: 'flamethrower',    name: 'Flamethrower',     kind: 'beam',       blurb: 'Short-range cone. Burns, ignites oil.' },
  { id: 'chain-lightning', name: 'Chain Lightning',  kind: 'arc',        blurb: 'Jumps to nearby foes. Loves the Wet status.' },
  { id: 'harpoon',         name: 'Harpoon',          kind: 'projectile', blurb: 'Pulls small enemies in. Anchors big ones.' },
  { id: 'mortar',          name: 'Mortar',           kind: 'aoe',        blurb: 'Telegraphed shell. Big radius.' },
  { id: 'broadside',       name: 'Broadside',        kind: 'projectile', blurb: 'Side-fire volley. Wide arc.' },
  { id: 'kraken-ink',      name: 'Kraken Ink',       kind: 'aoe',        blurb: 'Inky cloud — slow + bonus damage.' },
  { id: 'spinning-axes',   name: 'Spinning Axes',    kind: 'orbiter',    blurb: 'Orbiters. Contact damage.' },
  { id: 'homing-musket',   name: 'Homing Musket',    kind: 'projectile', blurb: 'Auto-aims at nearest target.' },
  { id: 'stern-mines',     name: 'Stern Mines',      kind: 'aoe',        blurb: 'Drops mines off the back of the ship.' },
  { id: 'fire-arrow-rain', name: 'Fire-Arrow Rain',  kind: 'aoe',        blurb: 'Rain of arrows. Burns everything.' },
  { id: 'lighthouse-beam', name: 'Lighthouse Beam',  kind: 'beam',       blurb: 'Rotating long beam. Crowd control.' },
  { id: 'ghost-crew',      name: 'Ghost Crew',       kind: 'passive',    blurb: 'Summons phantom crewmates that fire from the ship.' },
];
