import type { RunState } from '../run-state';

/**
 * Weapon evolutions (docs/games/boat-shooter/06-evolutions.md).
 *
 * An evolution is a permanent upgrade of an L5 weapon when the paired
 * passive is held and a Shipwright Chest is opened. Evolved weapons
 * replace their original in the RunState (same slot, new id).
 *
 * For P3 MVP, evolutions are **applied as a damage multiplier + unlock flag**;
 * a full behavior rewrite per-evolution (new visuals, new firing patterns)
 * is polish in P4. The dramatic transform is represented as a ×3 damage
 * boost + renamed label in the HUD.
 */

export interface Evolution {
  id: string;
  sourceWeaponId: string;
  pairedPassiveId: string;
  displayName: string;
  description: string;
}

export const EVOLUTIONS: Evolution[] = [
  {
    id: 'cannonade-supreme',
    sourceWeaponId: 'bow-cannon',
    pairedPassiveId: 'powder-barrel',
    displayName: 'Cannonade Supreme',
    description: '6 spiraling projectiles + heavy mortar every 6th shot.',
  },
  {
    id: 'thunderclap-broadside',
    sourceWeaponId: 'broadside',
    pairedPassiveId: 'first-mate',
    displayName: 'Thunderclap Broadside',
    description: 'Synchronized BOOM + radial shockwave.',
  },
  {
    id: 'tempest-cannonade',
    sourceWeaponId: 'chain-lightning',
    pairedPassiveId: 'storm-compass',
    displayName: 'Tempest Cannonade',
    description: 'Permanent storm cloud; unlimited chains.',
  },
  {
    id: 'inferno-breath',
    sourceWeaponId: 'flamethrower',
    pairedPassiveId: 'crows-nest',
    displayName: 'Inferno Breath',
    description: '360° fire aura; burning enemies explode on death.',
  },
  {
    id: 'sawblade-fortress',
    sourceWeaponId: 'spinning-axes',
    pairedPassiveId: 'copper-hull',
    displayName: 'Sawblade Fortress',
    description: 'Double concentric ring + reflect damage.',
  },
  {
    id: 'leviathan-ink',
    sourceWeaponId: 'kraken-ink',
    pairedPassiveId: 'spyglass',
    displayName: 'Leviathan Ink',
    description: 'Ink bypasses boss poison immunity + tentacle slams.',
  },
  {
    id: 'minefield',
    sourceWeaponId: 'stern-mines',
    pairedPassiveId: 'cargo-nets',
    displayName: 'Minefield',
    description: 'Persistent mines; kills spawn more mines.',
  },
  {
    id: 'ghost-armada',
    sourceWeaponId: 'ghost-crew',
    pairedPassiveId: 'admirals-flag',
    displayName: 'Ghost Armada',
    description: 'Permanent 6-ghost orbit ring; 1 ghost absorbs damage.',
  },
];

/** Find the evolution that a given held-state is eligible for. */
export function findEligibleEvolution(state: RunState): Evolution | null {
  for (const evo of EVOLUTIONS) {
    if (state.weaponLevel(evo.sourceWeaponId) >= 5 &&
        state.passiveLevel(evo.pairedPassiveId) >= 1 &&
        !state.hasEvolution(evo.id)) {
      return evo;
    }
  }
  return null;
}
