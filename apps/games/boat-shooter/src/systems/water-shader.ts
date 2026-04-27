import Phaser from 'phaser';
import type { EnvironmentSpec } from '@bilko/boat-shooter-schema';
import type { StageScene } from '../scenes/stage-scene';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants';

/**
 * Water rendering layer.
 *
 * Builds a richer-looking water texture at boot: multi-band teal gradient
 * + small caustic circles procedurally placed. Rendered as a scrolling
 * TileSprite with a secondary tint layer that can be swapped per biome.
 *
 * This is a "runtime canvas shader" — no actual GLSL; we just generate
 * a 256×256 texture procedurally and let Phaser tile + scroll it. For
 * the P4 pass this is a huge visual lift over the flat 64×64 checker.
 */
/**
 * Biome key. `sunlit` is the legacy Act I default. The three Act I
 * sub-variants (`rivermouth` / `channels` / `open-sea`) live alongside
 * it so the first three stages read as distinct places — see
 * docs/games/boat-shooter/20-visual-expansion-act-i.md §3.1.
 */
export type WaterBiome =
  | 'sunlit' | 'fog' | 'night' | 'volcanic'
  | 'rivermouth' | 'channels' | 'open-sea';

interface WaterTint {
  bg: number;
  hi: number;
  mid: number;
  caustic: number;
  tint: number;
  alpha: number;
}

const TINTS: Record<WaterBiome, WaterTint> = {
  sunlit: { bg: 0x0a5a7a, hi: 0x1a7a9a, mid: 0x0a6a85, caustic: 0x8de0ff, tint: 0xffffff, alpha: 1.0 },
  fog: { bg: 0x253540, hi: 0x354a58, mid: 0x2a3e4a, caustic: 0x708090, tint: 0xbfccd2, alpha: 0.95 },
  night: { bg: 0x0a1a2a, hi: 0x1a2a3a, mid: 0x0f2030, caustic: 0x4a66aa, tint: 0x8098c0, alpha: 0.92 },
  volcanic: { bg: 0x1a0a00, hi: 0x4a1a00, mid: 0x2a0e00, caustic: 0xff6a1a, tint: 0xffa068, alpha: 0.95 },
  // Act I sub-variants — shifted hues of sunlit, with distinct accents.
  rivermouth: { bg: 0x2a5a4a, hi: 0x4a8060, mid: 0x3a6a50, caustic: 0xc0e090, tint: 0xe8f0c8, alpha: 1.0 },
  channels: { bg: 0x0e506a, hi: 0x1a7090, mid: 0x0e5e78, caustic: 0x9ae0ff, tint: 0xe8f6ff, alpha: 1.0 },
  'open-sea': { bg: 0x0a4a78, hi: 0x1a709a, mid: 0x0a5a88, caustic: 0xa8f0ff, tint: 0xffffff, alpha: 1.0 },
};

export class WaterShader {
  readonly scene: StageScene;
  readonly sprite: Phaser.GameObjects.TileSprite;
  readonly overlay: Phaser.GameObjects.Rectangle;
  private biome: WaterBiome = 'sunlit';

