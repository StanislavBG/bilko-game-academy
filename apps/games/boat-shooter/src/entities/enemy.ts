import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { applyArmor } from '../systems/battle';
import { StatusSet, type StatusId } from '../systems/status';
import { impactFx } from '../systems/enemy-attack-fx';

/** Elemental damage types used for charge-up, projectile body tint, and death VFX. */
export type EnemyElement = 'physical' | 'fire' | 'storm' | 'frost' | 'earth' | 'shadow';

export interface EnemySpec {
  id: string;
  maxHp: number;
  armor: number;
  speed: number; // px/sec
  contactDamage: number; // dmg applied to player on collision
  collisionRadius: number;
  /** Coin drops on death. */
  drops: {
    coinsSmall: number;
    coinsMedium: number;
    coinsLarge: number;
    gemChance: number; // 0..1
    xpOrbs: number;
  };
  /** Visual color (Graphics primitive in P1). */
  color: number;
  /** Optional: silhouette size hint. */
  visualRadius?: number;
  /** Optional: damage element for shot tints + impact FX + death animation.
   *  Defaults to 'physical' when unset (see Enemy.element getter). */
  element?: EnemyElement;
  /** Optional: sprite display multiplier (× visualRadius). Replaces the
   *  older 3.0/4.0 heuristic. Defaults to 5.0 standard / 3.0 boss-sized. */
  spriteScale?: number;
  /** Optional: show 2-stage aim reticle at lead point during the fire tell. */
  showAimReticle?: boolean;
  /** Optional: class-based death signature on top of element death (doc 27
   *  §3 GAP 6). Each enemy class has a characteristic way of dying:
   *    pop      — small splinter burst (fodder default)
   *    splinter — bigger chunks + shrapnel
   *    chain    — staggered 3-hit cascade bow-to-stern
   *    cookoff  — central blast + smoke column that lingers
   *    dissolve — ghostly fade + rising wisps
   *    splash   — heavy water splash ring (serpents, tentacles)
   *    topple   — slow vertical fall (towers)
   *  Default `pop`. */
  deathStyle?: 'pop' | 'splinter' | 'chain' | 'cookoff' | 'dissolve' | 'splash' | 'topple';
}

/** Enemy entity base class. Subclasses implement movement + fire AI. */
export abstract class Enemy {
  readonly scene: StageScene;
  readonly container: Phaser.GameObjects.Container;
  readonly graphics: Phaser.GameObjects.Graphics;
  /** Inner container — holds the sprite + rim. Idle bob animates this,
   *  so the AI's `setPos` (which drives container.x/y) stays authoritative.
   *  `protected` so subclasses can do small visual reactions (wind dips,
   *  recoil squashes) during fire-phase animations. */
  protected body?: Phaser.GameObjects.Container;
  /** Drop shadow ellipse — sits behind the body; fixed offset. */
  private shadow?: Phaser.GameObjects.Ellipse;
  /** Last position — used to derive velocity for facing + wake trail. */
  private lastX: number;
  private lastY: number;
  private wakeAccumMs = 0;

  x: number;
  y: number;
  hp: number;
  readonly spec: EnemySpec;
  active = true;

  /** Unique runtime ID for use in projectile alreadyHit sets. */
  readonly runtimeId: number;
  private static _nextRuntimeId = 1;

  /** Active statuses and reaction cooldowns. */
  readonly statuses = new StatusSet();
  reactionCooldowns: Map<string, number> | undefined;

  /** Set by Shatter reaction; next damage dealt is multiplied and bypasses armor. */
  shatterPending: { multiplier: number; bypassArmor: boolean } | undefined;

  /** Convulsion reaction side effect — while Poison DoT ticks, stun briefly. */
  convulsionActive = false;

  /** Crystal Venom side effect — on Freeze expiration apply full Poison DoT. */
  pendingPoisonOnThaw = false;

  /** Last damage element (written by projectile/weapon code on hit). Drives
   *  the death-by-element switch in kill(). Defaults to 'physical'. */
  lastHitElement: EnemyElement = 'physical';

