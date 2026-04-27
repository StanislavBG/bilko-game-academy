import type { StageScene } from '../scenes/stage-scene';
import type { SpriteManifestEntry } from '@bilko/boat-shooter-schema';
import { getActivePack } from '../content/active-pack';

/**
 * Sprite loader + chroma-key pipeline.
 *
 * Our AI-generated sprites (tools/generate-sprites.mjs) come out as PNG on a
 * solid pure-black background. Phaser's default PNG load keeps those pixels,
 * so we post-process each texture after load: convert near-black pixels to
 * transparent.
 *
 * The manifest lives in the active ContentPack (bundled defaults overlaid
 * with the content server's response at boot). When `opts.serverUrl` is
 * supplied to `preloadSprites`, individual sprite URLs flip from the
 * bundled `${BASE_URL}boat-shooter-sprites/<id>.png` to the server's
 * `${serverUrl}/v1/sprite/<id>.png` — chroma-key + fallback handling are
 * unchanged.
 */

// Vite rewrites `import.meta.env.BASE_URL` at build time to whatever
// the shell's `base` config is (`/` locally, `/bilko-game-academy/` on
// GitHub Pages). Cast-read it because this package doesn't ship Vite's
// ambient types — the shell package does, and that's where the Vite
// transform runs anyway.
const BASE_URL =
  (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
const BUNDLED_SPRITE_BASE = `${BASE_URL}boat-shooter-sprites/`;

export interface SpriteDef {
  key: string;
  url: string;
}

export interface PreloadSpritesOpts {
  /** When set, sprites load from `${serverUrl}/v1/sprite/<id>.png`. */
  serverUrl?: string;
}

// Set once at boot in index.ts; sprite-loader callers (StageScene.preload)
// don't take the boot's env reader as a dependency, so we cache it here.
let CACHED_SERVER_URL: string | undefined;
export function setSpriteServerUrl(url: string | undefined): void {
  CACHED_SERVER_URL = url && url.length > 0 ? url : undefined;
}

function urlFor(entryId: string, serverUrl: string | undefined): string {
  if (serverUrl && serverUrl.length > 0) {
    return `${serverUrl.replace(/\/$/, '')}/v1/sprite/${entryId}.png`;
  }
  return `${BUNDLED_SPRITE_BASE}${entryId}.png`;
}

const toSpriteDef = (e: SpriteManifestEntry, serverUrl: string | undefined): SpriteDef => ({
  key: `sprite-${e.id}`,
  url: urlFor(e.id, serverUrl),
});

/** Preload all sprites in one call from a scene's preload(). */
export function preloadSprites(scene: StageScene, opts: PreloadSpritesOpts = {}): void {
  const entries = getActivePack().sprites.entries;
  const required = entries.filter((e) => e.required);
  const optional = entries.filter((e) => !e.required);

  const serverUrl = opts.serverUrl ?? CACHED_SERVER_URL;
  const requiredDefs = required.map((e) => toSpriteDef(e, serverUrl));
  const optionalDefs = optional.map((e) => toSpriteDef(e, serverUrl));
  // O(n) lookup via Set so the loaderror handler knows which missing
  // files are non-fatal and should be silently dropped.
  const optionalKeys = new Set(optionalDefs.map((s) => s.key));

  for (const s of requiredDefs) {
    scene.load.image(s.key, s.url);
  }
  // Optional AI-generated sprite batches (plan §5 C–F + per-ship variants +
  // PRD 4 enemies + bullet families). Each entity system prefers its sprite
  // when `hasSprite(...)` is true and falls back to the procedural draw
  // otherwise, so a missing PNG is a non-fatal condition.
  for (const s of optionalDefs) {
    scene.load.image(s.key, s.url);
  }
  // Phaser emits `filecomplete` (key, type, data) for every asset; filter to
  // sprite images. (The more specific `filecomplete-image-<key>` variant only
  // exists per-key, so the generic event is the right hook for batch loads.)
  scene.load.on('filecomplete', (key: string, type: string) => {
    if (type !== 'image') return;
    if (!key.startsWith('sprite-')) return;
    chromaKeyBlackToTransparent(scene, key);
  });
  // If an optional file is missing Phaser emits `loaderror` — swallow those
  // so the run continues with the procedural fallback, and don't spam the
  // console.
  scene.load.on('loaderror', (file: { key: string }) => {
    if (optionalKeys.has(file.key)) {
      scene.textures.remove(file.key);
    }
  });
}

/** Returns true if a sprite texture exists (means the file was found + loaded). */
export function hasSprite(scene: StageScene, key: string): boolean {
  return scene.textures.exists(key);
}

/**
 * Replace ~black pixels with transparent. Runs after the PNG decodes.
 * Threshold = 24: any pixel with R+G+B ≤ 72 (dark black/near-black) → alpha 0.
 * We also scale down high alpha on the remaining-near-black pixels to avoid
 * fringing at the edges of the silhouette.
 */
function chromaKeyBlackToTransparent(scene: StageScene, key: string): void {
  const tex = scene.textures.get(key);
  if (!tex) return;
  const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const h = 'naturalHeight' in src ? src.naturalHeight : src.height;
  if (!w || !h) return;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(src as CanvasImageSource, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // Pass 1: knock dark pixels (the black background) to transparent.
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] ?? 0;
    const g = d[i + 1] ?? 0;
    const b = d[i + 2] ?? 0;
    const brightness = r + g + b;
    if (brightness <= 24) {
      d[i + 3] = 0; // fully transparent
    } else if (brightness <= 80) {
      // Edge anti-alias zone — scale alpha with brightness.
      const a = d[i + 3] ?? 255;
      d[i + 3] = Math.floor(a * ((brightness - 24) / 56));
    }
  }
  // Pass 2 (PRD 1) — anti-fringe on WHITE outline pixels. Painterly
  // sprites often have very-bright (R+G+B > 700) edge highlights that
  // survive Pass 1 and read as a white halo. If such a pixel sits next
  // to a now-transparent neighbor, attenuate its alpha to 0.4× so the
  // halo softens. Cost: 1 extra pass per loaded sprite at boot, O(w*h).
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = d[i] ?? 0;
      const g = d[i + 1] ?? 0;
      const b = d[i + 2] ?? 0;
      const a = d[i + 3] ?? 0;
      if (a < 255) continue;
      if (r + g + b < 700) continue;
      // Bright pixel — check if any neighbor is now transparent.
      let touchesAlpha0 = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const nAlpha = d[(ny * w + nx) * 4 + 3] ?? 0;
        if (nAlpha === 0) { touchesAlpha0 = true; break; }
      }
      if (touchesAlpha0) {
        d[i + 3] = Math.floor(a * 0.4);
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  // Replace the texture source with our transparent canvas.
  scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}
