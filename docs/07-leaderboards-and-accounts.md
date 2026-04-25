# Leaderboards & Accounts

Local-first in P1–P4. Cloud-sync via Supabase starts P5.

## Boards (Boat Shooter v1)

1. **Campaign Clear Time (speedrun)** — all-time + weekly; split by
   difficulty (Easy/Normal/Hard/NG+).
2. **Per-Stage High Score** — one board per stage × difficulty.
3. **Boss Kill Times** — one board per boss × difficulty.
4. **Weekly Challenge** — seeded run with shared modifiers; resets Mondays
   00:00 UTC.

## Accounts

- Account is **optional**. Play fully local without signing in.
- Sign-in via Supabase Auth (email magic link; Apple / Google added later).
- Account unlocks: cloud save, global leaderboards, friends filter.
- Anonymous local identity: a stable anonymous UUID generated on first run,
  used as a "guest user" ID for local leaderboards; can be merged into a
  real account later.

## Anti-cheat (P5+)

- Each run carries a **deterministic seed** (set at run start from server
  for weekly; from client for standard runs).
- Client records a compressed **input trace + critical state checksums**
  at major events (boss kills, evolution, stage end).
- Server re-simulates from seed and key inputs; rejects runs that diverge
  from submitted telemetry.
- Client refuses to submit if suspected cheat hardware/input (basic trust
  only; we're not staking millions of dollars).

## Data schema (Supabase)

```
users            (id, auth_user_id, username, created_at, last_seen_at)
runs             (id, user_id, game_id, seed, started_at, ended_at,
                  difficulty, ng_plus, status, score, clear_time_ms,
                  replay_hash)
run_events       (id, run_id, at, type, payload_json)
boards           (id, game_id, slug, period, filters_json)
leaderboard_rows (id, board_id, run_id, score, rank, submitted_at)
```

## Friends (post-launch)

Follow system with simple mutual discovery by username; friend-filtered
leaderboards. No chat, no DMs.
