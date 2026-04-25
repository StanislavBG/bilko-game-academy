# HUD + Combat Log — 2026 Readability Pass

Scope: make it **immediately clear** when damage is dealt *and* received,
build a **combat log** that explains what just happened, move existing
persistent panels (player properties, combat log) to the **bottom
corners** where they're glanceable without occluding action, and layer
the rest of the HUD with 2026-grade trends — contextual, minimal,
opt-in-detailed.

---

## 1. 2026 HUD trends this plan borrows from

Design lineage across recent roguelikes / shooters / deckbuilders we'll
adapt (not imitate wholesale):

1. **Glanceable-by-default, details on demand.** HUD shows only what
   you need while aiming; deep info lives in a minimize-able panel
   (Helldivers 2, Destiny 2 armor log, PoE 2 skill bar).
2. **Combat log as a scrolling side-rail.** Persistent, fading, with
   tier colors + icons. Mirrors Path of Exile 2's right-side damage
   feed and Balatro's scoring breakdown.
3. **Hit-marker + damage tier system.** Bright color-coded popups
   with font-weight scaling (normal / crit / big-crit / DoT / heal /
   reaction). Hades-style but more legible.
4. **Screen-edge pulse on damage taken.** No more tint-flashing the
   sprite only. A red vignette pulses in from the screen edges and
   fades; intensity scales with damage severity (Doom 2016 / Hunt
   Showdown).
5. **Streak + combo counters.** Kill chain, crit chain, reaction
   chain. Tilt away from the action until a streak builds, then slide
   in with a small scale-pop. Fades if the chain breaks.
6. **Toast stack.** Level-ups, picks, boss-phase transitions, evo
   unlocks, achievement flashes. Top-center, vertical stack, 1.2 s
   each, eases away after.
7. **Radar / minimap only if it adds info.** For Boat Shooter: a
   **threat-arrow ring** showing off-screen enemies + their distance
   + their element badge. Ships to Act II where off-screen spawns
   become common.
8. **Readability over realism.** 2026 taste: numbers legible on small
   screens, VFX never block dodge-critical visuals. Opt-in
   photorealism → opt-in **arcade shorthand** (pulse-rings, colored
   dashes).

---

## 2. Audit — current HUD

Files: `src/scenes/hud-scene.ts`, `src/entities/damage-number.ts`,
`src/systems/vignette.ts`.

Reading the code:

- **Top-center:** HP bar, XP bar, level, coins, gems (HudScene).
- **Top-right:** small weapon/passive readouts (if implemented).
- **Center-screen:** damage numbers float up from enemy hit points.
- **Bottom:** nothing.
- **Player properties panel:** exists as a side-list in the LevelUpScene
  overlay but NOT persistent during combat.
- **Combat log:** **doesn't exist**.
- **Damage taken feedback:** player sprite tints red 0xff9090 below 50%
  HP (`player.ts:806`) + alpha-flash iframes (`player.ts:792`). No
  screen-edge pulse, no combat-log entry.

**Consequences:** the user reports "not clear when I'm taking damage"
— because the only signal is a subtle alpha flicker on a moving
ship, which the eye misses mid-dodge. And there's no record of WHY
HP dropped (which enemy, what damage type, was it reduced).

---

## 3. Layout — 2026 anchor grid

```
┌──────────────────────────────────────────────────────────────┐
│  [HP bar   XP bar   lvl   $coins   ◆gems]    [toast stack]   │   ← top
│                                                              │
│                                                              │
│                                                              │
│                      GAMEPLAY AREA                           │
│                                                              │
│                                                              │
│  [THREAT-ARROW RING — edges]                                 │   ← screen edges (overlay)
│                                                              │
│                                                              │
│  [PLAYER                                   [COMBAT LOG       │
│   PROPERTIES ▾]                              ▾]              │   ← bottom-left / bottom-right
└──────────────────────────────────────────────────────────────┘
```

- **Top-center:** vitals strip. Same as today but compressed.
- **Top-right:** toast stack (level-up, pick chosen, evo unlock).
- **Bottom-left:** Player Properties panel (minimize-able).
- **Bottom-right:** Combat Log panel (minimize-able).
- **Screen edges:** red vignette pulse on damage; white pulse on crit
  dealt; cyan pulse on reaction triggered.
