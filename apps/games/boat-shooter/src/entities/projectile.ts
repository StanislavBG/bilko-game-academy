import Phaser from 'phaser';

/**
 * Projectile entity. Lives in an object pool managed by the WeaponSystem.
 *
 * Player weapons don't render as flat circles anymore — each projectile
 * is a cannonball-style two-tone disk (dark outline + highlighted core)
 * with a faint motion trail, so the player fire reads as "cannon shot"
 * rather than "bullet". Only enemy muskets still render as small flat dots.
 */
/**
 * Visual style for a projectile. Each style gets a distinct silhouette +
 * trail so the player can parse what each equipped weapon is doing at a
 * glance. `cannonball` is the default — legacy callers omit `style` and
 * get the original look.
 */
export type ProjectileStyle =
  | 'cannonball'
  | 'broadside-shell'
  | 'harpoon'
  | 'musket-ball'
  | 'lightning-orb';

export interface ProjectileSpawn {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: number; // 0 = 1 hit and die; 1 = 1 additional pass-through; etc.
  ttlMs: number;
  radius: number;
  color: number;
  weaponId: string;
  isCrit: boolean;
  style?: ProjectileStyle;
}

/**
 * Cool-family glow tints per projectile style. 2026 arcade shmup
 * convention: enemy bullets are hot (red/orange — see enemy-system.ts);
 * player bullets are cool + bright (white / cyan / pale blue) with an
 * additive glow halo behind the core. Reference: DoDonPachi, Ikaruga,
 * Touhou, Mushihimesama — all follow this palette split for readability.
 */
const PLAYER_GLOW_TINT: Record<ProjectileStyle, number> = {
  cannonball:       0xe0f0ff,  // cool white
  'broadside-shell':0xffd880,  // warm gold — exception: broadside is flank-cannon, hot is the weapon's identity
  harpoon:          0xffffff,  // pure white
  'musket-ball':    0xffffff,  // unused for player, kept for exhaustiveness
  'lightning-orb':  0xaaeeff,  // bright cyan
};

export class Projectile {
  readonly container: Phaser.GameObjects.Container;
  /** Additive-blend halo sitting BEHIND the core so player bullets pop
   *  against the teal water. Tint + radius set per-style on spawn. */
  readonly glow: Phaser.GameObjects.Arc;
  readonly body: Phaser.GameObjects.Arc;
  readonly core: Phaser.GameObjects.Arc;
  readonly highlight: Phaser.GameObjects.Arc;
  /** Optional shaft graphic for harpoons — null for other styles. */
  private shaft?: Phaser.GameObjects.Rectangle;
  /** Outer halo for lightning orbs. */
  private halo?: Phaser.GameObjects.Arc;
  /**
   * AI-generated painterly sprite — preferred render path when a
   * `sprite-proj-<style>` texture is available. Falls back to the
   * primitive circles when missing (plan §3 Batch C).
   */
  private spriteImg?: Phaser.GameObjects.Image;
  private trailInterval = 0;
  private currentStyle: ProjectileStyle = 'cannonball';

  vx = 0;
  vy = 0;
  damage = 0;
  pierceRemaining = 0;
  ttlMs = 0;
  radius = 8;
  weaponId = '';
  isCrit = false;
  active = false;
  style: ProjectileStyle = 'cannonball';

  readonly alreadyHit = new Set<number>();
  private readonly scene: import('../scenes/stage-scene').StageScene;

  constructor(scene: import('../scenes/stage-scene').StageScene) {
    this.scene = scene;
    // Layered visual: glow halo (back) → dark shell → colored core → highlight.
    // The glow is additive-blended so every player bullet is readable against
    // the teal water — matches the treatment enemy bullets got in doc 27.
    this.glow = scene.add.circle(0, 0, 20, 0xe0f0ff, 0.55);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    this.body = scene.add.circle(0, 0, 8, 0x1a1a1a, 1);
    this.core = scene.add.circle(0, 0, 7, 0xffffff, 1);
    this.highlight = scene.add.circle(-2, -2, 3, 0xffffff, 0.9);
    this.container = scene.add.container(
      -1000, -1000,
      [this.glow, this.body, this.core, this.highlight],
    );
    this.container.setDepth(10);
    this.container.setVisible(false);
  }

  get sprite(): Phaser.GameObjects.Container { return this.container; }

