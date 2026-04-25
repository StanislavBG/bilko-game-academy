# Enemies — 15 regulars + 3 mini-bosses

Full bosses are in `09-bosses.md`. Environmental hazards in `10-environment-and-hazards.md`.

## Navy faction (5)

### N1. Scout Skiff
- Role: fodder. HP 2, Armor 0, Speed 180 px/s (fast), contact 1 dmg.
- Fire: single musket every 3 s, 1 dmg, 300 px/s projectile.
- Spawn: all acts, especially Act 1. Groups of 3–5.
- Drops: 1 coin (M), 1 XP orb.
- Special: zigzag movement; panics and retreats at HP < 50%.

### N2. Patrol Gunboat
- Role: ranged backbone. HP 6, Armor 1, Speed 120 px/s, contact 2 dmg.
- Fire: 2-cannon broadside every 2.0 s in range, 1 dmg each, 500 px/s, slight spread.
- Spawn: Acts 1–2 standard; Act 3 "Elite Gunboat" skin filler.
- Drops: 2 coins (M), 5% gem, 1 XP orb.
- Special: matches player's Y position to perpendicular-broadside.

### N3. Mortar Barge
- Role: area denial. HP 10, Armor 2, Speed 60 px/s, contact 3 dmg.
- Fire: mortar arcs to player's **predicted** position every 4 s, 2 dmg + 60 px AoE, 0.8 s red-shadow telegraph.
- Spawn: Acts 2–3, 1–2 at a time, often escorted.
- Drops: 3 coins (L), 10% gem, 1–2 XP.
- Special: won't fire if player is too close.

### N4. Bank Sniper Tower
- Role: stationary riverbank. HP 15, Armor 3, immobile, 0 contact.
- Fire: high-damage rifle every 2.0 s, 2 dmg, 900 px/s, velocity-leading, 0.4 s aim-laser telegraph.
- Spawn: riverbanks in narrow passages, all stages, 1–3/narrow.
- Drops: 4 coins (L), 15% gem, 3% treasure map fragment.
- Special: ducks behind sandbags every 5 s (1 s iframes); cache burst on death.

### N5. Frigate Captain — "HMS Thunderstrike" (MINI-BOSS, Stage 2 end)
- HP 60 (P1 40, P2 20). Armor 3. Speed 80 px/s. 3 contact. Knockback-immune.
- P1 "Broadside": 5-cannon broadside every 3 s (2 dmg each); drops flare summoning 3 Scout Skiffs every 8 s.
- P2 "Last Stand": tilts; fires every 1.5 s from remaining side; summons 1 Patrol Gunboat every 12 s; mortar barrage every 5 s (3 dmg, 80 px AoE, 1 s telegraph); enrage at HP < 10 (0.8 s cannon cadence).
- Drops: 30 coins (L), 2 guaranteed gems, 1 treasure map fragment, **Shipwright Chest**.
- Flavor: "Stand down, pirate scum!" Defeat: capsize with waterspout.

## Pirate faction (5)

### P1. Ramming Brigand
- Role: melee pressure. HP 3, Armor 0, Speed 240 px/s (Ram Mode), contact 4 dmg, no fire.
- Spawn: all acts fodder. Groups of 2–4.
- Drops: 1 coin (M), 1 XP.
- Special: line-of-sight → Ram Mode (+50% speed at player). Heavily punished by Stern Mines and Spinning Axes.

### P2. Broadside Cutter
- Role: pirate ranged. HP 7, Armor 1, Speed 140 px/s, contact 2 dmg.
- Fire: 3-cannon broadside in random direction every 2.5 s, 1 dmg each, 25° spread.
- Spawn: Acts 1–2 groups of 2–3; Act 3 filler.
- Drops: 2 coins (M), 5% gem.
- Special: "drunk cannons" friendly-fire among pirates.

### P3. Grappling Boarders
- Role: attach-and-drain. HP 5, Armor 0, Speed 200 px/s, 0.5 dmg/s DoT while attached (bypasses iframes).
- Spawn: Acts 2–3 groups of 2.
- Drops: 2 coins (M), 1 XP.
- Special: within 30 px, attaches (rope tether + hull icons); -20% player speed. Orbiting weapons instantly sever grapple.

### P4. Powder-Keg Kamikaze
- Role: suicide bomber. HP 4, Armor 0, Speed 160 px/s, contact: 6 dmg on explosion + 100 px AoE (4 dmg).
- Spawn: Acts 2–3 in pirate packs (1–2/wave).
- Drops: 3 coins (M).
- Special: Ignition state at HP < 50% or within 80 px — 1.5 s fuse before boom. Chains with Stern Mines and friendly fire.

### P5. "Black Barnacle" Captain Mort — Pirate Champion (MINI-BOSS, Stage 7 end)
- HP 90 (P1 50, P2 30, P3 10). Armor 4. Speed 110 px/s. 4 contact. Knockback-immune.
- P1 "The Flagship": 4-cannon broadside every 2.5 s (2 dmg each); 2 Ramming Brigands every 10 s; grapple hook every 14 s (pulls player 100 px over 0.5 s).
- P2 "Boarding Party": continuous Grappling Boarders (1 every 6 s, up to 3 active); Mort's heavy pistol every 2 s (3 dmg); cannon cadence 4 s.
- P3 "Death or Glory": summons freeze; Mort charges at 220 px/s directly at player (8 contact dmg on ram); kill by shoot-down or bait-and-survive.
- Drops: 50 coins (L), 3 gems, 2 map fragments, Shipwright Chest, 10% "Pirate Champion's Compass" meta unlock.
- Flavor: black sails + shanty; defeat: ship splits, Mort falls cursing.

