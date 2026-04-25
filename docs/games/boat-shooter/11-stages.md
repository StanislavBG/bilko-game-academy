# Stages — 15-stage campaign map

Stage-by-stage composition. Each stage is 3–5 min of active play.

## Stage map

```
ACT I — The Sunlit Delta
  Stage 1   regular waves         (Navy intro)
  Stage 2   MINI-BOSS             Frigate Captain 'HMS Thunderstrike' (Navy)
  Stage 3   BOSS #1               The Delta Commodore (Navy flagship, Fleet Formation)
  Stage 4   regular waves         (Pirate intro)
  Stage 5   BOSS #2 Act I final   Pirate King 'Admiral Scurvy' (Crimson Maw, Boarding Event)

ACT II — The Cursed Fog
  Stage 6   regular waves         (fog + Ghost Ships intro)
  Stage 7   MINI-BOSS             Pirate Champion 'Captain Mort'
  Stage 8   BOSS #3               The Ghost Commodore (HMS Regret, Possession)
  Stage 9   regular waves         (Sea Serpents, Cursed Swarm)
  Stage 10  BOSS #4 Act II final  The Drowned Admiralty (Triple Target)

ACT III — The Volcanic Reach
  Stage 11  regular waves         (volcanic hazards + Kraken Tentacle cameos)
  Stage 12  MINI-BOSS             Banshee Galleon 'Wailing Verity'
  Stage 13  BOSS #5               The Obsidian Warlord (Captain Magmar, Arena Hazards)
  Stage 14  regular waves         (final gauntlet — all factions, dense spawns)
  Stage 15  BOSS #6 FINAL         The Kraken Ancient (Screen-Sized, 4 phases)
```

## Per-stage spawn tables (sketch — detailed in `data/stages/<id>.json`)

Each stage has a JSON file specifying:
- Duration target (seconds).
- Biome + weather.
- Tiled map (.tmx) reference.
- Wave definitions: `{ at: 10, spawn: 'scout-skiff', count: 4 }` etc.
- Branching points (tributaries).
- Merchant spawn position (seconds into stage).
- Boss intro trigger (if applicable).

## Tentative biome notes

- **Stage 1 "Rivermouth":** Sunlit delta, open water, few rocks. Teaches steering.
- **Stage 2 "Inland Channels":** Narrower, first Bank Sniper Towers. Frigate Captain climax.
- **Stage 3 "The Delta Fleet":** Open water; heavy Navy; Delta Commodore.
- **Stage 4 "Smuggler's Cove":** First Pirates (Brigands, Cutters). Destructible bridges.
- **Stage 5 "Red Harbor":** Pirate-heavy; Powder-Keg Kamikazes intro; Admiral Scurvy.
- **Stage 6 "Fog Bay":** Fog post-FX; Ghost Ships intro; fewer enemies, spookier.
- **Stage 7 "Cursed Passage":** Mid-density; all factions; Pirate Champion.
- **Stage 8 "Hallowed Waters":** Dark; HMS Regret / Ghost Commodore.
- **Stage 9 "Serpent Narrows":** Sea Serpents; Cursed Swarm waves; whirlpools.
- **Stage 10 "Drowned Anchorage":** Storm; Drowned Admiralty finale.
- **Stage 11 "Ashfall":** Volcanic; Kraken Tentacle cameos; lava patches.
- **Stage 12 "Haunted Crater":** Dark; Banshee Galleon.
- **Stage 13 "Obsidian Plateau":** Lava arena; Warlord.
- **Stage 14 "Final Gauntlet":** All factions, dense; Kraken Tentacles emerge in the last minute.
- **Stage 15 "Kraken Bay":** Screen darkens as Kraken rises.

## Hidden stages (unlocked via treasure maps)

- **H1 "The Gold Isles"** — bonus boss, rare cosmetic.
- **H2 "The Drowned Shrine"** — skill challenge room (no weapons, dodge-only).
- **H3 "The Volcanic Heart"** — survive 5 min endless waves.
- **H4 "The Kraken's Lair"** — alternate harder Kraken fight, unique loot.
- **H5 "The Admiral's Secret"** — alternate hard-mode campaign.
