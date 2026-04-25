import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { DragSteer } from '../input/drag-steer';
import {
  copperHullIframeBonusMs,
  copperHullNegateChance,
  copperHullReduction,
} from '../systems/battle';

/**
 * Player boat entity. Handles movement, iframes, and visible damage state.
 *
 * Movement model: the boat accelerates toward the steer target (touch or
 * keyboard). Under no input, velocity decays (drag). Speed + accel are read
 * from RunState so meta upgrades / Engine track apply automatically.
 *
 * Visuals (P1): drawn with Graphics primitives; real sprite arrives in P2+.
 */
export class Player {
  readonly scene: StageScene;
  readonly sprite: Phaser.GameObjects.Container;
  private steer: DragSteer;

  // Physics state.
  vx = 0;
  vy = 0;

  // Iframe state.
  private iframeUntilMs = 0;
  /** Collision radius. Tightly matches the visible hull (sprite is drawn at
   *  ~2× this radius) so "it looks like a hit" == "it is a hit". */
  readonly radius = 42;

  constructor(scene: StageScene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.container(x, y);
    this.buildSprite();
    this.steer = new DragSteer(scene);
  }

  private shadow!: Phaser.GameObjects.Ellipse;
  private wakeTimerMs = 0;
  private spriteImage: Phaser.GameObjects.Image | null = null;

  /** Public accessor so boss mechanics (possession) can toggle input inversion. */
  setInverted(on: boolean): void {
    this.steer.target.inverted = on;
  }

  /** Animated parts kept as fields so update() can flutter them per-frame. */
  private mainSail?: Phaser.GameObjects.Polygon;
  private captainFlag?: Phaser.GameObjects.Polygon;
  private lantern?: Phaser.GameObjects.Container;
  private smokeStack?: Phaser.GameObjects.Container;
  private lowHpFlagTweenApplied = false;

  private buildSprite(): void {
    // Shadow — strictly inside the oval, just under the hull.
    this.shadow = this.scene.add.ellipse(0, 38, 60, 14, 0x000000, 0.42);
    this.shadow.setDepth(-50);
    this.sprite.add(this.shadow);

    // Hitbox debug overlay — toggled by `?hitbox=1` URL flag (also auto-on
    // in godmode). Draws the literal collision radius + crosshair so the
    // dev can verify the painterly sprite silhouette aligns with the
    // gameplay-authoritative hitbox. No square / rectangle outlines —
    // those have caused player confusion ("starting white rectangle").
    const showHitbox = this.scene.runState.godmode
      || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('hitbox') === '1');
    if (showHitbox) {
      const hitRing = this.scene.add.circle(0, 0, this.radius, 0x00ff66, 0).setOrigin(0.5, 0.5);
      hitRing.setStrokeStyle(2, 0x00ff66, 0.85);
      this.sprite.add(hitRing);
      const crossH = this.scene.add.rectangle(0, 0, 14, 1, 0xff66ff, 0.95).setOrigin(0.5, 0.5);
      const crossV = this.scene.add.rectangle(0, 0, 1, 14, 0xff66ff, 0.95).setOrigin(0.5, 0.5);
      this.sprite.add(crossH);
      this.sprite.add(crossV);
    }

