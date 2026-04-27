import Phaser from 'phaser';
import { Enemy } from '../enemy';
import type { StageScene } from '../../scenes/stage-scene';
import { WORLD_WIDTH } from '../../constants';
import { ShipwrightChest } from '../../systems/evolution-chest';
import { fanSpread, leadAimAngle, parametricSpiral, fireFromPoints } from '../../systems/firing-patterns';
import { getEnemySpec } from '../../content/active-pack';

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
type BossPhase = 1 | 2;

export class FrigateCaptain extends Enemy {
  private phase: BossPhase = 1;
  // PRD 1 — five attacks rotating on independent timers, originating
  // from distinct weapon points on the boss sprite. P1 has 3, P2 adds
  // 2 more (spinning spiral + split-aim wedge).
  private salvoCrossTimerMs = 2400;   // P1 — port + starboard fans
  private bowVolleyTimerMs = 4000;    // P1 — 3-bullet bow arrow
  private sternMortarTimerMs = 6000;  // P1 — single arcing shot from stern
  private spinningSpiralTimerMs = 3500; // P2 only — 4-armed spiral
  private splitWedgeTimerMs = 2000;   // P2 only — twin-wedge ±25° around player
  private spiralPhase = 0;
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
    super(scene, getEnemySpec('frigate-captain'), x, y);
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
    // Tighter cadence + visual tilt + new spinning + split-wedge attacks.
    this.salvoCrossTimerMs = 1800;
    this.bowVolleyTimerMs = 3000;
    this.sternMortarTimerMs = 5000;
    this.spinningSpiralTimerMs = 3500;
    this.splitWedgeTimerMs = 2000;
    this.container.setRotation(0.12);
    this.scene.tweens.add({
      targets: this.label,
      scale: { from: 1, to: 1.2 },
      yoyo: true,
      duration: 300,
    });
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

    // PRD 1 — five attacks on independent timers. Each fires from a
    // distinct weapon point so the player sees gun positions light up
    // around the boss in any 10-second window.
    this.salvoCrossTimerMs -= deltaMs;
    if (this.salvoCrossTimerMs <= 0) {
      this.fireSalvoCross();
      this.salvoCrossTimerMs = this.phase === 1 ? 2400 : this.hp < 10 ? 1100 : 1800;
    }
    this.bowVolleyTimerMs -= deltaMs;
    if (this.bowVolleyTimerMs <= 0) {
      this.fireBowVolley();
      this.bowVolleyTimerMs = this.phase === 1 ? 4000 : 3000;
    }
    this.sternMortarTimerMs -= deltaMs;
    if (this.sternMortarTimerMs <= 0) {
      this.fireSternMortar();
      this.sternMortarTimerMs = this.phase === 1 ? 6000 : 5000;
    }
    if (this.phase === 2) {
      this.spinningSpiralTimerMs -= deltaMs;
      if (this.spinningSpiralTimerMs <= 0) {
        this.fireSpinningSpiral();
        this.spinningSpiralTimerMs = 3500;
      }
      this.splitWedgeTimerMs -= deltaMs;
      if (this.splitWedgeTimerMs <= 0) {
        this.fireSplitWedge();
        this.splitWedgeTimerMs = 2000;
      }
    }

    // Flare / summon timer (preserved from before).
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