  spawn(s: ProjectileSpawn): void {
    this.active = true;
    this.alreadyHit.clear();
    this.vx = s.vx;
    this.vy = s.vy;
    this.damage = s.damage;
    this.pierceRemaining = s.pierce;
    this.ttlMs = s.ttlMs;
    this.radius = s.radius;
    this.weaponId = s.weaponId;
    this.isCrit = s.isCrit;
    this.style = s.style ?? 'cannonball';
    this.trailInterval = 0;

    // Rebuild style-specific parts only when the style actually changes.
    if (this.currentStyle !== this.style) {
      this.teardownStyleExtras();
      this.currentStyle = this.style;
    }

    this.applyStyleVisual(s);

    // Refresh glow halo per spawn — sized 2.4× the bullet radius so the
    // halo reads as ambient light around the projectile, not a second body.
    // Musket-ball (enemy fallback style) stays dimmer; every player style
    // gets full-bright additive glow for readability.
    const glowTint = PLAYER_GLOW_TINT[this.style] ?? 0xffffff;
    const glowAlpha = this.style === 'musket-ball' ? 0.25 : 0.6;
    this.glow.setRadius(s.radius * 2.4);
    this.glow.setFillStyle(glowTint, glowAlpha);
    this.glow.setVisible(true);

    this.container.setPosition(s.x, s.y);
    this.container.setScale(0.6);
    this.container.setVisible(true);
    // Quick pop-in so it feels launched.
    this.scene.tweens.add({ targets: this.container, scale: 1, duration: 90, ease: 'Back.out' });
  }

  private teardownStyleExtras(): void {
    if (this.shaft) { this.shaft.destroy(); delete this.shaft; }
    if (this.halo) { this.halo.destroy(); delete this.halo; }
    if (this.spriteImg) { this.spriteImg.destroy(); delete this.spriteImg; }
    this.container.rotation = 0;
  }

  /**
   * Pick the painterly AI sprite for this style if it's loaded.
   * Each batch-C PNG is keyed `sprite-proj-<style>` (see sprite-loader.ts).
   * Returns false when no sprite is present → caller renders primitives.
   */
  private tryApplySpriteVisual(s: ProjectileSpawn): boolean {
    const key = `sprite-proj-${this.style}`;
    if (!this.scene.textures.exists(key)) return false;
    if (!this.spriteImg) {
      this.spriteImg = this.scene.add.image(0, 0, key);
      // Insert at index 0 so primitives (if any leak through) overlay it.
      this.container.addAt(this.spriteImg, 0);
    } else {
      this.spriteImg.setTexture(key);
    }
    // Source PNGs are 1024² with a lot of margin; fit diameter ≈ 2.6 × radius.
    // Target diameter in px = r * 2.6. Scale = target / native.
    const native = this.spriteImg.width || 1024;
    const targetDiameter = Math.max(16, s.radius * 2.6);
    this.spriteImg.setScale(targetDiameter / native);
    this.spriteImg.setOrigin(0.5, 0.5);

    // Hide the primitive layers so they don't double-draw under the sprite.
    this.body.setVisible(false);
    this.core.setVisible(false);
    this.highlight.setVisible(false);

    // Rotate to point along velocity; projectile sprite source is authored
    // side-aligned pointing right (+X), so atan2(vy, vx) maps velocity → angle.
    this.container.rotation = Math.atan2(s.vy, s.vx);

    // Additive blend for glowy projectiles helps them pop on dark water.
    if (this.style === 'lightning-orb' || this.style === 'broadside-shell') {
      this.spriteImg.setBlendMode(Phaser.BlendModes.ADD);
    } else {
      this.spriteImg.setBlendMode(Phaser.BlendModes.NORMAL);
    }
    return true;
  }

