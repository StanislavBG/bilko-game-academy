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
const SPRITES = [
  // Player ship — fallback/base silhouette used when no elemental variant
  // is loaded. Regen'd 2026-04-24 with the high-density retina prompt + a
  // richer spec so the base ship matches the quality of the 5 variants.
  { id: 'player', prompt: "Viewed STRAIGHT DOWN from directly above (90° overhead orthographic, NOT isometric, NOT 3/4, NOT side view). A nimble top-down player pirate sloop seen from above, the hero's default vessel: sun-bleached oak hull as an elongated pointed oval (bow at the BOTTOM of the frame, stern at the top), gold trim along both gunwales, crisp painterly plank-line detail running bow-to-stern, a single mast at dead-center with a white mainsail lying FLAT on the deck (the sail shows a small gold anchor emblem), two small dark-iron cannons peeking from each side (4 total), a crimson red-and-white captain's pennant at the stern tip, tiny gold figurehead at the bow tip. Top-left sunlight casts a soft shadow to the lower-right. Extremely detailed painterly brushwork, ultra-sharp outline, maximum retina density, square 2048x2048 canvas at 2× pixel density (retina-crisp, full resolution, maximum detail), painterly brushwork, ultra-sharp outlines, solid pure-black background." },
  // Enemies — Navy (Batch A refresh: prompts rewritten to match the current
  // player STYLE_LOCK palette — richer painterly modeling, more crimson and
  // sun-bleached wood cues so the roster reads cohesively next to the player
  // sprite refresh. Old prompts preserved below for reference.)
  // OLD: 'Top-down small single-masted Navy scout skiff, red-and-white sail, tiny hull, looks fast and fragile. Bow pointing down (enemy faces player).'
  { id: 'scout-skiff', prompt: "Top-down single-masted Navy scout sloop 'Herald', slender brown-oak hull with painterly wood-grain, crimson-and-cream striped mainsail, tiny gold trim at the bow, one small swivel gun on the foredeck, painted-on red waterline. Bow pointing down. Single centered sprite, painterly 1024x1024, solid black background." },
  // OLD: 'Top-down Navy patrol gunboat, navy-blue hull with white trim, 4 cannons per side, sturdy. Bow pointing down.'
  { id: 'patrol-gunboat', prompt: "Top-down Navy patrol gunboat 'Bastion', sturdy midnight-blue hull with gold pinstripe and white trim, 4 cannons per side with visible gun-ports, rolled white mainsail on a single mast, red Navy pennant at the stern, painterly weathering. Bow pointing down. Single centered sprite, painterly 1024x1024, solid black background." },
  // OLD: 'Top-down slow wide Navy mortar barge, dark green hull, huge central mortar tube, armored plates.'
  { id: 'mortar-barge', prompt: "Top-down wide slow Navy mortar barge, squat olive-green ironclad deck with crimson-accented armor plates and riveted edges, huge central mortar tube pointing up with a brass firing collar, sandbag emplacements around the mortar, faint steam vent at the rear. Bow pointing down. Single centered sprite, painterly 1024x1024, solid black background." },
  // OLD: 'Top-down Navy sniper watchtower on a riverbank rocky plinth, wooden tower with red flag and small sniper slit, sandbag perimeter.'
  { id: 'bank-sniper-tower', prompt: 'Top-down Navy sniper watchtower on a rocky riverbank plinth, weathered sun-bleached wooden tower with shingled roof, small sniper slit facing camera, crimson Navy pennant flying above, stacked sandbags at the base, mossy rocks and tide-line splash around the plinth. Single centered sprite, painterly 1024x1024, solid black background.' },
  // Navy mini-boss
  // Regen 3: strip faction word "Navy" from the prompt — Imagen paints
  // it as literal text on the pennant. Use "royal fleet" flavor instead.
  { id: 'frigate-captain', prompt: "Viewed STRAIGHT DOWN from directly above (90° overhead orthographic, like a ship chart — NOT isometric, NOT 3/4, NOT side view). A large royal fleet frigate flagship seen from above: elongated sun-bleached-oak hull with crimson-and-gold pinstripe along both gunwales, three masts with white furled mainsails lying FLAT along the deck centerline, 10 cannons per side with gun-ports, ornate stern cabin with gold filigree at the TOP edge, bow points DOWN the page with a small gold eagle figurehead at the BOTTOM. A small plain red pennant — no writing, no letters, no insignia — flat on the deck. Top-left sunlight casts a soft shadow to the lower-right. Boss-scale, painterly, solid black background." },
  // Enemies — Pirates
  // OLD: 'Top-down small pirate ramming skiff with a metal spike prow, tattered black sail, blood-red hull.'
  // Regen 2: explicit "straight down from directly above" to fix the 3/4-perspective drift — see doc 27.
  { id: 'ramming-brigand', prompt: 'Viewed STRAIGHT DOWN from directly above (90° overhead orthographic, like a naval chart or floor plan — NOT isometric, NOT 3/4, NOT side view). A small pirate ramming skiff seen from above: blood-red painterly hull as a pointed oval, dark charcoal plank lines running bow-to-stern, huge iron spike prow jutting from the BOTTOM of the sprite (bow points down the page). Tiny furled black sail lying FLAT on the deck centerline with a crude white skull visible. Two tiny cannons peeking from port + starboard gunwales. Top-left sunlight casts a soft shadow to the lower-right. Single centered sprite, painterly 1024x1024, solid black background.' },
  // OLD: 'Top-down pirate cutter, weathered brown hull, black skull sail, 3 cannons per side at crooked angles.'
  // Regen 2: strict overhead orthographic to match the rest of the roster (doc 27).
  { id: 'broadside-cutter', prompt: 'Viewed STRAIGHT DOWN from directly above (90° overhead orthographic, NOT isometric, NOT 3/4, NOT side view). A pirate multi-gun cutter seen from above: weathered sun-bleached brown hull as an elongated oval with tar-streaked plank lines bow-to-stern, 8 cannons visible through irregular gun-ports (4 per side, slightly crooked angles), large ragged black mainsail lying FLAT on the deck with a faded white skull-and-crossed-cutlasses emblem, bone-white figurehead at the BOTTOM edge (bow points down the page). Top-left sunlight casts a soft shadow to the lower-right. Single centered sprite, painterly 1024x1024, solid black background.' },
  // Regen 2026-04-24 with strict top-down + no-text.
  { id: 'grappling-boarders', prompt: 'Viewed STRAIGHT DOWN from directly above (90° overhead orthographic, NOT isometric, NOT 3/4). A tiny pirate longboat seen from above: dark-red wooden rowing boat as a narrow pointed oval, 4 tiny pirate boarder figures visible on the deck (one at each rowing station) holding grappling hooks and short cutlasses, ropes coiled at the bow. Bow points DOWN the page. Top-left sunlight casts a soft shadow to the lower-right. Single centered sprite, painterly, solid black background.' },
  // OLD: 'Top-down rickety pirate barrel-boat, massive lit fuse on top sticking up, old brown wood and red warning stripes.'
  // Regen 2: overhead orthographic — the barrel lies ON the raft deck, seen from above.
  { id: 'powder-keg-kamikaze', prompt: 'Viewed STRAIGHT DOWN from directly above (90° overhead orthographic, NOT isometric, NOT 3/4, NOT side view). A tiny rickety pirate raft seen from above: splintered wooden plank raft (roughly square footprint) with frayed rope lashings at each corner, a single large iron-banded gunpowder keg lying on its side at the raft center (the top of the keg faces the viewer, showing the circular lid with a lit fuse sparking bright orange and a curling smoke wisp drifting off the top). Crimson-and-yellow warning stripes painted around the keg rim. Top-left sunlight casts a soft shadow to the lower-right. Single centered sprite, painterly 1024x1024, solid black background.' },
  // Pirate mini-boss
  // Regen 2: strict overhead orthographic to match the Act-I roster.
  { id: 'pirate-champion', prompt: "Viewed STRAIGHT DOWN from directly above (90° overhead orthographic, NOT isometric, NOT 3/4, NOT side view). A large pirate galleon 'Crimson Maw' seen from above: dark blackwood hull as a broad oval with charred plank lines bow-to-stern, 8 cannons per side with crooked gun-ports, blood-red mainsails lying FLAT on the deck centerline with a big white skull emblem, bone-white snarling-dog figurehead at the BOTTOM (bow points down the page). Top-left sunlight casts a soft shadow to the lower-right. Boss-scale, painterly 1024x1024, solid black background." },
  // Enemies — Supernatural (all regen'd 2026-04-24 with strict overhead clause)
  { id: 'ghost-ship', prompt: 'Viewed STRAIGHT DOWN from directly above (90° overhead orthographic, NOT isometric, NOT 3/4, NOT side view). A ghostly translucent schooner seen from above: bluish-white semi-transparent hull as an oval (alpha ~0.7) with pale skeletal ribs visible through the planks, tattered spectral sails lying FLAT on the deck centerline, faint cyan-green glowing aura surrounding the silhouette. Bow points DOWN the page. Top-left sunlight casts a soft shadow to the lower-right. Single centered sprite, painterly 1024x1024, solid black background.' },
  { id: 'sea-serpent', prompt: 'Viewed STRAIGHT DOWN from directly above (90° overhead orthographic, NOT isometric, NOT 3/4). A long green sea serpent seen from above, its body weaving a sinuous S-curve through the frame (head at the BOTTOM of the page, tail at the top). Teal and emerald scales with gold belly highlights, yellow slit eyes, fanged maw open at the head, two small horns on the skull, tiny water ripples trailing around the body coils. Top-left sunlight casts a soft shadow to the lower-right. Single centered sprite, painterly 1024x1024, solid black background.' },
  { id: 'kraken-tentacle', prompt: 'Viewed STRAIGHT DOWN from directly above (90° overhead orthographic, NOT isometric, NOT 3/4). A single massive dark-purple kraken tentacle seen from above, emerging from a foaming circular water-hole in the center of the frame. The tentacle coils and sweeps outward across the page with cyan suckers lining its underside, tapered tip at one end. Churning whitecap ripple ring around the emergence point. Top-left sunlight casts a soft shadow to the lower-right. Single centered sprite, painterly 1024x1024, solid black background.' },
  { id: 'cursed-swarm', prompt: 'Top-down swarm of tiny dark-purple eldritch fish-like creatures, cluster of 8-10 small shapes with glowing pale eyes.' },
  // Environmental
  { id: 'bank-bandits', prompt: 'Top-down pirate bandit hideout on a riverbank, wooden shack with red flag, 2 small bandit silhouettes visible, crates stacked around.' },
  { id: 'mine-layer', prompt: 'Top-down dark-grey industrial mine-layer vessel, flat-decked with mine droppers at the stern, rust and black stripes.' },
  // Supernatural mini-boss
  { id: 'banshee-galleon', prompt: 'Top-down ghostly pale-purple galleon, ethereal translucent sails that seem to scream, glowing cyan runes on the hull, faceless spectral crew. Boss-scale.' },
  // Full bosses
  { id: 'delta-commodore', prompt: "Top-down Navy flagship ironclad 'HMS Ironclad Majesty', massive grey-blue armored hull, 4 smokestacks, 12 cannons per side, golden banners on the masts. Boss-scale." },
  { id: 'pirate-king', prompt: "Top-down Pirate King's flagship galleon 'Crimson Maw' — the biggest possible version of the cutter, blood red and black, pirate king himself as a tiny figurehead on the bow with a tricorn hat. Boss-scale." },
  // Regen 2: strict overhead orthographic to match delta-commodore silhouette (doc 27).
  { id: 'ghost-commodore', prompt: "Viewed STRAIGHT DOWN from directly above (90° overhead orthographic, NOT isometric, NOT 3/4). A spectral Navy ironclad 'HMS Regret' seen from above — same silhouette as the Delta Commodore but ghostly translucent cyan-blue (alpha ~0.65) with pale skeletal ribs visible through the hull, 4 smokestacks with cold blue-green smoke, ephemeral tattered red sails lying FLAT on the deck, tiny skeletal officer figures visible on the upper deck. Bow points DOWN the page. Top-left sunlight casts a soft shadow to the lower-right. Boss-scale, painterly 1024x1024, solid black background." },
  { id: 'drowned-admiralty', prompt: 'Top-down trio of 3 small cursed ghost ships chained together by glowing soul-chains, each ship dark purple translucent, one flagship-sized in center. Boss-scale composition.' },
  { id: 'obsidian-warlord', prompt: "Top-down volcanic obsidian pirate titan ship, pure black hull with glowing orange lava cracks, 3 smoking stacks, huge fire-cannon at the bow. Boss-scale." },
  { id: 'kraken-ancient', prompt: 'Top-down colossal ancient Kraken partially emerging from the water, with 8 massive dark-purple tentacles spread in all directions around a central glowing eye and beaked head. Epic boss-scale composition.' },
  // Pickups
  { id: 'coin-small', prompt: 'A single top-down copper coin, small, 3D-rendered painterly style, center of image.' },
  { id: 'coin-medium', prompt: 'A single top-down silver coin, medium size, painterly, center of image.' },
  { id: 'coin-large', prompt: 'A single top-down gold doubloon with anchor symbol, painterly, center of image.' },
  { id: 'gem', prompt: 'A single top-down glowing purple gemstone, faceted, painterly, center of image with soft cyan glow.' },
  { id: 'xp-orb', prompt: 'A single top-down glowing cyan orb of light, ethereal, small, center of image.' },
  { id: 'chest-wooden', prompt: 'A single top-down closed wooden treasure chest, brown wood with iron bands.' },
  { id: 'chest-silver', prompt: 'A single top-down closed silver treasure chest, polished with engraved filigree.' },
  { id: 'chest-gold', prompt: 'A single top-down closed gold treasure chest, ornate with gold handles and anchor emblem.' },
  { id: 'chest-cursed', prompt: 'A single top-down closed cursed treasure chest, dark purple wood with glowing cyan runes along the bands, sinister.' },
  { id: 'chest-shipwright', prompt: 'A single top-down closed ornate golden Shipwright chest, glowing gold halo, cannon emblems on the sides.' },
  // ---- Starting-ship elemental variants (docs/games/boat-shooter/21-starting-ships.md) ----
  {
    id: 'player-ember-corsair',
    prompt:
      "Top-down player pirate ship 'The Ember Corsair' — charred black hull with crimson-red accents, molten-gold trim along the gunwales, deep orange mainsail with a black phoenix emblem, small brass flame crest at the bow, ember embers drifting upward, faint heat haze. Facing up. Single centered sprite, square 2048x2048 canvas at 2× pixel density (retina-crisp, full resolution, maximum detail), painterly brushwork, ultra-sharp outlines, solid pure-black background.",
  },
  {
    id: 'player-tempest-fury',
    prompt:
      "Top-down player pirate ship 'The Tempest Fury' — deep navy hull with silver highlights, cool slate-blue planks, ice-white mainsail with a black thunderbolt emblem, silver lightning-bolt spike at the bow, faint blue-white electric aura, subtle rain streaks. Facing up. Single centered sprite, square 2048x2048 canvas at 2× pixel density (retina-crisp, full resolution, maximum detail), painterly brushwork, ultra-sharp outlines, solid pure-black background.",
  },
  {
    id: 'player-frostbound',
    prompt:
      "Top-down player pirate ship 'The Frostbound' — pale frost-blue hull with steel-grey planks, frost-cyan accents, bright white mainsail with a six-pointed snowflake emblem in pale cyan, sharp crystal-shard prow tipped in frost, icy mist around the waterline. Facing up. Single centered sprite, square 2048x2048 canvas at 2× pixel density (retina-crisp, full resolution, maximum detail), painterly brushwork, ultra-sharp outlines, solid pure-black background.",
  },
  {
    id: 'player-verdant-tide',
    prompt:
      "Top-down player pirate ship 'The Verdant Tide' — mossy green hull with dark-oak planks and sun-bleached bone accents, warm canvas mainsail with a stylized oak-leaf emblem in deep green, carved wooden boar figurehead at the bow, trailing green vines along the hull. Facing up. Single centered sprite, square 2048x2048 canvas at 2× pixel density (retina-crisp, full resolution, maximum detail), painterly brushwork, ultra-sharp outlines, solid pure-black background.",
  },
  {
    id: 'player-nightwake',
    prompt:
      "Top-down player pirate ship 'The Nightwake' — pitch-black hull with bruised purple accents, ghostly spectral-cyan highlights glowing from within the hull, translucent grey mainsail (semi-transparent) with a faceless skull emblem, gold-capped skeletal arm figurehead at the bow, pale cyan-green will-o-wisp aura. Facing up. Single centered sprite, square 2048x2048 canvas at 2× pixel density (retina-crisp, full resolution, maximum detail), painterly brushwork, ultra-sharp outlines, solid pure-black background.",
  },
  // =====================================================================
  // Batch C — Projectiles (plan §3 Batch C). Side-aligned ammunition
  // silhouettes; rotate to velocity at runtime via Phaser.Image.setRotation.
  // =====================================================================
  { id: 'proj-cannonball',     lock: PROJECTILE_STYLE_LOCK, prompt: 'iron sphere cannonball with a gun-metal highlight on the upper-left, small dark smoke wisp trailing from the tail, painterly shading, crimson spark at the leading edge.' },
  { id: 'proj-broadside-shell', lock: PROJECTILE_STYLE_LOCK, prompt: 'elongated red-hot mortar shell, glowing orange core visible through rivet seams, sparks and ember halo around the shell, pointing right, brass-banded base at the tail.' },
  { id: 'proj-harpoon',         lock: PROJECTILE_STYLE_LOCK, prompt: 'wooden harpoon with a dark-iron barbed head at the right tip, oak-brown shaft with twine wrap, trailing rope fragment curling at the tail, painterly wood grain.' },
  { id: 'proj-musket-ball',     lock: PROJECTILE_STYLE_LOCK, prompt: 'small grey lead musket ball with a dusty trail streak behind it, soft highlight on the upper-left, subtle powder-smoke wisp at the tail.' },
  { id: 'proj-lightning-orb',   lock: PROJECTILE_STYLE_LOCK, prompt: 'white-cyan electric orb with forked lightning arcs bursting outward, bright core, soft glowing halo, painterly electric crackle.' },
  { id: 'proj-frost-mortar',    lock: PROJECTILE_STYLE_LOCK, prompt: 'pale-blue crystalline mortar shell with jagged ice-shards protruding, cold breath mist trailing behind, frost-cyan glow core, brass-banded tail cap.' },
  { id: 'proj-ember-mortar',    lock: PROJECTILE_STYLE_LOCK, prompt: 'orange-red mortar shell glowing with molten cracks across the iron casing, bright ember sparks trailing, heat-haze distortion behind it.' },
  { id: 'proj-ghost-bolt',      lock: PROJECTILE_STYLE_LOCK, prompt: 'spectral purple-and-cyan wisp shaped like a tiny skull face with trailing ectoplasm, glowing eye sockets, translucent tail fading to mist.' },
  // =====================================================================
  // Batch D — Environmental scenery (plan §3 Batch D). Uses scenery- prefix.
  // =====================================================================
  { id: 'scenery-reed-clump',       lock: SCENERY_STYLE_LOCK, prompt: 'dense cluster of tall river reeds rising from a muddy bank at the water line, morning mist around the base, painterly green blades with seed tufts, few droplets.' },
  { id: 'scenery-grass-tuft',       lock: SCENERY_STYLE_LOCK, prompt: 'small grass tuft or lily-pad cluster floating on calm water, tiny yellow bloom, soft water ripple ring, painterly greens.' },
  { id: 'scenery-river-log',        lock: SCENERY_STYLE_LOCK, prompt: 'half-submerged mossy river log, weathered bark with mossy streaks and end-grain rings visible, subtle water ripple around the log.' },
  { id: 'scenery-mud-bar',          lock: SCENERY_STYLE_LOCK, prompt: 'silty ochre mid-stream mud shoal with wet darker spots, a few pebbles and drift-twigs, shallow water edge.' },
  { id: 'scenery-stone-marker',     lock: SCENERY_STYLE_LOCK, prompt: 'moss-covered weathered boundary stone with carved runes or anchor icon, cracked painterly granite, dark wet base where it meets the water.' },
  { id: 'scenery-mangrove-bank',    lock: SCENERY_STYLE_LOCK, prompt: 'dense mangrove tree-line forming a thick bank, layered dark-green canopy with dappled gold highlights, gnarled trunks reaching into water, distant haze. Wide 512x256 strip composition.' },
  { id: 'scenery-mangrove-root',    lock: SCENERY_STYLE_LOCK, prompt: 'gnarled mangrove root cluster at the waterline, arching dark-brown roots with moss speckle, shallow reflection in the water.' },
  { id: 'scenery-dock-plank',       lock: SCENERY_STYLE_LOCK, prompt: 'weathered wooden dock plank with iron mooring rings, tar-stained edges, painterly wood grain, subtle water splash along one side.' },
  { id: 'scenery-debris-crate',     lock: SCENERY_STYLE_LOCK, prompt: 'tumbling wooden cargo crate floating on water, iron-banded corners, painterly splintered edges, faint painted crimson stripe.' },
  { id: 'scenery-fleet-silhouette', lock: SCENERY_STYLE_LOCK, prompt: 'hazy distant galleon silhouette on the horizon, teal-blue fog tint, three masts with faint sails, very low detail, atmospheric perspective. Wide 512x128 composition.' },
  { id: 'scenery-blockade-line',    lock: SCENERY_STYLE_LOCK, prompt: 'row of five distant naval ships forming a blockade line, dark teal silhouettes in fog, tiny masts and hulls, wide horizon. Very wide 1024x128 composition.' },
  { id: 'scenery-wreckage',         lock: SCENERY_STYLE_LOCK, prompt: 'upturned shipwreck hull fragment with a torn sail draped over splintered planks, broken mast jutting up, dark wood and tattered cream canvas, subtle water splash ring.' },
  // =====================================================================
  // Batch E — Hazards (plan §3 Batch E). Top-down waterline props.
  // =====================================================================
  { id: 'hazard-rock-small',  lock: HAZARD_STYLE_LOCK, prompt: 'small barnacle-covered grey river rock, mossy green streaks on one side, wet shine, painterly splash ring at the waterline.' },
  { id: 'hazard-rock-large',  lock: HAZARD_STYLE_LOCK, prompt: 'large boulder blocking the lane, dark granite with barnacles and seagull droppings, a small seagull perched on top, mossy crevices, strong splash ring.' },
  { id: 'hazard-barrel',      lock: HAZARD_STYLE_LOCK, prompt: 'destructible floating powder barrel with iron bands, crimson-and-yellow painted warning stripes, a skull icon painted on the lid, faint splash ring.' },
  { id: 'hazard-ice-patch',   lock: HAZARD_STYLE_LOCK, prompt: 'irregular frozen ice-patch on water, pale cyan-white crystalline surface with small cracks, subtle steam mist around the edges, soft shadow beneath.' },
  { id: 'hazard-oil-slick',   lock: HAZARD_STYLE_LOCK, prompt: 'iridescent black oil slick on water, rainbow-tinted sheen, faint flame flicker near the center, oily dark borders.' },
  { id: 'hazard-mine',        lock: HAZARD_STYLE_LOCK, prompt: 'floating spherical sea mine with iron spikes sticking out in all directions, rusted black body, red trigger caps on each spike, chain tether visible below the waterline, faint splash ring.' },
  // =====================================================================
  // Batch F — UI icons (plan §3 Batch F, capped at 21: 13 weapons + 8 passives).
  // =====================================================================
  { id: 'icon-bow-cannon',       lock: ICON_STYLE_LOCK, prompt: 'a single bronze-and-iron ship cannon mounted on a wooden carriage, painterly weathering, centered as a menu icon.' },
  { id: 'icon-broadside',        lock: ICON_STYLE_LOCK, prompt: 'a trio of cannon barrels aimed to the right spewing muzzle-flash smoke, "broadside" weapon icon, painterly fire and smoke.' },
  { id: 'icon-harpoon',          lock: ICON_STYLE_LOCK, prompt: 'a single wooden harpoon with a dark-iron barbed head and coiled rope at the shaft base, painterly, centered.' },
  { id: 'icon-chain-lightning',  lock: ICON_STYLE_LOCK, prompt: 'a branching white-cyan lightning bolt arcing against a dark indigo field, painterly electric glow, centered.' },
  { id: 'icon-flamethrower',     lock: ICON_STYLE_LOCK, prompt: 'a brass flamethrower nozzle spewing a tongue of orange-red flame, painterly fire, centered.' },
  { id: 'icon-lighthouse-beam',  lock: ICON_STYLE_LOCK, prompt: 'a lighthouse tower projecting a single bright golden beam of light across a dark sea, painterly glow, centered.' },
  { id: 'icon-mortar',           lock: ICON_STYLE_LOCK, prompt: 'a short iron mortar tube with an arcing shell trail above it, painterly smoke puff at the base, centered.' },
  { id: 'icon-fire-arrow-rain',  lock: ICON_STYLE_LOCK, prompt: 'three fiery arrows angled downward with ember trails, painterly orange-red flames, centered.' },
  { id: 'icon-kraken-ink',       lock: ICON_STYLE_LOCK, prompt: 'a spreading inky purple-black ink cloud with a tiny curling tentacle silhouette inside, painterly, centered.' },
  { id: 'icon-spinning-axes',    lock: ICON_STYLE_LOCK, prompt: 'two crossed hand axes with curved motion arcs around them, painterly steel and wood grip, centered.' },
  { id: 'icon-homing-musket',    lock: ICON_STYLE_LOCK, prompt: 'a long-barreled flintlock musket at a slight angle with a crosshair glint near the muzzle, painterly wood and iron, centered.' },
  { id: 'icon-stern-mines',      lock: ICON_STYLE_LOCK, prompt: 'a spiked sea mine with a lit fuse sparking on top, painterly iron, centered.' },
  { id: 'icon-ghost-crew',       lock: ICON_STYLE_LOCK, prompt: 'a ghostly skeletal pirate head wearing a tricorn hat, spectral cyan glow, painterly, centered.' },
  { id: 'icon-crows-nest',       lock: ICON_STYLE_LOCK, prompt: 'a crow perched on top of a wooden ship-mast lookout platform with a small flag, painterly, centered.' },
  { id: 'icon-copper-hull',      lock: ICON_STYLE_LOCK, prompt: 'a polished copper shield shaped like a ship hull cross-section with rivets and a small anchor emblem, painterly verdigris accents, centered.' },
  { id: 'icon-storm-compass',    lock: ICON_STYLE_LOCK, prompt: 'a brass compass with a lightning bolt replacing the north needle, stormy cloud swirl around the rim, painterly, centered.' },
  { id: 'icon-powder-barrel',    lock: ICON_STYLE_LOCK, prompt: 'a wooden gunpowder barrel with iron bands and a lit fuse arcing above, painterly warm glow, centered.' },
  { id: 'icon-first-mate',       lock: ICON_STYLE_LOCK, prompt: 'a silhouetted first-mate pirate with a tricorn hat, eye patch, and a gold epaulette, painterly portrait bust, centered.' },
  { id: 'icon-cargo-nets',       lock: ICON_STYLE_LOCK, prompt: 'a woven rope cargo net bundle with gold coins and a small chest peeking through, painterly, centered.' },
  { id: 'icon-spyglass',         lock: ICON_STYLE_LOCK, prompt: 'a brass collapsible spyglass with leather wrap, angled slightly, painterly brass glint, centered.' },
  { id: 'icon-admirals-flag',    lock: ICON_STYLE_LOCK, prompt: "an admiral's naval flag on a pole, deep navy with gold trim and a crimson anchor emblem, waving, painterly, centered." },

  // ---- Enemy-bullet sprites (doc 27 §4). One sprite per damage family so
  // the player can read "musket vs cannon vs fire vs frost" at a glance. ----
  { id: 'bullet-musket',  lock: BULLET_STYLE_LOCK, prompt: 'small grey lead musket ball pointing downward with a soft dusty-white contrail above it, highlight on upper-left, tight painterly outline, single chromatic grey-white family.' },
  { id: 'bullet-cannon',  lock: BULLET_STYLE_LOCK, prompt: 'heavy iron cannon ball pointing downward with a dark brassy tail trail above and a crimson spark at the leading edge, highlight upper-left, painterly metallic shading, single warm-grey / crimson family.' },
  { id: 'bullet-sniper',  lock: BULLET_STYLE_LOCK, prompt: 'long thin silver-white sniper pellet pointing downward with a sharp motion-blur streak trailing above, bright white hot-core, narrow crisp outline, single silver-white family.' },
  { id: 'bullet-shadow',  lock: BULLET_STYLE_LOCK, prompt: 'spectral purple-violet wisp shaped like a tiny skull facing down, glowing cyan eye sockets, translucent ectoplasm tail trailing upward, single purple-cyan family.' },
  { id: 'bullet-venom',   lock: BULLET_STYLE_LOCK, prompt: 'bright emerald-green venom blob dripping downward with a forked viscous trail above, glistening highlight upper-left, painterly, single emerald-lime family.' },
  { id: 'bullet-fire',    lock: BULLET_STYLE_LOCK, prompt: 'orange-red ember shell pointing downward, molten inner core visible through cracks, rising smoke plume above, single orange-red family.' },
  { id: 'bullet-frost',   lock: BULLET_STYLE_LOCK, prompt: 'pale cyan crystalline ice shard pointing downward with a cool frost-mist trail above, white-hot core highlight, jagged edges, single pale-cyan family.' },
  { id: 'bullet-storm',   lock: BULLET_STYLE_LOCK, prompt: 'electric white-cyan orb pointing downward with forked lightning bolts arcing above it, bright flickering core, painterly electric glow, single white-cyan family.' },

  // ---- HQ scenery additions (2026-04-24): more grass variety + water tiles
  // for the river-mouth biome. Replaces sparse repeats with painterly
  // depth-rich variety. 2K via Imagen 4 (--imagen flag).
  { id: 'scenery-grass-tall',     lock: SCENERY_STYLE_LOCK, prompt: 'tall whispy river grass blades clustered together, viewed from above, painterly green-and-gold blades catching upper-left sunlight, dewdrops at the tips, soft mud base where they meet the water.' },
  { id: 'scenery-grass-fern',     lock: SCENERY_STYLE_LOCK, prompt: 'a small bright-green fern frond cluster floating on the water edge, painterly leafy textures with golden vein highlights, tiny water ripple ring around the base.' },
  { id: 'scenery-water-lily',     lock: SCENERY_STYLE_LOCK, prompt: 'a clustered group of pink-and-white water lilies in full bloom on flat lily pads, viewed from above, painterly petals with gold pollen centers, gentle ripple ring.' },
  { id: 'scenery-rock-cluster',   lock: SCENERY_STYLE_LOCK, prompt: 'three moss-covered round river rocks of varying sizes huddled together, viewed from above, painterly grey granite with green moss patches and barnacle-like specks, splash ring around the base.' },

  // Merchant — scaled-up, dramatic painterly shipyard / shop dock so the
  // pickup feels like a major event, not a roadside hut. 2K via Imagen 4.
  { id: 'scenery-shipyard-dock',  lock: SCENERY_STYLE_LOCK, prompt: 'an ornate painterly Age-of-Sail shipwright dock viewed from above: large weathered wooden pier extending into water, two stacks of cannonballs and barrels of supplies on the deck, an ornate gold-trimmed shopkeeper hut at the far end with a glowing red lantern hanging from the eaves, a painted "SHIPWRIGHT" sign in pictorial only (no text — pure visual: a hammer-and-anchor crest), warm amber light spilling out of the open door, painterly sun-bleached planks with iron rings, three mooring bollards along the edge, faint light-aura around the whole structure indicating it is a special pickup. Bow of any approaching ship would dock at the bottom edge of the frame. Top-left sunlight, gold + crimson + sun-bleached-wood palette, no signage text, no letters.' },
];

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
