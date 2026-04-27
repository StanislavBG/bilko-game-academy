# shell/ — purpose

The PWA host. React + Vite + Tailwind + i18next + Zustand. Renders Home / Settings / Leaderboards / Profile / MetaShop as `ShellFrame` children, and full-bleed `GameLauncher` for `/game/:gameId`.

## Key files
- `src/main.tsx` — React root + router + i18n bootstrap.
- `src/App.tsx` — route table. `/game/:gameId` is fullscreen (no shell chrome); everything else nests under `ShellFrame`.
- `src/routes/GameLauncher.tsx` — dynamic-imports a `GameModule`, builds a `GameContext` (save/settings/controls/leaderboard/events), mounts the game into a div, and unmounts on nav-away.
- `src/routes/Home.tsx`, `Settings.tsx`, `Leaderboards.tsx`, `Profile.tsx`, `MetaShop.tsx` — each is a self-contained route.
- `src/components/ShellFrame.tsx` — top nav + outlet wrapper.
- `src/components/AchievementToast.tsx` — listens for `achievement` events and surfaces toasts.
- `vite.config.ts` — `BASE_PATH` env, PWA manifest, workbox precache + sprite runtime cache, manualChunks (`phaser`, `react`, `i18n`).
- `src/i18n.ts` — i18next setup (locales loaded from `@bilko/platform-core/locales`).

## Game module contract
Each game implements `@bilko/game-sdk`'s `GameModule`:
```ts
{
  id, title, version,
  mount(container, ctx): GameInstance
}
```
- `ctx.save` — `SaveAdapter` (IndexedDB via `@bilko/platform-core`).
- `ctx.settings` — `ReadonlySettings` snapshot (audio, display, controls, language) with a `subscribe()` for live updates.
- `ctx.controls` — `ReadonlyControlsMap` of `Binding`s (touch / keyboard / gamepad).
- `ctx.leaderboard` — `submit(entry)` + `fetch(board, opts)`. Local impl today.
- `ctx.events` — `EventBus<GameEvent>`. Game emits `stage-clear` / `campaign-clear` / `achievement`; shell consumes for toasts + persistence.
- `ctx.pause()` / `resume()` — sync flow control (e.g. when the shell shows a system modal).

`GameInstance` returned by `mount()`: `unmount`, `pause`, `resume`, `getSave`, `applySettings`.

## Adding a new game
1. Create `apps/games/<id>/` workspace with package name `@bilko/<id>`, `main`/`types`/`exports` pointing at `./src/index.ts`.
2. Default-export a `GameModule`.
3. Register in `routes/GameLauncher.tsx`'s `GAMES` lazy-loader registry: `'<id>': () => import('@bilko/<id>')`.
4. Add an entry to Home tile list (`routes/Home.tsx`).
5. Add `@bilko/<id>` to shell's `package.json` dependencies as `workspace:*`.

## Settings + leaderboards
- `readonlySettings()` from `@bilko/platform-core/settings` — currently a stub snapshot; future revisions wire it to a Zustand store.
- `createGameSave(gameId)` — namespaced IndexedDB store per game.
- `createLocalLeaderboard(gameId, username)` — local-only today; same API the cloud-backed impl will use.

## Deploy paths
- Cloudflare / custom-domain: build with `BASE_PATH=/projects/game-academy/` (or `/`) → `apps/shell/dist/`.
- GitHub Pages: `.github/workflows/deploy.yml` sets `BASE_PATH=/bilko-game-academy/` and uploads `apps/shell/dist`.
- PWA manifest's `start_url` + `scope` track `BASE_PATH`. Sprite runtime cache is keyed under `/boat-shooter-sprites/`.

## Gotchas
- Don't import Phaser or any game module statically — kills the chunk-split. Always lazy-import in `GAMES`.
- The `GameLauncher` effect must clean up *both* the GameInstance and the event-bus subscriptions, or React 18 strict-mode double-mount leaks the canvas.
- `BASE_PATH` requires a trailing slash; both Vite's `base` and the workbox config rely on it.
- `ctx.controls` in `GameLauncher` is currently hardcoded — game can read it but settings UI doesn't yet rebind it.