  constructor(scene: StageScene) {
    this.scene = scene;
    this.ensureTextures();
    this.sprite = scene.add.tileSprite(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      'water-sunlit',
    );
    this.sprite.setDepth(-100);

    // Secondary tint layer — cheap biome overlay.
    this.overlay = scene.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0xffffff, 0);
    this.overlay.setDepth(-99);
    this.overlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.setBiome('sunlit');
  }

  setBiome(biome: WaterBiome): void {
    this.biome = biome;
    const key = `water-${biome}`;
    if (!this.scene.textures.exists(key)) {
      this.generateWaterTexture(key, TINTS[biome]);
    }
    this.sprite.setTexture(key);
    const t = TINTS[biome];
    this.overlay.setFillStyle(t.tint, 1 - t.alpha);
  }

  /**
   * Data-driven path: bake / activate a water variant from an EnvironmentSpec.
   * The env's `waterPaletteHex` array is mapped into the same WaterTint shape
   * (bg/hi/mid/caustic/tint), reusing the bake routine so admin edits to the
   * env JSON yield a brand-new water texture without code changes.
   *
   * Texture key is namespaced `water-env-<id>` to avoid collisions with the
   * legacy biome-keyed bakes. If the schema's biome maps cleanly onto the
   * legacy WaterBiome union we still record that mapping in `this.biome`
   * so consumers like `currentBiome()` keep returning a meaningful tag.
   */
  setEnvironment(env: EnvironmentSpec): void {
    const tint = tintFromEnv(env);
    const key = `water-env-${env.id}`;
    if (!this.scene.textures.exists(key)) {
      this.generateWaterTexture(key, tint);
    }
    this.sprite.setTexture(key);
    this.overlay.setFillStyle(tint.tint, 1 - tint.alpha);
    this.biome = mapEnvBiomeToWaterBiome(env);
  }

  /** Scroll the water each frame; called by StageScene. */
  scroll(deltaMs: number, speedPxPerSec: number): void {
    this.sprite.tilePositionY -= (speedPxPerSec * deltaMs) / 1000;
  }

  currentBiome(): WaterBiome {
    return this.biome;
  }

  private ensureTextures(): void {
    // Pre-bake the sunlit default at boot; others are lazy on setBiome.
    if (!this.scene.textures.exists('water-sunlit')) {
      this.generateWaterTexture('water-sunlit', TINTS.sunlit);
    }
  }

  private generateWaterTexture(key: string, t: WaterTint): void {
    // Bumped 1024 → 2048 for retina-crisp ripples (plan §4.2). Tile display
    // size stays the same — we just feed Phaser a higher-fidelity source, so
    // the repeat is effectively invisible at 2× display density. Cost is ≈3MB
    // RAM per baked biome.
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const rand = mulberry32(seedFromString(key));

    // Flat base fill — no big gradient, so the texture tiles cleanly.
    ctx.fillStyle = toHexStr(t.bg);
    ctx.fillRect(0, 0, size, size);

    // Seamless tileable draw: stamp each element three times (left/right/center
    // and above/below wraps) so anything that crosses the edge reappears on
    // the opposite side with no visible seam.
    const stamp = (fn: (x: number, y: number) => void, x: number, y: number): void => {
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          fn(x + dx, y + dy);
        }
      }
    };

    // Soft horizontal ripple streaks — gentler alpha, more of them so the
    // surface reads as "lots of small calm waves" not "few harsh bands".
    for (let i = 0; i < 36; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const rx = 110 + rand() * 200;
      const ry = 3 + rand() * 7;
      const a = 0.04 + rand() * 0.07; // halved from previous max 0.20
      stamp((x, y) => {
        ctx.save();
        ctx.translate(x, y);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        rg.addColorStop(0, toRgba(t.caustic, a));
        rg.addColorStop(1, toRgba(t.caustic, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }, cx, cy);
    }

    // Mid-frequency tiny ripple lines — pixel-level grain that gives the
    // texture density the user asked for, without being busy.
    for (let i = 0; i < 220; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const w = 6 + rand() * 14;
      const a = 0.05 + rand() * 0.05;
      stamp((x, y) => {
        ctx.fillStyle = toRgba(t.hi, a);
        ctx.fillRect(x - w / 2, y, w, 1);
      }, cx, cy);
    }

    // Very sparse specular glints — only a handful, low alpha so they don't
    // strobe as the texture scrolls.
    for (let i = 0; i < 6; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      stamp((x, y) => {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 18);
        glow.addColorStop(0, toRgba(0xffffff, 0.16));
        glow.addColorStop(1, toRgba(0xffffff, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(x - 18, y - 18, 36, 36);
        ctx.fillStyle = toRgba(0xffffff, 0.28);
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }, cx, cy);
    }

    // Per-biome accent pass — silt / shadow bands / whitecap glints.
    // Keyed off the texture name so the branch is stable per bake.
    if (key === 'water-rivermouth') {
      // Ochre silt specks — small, dim, clustered mid-texture.
      for (let i = 0; i < 180; i++) {
        const cx = rand() * size;
        const cy = rand() * size;
        const a = 0.06 + rand() * 0.08;
        stamp((x, y) => {
          ctx.fillStyle = toRgba(0xc49c4a, a);
          ctx.fillRect(x, y, 1 + rand() * 2, 1 + rand() * 2);
        }, cx, cy);
      }
    } else if (key === 'water-channels') {
      // Darker mid-band stripes — simulates bank shadows across the channel.
      for (let i = 0; i < 8; i++) {
        const cy = rand() * size;
        const h = 40 + rand() * 80;
        stamp((x, y) => {
          const g = ctx.createLinearGradient(0, y, 0, y + h);
          g.addColorStop(0, toRgba(0x000000, 0));
          g.addColorStop(0.5, toRgba(0x000000, 0.12));
          g.addColorStop(1, toRgba(0x000000, 0));
          ctx.fillStyle = g;
          ctx.fillRect(x - size, y, size * 3, h);
        }, 0, cy);
      }
    } else if (key === 'water-open-sea') {
      // Whitecap glints — bright short specks.
      for (let i = 0; i < 120; i++) {
        const cx = rand() * size;
        const cy = rand() * size;
        const w = 6 + rand() * 10;
        const a = 0.35 + rand() * 0.25;
        stamp((x, y) => {
          ctx.fillStyle = toRgba(0xffffff, a);
          ctx.fillRect(x - w / 2, y, w, 1);
          ctx.fillStyle = toRgba(0xffffff, a * 0.6);
          ctx.fillRect(x - w / 3, y + 1, (w * 2) / 3, 1);
        }, cx, cy);
      }
    }

    // Subtle grain breaks up flat color banding without affecting tiling.
    const img = ctx.getImageData(0, 0, size, size);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (rand() - 0.5) * 6;
      data[i]     = Math.max(0, Math.min(255, (data[i]     ?? 0) + n));
      data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] ?? 0) + n));
      data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] ?? 0) + n));
    }
    ctx.putImageData(img, 0, 0);

    this.scene.textures.addCanvas(key, canvas);
  }
}

