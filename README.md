# Bilko Game Academy

A Progressive Web App hosting a library of 2D games. Shared platform shell
(home, settings, leaderboards, profile) + per-game modules, all in one
installable PWA that runs on iPad Safari, desktop web, and PC.

First game: **Boat Shooter** — a top-down vertical-scrolling arcade shmup ×
*Vampire Survivors*-style weapon stacking, set in the Age of Sail.

See [`docs/`](./docs/) for the full PRD.

## Quick start

```bash
pnpm install
pnpm dev                 # starts shell on http://localhost:5173
pnpm typecheck
pnpm build
pnpm test
```

## Structure

```
apps/
  shell/                 React PWA (home, routing, settings)
  games/
    boat-shooter/        Phaser 3 game
packages/
  game-sdk/              Contract every game implements
  platform-core/         Save, settings, leaderboards, i18n
docs/                    PRD and per-topic design docs
```

## Status

Phase **P0 — Foundations** (in progress). See [`docs/11-release-phases.md`](./docs/11-release-phases.md).