- **On-screen center-float:** damage numbers (unchanged anchor).

Collapsed state: both bottom panels reduce to a single 28 px pill with
an arrow icon + single-stat summary (e.g. "PROPS ▴  4 wpn / 2 pass" on
the left, "LOG ▴  312 dmg / 3 kills" on the right). Expand on click
with a slide-up animation.

---

## 4. Damage feedback (player-received)

Four layers, applied each time the player takes damage ≥ 1:

1. **Screen-edge red pulse.** New `vignette-pulse` rectangle rendered
   by `Vignette` system. Radial gradient, edge-thickness scales with
   damage (1 dmg → 40 px, 2 dmg → 70 px, 3+ → 100 px). Fades over
   300 ms.
2. **Center-shake.** 120 ms camera shake, intensity 0.003–0.008 scaling
   with damage. Gated by reduced-motion.
3. **Low-pass audio duck.** The music mix briefly dips −3 dB for
   200 ms. Gives the hit acoustic weight.
4. **Combat-log entry.** "Hit: Patrol Gunboat → 2 dmg (after Copper
   Hull −1)" in red. Source enemy's element badge inlined.

For **contact damage** vs **projectile damage**, the log row also
carries a small icon (bow/bullet, fist/ram).

Exception: **iframes.** When a hit is absorbed by iframes, a *blue*
quarter-second pulse plays instead (feels like "dodged"); log entry:
"Absorbed: N Skiff (iframes +300 ms)".

---

## 5. Damage feedback (player-dealt)

Enhancing `damage-number.ts` behaviour:

- **Hit marker.** 4-line crosshair pop at the hit location, white on
  normal, gold on crit, cyan on reaction. 120 ms.
- **Damage number tiers:**
  - *Tiny (1 dmg)* — small grey, no stroke.
  - *Normal (2–9)* — white, thin stroke.
  - *Big (10–24)* — yellow, bold stroke, slight scale pop.
  - *Crit* — gold, +25% size, italic.
  - *Mega-crit (≥ 50)* — gold + white-glow, +40% size, pulses 1×.
  - *DoT tick* — red-orange, smaller, floats *down* slightly.
  - *Heal* — green, floats up with a + prefix.
  - *Reaction* — per-reaction color (already in reactions.json); +
    reaction icon inline.
- **Combat-log entry on kill.** "Kill: Patrol Gunboat (138 dmg total, 2
  crits, +3 xp)" with the enemy's element badge colored by last-hit
  element.

Chain effects (2026 juice):

- **Kill streak counter** slides in at top-left when ≥ 3 kills within
  2 s. Shows "x4 KILL STREAK" + multiplier if relevant. Fades if no
  kill in 2 s.
- **Crit streak counter** same mechanic, top-left-below-kills. "x3
  CRIT CHAIN". Triggers at 3+ consecutive crits.

---

## 6. Combat log — format + lifecycle

New scene: `CombatLogScene` (or sub-panel inside HudScene).

### 6.1 Anchor & size
- Bottom-right corner, 320 × 240 px expanded.
- Collapsed pill: 200 × 28 px.
- Layer below toast stack, above gameplay.
- `depth = 1400` (HUD bucket).

### 6.2 Row format
```
[12s] ⚔ 5 ⚡→ Patrol Gunboat     ← dealt 5 dmg, crit, storm
[12s] 💥 2 ← Bank Sniper Tower  ← took 2 dmg from sniper
[11s] 💀 Scout Skiff +12 xp     ← killed it
[10s] 🔥 Burn 3 → Mortar Barge  ← DoT tick
[10s] 🌊 Wet applied → Ghost Ship ← status
[09s] ✴ Storm × Wet → Shock    ← reaction triggered
```

- Timestamp on the left (`[Ns]` = seconds-since-stage-start).
- Icon second (⚔ dealt, 💥 took, 💀 kill, 🔥 DoT, 🌊 status, ✴ reaction).
- Human-readable one-liner.
- Color-code per icon kind.

