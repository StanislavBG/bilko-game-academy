import type { PassiveId } from '@bilko/boat-shooter-schema';
import { RunState } from '../run-state';
import { PASSIVE_TIERS } from '../weapons/passive-catalog';
import { getPassiveSpec } from '../content/active-pack';

/**
 * Admin-tunable curve reader. The runtime keeps both paths live so the
 * curve becomes data-driven only when the active pack ships it; bundled
 * defaults that haven't migrated to JSON still flow through PASSIVE_TIERS.
 *
 * Complexity O(1) given memoization isn't needed at this call frequency —
 * `getPassiveSpec` is an O(n≤8) array scan, called per per-frame consumer.
 */
function passiveCurveAt(
  id: PassiveId,
  curveKey: string,
  level: number,
  fallback: number,
): number {
  const spec = getPassiveSpec(id);
  const curves = spec?.curves as Record<string, readonly number[]> | undefined;
  const arr = curves?.[curveKey];
  if (!arr) return fallback;
  return arr[level] ?? fallback;
}

/**
 * Damage calculation.
 *
 * Formula (docs/games/boat-shooter/07-battle-system.md):
 *
 *   final = base × (1 + sum_of_percent_buffs) × elementMult × (crit ? critMult : 1)
 *         − (armor if !crit else 0)
 *   min 1
 *
 * Element multipliers and armor are applied at the collision site.
 * `rollDamage` returns the pre-armor, pre-element-multiplier damage + crit flag.
 */

export interface DamageRoll {
  damage: number;
  isCrit: boolean;
}

/**
 * Element hint so weapons can tag their damage as 'lightning' / 'explosive' /
 * 'none' and the right passive multipliers apply.
 */
export type DamageElement = 'none' | 'lightning' | 'explosive' | 'fire';

export function rollDamage(
  state: RunState,
  baseWeaponDmg: number,
  element: DamageElement = 'none',
): DamageRoll {
  // Flat additive damage from stat-boost picks.
  const base = Math.max(0.01, baseWeaponDmg + (state.baseDamage - 1));

  const multiplier = damageMultiplier(state, element);
  const buffed = base * multiplier;

  // Spyglass contributes to crit chance + multiplier.
  const spLvl = state.passiveLevel('spyglass');
  const spChanceFallback = PASSIVE_TIERS['spyglass'].critChanceBonus[spLvl] ?? 0;
  const spMultFallback = PASSIVE_TIERS['spyglass'].critMultBonus[spLvl] ?? 0;
  const spChanceBonus = passiveCurveAt('spyglass', 'critChanceBonus', spLvl, spChanceFallback);
  const spMultBonus = passiveCurveAt('spyglass', 'critMultBonus', spLvl, spMultFallback);

  const critChance = state.critChance + spChanceBonus;
  const critMult = state.critMultiplier + spMultBonus;

  const isCrit = Math.random() < critChance; // uncapped per design (docs §4.1)
  let final = isCrit ? buffed * critMult : buffed;
  if (state.godmode) final *= 3; // debug — outgoing damage scalar

  return { damage: final, isCrit };
}

/** Total multiplicative buff for a given element context. */
export function damageMultiplier(state: RunState, element: DamageElement = 'none'): number {
  let mult = 1.0;

  // Crow's Nest — universal damage.
  const crowLvl = state.passiveLevel('crows-nest');
  mult *= 1 + (PASSIVE_TIERS['crows-nest'].damagePercent[crowLvl] ?? 0);

  // Storm Compass — only on lightning.
  if (element === 'lightning') {
    const scLvl = state.passiveLevel('storm-compass');
    mult *= 1 + (PASSIVE_TIERS['storm-compass'].lightningPercent[scLvl] ?? 0);
  }

  // Powder Barrel — only on explosive.
  if (element === 'explosive') {
    const pbLvl = state.passiveLevel('powder-barrel');
    mult *= 1 + (PASSIVE_TIERS['powder-barrel'].explosivePercent[pbLvl] ?? 0);
  }

  // Evolution bonus: each granted evolution contributes a flat ×3 for its
  // source weapon. (Simplified P3 model; full bespoke behaviors arrive in P4.)
  // The call site passes the weaponId via element when available — but
  // passing a full weapon-id here would mean plumbing it through every
  // weapon call site. For P3 MVP we apply a global +50% per evolution held,
  // which approximates the late-run power curve without requiring plumbing.
  mult *= 1 + state.evolutions.size * 0.5;

  return mult;
}

