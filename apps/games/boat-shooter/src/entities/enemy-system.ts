import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { Enemy } from './enemy';
import { ScoutSkiff } from './enemies/scout-skiff';
import { PatrolGunboat } from './enemies/patrol-gunboat';
import { RammingBrigand } from './enemies/ramming-brigand';
import { MortarBarge } from './enemies/mortar-barge';
import { BankSniperTower } from './enemies/bank-sniper-tower';
import { BroadsideCutter } from './enemies/broadside-cutter';
import { GrapplingBoarders } from './enemies/grappling-boarders';
import { PowderKegKamikaze } from './enemies/powder-keg-kamikaze';
import { GhostShip } from './enemies/ghost-ship';
import { SeaSerpent } from './enemies/sea-serpent';
import { KrakenTentacle } from './enemies/kraken-tentacle';
import { CursedSwarm } from './enemies/cursed-swarm';
import { BankBandits } from './enemies/bank-bandits';
import { MineLayer } from './enemies/mine-layer';
import { FrigateCaptain } from './bosses/frigate-captain';
import { PirateChampion } from './bosses/pirate-champion';
import { DeltaCommodore } from './bosses/delta-commodore';
import { PirateKing } from './bosses/pirate-king';
import { GhostCommodore } from './bosses/ghost-commodore';
import { DrownedAdmiralty } from './bosses/drowned-admiralty';
import { ObsidianWarlord } from './bosses/obsidian-warlord';
import { BansheeGalleon } from './bosses/banshee-galleon';
import { KrakenAncient } from './bosses/kraken-ancient';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants';

export type EnemyType =
  | 'scout-skiff'
  | 'patrol-gunboat'
  | 'ramming-brigand'
  | 'mortar-barge'
  | 'bank-sniper-tower'
  | 'broadside-cutter'
  | 'grappling-boarders'
  | 'powder-keg-kamikaze'
  | 'ghost-ship'
  | 'sea-serpent'
  | 'kraken-tentacle'
  | 'cursed-swarm'
  | 'bank-bandits'
  | 'mine-layer'
  | 'frigate-captain'
  | 'pirate-champion'
  | 'delta-commodore'
  | 'pirate-king'
  | 'ghost-commodore'
  | 'drowned-admiralty'
  | 'obsidian-warlord'
  | 'banshee-galleon'
  | 'kraken-ancient';

/**
 * Enemy-bullet damage family — drives which painterly AI sprite renders.
 * `sprite-bullet-<kind>` is loaded by the sprite-loader; absence falls back
 * to a tinted circle at a kind-appropriate color. Doc 27 §3 (arcade-asset
 * research) lists the full palette + reasoning.
 */
export type BulletKind =
  | 'musket' | 'cannon' | 'sniper' | 'shadow'
  | 'venom' | 'fire' | 'frost' | 'storm';

interface EnemyBullet {
  /** Fallback circle — always present, serves as the positional anchor. */
  sprite: Phaser.GameObjects.Arc;
  /** Optional AI-sprite image that renders on top when available. */
  image?: Phaser.GameObjects.Image;
  /** Additive-blend glow halo so bullets pop against the water. */
  glow: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  damage: number;
  ttlMs: number;
  active: boolean;
  kind: BulletKind;
  /** Rolling ms accumulator for tracer-tail emission (doc 27 §3 GAP 5). */
  trailMs: number;
  /** Spec ID of the enemy that fired this bullet. Optional — some AI
   *  paths don't know their source. Used by the combat log for attribution. */
  sourceEnemyId?: string;
}

/**
 * Enemy bullet color family — ALL hot colors (red / orange / flame / gold)
 * so enemy fire is always readable against the teal water and never blends
 * into player FX, hazard rims, or the damage vignette. This is the DoDonPachi
 * "closed chromatic family" rule (doc 27 §2). Variation stays in the sprite
 * silhouette, not in the color — so Ikaruga-style color-coding is preserved
 * even when sprites fail to load.
 */
const BULLET_TINT: Record<BulletKind, number> = {
  musket: 0xffa040,  // warm amber
  cannon: 0xff4028,  // deep red
  sniper: 0xffe060,  // hot gold
  shadow: 0xff5a3a,  // ember red
  venom: 0xff8a20,   // orange
  fire:  0xff6020,   // flame orange
  frost: 0xff8060,   // salmon (hot, not cool)
  storm: 0xffc040,   // electric yellow-orange
};

/**
 * Bullet kinds that emit a tracer trail (doc 27 §3 GAP 5). Musket + cannon
 * stay trail-less — the classic arcade convention for solid projectiles.
 */
const BULLET_TRAIL_KINDS = new Set<BulletKind>([
  'fire', 'frost', 'storm', 'shadow', 'venom', 'sniper',
]);

// (BULLET_TRAIL_BLEND removed — shared trail emitter handles blend uniformly.)

