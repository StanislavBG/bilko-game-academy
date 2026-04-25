/**
 * Boat Shooter achievements — 40 total.
 *
 * Tracking is done by pattern-matching on game events (ctx.events + RunState
 * events). When unlocked, the game emits `{ type: 'achievement', id }` which
 * the shell's toast system picks up.
 */

export interface Achievement {
  id: string;
  title: string;
  detail: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Combat mastery (10)
  { id: 'first-blood', title: 'First Blood', detail: 'Destroy your first enemy.' },
  { id: 'kill-1000', title: 'Scourge of the River', detail: 'Destroy 1,000 enemies lifetime.' },
  { id: 'first-crit', title: 'Dead Aim', detail: 'Land your first critical hit.' },
  { id: 'combo-100', title: 'Chained Fury', detail: 'Reach a 100-kill combo in a single run.' },
  { id: 'survive-low', title: 'By the Skin of Your Teeth', detail: 'Survive 30s at 1 HP.' },
  { id: 'electrocute-10', title: 'Grounded', detail: 'Trigger Electrocute 10 times in a run.' },
  { id: 'cataclysm', title: 'Cataclysmic', detail: 'Trigger Cataclysm once.' },
  { id: 'shatter-boss', title: 'Shatter Shot', detail: 'Shatter a boss.' },
  { id: 'supernova-boss', title: 'Stellar', detail: 'Supernova a boss.' },
  { id: 'first-evo', title: 'Evolved', detail: 'Evolve your first weapon.' },

  // Progression (10)
  { id: 'act-i', title: 'Master of the Delta', detail: 'Clear Act I.' },
  { id: 'act-ii', title: 'Through the Fog', detail: 'Clear Act II.' },
  { id: 'act-iii', title: 'Tamed the Volcano', detail: 'Clear Act III.' },
  { id: 'clear-easy', title: 'Sunlit Sailor', detail: 'Complete the campaign on Easy.' },
  { id: 'clear-normal', title: 'River Legend', detail: 'Complete the campaign on Normal.' },
  { id: 'clear-hard', title: 'Stormtalker', detail: 'Complete the campaign on Hard.' },
  { id: 'clear-ngplus', title: 'Endless Tide', detail: 'Complete an NG+ run.' },
  { id: 'all-weapons-l5', title: 'Armory Maxed', detail: 'Clear a stage with every weapon at L5.' },
  { id: 'no-merchant', title: 'Self-Made', detail: 'Clear the campaign without buying from a merchant.' },
  { id: 'one-weapon', title: 'Minimalist', detail: 'Clear the campaign with only 1 weapon.' },

  // Exploration (10)
  { id: 'map-1', title: 'Gold Isles', detail: 'Assemble the Gold Isles map.' },
  { id: 'map-2', title: 'Drowned Shrine', detail: 'Assemble the Drowned Shrine map.' },
  { id: 'map-3', title: 'Volcanic Heart', detail: 'Assemble the Volcanic Heart map.' },
  { id: 'map-4', title: "Kraken's Lair", detail: "Assemble the Kraken's Lair map." },
  { id: 'map-5', title: "Admiral's Secret", detail: "Assemble the Admiral's Secret map." },
  { id: 'bank-50', title: 'Tower Toppler', detail: 'Destroy 50 bank turrets.' },
  { id: 'both-branches', title: 'Both Paths', detail: 'Take every branch on a single run.' },
  { id: 'cursed-10', title: 'Brave the Curse', detail: 'Open 10 Cursed Chests.' },
  { id: 'survive-ambush', title: 'Bloodied but Unbroken', detail: 'Survive a Cursed Chest ambush.' },
  { id: 'hidden-stage', title: 'Off the Map', detail: 'Complete a hidden stage.' },

  // Collection (10)
  { id: 'all-weapons', title: 'Complete Armory', detail: 'Unlock every weapon.' },
  { id: 'all-passives', title: 'Full Crew', detail: 'Unlock every passive.' },
  { id: 'all-evolutions', title: 'Apex', detail: 'Evolve every weapon at least once.' },
  { id: '100-gems-run', title: 'Treasure Hoard', detail: 'Collect 100 gems in a single run.' },
  { id: 'all-cosmetics', title: 'Vain Captain', detail: 'Unlock every cosmetic.' },
  { id: 'boss-frigate', title: 'Down Goes the Frigate', detail: 'Defeat HMS Thunderstrike.' },
  { id: 'boss-pirate-king', title: 'Regicide', detail: 'Defeat Admiral Scurvy.' },
  { id: 'boss-ghost-commodore', title: 'Exorcism', detail: 'Defeat the Ghost Commodore.' },
  { id: 'boss-obsidian', title: 'Ash to Ash', detail: 'Defeat the Obsidian Warlord.' },
  { id: 'boss-kraken', title: 'Kraken Slayer', detail: 'Defeat the Kraken Ancient.' },
];

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
