# Weapons — 13 base weapons

## Rules (recap)

- **6 weapons + 6 passives** active slots per run.
- **Per-weapon default targeting**, mostly auto-nearest (see `02-controls.md`).
- **Per-weapon unique L1→L5 curve.** Each weapon has a bespoke scaling
  table (some +projectile count, some +damage, some +radius, some +fire rate).
- **Evolutions** trigger at L5 + paired passive held + Shipwright Chest
  (see `06-evolutions.md`).

## W1. Bow Cannon Volley  (starter — direct projectile)
- **Targeting:** auto-forward (up the screen).
- **Feel:** reliable workhorse; always firing.
- **Curve:**
  - L1: 1 proj, 3.0 shots/s, 1 dmg, 0 pierce
  - L2: 2 proj (small spread)
  - L3: 2 proj, 3.5 shots/s
  - L4: 3 proj
  - L5: 3 proj, +1 pierce, +25% dmg
- **Evo pair:** Powder Barrel → **Cannonade Supreme**.

## W2. Broadside Shot  (direct projectile, both sides)
- **Targeting:** fires ports + starboard simultaneously, fixed direction.
- **Feel:** rhythmic big-gun salvo — "BOOM-BOOM".
- **Curve:**
  - L1: 3 cannons/side, every 4.0 s, 2 dmg
  - L2: 4/side
  - L3: 4/side, every 3.0 s
  - L4: 5/side
  - L5: 5/side, every 2.5 s, +1 dmg, +1 pierce
- **Evo pair:** First Mate → **Thunderclap Broadside**.

## W3. Harpoon  (direct piercing line)
- **Targeting:** auto-nearest.
- **Feel:** slow thunk, massive pierce, yanks small enemies.
- **Curve:**
  - L1: 1 harpoon, every 2.5 s, 3 dmg, 3 pierce
  - L2: 1, every 2.0 s, 4 pierce
  - L3: 2 (staggered), every 2.0 s
  - L4: 2, every 1.5 s, 5 pierce
  - L5: 3, every 1.5 s, 6 pierce, +1 dmg
- **Special:** small enemies (HP ≤ 5) struck are pulled toward the boat
  and die on arrival; bosses/elites unaffected.
- **Evo pair:** none (un-evolved).
- **L5 Mastery:** yanks also apply to medium enemies (HP ≤ 15).

## W4. Chain Lightning  (beam, chains)
- **Targeting:** auto-nearest first, then chains within 150 px.
- **Feel:** zap-zap-zap; clears clusters.
- **Curve:**
  - L1: 1 target + 1 chain, every 2.5 s, 2 dmg, ~150 px chain
  - L2: 1 + 2 chains, every 2.0 s
  - L3: 1 + 3 chains, every 2.0 s, +1 dmg
  - L4: 1 + 4 chains, every 1.5 s, +0.3 s stun
  - L5: 1 + 5 chains, every 1.0 s, +1 dmg, +0.5 s stun
- **Evo pair:** Storm Compass → **Tempest Cannonade**.

## W5. Flamethrower  (cone DoT)
- **Targeting:** auto-forward cone from bow.
- **Feel:** sustained WHOOSH; melts groups ahead.
- **Curve:**
  - L1: 60° cone, 180 px range, 1.0 dmg/tick @ 5 ticks/s, Burn 1/s × 2 s
  - L2: 70°, 200 px
  - L3: 70°, 200 px, 1.5 dmg/tick
  - L4: 80°, 240 px, Burn 2/s
  - L5: 90°, 280 px, 2.0 dmg/tick, Burn 2/s × 4 s, ignites oil slicks
- **Evo pair:** Crow's Nest → **Inferno Breath**.

## W6. Lighthouse Beam  (rotating 360° beam)
- **Targeting:** rotates around boat at constant angular speed.
- **Feel:** sweeping cinematic beam; signature pirate-ship silhouette.
- **Curve:**
  - L1: 600 px long, 30°/s rotation, 1 dmg/tick @ 3 ticks/s
  - L2: 45°/s
  - L3: 60°/s, 2 dmg/tick
  - L4: 90°/s, +0.2 s slow on hit
  - L5: 120°/s, 3 dmg/tick, +0.4 s slow
- **Evo pair:** none (un-evolved).
- **L5 Mastery:** crits apply slow to all enemies hit; **applies Wet 3 s on hit**.

