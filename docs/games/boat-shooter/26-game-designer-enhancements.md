# Game-Designer Enhancements — The Shipping Gap

You have a mechanically solid roguelike shmup. What's missing is the
**design connective tissue** that turns a mechanics-complete game into
one the player *wants to keep playing and talk about*. This doc is a
prioritized enhancement map.

Ordered by **impact / effort**. Top of list ships first.

---

## 1. Top 5 — ship these next

These are the highest leverage per day of work. Each one transforms
how the game *feels* rather than adds a system.

### 1.1 Opening tutorial (~0.5 day)
Today a new player is dropped into Stage 1 Rivermouth with zero
context. No "who am I," no "how do I fire," no "what's the goal."

Proposal: a **20-second interactive intro** that runs once per save.
Before waves spawn in Stage 1:
- 2 s: title card — "You are Captain Bilko. The Kraken has your first mate."
- 4 s: "Drag to steer" instruction with a pulsing arrow on the ship,
  gated by first player input.
- 4 s: a lone Scout Skiff spawns dead-ahead; "Cannon fires automatically.
  Aim by moving."
- 4 s: an XP orb drops; "Pick up XP to level up and choose upgrades."
- 4 s: "Survive 15 stages. Good luck, Captain."
- Then the normal wave timer kicks in.

Skip on second run. Stored in `ctx.save` as `tutorialSeen: true`.

### 1.2 Run summary / shareable card (~0.75 day)
End-of-run currently goes straight to `StageClearScene` or
`GameOverScene`. Neither screen *celebrates* what you did.

Proposal: a **"Captain's Log" card** rendered to a PNG-downloadable
canvas on both stage-clear and death:
- Top: ship emoji + name, stage reached.
- Middle: 3 highlight stats (most damaged, best crit, longest kill
  streak) — read from `CombatLog.recentAggregate(Infinity)`.
- Bottom: **favorite reaction** (most-triggered per run),
  **close-call count** (hits where HP dropped to 1), **build tagline**
  auto-generated from top weapon + passive ("A Storm Crit build").
- A "Download as image" button that writes the canvas to a PNG download.

Sharing turns a single-player roguelike into a community moment. The
cost is one new scene + a canvas painter.

### 1.3 Death post-mortem (~0.4 day)
When the player dies, show a **"Here's what happened"** card before
the game-over CTA:
- "**Killed by:** Patrol Gunboat (final blow: 2 dmg)."
- Last 5 log rows from `CombatLog` rendered inline.
- A one-line **tip**: heuristically chosen from a table — e.g., if
  >50% of damage taken was `contact`, "Consider grabbing Copper
  Hull or kiting more." If the killing enemy was a Sniper, "The red
  laser is your dodge cue."
- Button: **Try again** / **Return to Home**.

Makes death a lesson rather than a wall. Biggest single retention
lift per hour of work.

### 1.4 Adaptive music layers (~1 day)
`AudioSystem` already plays per-act loops. What's missing is **combat
intensity** as a second axis.

Proposal: every music track authored in **2 layers** — "calm" (base
melody, low drums) and "combat" (adds percussion + brass). At
runtime, StageScene tracks `danger = Math.min(1, enemiesOnScreen / 10
+ (bossActive ? 0.5 : 0))` and cross-fades the combat layer between
0.0 and 1.0 alpha over 2 s. Same track, one new mix layer per act.

Boss fights get a **third layer** (choir stab + crescendo) locked on
while the boss is alive.

Adaptive audio is the single biggest AAA-feel cue the game currently
lacks.

### 1.5 Daily seeded run (~0.6 day)
Weekly exists. Daily drives retention 5× more. Same mechanics:
- UTC-day-based seed (`dayOfYear * 997 + year * 11` modulo 2^31).
- Locked ship pick (seed-derived). Everyone gets the same Ember on
  Monday, Tempest on Tuesday, etc.
- Same 3 weekly modifiers rotation, but 1-of-3 derived from seed.
- New `daily-<date>` leaderboard board. Shows top 50.
- Home screen adds a **"TODAY'S RUN"** tile alongside Campaign /
  Weekly.

Daily anchors users to a check-in habit. Very cheap to add.

---

## 2. Second-tier — ship in the next milestone

Higher impact, higher cost. Each one is a multi-day project.

