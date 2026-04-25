# Battle System — damage, armor, statuses, reactions

## Damage formula (multiplicative, crit bypasses armor)

```
final_damage = base_weapon_dmg
             × (1 + sum_of_percent_buffs)         // e.g. Crow's Nest +40% → ×1.40
             × element_multiplier_vs_target       // Lightning vs Wet → ×2.0
             × (crit_multiplier if crit else 1)   // base 1.5×
             − (armor_reduction if not crit else 0)
min-clamp: 1 damage per hit (unless type-immune → 0)
```

## Armor (flat + per-weapon pierce)

- Enemies have integer armor 0..8 (most Act 1 enemies 0–1, Act 3 bosses 6–8).
- Each weapon has a per-level `armor_pierce` stat subtracted from enemy armor
  *before* the damage subtraction.
- **Crit fully bypasses remaining armor.**
- Floor: every hit deals ≥ 1 damage unless the enemy is type-immune to that
  damage (e.g. Ghost Ships fully immune to water/ink).

## Statuses (5 in v1)

| Status | Applied by | Effect |
|--------|------------|--------|
| **Burn** | Flamethrower, Fire-Arrow Rain, Inferno Breath | X dmg/s for N sec (DoT) |
| **Poison** | Kraken-Ink L5, Leviathan Ink | X dmg/s for N sec + -20% move speed |
| **Shock/Stun** | Chain Lightning L4+, Tempest Cannonade | brief immobilization (0.3–0.8 s) |
| **Freeze** | Fire-Arrow Rain L5 Mastery (20% frost arrows), Mortar L5 Mastery (20% frost shells) | full immobilize for N sec; breaks early on X dmg |
| **Wet** | Lighthouse Beam L5 Mastery, Kraken-Ink Cloud L5, Leviathan Ink | target takes ×2 lightning; no innate DoT |

## Reaction matrix (10 two-way + 3 three-way, JSON-driven)

Loaded from `apps/games/boat-shooter/src/data/reactions.json` at boot.

### Two-way

| # | Reaction | Combo | Effect |
|---|----------|-------|--------|
| R1 | Electrocute | Wet + Shock | Lightning ×4 on trigger, 0.8 s stun. Consumes Wet. |
| R2 | Steam | Wet + Burn | 80 px AoE (3 dmg), slows nearby 30% for 2 s. Consumes both. |
| R3 | Deep Freeze | Wet + Freeze | Freeze duration ×1.5; Wet remains after thaw. |
| R4 | Toxic Combustion | Burn + Poison | Both DoT intensities ×2 remaining; green-fire visual. |
| R5 | Thermal Shock | Burn + Freeze | Freeze breaks early with 8 dmg burst. Consumes both. |
| R6 | Shatter | Freeze + Shock | Frozen enemy takes ×3 dmg on next hit (armor bypassed). Consumes Shock+Freeze. |
| R7 | Plasma | Burn + Shock | 6 dmg AoE (60 px) + 0.5 s stun. Consumes both. |
| R8 | Convulsion | Poison + Shock | Each Poison tick briefly stuns (0.1 s). Consumes Shock. |
| R9 | Crystal Venom | Poison + Freeze | Freeze +1 s; full Poison DoT on thaw. Consumes Freeze. |
| R10 | Acid Rain | Poison + Wet | Poison spreads to 3 nearest within 100 px. Consumes Wet. |

### Three-way

| # | Reaction | Combo | Effect |
|---|----------|-------|--------|
| R11 | Cataclysm | Wet + Shock + Freeze | SCREEN-CLEAR: 20 dmg to every enemy on screen; all frozen 1 s. |
| R12 | Supernova | Burn + Poison + Shock | 200 px AoE (25 dmg) at target; re-applies all 3 statuses to survivors. |
| R13 | Ice Storm | Burn + Freeze + Wet | 150 px slow-moving frost zone, 3 dmg/tick for 5 s, Freeze 0.5 s/tick. |

### Reaction rules

- Fire when both/all required statuses are simultaneously active on a single target.
- **Per-enemy cooldown 1.0 s** per reaction (prevents infinite re-trigger).
- **Bosses & mini-bosses** can be reacted on, but reaction *damage* is scaled to **20%** (status durations unchanged). Preserves boss fight pacing.
- **3-way reactions take priority** — they consume all statuses before any pending 2-way fires.
- Each reaction has: unique SFX sting, particle burst, on-screen label ("Electrocute!") for ~0.5 s, color-coded damage number.

## Crit, iframes, knockback, friendly-fire

- Damage numbers: **yellow** crit, **red** DoT tick, **white** normal, per-reaction color on reaction trigger. Float and fade over 0.7 s.
- **Screen shake only on boss-tier crits** (2 px, 0.15 s).
- Iframes: boat flashes white + short "ding" SFX; **0.9 s** per hit.
- Knockback: applies to normal + elite enemies; **immune on mini-bosses and bosses**.
- **Friendly fire on destructible terrain: YES.** Player projectiles damage destructible barrels, bridges, piers, dams, mine-flotsam. Clear painterly affordance (lighter outline + bright highlights) distinguishes destructibles.
- Projectiles travel straight (no water-skip physics).
- Hits determined by pixel-perfect circle collision.
