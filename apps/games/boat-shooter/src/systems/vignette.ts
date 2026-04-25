import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import type { WaterBiome } from './water-shader';

/**
 * Vignette overlay rendered via two large corner-gradient textures generated
 * at boot. Darkens screen edges for moody act transitions. Biome tinting
 * layers on top via tint + alpha.
 *
 * Also provides `pulseOnDamage(amount, flavor)` — a transient screen-edge
 * red/white/cyan pulse used for damage taken, crit dealt, and reaction
 * triggered. The pulse uses a second sprite so it doesn't mutate the
 * persistent biome tint.
 */
export type PulseFlavor = 'red' | 'white' | 'cyan';

export class Vignette {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  /** Transient pulse sprite — reused every damage event. */
  private pulseSprite!: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.generate();
    this.generatePulseTexture();
    this.sprite = scene.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'vignette');
    this.sprite.setDepth(900);
    this.sprite.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
    this.sprite.setScrollFactor(0);
    this.sprite.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Pulse overlay — starts hidden, blended additively so brightness
    // stacks on top of whatever the scene is showing.
    this.pulseSprite = scene.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'vignette-pulse');
    this.pulseSprite.setDepth(901);
    this.pulseSprite.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
    this.pulseSprite.setScrollFactor(0);
    this.pulseSprite.setBlendMode(Phaser.BlendModes.ADD);
    this.pulseSprite.setAlpha(0);
  }

  setBiome(biome: WaterBiome): void {
    switch (biome) {
      case 'sunlit': this.sprite.setTint(0xffffff).setAlpha(0.4); break;
      case 'fog':    this.sprite.setTint(0xc0d0d8).setAlpha(0.55); break;
      case 'night':  this.sprite.setTint(0x203040).setAlpha(0.7); break;
      case 'volcanic': this.sprite.setTint(0xff8a3a).setAlpha(0.45); break;
      // Act I sub-variants: warmer golden-hour at the river, crisp at sea.
      case 'rivermouth': this.sprite.setTint(0xf0d89a).setAlpha(0.45); break;
      case 'channels':   this.sprite.setTint(0xffffff).setAlpha(0.35); break;
      case 'open-sea':   this.sprite.setTint(0xf8f2d8).setAlpha(0.3); break;
    }
  }

  /**
   * Transient screen-edge pulse. Color flavor:
   *   red   — damage taken
   *   white — crit dealt
   *   cyan  — reaction triggered
   *
   * Intensity scales with `amountHp`: 1 → ~0.35 alpha, 2 → ~0.55, 3+ → ~0.75.
   * Fades out over 300 ms. Reduced-motion keeps the pulse but disables
   * camera shake — caller gates shake separately.
   */
  pulseOnDamage(amountHp: number, flavor: PulseFlavor = 'red'): void {
    const color = flavor === 'red' ? 0xff2a2a : flavor === 'cyan' ? 0x2affff : 0xffffff;
    const amt = Math.max(1, amountHp);
    const targetAlpha = Math.min(0.75, 0.2 + amt * 0.18);

    this.pulseSprite.setTint(color);
    this.pulseSprite.setAlpha(targetAlpha);
    // Kill any existing tween so rapid-fire hits don't stack.
    this.scene.tweens.killTweensOf(this.pulseSprite);
    this.scene.tweens.add({
      targets: this.pulseSprite,
      alpha: 0,
      duration: 300,
      ease: 'Quad.out',
    });
  }

  private generate(): void {
    if (this.scene.textures.exists('vignette')) return;
    const w = 512;
    const h = 288;
    const tex = this.scene.textures.createCanvas('vignette', w, h);
    const ctx = tex?.getContext();
    if (!tex || !ctx) return;
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(200,200,200,1)');
    grad.addColorStop(1, 'rgba(40,40,40,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }

  /**
   * Pulse gradient — *inverted* vignette. Edges are bright (full alpha),
   * center is transparent. That way the additive blend tints only the
   * screen edges, leaving gameplay in the middle unobstructed.
   */
  private generatePulseTexture(): void {
    if (this.scene.textures.exists('vignette-pulse')) return;
    const w = 512;
    const h = 288;
    const tex = this.scene.textures.createCanvas('vignette-pulse', w, h);
    const ctx = tex?.getContext();
    if (!tex || !ctx) return;
    const grad = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.15,
      w / 2, h / 2, Math.max(w, h) * 0.6,
    );
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }
}
