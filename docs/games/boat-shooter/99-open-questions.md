# Open Questions & Parking Lot

Things we flagged but didn't decide during the 2026-04-19/20 design interview.
Revisit during P2 playtest or earlier if they block work.

## Balance risks (flagged at design time)

- **Uncapped crit + uncapped CDR + crit-bypass-armor** = degenerate one-shot
  builds are possible by Act III. Design intent: let chaos happen, but scale
  enemy HP in Act III + NG+ aggressively and make build-enabling combos
  hard to assemble. Revisit after P4 playtest.
- **Powder Barrel** was originally shared by W1 Bow Cannon and W7 Mortar
  for evolution. Resolved by giving Bow Cannon the evo and leaving Mortar
  with an L5 Mastery. Watch if players feel Mortar is "incomplete" in playtest.

## Scope considered, deferred to post-launch

- **Black Market Forbidden Weapons** — inventory slot reserved, not spec'd.
- **3-way reaction R11 Cataclysm** is very powerful (screen-clear). May need
  adjustment if it trivializes boss phases.
- **Co-op / PvP** — solo-only in v1. Game SDK has a `netAdapter` stub left open.
- **Screen reader** — metadata on shell/HUD only; not full in-game support.
- **Per-game accessibility difficulty modifiers** (more iframes, slower enemies) — post-launch.
- **Additional treasure maps** (Maps 6+) — post-launch content.

## Design-to-verify in playtest

- **Boarding Event** (Pirate King P2) camera-zoom — does it feel tense or disruptive?
- **Possession** (Ghost Commodore P2+) — does the 1.5 s telegraph give enough reaction time on iPad?
- **Kraken Phase 1** (4-tentacle gate) — does it feel like a puzzle or a slog?
- **Weekly Challenge** modifier design — needs a pool of ~20 modifiers; only sketched so far.

## Engineering open questions

- **Spine vs pure Aseprite** for boss rigs — committed to Spine for the final Kraken and Banshee; evaluate workload in P2.
- **Web worker audio decoding** — on older iPads, startup audio decode can stall. Measure in P0 and decide if worth offloading.
- **Service worker asset caching strategy** — full precache vs on-demand. Needs measurement against the 25 MB budget in P6.

## Narrative

- Act-break comic-stinger content — 1–2 panels per act. TBD what happens
  in each: does the captain find a ghostly artifact in Act I–II? What
  happens in the final Act III stinger (before Kraken)?
- Flavor text for each weapon pickup — witty one-liners. TBD.
- Enemy encyclopedia entries — short flavor per enemy. TBD.
