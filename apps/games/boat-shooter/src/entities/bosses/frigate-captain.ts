import Phaser from 'phaser';
import { Enemy, type EnemySpec } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { WORLD_WIDTH } from '../../constants';
import { ShipwrightChest } from '../../systems/evolution-chest';
import { fanSpread, radialBurst, leadAimAngle } from '../../systems/firing-patterns';

/**
 * N5 Frigate Captain — "HMS Thunderstrike" — Act I mini-boss.
 *
 * Per docs (games/boat-shooter/08-enemies.md N5):
 *   HP 60 total (P1: 40, P2: 20). Armor 3. Speed 80 px/s. Contact 3 dmg. Knockback-immune.
 *   P1 "Broadside" (HP 60 → 20):
 *     - Every 3s: 5-cannon broadside (port or starboard), 2 dmg each.
 *     - Every 8s: drops a flare → 3 Scout Skiffs.
 *   P2 "Last Stand" (HP 20 → 0):
 *     - Ship tilts; fires every 1.5s from remaining side.
 *     - Summons 1 Patrol Gunboat every 12s.
 *     - Mortar barrage at player position every 5s (3 dmg, 80px AoE, 1s telegraph).
 *     - Enrage at HP < 10: continuous fire (0.8s cadence).
 *
 * For P1 we implement the core pattern (broadside + skiff summons + phase
 * transition to tighter cannon cadence). Mortar AoE is deferred to P2 —
 * it requires an AoE system that other bosses (Obsidian Warlord, etc.)
 * also use. A placeholder simple fire pattern fills in.
 */
export const FRIGATE_CAPTAIN_SPEC: EnemySpec = {
  id: 'frigate-captain',
  // First-boss HP reduced 60 → 40 so Stage 1 is winnable with a L3-L4
  // build. Armor stays at 3 so crit builds still feel distinct.
  maxHp: 40,
  armor: 3,
  speed: 80,
  contactDamage: 3,
  collisionRadius: 60,
  drops: { coinsSmall: 0, coinsMedium: 0, coinsLarge: 6, gemChance: 1.0, xpOrbs: 4 },
  color: 0x4a3a28,
  visualRadius: 55,
};

type BossPhase = 1 | 2;

export class FrigateCaptain extends Enemy {
  private phase: BossPhase = 1;
  private broadsideTimerMs = 3000;
  private flareTimerMs = 8000;

  // Anchor behaviour: the frigate drifts slowly left-right across the top
  // of the play area so the fight has movement beats.
  private anchorY = 200;
  private anchorDirection: 1 | -1 = 1;

  // HUD label (name banner).
  private label!: Phaser.GameObjects.Text;
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;

  constructor(scene: StageScene, x: number, y: number) {
    super(scene, FRIGATE_CAPTAIN_SPEC, x, y);
    this.buildBossBanner();
  }

  protected override drawVisual(): void {
    const g = this.graphics;
    g.clear();
    // Hull (larger than regular enemies).
    g.fillStyle(0x4a3a28, 1).fillRect(-40, -60, 80, 120);
    // Sails — 3 white rectangles.
    g.fillStyle(0xf0f0f0, 1).fillTriangle(-38, -60, 38, -60, 0, -88);
    g.fillStyle(0xf0ead0, 1).fillRect(-30, -52, 60, 48);
    g.fillStyle(0xc79448, 1).fillRect(-10, -30, 20, 14); // captain's flag
    // Masts.
    g.fillStyle(0x2a1610, 1).fillRect(-2, -60, 4, 60);
    // Broadside cannons (5 per side).
    g.fillStyle(0x808080, 1);
    for (let i = 0; i < 5; i++) {
      const y = -40 + i * 20;
      g.fillRect(-45, y, 5, 6);
      g.fillRect(40, y, 5, 6);
    }
    g.lineStyle(3, 0x000000, 0.9).strokeRect(-40, -60, 80, 120);
  }

  private buildBossBanner(): void {
    this.label = this.scene.add.text(WORLD_WIDTH / 2, 120, "HMS THUNDERSTRIKE — Frigate Captain", {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '32px',
      color: '#e0b063',
      stroke: '#000',
      strokeThickness: 3,
    });
    this.label.setOrigin(0.5, 0.5);
    this.label.setDepth(90);

    this.hpBarBg = this.scene.add.graphics({ x: WORLD_WIDTH / 2 - 300, y: 148 });
    this.hpBarBg.fillStyle(0x2a0808, 0.9).fillRoundedRect(0, 0, 600, 16, 6);
    this.hpBarBg.setDepth(90);

    this.hpBarFill = this.scene.add.graphics({ x: WORLD_WIDTH / 2 - 300, y: 148 });
    this.hpBarFill.setDepth(91);
    this.redrawBossHp();
  }

  private hpDisplayFrac = 1;
  private redrawBossHp(): void {
    const target = Math.max(0, this.hp / this.spec.maxHp);
    // Smooth tween from current displayed frac to target — feels weighty.
    this.scene.tweens.add({
      targets: this,
      hpDisplayFrac: target,
      duration: 260,
      ease: 'Cubic.out',
      onUpdate: () => {
        this.hpBarFill
          .clear()
          .fillStyle(0xc23b3b, 1)
          .fillRoundedRect(0, 0, 600 * this.hpDisplayFrac, 16, 6);
      },
    });
  }