Rows added top-of-list, oldest rolls off after 40 rows or 30 s.

### 6.3 Filtering
Row kinds in the header as toggle pills:
```
[All ✓] [Damage ✓] [Kills ✓] [DoT ✓] [Status ✓] [Reaction ✓]
```
Each toggle filters without clearing the underlying log (log remains
fed; view is filtered). Per-session persistent in `ctx.settings`.

### 6.4 Minimize / expand
- Click the pill → expands in 160 ms.
- Click the chevron in the header → collapses.
- `B` or `L` keyboard shortcut also toggles.
- Collapsed summary shows aggregated last-5-s: *"LOG ▴ 312 dmg / 3
  kills / 1 crit"*.

### 6.5 Verbose debug mode
A URL flag `?combatdebug=1` (set to `1` by default in dev) expands
each row to a multi-line detail:

```
[12.3s] ⚔ HIT Patrol Gunboat (id 42)
         weapon=bow-cannon L3 | base=1 | crit=no | dmg=5 (shatter ×2)
         target hp 4→-1 (killed)
         xp +3 | coins +2 | drops: gemstone x0, map frag x0
```

Helps the user + us debug exactly why a hit did what it did — which
the user explicitly asked for.

Implementation: `CombatLog.push(entry)` with a discriminated-union
`entry` type; renderer chooses short or verbose format based on
`verboseDebug` flag.

---

## 7. Player properties panel (bottom-left)

New scene: `PlayerPropsScene`, or sub-panel in HudScene.

### 7.1 Anchor & size
- Bottom-left, 320 × 260 px expanded.
- Collapsed pill: 220 × 28 px.

### 7.2 Content (expanded)
Three tabs:

**Tab A — Ship.**
```
⛵ The Ember Corsair
HP  4/6      Speed  280 px/s
Crit 15% × 1.5×        Pierce 0
Damage mult 1.10×      Fire rate 3.0/s
Magnet 100 px          Cooldown red. 0%
```

**Tab B — Loadout.**
```
Weapons:
  🔥 Flamethrower L2       ← ship starter
  ⚓ Bow Cannon L1
  ⚡ Chain Lightning L1
Passives:
  🏴 Crow's Nest L1        ← ship starter
  🔭 Spyglass L1
Evolutions:
  — (none yet)
```

**Tab C — Status.**
```
XP 4/20   Level 3
Gems 2
Map fragments: 0
Achievements this run: 3
Stage: Rivermouth (Stage 1)
```

### 7.3 Minimize / expand
Same pattern as combat log. Keyboard `P` or the chevron. Persists per
session in settings.

### 7.4 Why this is not LevelUpScene
LevelUpScene shows *options* for a pending pick. PlayerPropsScene shows
*current state* during live play. Different temporal mode.

---

## 8. Additional HUD elements

### 8.1 Threat-arrow ring (Act II onward)
Small arrows anchored at the screen edge pointing to off-screen
enemies. Color = enemy element badge. Scale = enemy threat tier. Fades
when the enemy comes on-screen.

### 8.2 Toast stack (top-right)
- Level up ("LEVEL 3 →  pick a bonus").
- Pick taken ("+ CROW'S NEST L2 — +30% damage").
- Evolution unlocked ("★ CANNONADE SUPREME — Bow Cannon evolved").
- Achievement unlocked ("◆ 100 KILLS").
- Boss phase transition ("PHASE 2 — THE PIRATE KING LANDS CREW").
- Stack up to 4 at once; auto-dismiss after 1.5 s.

