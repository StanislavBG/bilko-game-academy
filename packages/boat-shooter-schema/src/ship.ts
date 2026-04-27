/**
 * Starting-ship schema.
 *
 * One entry per pickable ship in the picker UI. Defines stats, starter
 * loadout, color theme, skill-tree id, and a simple `unlockedFromMeta`
 * gate so the meta-progression unlocks can stay data-driven.
 */
import type { WeaponId, PassiveId, WeaponElement } from './weapon';

export type ShipId =
  | 'ember-corsair'
  | 'tempest-fury'
  | 'frostbound'
  | 'verdant-tide'
  | 'nightwake';

export interface ShipBaselineDelta {
  maxHp?: number;
  speed?: number;
  accel?: number;
  iframeDurationMs?: number;
  magnetRadius?: number;
  coinValueMult?: number;
  critChance?: number;
  critMultiplier?: number;
}

export interface ShipSpec {
  id: ShipId;
  displayName: string;
  /** Element family — drives water trail tint + damage type bonus. */
  element: WeaponElement;
  /** One-line picker description. */
  tagline: string;
  /** Single starter weapon id (PRD 7 — only one weapon at L1). */
  starterWeapon: WeaponId;
  /** Single starter passive id. */
  starterPassive: PassiveId;
  /** Per-baseline tweaks; merged onto `PLAYER_BASELINE`. */
  baselineDelta: ShipBaselineDelta;
  /** Skill-tree id from `data/skill-trees/`. */
  skillTreeId: string;
  /** Set of meta-track milestones that unlock this ship. */
  unlockedFromMeta: ReadonlyArray<{ trackId: string; tier: number }>;
}
