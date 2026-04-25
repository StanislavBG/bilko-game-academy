import Phaser from 'phaser';
import type { Enemy } from '../entities/enemy';
import type { StageScene } from '../scenes/stage-scene';

/**
 * Status effect system for enemies. Applied by weapons; ticked each frame;
 * consumed by reactions (see reactions.ts).
 *
 * 5 statuses in v1 (docs/games/boat-shooter/07-battle-system.md §4.6.3):
 *   Burn    — DoT each tick
 *   Poison  — DoT + slow
 *   Shock   — immobilize briefly
 *   Freeze  — full immobilize N sec; breaks early on X dmg
 *   Wet     — makes target take ×2 lightning dmg; no innate DoT
 *
 * Each enemy's active statuses are stored on the Enemy as a StatusSet.
 * Damage-over-time ticks via status.update(); damage numbers are routed
 * through the DamageNumberSystem with red DoT color.
 */

export type StatusId = 'burn' | 'poison' | 'shock' | 'freeze' | 'wet';

export interface StatusState {
  id: StatusId;
  /** ms of lifetime remaining */
  remainingMs: number;
  /** damage per second (Burn, Poison) */
  dpsDamage?: number;
  /** ms since last tick (for DoT accumulation) */
  sinceTickMs: number;
  /** stack count (Burn + Poison stack multiplicatively with reactions) */
  stacks: number;
  /** reference to the source weapon for telemetry (optional) */
  sourceWeaponId?: string;
}

export class StatusSet {
  readonly map = new Map<StatusId, StatusState>();

  /** Called by StatusSystem with (enemyId, statusId, added?). The system
   *  forwards to the combat log. Exposed as a plain hook so StatusSet
   *  doesn't need a back-reference to the scene. */
  onApply: ((id: StatusId, added: boolean) => void) | undefined;
  /** Accumulated DoT damage since last log flush (1/s cadence). */
  pendingDotByStatus: Map<StatusId, number> | undefined;

  apply(id: StatusId, durationMs: number, opts: { dps?: number; weaponId?: string } = {}): void {
    const existing = this.map.get(id);
    if (existing) {
      existing.remainingMs = Math.max(existing.remainingMs, durationMs);
      if (opts.dps !== undefined) {
        existing.dpsDamage = Math.max(existing.dpsDamage ?? 0, opts.dps);
      }
      existing.stacks = Math.min(5, existing.stacks + 1);
      this.onApply?.(id, false);
      return;
    }
    this.map.set(id, {
      id,
      remainingMs: durationMs,
      ...(opts.dps !== undefined ? { dpsDamage: opts.dps } : {}),
      sinceTickMs: 0,
      stacks: 1,
      ...(opts.weaponId !== undefined ? { sourceWeaponId: opts.weaponId } : {}),
    });
    this.onApply?.(id, true);
  }

  has(id: StatusId): boolean {
    return this.map.has(id);
  }

  remove(id: StatusId): void {
    this.map.delete(id);
  }

  clear(): void {
    this.map.clear();
  }

  /** Slow factor from Poison (multiplicative to speed). 1 = no slow, 0.8 = 20% slow. */
  slowMultiplier(): number {
    let m = 1;
    const p = this.map.get('poison');
    if (p) m *= 0.8;
    // Freeze fully immobilizes (overrides slow).
    if (this.map.has('freeze')) m = 0;
    // Shock — caller decides to honor stun by checking has('shock').
    return m;
  }

  /** Is the enemy immobilized right now? */
  isImmobilized(): boolean {
    return this.map.has('freeze') || this.map.has('shock');
  }
}

export class StatusSystem {
  /** Accumulator for DoT-log batching — flushes per enemy once per second. */
  private dotFlushAccumMs = 0;

  constructor(private readonly scene: StageScene) {}

  /** Attach the onApply listener to a fresh enemy's StatusSet. Called once
   *  by EnemySystem when the enemy is spawned, so the status set can emit
   *  combat-log entries without referencing the scene. */
  attach(enemy: Enemy): void {
    enemy.statuses.onApply = (id, added) => {
      this.scene.combatLog?.push({
        kind: 'status',
        time: Date.now(),
        target: enemy.spec.id,
        status: id,
        added,
      });
    };
  }

  update(deltaMs: number): void {
    this.dotFlushAccumMs += deltaMs;
    const flush = this.dotFlushAccumMs >= 1000;
    if (flush) this.dotFlushAccumMs -= 1000;
    this.scene.enemies.forEachActive((e) => this.tickEnemy(e, deltaMs, flush));
  }

  private tickEnemy(enemy: Enemy, deltaMs: number, flushDot: boolean): void {
    const ss = enemy.statuses;
    if (ss.map.size === 0) return;

    for (const status of ss.map.values()) {
      status.remainingMs -= deltaMs;

      // DoT statuses tick each ~250ms.
      if ((status.id === 'burn' || status.id === 'poison') && status.dpsDamage !== undefined) {
        status.sinceTickMs += deltaMs;
        const tickInterval = 250;
        while (status.sinceTickMs >= tickInterval) {
          status.sinceTickMs -= tickInterval;
          const tickDmg = (status.dpsDamage * tickInterval) / 1000;
          enemy.takeStatusDamage(tickDmg, status.id);
          // Accumulate for batched log push — flushed once per wall-clock second.
          const bag = ss.pendingDotByStatus ?? (ss.pendingDotByStatus = new Map());
          bag.set(status.id, (bag.get(status.id) ?? 0) + tickDmg);
        }
      }

      if (status.remainingMs <= 0) {
        ss.map.delete(status.id);
      }
    }

    // Flush aggregated DoT amounts to the combat log once per second.
    if (flushDot && ss.pendingDotByStatus && ss.pendingDotByStatus.size > 0) {
      for (const [statusId, amt] of ss.pendingDotByStatus) {
        this.scene.combatLog?.push({
          kind: 'dot',
          time: Date.now(),
          target: enemy.spec.id,
          status: statusId,
          amount: amt,
        });
      }
      ss.pendingDotByStatus.clear();
    }

    // Re-draw status icons above enemy (cheap — once per tick).
    this.renderIcons(enemy);
  }

  private renderIcons(enemy: Enemy): void {
    const existingIcons = enemy.container.getByName('status-icons') as
      | Phaser.GameObjects.Graphics
      | undefined;
    let g: Phaser.GameObjects.Graphics;
    if (existingIcons) {
      g = existingIcons;
      g.clear();
    } else {
      g = this.scene.add.graphics();
      g.setName('status-icons');
      enemy.container.add(g);
    }
    const r = enemy.spec.visualRadius ?? enemy.spec.collisionRadius;
    const above = -r - 10;
    let x = -10 * (enemy.statuses.map.size - 1);
    for (const s of enemy.statuses.map.values()) {
      const color = STATUS_COLOR[s.id];
      g.fillStyle(color, 1).fillCircle(x, above, 6);
      g.lineStyle(1, 0x000000, 0.8).strokeCircle(x, above, 6);
      x += 16;
    }
  }
}

export const STATUS_COLOR: Record<StatusId, number> = {
  burn: 0xff6b2a,
  poison: 0x7dd66a,
  shock: 0x8ae8ff,
  freeze: 0xb0e0ff,
  wet: 0x3ab0ff,
};

/** Short human label for reaction toasts. */
export const STATUS_LABEL: Record<StatusId, string> = {
  burn: 'Burn',
  poison: 'Poison',
  shock: 'Shock',
  freeze: 'Freeze',
  wet: 'Wet',
};
