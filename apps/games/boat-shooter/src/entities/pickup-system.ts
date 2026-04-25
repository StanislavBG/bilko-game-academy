import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { XP_TUNING } from '../constants';
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
    // Rebuild visuals for the new kind.
    p.sprite.removeAll(true);
    const g = this.scene.add.graphics();
    this.drawPickup(g, kind);
    p.sprite.add(g);
    p.sprite.setPosition(x, y);
    p.kind = kind;
    p.x = x;
    p.y = y;
    // Drops sit exactly where the enemy died — no burst velocity, no drift.
    // The ship can sail over to collect them; the magnet pulls once close.
    p.vx = 0;
    p.vy = 0;
    p.settled = true;
    p.spawnedAt = this.scene.time.now;
    p.active = true;
    p.sprite.setVisible(true);
    // Small pop-in so the drop reads as "just appeared".
    p.sprite.setScale(0.3);
    this.scene.tweens.add({ targets: p.sprite, scale: 1, duration: 180, ease: 'Back.out' });
    return p;
  }

  private drawPickup(g: Phaser.GameObjects.Graphics, kind: PickupKind): void {
    switch (kind) {
      case 'coin-small':
        g.fillStyle(0xb87333, 1).fillCircle(0, 0, 6);
        g.lineStyle(1, 0x2a1610, 1).strokeCircle(0, 0, 6);
        break;
      case 'coin-medium':
        g.fillStyle(0xc0c0c0, 1).fillCircle(0, 0, 9);
        g.lineStyle(1.5, 0x2a2a2a, 1).strokeCircle(0, 0, 9);
        break;
      case 'coin-large':
        g.fillStyle(0xffd700, 1).fillCircle(0, 0, 12);
        g.lineStyle(2, 0x8a6a00, 1).strokeCircle(0, 0, 12);
        break;
      case 'gem':
        g.fillStyle(0xb366ff, 1).fillRect(-6, -9, 12, 18);
        g.lineStyle(2, 0x6a33aa, 1).strokeRect(-6, -9, 12, 18);
        break;
      case 'xp-orb':
        g.fillStyle(0x5ac8e8, 0.85).fillCircle(0, 0, 7);
        g.lineStyle(2, 0x2a8aa8, 1).strokeCircle(0, 0, 7);
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

      // Magnet kicks in only when the boat is near. Drops are otherwise
      // stationary — the river doesn't scroll them away.
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
        p.vx = 0;
        p.vy = 0;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.setPosition(p.x, p.y);

      // Collect if close enough.
      if (dist < player.radius + 16) {
        this.collect(p);
      }
    }
  }

  private collect(p: Pickup): void {
    p.active = false;
    p.sprite.setVisible(false);
    const rs = this.scene.runState;
    switch (p.kind) {
      case 'coin-small':
      case 'coin-medium':
      case 'coin-large':
        rs.addCoins(Math.round(p.value * rs.coinValueMult * cargoNetsCoinBonus(rs)));
        this.scene.audio.sfxCoin();
        break;
      case 'gem':
        rs.addGems(p.value);
        this.scene.audio.sfxCoin();
        break;
      case 'xp-orb':
        rs.addXp(Math.round(p.value * admiralsFlagXpBonus(rs)));
        // XP orb gets a quieter higher-pitched sibling of the coin cue —
        // reuse sfxCoin for now; future work: dedicated sfxXp.
        this.scene.audio.sfxCoin();
        break;
    }
  }
}
