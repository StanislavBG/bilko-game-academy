import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { WORLD_HEIGHT, RIVER_SCROLL_SPEED } from '../constants';

/**
 * Environmental hazards — rocks (damage on collision) + destructible barrels
 * (shoot for loot). Both drift down the screen at river-scroll speed.
 *
 * For P7 we keep it minimal: rocks don't stop projectiles (they don't need
 * to be shootable to feel real). Barrels drop coins on destruction.
 */

interface Rock {
  // Either the procedural Container (primitive path) or an Image (AI sprite).
  sprite: Phaser.GameObjects.Container | Phaser.GameObjects.Image;
  /** Separate pulsing "DANGER" rim — red outline + warning badge so the
   *  player can tell hostile terrain apart from destructible barrels. */
  dangerMarker: Phaser.GameObjects.Container;
  x: number;
  y: number;
  radius: number;
  lastHitMs: number;
  active: boolean;
}

interface Barrel {
  // Rectangle fallback or AI sprite image — both respond to setPosition/destroy.
  sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  /** Soft gold "lootable" marker — distinguishes barrels from hazard rocks. */
  lootMarker: Phaser.GameObjects.Container;
  x: number;
  y: number;
  hp: number;
  active: boolean;
}

export class HazardSystem {
  readonly rocks: Rock[] = [];
  readonly barrels: Barrel[] = [];

  constructor(private readonly scene: StageScene) {}

  spawnRock(x: number, y: number, radius = 50): void {
    // Prefer the AI painterly hazard sprite (plan §3 Batch E). Use
    // `hazard-rock-large` for radius ≥ 50, otherwise `hazard-rock-small`.
    const aiKey = radius >= 50 ? 'sprite-hazard-rock-large' : 'sprite-hazard-rock-small';
    if (this.scene.textures.exists(aiKey)) {
      const img = this.scene.add.image(x, y, aiKey);
      const nativeW = img.width || 1024;
      // Source sprite's silhouette is ~70% of the PNG; over-scale so the
      // in-game physical radius matches collision radius.
      img.setScale((radius * 2.4) / nativeW);
      img.setDepth(-10);
      const dangerMarker = this.makeDangerMarker(x, y, radius);
      this.rocks.push({ sprite: img, dangerMarker, x, y, radius, lastHitMs: 0, active: true });
      return;
    }
    // Fallback — procedural layered Container rock.
    const c = this.scene.add.container(x, y);
    c.setDepth(-10);

    const wash = this.scene.add.ellipse(0, radius * 0.6, radius * 2.6, radius * 0.7, 0xffffff, 0.18);
    c.add(wash);
    const wash2 = this.scene.add.ellipse(0, radius * 0.55, radius * 2.0, radius * 0.45, 0xffffff, 0.28);
    c.add(wash2);

    const g = this.scene.add.graphics();
    g.fillStyle(0x3a3328, 1).fillCircle(0, 0, radius);
    g.fillStyle(0x2a2418, 1).fillCircle(radius * 0.25, radius * 0.2, radius * 0.7);
    g.fillStyle(0x4a4234, 1).fillCircle(-radius * 0.3, -radius * 0.25, radius * 0.5);
    g.fillStyle(0x2a201a, 1).fillCircle(radius * 0.4, -radius * 0.3, radius * 0.28);
    g.fillStyle(0x5a6a3a, 0.85).fillCircle(-radius * 0.45, -radius * 0.35, radius * 0.25);
    g.fillStyle(0x6a7a48, 0.6).fillCircle(-radius * 0.5, -radius * 0.45, radius * 0.16);
    g.fillStyle(0x8a3a3a, 0.55).fillCircle(radius * 0.55, radius * 0.05, radius * 0.12);
    g.fillStyle(0xffffff, 0.18).fillCircle(-radius * 0.55, -radius * 0.55, radius * 0.18);
    g.lineStyle(2, 0x1a1410, 0.85).strokeCircle(0, 0, radius);
    c.add(g);

    const dangerMarker = this.makeDangerMarker(x, y, radius);
    this.rocks.push({ sprite: c, dangerMarker, x, y, radius, lastHitMs: 0, active: true });
  }

