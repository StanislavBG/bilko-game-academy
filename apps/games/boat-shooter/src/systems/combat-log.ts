import type { StatusId } from './status';
import type { EnemyElement } from '../entities/enemy';

/**
 * Combat log — a tiny pub-sub data structure that buffers the last N
 * events of interest (dealt / taken / kill / DoT / status / reaction).
 *
 * Each scene (CombatLogScene, PlayerPropsScene) subscribes to `onPush` and
 * renders its own view. Keeps render logic out of gameplay hot paths.
 *
 * Design notes (see docs/games/boat-shooter/23-hud-and-combat-log.md §9):
 *   - Ring buffer of 200 entries — older events fall off silently.
 *   - All consumers iterate front-to-back in chronological order; the
 *     renderer reverses for newest-first display.
 *   - Aggregation windows (recent, recentAggregate) use current wall-clock
 *     ms (`Date.now() - entry.time`) so window math is trivial.
 */

export type CombatReactionId = string;

export type CombatLogEntry =
  | {
      kind: 'dealt';
      time: number;
      target: string;
      amount: number;
      weapon: string;
      isCrit: boolean;
      element: EnemyElement;
      kill: boolean;
    }
  | {
      kind: 'taken';
      time: number;
      source: string;
      amount: number;
      type: 'contact' | 'projectile' | 'dot';
      reduced: number;
      element: EnemyElement;
    }
  | {
      kind: 'kill';
      time: number;
      target: string;
      xp: number;
      totalDmg: number;
    }
  | {
      kind: 'dot';
      time: number;
      target: string;
      status: StatusId;
      amount: number;
    }
  | {
      kind: 'status';
      time: number;
      target: string;
      status: StatusId;
      added: boolean;
    }
  | {
      kind: 'reaction';
      time: number;
      target: string;
      reaction: CombatReactionId;
      amount: number;
    };

export interface CombatLogAggregate {
  dmgDealt: number;
  dmgTaken: number;
  kills: number;
  crits: number;
}

type Listener = (e: CombatLogEntry) => void;

export class CombatLog {
  /**
   * Ring buffer of entries. Slot count is fixed at MAX; `writeIdx` is the
   * next write position. `size` tells us how many valid entries exist.
   *
   * Memory layout: one contiguous array of entries, allocated lazily as
   * events come in. Avoids pointer-chasing in the aggregate scan hot path.
   */
  private static readonly MAX = 200;
  private readonly buf: (CombatLogEntry | undefined)[] = new Array(CombatLog.MAX);
  private writeIdx = 0;
  private size = 0;

  private listeners = new Set<Listener>();
  private verbose = false;

  /** Push a new entry. O(1). */
  push(entry: CombatLogEntry): void {
    this.buf[this.writeIdx] = entry;
    this.writeIdx = (this.writeIdx + 1) % CombatLog.MAX;
    if (this.size < CombatLog.MAX) this.size += 1;
    // Fan out to scene subscribers.
    for (const l of this.listeners) l(entry);
  }

  /**
   * Return entries added within the last `windowMs` milliseconds, in
   * chronological order (oldest first). O(n) over the ring buffer.
   */
  recent(windowMs: number): CombatLogEntry[] {
    const now = Date.now();
    const out: CombatLogEntry[] = [];
    // Walk from oldest to newest — start index is (writeIdx - size) mod MAX.
    const start = (this.writeIdx - this.size + CombatLog.MAX) % CombatLog.MAX;
    for (let i = 0; i < this.size; i++) {
      const idx = (start + i) % CombatLog.MAX;
      const e = this.buf[idx];
      if (e && now - e.time <= windowMs) out.push(e);
    }
    return out;
  }

  /** Newest-first view of up to `limit` entries. O(limit). */
  latest(limit = CombatLog.MAX): CombatLogEntry[] {
    const out: CombatLogEntry[] = [];
    const count = Math.min(limit, this.size);
    for (let i = 0; i < count; i++) {
      const idx = (this.writeIdx - 1 - i + CombatLog.MAX) % CombatLog.MAX;
      const e = this.buf[idx];
      if (e) out.push(e);
    }
    return out;
  }

  /**
   * Aggregate damage / kill / crit counts across `windowMs`. O(n) but n ≤ 200,
   * so cheap enough to call on every collapsed-pill repaint.
   */
  recentAggregate(windowMs: number): CombatLogAggregate {
    const now = Date.now();
    let dmgDealt = 0;
    let dmgTaken = 0;
    let kills = 0;
    let crits = 0;
    const start = (this.writeIdx - this.size + CombatLog.MAX) % CombatLog.MAX;
    for (let i = 0; i < this.size; i++) {
      const idx = (start + i) % CombatLog.MAX;
      const e = this.buf[idx];
      if (!e || now - e.time > windowMs) continue;
      switch (e.kind) {
        case 'dealt':
          dmgDealt += e.amount;
          if (e.isCrit) crits += 1;
          if (e.kill) kills += 1;
          break;
        case 'taken':
          dmgTaken += e.amount;
          break;
        case 'kill':
          kills += 1;
          break;
        case 'dot':
          dmgDealt += e.amount;
          break;
        default:
          break;
      }
    }
    return { dmgDealt, dmgTaken, kills, crits };
  }

  /** Subscribe. Returns an unsubscribe thunk. */
  onPush(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setVerboseDebug(on: boolean): void {
    this.verbose = on;
  }

  isVerbose(): boolean {
    return this.verbose;
  }
}
