# packages/ — purpose

Shared workspace libraries. Two packages:
- `@bilko/game-sdk` — the contract every game implements + the event bus type.
- `@bilko/platform-core` — concrete implementations of save, settings, leaderboards, locales for the shell.

Games depend only on `@bilko/game-sdk` (zero runtime deps). The shell depends on both.

## Key files
- `game-sdk/src/types.ts` — `GameModule`, `GameInstance`, `GameContext`, `SaveAdapter`, `ReadonlySettings`, `ReadonlyControlsMap`, `Binding`, `LeaderboardAPI`.
- `game-sdk/src/event-bus.ts` — minimal typed pub/sub (`createEventBus<E>()`); `GameEvent` union (`stage-clear`, `campaign-clear`, `achievement`, …).
- `game-sdk/src/index.ts` — re-exports the two above. The single import surface games consume.
- `platform-core/src/save/` — IndexedDB-backed `createGameSave(gameId)` returning a `SaveAdapter`.
- `platform-core/src/settings/` — `readonlySettings()` snapshot factory matching the SDK shape.
- `platform-core/src/leaderboards/` — `createLocalLeaderboard(gameId, username)` (local-only today, future cloud).
- `platform-core/src/locales/` — i18next-friendly resource bundles consumed by the shell.

## Key types / contracts
- `GameModule` — `{ id, title, version, mount(container, ctx): GameInstance }`. The only thing a game must export.
- `GameContext` — bag of capabilities the shell hands the game on mount: save / settings / controls / leaderboard / events / pause / resume.
- `GameEvent` — typed event union flowing both ways through `EventBus`. Game emits run/achievement events; shell can listen and toast.
- `SaveAdapter` — `load<T>(key, default)`, `save<T>(key, value)`, `delete(key)`. Promise-based, namespaced per game.
- `ReadonlySettings.subscribe(listener)` — game uses this to react to live settings changes (volume, reduced motion, palette).

## Adding a new SDK capability
1. Extend the relevant interface in `game-sdk/src/types.ts` — keep it readonly where possible.
2. Add an event variant to `GameEvent` if it's a stream (achievement, telemetry).
3. Implement it in `platform-core/src/<area>/` and re-export from `platform-core/src/index.ts`.
4. Wire it in the shell's `routes/GameLauncher.tsx` when constructing the `GameContext`.
5. Update consumer games — TS will surface compile errors on missing fields thanks to `strict`.

## Adding a new platform impl
For example, a cloud leaderboard:
1. Add `platform-core/src/leaderboards/cloud.ts` exporting `createCloudLeaderboard(...)` returning a `LeaderboardAPI`.
2. Re-export from the area's `index.ts`.
3. Choose between local/cloud at construction time in the shell, gated by user settings.

## Gotchas
- Both packages are `"private": true` and never published. Cross-package imports use the workspace alias (`@bilko/...`).
- Games must not import `@bilko/platform-core` directly — only the shell instantiates it. Otherwise `ReadonlySettings` becomes mutable from the game's side and the contract leaks.
- `EventBus` listeners returned from `on(...)` are unsubscribers; always store + call them in `unmount` or strict-mode double-mount will double-fire handlers.
- `SaveAdapter.load` resolves with the supplied default if the key is absent — there's no "not-found" error path. Migrate by reading + reshape + saving.
