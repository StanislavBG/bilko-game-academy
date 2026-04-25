# Balance Tables

This is the master spreadsheet of numbers. Living document — tune during
P2–P4 playtests. Canonical numbers in `apps/games/boat-shooter/src/data/`
JSON files; this doc reflects the locked-at-design-time baselines.

## Player (see `03-player-ship.md` for full)

| Stat | Base | Notes |
|------|------|-------|
| Max HP | 6 | Hull meta: → 17 at L10 |
| Speed | 280 px/s | Engine meta: → 383 at L10 |
| Accel | 1200 px/s² | Engine meta: → 1390 at L10 |
| Iframes | 0.9 s | Copper Hull: +0.5 s at L5 |
| Base damage | 1 | Cannons meta: +25% at L10 |
| Base fire rate | 3.0 shots/s | Cannons meta: +20% at L10 |
| Base crit chance | 10% | Crew meta + Spyglass: uncapped |
| Base crit mult | 1.5× | Crew meta + Spyglass: uncapped |
| Magnet radius | 100 px | Cargo meta: +50% at L10; Cargo Nets +120% at L5 |

## Enemy tier HP reference

| Tier | HP range | Armor typ. | Base damage typ. |
|------|----------|------------|-------------------|
| Fodder | 1–3 | 0 | 0.3–1 |
| Light | 3–5 | 0–1 | 1–2 |
| Medium | 5–10 | 1–2 | 2–3 |
| Heavy | 10–20 | 2–4 | 3–5 |
| Elite | 15–30 | 3–5 | 3–6 |
| Mini-boss | 60–120 | 3–5 | 3–6 |
| Boss | 200–500 | 4–6 | 4–8 |
| Final boss parts | 20–200 (per part) | 2–6 | 6 |

## Weapon DPS estimates at L5 (before buffs/crit, no armor)

*Sanity-check numbers — tune during P2 playtest.*

| Weapon | Nominal L5 DPS | Notes |
|--------|----------------|-------|
| W1 Bow Cannon | ~13 | 3 proj × 1.25 dmg × 3.5/s |
| W2 Broadside | ~24 | 10 shots × 3 dmg / 2.5s = 12 + shockwave |
| W3 Harpoon | ~12 | 3 × 4 dmg × 0.67/s + pulls |
| W4 Chain Lightning | ~18 | 6 targets × 3 dmg × 1/s |
| W5 Flamethrower | ~30 | 2 dmg/tick × 5/s on target + burn |
| W6 Lighthouse | ~9 | 3 dmg/tick × 3/s, but hits multiple |
| W7 Mortar | ~20 | 4 shells × 5 dmg × 0.5/s + AoE |
| W8 Fire-Arrow Rain | ~20 | 16 arrows × 3 dmg / 3s + Burn + patch |
| W9 Kraken-Ink | ~16 | 2 dmg/tick × 4/s on multiple |
| W10 Spinning Axes | ~15 | 6 axes × contact |
| W11 Homing Musket | ~15 | 8 balls × 2 dmg / 1.5s |
| W12 Stern Mines | ~15 | 3 mines/s × 4 dmg × AoE |
| W13 Ghost-Crew | ~12 | 25 shots / 3s × 2 dmg |

## Evolution DPS multipliers vs L5

| Evolution | DPS multiplier | Notes |
|-----------|----------------|-------|
| E1 Cannonade Supreme | ×3 | 6 proj × 3 dmg + heavy mortar |
| E2 Thunderclap Broadside | ×2.5 | +shockwave, sync beat |
| E3 Tempest Cannonade | ×4 | unlimited chain, 4 dmg/target/0.4s |
| E4 Inferno Breath | ×2.5 | 360° + burn + explode-on-death |
| E5 Sawblade Fortress | ×2 | +reflect, +outer ring |
| E6 Leviathan Ink | ×3 | +tentacle slams boss-immunity-bypass |
| E7 Minefield | ×3.5 | self-replicating minefield |
| E8 Ghost Armada | ×2.5 | +6 continuous + sacrifice save |

## Economy timing targets

- Coins/stage Act I: ~50 (avg 1/second of play).
- Coins/stage Act II: ~80.
- Coins/stage Act III: ~120.
- Gems/campaign: 80–150 at Normal; more with hidden stages.
- Merchant spend target: full stock + 1 reroll costs ~100 coins.

## Stage difficulty curve

- Act I: enemy HP ×1.0, density ×1.0, damage ×1.0.
- Act II: HP ×1.3, density ×1.4, damage ×1.3.
- Act III: HP ×1.7, density ×1.8, damage ×1.6.
- NG+N: multiply by (1 + 0.15N) on top.

## Playtest triggers for re-balance

- If median campaign clear rate > 70%: increase Act III HP × 1.2.
- If a specific weapon is picked in > 80% of runs: reduce its L5 DPS 15%.
- If an evolution is achieved in < 5% of runs: relax the pair requirement
  or move to end-of-stage Cove auto-offer.
- If median run length < 20 min: increase stage length or enemy density.
