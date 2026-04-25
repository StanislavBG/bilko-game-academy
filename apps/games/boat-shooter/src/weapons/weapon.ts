import type { StageScene } from '../scenes/stage-scene';
import { cooldownScalar } from '../systems/battle';

/**
 * Base weapon interface. Each weapon maintains its own cooldown/timer state
 * and emits projectiles (or other effects) through the WeaponSystem.
 */
export interface WeaponDefinition {
  id: string;
  displayName: string;
  taglineShort: string;
  create(scene: StageScene): Weapon;
}

export abstract class Weapon {
  abstract readonly id: string;
  protected readonly scene: StageScene;

  constructor(scene: StageScene) {
    this.scene = scene;
  }

  /** Called every frame. Weapon decides when to fire. */
  abstract update(deltaMs: number): void;

  /** Called when the weapon is removed from the run. Cleanup opportunity. */
  destroy(): void {
    /* no-op */
  }

  /** Current weapon level from RunState (1..5), or 0 if not held. */
  protected level(): number {
    return this.scene.runState.weaponLevel(this.id);
  }

  /**
   * Apply the global cooldown-reduction scalar (First Mate + any future meta)
   * to a base cooldown. Weapons should use this when setting their next-fire
   * timer so CDR applies uniformly.
   */
  protected withCDR(baseCooldownMs: number): number {
    return baseCooldownMs * cooldownScalar(this.scene.runState);
  }
}
