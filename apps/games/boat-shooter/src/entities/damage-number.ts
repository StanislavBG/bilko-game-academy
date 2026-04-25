import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { DAMAGE_NUMBER } from '../constants';

/**
 * Tier classification for damage popups — matches §5 of
 * docs/games/boat-shooter/23-hud-and-combat-log.md.
 *
 *  tiny       1 dmg          → small grey, no stroke
 *  normal     2–9 dmg        → white, thin stroke
 *  big        10–24 dmg      → yellow, bold stroke, slight pop
 *  crit       any crit <50   → gold, +25% size, italic
 *  mega-crit  crit ≥ 50 dmg  → gold + glow, +40% size, pulse 1×
 *  dot        DoT tick       → red-orange, smaller, floats *down*
 *  heal       heal number    → green, "+" prefix, floats up
 *  reaction   reaction flash → reaction color + reaction label
 */
export type DamageTier =
  | 'tiny'
  | 'normal'
  | 'big'
  | 'crit'
  | 'mega-crit'
  | 'dot'
  | 'heal'
  | 'reaction';

interface FloatingNumber {
  text: Phaser.GameObjects.Text;
  vy: number;
  ttlMs: number;
  active: boolean;
}

interface SpawnOpts {
  crit?: boolean;
  dot?: boolean;
  heal?: boolean;
  reaction?: { color: string; label: string };
}

/**
 * Floating damage numbers. Pooled; one Text per slot; tier styling
 * applied on each reuse so the pool can be cross-tier.
 */
export class DamageNumberSystem {
  private pool: FloatingNumber[] = [];
  private readonly scene: StageScene;

  constructor(scene: StageScene) {
    this.scene = scene;
  }

