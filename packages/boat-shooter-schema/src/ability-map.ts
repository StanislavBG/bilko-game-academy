/**
 * Ability-to-unit maps.
 *
 * Lookup tables answering: which weapons/passives can a given ship equip?
 * Which weapons can appear on a given enemy? The runtime + admin app both
 * consume this. Keep it pure data — no functions.
 */
import type { WeaponId, PassiveId, EvolutionPair } from './weapon';
import type { ShipId } from './ship';
import type { EnemyId } from './enemy';

export interface ShipAbilityMap {
  shipId: ShipId;
  /** Weapon ids the ship can pick up at level-up / merchant. `*` = all. */
  allowedWeapons: ReadonlyArray<WeaponId> | '*';
  /** Passives the ship can pick up. `*` = all. */
  allowedPassives: ReadonlyArray<PassiveId> | '*';
}

export interface EnemyAbilityMap {
  enemyId: EnemyId;
  /** Bullet-spawning patterns this enemy is allowed to fire. Empty = no fire. */
  attacks: ReadonlyArray<EnemyAttack>;
}

export type EnemyAttack =
  | { kind: 'forward-fire'; bulletKind: BulletKind; intervalMs: number; damage: number }
  | { kind: 'aim-spread'; bulletKind: BulletKind; bullets: number; spreadDeg: number; intervalMs: number; damage: number }
  | { kind: 'radial-burst'; bulletKind: BulletKind; bullets: number; intervalMs: number; damage: number }
  | { kind: 'mortar-arc'; bulletKind: BulletKind; intervalMs: number; damage: number; aoeRadius: number; telegraphMs: number };

export type BulletKind =
  | 'musket' | 'cannon' | 'sniper' | 'shadow'
  | 'venom' | 'fire' | 'frost' | 'storm';

export interface AbilityMaps {
  ships: ReadonlyArray<ShipAbilityMap>;
  enemies: ReadonlyArray<EnemyAbilityMap>;
  /** L5 weapon + L5 passive → evolution pairs. */
  evolutions: ReadonlyArray<EvolutionPair>;
}
