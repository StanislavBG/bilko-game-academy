import { ShipwrightChest } from '../../systems/evolution-chest';
import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { BossBanner } from './boss-banner';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../../constants';

/**
 * B6 The Kraken Ancient — FINAL BOSS.
 *
 * Screen-sized. Four phases:
 *   P1 (Tentacle gate): 4 tentacle hazards active; kill all 4 to advance.
 *   P2 (Head HP 200): main target is the head; 2 tentacles continue; water-jet beams + ink + swarms.
 *   P3 (Core HP 100): mouth opens; core vulnerable 2s / invulnerable 3s cycle; up to 5 tentacles.
 *   P4 (Core ≤ 20): continuous rage; cinematic on kill.
 */
export const KRAKEN_ANCIENT_SPEC: EnemySpec = {
  id: 'kraken-ancient',
  maxHp: 500,
  armor: 4,
  speed: 60,
  contactDamage: 6,
  collisionRadius: 120,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 30, gemChance: 1.0, xpOrbs: 15 },
  color: 0x5a2a8a,
  visualRadius: 110,
};

export class KrakenAncient extends Enemy {
  private phase: 1 | 2 | 3 | 4 = 1;
  private banner: BossBanner;
  private tentacleTimerMs = 0;
  private activeTentacles: Enemy[] = [];
  private jetMs = 5000;
  private swarmMs = 18000;
  private coreVulnerable = false;
  private coreToggleMs = 2000;
  private deathCinematic = false;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, KRAKEN_ANCIENT_SPEC, x, y);
    this.banner = new BossBanner(scene, 'The Kraken Ancient', () => this.spec.maxHp, () => this.hp);
    this.banner.setPhase('Phase 1: The Gathering');
    this.banner.redraw();

    // Spawn 4 initial tentacles.
    this.spawnTentacles(4);
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    // Large mass in the center of the screen, partly submerged.
    g.fillStyle(0x5a2a8a, 0.9).fillCircle(0, 0, 110);
    g.fillStyle(0x8a4aca, 0.8).fillCircle(0, -10, 80);
    // Massive single glowing eye.
    g.fillStyle(0xffd85a, 1).fillCircle(0, -30, 20);
    g.fillStyle(0x000, 1).fillCircle(0, -30, 10);
    // Maw.
    if (this.phase >= 2) {
      g.fillStyle(0x2a0a1a, 1).fillEllipse(0, 30, 80, 30);
      if (this.phase >= 3 && this.coreVulnerable) {
        // Core exposed — glowing red.
        g.fillStyle(0xff3a0a, 1).fillCircle(0, 30, 14);
        g.fillStyle(0xffc8a0, 0.6).fillCircle(0, 30, 20);
      }
    }
    // Ragged outline.
    g.lineStyle(4, 0x1a0a3a, 1).strokeCircle(0, 0, 110);
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    // P1: head is submerged, damage has no effect.
    if (this.phase === 1) return 0;
    // P3: core only vulnerable on the vulnerable beat.
    if (this.phase === 3 && !this.coreVulnerable) return 0;
    const taken = super.takeDamage(damage, armorPierce, isCrit);
    this.banner.redraw();
    if (this.phase === 2 && this.hp <= 100) this.enterPhase(3);
    if (this.phase === 3 && this.hp <= 20) this.enterPhase(4);
    return taken;
  }

  private enterPhase(p: 1 | 2 | 3 | 4): void {
    this.phase = p;
    if (p === 2) this.banner.setPhase('Phase 2: The Rising');
    if (p === 3) this.banner.setPhase('Phase 3: The Heart');
    if (p === 4) this.banner.setPhase('Phase 4: The Fall');
    if (p >= 2) {
      // Spawn 2 tentacles continuously.
      this.tentacleTimerMs = 1000;
    }
    if (p === 4) {
      this.jetMs = 800;
      this.coreToggleMs = 0; // always vulnerable
      this.coreVulnerable = true;
    }
  }

  private spawnTentacles(n: number): void {
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const r = 200 + Math.random() * 100;
      const t = this.scene.enemies.spawn('kraken-tentacle', this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r);
      if (t) this.activeTentacles.push(t);
    }
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    if (this.deathCinematic) return;

    // Sit roughly at screen center, bob slightly.
    const targetX = WORLD_WIDTH / 2;
    const targetY = WORLD_HEIGHT / 2 + 60;
    const bx = targetX + Math.sin(this.scene.time.now / 1000) * 40;
    const by = targetY + Math.cos(this.scene.time.now / 1400) * 20;
    this.setPos(bx, by);

    // Clean up dead tentacles from tracker.
    this.activeTentacles = this.activeTentacles.filter((t) => t.active);

    // P1 gate: advance when all initial tentacles are dead.
    if (this.phase === 1 && this.activeTentacles.length === 0) {
      this.enterPhase(2);
    }

    // Respawn tentacles in phases 2+.
    if (this.phase >= 2) {
      this.tentacleTimerMs -= deltaMs;
      if (this.tentacleTimerMs <= 0 && this.activeTentacles.length < (this.phase === 2 ? 2 : 5)) {
        this.spawnTentacles(1);
        this.tentacleTimerMs = 8000;
      }
    }

    // Water-jet beams (in P2+).
    if (this.phase >= 2) {
      this.jetMs -= deltaMs;
      if (this.jetMs <= 0) {
        this.waterJet();
        this.jetMs = this.phase === 4 ? 800 : 5000;
      }
    }

    // Core vulnerability cycle (P3 only).
    if (this.phase === 3) {
      this.coreToggleMs -= deltaMs;
      if (this.coreToggleMs <= 0) {
        this.coreVulnerable = !this.coreVulnerable;
        this.coreToggleMs = this.coreVulnerable ? 2000 : 3000;
        this.drawVisual();
      }
    }

    // Cursed swarm summons.
    this.swarmMs -= deltaMs;
    if (this.swarmMs <= 0 && this.phase >= 2) {
      for (let i = 0; i < 12; i++) {
        this.scene.enemies.spawn('cursed-swarm', this.x + (Math.random() * 600 - 300), this.y - 300);
      }
      this.swarmMs = this.phase === 4 ? 6000 : 18000;
    }
  }

  private waterJet(): void {
    const p = this.scene.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const speed = 700;
    this.scene.enemies.spawnEnemyBullet(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 4);
  }

  override kill(): void {
    if (this.deathCinematic) return;
    this.deathCinematic = true;
    this.banner.destroy();

    // Massive finale.
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(i * 180, () => {
        const angle = Math.random() * Math.PI * 2;
        const r = 60 + Math.random() * 160;
        this.scene.fx.explosion(this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r, 180, 0xff8a3a);
      });
    }
    this.scene.cameras.main.shake(1500, 0.04);

    this.scene.time.delayedCall(1500, () => {
      const titleCard = this.scene.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'THE RIVER IS YOURS.', {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '96px',
        color: '#ffd85a',
        stroke: '#000',
        strokeThickness: 6,
      });
      titleCard.setOrigin(0.5, 0.5);
      titleCard.setDepth(2000);
      this.scene.tweens.add({
        targets: titleCard,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.7, to: 1 },
        duration: 1200,
      });
    });

    // Final drops.
    for (let i = 0; i < 30; i++) this.scene.pickups.spawnGem(this.x, this.y);
    this.scene.pickups.spawnCoins(this.x, this.y, 20, 'large');
    // Final wild-card chest.
    this.scene.shipwright.add(new ShipwrightChest(this.scene, this.x, this.y - 100, true));

    super.kill();
  }
}