### 8.3 Reaction callouts (center-screen, brief)
When a reaction triggers (13 total per `reactions.json`), the reaction
name flashes for 300 ms at the reaction's spatial origin, in the
reaction color. Non-blocking (doesn't pause gameplay).

### 8.4 iframe ring
While the player is in iframes, a faint 4 px white ring pulses around
the ship (inside the oval mask footprint). Makes it unambiguous that
"you're invincible for another 500 ms."

### 8.5 Boss health (top-center reserved region)
When a boss is active: top-center switches from vitals to a **boss
HP bar** + phase-segment ticks. Vitals compress into a smaller strip
underneath.

---

## 9. Data plumbing

New `systems/combat-log.ts`:

```ts
export type CombatLogEntry =
  | { kind: 'dealt';   time: number; target: string; amount: number;
      weapon: string; isCrit: boolean; element: Element; kill: boolean }
  | { kind: 'taken';   time: number; source: string; amount: number;
      type: 'contact'|'projectile'|'dot'; reduced: number; element: Element }
  | { kind: 'kill';    time: number; target: string; xp: number; totalDmg: number }
  | { kind: 'dot';     time: number; target: string; status: StatusId; amount: number }
  | { kind: 'status';  time: number; target: string; status: StatusId; added: boolean }
  | { kind: 'reaction';time: number; target: string; reaction: ReactionId; amount: number };

export class CombatLog {
  push(entry: CombatLogEntry): void;
  recent(windowMs: number): CombatLogEntry[];
  recentAggregate(windowMs: number): { dmgDealt: number; dmgTaken: number; kills: number; crits: number };
  onPush(fn: (e: CombatLogEntry) => void): () => void;
  setVerboseDebug(on: boolean): void;
}
```

Where to push from:
- `CollisionSystem.onProjectileHit` → `dealt` entries.
- `Player.takeDamage` → `taken` entries.
- `Enemy.destroy` → `kill` entries.
- `StatusSystem.tick` → `dot` entries (per-tick, batched).
- `StatusSystem.apply` → `status` entries.
- `ReactionSystem.trigger` → `reaction` entries.

---

## 10. Settings

Extend `settings.json` schema:

```json
"hud": {
  "combatLogAnchor": "bottomRight",      // "bottomRight" | "bottomLeft" | "hidden"
  "propsPanelAnchor": "bottomLeft",
  "combatLogCollapsed": false,
  "propsPanelCollapsed": false,
  "combatLogFilters": ["damage","kill","reaction"],
  "combatLogVerbose": false,
  "damageNumbersTier": "full",           // "off" | "simple" | "full"
  "screenEdgePulse": true,
  "threatArrows": true,
  "toastStack": true
}
```

All defaults on; the user can audit or reduce visual load.

---

## 11. Accessibility

- All damage-taken color cues have a **secondary shape cue** (shake +
  pulse border) so color-blind players don't miss them.
- Screen-edge pulse has an intensity slider 0–100%, 0 = disabled.
- Combat log font is min 16 px (20 px target).
- Every panel collapse button is a min 44 × 44 px target.
- Toasts respect `reducedMotion` — slide animation → fade only.

---

## 12. Execution sequence

```
1. systems/combat-log.ts  (pure data)
   + push sites in CollisionSystem, Player.takeDamage, Enemy.destroy,
     StatusSystem, ReactionSystem.
2. damage-number.ts — tier system (tiny/normal/big/crit/mega/dot/heal/reaction).
3. vignette.ts — pulseOnDamage() method; red/white/cyan flavors.
4. hud-scene.ts — compress vitals strip; reserve top-right for toast stack.
5. scenes/combat-log-scene.ts — bottom-right panel + filtering toggles + verbose debug.
6. scenes/player-props-scene.ts — bottom-left panel + 3-tab view.
7. scenes/toast-scene.ts — event-driven stack.
8. hud-scene.ts — streak counters (kill chain + crit chain).
9. player.ts — iframe ring + damage-reception hook into vignette.
10. Accessibility pass — shape cues, font sizes, reduced-motion fallbacks.
11. Settings schema + defaults.
12. Playtest: start Stage 1; confirm every hit / take / kill lands a log row;
    open & collapse both panels; check edge pulse; trigger a reaction;
    trigger a level-up; confirm toasts; confirm verbose-debug flag.
```

Estimated effort: **~4 days** (compact because most pieces are
scene-local additions, not cross-system refactors).

---

## 13. Non-goals

- No gameplay balance changes. Pure readability + debug.
- No persistent run-history log (combat log is per-stage).
- No networked multiplayer log. Single-player focus.
- No full redesign of LevelUpScene or StageClearScene — they stay as
  they are; this plan orbits them.
