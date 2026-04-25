# Release Phases (no fixed dates)

Phases are strictly ordered; do not start a phase until the previous one's
verification gates pass. No calendar deadlines — ship each phase when it's
ready.

## P0 — Foundations

**Scope:** monorepo + PWA shell + empty Boat Shooter scene.

- Repo + monorepo scaffold (pnpm workspaces, TS strict, Vite, Tailwind).
- React shell boots at `/` on iPad Safari and desktop Chrome.
- PWA install works ("Add to Home Screen").
- Game SDK contract (`packages/game-sdk/src/types.ts`) defined.
- Empty Boat Shooter game mounts a Phaser canvas showing scrolling water.
- Settings/save/IndexedDB plumbing (Zustand + idb-keyval).

**Demo:** open the installed PWA on iPad, see an empty boat floating on
scrolling water.

**Gates:** see `docs/` main plan §8.1.

## P1 — Core Loop

**Scope:** play a single stage end-to-end with basic combat.

- Player ship with HP, movement, iframes.
- 3 weapons (Bow Cannon, Broadside, Harpoon) auto-firing.
- XP orbs + level-up flow (pick 1 of 3).
- 1 passive (Crow's Nest) pickable at level-up.
- 3 enemies (Scout, Patrol Gunboat, Ramming Brigand).
- Stage 1 map (Tiled, hand-drawn rough biome).
- Frigate Captain mini-boss (2 phases).
- Stage complete → return to home.

**Demo:** "First Blood" — 1 stage, 3 weapons, 1 mini-boss.

## P2 — Combat Depth

**Scope:** full combat systems, Act I playable.

- All 13 weapons + all 8 passives + weapon stacking (6+6 slots).
- All 15 regular enemies + 3 mini-bosses.
- Battle system: damage formula, armor + pierce, all 5 statuses,
  13-reaction matrix (10 two-way + 3 three-way), JSON-driven.
- Chests (all 4 tiers) + Shipwright Cove merchant (no Black Market yet).
- Coin economy with magnet + Cargo Nets passive.

**Demo:** Act I complete — stages 1–5 + B1 Delta Commodore + B2 Pirate King.

## P3 — Evolutions + Meta

**Scope:** long-term progression.

- All 8 evolutions + L5 mastery bonuses for un-evolved weapons.
- 7 meta-progression tracks with gem UI + all 10 levels each.
- Cosmetics system (hull, sails, figurehead, wake).
- Treasure map fragment system + 3 hidden stages.

**Demo:** play Act I, evolve a weapon, spend gems, re-run stronger.

## P4 — Content Complete

**Scope:** all content.

- Acts II + III — 10 more stages, B3 Ghost Commodore, B4 Drowned
  Admiralty, B5 Obsidian Warlord, B6 Kraken Ancient.
- 4 leaderboards (local only for now).
- NG+ mode with remixed enemy placements.
- Weekly Challenge seed generator.
- Full audio pass: 5 music tracks + ~200 SFX.

**Demo:** full campaign playthrough recording.

## P5 — Backend + Leaderboards

**Scope:** multi-device + social.

- Supabase auth + cloud save.
- Global leaderboards with server-side score validation.
- Weekly challenge seed server.
- ~40 achievements.

**Demo:** invited beta testers compete globally.

## P6 — Polish + Accessibility

**Scope:** production-readiness.

- All a11y features (reduced motion, colorblind, high contrast, text
  scale, input a11y).
- i18n plumbing + polished English strings.
- Tutorial / onboarding flow.
- Performance pass: 60 fps on iPad Air 4, < 25 MB gzipped.

**Demo:** polish reel; public beta opens.

## P7 — Beta + Final Polish

**Scope:** launch prep.

- Public beta via PWA link.
- Balance pass from beta data.
- Final Kraken boss Phase 4 cinematic + final chest polish.
- Launch trailer video.

**Demo:** public beta traffic.

## P8 — Launch

**Scope:** v1.0.

- Ship PWA.
- Post-launch: weekly challenges, community translations, free content updates.

## Stretch (v1.x+)

- Black Market Merchant system.
- More hidden stages (Maps 6+).
- Screen reader support in menus.
- Second game starts development, validating the shared platform.
