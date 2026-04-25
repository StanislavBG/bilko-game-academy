import { ShipwrightChest } from '../../systems/evolution-chest';
import Phaser from 'phaser';
import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { BossBanner } from './boss-banner';
import { WORLD_WIDTH } from '../../constants';

/**
 * B4 The Drowned Admiralty — Act II finale. Triple Target mechanic.
 *
 * Three ships: Flagship shields Interceptor + Wraith (intangible while Flagship alive).
 * Kill order is strategic.
 *
 * For implementation simplicity, we model this as a single Enemy instance
 * (the Flagship) with two companions spawned as children. The composite
 * "boss HP" is the sum.
 */
export const DROWNED_ADMIRALTY_FLAGSHIP_SPEC: EnemySpec = {
  id: 'drowned-admiralty-flagship',
  maxHp: 160,
  armor: 4,
  speed: 70,
  contactDamage: 4,
  collisionRadius: 60,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 10, gemChance: 1.0, xpOrbs: 4 },
  color: 0x3a4a8a,
  visualRadius: 58,
};

const INTERCEPTOR_SPEC: EnemySpec = {
  id: 'drowned-admiralty-interceptor',
  maxHp: 100,
  armor: 3,
  speed: 200,
  contactDamage: 6,
  collisionRadius: 32,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 5, gemChance: 0.8, xpOrbs: 3 },
  color: 0x3a8a8a,
  visualRadius: 30,
};

const WRAITH_SPEC: EnemySpec = {
  id: 'drowned-admiralty-wraith',
  maxHp: 100,
  armor: 5,
  speed: 90,
  contactDamage: 3,
  collisionRadius: 36,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 5, gemChance: 0.8, xpOrbs: 3 },
  color: 0x8a3a8a,
  visualRadius: 34,
};

class DrownedInterceptor extends Enemy {
  fleet!: DrownedAdmiralty;
  private ramTimerMs = 0;
  constructor(scene: StageScene, x: number, y: number) { super(scene, INTERCEPTOR_SPEC, x, y); }
  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    if (this.fleet && this.fleet.flagshipAlive()) return 0; // intangible
    return super.takeDamage(damage, armorPierce, isCrit);
  }
  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x3a8a8a, 0.8).fillRect(-16, -26, 32, 52);
    g.fillStyle(0xaaff8a, 1).fillTriangle(-10, 20, 10, 20, 0, 30);
    g.lineStyle(2, 0x1a3a3a, 1).strokeRect(-16, -26, 32, 52);
  }
  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;
    const p = this.scene.player;
    if (this.fleet && this.fleet.flagshipAlive()) {
      // Drift lazily.
      this.setPos(this.x + Math.sin(this.scene.time.now / 800) * 30 * dt, this.y + Math.cos(this.scene.time.now / 1000) * 30 * dt);
    } else {
      // Aggressive ram.
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      this.setPos(this.x + (dx / len) * 300 * dt, this.y + (dy / len) * 300 * dt);
      this.ramTimerMs -= deltaMs;
    }
  }
}

class DrownedWraith extends Enemy {
  fleet!: DrownedAdmiralty;
  private wailMs = 5000;
  constructor(scene: StageScene, x: number, y: number) { super(scene, WRAITH_SPEC, x, y); }
  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    if (this.fleet && this.fleet.flagshipAlive()) return 0;
    return super.takeDamage(damage, armorPierce, isCrit);
  }
  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x8a3a8a, 0.8).fillRect(-18, -28, 36, 56);
    g.fillStyle(0xc88aff, 0.7).fillTriangle(-18, -28, 18, -28, 0, -42);
    g.lineStyle(2, 0x3a1a3a, 1).strokeRect(-18, -28, 36, 56);
  }
  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;
    const p = this.scene.player;
    this.setPos(this.x + Math.cos(this.scene.time.now / 700) * 40 * dt, this.y + Math.sin(this.scene.time.now / 900) * 40 * dt);
    if (this.fleet && !this.fleet.flagshipAlive()) {
      this.wailMs -= deltaMs;
      if (this.wailMs <= 0) {
        this.wail(p);
        this.wailMs = 5000;
      }
    }
  }
  private wail(p: { x: number; y: number; takeDamage(n: number): number }): void {
    const ring = this.scene.add.circle(this.x, this.y, 120, 0xc88aff, 0.4);
    ring.setDepth(8);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 1, to: 2.5 },
      alpha: { from: 0.6, to: 0 },
      duration: 600,
      onComplete: () => ring.destroy(),
    });
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    if (dx * dx + dy * dy <= 300 * 300) {
      p.takeDamage(3);
    }
  }
}

