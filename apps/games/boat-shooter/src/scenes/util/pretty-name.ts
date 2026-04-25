/**
 * Map raw source/target ids from the combat log into human-readable names.
 * Unknown ids fall through with a Title-Case transform, so no consumer ever
 * shows `snake_case_gibberish` to the player.
 *
 * Extracted from combat-log-scene.ts so the run-summary and post-mortem
 * scenes can share it without re-defining the table.
 */
const KNOWN: Record<string, string> = {
  // Hazards
  'rock': 'Rock',
  'barrel': 'Barrel',
  'mine': 'Sea Mine',
  // Catch-all
  'enemy-bullet': 'Enemy Fire',
  'unknown': 'Unknown Source',
  // Navy
  'scout-skiff': 'Scout Skiff',
  'patrol-gunboat': 'Patrol Gunboat',
  'mortar-barge': 'Mortar Barge',
  'bank-sniper-tower': 'Bank Sniper',
  // Pirates
  'ramming-brigand': 'Ramming Brigand',
  'broadside-cutter': 'Broadside Cutter',
  'grappling-boarders': 'Boarders',
  'powder-keg-kamikaze': 'Powder-Keg',
  'mine-layer': 'Mine-Layer',
  'bank-bandits': 'Bank Bandits',
  // Supernatural / wildlife
  'ghost-ship': 'Ghost Ship',
  'sea-serpent': 'Sea Serpent',
  'kraken-tentacle': 'Kraken Tentacle',
  'cursed-swarm': 'Cursed Swarm',
  // Bosses
  'frigate-captain': 'Frigate Captain',
  'delta-commodore': 'Delta Commodore',
  'pirate-champion': 'Pirate Champion',
  'pirate-king': 'Pirate King',
  'ghost-commodore': 'Ghost Commodore',
  'drowned-admiralty': 'Drowned Admiralty',
  'banshee-galleon': 'Banshee Galleon',
  'obsidian-warlord': 'Obsidian Warlord',
  'kraken-ancient': 'Kraken Ancient',
};

export function prettyName(id: string): string {
  if (KNOWN[id]) return KNOWN[id]!;
  // Fallback — turn 'some-id' into 'Some Id'.
  return id
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
