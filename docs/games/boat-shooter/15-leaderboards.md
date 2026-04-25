# Leaderboards

Boat Shooter ships with 4 leaderboard types. Local-first in P1–P4; global
cloud sync via Supabase starts P5. Details in platform doc
`07-leaderboards-and-accounts.md`.

## Boards

1. **Campaign Clear Time (speedrun)** — fastest completed campaigns.
   - All-time and weekly boards.
   - Split by difficulty (Easy / Normal / Hard / NG+).

2. **Per-Stage High Score** — best single-stage score.
   - One board per stage × difficulty (15 × 4 = 60 boards in v1).
   - Score = kills × multipliers + coin + gem + no-damage bonus.

3. **Boss Kill Times** — fastest per-boss clears.
   - One board per boss × difficulty (9 × 4 = 36 boards).
   - Timer starts at boss intro, ends at HP 0.

4. **Weekly Challenge** — seeded run with shared modifiers.
   - One run per player per week.
   - Modifiers rotate each Monday 00:00 UTC (server-assigned seed).
   - Example modifiers: "No repairs", "Double fire rate", "Kraken Tentacle ambushes",
     "Permanent Fog", "Cursed Swarm every stage".

## Scoring (Campaign total score)

```
score = sum_per_stage (
    kills × 10
    + coins_collected
    + gems_collected × 50
    + map_fragments × 20
    + stage_clear_time_bonus  // faster = more (linear decay)
    + no_damage_bonus (if no dmg taken in stage) × 1000
    + evolution_bonus (× 500 per evolution held)
)
difficulty_multiplier:  Easy 0.8  |  Normal 1.0  |  Hard 1.3  |  NG+N 1.5 + 0.1N
```

## Leaderboard UX (shell)

- `/leaderboards` route, tabbed by board type.
- Each tab has difficulty filter and friends filter.
- Rows show: rank, avatar, username, score, difficulty, evolutions count,
  clear time. Your own row highlighted.

## Anti-cheat

Replay hashing + server-side re-simulation — see platform doc
`07-leaderboards-and-accounts.md` §Anti-cheat.