/**
 * Map an EnvironmentSpec.biome (schema's wider union) onto the legacy
 * WaterBiome union so consumers like `currentBiome()` keep returning a
 * meaningful tag for code that still branches on biome.
 */
function mapEnvBiomeToWaterBiome(env: EnvironmentSpec): WaterBiome {
  switch (env.biome) {
    case 'rivermouth': return 'rivermouth';
    case 'inland':     return 'channels';
    case 'delta':
    case 'open-sea':   return 'open-sea';
    case 'cursed':     return 'night';
    case 'volcanic':   return 'volcanic';
    case 'frozen':
    case 'storm':      return 'fog';
    default:           return 'sunlit';
  }
}

/**
 * Build a WaterTint from the env's hex palette. Index layout:
 *   [0] bg, [1] hi, [2] mid, [3] caustic, [4] tint
 * Shorter arrays cycle (bg→hi→mid→caustic→tint) so an admin can ship a
 * 3-color env and still get a sensible bake. Alpha 1.0 for clear/clean
 * biomes, lower for foggy/night to keep the multiply overlay subtle.
 */
function tintFromEnv(env: EnvironmentSpec): WaterTint {
  const pal = env.waterPaletteHex;
  const at = (i: number): number => parseHexColor(pal[i % Math.max(1, pal.length)] ?? '#0a5a7a');
  const alpha =
    env.biome === 'cursed' || env.biome === 'storm' ? 0.92 :
    env.biome === 'volcanic' ? 0.95 :
    env.fogOpacity > 0.4 ? 0.95 : 1.0;
  return {
    bg: at(0),
    hi: at(1),
    mid: at(2),
    caustic: at(3),
    tint: at(4),
    alpha,
  };
}

function parseHexColor(s: string): number {
  const cleaned = s.startsWith('#') ? s.slice(1) : s;
  return parseInt(cleaned, 16);
}

function toHexStr(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}
function toRgba(hex: number, a: number): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

/* Small deterministic PRNG so the same biome gets the same pattern. */
function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
