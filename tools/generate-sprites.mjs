#!/usr/bin/env node
/**
 * AI sprite generator for Boat Shooter.
 *
 * Uses Gemini 2.5 Flash Image (codename "Nano Banana") to generate painterly
 * pirate sprites per the art bible (docs/games/boat-shooter/17-art-bible.md).
 *
 * Reads GEMINI_API_KEY from environment (or first .env found in the existing
 * Bilko projects on this machine).
 *
 * Output: PNG files in apps/games/boat-shooter/assets/sprites/.
 * Each sprite is requested against a locked style reference prompt so the
 * roster reads cohesively.
 *
 * Usage:
 *   GEMINI_API_KEY=... node tools/generate-sprites.mjs            # all
 *   GEMINI_API_KEY=... node tools/generate-sprites.mjs --only=player
 *   GEMINI_API_KEY=... node tools/generate-sprites.mjs --skip-existing
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = join(ROOT, 'apps/games/boat-shooter/assets/sprites');

// Two backends available:
//   - `gemini-2.5-flash-image` (default, codename "Nano Banana"): fast,
//     cheap, conversational, image-to-image capable. Caps at 1024×1024.
//   - `imagen-4.0-generate-001` (via `--imagen`): flagship text-to-image,
//     native up to 2048×2048 at `imageSize: "2K"`. ~3× cost, ~10s each.
const GEMINI_MODEL = 'gemini-2.5-flash-image';
const IMAGEN_MODEL = 'imagen-4.0-generate-001';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const IMAGEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict`;

// ---------- API key discovery ----------
function findApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  // Scan known sibling .env files for a key. Deliberate short-list so we don't
  // accidentally read unrelated secrets.
  const candidates = [
    '/home/bilko/Projects/Archive/Bilko-Archive/.env',
    '/home/bilko/Projects/BGLabs/.env',
    '/home/bilko/Projects/Archive/Content-Grade/.env',
    '/home/bilko/Projects/burrow/.env',
  ];
  for (const p of candidates) {
    try {
      const src = readFileSync(p, 'utf8');
      const m = src.match(/^GEMINI_API_KEY=([^\s#]+)/m);
      if (m && m[1] && m[1].length > 10) return m[1];
    } catch { /* ignore missing */ }
  }
  return null;
}

const API_KEY = findApiKey();
if (!API_KEY) {
  console.error('No GEMINI_API_KEY found in env or scanned .env files.');
  process.exit(2);
}

// ---------- Style reference ----------
// All prompts prepend a style lock so the roster is cohesive (art bible §17).
// The default lock assumes a top-down ship/prop silhouette. Per-batch locks
// override the "orthographic top-down view" clause for projectiles, icons,
// and hazards that read differently.
const STYLE_LOCK =
  'Stylized 2D painterly sprite, hand-drawn look, pirate / Age-of-Sail aesthetic, ' +
  'vibrant tropical palette of teal / sun-bleached wood / gold / crimson, ' +
  'readable silhouette, crisp outline, single centered sprite on a ' +
  'pure-black (#000000) background with alpha=1 background (NOT transparent — solid black), ' +
  'orthographic top-down view, no camera perspective. ' +
  'ABSOLUTELY NO TEXT: do not render any letters, numerals, digits, labels, ' +
  'captions, signage, ship names, dimension markers, watermarks, or any ' +
  'written characters of any kind. Pure visual illustration only. ';

// Projectiles: rotate at runtime, so we want a clean side-aligned silhouette.
const PROJECTILE_STYLE_LOCK =
  'Stylized 2D painterly sprite, hand-drawn look, pirate / Age-of-Sail aesthetic, ' +
  'vibrant tropical palette, readable silhouette at 32x32, crisp outline, single ' +
  'centered sprite on a pure-black (#000000) background with alpha=1 background ' +
  '(NOT transparent — solid black), side-aligned ammunition pointing right, no ' +
  'camera perspective, no text, no watermark. ';

// Scenery: painterly environmental props, top-down with slight 3/4 tilt for depth.
const SCENERY_STYLE_LOCK =
  'Stylized 2D painterly environmental prop, hand-drawn look, pirate / Age-of-Sail ' +
  'aesthetic, tropical palette, readable at 64x64 silhouette, single centered element ' +
  'on a pure-black (#000000) background with alpha=1 background (NOT transparent — ' +
  'solid black), near top-down view, no text, no watermark. ';

// Hazards: top-down at water line with a subtle splash ring.
const HAZARD_STYLE_LOCK =
  'Stylized 2D painterly hazard sprite, hand-drawn look, pirate / Age-of-Sail aesthetic, ' +
  'readable silhouette at 64x64, crisp outline, single centered sprite on a ' +
  'pure-black (#000000) background with alpha=1 background (NOT transparent — solid ' +
  'black), orthographic top-down view, floating at water-line with a faint splash ring, ' +
  'no text, no watermark. ';

// Icons: flat painterly UI icons on dark background — centered, high contrast.
const ICON_STYLE_LOCK =
  'Flat painterly game icon, centered on dark background, high contrast, clean outline, ' +
  'works as a 64x64 menu icon, single centered subject on pure-black (#000000) background ' +
  'with alpha=1 background (NOT transparent — solid black), no text, no watermark. ';

