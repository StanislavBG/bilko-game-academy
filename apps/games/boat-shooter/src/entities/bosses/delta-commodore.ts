import { ShipwrightChest } from '../../systems/evolution-chest';
import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { BossBanner } from './boss-banner';
import { WORLD_WIDTH } from '../../constants';
import { fanSpread, leadAimAngle, spiralShot } from '../../systems/firing-patterns';

/**
 * B1 The Delta Commodore — Fleet Formation mechanic.
 *
 *   P1: 3 escort gunboats in V; Commodore takes −50% dmg while any escort alive.
 *   P2: escorts dead, full damage, summons + mortar barrage.
 *   P3: enrage; final reinforcement wave.
 */
export const DELTA_COMMODORE_SPEC: EnemySpec = {
  id: 'delta-commodore',
  maxHp: 200,
  armor: 4,
  speed: 90,
  contactDamage: 5,
  collisionRadius: 70,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 12, gemChance: 1.0, xpOrbs: 5 },
  color: 0x1a2a4a,
  visualRadius: 66,
};

export class DeltaCommodore extends Enemy {
  private phase: 1 | 2 | 3 = 1;
  private escorts: Enemy[] = [];
  private cannonMs = 3000;
  private summonMs = 10000;
  private mortarMs = 7000;
  private flareFired = false;
  private banner: BossBanner;
  private anchorDir: 1 | -1 = 1;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, DELTA_COMMODORE_SPEC, x, y);
    this.banner = new BossBanner(scene, "HMS Ironclad Majesty — Delta Commodore", () => this.spec.maxHp, () => this.hp);
    this.banner.setPhase("Phase 1: The Fleet");
    this.banner.redraw();

    // Spawn 3 escorts in V formation.
    const e1 = scene.enemies.spawn('patrol-gunboat', x - 140, y + 80);
    const e2 = scene.enemies.spawn('patrol-gunboat', x + 140, y + 80);
    const e3 = scene.enemies.spawn('patrol-gunboat', x, y + 160);
    if (e1) this.escorts.push(e1);
    if (e2) this.escorts.push(e2);
    if (e3) this.escorts.push(e3);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x1a2a4a, 1).fillRect(-60, -68, 120, 136);
    g.fillStyle(0xf0f0f0, 1).fillTriangle(-58, -68, 58, -68, 0, -96);
    g.fillStyle(0xc79448, 1).fillRect(-16, -30, 32, 18);
    g.fillStyle(0x2a1a10, 1).fillRect(-4, -68, 8, 66);
    g.fillStyle(0x808080, 1);
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      g.fillRect(-66, -8 + i * 10, 6, 6);
      g.fillRect(60, -8 + i * 10, 6, 6);
    }
    g.lineStyle(4, 0x000, 0.9).strokeRect(-60, -68, 120, 136);
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    // Fleet Formation — while any escort alive, Commodore takes ×0.5 damage.
    const escortsAlive = this.escorts.some((e) => e.active);
    const working = escortsAlive ? damage * 0.5 : damage;
    const taken = super.takeDamage(working, armorPierce, isCrit);
    this.banner.redraw();
    if (this.phase === 1 && this.hp <= 120 && !escortsAlive) this.enterPhase(2);
    if (this.phase === 2 && this.hp <= 40) this.enterPhase(3);
    return taken;
  }

  private enterPhase(p: 1 | 2 | 3): void {
    this.phase = p;
    if (p === 2) {
      this.banner.setPhase("Phase 2: Broken Formation");
      this.cannonMs = 2000;
    } else if (p === 3) {
      this.banner.setPhase("Phase 3: Last Colors");
      this.cannonMs = 1200;
      if (!this.flareFired) {
        this.flareFired = true;
        for (let i = 0; i < 5; i++) {
          this.scene.enemies.spawn('scout-skiff', this.x + (Math.random() * 300 - 150), this.y + 120);
        }
      }
    }
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;

    // Drift horizontally.
    this.setPos(this.x + this.anchorDir * 25 * dt, 260);
    if (this.x > WORLD_WIDTH - 220) this.anchorDir = -1;
    if (this.x < 220) this.anchorDir = 1;

    this.cannonMs -= deltaMs;
    if (this.cannonMs <= 0) {
      this.broadside();
      this.cannonMs = this.phase === 1 ? 3000 : this.phase === 2 ? 2000 : 1200;
    }

    if (this.phase === 2) {
      this.summonMs -= deltaMs;
      if (this.summonMs <= 0) {
        this.scene.enemies.spawn('patrol-gunboat', this.x + 150, this.y + 80);
        this.scene.enemies.spawn('patrol-gunboat', this.x - 150, this.y + 80);
        this.summonMs = 10000;
      }
      this.mortarMs -= deltaMs;
      if (this.mortarMs <= 0) {
        this.mortarBarrage();
        this.mortarMs = 7000;
      }
    }

    // Phase 3: continuous 4-arm spiral fired every 120 ms — geometric rose pattern.
    if (this.phase === 3) {
      this.spiralTimerMs -= deltaMs;
      if (this.spiralTimerMs <= 0) {
        this.spiralPulse();
        this.spiralTimerMs = 120;
      }
    }

    // Check escorts-alive status for Phase 1 → 2 auto-transition once they're all cleared.
    if (this.phase === 1) {
      const anyAlive = this.escorts.some((e) => e.active);
      if (!anyAlive && this.hp <= 120) this.enterPhase(2);
    }
  }

  /** Rotating seed angle for the phase-3 spiral pattern. */
  private spiralAngle = 0;
  private spiralTimerMs = 0;

  private broadside(): void {
    const p = this.scene.player;
    const sign = Math.random() < 0.5 ? -1 : 1;
    const sideOffset = sign * 70;
    const speed = 480;
    const ang = leadAimAngle(this.x + sideOffset, this.y, { x: p.x, y: p.y, vx: p.vx, vy: p.vy }, speed);
    // 7-bullet symmetric fan from the broadside row.
    fanSpread(this.scene, this.x + sideOffset, this.y, ang, {
      bullets: 7,
      spreadDeg: 36,
      speed,
      damage: 2,
    });
    for (let i = 0; i < 6; i++) {
      this.scene.fx.muzzleFlash(this.x + sideOffset, this.y + i * 6 - 30, 0xffb050);
    }
    this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: 1.06, to: 1 },
      scaleY: { from: 0.96, to: 1 },
      duration: 180,
      ease: 'Cubic.out',
    });
    this.scene.cameras.main.shake(130, 0.005);
    this.scene.audio.sfxCannon();
  }

  /** Phase-3 4-arm rose pattern — 4 streams of bullets rotating in lockstep. */
  private spiralPulse(): void {
    const arms = 4;
    const speed = 240;
    for (let a = 0; a < arms; a++) {
      const armAng = this.spiralAngle + (a * Math.PI * 2) / arms;
      spiralShot(this.scene, this.x, this.y, { angleRad: armAng, speed, damage: 2 });
    }
    this.spiralAngle += 0.18; // fractional rad/shot — gives the spirograph trail
  }

  private mortarBarrage(): void {
    const p = this.scene.player;
    const tx = p.x;
    const ty = p.y;
    const telegraph = this.scene.add.graphics();
    telegraph.lineStyle(3, 0xff3a0a, 0.9).strokeCircle(tx, ty, 80);
    telegraph.fillStyle(0xff3a0a, 0.2).fillCircle(tx, ty, 80);
    telegraph.setDepth(3);
    this.scene.time.delayedCall(1000, () => {
      telegraph.destroy();
      const dx = this.scene.player.x - tx;
      const dy = this.scene.player.y - ty;
      if (dx * dx + dy * dy <= 80 * 80) {
        this.scene.player.takeDamage(3, { source: 'delta-commodore', type: 'projectile' });
      }
      const flash = this.scene.add.circle(tx, ty, 80, 0xff6a3a, 0.7);
      flash.setDepth(5);
      this.scene.tweens.add({
        targets: flash,
        alpha: { from: 0.8, to: 0 },
        duration: 300,
        onComplete: () => flash.destroy(),
      });
    });
  }

  override kill(): void {
    this.banner.destroy();
    for (let i = 0; i < 6; i++) this.scene.pickups.spawnGem(this.x, this.y);
    this.scene.pickups.spawnCoins(this.x, this.y, 10, 'large');
    this.scene.shipwright.add(new ShipwrightChest(this.scene, this.x, this.y - 60));
    super.kill();
  }
}