/**
 * Routed through the shared FxSystem trail emitter — ONE pooled emitter
 * vs. brand-new `scene.add.circle` allocations per shot. Each enemy
 * elemental bullet emits at most ~20 trail dots per second (50 ms
 * cadence × ttl), so dozens of bullets at once stay near-zero GC.
 * BULLET_TRAIL_BLEND is unused now that the shared emitter is fixed
 * to ADD blend — kept exported for any future per-kind tuning.
 */
function emitBulletTrail(
  scene: StageScene,
  x: number,
  y: number,
  kind: BulletKind,
): void {
  scene.fx.trailDot(x, y, {
    tint: BULLET_TINT[kind],
    scale: 0.45,
    lifespan: 320,
  });
}

/** Tracks all active enemies; provides spawning + query helpers. */
export class EnemySystem {
  readonly scene: StageScene;
  readonly enemies: Enemy[] = [];

  private bulletPool: EnemyBullet[] = [];

  constructor(scene: StageScene) {
    this.scene = scene;
  }

  spawn(type: EnemyType, x: number, y: number): Enemy | null {
    let e: Enemy;
    switch (type) {
      case 'scout-skiff': e = new ScoutSkiff(this.scene, x, y); break;
      case 'patrol-gunboat': e = new PatrolGunboat(this.scene, x, y); break;
      case 'ramming-brigand': e = new RammingBrigand(this.scene, x, y); break;
      case 'mortar-barge': e = new MortarBarge(this.scene, x, y); break;
      case 'bank-sniper-tower': e = new BankSniperTower(this.scene, x, y); break;
      case 'broadside-cutter': e = new BroadsideCutter(this.scene, x, y); break;
      case 'grappling-boarders': e = new GrapplingBoarders(this.scene, x, y); break;
      case 'powder-keg-kamikaze': e = new PowderKegKamikaze(this.scene, x, y); break;
      case 'ghost-ship': e = new GhostShip(this.scene, x, y); break;
      case 'sea-serpent': e = new SeaSerpent(this.scene, x, y); break;
      case 'kraken-tentacle': e = new KrakenTentacle(this.scene, x, y); break;
      case 'cursed-swarm': e = new CursedSwarm(this.scene, x, y); break;
      case 'bank-bandits': e = new BankBandits(this.scene, x, y); break;
      case 'mine-layer': e = new MineLayer(this.scene, x, y); break;
      case 'frigate-captain': e = new FrigateCaptain(this.scene, x, y); break;
      case 'pirate-champion': e = new PirateChampion(this.scene, x, y); break;
      case 'delta-commodore': e = new DeltaCommodore(this.scene, x, y); break;
      case 'pirate-king': e = new PirateKing(this.scene, x, y); break;
      case 'ghost-commodore': e = new GhostCommodore(this.scene, x, y); break;
      case 'drowned-admiralty': e = new DrownedAdmiralty(this.scene, x, y); break;
      case 'obsidian-warlord': e = new ObsidianWarlord(this.scene, x, y); break;
      case 'banshee-galleon': e = new BansheeGalleon(this.scene, x, y); break;
      case 'kraken-ancient': e = new KrakenAncient(this.scene, x, y); break;
      default: return null;
    }
    this.enemies.push(e);
    // Let the status system wire combat-log hooks onto this enemy.
    this.scene.statuses?.attach(e);
    return e;
  }

