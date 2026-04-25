# Game SDK Contract

Every game in the library implements this interface so the shell can mount
it, pause it, save it, and surface its scores.

## Types (sketched)

```ts
// packages/game-sdk/src/types.ts

export interface GameModule {
  id: string;                          // kebab-case, matches folder name
  title: string;
  version: string;                     // semver
  mount(container: HTMLElement, ctx: GameContext): GameInstance;
}

export interface GameContext {
  save: SaveAdapter;                   // per-game sandboxed save (IndexedDB)
  settings: ReadonlySettings;          // live-subscribable shared settings
  controls: ReadonlyControlsMap;       // remapped inputs
  leaderboard: LeaderboardAPI;         // submit/fetch scores
  events: EventBus;                    // emit score/achievement/purchase
  pause(): void;
  resume(): void;
}

export interface GameInstance {
  unmount(): void;
  pause(): void;
  resume(): void;
  getSave(): unknown;                  // serializable snapshot
  applySettings(): void;               // re-read from ctx.settings
}

export interface SaveAdapter {
  load<T>(key: string, defaultValue: T): Promise<T>;
  save<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface LeaderboardAPI {
  submit(entry: LeaderboardEntry): Promise<void>;
  fetch(board: string, opts?: FetchOpts): Promise<LeaderboardRow[]>;
}

export interface EventBus {
  emit(event: GameEvent): void;        // { type, payload }
  on<T extends GameEvent>(type: T['type'], handler: (e: T) => void): () => void;
}
```

## Lifecycle

1. Shell navigates to `/game/:id`.
2. Shell imports the game's module (`apps/games/<id>/src/index.ts`).
3. Shell calls `mount(containerDiv, ctx)`.
4. Game initializes Phaser inside container, runs its own scene loop.
5. On settings change: shell calls `instance.applySettings()`.
6. On navigation away: shell calls `instance.unmount()`.
7. Game may call `ctx.save.save(...)`, `ctx.leaderboard.submit(...)`,
   `ctx.events.emit(...)` at any time.

## Sandboxing

Each game's save is namespaced by game ID (`save.save('progress', ...)`
under `games/<id>/progress` key in IndexedDB). A game cannot read another
game's save or overwrite shared platform state.

## Achievements

Emitted via `ctx.events.emit({ type: 'achievement', id: 'kraken-slayer' })`.
The shell surfaces them in the profile and (P5+) syncs to Supabase.