  private applyStyleVisual(s: ProjectileSpawn): void {
    // Prefer the AI painterly sprite when it exists (plan §5.3a). Primitive
    // path is left intact below as a graceful fallback so the game still
    // plays if Gemini hasn't generated a sprite for a style yet.
    if (this.tryApplySpriteVisual(s)) return;
    // Re-show primitives in case a previous spawn of the same pool slot used
    // the sprite path.
    this.body.setVisible(true);
    this.core.setVisible(true);
    this.highlight.setVisible(true);
    const r = s.radius;
    switch (this.style) {
      case 'broadside-shell':
        // Elongated warm ember shell; core is red-brown hot metal.
        this.body.setRadius(r + 1).setFillStyle(0x1a1004, 1);
        this.core.setRadius(r).setFillStyle(0xd65020, 1);
        this.highlight.setRadius(Math.max(2, r * 0.35)).setFillStyle(0xffe090, 0.9);
        this.highlight.setPosition(-r * 0.35, -r * 0.35);
        // Align along velocity by stretching the container.
        this.container.setScale(1.25, 0.8);
        // Rotate container so the stretch lines up with flight direction.
        this.container.rotation = Math.atan2(s.vy, s.vx);
        break;

      case 'harpoon': {
        // Thin wooden shaft (long axis = direction of travel).
        if (!this.shaft) {
          this.shaft = this.scene.add.rectangle(0, 0, 32, 3, 0xd8deea, 1);
          this.shaft.setStrokeStyle(0.5, 0x2a1a10, 1);
          this.container.add(this.shaft);
        }
        this.shaft.setSize(32, 3);
        this.body.setRadius(r).setFillStyle(0x2a1a10, 1);
        this.core.setRadius(r - 1).setFillStyle(0x8a5a2a, 1);
        this.highlight.setRadius(2).setFillStyle(0xffffff, 0.6);
        this.highlight.setPosition(-2, -1);
        this.container.rotation = Math.atan2(s.vy, s.vx);
        break;
      }

      case 'musket-ball':
        // Small flat enemy bullet — no highlight.
        this.body.setRadius(r + 1).setFillStyle(0x202020, 1);
        this.core.setRadius(r).setFillStyle(s.color ?? 0xffffff, 1);
        this.highlight.setRadius(0.5).setFillStyle(0xffffff, 0);
        break;

      case 'lightning-orb': {
        if (!this.halo) {
          this.halo = this.scene.add.circle(0, 0, r * 2, 0x8ff0ff, 0.35);
          this.halo.setBlendMode(Phaser.BlendModes.ADD);
          this.container.addAt(this.halo, 0);
        }
        this.halo.setRadius(r * 2).setFillStyle(0x8ff0ff, 0.35);
        this.body.setRadius(r + 1).setFillStyle(0xffffff, 1);
        this.core.setRadius(r).setFillStyle(0xe0f8ff, 1);
        this.highlight.setRadius(Math.max(2, r * 0.4)).setFillStyle(0xffffff, 0.95);
        this.highlight.setPosition(-r * 0.2, -r * 0.2);
        // Flicker.
        this.scene.tweens.add({
          targets: this.halo,
          scale: { from: 0.9, to: 1.15 },
          duration: 100,
          yoyo: true,
          repeat: -1,
        });
        break;
      }

      case 'cannonball':
      default:
        // Default two-tone iron sphere (legacy look).
        this.body.setRadius(r + 1).setFillStyle(0x1a1a1a, 1);
        this.core.setRadius(r).setFillStyle(s.color, 1);
        this.highlight.setRadius(Math.max(2, r * 0.35)).setFillStyle(0xffffff, 0.85);
        this.highlight.setPosition(-r * 0.35, -r * 0.35);
        break;
    }
  }

  despawn(): void {
    this.active = false;
    this.container.setVisible(false);
    this.container.setPosition(-1000, -1000);
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    const dt = deltaMs / 1000;
    this.container.x += this.vx * dt;
    this.container.y += this.vy * dt;
    this.ttlMs -= deltaMs;

    // Emit a style-appropriate trail dot at a fixed cadence.
    this.trailInterval += deltaMs;
    // Trail cadence bumped 40 → 80 ms — halves the per-frame trail
    // emission rate. With the shared FX trail emitter this is mostly
    // about visual aesthetic; perf cost is already O(1).
    if (this.trailInterval >= 80) {
      this.trailInterval = 0;
      this.emitTrailDot();
    }

    if (this.ttlMs <= 0) this.despawn();
  }

  /**
   * Per-style trail dot — routed through the shared `fx.trailDot`
   * particle emitter. Was: a brand-new `scene.add.circle` + Tween every
   * 40 ms per active projectile (≈25 GameObject + Tween allocs/sec each;
   * with 50 active projectiles that was 1250 allocs/sec). Now: O(1)
   * `emitParticleAt` on a shared pooled emitter.
   */
  private emitTrailDot(): void {
    let tint = 0x808080;
    let scale = 0.6;
    switch (this.style) {
      case 'broadside-shell': tint = 0xff6a20; scale = 0.7; break;
      case 'harpoon':         tint = 0x8a7a50; scale = 0.4; break;
      case 'musket-ball':     tint = 0x808080; scale = 0.4; break;
      case 'lightning-orb':   tint = 0xd0f6ff; scale = 0.8; break;
      case 'cannonball':
      default:                tint = 0xa0c0ff; scale = 0.55; break;
    }
    this.scene.fx.trailDot(this.container.x, this.container.y, {
      tint, scale, lifespan: 220,
    });
  }
}

/** Simple growable pool with a soft cap. */
export class ProjectilePool {
  private free: Projectile[] = [];
  private all: Projectile[] = [];
  private readonly scene: import('../scenes/stage-scene').StageScene;

  constructor(scene: import('../scenes/stage-scene').StageScene, preallocate = 64) {
    this.scene = scene;
    for (let i = 0; i < preallocate; i++) this.grow();
  }

  private grow(): Projectile {
    const p = new Projectile(this.scene);
    this.free.push(p);
    this.all.push(p);
    return p;
  }

  acquire(): Projectile {
    return this.free.pop() ?? this.grow();
  }

  release(p: Projectile): void {
    if (!p.active) return;
    p.despawn();
    this.free.push(p);
  }

  /** Iterate active projectiles. */
  forEachActive(fn: (p: Projectile) => void): void {
    for (let i = 0; i < this.all.length; i++) {
      const p = this.all[i]!;
      if (p.active) fn(p);
    }
  }

  reapInactive(): void {
    for (const p of this.all) {
      if (!p.active && !this.free.includes(p)) this.free.push(p);
    }
  }
}