  update(deltaMs: number): void {
    // Tick + reap.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      if (!e.active) {
        this.enemies.splice(i, 1);
        continue;
      }
      e.update(deltaMs);
      // Cull off-screen enemies that have drifted far above.
      if (e.y < -200) {
        e.container.destroy();
        e.active = false;
        this.enemies.splice(i, 1);
      }
    }

    // Tick bullets — the circle is the authoritative position carrier;
    // the optional AI image mirrors it so sprite + collision stay aligned.
    const dt = deltaMs / 1000;
    for (const b of this.bulletPool) {
      if (!b.active) continue;
      b.sprite.x += b.vx * dt;
      b.sprite.y += b.vy * dt;
      // Keep the glow halo aligned with the bullet every frame.
      b.glow.setPosition(b.sprite.x, b.sprite.y);
      if (b.image && b.image.visible) {
        b.image.setPosition(b.sprite.x, b.sprite.y);
      }
      // Tracer tail for elemental bullets (doc 27 §3 GAP 5) — emit a
      // fading dot every ~50 ms so the eye tracks the shot's arc. Only
      // for high-energy kinds; physical/musket stays trail-less per
      // the Galaga-era convention.
      b.trailMs += deltaMs;
      if (b.trailMs >= 50 && BULLET_TRAIL_KINDS.has(b.kind)) {
        b.trailMs = 0;
        emitBulletTrail(this.scene, b.sprite.x, b.sprite.y, b.kind);
      }
      b.ttlMs -= deltaMs;
      if (
        b.ttlMs <= 0 ||
        b.sprite.x < -50 ||
        b.sprite.x > WORLD_WIDTH + 50 ||
        b.sprite.y < -50 ||
        b.sprite.y > WORLD_HEIGHT + 50
      ) {
        b.active = false;
        b.sprite.setVisible(false);
        b.glow.setVisible(false);
        if (b.image) b.image.setVisible(false);
      }
    }
  }

  /**
   * Enemy bullets hit the player with a simple damage value.
   * `kind` selects the painterly AI sprite family (doc 27); absent kinds
   * default to `musket`. When the sprite for the chosen kind isn't loaded,
   * the bullet renders as a tinted circle using `BULLET_TINT`.
   */
  spawnEnemyBullet(
    x: number, y: number, vx: number, vy: number, damage: number,
    sourceEnemyId?: string,
    kind: BulletKind = 'musket',
  ): void {
    let bullet = this.bulletPool.find((b) => !b.active);
    if (!bullet) {
      // Larger + outlined so enemy bullets always pop against water.
      // Collision radius on the player side is unaffected (fair hitboxes).
      const sprite = this.scene.add.circle(x, y, 10, 0xff4a3a, 1);
      sprite.setStrokeStyle(2, 0x2a0808);
      sprite.setDepth(9);
      // Additive-blend glow halo — sits BEHIND the core so hot-colored
      // bullets bloom against the teal water. Radius set per-spawn.
      const glow = this.scene.add.circle(x, y, 18, 0xff6020, 0.55);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(8);
      bullet = {
        sprite, glow, vx: 0, vy: 0, damage: 0, ttlMs: 0, active: false,
        kind: 'musket', trailMs: 0,
      };
      this.bulletPool.push(bullet);
    }
    bullet.trailMs = 0;
    // Refresh glow color + position for every spawn; size scales slightly
    // per kind so heavy bullets read as chunkier.
    bullet.glow.setPosition(x, y);
    bullet.glow.setFillStyle(BULLET_TINT[kind], 0.55);
    bullet.glow.setRadius(kind === 'cannon' || kind === 'fire' ? 22 : 18);
    bullet.glow.setVisible(true);
    bullet.sprite.setPosition(x, y);
    bullet.kind = kind;

    const spriteKey = `sprite-bullet-${kind}`;
    if (this.scene.textures.exists(spriteKey)) {
      // Sprite path — painterly AI image with a hot tint overlay so the
      // bullet always reads as "hostile fire" regardless of the sprite's
      // native palette. Circle stays visible underneath as a high-contrast
      // core so the bullet is legible even in a bullet-storm.
      if (!bullet.image) {
        bullet.image = this.scene.add.image(x, y, spriteKey);
        bullet.image.setDepth(9);
        bullet.image.setOrigin(0.5, 0.5);
      } else {
        bullet.image.setTexture(spriteKey);
      }
      const native = bullet.image.width || 1024;
      // Bigger on-screen so it's legible (40 px, up from 32).
      bullet.image.setScale(40 / native);
      bullet.image.setPosition(x, y);
      bullet.image.setRotation(Math.atan2(vy, vx) + Math.PI / 2);
      // Hot-tint the painterly sprite — non-fill so the shading survives,
      // but shifted into the red/orange family per the closed-chromatic rule.
      bullet.image.setTint(BULLET_TINT[kind]);
      bullet.image.setVisible(true);
      // Circle underneath as a bright hot core — ALWAYS visible so bullets
      // never get lost in the chaos.
      bullet.sprite.setFillStyle(BULLET_TINT[kind], 1);
      bullet.sprite.setStrokeStyle(2, 0x3a0000, 1);
      bullet.sprite.setRadius(6); // smaller core so sprite reads above it
      bullet.sprite.setVisible(true);
      bullet.sprite.setDepth(10);
    } else {
      // Pure-primitive fallback — big hot circle with dark outline.
      bullet.sprite.setFillStyle(BULLET_TINT[kind], 1);
      bullet.sprite.setStrokeStyle(2, 0x3a0000, 1);
      bullet.sprite.setRadius(10);
      bullet.sprite.setVisible(true);
      if (bullet.image) bullet.image.setVisible(false);
    }

    bullet.vx = vx;
    bullet.vy = vy;
    bullet.damage = damage;
    bullet.ttlMs = 3500;
    bullet.active = true;
    if (sourceEnemyId !== undefined) {
      bullet.sourceEnemyId = sourceEnemyId;
    } else {
      delete bullet.sourceEnemyId;
    }
  }

  activeEnemyBullets(): EnemyBullet[] {
    return this.bulletPool.filter((b) => b.active);
  }

  killEnemyBullet(bullet: EnemyBullet): void {
    bullet.active = false;
    bullet.sprite.setVisible(false);
    bullet.glow.setVisible(false);
    if (bullet.image) bullet.image.setVisible(false);
  }

  nearestTo(x: number, y: number): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const d = e.distanceTo(x, y);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  count(): number {
    return this.enemies.filter((e) => e.active).length;
  }

  /** Iterate active enemies; used by collision. */
  forEachActive(fn: (e: Enemy) => void): void {
    for (const e of this.enemies) if (e.active) fn(e);
  }
}

export type { EnemyBullet };
