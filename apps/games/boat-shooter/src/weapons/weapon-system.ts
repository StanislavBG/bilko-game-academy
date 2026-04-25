import type { StageScene } from '../scenes/stage-scene';
import { ProjectilePool } from '../entities/projectile';
import { Weapon } from './weapon';
import { WEAPON_DEFS } from './weapon-catalog';

/**
 * Manages the set of active weapons for the current run. Reacts to
 * RunState events: when a weapon is added, instantiate its runtime; when
 * leveled, existing instance sees the new level via state getters.
 *
 * Also owns the shared ProjectilePool that every projectile weapon uses.
 */
export class WeaponSystem {
  readonly scene: StageScene;
  readonly projectiles: ProjectilePool;

  private active = new Map<string, Weapon>();

  constructor(scene: StageScene) {
    this.scene = scene;
    this.projectiles = new ProjectilePool(scene, 128);

    const rs = scene.runState;
    rs.onRun('weapon-gained', (e) => this.ensureActive(e.id));
    // Level-ups don't require new instance, but we instantiate if somehow missing.
    rs.onRun('weapon-leveled', (e) => this.ensureActive(e.id));

    // Catch initial weapons already in state (e.g., starter).
    for (const w of rs.weapons) this.ensureActive(w.id);
  }

  private ensureActive(id: string): void {
    if (this.active.has(id)) return;
    const def = WEAPON_DEFS[id];
    if (!def) {
      console.warn(`[weapon-system] unknown weapon id: ${id}`);
      return;
    }
    this.active.set(id, def.create(this.scene));
  }

  update(deltaMs: number): void {
    // Tick all active weapons (they decide when to fire).
    for (const w of this.active.values()) w.update(deltaMs);
    // Tick all projectiles.
    this.projectiles.forEachActive((p) => p.update(deltaMs));
  }
}