## Supernatural faction (5)

### S1. Ghost Ship
- Role: phasing ranged. HP 8, Armor 2, Speed 100 px/s (drifts through rocks), contact 2 dmg.
- Fire: spectral cannonballs every 2.5 s, 2 projectiles, 1 dmg each, slight homing.
- Spawn: Acts 2–3 foggy/cursed biomes, groups of 2–3.
- Drops: 2 coins (M), 8% gem, 1 XP (ghostly).
- **Phase mechanic:** every 5 s intangible for 1.5 s (0 damage).
- **Immunities:** Water/Ink 100%.
- **Vulnerabilities:** ×2 lightning; +100% from Ghost Armada.

### S2. Sea Serpent
- Role: multi-segment weaving. Head HP 8 (Armor 1), 5 segments 2 HP each (Armor 0). Speed 140 px/s (serpentine).
- Contact: 3 dmg anywhere on body.
- Fire: head spits venom every 4 s, 2 dmg + Poison 1/s × 4 s, slow arc.
- Spawn: Acts 2–3 river sections (1 per encounter, occupies width).
- Drops: segments 1 coin (M) each; head 5 coins (L) + 10% gem + "serpent scale" trophy chance.
- Special: segments individually destructible; head ×2 dmg from behind; Shatter + Serpent = bonus "Decapitate" crit.

### S3. Kraken Tentacle Hazard
- Role: periodic hazard. HP 20 exposed (1000 submerged = unkillable). Armor 3. Stationary; arcs through sweep path. Contact 5 dmg during sweep; 0 submerged.
- Spawn: Acts 2–3 (esp. stage 10 foreshadowing, 13–15). Emerges from random screen-edge, sweeps 180° arc over 3 s.
- Drops (exposed kill): 10 coins (L) + 1 gem + 20% tentacle trophy. Retreat unharmed: no drops.
- Special: 2 s dark-ring telegraph. Up to 3 simultaneous in Act 3. Cannot be frozen; Shock partial (+50% dmg for 1 s).

### S4. Cursed Swarm
- Role: mass pressure. HP 1 each, Armor 0, Speed 180 px/s (homes player), 0.3 contact (respects iframes).
- Spawn: Acts 2–3 waves of 20–50, esp. narrow passages.
- Drops: every 3rd swarmling drops 1 coin (S).
- Special: passes through rocks (incorporeal). Showcase for orbit/aura/AoE weapons.

### S5. The Banshee Galleon — "Wailing Verity" (MINI-BOSS, Stage 12 end)
- HP 120 (P1 60, P2 40, P3 20). Armor 5. Speed 70 px/s (ethereal drift through walls). Contact 4 dmg (phases through iframes).
- Knockback-immune.
- P1 "The Approach": 6-cannon spectral volley every 4 s (passes walls, 2 dmg); wail every 12 s (300 px AoE, 3 dmg, Fear 1 s inverting steering); summons 2 Ghost Ships every 20 s.
- P2 "Phasing": intangibility ×2 (2 s every 4 s); wail every 8 s; Cursed Swarm waves of 15 every 15 s.
- P3 "Banshee's Fury": intangibility off (full vulnerability); continuous wail at 2 s; Kraken Tentacle attack every 6 s; soul-particle burst (gems) on defeat.
- **Immunities:** Water/Ink 100%; Fear immune to self.
- **Vulnerabilities:** ×2 lightning; Electrocute one-shots individual phases.
- Drops: 80 coins (L), 5 gems, 3 map fragments, Shipwright Chest, "Banshee's Wail" sail emblem cosmetic.

## Environmental (2)

### Env1. Bank Bandits
- Role: low-threat bank-dwellers. HP 4, Armor 1, stationary (animated), 0 contact (unreachable).
- Fire: thrown axe every 3 s (2 dmg, arcing, slight homing); musket shot every 5 s (1 dmg, fast, accurate).
- Spawn: all acts, riverbanks (non-narrow sections). 2–6/stretch.
- Drops: 2 coins (M), 5% gem, 1 XP.
- Special: duck behind crates between shots (0.5 s iframes). Fire-Arrow Rain on bank does ×2 here.

### Env2. Mine-Layer
- Role: area denial. HP 5, Armor 1, Speed 80 px/s (drifts ahead; flees upstream), contact 1 dmg.
- Fire: every 2.5 s drops a sea mine (Mine: HP 2, stationary, 4 dmg + 60 px AoE on contact, 20 s self-destruct).
- Spawn: Acts 2–3 open river sections (not narrow), 1–3/encounter.
- Drops: 2 coins (M), 3% gem, 1 XP.
- Special: Kraken Tentacle sweeps detonate all mines.
