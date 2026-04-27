import type { StageScene } from '../scenes/stage-scene';
import type { ShipId } from '../data/starting-ships';
import { getShipConfig, getShipConfigs } from '../data/starting-ships';

/**
 * Ship compositor — Path A of the "one-ship sprite" strategy.
 *
 * The Gemini-generated `sprite-player` is a single painterly bitmap of
 * a top-down pirate ship. For each elemental ship, we bake a tinted +
 * overlaid variant of that bitmap at boot (`sprite-player-<shipId>`).
 *
 * The Player entity then renders as ONE Phaser Image using the variant
 * texture — no more 30-primitive collage. Only motion (flag, lantern,
 * ambient element burst) stays as tiny overlay primitives on top.
 *
 * Variant cache is scene-local via the texture manager; if a variant
 * already exists it's not re-baked.
 *
 * Path B (a proper Gemini regeneration for each element) produces its
 * own `sprite-player-<id>` PNGs under `public/boat-shooter-sprites/`;
 * the loader picks those up first and the compositor runs as a fallback
 * only when the regenerated asset is missing.
 */

export function ensureShipVariants(scene: StageScene): void {
  const base = scene.textures.get('sprite-player');
  if (!base || base.key === '__MISSING') return;

  for (const id of Object.keys(getShipConfigs()) as ShipId[]) {
    const key = `sprite-player-${id}`;
    // If the Gemini pipeline produced a ready-made PNG for this ship,
    // the sprite-loader already registered it and we skip compositing.
    if (scene.textures.exists(key)) continue;

    try {
      bakeVariant(scene, id, key);
    } catch (err) {
      // Non-fatal: if canvas access fails (edge-case reloads), the ship
      // falls back to the base player sprite.
      console.warn(`[ship-compositor] could not bake ${key}:`, err);
    }
  }
}

