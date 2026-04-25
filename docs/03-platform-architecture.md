# Platform Architecture

## Monorepo layout

```
/home/bilko/Projects/Bilko-Game-Academy/
├── apps/
│   ├── shell/                 React PWA — home, settings, profile, leaderboards
│   └── games/
│       └── boat-shooter/      Phaser game, mounted into canvas inside shell
├── packages/
│   ├── game-sdk/              Contract every game implements (§04)
│   ├── platform-core/         Shared services: save, leaderboards, settings, telemetry, i18n
│   ├── platform-ui/           Shared React components
│   └── assets-kit/            Shared icons, fonts, UI SFX
├── docs/                      this directory
├── tools/                     palette-snap, atlas-build, stage-validate
└── tests/
    ├── unit/                  Vitest
    └── e2e/                   Playwright
```

Monorepo runner: **pnpm workspaces**. Every app and package has its own
`package.json`, TS config extending `tsconfig.base.json`, and strict mode.

## Module boundaries

- The **shell** owns routing, the game-loader, and shared services.
- **Games** are pure modules exporting a `GameModule` per the SDK (§04).
  They never import from `apps/shell` — only from `packages/*`.
- `packages/platform-core` never imports from `apps/*` — it is the SDK's
  backing implementation.
- Data files (reactions, weapons, enemies, balance) live under
  `apps/games/<id>/src/data/` as JSON, loaded by the game at boot.

## Naming

- IDs kebab-case: `boat-shooter`, `ghost-commodore`, `chain-lightning`.
- Files kebab-case: `chain-lightning.ts`.
- Types PascalCase: `ChainLightningWeapon`.
- JSON keys snake_case: `base_dmg`, `fire_rate`.