### 2.1 Local two-player couch co-op (~4 days)
This is the single biggest differentiator for a family game.
- Player 1: keyboard/gamepad-1, left half of controls.
- Player 2: keyboard/gamepad-2, right half.
- Both ships on-screen. Shared HP pool (simpler) or dual HP bars
  (harder but better).
- Revive mechanic: one player can sail to the other's wreckage within
  15 s and revive.
- Scales enemy count + HP by 1.5× in co-op.

The `RunState` needs a tiny refactor — most per-player fields
(weapons, passives, XP) duplicate. Most global fields (coins, gems,
evolutions) stay shared.

### 2.2 Nemesis captains (~3 days)
Borrow from Shadow of Mordor, scoped way down.
- Every 3rd Patrol Gunboat wave has a 15% chance to be a **named
  captain** — "Gunnery Master Finch," "Red Sails Morrow," etc.
- Named captains are **persistent** in the save: if you're killed by
  one, they become a "nemesis" with a scar on their ship and a custom
  name color (red).
- Next run, that nemesis spawns again, earlier than normal, and their
  sprite gets a badge (skull marker).
- Killing a nemesis drops a **guaranteed evolved chest** (gold-tier)
  + unlocks their portrait in a "defeated nemeses" gallery.
- Cap at 3 active nemeses at a time so the save doesn't bloat.

This is what turns generic enemy waves into **personal stories**.
The sort of thing players talk about.

### 2.3 Build preview / synergy detector (~2 days)
Today you pick Chain Lightning + Storm Compass and *maybe* notice
that it's synergy-rich. The game should *tell* you.

Proposal: on every level-up pick preview, show a **synergy band** at
the bottom of the card:
- If the pick enables an evolution you already hold the other half
  for: "★ Evolution ready: pick a Shipwright Chest to unlock
  Tempest Cannonade."
- If the pick triggers a new reaction from another equipped source:
  "✴ Unlocks: Shock (Wet + Storm)."
- If the pick raises a stat cap meaningfully: "+20% crit (now
  30%)."

Same for the ship picker — show what reactions/evolutions each ship
is angling toward.