  constructor(scene: StageScene, spec: EnemySpec, x: number, y: number) {
    this.scene = scene;
    // Scaling: NG+ + difficulty apply multiplicatively.
    const ng = scene.runState?.ngPlus ?? 0;
    const diff = scene.runState?.difficulty ?? 'normal';
    const diffScale = diff === 'easy' ? { hp: 0.7, dmg: 0.7 } : diff === 'hard' ? { hp: 1.4, dmg: 1.3 } : { hp: 1, dmg: 1 };
    const ngHp = 1 + 0.15 * ng;
    const ngDmg = 1 + 0.1 * ng;
    this.spec = (ng > 0 || diff !== 'normal')
      ? { ...spec, maxHp: Math.ceil(spec.maxHp * ngHp * diffScale.hp), contactDamage: spec.contactDamage * ngDmg * diffScale.dmg }
      : spec;
    this.x = x;
    this.y = y;
    this.lastX = x;
    this.lastY = y;
    this.hp = this.spec.maxHp;
    this.runtimeId = Enemy._nextRuntimeId++;

    this.container = scene.add.container(x, y);
    this.graphics = scene.add.graphics();

    // Shadow ellipse sits below the body. Slight Y-offset, soft dark,
    // scales with radius — reads as "floating on water".
    const r = this.spec.visualRadius ?? this.spec.collisionRadius;
    this.shadow = scene.add.ellipse(0, r * 0.55, r * 2.2, r * 0.7, 0x000000, 0.35);
    this.container.add(this.shadow);

    // Body sub-container holds everything that visibly animates.
    this.body = scene.add.container(0, 0);
    this.body.add(this.graphics);
    this.container.add(this.body);

    // If the AI-generated sprite for this enemy exists, render it centered.
    // Graphics fallback still draws underneath (and is used when no sprite).
    const spriteKey = `sprite-${this.spec.id}`;
    if (scene.textures.exists(spriteKey)) {
      // Prefer per-enemy spriteScale; otherwise bosses (maxHp >= 60) stay at
      // 3.0 and the non-boss default is bumped to 5.0 per §4.
      const scaleMult = spec.spriteScale ?? (spec.maxHp >= 60 ? 3.0 : 5.0);
      const display = Math.round(r * scaleMult);
      // Faint dark rim behind the sprite improves readability on water.
      const rim = scene.add.circle(0, 0, r * (scaleMult / 2) + 4, 0x000000, 0.35);
      this.body.add(rim);
      const img = scene.add.image(0, 0, spriteKey);
      img.setDisplaySize(display, display);
      this.body.add(img);
      this.graphics.setVisible(false);
    } else {
      this.drawVisual();
    }

    // Debug: in godmode, draw the collision circle so it's obvious where
    // the hitbox actually is vs. the sprite.
    if (scene.runState.godmode) {
      const ring = scene.add.circle(0, 0, this.spec.collisionRadius, 0xff3366, 0);
      ring.setStrokeStyle(2, 0xff3366, 0.7);
      this.container.add(ring);
    }

    // Directional spawn-in (§6.5). Pick the closest world edge to the
    // spawn position and slide in from there over 400 ms, leaving a wake
    // trail — sells "a boat is coming around the bend" rather than "an
    // enemy appeared." Reduced-motion collapses this back to the old pop.
    // Complexity: O(1).
    const worldW = scene.cameras.main.width || 1080;
    const worldH = scene.cameras.main.height || 1920;
    const distLeft = x;
    const distRight = worldW - x;
    const distTop = y;
    const distBottom = worldH - y;
    const minDist = Math.min(distLeft, distRight, distTop, distBottom);
    let offX = 0;
    let offY = 0;
    const slideDist = 120;
    if (minDist === distTop) offY = -slideDist;
    else if (minDist === distBottom) offY = slideDist;
    else if (minDist === distLeft) offX = -slideDist;
    else offX = slideDist;
    const reduced = scene.fx?.reducedMotion?.() ?? false;
    if (reduced) {
      this.container.setScale(0.3);
      this.container.setAlpha(0);
      scene.tweens.add({
        targets: this.container,
        scale: 1,
        alpha: 1,
        duration: 280,
        ease: 'Back.out',
      });
    } else {
      // Slide in from edge direction.
      this.container.setPosition(x + offX, y + offY);
      this.container.setAlpha(0);
      scene.tweens.add({
        targets: this.container,
        x,
        y,
        alpha: 1,
        duration: 400,
        ease: 'Cubic.out',
      });
      // Intermittent wake bursts during the slide.
      const wakeCount = 3;
      for (let i = 0; i < wakeCount; i++) {
        scene.time.delayedCall(80 + i * 80, () => {
          if (!this.active) return;
          scene.fx.wakeBurst(this.container.x, this.container.y);
        });
      }
    }

    // Idle bob — gentle vertical sway on the body only, so AI setPos on the
    // outer container stays uncontested. Each enemy gets a random phase so
    // they don't bob in lockstep.
    const bobAmp = 3 + r * 0.06;
    const bobMs = 900 + Math.random() * 500;
    this.body.y = (Math.random() - 0.5) * bobAmp;
    scene.tweens.add({
      targets: this.body,
      y: `+=${bobAmp}`,
      duration: bobMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    // Shadow counter-bob — grows/shrinks slightly so the shadow reads as
    // a light source from above while the hull pitches.
    scene.tweens.add({
      targets: this.shadow,
      scaleX: { from: 1, to: 1.1 },
      scaleY: { from: 1, to: 0.9 },
      duration: bobMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  /** Default visual: a colored circle. Subclasses can override. */
  protected drawVisual(): void {
    const r = this.spec.visualRadius ?? this.spec.collisionRadius;
    this.graphics.clear();
    this.graphics.fillStyle(this.spec.color, 1).fillCircle(0, 0, r);
    this.graphics.lineStyle(2, 0x000000, 0.8).strokeCircle(0, 0, r);
  }

  abstract update(deltaMs: number): void;

  takeDamage(
    damage: number,
    armorPierce: number,
    isCrit: boolean,
    hitVec?: { dx: number; dy: number },
  ): number {
    let working = damage;
    // Shatter multiplies the next hit and bypasses armor.
    if (this.shatterPending) {
      working *= this.shatterPending.multiplier;
      isCrit = isCrit || this.shatterPending.bypassArmor; // crit-path bypasses armor
      this.shatterPending = undefined;
    }
    const amt = applyArmor(working, this.spec.armor, armorPierce, isCrit);
    this.hp -= amt;
    this.playHitReaction(isCrit, amt, hitVec);
    if (this.hp <= 0) this.kill();
    return amt;
  }

  /** Current effective element — spec.element or default 'physical'. */
  get element(): EnemyElement {
    return this.spec.element ?? 'physical';
  }

  /** Setter used by projectile/weapon code to attribute the last hit's type,
   *  so kill() can pick an element-specific death animation. */
  setLastHitElement(e: EnemyElement): void {
    this.lastHitElement = e;
  }

  /** Hit reaction: scale pop + flash + pushback + (heavy-hit) wobble. */
  private playHitReaction(
    isCrit: boolean,
    damageDealt: number,
    hitVec?: { dx: number; dy: number },
  ): void {
    if (!this.body) return;
    const isGhost = this.element === 'shadow';
    // Ghost enemies dissipate rather than bleed red — use alpha flicker.
    if (isGhost) {
      const prev = this.body.alpha;
      this.body.alpha = 0.35;
      this.scene.time.delayedCall(90, () => {
        if (this.body) this.body.alpha = prev;
      });
    } else {
      // White hit-flash (doc 27 §3 GAP 3) — universal arcade convention.
      // Swapped from the old red tint because white reads as "impact" at a
      // glance; red was competing with the damage vignette + hazard rims.
      // Duration 80 ms, setTintFill so the whole silhouette goes white.
      this.body.iterate((child: Phaser.GameObjects.GameObject) => {
        const img = child as Phaser.GameObjects.Image;
        if (img.setTintFill) {
          img.setTintFill(0xffffff);
        }
      });
      this.scene.time.delayedCall(80, () => {
        if (!this.body) return;
        this.body.iterate((child: Phaser.GameObjects.GameObject) => {
          const img = child as Phaser.GameObjects.Image;
          if (img.clearTint) img.clearTint();
        });
      });
    }

    // Scale pop — bigger on crits.
    const pop = isCrit ? 1.25 : 1.12;
    this.scene.tweens.add({
      targets: this.body,
      scaleX: { from: pop, to: 1 },
      scaleY: { from: pop, to: 1 },
      duration: 140,
      ease: 'Back.out',
    });

    // Pushback — 2 px opposite the incoming-damage vector. If no vector is
    // provided (e.g. DoT), skip pushback. Complexity: O(1).
    if (hitVec && !this.scene.fx.reducedMotion()) {
      const len = Math.hypot(hitVec.dx, hitVec.dy) || 1;
      const push = 2;
      const px = (hitVec.dx / len) * push;
      const py = (hitVec.dy / len) * push;
      // Nudge the body (not the outer container which AI drives).
      const prevBx = this.body.x;
      const prevBy = this.body.y;
      this.scene.tweens.add({
        targets: this.body,
        x: prevBx + px,
        y: prevBy + py,
        duration: 60,
        yoyo: true,
        ease: 'Quad.out',
      });
    }

    // Heavy-hit wobble: ≥ 20% of maxHp → ~1° wobble for 200 ms. §6.2.
    if (damageDealt >= this.spec.maxHp * 0.2 && !this.scene.fx.reducedMotion()) {
      const wobbleRad = (Math.PI / 180) * 1;
      const baseRot = this.body.rotation;
      this.scene.tweens.add({
        targets: this.body,
        rotation: baseRot + wobbleRad,
        duration: 60,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.inOut',
      });
    }
  }

  /** Begin a 2-stage dashed→solid aim reticle at `leadPoint` for `duration` ms.
   *  Subclasses call this during their fire tell (§6.1). Returns a disposer the
   *  caller can invoke if the tell is cancelled. */
  beginAttackTell(
    duration: number,
    leadPoint: { x: number; y: number },
    showReticle: boolean,
  ): () => void {
    if (!showReticle || this.scene.fx.reducedMotion()) {
      return () => {};
    }
    // Stage A: faint dashed ring for half the tell. Phaser.Graphics doesn't
    // do CSS dashes — emulate with short arc segments.
    const halfMs = Math.max(60, duration * 0.5);
    const solidMs = Math.max(60, duration - halfMs);

    const gDashed = this.scene.add.graphics();
    gDashed.setDepth(8);
    const r = 22;
    const segCount = 10;
    gDashed.lineStyle(2, 0xff9090, 0.7);
    for (let i = 0; i < segCount; i++) {
      // Draw every other segment to give a dashed look.
      if (i % 2 === 0) {
        const a0 = (i / segCount) * Math.PI * 2;
        const a1 = ((i + 1) / segCount) * Math.PI * 2;
        gDashed.beginPath();
        gDashed.arc(leadPoint.x, leadPoint.y, r, a0, a1, false);
        gDashed.strokePath();
      }
    }

    let cancelled = false;
    const cleanupDashed = () => gDashed.destroy();
    // After Stage A, swap to solid ring + crosshair for Stage B.
    this.scene.time.delayedCall(halfMs, () => {
      cleanupDashed();
      if (cancelled) return;
      const gSolid = this.scene.add.graphics();
      gSolid.setDepth(8);
      gSolid.lineStyle(2, 0xff4040, 0.9);
      gSolid.strokeCircle(leadPoint.x, leadPoint.y, r);
      // Crosshair lines.
      gSolid.lineStyle(1.5, 0xff4040, 0.85);
      gSolid.beginPath();
      gSolid.moveTo(leadPoint.x - r - 4, leadPoint.y);
      gSolid.lineTo(leadPoint.x - r + 4, leadPoint.y);
      gSolid.moveTo(leadPoint.x + r - 4, leadPoint.y);
      gSolid.lineTo(leadPoint.x + r + 4, leadPoint.y);
      gSolid.moveTo(leadPoint.x, leadPoint.y - r - 4);
      gSolid.lineTo(leadPoint.x, leadPoint.y - r + 4);
      gSolid.moveTo(leadPoint.x, leadPoint.y + r - 4);
      gSolid.lineTo(leadPoint.x, leadPoint.y + r + 4);
      gSolid.strokePath();
      this.scene.time.delayedCall(solidMs, () => gSolid.destroy());
    });

    return () => {
      cancelled = true;
      cleanupDashed();
    };
  }

  /** Damage from a status DoT. Bypasses the shatter-consume logic. */
  takeStatusDamage(damage: number, sourceStatus: StatusId): number {
    const amt = Math.max(0.1, damage);
    this.hp -= amt;
    this.scene.damageNumbers.spawn(this.x, this.y - (this.spec.visualRadius ?? 20), amt, {
      dot: true,
    });
    void sourceStatus;
    if (this.hp <= 0) this.kill();
    return amt;
  }

  /** Default kill: drop loot then remove. */
  kill(): void {
    if (!this.active) return;
    this.active = false;

    // Combat log — one kill entry per enemy. `xp` is the spec's orb count;
    // actual XP added to the run happens when orbs are collected.
    this.scene.combatLog?.push({
      kind: 'kill',
      time: Date.now(),
      target: this.spec.id,
      xp: this.spec.drops.xpOrbs,
      totalDmg: this.spec.maxHp,
    });

    // Death VFX — scale burst by enemy size.
    const r = this.spec.visualRadius ?? this.spec.collisionRadius;
    this.scene.fx.explosion(this.x, this.y, r * 2.2, this.spec.color);
    this.scene.audio.sfxExplosion();

    // Expanding water ring + sinking shadow — the ship goes down in its own wake.
    const ring = this.scene.add.ellipse(this.x, this.y, r * 2, r * 0.8, 0xffffff, 0.55);
    ring.setStrokeStyle(2, 0xffffff, 0.8);
    ring.setFillStyle(0xffffff, 0);
    ring.setDepth(4);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 650,
      ease: 'Quad.out',
      onComplete: () => ring.destroy(),
    });

    // Event emission + treasure-map fragments — bosses, mini-bosses, and
    // Bank Sniper Towers match the drop rules in the PRD.
    const ctx = this.scene.getCtx();
    const rs = this.scene.runState;
    if (this.spec.maxHp >= 200) {
      // Full boss — 3 guaranteed fragments.
      rs.mapFragmentsThisStage += 3;
      ctx.events.emit({ type: 'boss-defeated', bossId: this.spec.id, timeMs: this.scene.time.now });
      this.scene.audio.sfxBossDefeat();
    } else if (this.spec.maxHp >= 60) {
      // Mini-boss — 1 guaranteed fragment.
      rs.mapFragmentsThisStage += 1;
      ctx.events.emit({ type: 'boss-defeated', bossId: this.spec.id, timeMs: this.scene.time.now });
      this.scene.audio.sfxBossDefeat();
    } else {
      ctx.events.emit({ type: 'enemy-killed', enemyId: this.spec.id });
      if (this.spec.id === 'bank-sniper-tower' && Math.random() < 0.03) {
        rs.mapFragmentsThisStage += 1;
      }
    }

    // Drops.
    const d = this.spec.drops;
    this.scene.pickups.spawnCoins(this.x, this.y, d.coinsSmall, 'small');
    this.scene.pickups.spawnCoins(this.x, this.y, d.coinsMedium, 'medium');
    this.scene.pickups.spawnCoins(this.x, this.y, d.coinsLarge, 'large');
    if (Math.random() < d.gemChance) this.scene.pickups.spawnGem(this.x, this.y);
    this.scene.pickups.spawnXpOrbs(this.x, this.y, d.xpOrbs);

    // PRD 9 — boss-tier kills (mini-boss + full boss) auto-collect every
    // pickup currently on the map so the player never has to chase loot.
    if (this.spec.maxHp >= 60) {
      this.scene.pickups.pullAllToPlayer();
    }

    // Death-by-element switch (§6.3). Each branch plays an element-flavored
    // impact burst; 'physical' falls through to the existing splinter-pop
    // explosion() above. All branches skip extra work under reduced-motion.
    // Complexity: O(1) particle emits.
    if (!this.scene.fx.reducedMotion()) {
      const elem = this.lastHitElement;
      switch (elem) {
        case 'fire': {
          // Burn-to-ash: tint body black briefly, then ash flakes rise.
          if (this.body) {
            this.body.iterate((child: Phaser.GameObjects.GameObject) => {
              const img = child as Phaser.GameObjects.Image;
              if (img.setTintFill) img.setTintFill(0x000000);
            });
          }
          impactFx(this.scene, this.x, this.y, 'fire');
          break;
        }
        case 'storm': {
          // Vaporize: white flash first, then radial sparks.
          if (this.body) {
            this.body.iterate((child: Phaser.GameObjects.GameObject) => {
              const img = child as Phaser.GameObjects.Image;
              if (img.setTintFill) img.setTintFill(0xffffff);
            });
          }
          impactFx(this.scene, this.x, this.y, 'storm');
          break;
        }
        case 'frost': {
          // Shatter-ring: brief stretch + ice shards.
          if (this.body) {
            this.scene.tweens.add({
              targets: this.body,
              scaleX: 1.2,
              scaleY: 1.2,
              duration: 80,
            });
          }
          impactFx(this.scene, this.x, this.y, 'frost');
          break;
        }
        case 'earth': {
          impactFx(this.scene, this.x, this.y, 'earth');
          break;
        }
        case 'shadow': {
          // Soul-release: fade to cyan silhouette + wisp burst.
          if (this.body) {
            this.body.iterate((child: Phaser.GameObjects.GameObject) => {
              const img = child as Phaser.GameObjects.Image;
              if (img.setTintFill) img.setTintFill(0x99eeff);
            });
          }
          impactFx(this.scene, this.x, this.y, 'shadow');
          break;
        }
        case 'physical':
        default: {
          // Fall through to the standard explosion already emitted above.
          break;
        }
      }
    }

    // Class-based signature death (doc 27 §3 GAP 6). Layers on top of the
    // element death above so you get "iron-shattered Scout Skiff" =
    // frost-shatter + skiff-pop. Reduced-motion skips all variants.
    const style = this.spec.deathStyle ?? 'pop';
    if (!this.scene.fx.reducedMotion()) {
      this.playClassDeath(style, r);
    }

    // Death tween — brief scale-up + fade before destroy. `splash` + `topple`
    // use their own longer tweens, so we skip the default for those.
    if (style !== 'splash' && style !== 'topple') {
      this.scene.tweens.add({
        targets: this.container,
        scale: 1.4,
        alpha: 0,
        duration: 220,
        ease: 'Quad.out',
        onComplete: () => this.container.destroy(),
      });
    }
  }

  /**
   * Per-class death choreography. Kept inline on Enemy so every subclass
   * gets it for free via `spec.deathStyle`. All costs are O(1) particle
   * emits — no per-frame work after the initial burst.
   */
  private playClassDeath(
    style: 'pop' | 'splinter' | 'chain' | 'cookoff' | 'dissolve' | 'splash' | 'topple',
    r: number,
  ): void {
    const fx = this.scene.fx;
    switch (style) {
      case 'pop':
        // Small splinter pop — 4 brown debris rectangles flying outward.
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.random() * 0.4;
          const dist = r * 1.2;
          const chip = this.scene.add.rectangle(
            this.x, this.y, 6, 3, 0x6a4010, 1,
          );
          chip.setDepth(5);
          this.scene.tweens.add({
            targets: chip,
            x: this.x + Math.cos(a) * dist,
            y: this.y + Math.sin(a) * dist,
            angle: 180 + Math.random() * 180,
            alpha: 0,
            duration: 380,
            onComplete: () => chip.destroy(),
          });
        }
        break;

      case 'splinter': {
        // Bigger chunks + a prow shard flying away in the motion direction.
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2;
          const dist = r * 1.6;
          const chip = this.scene.add.rectangle(
            this.x, this.y, 8 + Math.random() * 6, 3, 0x5a3010, 1,
          );
          chip.setDepth(5);
          this.scene.tweens.add({
            targets: chip,
            x: this.x + Math.cos(a) * dist,
            y: this.y + Math.sin(a) * dist,
            angle: 360,
            alpha: 0,
            duration: 520,
            onComplete: () => chip.destroy(),
          });
        }
        // Metallic prow shard — bright grey, spins.
        const shard = this.scene.add.polygon(this.x, this.y,
          [0, -10, 5, 0, -5, 0], 0xb0b0b0, 1,
        );
        shard.setStrokeStyle(1, 0x2a2a2a);
        shard.setDepth(6);
        this.scene.tweens.add({
          targets: shard,
          x: this.x + (Math.random() - 0.5) * r * 3,
          y: this.y + r * 2,
          angle: 720,
          alpha: 0,
          duration: 700,
          onComplete: () => shard.destroy(),
        });
        break;
      }

      case 'chain': {
        // 3 staggered explosions bow-to-stern — 120 ms apart.
        const offsets = [-r * 0.6, 0, r * 0.6];
        offsets.forEach((dy, i) => {
          this.scene.time.delayedCall(i * 120, () => {
            fx.explosion(this.x, this.y + dy, r * 1.4, this.spec.color);
          });
        });
        break;
      }

      case 'cookoff': {
        // One big central blast + lingering smoke column.
        fx.explosion(this.x, this.y, r * 3, 0xff9040);
        const col = this.scene.add.ellipse(
          this.x, this.y, r * 1.2, r * 0.6, 0x404040, 0.5,
        );
        col.setDepth(4);
        this.scene.tweens.add({
          targets: col,
          y: this.y - r * 4,
          scaleX: 2,
          scaleY: 3,
          alpha: 0,
          duration: 1800,
          onComplete: () => col.destroy(),
        });
        break;
      }

      case 'dissolve': {
        // Ghostly wisp burst — 6 cyan arcs rising upward.
        for (let i = 0; i < 6; i++) {
          const wx = this.x + (Math.random() - 0.5) * r;
          const wy = this.y + (Math.random() - 0.5) * r;
          const wisp = this.scene.add.circle(wx, wy, 4, 0xaaffcc, 0.9);
          wisp.setBlendMode(Phaser.BlendModes.ADD);
          wisp.setDepth(6);
          this.scene.tweens.add({
            targets: wisp,
            y: wy - r * 2 - Math.random() * 20,
            x: wx + (Math.random() - 0.5) * 20,
            alpha: 0,
            scale: 0.3,
            duration: 900,
            onComplete: () => wisp.destroy(),
          });
        }
        break;
      }

      case 'splash': {
        // Big water splash ring — takes over from the default tween.
        const big = this.scene.add.ellipse(
          this.x, this.y, r * 4, r * 2, 0xaaddff, 0.55,
        );
        big.setStrokeStyle(3, 0xffffff, 0.85);
        big.setDepth(4);
        this.scene.tweens.add({
          targets: big,
          scaleX: 3,
          scaleY: 3,
          alpha: 0,
          duration: 900,
          onComplete: () => big.destroy(),
        });
        fx.splash(this.x, this.y);
        // Sink the body straight down with fade.
        this.scene.tweens.add({
          targets: this.container,
          y: this.container.y + 20,
          alpha: 0,
          scale: 0.7,
          duration: 600,
          ease: 'Quad.in',
          onComplete: () => this.container.destroy(),
        });
        break;
      }

      case 'topple': {
        // Tower falls forward — rotate + slide down.
        this.scene.tweens.add({
          targets: this.container,
          angle: 80,
          y: this.container.y + r * 0.8,
          alpha: 0,
          duration: 700,
          ease: 'Cubic.in',
          onComplete: () => this.container.destroy(),
        });
        // Dust puffs at the base.
        for (let i = 0; i < 4; i++) {
          const dx = (Math.random() - 0.5) * r;
          const puff = this.scene.add.circle(
            this.x + dx, this.y + r * 0.6, 8, 0x9a8866, 0.65,
          );
          puff.setDepth(3);
          this.scene.tweens.add({
            targets: puff,
            scale: 2.5,
            alpha: 0,
            duration: 700,
            onComplete: () => puff.destroy(),
          });
        }
        break;
      }
    }
  }

  /** Distance-to helper for systems. */
  distanceTo(x: number, y: number): number {
    return Math.hypot(this.x - x, this.y - y);
  }

  setPos(x: number, y: number): void {
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    this.lastX = this.x;
    this.lastY = this.y;
    this.x = x;
    this.y = y;
    this.container.setPosition(x, y);

    // Face the direction of travel (Y-axis up is -PI/2 native for top-down ships).
    if (this.body && (dx * dx + dy * dy) > 0.5) {
      const target = Math.atan2(dy, dx) + Math.PI / 2;
      // Smoothly ease rotation toward target — prevents jitter.
      this.body.rotation += phaseAngle(target - this.body.rotation) * 0.2;
    }

    // Emit a wake-splash behind a moving enemy every ~140 ms. Skip for slow
    // drifters or stationary shore turrets to keep the particle budget lean.
    const speedSq = dx * dx + dy * dy;
    if (speedSq > 0.5 && this.scene.game.loop.delta > 0) {
      this.wakeAccumMs += this.scene.game.loop.delta;
      if (this.wakeAccumMs >= 140) {
        this.wakeAccumMs = 0;
        const r = this.spec.visualRadius ?? this.spec.collisionRadius;
        const len = Math.sqrt(speedSq) || 1;
        const bx = this.x - (dx / len) * r * 0.7;
        const by = this.y - (dy / len) * r * 0.7;
        const splash = this.scene.add.ellipse(bx, by, r * 0.9, r * 0.35, 0xffffff, 0.45);
        splash.setDepth(4);
        this.scene.tweens.add({
          targets: splash,
          scaleX: 1.4,
          scaleY: 0.6,
          alpha: 0,
          duration: 500,
          onComplete: () => splash.destroy(),
        });
      }
    }
  }
}

/** Wrap angle difference to [-PI, PI] for shortest-path rotation. */
function phaseAngle(d: number): number {
  let a = d;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
