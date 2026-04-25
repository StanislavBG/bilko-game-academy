# Bilko Game Academy — Docs

This folder is the authoritative PRD for the Bilko Game Academy platform and
every game built on it. The original monolithic plan lives at
`~/.claude/plans/choose-the-most-graphic-snuggly-eich.md` and is split into
the per-topic docs below.

## How to read

- **Platform docs (`00`–`11`)** describe the shared PWA shell, the Game SDK
  contract, settings, save, leaderboards, accessibility, audio, assets, and
  release phases. Anything any game can rely on.
- **Game docs (`games/<game-id>/*`)** are the full design of a single game.
  The first game is **Boat Shooter** under `games/boat-shooter/`.

## Top-level map

| File | Contents |
|------|----------|
| `01-vision-and-pitch.md` | One-page pitch — what we're building and why. |
| `02-tech-stack-and-pwa.md` | Chosen stack, PWA strategy, iPad Safari notes. |
| `03-platform-architecture.md` | Monorepo layout, boundaries, naming. |
| `04-game-sdk-contract.md` | The interface every game implements. |
| `05-shared-settings-and-controls.md` | Global settings surface + remapping. |
| `06-save-and-persistence.md` | IndexedDB, cloud-save adapter, schemas. |
| `07-leaderboards-and-accounts.md` | Board types, replay anti-cheat. |
| `08-accessibility-and-localization.md` | a11y features, i18n plumbing. |
| `09-audio-direction.md` | Music + SFX direction, middleware. |
| `10-asset-pipeline.md` | AI-generated art pipeline, tools, quality gates. |
| `11-release-phases.md` | P0–P8 ordered phases (no fixed dates). |

## Boat Shooter map

Inside `games/boat-shooter/`:

| File | Contents |
|------|----------|
| `00-pitch.md` | One-page game pitch. |
| `01-core-loop.md` | Run structure, carryover, stage template. |
| `02-controls.md` | iPad / PC / gamepad inputs. |
| `03-player-ship.md` | Stats model, damage state, cosmetics. |
| `04-weapons.md` | All 13 base weapons (one section each). |
| `05-passives.md` | All 8 passives. |
| `06-evolutions.md` | The 8 evolutions + L5 masteries for un-evolved. |
| `07-battle-system.md` | Damage formula, armor, 5 statuses, 13 reactions. |
| `08-enemies.md` | All 15 regulars + 3 mini-bosses. |
| `09-bosses.md` | All 6 full bosses, phases, mechanics. |
| `10-environment-and-hazards.md` | 8 hazard families + biomes. |
| `11-stages.md` | 15-stage map, biome arc, per-stage composition notes. |
| `12-economy-and-drops.md` | Coin tiers, drop tables, chests, maps. |
| `13-merchants.md` | Shipwright Cove + Black Market. |
| `14-meta-progression.md` | 7 tracks × 10 levels, gem curve. |
| `15-leaderboards.md` | Campaign / per-stage / boss / weekly. |
| `16-progression-unlocks.md` | NG+, achievements, cosmetics. |
| `17-art-bible.md` | Painterly-pirate style lock, palette, references. |
| `18-audio-bible.md` | In-game music + SFX bible. |
| `19-balance-tables.md` | Master balance numbers (living doc). |
| `99-open-questions.md` | Parking lot for unresolved items. |

## Status

All docs below reflect design decisions **locked** during the 2026-04-19/20
interview unless marked *pending*. Changes require a conscious decision,
not drift.
