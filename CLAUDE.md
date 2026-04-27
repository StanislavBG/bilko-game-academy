# Bilko Game Academy — purpose

PWA library hosting 2D games. A shared shell wraps per-game modules through a single SDK contract; first game is Boat Shooter (top-down shmup × Vampire Survivors).

## Layout
- `apps/shell/` — React + Vite PWA. Home, settings, leaderboards, profile, MetaShop, GameLauncher.
- `apps/games/boat-shooter/` — Phaser 3 game module (`@bilko/boat-shooter`).
- `packages/game-sdk/` — `GameModule` / `GameContext` / `EventBus` contract.
- `packages/platform-core/` — `save` (IndexedDB), `settings`, `leaderboards`, `locales`.
- `docs/` — top-level PRDs (`00`..`11`) + `docs/games/boat-shooter/` (`00`..`24`+).

## Key files
- `pnpm-workspace.yaml` — globs: `apps/*`, `apps/games/*`, `packages/*`.
- `package.json` — root scripts (`dev`, `build`, `typecheck`); `pnpm@9`, Node ≥ 20.
- `tsconfig.base.json` — strict TS settings inherited by every package.
- `apps/shell/vite.config.ts` — `BASE_PATH` env, PWA manifest, Phaser chunk split.
- `.github/workflows/deploy.yml` — GitHub Pages build with `BASE_PATH=/bilko-game-academy/`.

## Commands
- `pnpm dev` — boots shell on `http://localhost:5173` (filters `@bilko/shell`).
- `pnpm typecheck` — recursive `tsc --noEmit` across every workspace.
- `pnpm build` — recursive build; final artifact in `apps/shell/dist/`.
- `pnpm -r build` — same; useful when iterating on a single package.
- `pnpm clean` — removes every `dist/` and `node_modules/`.

## Deploy
- Primary: `bilko.run/projects/game-academy/` (deploy `apps/shell/dist/` under that path; build with matching `BASE_PATH`).
- Mirror: GitHub Pages at `/bilko-game-academy/` via `deploy.yml`.
- The Vite `base` and the workbox `start_url` both honour `BASE_PATH`; the sprite loader reads `import.meta.env.BASE_URL`.

## Conventions
- TypeScript `strict` everywhere. No emojis in code or docs unless an asset id (sail emblems / ship icons in `starting-ships.ts` are the exception).
- Comments are terse and load-bearing: the *why*, not the *what*. Mark hot loops with complexity hints (see `~/.claude/CLAUDE.md`).
- Imports: package-relative (`../weapons/foo`) inside a workspace; `@bilko/*` across workspaces.
- No new top-level docs without a number prefix in `docs/`.
- Per-game design docs live in `docs/games/<gameId>/`; reference them by number in code comments (e.g. `docs §4.6.4`).

## Where things live
- Top-level PRDs (`docs/00`..`11-*.md`): vision, tech stack, platform arch, SDK contract, settings, save, leaderboards, a11y, audio, asset pipeline, release phases.
- Boat Shooter design (`docs/games/boat-shooter/00`..`24-*.md`): pitch → core loop → ships → weapons → passives → evolutions → battle → enemies → bosses → stages → economy → merchant → meta → leaderboards → unlocks → art → audio → balance → visual expansion → starting ships → enemy variants → HUD/log → assets.
- Per-section guidance: a `CLAUDE.md` in each `src/{entities,weapons,systems,scenes,data,ui}` folder.

## Gotchas
- `BASE_PATH` must end with a trailing slash; PWA `start_url` derives from it.
- Workspace package names use the `@bilko/` scope; do not publish.
- The shell never imports Phaser directly — only via the dynamic `import('@bilko/boat-shooter')` in `routes/GameLauncher.tsx`, so initial JS stays small.