    // Single-bitmap render path. The base `sprite-player` PNG ships with
    // the game and every elemental variant is pre-baked by the ship
    // compositor at scene boot, so there's always a texture to render —
    // the old primitive-collage fallback was removed 2026-04-24 along
    // with its helpers (buildDetailedShip, drawHull, drawSailEmblem,
    // drawFigurehead, maskShape, tickMaskPosition).
    const shipId = this.scene.runState.shipId;
    const variantKey = `sprite-player-${shipId}`;
    const baseKey = 'sprite-player';
    const key = this.scene.textures.exists(variantKey) ? variantKey : baseKey;
    this.buildSingleSpriteShip(key);
  }

  /**
   * The preferred render path: one Phaser Image for the hull + a small
   * number of animated overlay primitives (flag, lantern glow, ambient
   * element FX). The sprite IS the silhouette — there's nothing to mask
   * and nothing to layer a unified outline onto, because the bitmap was
   * baked with its own outline + lighting.
   */
  private buildSingleSpriteShip(textureKey: string): void {
    const c = this.sprite;
    const cfg = this.scene.shipConfig;

    // Hull sprite — sized so the ship's visible hull matches ~2× the
    // collision radius. The source bitmap is 1024×1024 with generous
    // padding; a display size around 104×104 maps 1:1 with the old
    // primitive footprint.
    // Element aura — sits BEHIND the hull sprite as a child of the ship
    // container, so it follows the ship perfectly with zero positional
    // lag. Color matches the ship's element. Replaces / supplements the
    // ambient particle FX (those still spawn for movement-trailing
    // sparkle, but the aura is the always-on constant glow).
    const auraColor = cfg?.lanternColor ?? 0xffd85a;
    const aura = this.scene.add.circle(0, 0, 70, auraColor, 0.18);
    aura.setBlendMode(Phaser.BlendModes.ADD);
    c.add(aura);
    if (!this.scene.fx.reducedMotion()) {
      this.scene.tweens.add({
        targets: aura,
        scale: { from: 0.92, to: 1.08 },
        alpha: { from: 0.18, to: 0.32 },
        duration: 1400,
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }

    // Hull sprite — sized so the ship's visible hull matches ~2× the
    // collision radius. The source bitmap is 2048×2048 (Imagen 4) with
    // generous painterly padding; display 140×140 maps 1:1 with the
    // collision footprint.
    this.spriteImage = this.scene.add.image(0, 0, textureKey);
    this.spriteImage.setOrigin(0.5, 0.5);
    this.spriteImage.setDisplaySize(140, 140);
    c.add(this.spriteImage);

    // Idle bob + sway — gentle tilt so the ship reads as "floating" not
    // "pinned to the screen." Reduced-motion off only.
    if (!this.scene.fx.reducedMotion()) {
      this.scene.tweens.add({
        targets: this.spriteImage,
        y: { from: -1, to: 1 },
        duration: 1900,
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
      this.scene.tweens.add({
        targets: this.spriteImage,
        angle: { from: -1.2, to: 1.2 },
        duration: 2600,
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }

    // Captain flag — tiny rectangle anchored at the bow flagpole.
    // Positioned at top-of-sprite; origin-left so it pivots from the mast.
    this.captainFlag = this.scene.add.polygon(0, -48, [
      0, -2, 7, -2, 7, 2, 0, 2,
    ], 0xd84030, 1).setOrigin(0, 0.5).setStrokeStyle(0.5, 0x2a0808, 1);
    c.add(this.captainFlag);
    this.scene.tweens.add({
      targets: this.captainFlag,
      angle: { from: -18, to: 18 },
      duration: 700,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    // Lantern glow at the stern — colored per ship element.
    const glowColor = cfg?.lanternColor ?? 0xffd85a;
    const lanternC = this.scene.add.container(0, 42);
    const lanternGlow = this.scene.add.circle(0, 0, 5, glowColor, 0.6);
    const lanternCore = this.scene.add.circle(0, 0, 1.5, 0xffffff, 1);
    lanternC.add(lanternGlow); lanternC.add(lanternCore);
    c.add(lanternC);
    this.lantern = lanternC;
    this.scene.tweens.add({
      targets: this.lantern,
      alpha: { from: 0.78, to: 1 },
      duration: 240,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    // Smoke marker (hidden until HP ≤ 25%).
    const smokeC = this.scene.add.container(0, 16);
    smokeC.setVisible(false);
    smokeC.add(this.scene.add.circle(0, 0, 3, 0x303030, 0.55));
    smokeC.add(this.scene.add.circle(-2, -4, 4, 0x202020, 0.45));
    c.add(smokeC);
    this.smokeStack = smokeC;

    // Element-specific ambient FX — the ship feels alive in its element.
    this.spawnAmbientElementFX();
  }

  private ambientTimerMs = 0;
  /**
   * Emit per-element ambient particles every ~240 ms. Called from
   * update(), so the rate naturally pauses when the scene pauses.
   */
  private spawnAmbientElementFX(): void {
    // Kicked off by update(), no setup work needed — just ensures the
    // flag exists for compilation if we later need one.
  }

  private tickAmbientElementFX(deltaMs: number): void {
    this.ambientTimerMs += deltaMs;
    if (this.ambientTimerMs < 240) return;
    if (this.scene.fx.reducedMotion()) return;
    this.ambientTimerMs = 0;
    const cfg = this.scene.shipConfig;
    if (!cfg) return;
    const px = this.sprite.x;
    const py = this.sprite.y;
    switch (cfg.element) {
      case 'fire': {
        // Upward ember, fades.
        const e = this.scene.add.circle(
          px + (Math.random() - 0.5) * 40, py - 20,
          2 + Math.random() * 2,
          Math.random() > 0.5 ? 0xff9048 : 0xffd07a, 1,
        );
        e.setBlendMode(Phaser.BlendModes.ADD);
        e.setDepth(-5);
        this.scene.tweens.add({
          targets: e,
          y: e.y - 60 - Math.random() * 40,
          alpha: 0, scale: 0.2,
          duration: 700,
          onComplete: () => e.destroy(),
        });
        break;
      }
      case 'storm': {
        // Occasional spark crackle.
        if (Math.random() < 0.45) {
          const e = this.scene.add.rectangle(
            px + (Math.random() - 0.5) * 50,
            py + (Math.random() - 0.5) * 40,
            1, 4, 0xddeeff, 1,
          );
          e.setBlendMode(Phaser.BlendModes.ADD);
          e.setDepth(-5);
          this.scene.tweens.add({
            targets: e,
            alpha: 0, scaleY: 0.1,
            duration: 120,
            onComplete: () => e.destroy(),
          });
        }
        break;
      }
      case 'frost': {
        // Downward snowflake drift.
        const e = this.scene.add.circle(
          px + (Math.random() - 0.5) * 56, py - 30,
          1.2 + Math.random(),
          0xe8f8ff, 0.9,
        );
        e.setDepth(-5);
        this.scene.tweens.add({
          targets: e,
          y: e.y + 80,
          x: e.x + (Math.random() - 0.5) * 10,
          alpha: 0,
          duration: 1200,
          onComplete: () => e.destroy(),
        });
        break;
      }
      case 'earth': {
        // Slow-floating leaf.
        if (Math.random() < 0.6) {
          const e = this.scene.add.ellipse(
            px + (Math.random() - 0.5) * 50, py + 20,
            5, 2.4,
            Math.random() > 0.5 ? 0x5a8a30 : 0x8aa040, 1,
          );
          e.setRotation(Math.random() * Math.PI * 2);
          e.setDepth(-5);
          this.scene.tweens.add({
            targets: e,
            y: e.y + 60, x: e.x + (Math.random() - 0.5) * 30,
            angle: Math.random() * 360,
            alpha: 0,
            duration: 1600,
            onComplete: () => e.destroy(),
          });
        }
        break;
      }
      case 'shadow': {
        // Wispy will-o-wisp arc.
        const e = this.scene.add.circle(
          px + (Math.random() - 0.5) * 36, py + 10,
          2.5, 0xaaeecc, 0.8,
        );
        e.setBlendMode(Phaser.BlendModes.ADD);
        e.setDepth(-5);
        this.scene.tweens.add({
          targets: e,
          y: e.y - 24 - Math.random() * 20,
          x: e.x + (Math.random() - 0.5) * 18,
          alpha: 0, scale: 1.6,
          duration: 900,
          onComplete: () => e.destroy(),
        });
        break;
      }
    }
  }


  /**
   * Tier-aware bow muzzle origin. Lets weapons fire from the actual
   * bow tip of the current ship rather than a fixed y-offset.
   */
  bowMuzzleY(): number {
    const tier = this.scene.shipTier;
    if (tier === 1) return -36;
    if (tier === 2) return -40;
    return -44;
  }

  /**
   * Short recoil flash when a weapon fires from a flank. With the
   * single-sprite ship the cannons are baked into the bitmap, so we
   * can't tween individual barrels; instead, pulse the whole sprite
   * slightly away from the firing side. Subtle — it reads as "ship
   * rocks with the shot" without shoving the player's aim.
   */
  recoilCannons(side: 'port' | 'starboard' = 'starboard'): void {
    if (!this.spriteImage) return;
    // Subtle local X kick on the ship sprite only — container stays
    // anchored so collision + input aren't disrupted by fire feedback.
    const baseX = this.spriteImage.x;
    this.scene.tweens.add({
      targets: this.spriteImage,
      x: { from: baseX + (side === 'port' ? 3 : -3), to: baseX },
      duration: 130,
      ease: 'Quad.out',
    });
  }


  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  update(deltaMs: number): void {
    this.steer.update();
    this.applyMovement(deltaMs);
    this.tickAmbientElementFX(deltaMs);

    // Wake trail — emit a bubble-burst every ~80ms behind the boat when moving.
    // T1 (small sloop) barely leaves a wake; T3 (flagship) churns heavy.
    // The wake is tinted by the ship's element so each ship leaves a
    // signature trail color (ember red, electric blue, cyan frost, etc).
    this.wakeTimerMs += deltaMs;
    const speed = Math.hypot(this.vx, this.vy);
    const wakeThreshold = this.scene.shipTier === 1 ? 100 : 60;
    if (speed > wakeThreshold && this.wakeTimerMs > 80) {
      this.wakeTimerMs = 0;
      this.scene.fx.wakeBurst(
        this.sprite.x + (Math.random() * 30 - 15),
        this.sprite.y + 70,
        this.scene.shipConfig?.wakeColor,
      );
    }
  }

  private applyMovement(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const run = this.scene.runState;
    const accel = run.accel;
    const maxSpeed = run.speed;

    // Desired direction: touch target overrides; else keyboard vec.
    let dx = 0;
    let dy = 0;
    const t = this.steer.target;
    if (t.x !== null && t.y !== null) {
      dx = t.x - this.x;
      dy = t.y - this.y;
      const len = Math.hypot(dx, dy);
      if (len > 8) {
        dx /= len;
        dy /= len;
      } else {
        dx = 0;
        dy = 0;
      }
    } else if (t.keyboardVec.x !== 0 || t.keyboardVec.y !== 0) {
      dx = t.keyboardVec.x;
      dy = t.keyboardVec.y;
    }

    // Possession: invert input direction.
    if (t.inverted) {
      dx = -dx;
      dy = -dy;
    }

    // Accelerate toward desired direction.
    this.vx += dx * accel * dt;
    this.vy += dy * accel * dt;

    // Drag — always applied. Strong enough to halt in < 0.5 s at no-input.
    const drag = 6; // per-second multiplicative decay
    this.vx -= this.vx * drag * dt;
    this.vy -= this.vy * drag * dt;

    // Cap to max speed.
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > maxSpeed) {
      this.vx = (this.vx / sp) * maxSpeed;
      this.vy = (this.vy / sp) * maxSpeed;
    }

    // Integrate.
    const nextX = this.sprite.x + this.vx * dt;
    const nextY = this.sprite.y + this.vy * dt;
    const clamped = this.scene.clampToPlayArea(nextX, nextY);
    if (clamped.x !== nextX) this.vx = 0;
    if (clamped.y !== nextY) this.vy = 0;
    this.sprite.setPosition(clamped.x, clamped.y);
  }

  /**
   * Apply damage to the player, respecting iframes. Returns amount actually
   * taken. Optional `ctx` carries combat-log attribution (source enemy id +
   * damage type). Callers that don't have the info fall back to 'unknown'.
   */
  takeDamage(
    amount: number,
    ctx: { source?: string; type?: 'contact' | 'projectile' | 'dot' } = {},
  ): number {
    const now = this.scene.time.now;
    if (now < this.iframeUntilMs) return 0;

    const run = this.scene.runState;

    // Copper Hull L5 — chance to fully negate.
    if (Math.random() < copperHullNegateChance(run)) {
      this.iframeUntilMs = now + 200;
      return 0;
    }

    // Flat reduction from Copper Hull, floor 1.
    const copperCut = Math.max(0, amount - Math.max(1, amount - copperHullReduction(run)));
    const reduced = Math.max(1, amount - copperHullReduction(run));
    run.damage(reduced);

    // Combat log + screen-edge red pulse.
    this.scene.combatLog.push({
      kind: 'taken',
      time: Date.now(),
      source: ctx.source ?? 'unknown',
      amount: reduced,
      type: ctx.type ?? 'contact',
      reduced: copperCut,
      element: 'physical',
    });
    this.scene.vignette.pulseOnDamage(reduced, 'red');
    // Gate camera shake on reduced-motion — the pulse itself stays on.
    if (!this.scene.fx.reducedMotion()) {
      const mag = Math.min(0.008, 0.003 + reduced * 0.002);
      this.scene.cameras.main.shake(120, mag);
    }

    // Iframes (base 900ms + Copper Hull bonus).
    this.iframeUntilMs = now + 900 + copperHullIframeBonusMs(run);

    // Visual flash.
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 1, to: 0.2 },
      yoyo: true,
      duration: 120,
      repeat: 3,
      onComplete: () => {
        this.sprite.setAlpha(1);
      },
    });

    // Desaturate the hull sprite slightly at low HP so it reads wounded.
    if (this.spriteImage) this.spriteImage.setTint(run.hp / run.maxHp < 0.5 ? 0xff9090 : 0xffffff);

    // Show the trailing smoke when below quarter HP.
    const hpFrac = run.hp / run.maxHp;
    if (this.smokeStack) this.smokeStack.setVisible(hpFrac < 0.25);
    // Sail tears at ≤50% HP.
    if (this.mainSail) this.mainSail.setAlpha(hpFrac <= 0.5 ? 0.7 : 0.85);
    // Flag flutters wildly at ≤25% HP — expand the angle clamp.
    if (this.captainFlag && hpFrac <= 0.25 && !this.lowHpFlagTweenApplied) {
      this.scene.tweens.killTweensOf(this.captainFlag);
      this.scene.tweens.add({
        targets: this.captainFlag,
        angle: { from: -35, to: 35 },
        duration: 500,
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
      this.lowHpFlagTweenApplied = true;
    }

    return reduced;
  }

  destroy(): void {
    this.steer.destroy();
    this.sprite.destroy();
  }
}
