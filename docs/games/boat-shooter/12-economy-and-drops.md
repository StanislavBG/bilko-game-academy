# Economy & Drops

## Coin tiers

| Tier | Value | Visual | Typical source |
|------|-------|--------|-----------------|
| Small (S) | 1 | copper, subtle shimmer | chip drops, Cursed Swarm, destructible barrels |
| Medium (M) | 5 | silver, brighter shimmer | most enemies |
| Large (L) | 25 | gold, gold sparks | heavies, elites, bosses |

## Coin rules

- Auto-magnet at upgraded radius (Cargo Nets passive + Cargo meta track).
- Coins scrolled off the bottom are lost after 3 s.
- **Cargo Nets L5** auto-rescues off-screen coins.
- Timed **Coin-Doubler** pickup: all coins count as +1 tier for 10 s.

## Drop tables (summary — full tables in `data/enemies.json`)

| Enemy tier | Coins | Gem chance | XP orbs |
|------------|-------|------------|---------|
| Light (HP ≤ 3) | 1 × S or 1 × M | 0–3% | 1 |
| Medium (HP 4–8) | 1–2 × M | 5–8% | 1 |
| Heavy (HP 9–15) | 2–3 × M or 1 × L | 8–15% | 2 |
| Elite / Stationary | 3–4 × L | 10–15% | 2 |
| Mini-boss | 30–80 × L | **guaranteed 2–5 gems** | many |
| Full boss | 120–500 coins | **guaranteed 6–30 gems** | many |

## XP orb distribution

- Kills drop XP orbs per enemy tier (1–3 per kill).
- Orbs have ghostly glow + light magnet.
- Supernatural enemies drop cyan-colored XP orbs (cosmetic only).

## Gems (meta currency)

- Persist across runs.
- Spent at end-of-stage Shipwright Cove or home-screen Meta Shop.
- Per-run gem income target:
  - Act I clear: ~15–25 gems.
  - Act II clear: ~35–55 gems.
  - Act III clear (full campaign): ~80–150 gems (more with hidden stages).

## Treasure map fragments

See `11-stages.md` for map destinations. Fragment drop rate:
- Bank Sniper Tower: 3%/kill.
- Mini-boss: 1–2 guaranteed.
- Full boss: 2–5 guaranteed.
- Cursed Chest: 40%.
- Pirate Champion "Compass" rare: 10%.
- Kraken final drop: 10 guaranteed.

Fragments persist across runs. 5 fragments = 1 assembled Map.

## Luck math

Luck% shifts drop tables. 10% luck → 10% chance that a Wooden chest
upgrades to Silver, or that a common weapon drop upgrades to rare, etc.
Softer contribution to gem drop rate (~linear with luck%).
