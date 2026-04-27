import { Enemy } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import type { EnemyId } from '@bilko/boat-shooter-schema';
import { getEnemySpec } from '../../content/active-pack';

/**
 * River Fishers — easy-kill drifters that pad the kill economy.
 *
 * Three variants share one class. They:
 *   - Drift DOWN the screen at speeds *slower than the river scroll*
 *     (RIVER_SCROLL_SPEED = 50 px/s). The player's max speed (700 px/s)
 *     can chase them down comfortably. A "good player" mops up most;
 *     a passive player lets them slide off the bottom for free.
 *   - Fire FORWARD only (straight down the page) on a cadence — no
 *     lead-aim, no arc/spread bombs, no chase. Dumb on purpose.
 *   - Drop a generous XP load for their HP cost so the early-stage
 *     pacing felt by the player is "lots of small kills, fast levelup."
 *
 * No per-instance state beyond a fire timer + horizontal drift phase.
 * Reuses the existing enemy-bullet pool — zero new allocations per
 * shot. Performance: this class is the cheapest enemy in the roster.
 */

interface FisherCfg {
  /** Forward fire interval in ms; null = no fire (pure drifter). */
  fireIntervalMs: number | null;
  /** Forward bullet count per volley. */
  bulletCount: number;
  /** Spread degrees for multi-bullet volleys. */
  spreadDeg: number;
  /** Bullet damage. */
  bulletDamage: number;
  /** Sway amplitude (px) — gentle horizontal drift. */
  swayAmp: number;
}

const CFG: Record<string, FisherCfg> = {
  'river-fisher-skiff':  { fireIntervalMs: null, bulletCount: 0, spreadDeg: 0, bulletDamage: 0, swayAmp: 30 },
  'river-fisher-trawler':{ fireIntervalMs: 4500, bulletCount: 1, spreadDeg: 0, bulletDamage: 1, swayAmp: 24 },
  'river-fisher-junk':   { fireIntervalMs: 3500, bulletCount: 2, spreadDeg: 12, bulletDamage: 1, swayAmp: 18 },
};

export type RiverFisherId =
  | 'river-fisher-skiff'
  | 'river-fisher-trawler'
  | 'river-fisher-junk';

/**
 * Shared class for all 3 fisher variants. The spec selects the cfg via
 * `spec.id`. Single class = no new switch in the EnemySystem factory
 * (we just register 3 specs against the same constructor).
 */
export class RiverFisher extends Enemy {
  private fireTimerMs: number;
  private swayPhase = Math.random() * Math.PI * 2;
  private readonly homeX: number;
  private readonly cfg: FisherCfg;

  constructor(scene: StageScene, x: number, y: number, id: RiverFisherId) {
    super(scene, getEnemySpec(id as EnemyId), x, y);
    this.homeX = x;
    this.cfg = CFG[id] ?? CFG['river-fisher-skiff']!;
    // Random initial fire delay so a wave of fishers doesn't fire in lockstep.
    this.fireTimerMs = (this.cfg.fireIntervalMs ?? 0) * (0.4 + Math.random() * 0.6);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    const r = this.spec.visualRadius ?? 20;
    g.fillStyle(this.spec.color, 1).fillRect(-r * 0.5, -r, r, r * 2);
    g.fillStyle(0xe8d8a0, 1).fillTriangle(-r * 0.5, -r, r * 0.5, -r, 0, -r * 1.5);
    g.fillStyle(0x2a1a08, 1).fillRect(-1, -r, 2, r);
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    if (this.statuses.isImmobilized()) return;
    const dt = deltaMs / 1000;

    // Drift DOWN at spec.speed (slow). Sinusoidal sideways sway around
    // homeX. No chase, no lead-aim, no formation logic — dumb on purpose.
    this.swayPhase += dt * 0.9;
    const targetX = this.homeX + Math.sin(this.swayPhase) * this.cfg.swayAmp;
    const nextX = this.x + (targetX - this.x) * Math.min(1, dt * 1.5);
    const nextY = this.y + this.spec.speed * dt;
    this.setPos(nextX, nextY);

    // Despawn when off-bottom — fishers that escape are free to live.
    if (this.y > 1180) {
      this.active = false;
      this.container.destroy();
      return;
    }

    // Forward fire — straight down the page (+Y), no aim. Skiff variant
    // has fireIntervalMs=null and skips this branch entirely.
    if (this.cfg.fireIntervalMs === null) return;
    this.fireTimerMs -= deltaMs;
    if (this.fireTimerMs <= 0) {
      this.fireForward();
      this.fireTimerMs = this.cfg.fireIntervalMs;
    }
  }

  private fireForward(): void {
    const speed = 280;
    const baseAng = Math.PI / 2; // straight down (forward, toward player area)
    const n = this.cfg.bulletCount;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : (i / (n - 1)) - 0.5;
      const ang = baseAng + (t * this.cfg.spreadDeg * Math.PI) / 180;
      this.scene.enemies.spawnEnemyBullet(
        this.x, this.y,
        Math.cos(ang) * speed,
        Math.sin(ang) * speed,
        this.cfg.bulletDamage,
        this.spec.id,
        'musket',
      );
    }
  }
}