  /**
   * Danger marker — a pulsing red rim + small warning triangle badge at
   * the top-left of the rock. Clearly distinguishes hostile terrain from
   * destructible barrels (which are friendly / lootable). Rendered in its
   * own container so it can pulse independently of the rock's position
   * tween + scroll.
   */
  private makeDangerMarker(
    x: number, y: number, radius: number,
  ): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y);
    c.setDepth(-9); // above the rock (which sits at -10), below gameplay.

    // Outer glow ring — fades in + out so the rock "breathes" red.
    const glow = this.scene.add.circle(0, 0, radius + 4, 0xff3a2a, 0);
    glow.setStrokeStyle(3, 0xff3a2a, 0.75);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    c.add(glow);

    // Inner dashed rim — always-on crisp red outline.
    const rim = this.scene.add.graphics();
    rim.lineStyle(1.5, 0xff5a3a, 0.85);
    const segments = 18;
    for (let i = 0; i < segments; i++) {
      if (i % 2 === 0) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        rim.beginPath();
        rim.arc(0, 0, radius + 1, a0, a1, false);
        rim.strokePath();
      }
    }
    c.add(rim);

    // Warning triangle badge at the top-left of the rock.
    const badgeSize = Math.max(10, radius * 0.35);
    const badgeX = -radius * 0.55;
    const badgeY = -radius * 0.55;
    const badge = this.scene.add.polygon(
      badgeX, badgeY,
      [0, -badgeSize, badgeSize * 0.86, badgeSize * 0.5, -badgeSize * 0.86, badgeSize * 0.5],
      0xffd85a, 1,
    ).setStrokeStyle(1.5, 0x2a1408, 1);
    c.add(badge);
    // Exclamation mark.
    const bang = this.scene.add.text(badgeX, badgeY - 2, '!', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: `${Math.round(badgeSize * 1.3)}px`,
      color: '#1a0a04',
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);
    c.add(bang);

    // Pulse — outer glow breathes from 0 to 0.85 alpha.
    if (!this.scene.fx.reducedMotion()) {
      this.scene.tweens.add({
        targets: glow,
        alpha: { from: 0.25, to: 0.85 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    } else {
      glow.setAlpha(0.55);
    }

    return c;
  }

  spawnBarrel(x: number, y: number): void {
    const aiKey = 'sprite-hazard-barrel';
    let sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
    if (this.scene.textures.exists(aiKey)) {
      const img = this.scene.add.image(x, y, aiKey);
      const nativeW = img.width || 1024;
      img.setScale(52 / nativeW);
      img.setDepth(-5);
      sprite = img;
    } else {
      const rect = this.scene.add.rectangle(x, y, 32, 44, 0x8b5a2b, 1);
      rect.setStrokeStyle(2, 0x3a2410, 0.9);
      rect.setDepth(-5);
      sprite = rect;
    }
    const lootMarker = this.makeLootMarker(x, y);
    this.barrels.push({ sprite, lootMarker, x, y, hp: 2, active: true });
  }

  /**
   * Loot marker — soft gold glow + tiny "$" badge. Signals "shoot this for
   * coins" so players don't treat barrels like hazard rocks. Lives in its
   * own container alongside the barrel sprite.
   */
  private makeLootMarker(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y);
    c.setDepth(-4);
    const glow = this.scene.add.circle(0, 0, 24, 0xffd85a, 0.22);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    c.add(glow);
    // Small coin icon hovering above the barrel.
    const coinBg = this.scene.add.circle(0, -32, 6, 0xffd85a, 1)
      .setStrokeStyle(1, 0x7a5a18, 1);
    c.add(coinBg);
    const coinLabel = this.scene.add.text(0, -32, '$', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '12px',
      color: '#3a2410',
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5);
    c.add(coinLabel);
    if (!this.scene.fx.reducedMotion()) {
      this.scene.tweens.add({
        targets: glow,
        alpha: { from: 0.12, to: 0.32 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.scene.tweens.add({
        targets: [coinBg, coinLabel],
        y: '-=3',
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
    return c;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const scrollPx = RIVER_SCROLL_SPEED * dt;

    // Rocks: drift down; damage player on collision.
    const player = this.scene.player;
    for (const r of this.rocks) {
      if (!r.active) continue;
      r.y += scrollPx;
      r.sprite.setPosition(r.x, r.y);
      r.dangerMarker.setPosition(r.x, r.y);
      if (r.y > WORLD_HEIGHT + 80) {
        r.active = false;
        r.sprite.destroy();
        r.dangerMarker.destroy();
        continue;
      }
      const dx = player.x - r.x;
      const dy = player.y - r.y;
      const minDist = r.radius + player.radius;
      if (dx * dx + dy * dy <= minDist * minDist) {
        const now = this.scene.time.now;
        if (now - r.lastHitMs > 1000) {
          r.lastHitMs = now;
          player.takeDamage(2, { source: 'rock', type: 'contact' });
          // Small splash + push player away.
          this.scene.fx.splash(player.x, player.y);
        }
      }
    }

    // Barrels: drift down; take projectile damage; drop on destroy.
    for (const b of this.barrels) {
      if (!b.active) continue;
      b.y += scrollPx;
      b.sprite.setPosition(b.x, b.y);
      b.lootMarker.setPosition(b.x, b.y);
      if (b.y > WORLD_HEIGHT + 80) {
        b.active = false;
        b.sprite.destroy();
        b.lootMarker.destroy();
        continue;
      }
      // Check projectile hits via shared pool.
      this.scene.weapons.projectiles.forEachActive((proj) => {
        if (!b.active) return;
        const dx = proj.sprite.x - b.x;
        const dy = proj.sprite.y - b.y;
        if (dx * dx + dy * dy > 28 * 28) return;
        b.hp -= 1;
        proj.despawn();
        if (b.hp <= 0) this.destroyBarrel(b);
      });
    }
  }

  private destroyBarrel(b: Barrel): void {
    b.active = false;
    this.scene.fx.explosion(b.x, b.y, 60, 0xffa94a);
    this.scene.audio.sfxExplosion();
    this.scene.pickups.spawnCoins(b.x, b.y, 2, 'medium');
    if (Math.random() < 0.2) this.scene.pickups.spawnGem(b.x, b.y);
    b.sprite.destroy();
    b.lootMarker.destroy();
  }

  clear(): void {
    for (const r of this.rocks) {
      if (r.active) {
        r.sprite.destroy();
        r.dangerMarker.destroy();
      }
    }
    for (const b of this.barrels) {
      if (b.active) {
        b.sprite.destroy();
        b.lootMarker.destroy();
      }
    }
    this.rocks.length = 0;
    this.barrels.length = 0;
  }
}
