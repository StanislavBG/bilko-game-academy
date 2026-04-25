import type { StageScene } from '../scenes/stage-scene';

/**
 * Sprite loader + chroma-key pipeline.
 *
 * Our AI-generated sprites (tools/generate-sprites.mjs) come out as PNG on a
 * solid pure-black background. Phaser's default PNG load keeps those pixels,
 * so we post-process each texture after load: convert near-black pixels to
 * transparent.
 *
 * The manifest is the single source of truth for which sprites exist + their
 * in-game sprite keys.
 */

// Vite rewrites `import.meta.env.BASE_URL` at build time to whatever
// the shell's `base` config is (`/` locally, `/bilko-game-academy/` on
// GitHub Pages). Cast-read it because this package doesn't ship Vite's
// ambient types — the shell package does, and that's where the Vite
// transform runs anyway.
const BASE_URL =
  (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
const SPRITE_BASE = `${BASE_URL}boat-shooter-sprites/`;

export interface SpriteDef {
  key: string;
  url: string;
}

/**
 * Core sprites — always expected to be on disk. Missing files log an error
 * (visible in console) but the game survives via each subsystem's fallback.
 */
const CORE_SPRITE_IDS: readonly string[] = [
  'player',
  'scout-skiff', 'patrol-gunboat', 'ramming-brigand', 'mortar-barge',
  'bank-sniper-tower', 'broadside-cutter', 'grappling-boarders',
  'powder-keg-kamikaze', 'ghost-ship', 'sea-serpent', 'kraken-tentacle',
  'cursed-swarm', 'bank-bandits', 'mine-layer',
  'frigate-captain', 'pirate-champion', 'banshee-galleon',
  'delta-commodore', 'pirate-king', 'ghost-commodore', 'drowned-admiralty',
  'obsidian-warlord', 'kraken-ancient',
  'coin-small', 'coin-medium', 'coin-large', 'gem', 'xp-orb',
  'chest-wooden', 'chest-silver', 'chest-gold', 'chest-cursed', 'chest-shipwright',
];

/**
 * Optional sprites — loaded opportunistically (plan doc §5 Batches C/D/E/F).
 * If a PNG doesn't exist yet, the loader silently removes the key and the
 * entity system falls back to its procedural draw.
 *
 * Sprite keys use the `sprite-<id>` convention; PNG filenames use `<id>.png`.
 */
const PROJECTILE_IDS: readonly string[] = [
  'proj-cannonball', 'proj-broadside-shell', 'proj-harpoon',
  'proj-musket-ball', 'proj-lightning-orb', 'proj-frost-mortar',
  'proj-ember-mortar', 'proj-ghost-bolt',
];

const SCENERY_IDS: readonly string[] = [
  'scenery-reed-clump', 'scenery-grass-tuft', 'scenery-river-log',
  'scenery-mud-bar', 'scenery-stone-marker', 'scenery-mangrove-bank',
  'scenery-mangrove-root', 'scenery-dock-plank', 'scenery-debris-crate',
  'scenery-fleet-silhouette', 'scenery-blockade-line', 'scenery-wreckage',
];

const HAZARD_IDS: readonly string[] = [
  'hazard-rock-small', 'hazard-rock-large', 'hazard-barrel',
  'hazard-ice-patch', 'hazard-oil-slick', 'hazard-mine',
];

/**
 * Enemy bullet sprites — one per damage family per the arcade-asset pass
 * (docs/games/boat-shooter/27-arcade-asset-research.md §4). Each enemy that
 * spawns a bullet through `spawnEnemyBullet` can pass a `bulletKind` which
 * maps to `sprite-bullet-<kind>`. A tinted-circle fallback is used if the
 * PNG is missing, so runs never break.
 */
const BULLET_IDS: readonly string[] = [
  'bullet-musket', 'bullet-cannon', 'bullet-sniper', 'bullet-shadow',
  'bullet-venom', 'bullet-fire', 'bullet-frost', 'bullet-storm',
];

const ICON_IDS: readonly string[] = [
  // Weapons (13)
  'icon-bow-cannon', 'icon-broadside', 'icon-harpoon', 'icon-chain-lightning',
  'icon-flamethrower', 'icon-lighthouse-beam', 'icon-mortar',
  'icon-fire-arrow-rain', 'icon-kraken-ink', 'icon-spinning-axes',
  'icon-homing-musket', 'icon-stern-mines', 'icon-ghost-crew',
  // Passives (8)
  'icon-crows-nest', 'icon-copper-hull', 'icon-storm-compass',
  'icon-powder-barrel', 'icon-first-mate', 'icon-cargo-nets',
  'icon-spyglass', 'icon-admirals-flag',
];

export const SPRITES: readonly SpriteDef[] = CORE_SPRITE_IDS.map((id) => ({
  key: `sprite-${id}`,
  url: `${SPRITE_BASE}${id}.png`,
}));

/** Optional sprite keys that tolerate missing files (plan §5 batches C–F + doc 27 bullets). */
const OPTIONAL_SPRITE_IDS: readonly string[] = [
  ...PROJECTILE_IDS,
  ...SCENERY_IDS,
  ...HAZARD_IDS,
  ...ICON_IDS,
  ...BULLET_IDS,
];

const OPTIONAL_SPRITES: readonly SpriteDef[] = OPTIONAL_SPRITE_IDS.map((id) => ({
  key: `sprite-${id}`,
  url: `${SPRITE_BASE}${id}.png`,
}));

/** Preload all sprites in one call from a scene's preload(). */
export function preloadSprites(scene: StageScene): void {
  for (const s of SPRITES) {
    scene.load.image(s.key, s.url);
  }
  // Opportunistic per-ship regenerated variants — if `tools/generate-sprites.mjs`
  // produced a themed PNG for a ship, the loader uses it directly and the
  // compositor's fallback bake is skipped (see ship-compositor.ts).
  const shipIds = ['ember-corsair', 'tempest-fury', 'frostbound', 'verdant-tide', 'nightwake'];
  for (const id of shipIds) {
    scene.load.image(`sprite-player-${id}`, `${SPRITE_BASE}player-${id}.png`);
  }
  // Optional AI-generated sprite batches (plan §5 C–F). Each entity system
  // prefers its sprite when `hasSprite(...)` is true and falls back to the
  // procedural draw otherwise, so a missing PNG is a non-fatal condition.
  for (const s of OPTIONAL_SPRITES) {
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
  // Per-ship variants + optional Batch C/D/E/F sprites are optional; if a file
  // is missing Phaser emits `loaderror` — swallow those so the run continues
  // with the procedural fallback, and don't spam the console.
  const optionalPrefixes = [
    'sprite-player-',
    'sprite-proj-',
    'sprite-scenery-',
    'sprite-hazard-',
    'sprite-icon-',
    'sprite-bullet-',
  ];
  scene.load.on('loaderror', (file: { key: string }) => {
    if (optionalPrefixes.some((p) => file.key.startsWith(p))) {
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
  ctx.putImageData(img, 0, 0);

  // Replace the texture source with our transparent canvas.
  scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}