  override takeDamage(damage: number, armorPierce: number, isCrit: boolean): number {
    const taken = super.takeDamage(damage, armorPierce, isCrit);
    this.redrawBossHp();
    // Phase transition.
    if (this.phase === 1 && this.hp <= 20) {
      this.phase = 2;
      this.onPhase2();
    }
    return taken;
  }

  private onPhase2(): void {
    // Tighter cannon cadence + visual tilt.
    this.broadsideTimerMs = 1500;
    this.container.setRotation(0.12); // slight tilt
    this.scene.tweens.add({
      targets: this.label,
      scale: { from: 1, to: 1.2 },
      yoyo: true,
      duration: 300,
    });
    // Label flash.
    this.label.setText("PHASE 2 — 'Last Stand'");
    this.scene.time.delayedCall(1500, () => {
      this.label.setText("HMS THUNDERSTRIKE — Frigate Captain");
    });
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;

    // Drift between anchor positions.
    this.setPos(this.x + this.anchorDirection * 30 * dt, this.anchorY);
    if (this.x > WORLD_WIDTH - 200) this.anchorDirection = -1;
    if (this.x < 200) this.anchorDirection = 1;

    // Broadside timer.
    this.broadsideTimerMs -= deltaMs;
    if (this.broadsideTimerMs <= 0) {
      const side: 'port' | 'starboard' = Math.random() < 0.5 ? 'port' : 'starboard';
      this.fireBroadside(side);
      this.broadsideTimerMs = this.phase === 1 ? 3000 : this.hp < 10 ? 800 : 1500;
    }

    // Flare / summon timer (phase 1 summons skiffs; phase 2 summons gunboats).
    this.flareTimerMs -= deltaMs;
    if (this.flareTimerMs <= 0) {
      if (this.phase === 1) {
        this.summonSkiffs(3);
        this.flareTimerMs = 8000;
      } else {
        this.scene.enemies.spawn('patrol-gunboat', this.x + (Math.random() * 200 - 100), this.y + 60);
        this.flareTimerMs = 12000;
      }
    }
  }

  /** Counter for periodic radial bursts in phase 2. */
  private burstShotCounter = 0;

  private fireBroadside(side: 'port' | 'starboard'): void {
    const sign = side === 'port' ? -1 : 1;
    const player = this.scene.player;
    const speed = 450;
    // Lead-aim at the player's predicted position.
    const ox = sign * 45;
    const oy = 0;
    const ang = leadAimAngle(this.x + ox, this.y + oy, { x: player.x, y: player.y, vx: player.vx, vy: player.vy }, speed);

    // 5-bullet symmetric fan from the broadside row — geometric wedge.
    fanSpread(this.scene, this.x + ox, this.y + oy, ang, {
      bullets: 5,
      spreadDeg: 28,
      speed,
      damage: 2,
    });
    // Per-cannon muzzle flashes along the row.
    for (let i = 0; i < 5; i++) {
      this.scene.fx.muzzleFlash(this.x + ox, this.y - 30 + i * 15, 0xffb050);
    }

    // Phase 2: every 3rd shot, follow the broadside with a 360° radial burst.
    if (this.phase === 2) {
      this.burstShotCounter += 1;
      if (this.burstShotCounter % 3 === 0) {
        const seed = (this.burstShotCounter * 0.32) % (Math.PI * 2);
        radialBurst(this.scene, this.x, this.y, {
          bullets: 12,
          speed: 280,
          damage: 2,
          angleOffsetRad: seed,
        });
        this.scene.fx.explosion(this.x, this.y, 90, 0xff8a3a);
      }
    }

    // Recoil — squash-and-stretch on the body + camera shake.
    this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: 1.08, to: 1 },
      scaleY: { from: 0.94, to: 1 },
      duration: 180,
      ease: 'Cubic.out',
    });
    this.scene.cameras.main.shake(120, 0.004);
    this.scene.audio.sfxCannon();
  }

  private summonSkiffs(count: number): void {
    for (let i = 0; i < count; i++) {
      const x = this.x + (Math.random() * 300 - 150);
      const y = this.y + 80;
      this.scene.enemies.spawn('scout-skiff', x, y);
    }
    // Flare visual.
    const flare = this.scene.add.circle(this.x, this.y - 60, 18, 0xffd700, 1);
    flare.setDepth(60);
    this.scene.tweens.add({
      targets: flare,
      scale: { from: 1, to: 6 },
      alpha: { from: 1, to: 0 },
      duration: 800,
      onComplete: () => flare.destroy(),
    });
  }

  override kill(): void {
    // Banner cleanup.
    this.label.destroy();
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();

    for (let i = 0; i < 6; i++) this.scene.pickups.spawnGem(this.x, this.y);
    this.scene.pickups.spawnCoins(this.x, this.y, 6, 'large');

    // Drop a Shipwright Chest for evolution trigger.
    this.scene.shipwright.add(new ShipwrightChest(this.scene, this.x, this.y - 60));

    super.kill();
  }
}
