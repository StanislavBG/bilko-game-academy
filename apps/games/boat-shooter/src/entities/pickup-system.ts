import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { XP_TUNING, RIVER_SCROLL_SPEED, WORLD_HEIGHT } from '../constants';
import {
  admiralsFlagXpBonus,
  cargoNetsCoinBonus,
  cargoNetsMagnetMultiplier,
} from '../systems/battle';

type PickupKind = 'coin-small' | 'coin-medium' | 'coin-large' | 'gem' | 'xp-orb';

interface Pickup {
  sprite: Phaser.GameObjects.Container;
  kind: PickupKind;
  value: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  settled: boolean;
  spawnedAt: number;
  active: boolean;
  /** Throttle counter for the magnet sparkle trail (ms). */
  trailMs?: number;
}

/**
 * Pickup manager — coins (S/M/L), gems, XP orbs. All pooled.
 *
 * Behavior:
 *   - On spawn: the pickup bursts outward with a random velocity, then
 *     decelerates and "settles" (ready to be magneted).
 *   - Magnet: within `magnetRadius × magnetMult`, the pickup steers
 *     toward the player's current position.
 *   - Lost: if a pickup drifts below WORLD_HEIGHT + margin for > 3 s,
 *     it's despawned.
 */
export class PickupSystem {
  readonly scene: StageScene;
  private pool: Pickup[] = [];

  constructor(scene: StageScene) {
    this.scene = scene;
  }

  private acquire(kind: PickupKind, x: number, y: number): Pickup {
    let p = this.pool.find((i) => !i.active);
    if (!p) {
      const container = this.scene.add.container(x, y);
      container.setDepth(5);
      p = {
        sprite: container,
        kind,
        value: 0,
        x,
        y,
        vx: 0,
        vy: 0,
        settled: false,
        spawnedAt: 0,
        active: false,
      };
      this.pool.push(p);
    }
    // Rebuild visuals for the new kind. Prefer the painterly Imagen
    // sprite (`sprite-coin-small` / `sprite-gem` / `sprite-xp-orb`,
    // already preloaded). Bump display size so pickups are obvious on
    // the water — the old primitive circles were too small to read.
    p.sprite.removeAll(true);
    const spriteKey = `sprite-${kind}`;
    if (this.scene.textures.exists(spriteKey)) {
      const img = this.scene.add.image(0, 0, spriteKey);
      const native = img.width || 1024;
      // Pickup display sizes — about 2× the old primitive radii.
      const targetPx = kind === 'coin-small' ? 28
        : kind === 'coin-medium' ? 36
        : kind === 'coin-large' ? 46
        : kind === 'gem' ? 42
        : 36; // xp-orb
      img.setScale(targetPx / native);
      p.sprite.add(img);
      // Soft additive glow halo behind the sprite — pickups jump off
      // the water without needing a per-frame tween (idle bob below
      // handles the breathing motion).
      const glowTint = kind === 'coin-large' ? 0xffd85a
        : kind === 'gem' ? 0xcc88ff
        : kind === 'xp-orb' ? 0xaaf0ff
        : 0xffffff;
      const glow = this.scene.add.circle(0, 0, targetPx * 0.65, glowTint, 0.35);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      p.sprite.addAt(glow, 0);
    } else {
      // Fallback — primitive draw at bumped sizes.
      const g = this.scene.add.graphics();
      this.drawPickup(g, kind);
      p.sprite.add(g);
    }
    p.sprite.setPosition(x, y);
    p.kind = kind;
    p.x = x;
    p.y = y;
    // PRD 2 — drops drift down the screen with the river current. The
    // boat must close to the magnet radius to claim them; otherwise they
    // scroll off the bottom edge and despawn.
    p.vx = (Math.random() - 0.5) * 12; // tiny lateral jitter so a stack of drops fans out
    p.vy = RIVER_SCROLL_SPEED + (Math.random() - 0.5) * 20;
    p.settled = true;
    p.spawnedAt = this.scene.time.now;
    p.active = true;
    p.sprite.setVisible(true);
    // Small pop-in so the drop reads as "just appeared".
    p.sprite.setScale(0.3);
    this.scene.tweens.add({ targets: p.sprite, scale: 1, duration: 180, ease: 'Back.out' });
    return p;
  }

  /** Primitive fallback when the AI sprite isn't loaded — bumped to ~2× the
   *  old radii so pickups read at a glance even on the procedural path. */
  private drawPickup(g: Phaser.GameObjects.Graphics, kind: PickupKind): void {
    switch (kind) {
      case 'coin-small':
        g.fillStyle(0xb87333, 1).fillCircle(0, 0, 12);
        g.lineStyle(1.5, 0x2a1610, 1).strokeCircle(0, 0, 12);
        break;
      case 'coin-medium':
        g.fillStyle(0xc0c0c0, 1).fillCircle(0, 0, 16);
        g.lineStyle(2, 0x2a2a2a, 1).strokeCircle(0, 0, 16);
        break;
      case 'coin-large':
        g.fillStyle(0xffd700, 1).fillCircle(0, 0, 22);
        g.lineStyle(2.5, 0x8a6a00, 1).strokeCircle(0, 0, 22);
        break;
      case 'gem':
        g.fillStyle(0xb366ff, 1).fillRect(-10, -16, 20, 32);
        g.lineStyle(2.5, 0x6a33aa, 1).strokeRect(-10, -16, 20, 32);
        break;
      case 'xp-orb':
        g.fillStyle(0x5ac8e8, 0.9).fillCircle(0, 0, 14);
        g.lineStyle(2, 0x2a8aa8, 1).strokeCircle(0, 0, 14);
        break;
    }
  }

