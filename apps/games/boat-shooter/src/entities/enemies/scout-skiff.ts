import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { arrowSpread, leadAimAngle } from '../../systems/firing-patterns';
import { chargeUp } from '../../systems/enemy-attack-fx';

/**
 * N1 Scout Skiff — Raptor-style fodder.
 *
 * Enters from the top, cruises DOWN the screen with a sinusoidal horizontal
 * sway, fires aimed musket shots at the player, and exits the bottom.
 * Does NOT chase — the player dodges bullet patterns, not melee.
 */
export const SCOUT_SKIFF_SPEC: EnemySpec = {
  id: 'scout-skiff',
  maxHp: 1,
  armor: 0,
  speed: 150,
  contactDamage: 1,
  collisionRadius: 26,
  // Scouts are fodder — drop 2 XP orbs each so early leveling feels fast.
  drops: { coinsSmall: 0, coinsMedium: 1, coinsLarge: 0, gemChance: 0, xpOrbs: 2 },
  color: 0xc85a2e,
  visualRadius: 22,
  element: 'physical',
  showAimReticle: false, // fodder — per §6.1 fodder stays tell-only
  deathStyle: 'pop',     // small splinter pop — matches fodder weight
};

export class ScoutSkiff extends Enemy {
  private swayPhase = Math.random() * Math.PI * 2;
  private readonly homeX: number;
  private fireTimerMs = 1200 + Math.random() * 1500;
  /** Pending fire phase — set when the tell begins, cleared on fire. */
  private pendingFire: {
    leadX: number;
    leadY: number;
    ang: number;
  } | null = null;
  private pendingFireCancel: (() => void) | null = null;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, SCOUT_SKIFF_SPEC, x, y);
    this.homeX = x;
  }

  /**
   * Per-instance color roll — gives waves of skiffs visible variety so
   * a fleet of 7 doesn't read as a copy-paste. Rolled once in the
   * constructor via `Math.random()` so each skiff is consistent across
   * frames but the fleet as a whole varies.
   */
  private readonly variant = Math.floor(Math.random() * 3);

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    const hulls = [0xc85a2e, 0xb8453a, 0xa85028] as const; // orange / crimson / brick
    const sails = [0xe8d8c3, 0xe0c8a8, 0xf0e8d0] as const; // bleached / tea / bone
    const trims = [0x2a1610, 0x3a2015, 0x1a0e08] as const;
    const hull = hulls[this.variant]!;
    const sail = sails[this.variant]!;
    const trim = trims[this.variant]!;

    // Hull with a mid-tone plank line for subtle depth.
    g.fillStyle(hull, 1).fillRect(-12, -20, 24, 40);
    g.fillStyle(trim, 0.4).fillRect(-12, -4, 24, 1.5);

    // Triangular mainsail — one variant gets a red stripe for extra pop.
    g.fillStyle(sail, 1).fillTriangle(-12, -20, 12, -20, 0, -34);
    if (this.variant === 1) {
      g.fillStyle(0xa83030, 0.85).fillTriangle(-6, -22, 6, -22, 0, -30);
    }

    // Mast.
    g.fillStyle(trim, 1).fillRect(-1, -20, 2, 20);
  }

  /** Preferred patrol band — top half of the world. */
  private readonly bandTop = 90;
  private readonly bandBottom = 480;
  private readonly homeY = 180 + Math.random() * 220;
  private bobPhaseY = Math.random() * Math.PI * 2;

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;

    // Galaga-style: drift sideways within a top-half patrol band, never
    // descend past mid-screen. If knocked out, glide back into the band.
    this.swayPhase += dt * 2.0;
    this.bobPhaseY += dt * 1.4;
    const swayX = Math.sin(this.swayPhase) * 110;
    const targetX = this.homeX + swayX;
    const targetY = this.homeY + Math.sin(this.bobPhaseY) * 35;
    const nextX = this.x + (targetX - this.x) * Math.min(1, dt * 2.4);
    let nextY = this.y + (targetY - this.y) * Math.min(1, dt * 1.8);

    // Hard clamp — if anything pushed us below the band, pull back fast.
    if (nextY > this.bandBottom) {
      nextY = nextY + (this.bandTop + 60 - nextY) * Math.min(1, dt * 2.5);
    }
    this.setPos(nextX, nextY);

    // Fire cadence: begin a 180 ms tell, then wind (80 ms), then fire.
    // Total delay inside the 2.4–3.2 s cycle is 260 ms — still well
    // within the existing timing envelope (§5.1).
    this.fireTimerMs -= deltaMs;
    if (this.fireTimerMs <= 0 && !this.pendingFire) {
      this.beginFireTell(180);
      this.fireTimerMs = 2400 + Math.random() * 800;
    }
  }

  /** Phase 1 — choose a lead, show the tell. */
  private beginFireTell(duration: number): void {
    const player = this.scene.player;
    const speed = 320;
    const ang = leadAimAngle(
      this.x,
      this.y,
      { x: player.x, y: player.y, vx: player.vx, vy: player.vy },
      speed,
    );
    const leadX = this.x + Math.cos(ang) * 80;
    const leadY = this.y + Math.sin(ang) * 80;
    this.pendingFire = { leadX, leadY, ang };
    this.pendingFireCancel = this.beginAttackTell(
      duration,
      { x: leadX, y: leadY },
      this.spec.showAimReticle ?? false,
    );
    // Per-element wind-up glow at the skiff's bow.
    chargeUp(this.scene, this.x, this.y, this.element, duration);
    // §5.1 body English — 4 px away from player during the tell.
    this.scene.time.delayedCall(duration, () => this.onWind());
  }

  /** Phase 2 — priming sparks, short delay before fire. */
  private onWind(): void {
    if (!this.active || !this.pendingFire) return;
    // Two tiny spark flashes at the bow ("priming the match").
    this.scene.fx.muzzleFlashMusket(this.x, this.y, this.pendingFire.ang);
    this.scene.time.delayedCall(80, () => this.onFire());
  }

  /** Phase 3 — projectiles spawn here. */
  private onFire(): void {
    if (!this.active || !this.pendingFire) return;
    const { ang } = this.pendingFire;
    const speed = 320;
    this.scene.fx.muzzleFlashMusket(this.x, this.y, ang);
    arrowSpread(this.scene, this.x, this.y, ang, speed, 1, 12, this.spec.id, 'musket');
    this.pendingFire = null;
    if (this.pendingFireCancel) {
      this.pendingFireCancel = null;
    }
  }
}