### 2.4 World map with narrative beats (~3 days)
The 15 stages are a list. A **map screen** between stages would sell
the journey:
- Parchment-style map of the archipelago with port markers.
- Completed stages render inked-in with a ship trail drawn between.
- Between stages: **captain's log entries** — 2-3 short paragraphs
  of lore written per stage ("We burned the HMS Thunderstrike but
  word is already east — the Delta Fleet is on high alert.").
- Hidden stages (H1–H5) appear as question-marks on the map once
  treasure map fragments are collected.

Narrative spine for 10 hours of play. Cheap because all the map
assets are parchment textures + ink.

### 2.5 Photo mode (~1 day)
Press `F` at any moment → pause, hide HUD, allow camera zoom / pan /
zoom range 0.5×–2×, then a screenshot-to-clipboard button. Works
during boss fights for the epic "my ship vs the Kraken" poster shot.

Combined with the run-summary card, this is your community-content
engine.

---

## 3. Polish — 2026 juice

Small per-item effort, high cumulative feel. Pick 10.

### 3.1 Camera juice
- **Hit-stop** on boss kills: freeze for 80 ms then 100 ms time-slow
  before resuming. Feels AAA.
- **Crit zoom-in**: on crits against a boss, zoom camera +3% for
  200 ms.
- **Near-miss slow-mo**: if a bullet passes within 8 px of the
  player's collision radius without hitting, time slows to 0.7× for
  180 ms.

### 3.2 Number-go-up feedback
- Coins: small gold rise + sparkle + faint cha-ching; counter spins
  up rather than snaps.
- XP bar: smooth fill tween with a golden sliver tracking the head.
- Level up: the new-level number counts up with a ratcheting tick.
- Combat log aggregated "+X dmg" ticker at the right of the HP bar.

### 3.3 Boss-intro choreography
Bosses currently spawn with a banner. Upgrade to:
- Camera slow-zooms from player to boss over 1.5 s.
- Music cuts to a stinger + boss layer (§1.4).
- Boss sprite enters with a shockwave, dust, wake.
- Name card rolls in parchment-style (different per boss).
- Let Go button: tap-to-skip for repeat runs.

### 3.4 Weapon "first-seen" tooltip
First time a weapon appears in the level-up pool, the card briefly
(1.5 s) highlights with an animated pointer and shows an extra detail
line. Subsequent appearances are normal.

### 3.5 Loadout dry-run
From the main-menu / ship-picker: **"Practice Yard"** — an infinite
60-s arena with spawn-a-dummy + spawn-a-wave buttons. Players test
synergies before committing to a real run.

### 3.6 Merchant overhaul
Currently the merchant is a floating hut with 4 items. Make it feel
like a shop:
- When you dock, camera zooms in +15% and background enemies blur.
- Items are laid on a dock counter; hover shows a small cannon
  ball / flag icon preview.
- NPC shopkeeper sprite (a new 256² Gemini gen) with 3 voice-less
  dialog lines ("Choose wisely, Captain.") that rotate.
- Reroll animates the old items sliding off the counter.

### 3.7 Defeat screen variations
Right now dying on Stage 5 looks identical to dying on Stage 15.
Attach per-act death art:
- Act I death: golden-hour scene with the ship sinking gently.
- Act II: fog rolls in, ghostly figures walk past the screen.
- Act III: lava spills across the water, ship turns black.

Just three 1024² death-scene PNGs via the existing Gemini pipeline.

### 3.8 Achievement telemetry
Add a tiny toast when any achievement is *50% complete* — "☼ 48/100
kills toward Captain's Mark." Drives the grind loop.

---

## 4. Meta + live-service

These are the systems that keep the game alive post-launch.

### 4.1 Ghost replays (2 days)
Record input timeline of a completed stage as a small JSON blob
(~5 KB per stage). On stage replay, render a semi-transparent ghost
ship following the stored path. Uses: personal best reruns, daily
seeds, leaderboard ghost races.

### 4.2 Nemesis journal / portrait gallery (1 day)
Pair of §2.2 — a dedicated scene in the profile panel showing
every nemesis you've defeated, with their portrait, kills-of-you,
and revenge arc ("Beat on run #3"). Nothing drives retention like a
kill list.

### 4.3 Season arc (2 days)
Every 30 days: a new cosmetic set + 3 exclusive modifiers for the
Weekly. Seasonal leaderboard resets. No monetization — just a clean
refresh cadence. Critical for the player saying "this game keeps
giving me new things."

### 4.4 Co-op asynchronous (2 days)
Lightweight: you send a friend your ghost replay of a stage, they can
boot a "rescue mission" mode — your ghost fights alongside their
ship. No real-time networking. Fun couch-replacement for families
with members in different houses.

---

## 5. Accessibility — 2026 table-stakes

None of this is optional for a family game shipping today.

### 5.1 Must-have
- **Larger font option** — 1.25× / 1.5× / 2× multiplier on all HUD
  + menu fonts.
- **Dyslexia-friendly font** — toggle to OpenDyslexic or Atkinson
  Hyperlegible for combat log + menus.
- **Aim-assist** — for weapons that auto-target (bow cannon), widen
  the selection cone by +10°/20°/30°.
- **Colorblind palette variants** — already shipped (good).
- **Reduced motion** — already shipped (good).
- **Damage-number intensity slider** — 0–100% to fully disable.

### 5.2 Nice-to-have
- **One-handed mode** — all keyboard controls remap to left hand.
- **Gyro steering** — for iPad / iPhone play.
- **Haptics** — on hit / crit / death. Mobile-specific, cheap.
- **Auto-fire toggle** — already default on, but make it explicit in
  settings.
- **Pause anytime** — already works with `P` / `Esc`; verify it pauses
  audio + tweens too.

### 5.3 Localization
Start with English + Spanish + Portuguese (biggest family markets).
All strings already externalized in `packages/platform-core/src/locales`
— audit for hard-coded English in scenes. Gemini is surprisingly good
at translating game strings with context.

---

## 6. Identity + voice

What does this game sound like when it talks to the player?

### 6.1 Voice guidelines
- **Warm, pirate-flavored, punchy.** "Ahoy, Captain." NOT "Welcome,
  user." Never "click here" — always "set sail."
- **Short.** No paragraph-length tooltips.
- **Consistent.** Every UI string follows the same captain-log tone.

### 6.2 Captain's log
All inter-stage narrative goes in a dedicated captain's-log voice.
1–2 paragraphs per stage. Write the 15 stages' logs as one 2-hour
drafting session. Tone: Patrick O'Brian meets Moana.

### 6.3 Visual identity locks
- One title-card font (Palatino / Georgia — already in use, good).
- One HUD font (Inter — already in use, good).
- Palette lock (art bible §17) — audit that new UI elements follow.
- Never use emoji in-game (only in dev tools + combat log icons).

### 6.4 Music
- Shanty-tinged orchestration. Strings, accordion, fiddle, choir
  stabs. Not cinematic bombast.
- Distinct leitmotif per act (3 total).
- Boss stingers are recognizable, 4–8 seconds each.

---

## 7. Content gaps

Assets/content that would fill obvious holes.

### 7.1 Named cosmetics
The 12 hull / 12 sail / 12 figurehead cosmetics in the
`03-player-ship.md` spec aren't all authored yet. A small batch via
Gemini (~40 PNGs) would unlock the cosmetic shop for Gems to actually
matter.

### 7.2 Ship-specific cosmetics
Each of the 5 elemental ships should have 2–3 alternate-palette
variants unlockable via achievement. E.g., "Ember Corsair — Onyx
Variant" for beating Act III with Ember.

### 7.3 Enemy variants (Act II+)
Doc 22 covered Act I ranged enemies. Act II's ghost-themed enemies
(Ghost Ship, Sea Serpent) need the same phase-3 fire retrofit +
variants.

### 7.4 Hidden rooms
H1–H5 hidden stages exist in the plan but only if treasure maps
stored + used actually work end-to-end. Needs a smoke test.

---

## 8. What I'd cut

As a designer, I'd be suspicious of:

- **13 weapons is a lot.** Beyond 8–10, marginal designs start
  competing. Consider culling 2–3 (candidates: Lighthouse Beam, Ghost
  Crew Volley) or merging them into evolutions of other weapons.
- **7 meta tracks + 10 levels each = 70 pulls.** That's a lot of
  grind. If 2 tracks overlap in feel (e.g., Cargo + Reroll), merge.
- **Weekly modifiers library.** If there are more than 8 active, the
  fun modifiers get diluted. Curate ruthlessly.

Cuts are gifts to the player. A tighter game ships better.

---

## 9. Prioritized action list

If I were you I'd ship in this order:

```
WEEK 1 — core feel
  Day 1   §1.1 Opening tutorial
  Day 2   §1.3 Death post-mortem + §1.2 Run summary card
  Day 3   §1.5 Daily run + §1.4 Adaptive music layers (start)
  Day 4   §1.4 Adaptive music layers (finish)
  Day 5   §3.1 Camera juice + §3.2 Number-go-up feedback

WEEK 2 — narrative + identity
  Day 1-2 §2.4 World map + captain's log
  Day 3   §3.3 Boss-intro choreography
  Day 4   §3.6 Merchant overhaul
  Day 5   §6.4 Music stingers + §6.2 Captain's log draft

WEEK 3 — live-service + co-op
  Day 1-3 §2.1 Local co-op
  Day 4   §4.1 Ghost replays
  Day 5   §4.3 Season arc scaffold

WEEK 4 — nemesis + accessibility + ship
  Day 1-2 §2.2 Nemesis captains
  Day 3   §5.1 Accessibility must-haves (larger font + dyslexia + aim-assist)
  Day 4   §5.3 Localization audit (EN+ES+PT)
  Day 5   Final playtest + bug pass
```

**Ship target:** 4 weeks of solo work turns the current build into a
shipping-grade 2026 indie roguelike.

---

## 10. Non-goals

Things I'd explicitly *not* build right now:

- **Microtransactions / monetization.** User explicitly doesn't want
  it. Great. Don't re-introduce through a "supporter edition" side
  door either.
- **Realtime online multiplayer.** Networking is a 2-month project
  minimum; couch co-op (§2.1) gives 80% of the value for 10% of the
  cost.
- **3D or Unity port.** The painterly 2D style is the game's
  identity. Don't chase fidelity trends.
- **Publisher deal.** Ship it yourself. itch.io + TestFlight + Play
  Store self-publish is fine for a family-targeted game.

---

## Summary

The game's mechanical skeleton is excellent. What it needs is
**connective tissue**: onboarding, narrative spine, community-sharable
moments, and audio that reacts. Four weeks of solo polish takes this
from "impressive MVP" to "a roguelike shmup people tell each other
about."

Pick the top 5, ship them next, and reassess.
