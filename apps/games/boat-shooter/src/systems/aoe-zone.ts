import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';

export type AoeKind = 'fire-patch' | 'freeze-tick' | 'ink' | 'explosive-once';

interface AoeZone {
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  radius: number;
  remainingMs: number;
  tickMs: number;
  tickAccumMs: number;
  dps: number;
  kind: AoeKind;
  active: boolean;
}

/**
 * AoE zone system — persistent damage areas on the water. Used by:
 *   - Fire-Arrow Rain's lingering fire patch
 *   - Inferno Breath oil slicks
 *   - Ice Storm 3-way reaction zone
 *   - Obsidian Warlord lava zones (later)
 */
export class AoeZoneSystem {
  private pool: AoeZone[] = [];
  private readonly scene: StageScene;

  constructor(scene: StageScene) {
    this.scene = scene;
  }

  spawn(x: number, y: number, radius: number, durationMs: number, dps: number, kind: AoeKind): void {
    let zone = this.pool.find((z) => !z.active);
    if (!zone) {
      const g = this.scene.add.graphics();
      g.setDepth(3);
      zone = {
        sprite: g,
        x,
        y,
        radius,
        remainingMs: 0,
        tickMs: 250,
        tickAccumMs: 0,
        dps: 0,
        kind,
        active: false,
      };
      this.pool.push(zone);
    }
    zone.x = x;
    zone.y = y;
    zone.radius = radius;
    zone.remainingMs = durationMs;
    zone.tickAccumMs = 0;
    zone.dps = dps;
    zone.kind = kind;
    zone.active = true;
    zone.sprite.setVisible(true);
    this.drawZone(zone);
  }

  private drawZone(z: AoeZone): void {
    z.sprite.clear();
    switch (z.kind) {
      case 'fire-patch':
        z.sprite.fillStyle(0xff6b2a, 0.35).fillCircle(z.x, z.y, z.radius);
        z.sprite.lineStyle(3, 0xff3a0a, 0.7).strokeCircle(z.x, z.y, z.radius);
        break;
      case 'freeze-tick':
        z.sprite.fillStyle(0xa8e0ff, 0.3).fillCircle(z.x, z.y, z.radius);
        z.sprite.lineStyle(2, 0x5aa8e8, 0.6).strokeCircle(z.x, z.y, z.radius);
        break;
      case 'ink':
        z.sprite.fillStyle(0x5a2a8a, 0.45).fillCircle(z.x, z.y, z.radius);
        break;
      case 'explosive-once':
        z.sprite.fillStyle(0xffd85a, 0.6).fillCircle(z.x, z.y, z.radius);
        break;
    }
  }

  update(deltaMs: number): void {
    for (const z of this.pool) {
      if (!z.active) continue;
      z.remainingMs -= deltaMs;
      z.tickAccumMs += deltaMs;

      if (z.tickAccumMs >= z.tickMs) {
        z.tickAccumMs -= z.tickMs;
        this.applyTick(z);
      }

      // Fade out over last 500ms.
      if (z.remainingMs < 500) {
        z.sprite.setAlpha(Math.max(0, z.remainingMs / 500));
      }

      if (z.remainingMs <= 0) {
        z.active = false;
        z.sprite.setVisible(false);
        z.sprite.setAlpha(1);
      }
    }
  }

  private applyTick(z: AoeZone): void {
    const r2 = z.radius * z.radius;
    const tickFraction = z.tickMs / 1000;
    const dmgPerTick = z.dps * tickFraction;

    this.scene.enemies.forEachActive((e) => {
      const dx = e.x - z.x;
      const dy = e.y - z.y;
      if (dx * dx + dy * dy > r2) return;
      e.takeStatusDamage(dmgPerTick, z.kind === 'freeze-tick' ? 'freeze' : 'burn');
      if (z.kind === 'freeze-tick') {
        e.statuses.apply('freeze', 500);
      }
    });
  }

  /** Returns true if player position is currently inside any hazardous zone. */
  isPlayerInHazard(px: number, py: number): boolean {
    for (const z of this.pool) {
      if (!z.active) continue;
      const dx = z.x - px;
      const dy = z.y - py;
      if (dx * dx + dy * dy <= z.radius * z.radius) return true;
    }
    return false;
  }
}