  // ────────────────────────────────────────────────────────────────
  // Attack 1 (P1+P2): Salvo Cross — port + starboard fans, lead-aimed.
  // Fires from BOTH flank-cannon clusters simultaneously, so the player
  // sees two muzzle banks light up. 5 bullets / side, 28° wedge, 2 dmg.
  // ────────────────────────────────────────────────────────────────
  private fireSalvoCross(): void {
    const player = this.scene.player;
    const speed = 450;
    fireFromPoints({ x: this.x, y: this.y }, [[-50, -10], [50, -10]] as const, (px, py) => {
      const ang = leadAimAngle(px, py,
        { x: player.x, y: player.y, vx: player.vx, vy: player.vy }, speed);
      fanSpread(this.scene, px, py, ang, {
        bullets: 5, spreadDeg: 28, speed, damage: 2,
      }, 'frigate-captain', 'cannon');
      this.scene.fx.muzzleFlash(px, py, 0xffb050);
    });
    this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: 1.06, to: 1 },
      scaleY: { from: 0.96, to: 1 },
      duration: 160,
      ease: 'Cubic.out',
    });
    this.scene.audio.sfxCannon();
  }

  // ────────────────────────────────────────────────────────────────
  // Attack 2 (P1+P2): Bow Volley — 3-bullet arrow shot from bow tip.
  // Aimed straight at player. Faster than salvo (550 px/s).
  // ────────────────────────────────────────────────────────────────
  private fireBowVolley(): void {
    const bx = this.x;
    const by = this.y - 90;
    const player = this.scene.player;
    const speed = 550;
    const ang = leadAimAngle(bx, by,
      { x: player.x, y: player.y, vx: player.vx, vy: player.vy }, speed);
    fanSpread(this.scene, bx, by, ang, {
      bullets: 3, spreadDeg: 16, speed, damage: 2,
    }, 'frigate-captain', 'sniper');
    this.scene.fx.muzzleFlash(bx, by, 0xffd060);
  }

  // ────────────────────────────────────────────────────────────────
  // Attack 3 (P1+P2): Stern Mortar — slow heavy shot from stern with
  // ground-target telegraph. 1 bullet, 4 dmg. Fires from (0, +80).
  // ────────────────────────────────────────────────────────────────
  private fireSternMortar(): void {
    const sx = this.x;
    const sy = this.y + 80;
    const player = this.scene.player;
    // Predict where player will be in ~1.0 s — that's the impact point.
    const tx = player.x + player.vx * 1.0;
    const ty = player.y + player.vy * 1.0;
    // Telegraph ring at landing zone — 800 ms warning.
    const ring = this.scene.add.circle(tx, ty, 50, 0xff5028, 0)
      .setStrokeStyle(3, 0xff5028, 0.85);
    ring.setDepth(3);
    this.scene.tweens.add({
      targets: ring,
      alpha: { from: 0.2, to: 0.85 },
      yoyo: true,
      duration: 400,
      repeat: 0,
      onComplete: () => ring.destroy(),
    });
    // After telegraph, fire the actual shot.
    this.scene.time.delayedCall(800, () => {
      if (!this.active) return;
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 420;
      this.scene.enemies.spawnEnemyBullet(sx, sy,
        (dx / len) * speed, (dy / len) * speed,
        4, 'frigate-captain', 'fire');
    });
    this.scene.fx.muzzleFlash(sx, sy, 0xff7028);
  }

  // ────────────────────────────────────────────────────────────────
  // Attack 4 (P2 only): Spinning Spiral — 4-armed parametric spiral
  // from boss center. Each burst rotates the seed 60° so the spiral
  // visibly spins between bursts. 16 bullets total per burst.
  // ────────────────────────────────────────────────────────────────
  private fireSpinningSpiral(): void {
    parametricSpiral(this.scene, this.x, this.y, {
      bulletsPerArm: 4,
      arms: 4,
      startAngle: this.spiralPhase,
      armSpacingRad: 0.18,
      speed: 280,
      damage: 2,
      bulletKind: 'storm',
      source: 'frigate-captain',
    });
    this.spiralPhase += Math.PI / 3; // 60° rotation per burst
    this.scene.fx.explosion(this.x, this.y, 70, 0xaaccff);
  }

  // ────────────────────────────────────────────────────────────────
  // Attack 5 (P2 only): Split-Aim Wedge — twin 7-bullet wedges fired
  // from bow tip, one biased ±25° left of player vector and one ±25°
  // right. Forces the player to dodge sideways AND not park on
  // either side of center.
  // ────────────────────────────────────────────────────────────────
  private fireSplitWedge(): void {
    const bx = this.x;
    const by = this.y - 90;
    const player = this.scene.player;
    const speed = 380;
    const baseAng = leadAimAngle(bx, by,
      { x: player.x, y: player.y, vx: player.vx, vy: player.vy }, speed);
    const splitOff = (25 * Math.PI) / 180; // 25° offset
    for (const off of [-splitOff, splitOff]) {
      fanSpread(this.scene, bx, by, baseAng + off, {
        bullets: 7, spreadDeg: 50, speed, damage: 2,
      }, 'frigate-captain', 'cannon');
    }
    this.scene.fx.muzzleFlash(bx, by, 0xffe0a0);
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