function bakeVariant(scene: StageScene, shipId: ShipId, outKey: string): void {
  const base = scene.textures.get('sprite-player');
  const src = base.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const h = 'naturalHeight' in src ? src.naturalHeight : src.height;
  if (!w || !h) return;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cfg = getShipConfig(shipId);

  // 1. Draw the base ship.
  ctx.drawImage(src as CanvasImageSource, 0, 0);

  // 2. Hull-tint pass — multiply the mid hull color over the whole ship,
  //    then source-atop a subtle darken to deepen the shadows. Using
  //    source-atop guarantees we only tint visible pixels (alpha>0).
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = hexRgba(cfg.hullTriad[1], 0.42);
  ctx.fillRect(0, 0, w, h);

  // 3. Specular pass — additive highlight in the upper-left so every
  //    ship reads with the same light direction (top-left sun).
  ctx.globalCompositeOperation = 'lighter';
  const hi = ctx.createRadialGradient(w * 0.4, h * 0.25, w * 0.08, w * 0.5, h * 0.5, w * 0.6);
  hi.addColorStop(0, 'rgba(255,255,255,0.22)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(0, 0, w, h);

  // 4. Element-specific overlays painted on top of the tinted hull.
  ctx.globalCompositeOperation = 'source-over';
  paintElementOverlays(ctx, shipId, w, h);

  // 5. Ghost ships (Nightwake) get a semi-transparent pass so the hull
  //    reads as ethereal without breaking the silhouette.
  if (cfg.element === 'shadow') {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';

  scene.textures.addCanvas(outKey, canvas);
}

/**
 * Per-element decoration pass painted on top of the tinted base. All
 * draws respect the ship's existing silhouette by using multiply/atop
 * modes where needed.
 */
function paintElementOverlays(
  ctx: CanvasRenderingContext2D,
  shipId: ShipId,
  w: number,
  h: number,
): void {
  switch (shipId) {
    case 'ember-corsair': {
      // Soft ember glow around the hull + a small flame crest at the bow.
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(w / 2, h * 0.55, w * 0.12, w / 2, h * 0.55, w * 0.38);
      glow.addColorStop(0, 'rgba(255,110,40,0.28)');
      glow.addColorStop(1, 'rgba(255,110,40,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      // Flame crest (at the bow-top of the sprite).
      ctx.globalCompositeOperation = 'source-over';
      drawFlame(ctx, w / 2, h * 0.22, w * 0.06);
      break;
    }
    case 'tempest-fury': {
      // Cool silver rim + a forked lightning bolt overlay.
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(w / 2, h * 0.5, w * 0.1, w / 2, h * 0.5, w * 0.42);
      glow.addColorStop(0, 'rgba(160,200,255,0.22)');
      glow.addColorStop(1, 'rgba(160,200,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      drawLightning(ctx, w * 0.5, h * 0.2, w * 0.07);
      break;
    }
    case 'frostbound': {
      // Icy rim + 3 frost crystals on the hull.
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(w / 2, h * 0.55, w * 0.12, w / 2, h * 0.55, w * 0.44);
      glow.addColorStop(0, 'rgba(200,240,255,0.32)');
      glow.addColorStop(1, 'rgba(200,240,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      drawCrystal(ctx, w * 0.5, h * 0.21, w * 0.05);
      drawCrystal(ctx, w * 0.36, h * 0.62, w * 0.035);
      drawCrystal(ctx, w * 0.64, h * 0.62, w * 0.035);
      break;
    }
    case 'verdant-tide': {
      // Warm amber glow + trailing vine wrap across the hull mid.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.strokeStyle = 'rgba(90,130,50,0.85)';
      ctx.lineWidth = w * 0.007;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.32, h * 0.62);
      ctx.bezierCurveTo(w * 0.42, h * 0.55, w * 0.58, h * 0.70, w * 0.68, h * 0.60);
      ctx.stroke();
      // Leaves along the vine.
      for (let i = 0; i < 5; i++) {
        const t = 0.3 + i * 0.1;
        const x = w * (0.32 + (0.68 - 0.32) * t);
        const y = h * (0.62 + Math.sin(t * Math.PI) * -0.06);
        drawLeaf(ctx, x, y, w * 0.015);
      }
      ctx.globalCompositeOperation = 'source-over';
      // Small carved boar head at the bow.
      drawBoarHead(ctx, w / 2, h * 0.23, w * 0.055);
      break;
    }
    case 'nightwake': {
      // Pale cyan will-o-wisp glow + skeletal hand at the bow.
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(w / 2, h * 0.55, w * 0.1, w / 2, h * 0.55, w * 0.42);
      glow.addColorStop(0, 'rgba(170,240,200,0.32)');
      glow.addColorStop(1, 'rgba(170,240,200,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      drawSkeletalHand(ctx, w / 2, h * 0.22, w * 0.05);
      break;
    }
  }
}

function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const g = ctx.createRadialGradient(x, y, s * 0.2, x, y, s);
  g.addColorStop(0, 'rgba(255,230,120,0.95)');
  g.addColorStop(0.6, 'rgba(255,120,40,0.75)');
  g.addColorStop(1, 'rgba(255,40,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 0.5, x + s * 0.6, y + s * 0.6, x, y + s * 0.8);
  ctx.bezierCurveTo(x - s * 0.6, y + s * 0.6, x - s * 0.7, y - s * 0.5, x, y - s);
  ctx.closePath();
  ctx.fill();
  // White-hot core.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.05, s * 0.18, s * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLightning(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = s * 0.22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y - s);
  ctx.lineTo(x + s * 0.1, y - s * 0.1);
  ctx.lineTo(x - s * 0.1, y - s * 0.1);
  ctx.lineTo(x + s * 0.3, y + s * 0.8);
  ctx.stroke();
  // Glow halo.
  ctx.strokeStyle = 'rgba(170,220,255,0.55)';
  ctx.lineWidth = s * 0.5;
  ctx.stroke();
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = 'rgba(210,240,255,0.92)';
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.6, y);
  ctx.lineTo(x, y + s * 0.8);
  ctx.lineTo(x - s * 0.6, y);
  ctx.closePath();
  ctx.fill();
  // Inner highlight.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.8);
  ctx.lineTo(x + s * 0.15, y - s * 0.2);
  ctx.lineTo(x - s * 0.15, y - s * 0.2);
  ctx.closePath();
  ctx.fill();
  // Outline.
  ctx.strokeStyle = 'rgba(60,100,130,0.85)';
  ctx.lineWidth = s * 0.08;
  ctx.stroke();
}

function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = 'rgba(90,140,50,0.9)';
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.5, Math.PI * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,70,20,0.85)';
  ctx.lineWidth = s * 0.1;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.7, y + s * 0.3);
  ctx.lineTo(x + s * 0.7, y - s * 0.3);
  ctx.stroke();
}

function drawBoarHead(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  // Rounded head (brown).
  ctx.fillStyle = 'rgba(80,50,20,0.95)';
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.fill();
  // Snout.
  ctx.fillStyle = 'rgba(60,35,15,0.95)';
  ctx.beginPath();
  ctx.arc(x, y - s * 0.5, s * 0.55, 0, Math.PI * 2);
  ctx.fill();
  // Tusks.
  ctx.fillStyle = 'rgba(230,220,180,0.95)';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y - s * 0.3);
  ctx.lineTo(x - s * 0.3, y - s * 0.9);
  ctx.lineTo(x - s * 0.15, y - s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.5, y - s * 0.3);
  ctx.lineTo(x + s * 0.3, y - s * 0.9);
  ctx.lineTo(x + s * 0.15, y - s * 0.3);
  ctx.closePath();
  ctx.fill();
  // Eyes.
  ctx.fillStyle = 'rgba(255,220,80,0.9)';
  ctx.beginPath();
  ctx.arc(x - s * 0.35, y + s * 0.1, s * 0.1, 0, Math.PI * 2);
  ctx.arc(x + s * 0.35, y + s * 0.1, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawSkeletalHand(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  // Forearm.
  ctx.fillStyle = 'rgba(220,220,230,0.95)';
  ctx.fillRect(x - s * 0.15, y, s * 0.3, s);
  // Knuckle row.
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(x + i * s * 0.18, y - s * 0.05, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  // Gold band at the wrist.
  ctx.fillStyle = 'rgba(255,216,90,0.95)';
  ctx.fillRect(x - s * 0.22, y + s * 0.35, s * 0.44, s * 0.14);
  // Outline + shadow on arm.
  ctx.strokeStyle = 'rgba(40,40,50,0.85)';
  ctx.lineWidth = s * 0.04;
  ctx.strokeRect(x - s * 0.15, y, s * 0.3, s);
}

function hexRgba(hex: number, a: number): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}