/** Apply enemy armor to damage, respecting crit-bypass. */
export function applyArmor(
  damage: number,
  armor: number,
  armorPierce: number,
  isCrit: boolean,
): number {
  if (isCrit) return Math.max(1, damage);
  const effective = Math.max(0, armor - armorPierce);
  return Math.max(1, damage - effective);
}

/** Cooldown scalar from First Mate + future meta. CDR uncapped per design. */
export function cooldownScalar(state: RunState): number {
  const fmLvl = state.passiveLevel('first-mate');
  const fallback = PASSIVE_TIERS['first-mate'].cooldownReduction[fmLvl] ?? 0;
  const cdr = passiveCurveAt('first-mate', 'cooldownReduction', fmLvl, fallback);
  return Math.max(0.05, 1 - cdr);
}

/** Flat damage reduction from Copper Hull. */
export function copperHullReduction(state: RunState): number {
  const chLvl = state.passiveLevel('copper-hull');
  return PASSIVE_TIERS['copper-hull'].dmgReduction[chLvl] ?? 0;
}

/** Iframe bonus from Copper Hull (ms). */
export function copperHullIframeBonusMs(state: RunState): number {
  const chLvl = state.passiveLevel('copper-hull');
  return PASSIVE_TIERS['copper-hull'].iframeBonusMs[chLvl] ?? 0;
}

/** Negate-chance from Copper Hull L5. */
export function copperHullNegateChance(state: RunState): number {
  const chLvl = state.passiveLevel('copper-hull');
  return PASSIVE_TIERS['copper-hull'].negateChance[chLvl] ?? 0;
}

/** Magnet bonus from Cargo Nets. */
export function cargoNetsMagnetMultiplier(state: RunState): number {
  const cnLvl = state.passiveLevel('cargo-nets');
  const fallback = PASSIVE_TIERS['cargo-nets'].magnetBonus[cnLvl] ?? 0;
  return 1 + passiveCurveAt('cargo-nets', 'magnetBonus', cnLvl, fallback);
}

/** Coin value bonus from Cargo Nets. */
export function cargoNetsCoinBonus(state: RunState): number {
  const cnLvl = state.passiveLevel('cargo-nets');
  const fallback = PASSIVE_TIERS['cargo-nets'].coinValueBonus[cnLvl] ?? 0;
  return 1 + passiveCurveAt('cargo-nets', 'coinValueBonus', cnLvl, fallback);
}

/** XP bonus from Admiral's Flag. */
export function admiralsFlagXpBonus(state: RunState): number {
  const afLvl = state.passiveLevel('admirals-flag');
  const fallback = PASSIVE_TIERS['admirals-flag'].xpPercent[afLvl] ?? 0;
  return 1 + passiveCurveAt('admirals-flag', 'xpPercent', afLvl, fallback);
}

/** Reroll cost reduction from Admiral's Flag. */
export function admiralsFlagRerollReduction(state: RunState): number {
  const afLvl = state.passiveLevel('admirals-flag');
  const fallback = PASSIVE_TIERS['admirals-flag'].rerollCostReduction[afLvl] ?? 0;
  return passiveCurveAt('admirals-flag', 'rerollCostReduction', afLvl, fallback);
}

/** Bonus chain targets for Chain Lightning from Storm Compass. */
export function stormCompassBonusChains(state: RunState): number {
  const scLvl = state.passiveLevel('storm-compass');
  return PASSIVE_TIERS['storm-compass'].bonusChains[scLvl] ?? 0;
}
