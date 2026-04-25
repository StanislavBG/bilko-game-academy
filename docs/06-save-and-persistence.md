# Save & Persistence

## Storage layer

- **Primary:** IndexedDB via `idb-keyval` — survives iOS Safari's aggressive
  storage eviction; works offline.
- **Secondary (P5+):** Supabase row per user per game, for cloud save.
- **Never localStorage** for important data — iPadOS Safari will evict it.

## Namespacing

```
bilko/
├── platform/
│   ├── settings              SharedSettings
│   ├── profile               { username, avatar, stats }
│   └── account               { signedIn, token, lastSyncAt }
├── games/
│   └── boat-shooter/
│       ├── progress          campaign state, unlocks, cosmetics
│       ├── meta              7 meta tracks + gem balance
│       ├── stats             lifetime kills/time/etc.
│       └── last-run          resumable run snapshot
└── leaderboards/
    └── boat-shooter/         cached recent rows per board
```

Each game accesses only its `games/<id>/*` subtree through
`ctx.save.save(key, value)` — `key` is relative, backed by the namespaced
full path.

## Save schema example (Boat Shooter)

```ts
interface BoatShooterProgress {
  version: 1;
  campaign: {
    stagesCleared: number[];         // [1, 2, 3, ...]
    bestClearTime: Record<string, number>; // by difficulty
    ngPlus: number;                  // 0 = normal, 1+ = NG+
  };
  meta: {
    gems: number;
    tracks: Record<MetaTrackId, number>; // level 0..10
    cosmetics: { hull: string; sails: string; figurehead: string; wake: string };
    mapFragments: number;
    mapsAssembled: string[];         // ['gold-isles', ...]
    hiddenStagesUnlocked: string[];
  };
  achievements: string[];
}
```

## Cloud sync strategy (P5+)

1. On app start, if signed in: fetch server version; if server > local,
   prompt user to download or merge.
2. On game pause / navigation: debounce-save to IndexedDB (local).
3. Every 30 s of play OR on stage completion: push to Supabase (best-effort;
   retries on reconnect).
4. Conflict resolution: server-side **highest** for leaderboards,
   **merge-union** for unlocks, **user prompt** for divergent
   campaign state.

## Migrations

Every save has a `version` field. On load, the game runs `migrate(save,
fromVersion, toVersion)` to bring it current. Never break old saves.