export class DrownedAdmiralty extends Enemy {
  private banner: BossBanner;
  private cannonMs = 2500;
  private interceptor: DrownedInterceptor | null = null;
  private wraith: DrownedWraith | null = null;
  private shieldAura: Phaser.GameObjects.Arc | null = null;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, DROWNED_ADMIRALTY_FLAGSHIP_SPEC, x, y);
    this.banner = new BossBanner(scene, 'The Drowned Admiralty — Soul Flagship', () => this.compositeMax(), () => this.compositeHp());
    this.banner.setPhase('Phase 1: Colors Of The Damned');
    this.banner.redraw();

    // Spawn companions.
    const interceptor = new DrownedInterceptor(scene, x - 160, y + 80);
    interceptor.fleet = this;
    this.interceptor = interceptor;
    scene.enemies.enemies.push(interceptor);

    const wraith = new DrownedWraith(scene, x + 160, y + 80);
    wraith.fleet = this;
    this.wraith = wraith;
    scene.enemies.enemies.push(wraith);

    // Shield aura visual.
    this.shieldAura = scene.add.circle(x, y, 240, 0x8ad0ff, 0.18);
    this.shieldAura.setDepth(-30);
  }

  flagshipAlive(): boolean {
    return this.active;
  }

  private compositeMax(): number {
    return this.spec.maxHp + (this.interceptor?.spec.maxHp ?? 0) + (this.wraith?.spec.maxHp ?? 0);
  }

  private compositeHp(): number {
    return Math.max(0, this.hp) + Math.max(0, this.interceptor?.active ? this.interceptor.hp : 0) + Math.max(0, this.wraith?.active ? this.wraith.hp : 0);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x3a4a8a, 0.85).fillRect(-60, -60, 120, 120);
    g.fillStyle(0x8abbff, 0.6).fillTriangle(-58, -60, 58, -60, 0, -80);
    g.fillStyle(0xc8dcff, 0.7).fillRect(-40, -20, 80, 18);
    g.lineStyle(4, 0x6aa8d8, 0.9).strokeRect(-60, -60, 120, 120);
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    const taken = super.takeDamage(damage, armorPierce, isCrit);
    this.banner.redraw();
    return taken;
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;
    const p = this.scene.player;

    // Hold position at top of screen, drift slightly.
    const targetY = 280;
    const targetX = Phaser.Math.Clamp(p.x, 260, WORLD_WIDTH - 260);
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.setPos(this.x + (dx / len) * this.spec.speed * dt, this.y + (dy / len) * this.spec.speed * dt);

    // Follow aura.
    if (this.shieldAura) {
      this.shieldAura.setPosition(this.x, this.y);
    }

    this.cannonMs -= deltaMs;
    if (this.cannonMs <= 0) {
      this.spectralBroadside();
      this.cannonMs = 2500;
    }

    // Check phase transitions via banner label.
    if (!this.interceptor?.active && !this.wraith?.active) {
      this.banner.setPhase("Phase 3: Requiem");
    } else if (!this.interceptor?.active || !this.wraith?.active) {
      this.banner.setPhase('Phase 2: Unleashed');
    }
  }

  private spectralBroadside(): void {
    const p = this.scene.player;
    const base = Math.atan2(p.y - this.y, p.x - this.x);
    const speed = 500;
    for (let i = 0; i < 8; i++) {
      const spread = (i - 3.5) * 0.08;
      const ang = base + spread;
      this.scene.enemies.spawnEnemyBullet(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 2);
    }
  }

  override kill(): void {
    // Only grant rewards when ALL 3 ships are down.
    const allDown = (!this.interceptor || !this.interceptor.active) && (!this.wraith || !this.wraith.active);
    this.banner.destroy();
    this.shieldAura?.destroy();
    if (allDown) {
      for (let i = 0; i < 15; i++) this.scene.pickups.spawnGem(this.x, this.y);
      this.scene.pickups.spawnCoins(this.x, this.y, 10, 'large');
      this.scene.shipwright.add(new ShipwrightChest(this.scene, this.x, this.y - 60));
    }
    super.kill();
  }
}