// Enemy bullets (doc 27 §4): small high-contrast silhouettes, single chromatic
// family per kind, readable at 12-16 px in a dense bullet-storm. Rotated at
// runtime so the sprite is authored pointing "forward" (down the screen). A
// unified upper-left light source is enforced so the roster reads as a family.
const BULLET_STYLE_LOCK =
  'Stylized 2D painterly projectile bullet, hand-drawn look, pirate / Age-of-Sail ' +
  'aesthetic, single high-saturation chromatic family, readable silhouette at 16x16, ' +
  'crisp bright outline, single centered sprite on a pure-black (#000000) background ' +
  'with alpha=1 background (NOT transparent — solid black), side-aligned pointing ' +
  'down-toward-viewer with a brief trailing tail above, lighting: soft highlight from ' +
  'upper-left at 45 degrees, no camera perspective, no text, no watermark. ';

// ---------- Sprite manifest ----------
// Loaded from the shared content package so the runtime loader and this
// generator stay in lockstep. Each entry has { id, category, prompt,
// styleLock?, required, preferredGenerator? }; we map it onto the
// generator's old `{ id, prompt, lock }` shape via the STYLE_LOCKS table.
const STYLE_LOCKS = {
  default: STYLE_LOCK,
  projectile: PROJECTILE_STYLE_LOCK,
  scenery: SCENERY_STYLE_LOCK,
  bullet: BULLET_STYLE_LOCK,
};
const MANIFEST_PATH = join(ROOT, 'packages/boat-shooter-content/data/sprites.json');
const MANIFEST = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const SPRITES = MANIFEST.entries.map((e) => ({
  id: e.id,
  prompt: e.prompt,
  lock: STYLE_LOCKS[e.styleLock ?? 'default'],
}));

// ---------- Args ----------
const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith('--only='))?.slice(7);
const skipExisting = args.includes('--skip-existing');
const onlyIds = onlyArg ? onlyArg.split(',').map((s) => s.trim()) : null;
// `--imagen` → route through Imagen 4 at native 2K. Default is Gemini
// 2.5 Flash Image (fast, cheap, 1024 cap). See §29 for the trade-offs.
const useImagen = args.includes('--imagen');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ---------- Generate ----------
async function generateOne(spec) {
  const outPath = join(OUT_DIR, `${spec.id}.png`);
  if (skipExisting && existsSync(outPath)) {
    console.log(`[skip] ${spec.id} (exists)`);
    return { ok: true, skipped: true };
  }
  return useImagen ? generateImagen4(spec, outPath) : generateGemini(spec, outPath);
}

/** Gemini 2.5 Flash Image — fast path, 1024² cap. */
async function generateGemini(spec, outPath) {
  const lock = spec.lock ?? STYLE_LOCK;
  const fullPrompt = lock + spec.prompt;
  const body = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 300)}` };
    }
    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
    if (!imagePart) {
      return { ok: false, error: `No image in response: ${JSON.stringify(json).slice(0, 300)}` };
    }
    const b64 = imagePart.inlineData?.data ?? imagePart.inline_data?.data;
    const buf = Buffer.from(b64, 'base64');
    writeFileSync(outPath, buf);
    return { ok: true, bytes: buf.length };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

/**
 * Imagen 4 — flagship text-to-image, native up to 2048². Uses the
 * `:predict` endpoint with `instances` + `parameters` shape (distinct
 * from Gemini's `generateContent`). `imageSize: "2K"` gets the
 * native 2048×2048 output the user wants.
 */
async function generateImagen4(spec, outPath) {
  const lock = spec.lock ?? STYLE_LOCK;
  const fullPrompt = lock + spec.prompt;
  const body = {
    instances: [{ prompt: fullPrompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '1:1',
      // Both names seen in Imagen docs — sampleImageSize is the current API,
      // imageSize is the older form. Send both so whichever the endpoint
      // honors sticks; extras are silently ignored.
      sampleImageSize: '2K',
      imageSize: '2K',
      personGeneration: 'allow_all',
    },
  };
  try {
    const res = await fetch(IMAGEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 400)}` };
    }
    const json = await res.json();
    const pred = json?.predictions?.[0];
    const b64 = pred?.bytesBase64Encoded ?? pred?.bytes_base64_encoded;
    if (!b64) {
      return { ok: false, error: `No image in response: ${JSON.stringify(json).slice(0, 300)}` };
    }
    const buf = Buffer.from(b64, 'base64');
    writeFileSync(outPath, buf);
    return { ok: true, bytes: buf.length };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

async function main() {
  const targets = onlyIds ? SPRITES.filter((s) => onlyIds.includes(s.id)) : SPRITES;
  const backend = useImagen ? `Imagen 4 (${IMAGEN_MODEL}, 2K)` : `Gemini 2.5 Flash Image (1024)`;
  console.log(`Generating ${targets.length} sprites via ${backend} → ${OUT_DIR}`);
  const results = [];
  // Sequential to avoid rate limiting. Delay between calls.
  for (const spec of targets) {
    process.stdout.write(`[gen] ${spec.id}... `);
    const start = Date.now();
    const r = await generateOne(spec);
    const secs = ((Date.now() - start) / 1000).toFixed(1);
    if (r.ok) {
      console.log(r.skipped ? 'skipped' : `ok (${r.bytes} bytes, ${secs}s)`);
    } else {
      console.log(`FAIL (${secs}s): ${r.error}`);
    }
    results.push({ id: spec.id, ...r });
    // Small gap.
    await new Promise((ok) => setTimeout(ok, 500));
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\nDone. ${results.length - failed.length} ok, ${failed.length} failed.`);
  if (failed.length) {
    console.log('Failed:', failed.map((r) => r.id).join(', '));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