## W7. Mortar  (arc AoE)
- **Targeting:** auto-random enemy on screen.
- **Feel:** THUNK → flies off screen → "foomph" explosion.
- **Curve:**
  - L1: 1 shell, every 3.0 s, 3 dmg, 80 px blast, 1 s fuse
  - L2: 2 shells (staggered 0.3 s)
  - L3: 2 shells, every 2.5 s, 100 px blast
  - L4: 3 shells, 120 px blast, +1 dmg
  - L5: 4 shells, every 2.0 s, 140 px blast, +2 dmg, cluster (3 bomblets)
- **Evo pair:** none (un-evolved).
- **L5 Mastery:** 20% chance for shell to double-impact + **20% frost-shell (Freeze 1 s in 80 px)**.

## W8. Fire-Arrow Rain  (arc drop, zone DoT)
- **Targeting:** auto-places zone 80 px ahead of boat.
- **Feel:** telegraphed shadow on water, then arrow shower.
- **Curve:**
  - L1: 120×120, every 4.0 s, 6 arrows over 1 s, 1 dmg each, +Burn 1/s × 2 s
  - L2: 150×150, 8 arrows
  - L3: 150×150, every 3.5 s, 10 arrows
  - L4: 180×180, 12 arrows, +1 dmg
  - L5: 200×200, every 3.0 s, 16 arrows, +2 dmg, lingering 3 s fire patch (1 dmg/s)
- **Evo pair:** none (un-evolved).
- **L5 Mastery:** fire patch duration ×2; **20% frost-arrows (Freeze 1 s)**.

## W9. Kraken-Ink Cloud  (aura trailing boat)
- **Targeting:** anything inside the radius.
- **Feel:** dark purple cloud drifts in boat's wake.
- **Curve:**
  - L1: 120 px radius, 1 dmg/tick @ 2 ticks/s, -20% enemy speed
  - L2: 140 px
  - L3: 160 px, 1.5 dmg/tick
  - L4: 180 px, 3 ticks/s, -30% slow
  - L5: 220 px, 4 ticks/s, 2 dmg/tick, -40% slow, +Poison 1/s × 3 s post-exit, **applies Wet while inside**
- **Evo pair:** Spyglass → **Leviathan Ink**.

## W10. Spinning Boarding-Axes  (orbit)
- **Targeting:** whatever they touch as they rotate.
- **Feel:** visual shield of weapons; shreds close-range threats.
- **Curve:**
  - L1: 1 axe, 100 px orbit, 1 dmg, 0.3 s per-enemy cooldown
  - L2: 2 axes (opposed)
  - L3: 3 axes, +25% rotation
  - L4: 4 axes, +1 dmg
  - L5: 6 axes, 120 px radius, +1 pierce-per-tick, knockback
- **Evo pair:** Copper Hull → **Sawblade Fortress**.

## W11. Homing Musket Swarm  (homing burst)
- **Targeting:** each projectile seeks its own nearest enemy.
- **Feel:** little puffs of smoke trailing small homing dots.
- **Curve:**
  - L1: 3 balls, every 3.0 s, 1 dmg, 400 px/s, weak homing
  - L2: 4 balls
  - L3: 5 balls, every 2.5 s
  - L4: 6 balls, every 2.0 s, +1 dmg, strong homing
  - L5: 8 balls, every 1.5 s, +1 dmg, +1 pierce, retarget-after-kill
- **Evo pair:** none (un-evolved).
- **L5 Mastery:** projectile count scales with on-screen enemies (up to cap 8).

## W12. Stern Mines  (drop-behind trap)
- **Targeting:** dropped at boat's tail; triggers on proximity or 8 s timer.
- **Feel:** "tink" drop sound; chasers detonate explosive trails.
- **Curve:**
  - L1: 1 mine / 2.5 s, 3 dmg, 60 px blast, 50 px proximity
  - L2: 1 / 2.0 s
  - L3: 2 (side-offset), 2.0 s
  - L4: 2, 1.5 s, 80 px blast
  - L5: 3 (fan), 1.0 s, 100 px blast, +1 dmg, chain-detonate
- **Evo pair:** Cargo Nets → **Minefield**.

## W13. Ghost-Crew Volley  (summon burst)
- **Targeting:** ghosts materialize, auto-fire at nearest, fade.
- **Feel:** spectral sailors appear for a moment, volley, vanish.
- **Curve:**
  - L1: 2 ghosts every 5 s, 3 shots/ghost, 1 dmg, linger 1 s
  - L2: 3 ghosts, linger 1.5 s
  - L3: 3 ghosts, every 4 s, 4 shots
  - L4: 4 ghosts, 4 shots, +1 dmg
  - L5: 5 ghosts, every 3 s, 5 shots, +2 dmg, bonus dmg vs Supernatural
- **Evo pair:** Admiral's Flag → **Ghost Armada**.
