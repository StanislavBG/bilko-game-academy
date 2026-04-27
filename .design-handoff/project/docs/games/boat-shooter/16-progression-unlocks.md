# Progression, NG+, Achievements, Cosmetics

## NG+ (New Game Plus)

Unlocks after first campaign clear on any difficulty. Scales with each
iteration: NG+1, NG+2, etc. Separate leaderboard section.

**NG+ remixes:**
- Enemy placements shuffled (new spawn tables).
- Enemy HP × (1.15 × NG+level).
- Enemy fire cadence × 0.9 (faster).
- New weapon/passive drops unlock in the pool (post-launch content slot).
- New cosmetics unlock at each NG+ milestone.
- Bosses may add an extra attack pattern (P2 gets a new move, etc.).

## Achievements (~40 in v1, synced via platform events)

Grouped roughly:

**Combat mastery (10)** — first kill, 1000 kills, first crit, 100-combo,
survive 30 s at HP 1, Electrocute × 10, Cataclysm × 1, Shatter a boss,
Supernova a boss, Evolve a weapon.

**Progression (10)** — clear each act (3), clear campaign on each
difficulty (4), clear campaign with all weapons L5 (1), clear without
buying from a merchant (1), clear with only 1 weapon (1).

**Exploration (10)** — find 5 hidden stages (5 — one each), destroy 50
bank turrets, take every branch on a single run, open a Cursed Chest
10 times, survive a Cursed Chest ambush.

**Collection (10)** — unlock every weapon, every passive, every evolution,
assemble each map (5), collect 100 gems in one run, collect every cosmetic.

Each achievement unlock emits `ctx.events.emit({ type: 'achievement', id })`
and shows a toast in the shell.

## Cosmetics (Gems only)

- **Hull paint** — 12 (oak, ebony, crimson, gold, obsidian, alabaster,
  seafoam, verdant, coral, onyx, ivory, plum).
- **Sails** — 12 emblems (skull, kraken, rose, compass, anchor, phoenix,
  trident, eye, storm, lantern, crown, flame).
- **Figurehead** — 12 carvings (mermaid, dragon, skull, eagle, parrot, lion,
  serpent, angel, demon, whale, octopus, swan).
- **Wake color** — 6 (white, gold, green biolum, red, blue, rainbow).
- **Muzzle flash color** — 6 (yellow, gold, green, purple, cyan, white).
- **Boss-drop cosmetics** (event-unlocked, not gem-purchasable):
  - Commodore's Ledger, Scurvy's Hat + Parrot, Ghost Commodore's Cape,
    Drowned Admiralty Banner, Obsidian Crown, Kraken Crown,
    Banshee's Wail, Pirate Champion's Compass.

Cosmetics have zero stat impact.

## Meta milestones that unlock things (not just stat boosts)

- **Engine L10** → Burst Dash.
- **Cargo L5** → free map fragment per run.
- **Luck L4** → Lucky Cursed Chest variant.
- **Luck L7** → Fortune's Favor buff.
- **Luck L10** → guaranteed Gold Chest per stage.
- **Reroll L10** → BANISH feature.
- **Treasure maps** → 5 hidden stages + alternate Kraken fight + hard-mode campaign.