  spawn(x: number, y: number, damage: number, opts: SpawnOpts = {}): void {
    const tier = this.classify(damage, opts);
    const style = this.styleFor(tier);

    let item = this.pool.find((i) => !i.active);
    if (!item) {
      const text = this.scene.add.text(x, y, '', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${style.fontSize}px`,
        color: style.color,
        stroke: style.stroke,
        strokeThickness: style.strokeThickness,
      });
      text.setOrigin(0.5, 0.5);
      text.setDepth(50);
      item = { text, vy: 0, ttlMs: 0, active: false };
      this.pool.push(item);
    }

    // Format the number label. Reactions override with a label.
    const body = (() => {
      if (opts.reaction) return opts.reaction.label;
      const rounded = damage < 1 ? damage.toFixed(1) : `${Math.round(damage)}`;
      if (tier === 'heal') return `+${rounded}`;
      if (tier === 'crit' || tier === 'mega-crit') return `${rounded}!`;
      return rounded;
    })();

    item.text.setText(body);
    item.text.setPosition(x + (Math.random() * 30 - 15), y - 10);
    item.text.setFontSize(style.fontSize);
    item.text.setColor(style.color);
    item.text.setStroke(style.stroke, style.strokeThickness);
    item.text.setStyle({ fontStyle: style.fontStyle });
    item.text.setAlpha(1);
    item.text.setScale(style.scale);
    item.text.setVisible(true);

    // DoT floats down; everything else floats up.
    const upPx = DAMAGE_NUMBER.floatUpPx;
    const lifeSec = DAMAGE_NUMBER.lifetimeMs / 1000;
    item.vy = tier === 'dot' ? (upPx * 0.4) / lifeSec : -upPx / lifeSec;
    item.ttlMs = DAMAGE_NUMBER.lifetimeMs * (tier === 'dot' ? 0.8 : 1);
    item.active = true;

    // Mega-crit gets a single pulse-out that decays; implemented as a
    // scale tween so the pool's baseline scale is respected afterwards.
    if (tier === 'mega-crit' && !this.scene.fx.reducedMotion()) {
      this.scene.tweens.add({
        targets: item.text,
        scale: { from: style.scale * 0.9, to: style.scale * 1.25 },
        duration: 140,
        yoyo: true,
        ease: 'Back.out',
      });
    } else if (tier === 'big' && !this.scene.fx.reducedMotion()) {
      this.scene.tweens.add({
        targets: item.text,
        scale: { from: style.scale * 0.95, to: style.scale },
        duration: 100,
        ease: 'Back.out',
      });
    }
  }

  private classify(damage: number, opts: SpawnOpts): DamageTier {
    if (opts.reaction) return 'reaction';
    if (opts.heal) return 'heal';
    if (opts.dot) return 'dot';
    if (opts.crit) return damage >= 50 ? 'mega-crit' : 'crit';
    if (damage >= 10) return 'big';
    if (damage >= 2) return 'normal';
    return 'tiny';
  }

  private styleFor(tier: DamageTier): {
    fontSize: number;
    color: string;
    stroke: string;
    strokeThickness: number;
    fontStyle: string;
    scale: number;
  } {
    const base = DAMAGE_NUMBER.startFontSize;
    const fx = this.scene.fx;
    // Tier → {color, size, stroke, italic}. Colors go through the colorblind
    // remap for crit/dot/normal/reaction so a palette swap is consistent.
    switch (tier) {
      case 'tiny':
        return {
          fontSize: Math.round(base * 0.75),
          color: this.hex(fx.accessibleColor(0xbbbbbb, 'normal')),
          stroke: '#000',
          strokeThickness: 0,
          fontStyle: 'normal',
          scale: 1,
        };
      case 'normal':
        return {
          fontSize: base,
          color: this.hex(fx.accessibleColor(0xf5f5f5, 'normal')),
          stroke: '#000',
          strokeThickness: 3,
          fontStyle: 'normal',
          scale: 1,
        };
      case 'big':
        return {
          fontSize: base + 4,
          color: this.hex(fx.accessibleColor(0xffe066, 'crit')),
          stroke: '#000',
          strokeThickness: 4,
          fontStyle: 'bold',
          scale: 1.08,
        };
      case 'crit':
        return {
          fontSize: Math.round(base * 1.25),
          color: this.hex(fx.accessibleColor(0xffd13a, 'crit')),
          stroke: '#000',
          strokeThickness: 4,
          fontStyle: 'italic bold',
          scale: 1.25,
        };
      case 'mega-crit':
        return {
          fontSize: Math.round(base * 1.4),
          color: this.hex(fx.accessibleColor(0xffe78a, 'crit')),
          stroke: '#ffffff',
          strokeThickness: 5,
          fontStyle: 'italic bold',
          scale: 1.4,
        };
      case 'dot':
        return {
          fontSize: Math.round(base * 0.85),
          color: this.hex(fx.accessibleColor(0xff6b2a, 'dot')),
          stroke: '#000',
          strokeThickness: 2,
          fontStyle: 'normal',
          scale: 0.9,
        };
      case 'heal':
        return {
          fontSize: base,
          color: this.hex(fx.accessibleColor(0x8fce5a, 'normal')),
          stroke: '#000',
          strokeThickness: 3,
          fontStyle: 'bold',
          scale: 1,
        };
      case 'reaction':
      default:
        return {
          fontSize: base + 2,
          color: '#ffffff',
          stroke: '#000',
          strokeThickness: 4,
          fontStyle: 'bold',
          scale: 1.1,
        };
    }
  }

  private hex(n: number): string {
    return '#' + n.toString(16).padStart(6, '0');
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const item of this.pool) {
      if (!item.active) continue;
      item.text.y += item.vy * dt;
      item.ttlMs -= deltaMs;
      const frac = item.ttlMs / DAMAGE_NUMBER.lifetimeMs;
      item.text.setAlpha(Math.max(0, frac));
      if (item.ttlMs <= 0) {
        item.active = false;
        item.text.setVisible(false);
      }
    }
  }
}