  spawnCoins(x: number, y: number, count: number, size: 'small' | 'medium' | 'large'): void {
    if (count <= 0) return;
    const kind: PickupKind = size === 'small' ? 'coin-small' : size === 'medium' ? 'coin-medium' : 'coin-large';
    const value = size === 'small' ? 1 : size === 'medium' ? 5 : 25;
    for (let i = 0; i < count; i++) {
      const p = this.acquire(kind, x, y);
      p.value = value;
    }
  }

  spawnGem(x: number, y: number): void {
    const p = this.acquire('gem', x, y);
    p.value = 1;
  }

  spawnXpOrbs(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire('xp-orb', x, y);
      p.value = 1;
    }
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const player = this.scene.player;
    const magnetR =
      this.scene.runState.magnetRadius *
      XP_TUNING.magnetRangeMultiplier *
      cargoNetsMagnetMultiplier(this.scene.runState);

    for (const p of this.pool) {
      if (!p.active) continue;

      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;

      // PRD 2 — within close magnet range, snap toward the player.
      // Outside the magnet, drops drift down with the river current.
      if (dist < magnetR) {
        const pullSpeed = 520;
        p.vx = (dx / dist) * pullSpeed;
        p.vy = (dy / dist) * pullSpeed;
        // Sparkle trail via the shared FxSystem trail emitter (pooled).
        // Was: `scene.add.circle` + tween every 60ms → ~60-100 GameObject
        // allocations per second per active magnet. Now: emitParticleAt on
        // a single shared emitter — Phaser pools internally, near-zero GC.
        p.trailMs = (p.trailMs ?? 0) + deltaMs;
        if (p.trailMs >= 60) {
          p.trailMs = 0;
          const tint = p.kind === 'xp-orb' ? 0xaaf0ff
            : p.kind === 'gem' ? 0xcc88ff
            : 0xffd85a;
          this.scene.fx.trailDot(p.x, p.y, { tint, scale: 0.4, lifespan: 280 });
        }
      } else {
        // River drift — restore the per-spawn drift velocity (avoids the
        // pull-vector becoming the new resting velocity once the player
        // leaves magnet range).
        p.vx *= 0.95;
        p.vy = RIVER_SCROLL_SPEED;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.setPosition(p.x, p.y);

      // PRD 2 — silent cull once the drop scrolls past the bottom.
      if (p.y > WORLD_HEIGHT + 60) {
        p.active = false;
        p.sprite.setVisible(false);
        continue;
      }

      // Collect if close enough.
      if (dist < player.radius + 16) {
        this.collect(p);
      }
    }
  }

  /** Snap every active pickup to the player and collect — used on boss
   *  defeat so the player never has to fish drops out of the river while
   *  the Boss Spoils overlay is queueing up. */
  pullAllToPlayer(): void {
    const player = this.scene.player;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.x = player.x;
      p.y = player.y;
      this.collect(p);
    }
  }

  private collect(p: Pickup): void {
    p.active = false;
    p.sprite.setVisible(false);
    const rs = this.scene.runState;
    let gainAmount = 0;
    let gainLabel = '';
    let gainColor = '#ffd85a';
    let logKind: 'coin' | 'gem' | 'xp' = 'coin';
    switch (p.kind) {
      case 'coin-small':
      case 'coin-medium':
      case 'coin-large': {
        gainAmount = Math.round(p.value * rs.coinValueMult * cargoNetsCoinBonus(rs));
        rs.addCoins(gainAmount);
        this.scene.audio.sfxCoin();
        gainLabel = `+${gainAmount}`;
        gainColor = p.kind === 'coin-large' ? '#ffd85a' : p.kind === 'coin-medium' ? '#dcdcdc' : '#cc8a44';
        logKind = 'coin';
        break;
      }
      case 'gem': {
        gainAmount = p.value;
        rs.addGems(gainAmount);
        this.scene.audio.sfxCoin();
        gainLabel = `+${gainAmount} ◆`;
        gainColor = '#cc88ff';
        logKind = 'gem';
        break;
      }
      case 'xp-orb': {
        gainAmount = Math.round(p.value * admiralsFlagXpBonus(rs));
        rs.addXp(gainAmount);
        this.scene.audio.sfxCoin();
        gainLabel = `+${gainAmount} XP`;
        gainColor = '#aaf0ff';
        logKind = 'xp';
        break;
      }
    }
    if (gainAmount > 0) {
      this.scene.combatLog?.push({
        kind: 'pickup',
        time: Date.now(),
        pickup: logKind,
        amount: gainAmount,
      });
    }

    // Floating +N text rising from the pickup spot — same juice as
    // damage numbers, color-coded to the pickup family. Reduced-motion
    // skips animation but the number still appears so HUD stays useful.
    this.spawnGainText(p.x, p.y, gainLabel, gainColor);
  }

  /**
   * Tiny floating "+N XP" / "+N coins" text that rises from the pickup
   * point. Visual feedback the user complained was missing — picking
   * stuff up should *look* satisfying, not just register silently.
   */
  private spawnGainText(x: number, y: number, label: string, color: string): void {
    const t = this.scene.add.text(x, y - 6, label, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '20px',
      color,
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5).setDepth(20);
    const reduced = this.scene.fx.reducedMotion();
    this.scene.tweens.add({
      targets: t,
      y: y - (reduced ? 30 : 56),
      alpha: { from: 1, to: 0 },
      scale: reduced ? 1 : { from: 1.15, to: 0.9 },
      duration: reduced ? 700 : 950,
      ease: 'Cubic.out',
      onComplete: () => t.destroy(),
    });
  }
}
