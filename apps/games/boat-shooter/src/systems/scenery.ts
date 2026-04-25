import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { WORLD_HEIGHT, WORLD_WIDTH, RIVER_SCROLL_SPEED } from '../constants';
import type { WaterBiome } from './water-shader';

/**
 * Scenery layer — non-collidable environmental props that scroll with the
 * water and sell the *place* of each stage.
 *
 * Depth budget: -80 (far parallax) … -60 (near parallax). Strictly behind
 * gameplay (default 0), in front of water (-100). No prop ever occludes
 * a ship or a projectile.
 *
 * Pixel density: textures are pre-baked at 2× logical size and rendered
 * with an origin scale that keeps them crisp on Retina.
 *
 * Organisation: per-stage manifests live below as a pure-data `SceneryManifest`
 * map. New props are added by (a) extending the `SceneryPropDef` discriminated
 * union, (b) authoring a bake function, (c) listing the prop in the manifest.
 */

type PropKind =
  | 'reed-clump'
  | 'grass-tuft'
  | 'lily-leaf'
  | 'river-log'
  | 'mud-bar'
  | 'stone-marker'
  | 'mangrove-bank'
  | 'mangrove-root'
  | 'dock-plank'
  | 'debris-crate'
  | 'fleet-silhouette'
  | 'blockade-line'
  | 'wreckage';

/**
 * Target on-screen width (px) for each AI-generated scenery sprite. Source
 * PNGs are native 1024², so `scale = TARGET / 1024` brings them in line with
 * the procedural bake's physical footprint. Tuned to match the bake sizes
 * in the bake* functions below so swapping to/from AI feels seamless.
 */
const TARGET_PROP_WIDTHS: Partial<Record<PropKind, number>> = {
  'reed-clump': 96,
  'grass-tuft': 40,
  'river-log': 72,
  'mud-bar': 140,
  'stone-marker': 40,
  'mangrove-bank': 220,
  'mangrove-root': 60,
  'dock-plank': 48,
  'debris-crate': 30,
  'fleet-silhouette': 180,
  'blockade-line': 400,
  'wreckage': 90,
};

export interface SceneryPropDef {
  kind: PropKind;
  /** World position used at spawn; Y may be beyond the world (props scroll). */
  x: number;
  y: number;
  /** Per-prop rotation (rad). */
  rotation?: number;
  /** Scroll multiplier — 1 = scrolls with water, < 1 = further parallax. */
  parallax?: number;
  /** Depth bucket (clamped to -80 … -60). */
  depth?: number;
  /** Extra scale on top of the texture's natural size. */
  scale?: number;
  /** Seed used by the bake function for deterministic look. */
  seed?: number;
}

export interface SceneryManifest {
  /** Static props placed once at stage start. */
  props: SceneryPropDef[];
  /**
   * Repeating spawns — props added on a loop as old ones scroll off. Lets us
   * get continuous banks / kelp beds without authoring a huge static list.
   */
  spawners?: SceneryRepeatSpec[];
}

export interface SceneryRepeatSpec {
  kind: PropKind;
  intervalMs: number;
  /** Random x range for each spawn. */
  xRange: [number, number];
  /** Y where the prop enters (usually above the visible area). */
  y: number;
  rotationRange?: [number, number];
  parallax?: number;
  depth?: number;
  scaleRange?: [number, number];
}

export class SceneryLayer {
  private props: Phaser.GameObjects.Image[] = [];
  private repeatEvents: Phaser.Time.TimerEvent[] = [];
  /** Per-prop parallax factor, indexed by scene object id. */
  private parallaxById = new Map<number, number>();

  constructor(private readonly scene: StageScene) {}

  setBiome(biome: WaterBiome): void {
    this.clear();
    const manifest = MANIFESTS[biome];
    if (!manifest) return;
    this.ensureTextures();

    for (const def of manifest.props) this.spawnProp(def);

    if (manifest.spawners) {
      for (const spec of manifest.spawners) {
        const ev = this.scene.time.addEvent({
          delay: spec.intervalMs,
          loop: true,
          callback: () => this.spawnFromSpec(spec),
        });
        this.repeatEvents.push(ev);
        // Prime with one immediate spawn so the stage isn't empty at start.
        this.spawnFromSpec(spec);
      }
    }
  }

  clear(): void {
    for (const p of this.props) p.destroy();
    this.props = [];
    this.parallaxById.clear();
    for (const e of this.repeatEvents) e.remove();
    this.repeatEvents = [];
  }

  /** Called from StageScene::update — mirrors the water's downward scroll. */
  update(deltaMs: number): void {
    const dy = (RIVER_SCROLL_SPEED * deltaMs) / 1000;
    const cullBelow = WORLD_HEIGHT + 200;
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i]!;
      const factor = this.parallaxById.get(p.name as unknown as number) ?? 1;
      p.y += dy * factor;
      if (p.y > cullBelow) {
        p.destroy();
        this.props.splice(i, 1);
      }
    }
  }

  private spawnFromSpec(spec: SceneryRepeatSpec): void {
    const x = spec.xRange[0] + Math.random() * (spec.xRange[1] - spec.xRange[0]);
    const rot = spec.rotationRange
      ? spec.rotationRange[0] + Math.random() * (spec.rotationRange[1] - spec.rotationRange[0])
      : 0;
    const scale = spec.scaleRange
      ? spec.scaleRange[0] + Math.random() * (spec.scaleRange[1] - spec.scaleRange[0])
      : 1;
    const def: SceneryPropDef = { kind: spec.kind, x, y: spec.y, rotation: rot, scale };
    if (spec.parallax !== undefined) def.parallax = spec.parallax;
    if (spec.depth !== undefined) def.depth = spec.depth;
    this.spawnProp(def);
  }

  private spawnProp(def: SceneryPropDef): void {
    // Prefer the AI-generated painterly sprite (plan §3 Batch D) when its
    // PNG was preloaded as `sprite-scenery-<kind>`. Native size is ~1024²
    // and we ship a target width per-kind so props don't dominate the frame.
    // Falls back to the procedurally-baked `scenery-<kind>` canvas texture
    // when no AI sprite is on disk.
    const aiKey = `sprite-scenery-${def.kind}`;
    const bakeKey = `scenery-${def.kind}`;
    const useAi = this.scene.textures.exists(aiKey);
    const key = useAi ? aiKey : bakeKey;
    const img = this.scene.add.image(def.x, def.y, key);
    img.setDepth(Math.min(-60, Math.max(-80, def.depth ?? -70)));
    if (useAi) {
      // AI sprites are native 1024², composed on black background, already
      // chroma-keyed by sprite-loader. Scale so the on-screen size matches
      // the procedural bake's physical footprint (roughly 96–220px wide).
      const nativeW = img.width || 1024;
      const targetW = TARGET_PROP_WIDTHS[def.kind] ?? 120;
      const baseScale = targetW / nativeW;
      img.setScale(baseScale * (def.scale ?? 1));
    } else {
      img.setScale((def.scale ?? 1) * 0.5); // /2 because bake is @2× density
    }
    if (def.rotation) img.setRotation(def.rotation);
    // Phaser assigns an incrementing id to each GameObject; we borrow the
    // `name` field as a unique string key → number for parallax lookup.
    const id = ++SceneryLayer._uid;
    img.name = String(id);
    this.parallaxById.set(id, def.parallax ?? 1);
    this.props.push(img);
  }
  private static _uid = 0;

  /**
   * Pre-bake all prop textures at 2× logical resolution. Every texture is
   * keyed `scenery-<kind>` and cached on the scene's texture manager, so
   * stage restarts reuse the same canvases.
   */
  private ensureTextures(): void {
    const tex = this.scene.textures;
    if (!tex.exists('scenery-reed-clump'))    bakeReedClump(this.scene);
    if (!tex.exists('scenery-grass-tuft'))    bakeGrassTuft(this.scene);
    if (!tex.exists('scenery-lily-leaf'))     bakeLilyLeaf(this.scene);
    if (!tex.exists('scenery-river-log'))     bakeRiverLog(this.scene);
    if (!tex.exists('scenery-mud-bar'))       bakeMudBar(this.scene);
    if (!tex.exists('scenery-stone-marker'))  bakeStoneMarker(this.scene);
    if (!tex.exists('scenery-mangrove-bank')) bakeMangroveBank(this.scene);
    if (!tex.exists('scenery-mangrove-root')) bakeMangroveRoot(this.scene);
    if (!tex.exists('scenery-dock-plank'))    bakeDockPlank(this.scene);
    if (!tex.exists('scenery-debris-crate'))  bakeDebrisCrate(this.scene);
    if (!tex.exists('scenery-fleet-silhouette')) bakeFleetSilhouette(this.scene);
    if (!tex.exists('scenery-blockade-line'))    bakeBlockadeLine(this.scene);
    if (!tex.exists('scenery-wreckage'))         bakeWreckage(this.scene);
  }
}

// ============================================================================
// Texture bakers — all draw at 2× logical pixels for Retina density.
// ============================================================================

function bakeReedClump(scene: StageScene): void {
  const W = 96;
  const H = 160;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Soft mud base — the reeds clearly grow out of a visible bank.
  g.fillStyle(0x4a3418, 0.5).fillEllipse(W / 2, H - 8, W - 14, 18);
  g.fillStyle(0x6a4a22, 0.4).fillEllipse(W / 2 - 4, H - 12, W - 34, 10);

  // Wet water-line highlight where the blades meet the water.
  g.fillStyle(0xc0e090, 0.35).fillEllipse(W / 2, H - 16, W - 20, 4);

  // Back row of darker, longer blades — establishes depth.
  const backGreens = [0x2a4012, 0x344818, 0x3a5220];
  for (let i = 0; i < 16; i++) {
    const hx = 6 + Math.random() * (W - 12);
    const tipY = 6 + Math.random() * 24;
    const baseY = H - 12;
    const color = backGreens[i % backGreens.length]!;
    const bend = (Math.random() - 0.5) * 12;
    g.lineStyle(1.8, color, 0.9);
    g.beginPath();
    g.moveTo(hx, baseY);
    // Quadratic bend so blades have a natural curve (flat-screen, so
    // approximate with a kinked lineTo).
    g.lineTo(hx + bend * 0.5, (baseY + tipY) / 2 + 2);
    g.lineTo(hx + bend, tipY);
    g.strokePath();
  }

  // Front row of brighter, thicker blades with fan tips.
  const frontGreens = [0x5a7a30, 0x6a8a3a, 0x7a9a44, 0x8aaa50];
  for (let i = 0; i < 22; i++) {
    const hx = 4 + Math.random() * (W - 8);
    const tipY = 10 + Math.random() * 32;
    const baseY = H - 10;
    const color = frontGreens[i % frontGreens.length]!;
    const bend = (Math.random() - 0.5) * 14;
    g.lineStyle(2.2, color, 1);
    g.beginPath();
    g.moveTo(hx, baseY);
    g.lineTo(hx + bend * 0.4, (baseY + tipY) / 2 + 4);
    g.lineTo(hx + bend * 0.8, (baseY + tipY) / 2 - 2);
    g.lineTo(hx + bend, tipY);
    g.strokePath();
    // Small side-leaf.
    g.lineStyle(1.4, color, 0.9);
    g.beginPath();
    const midY = (baseY + tipY) / 2;
    g.moveTo(hx + bend * 0.4, midY);
    g.lineTo(hx + bend * 0.4 + 8 * (Math.random() > 0.5 ? 1 : -1), midY - 6);
    g.strokePath();
    // Seed tuft on ~25% of blades.
    if (Math.random() < 0.25) {
      g.fillStyle(0xd8c870, 0.9);
      g.fillCircle(hx + bend, tipY - 1, 1.5);
    }
  }

  // A few bright specular tips for sun hitting the blade edges.
  g.fillStyle(0xc8e070, 0.55);
  for (let i = 0; i < 6; i++) {
    g.fillCircle(10 + Math.random() * (W - 20), 14 + Math.random() * 28, 1.2);
  }

  g.generateTexture('scenery-reed-clump', W, H);
  g.destroy();
}

function bakeGrassTuft(scene: StageScene): void {
  // Smaller mid-stream grass clump — lighter / more floaty than reed clumps.
  const W = 40;
  const H = 48;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // Faint wet base.
  g.fillStyle(0x3a5a20, 0.35).fillEllipse(W / 2, H - 4, W - 10, 6);
  // 9 short bright blades, fanned outward.
  const greens = [0x7aa038, 0x90b648, 0xa8c858];
  for (let i = 0; i < 10; i++) {
    const hx = 4 + Math.random() * (W - 8);
    const tipY = 6 + Math.random() * 16;
    const baseY = H - 6;
    const bend = (Math.random() - 0.5) * 10;
    g.lineStyle(1.6, greens[i % greens.length]!, 1);
    g.beginPath();
    g.moveTo(hx, baseY);
    g.lineTo(hx + bend * 0.5, (baseY + tipY) / 2);
    g.lineTo(hx + bend, tipY);
    g.strokePath();
  }
  // Tiny yellow bloom on ~30% of tufts (gets painted on baked texture always,
  // but low alpha so most tufts look plain).
  g.fillStyle(0xf0d860, 0.8);
  g.fillCircle(W / 2, 10, 1.5);
  g.generateTexture('scenery-grass-tuft', W, H);
  g.destroy();
}

function bakeLilyLeaf(scene: StageScene): void {
  const W = 28;
  const H = 28;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x3a6a2a, 0.85).fillCircle(W / 2, H / 2, 12);
  g.fillStyle(0x5a8a3a, 0.85).fillCircle(W / 2 - 2, H / 2 - 2, 9);
  // Notch so it reads as a lily pad (V cut).
  g.fillStyle(0x000000, 0);
  g.slice(W / 2, H / 2, 13, Math.PI * 1.4, Math.PI * 1.6, false).fillPath();
  g.generateTexture('scenery-lily-leaf', W, H);
  g.destroy();
}

function bakeRiverLog(scene: StageScene): void {
  const W = 72;
  const H = 20;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x3a2210, 1).fillRoundedRect(1, 2, W - 2, H - 4, 7);
  g.fillStyle(0x5a3a20, 1).fillRoundedRect(2, 3, W - 4, H - 8, 5);
  // Moss streaks.
  g.fillStyle(0x4a6a28, 0.75).fillRect(8, 3, 14, 2);
  g.fillStyle(0x4a6a28, 0.75).fillRect(38, 4, 20, 2);
  // End rings.
  g.lineStyle(1.2, 0x2a1408, 1);
  g.strokeCircle(5, H / 2, 4);
  g.strokeCircle(W - 5, H / 2, 4);
  g.generateTexture('scenery-river-log', W, H);
  g.destroy();
}

function bakeMudBar(scene: StageScene): void {
  const W = 140;
  const H = 80;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x8a6a3a, 0.35).fillEllipse(W / 2, H / 2, W - 8, H - 10);
  g.fillStyle(0x9a7a4a, 0.28).fillEllipse(W / 2 - 8, H / 2 - 6, W - 30, H - 30);
  g.fillStyle(0x6a4a28, 0.35).fillEllipse(W / 2 + 6, H / 2 + 6, W - 40, H - 44);
  g.generateTexture('scenery-mud-bar', W, H);
  g.destroy();
}

function bakeStoneMarker(scene: StageScene): void {
  const W = 40;
  const H = 56;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x3a3a3a, 1).fillEllipse(W / 2, H - 10, W - 6, 14);
  g.fillStyle(0x5a5a5a, 1).fillRoundedRect(8, 8, W - 16, H - 14, 6);
  g.fillStyle(0x7a7a7a, 1).fillRoundedRect(12, 10, W - 24, H - 20, 4);
  // Scratches.
  g.lineStyle(1, 0x2a2a2a, 1);
  g.beginPath();
  g.moveTo(14, 18); g.lineTo(18, 34);
  g.moveTo(20, 20); g.lineTo(22, 30);
  g.strokePath();
  g.generateTexture('scenery-stone-marker', W, H);
  g.destroy();
}

function bakeMangroveBank(scene: StageScene): void {
  const W = 220;
  const H = 120;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // Back silhouette — dark palm row.
  g.fillStyle(0x1a2a18, 1);
  for (let i = 0; i < 6; i++) {
    const cx = 20 + i * 36;
    const cy = H - 40;
    g.fillCircle(cx, cy, 22);
    g.fillCircle(cx - 8, cy - 18, 16);
    g.fillCircle(cx + 10, cy - 14, 18);
    // Trunk.
    g.fillRect(cx - 2, cy, 4, 40);
  }
  // Mid silhouette — brighter palm crowns over the back row.
  g.fillStyle(0x2e4a28, 1);
  for (let i = 0; i < 7; i++) {
    const cx = 8 + i * 32;
    const cy = H - 60;
    g.fillCircle(cx, cy, 12);
    g.fillCircle(cx - 6, cy - 10, 10);
    g.fillCircle(cx + 8, cy - 6, 12);
  }
  // Dapple highlights.
  g.fillStyle(0x6a8a3a, 0.55);
  for (let i = 0; i < 14; i++) {
    g.fillCircle(10 + Math.random() * (W - 20), H - 50 - Math.random() * 20, 3 + Math.random() * 3);
  }
  g.generateTexture('scenery-mangrove-bank', W, H);
  g.destroy();
}

function bakeMangroveRoot(scene: StageScene): void {
  const W = 60;
  const H = 40;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x3a2810, 1);
  // Gnarled root cluster — arches.
  for (let i = 0; i < 6; i++) {
    const bx = 6 + i * 9;
    g.beginPath();
    g.arc(bx, H - 4, 4, Math.PI, 2 * Math.PI, false);
    g.fillPath();
    g.fillRect(bx - 1, H - 14, 2, 10);
  }
  // Moss speckle.
  g.fillStyle(0x4a6a28, 0.7);
  for (let i = 0; i < 8; i++) {
    g.fillCircle(6 + Math.random() * (W - 12), H - 14 + Math.random() * 10, 1.2);
  }
  g.generateTexture('scenery-mangrove-root', W, H);
  g.destroy();
}

function bakeDockPlank(scene: StageScene): void {
  const W = 48;
  const H = 32;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x4a2a10, 1).fillRect(0, 4, W, H - 8);
  g.fillStyle(0x6a4a22, 1).fillRect(2, 6, W - 4, H - 14);
  // Plank lines.
  g.lineStyle(1, 0x2a1408, 1);
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(i * (W / 4), 6);
    g.lineTo(i * (W / 4), H - 8);
    g.strokePath();
  }
  // Iron rings at corners.
  g.fillStyle(0x202020, 1).fillCircle(4, 6, 2);
  g.fillStyle(0x202020, 1).fillCircle(W - 4, 6, 2);
  g.generateTexture('scenery-dock-plank', W, H);
  g.destroy();
}

function bakeDebrisCrate(scene: StageScene): void {
  const W = 30;
  const H = 30;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x5a3a1a, 1).fillRect(3, 3, W - 6, H - 6);
  g.fillStyle(0x7a5a2a, 1).fillRect(5, 5, W - 10, H - 10);
  g.lineStyle(1, 0x2a1408, 1);
  g.strokeRect(3, 3, W - 6, H - 6);
  g.strokeRect(5, 5, W - 10, H - 10);
  // X-slat on top.
  g.beginPath();
  g.moveTo(5, 5); g.lineTo(W - 5, H - 5);
  g.moveTo(W - 5, 5); g.lineTo(5, H - 5);
  g.strokePath();
  g.generateTexture('scenery-debris-crate', W, H);
  g.destroy();
}

function bakeFleetSilhouette(scene: StageScene): void {
  const W = 180;
  const H = 60;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // A single distant galleon silhouette — dark-teal haze.
  g.fillStyle(0x1a3a4a, 0.65);
  // Hull (long wedge).
  g.beginPath();
  g.moveTo(10, H - 14);
  g.lineTo(W - 10, H - 14);
  g.lineTo(W - 28, H - 4);
  g.lineTo(28, H - 4);
  g.closePath();
  g.fillPath();
  // Masts.
  for (const mx of [W * 0.3, W * 0.5, W * 0.7]) {
    g.fillRect(mx - 1, 6, 2, H - 20);
  }
  // Sails.
  g.fillStyle(0x2a4a5a, 0.55);
  g.fillRect(W * 0.25, 10, 24, 24);
  g.fillRect(W * 0.44, 8, 30, 28);
  g.fillRect(W * 0.65, 12, 22, 22);
  g.generateTexture('scenery-fleet-silhouette', W, H);
  g.destroy();
}

function bakeBlockadeLine(scene: StageScene): void {
  const W = 400;
  const H = 30;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x2a3a4a, 0.35);
  // Row of 5 tiny distant ships.
  for (let i = 0; i < 5; i++) {
    const cx = 30 + i * 80;
    g.fillRect(cx - 18, H - 10, 36, 6);
    g.fillRect(cx - 1, H - 24, 2, 14);
    g.fillRect(cx - 8, H - 22, 16, 10);
  }
  g.generateTexture('scenery-blockade-line', W, H);
  g.destroy();
}

function bakeWreckage(scene: StageScene): void {
  const W = 90;
  const H = 44;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x4a2a12, 1);
  // Upturned hull fragment.
  g.beginPath();
  g.moveTo(6, H - 6);
  g.lineTo(W - 14, H - 4);
  g.lineTo(W - 4, H - 18);
  g.lineTo(12, H - 20);
  g.closePath();
  g.fillPath();
  // Broken plank sticking up.
  g.fillRect(W * 0.3, H - 34, 3, 20);
  // Torn sail strip.
  g.fillStyle(0xe8d8c3, 0.8);
  g.beginPath();
  g.moveTo(W * 0.35, H - 30);
  g.lineTo(W * 0.55, H - 32);
  g.lineTo(W * 0.5, H - 14);
  g.lineTo(W * 0.34, H - 16);
  g.closePath();
  g.fillPath();
  g.generateTexture('scenery-wreckage', W, H);
  g.destroy();
}

// ============================================================================
// Per-biome scenery manifests — pure data. Extend by adding new entries.
// ============================================================================

const MANIFESTS: Partial<Record<WaterBiome, SceneryManifest>> = {
  rivermouth: {
    props: [
      // Stone marker at the river fork.
      { kind: 'stone-marker', x: WORLD_WIDTH / 2, y: 300, parallax: 1, depth: -65 },
      // A couple of static mud bars for initial visible state.
      { kind: 'mud-bar', x: 240, y: 620, parallax: 1, depth: -72, rotation: 0.2 },
      { kind: 'mud-bar', x: WORLD_WIDTH - 260, y: 980, parallax: 1, depth: -72, rotation: -0.3 },
    ],
    spawners: [
      // Thick reeds along the left bank — dense enough to read as a bank.
      {
        kind: 'reed-clump',
        intervalMs: 450,
        xRange: [10, 130],
        y: -180,
        rotationRange: [-0.15, 0.15],
        scaleRange: [0.75, 1.25],
        parallax: 1,
        depth: -68,
      },
      // Thick reeds along the right bank.
      {
        kind: 'reed-clump',
        intervalMs: 450,
        xRange: [WORLD_WIDTH - 130, WORLD_WIDTH - 10],
        y: -180,
        rotationRange: [-0.15, 0.15],
        scaleRange: [0.75, 1.25],
        parallax: 1,
        depth: -68,
      },
      // Smaller grass tufts drifting mid-stream — fills the gap.
      {
        kind: 'grass-tuft',
        intervalMs: 1800,
        xRange: [180, WORLD_WIDTH - 180],
        y: -60,
        rotationRange: [-0.3, 0.3],
        scaleRange: [0.7, 1.15],
        parallax: 1,
        depth: -70,
      },
      // Occasional closer-to-bank grass patches for rhythm variety.
      {
        kind: 'grass-tuft',
        intervalMs: 1200,
        xRange: [140, 220],
        y: -60,
        rotationRange: [-0.3, 0.3],
        scaleRange: [0.6, 1.1],
        parallax: 1,
        depth: -69,
      },
      {
        kind: 'grass-tuft',
        intervalMs: 1200,
        xRange: [WORLD_WIDTH - 220, WORLD_WIDTH - 140],
        y: -60,
        rotationRange: [-0.3, 0.3],
        scaleRange: [0.6, 1.1],
        parallax: 1,
        depth: -69,
      },
      // Lily pads mid-stream.
      {
        kind: 'lily-leaf',
        intervalMs: 1400,
        xRange: [180, WORLD_WIDTH - 180],
        y: -40,
        rotationRange: [0, Math.PI * 2],
        scaleRange: [0.7, 1.3],
        parallax: 1,
        depth: -70,
      },
      // Drifting logs.
      {
        kind: 'river-log',
        intervalMs: 5200,
        xRange: [120, WORLD_WIDTH - 120],
        y: -40,
        rotationRange: [-0.4, 0.4],
        scaleRange: [0.9, 1.2],
        parallax: 1,
        depth: -66,
      },
    ],
  },

  channels: {
    props: [
      // Static mangrove root clusters that break the channel into lanes.
      { kind: 'mangrove-root', x: 220, y: 400, parallax: 1, depth: -66, scale: 1.3 },
      { kind: 'mangrove-root', x: WORLD_WIDTH - 240, y: 820, parallax: 1, depth: -66, scale: 1.3 },
      { kind: 'mangrove-root', x: 260, y: 1240, parallax: 1, depth: -66, scale: 1.3 },
    ],
    spawners: [
      // Continuous mangrove bank — left edge, slow parallax.
      {
        kind: 'mangrove-bank',
        intervalMs: 2400,
        xRange: [0, 40],
        y: -140,
        scaleRange: [1, 1],
        parallax: 0.85,
        depth: -78,
      },
      // And right edge, mirrored.
      {
        kind: 'mangrove-bank',
        intervalMs: 2400,
        xRange: [WORLD_WIDTH - 40, WORLD_WIDTH],
        y: -140,
        rotationRange: [Math.PI, Math.PI],
        scaleRange: [1, 1],
        parallax: 0.85,
        depth: -78,
      },
      // Dock planks along the banks — where sniper towers usually sit.
      {
        kind: 'dock-plank',
        intervalMs: 4200,
        xRange: [60, 120],
        y: -60,
        scaleRange: [0.8, 1.2],
        parallax: 1,
        depth: -68,
      },
      {
        kind: 'dock-plank',
        intervalMs: 4200,
        xRange: [WORLD_WIDTH - 120, WORLD_WIDTH - 60],
        y: -60,
        scaleRange: [0.8, 1.2],
        parallax: 1,
        depth: -68,
      },
      // Occasional debris crate.
      {
        kind: 'debris-crate',
        intervalMs: 6800,
        xRange: [200, WORLD_WIDTH - 200],
        y: -60,
        rotationRange: [0, Math.PI * 2],
        scaleRange: [0.8, 1.2],
        parallax: 1,
        depth: -67,
      },
      // Grass tufts hugging the mangrove bank edge — softens the sharp
      // mangrove silhouette so the water-line reads as organic.
      {
        kind: 'grass-tuft',
        intervalMs: 700,
        xRange: [40, 120],
        y: -60,
        rotationRange: [-0.3, 0.3],
        scaleRange: [0.6, 1.1],
        parallax: 1,
        depth: -70,
      },
      {
        kind: 'grass-tuft',
        intervalMs: 700,
        xRange: [WORLD_WIDTH - 120, WORLD_WIDTH - 40],
        y: -60,
        rotationRange: [-0.3, 0.3],
        scaleRange: [0.6, 1.1],
        parallax: 1,
        depth: -70,
      },
    ],
  },

  'open-sea': {
    props: [
      // A single blockade line at the top of the world (static — the Navy
      // is on the horizon, not scrolling past).
      { kind: 'blockade-line', x: WORLD_WIDTH / 2, y: 60, parallax: 0, depth: -78 },
    ],
    spawners: [
      // Distant friendly galleons — very slow parallax, high up.
      {
        kind: 'fleet-silhouette',
        intervalMs: 6400,
        xRange: [100, WORLD_WIDTH - 100],
        y: 110,
        scaleRange: [0.9, 1.15],
        parallax: 0.25,
        depth: -78,
      },
      // Floating wreckage marking the fleet's advance.
      {
        kind: 'wreckage',
        intervalMs: 3200,
        xRange: [160, WORLD_WIDTH - 160],
        y: -60,
        rotationRange: [-0.4, 0.4],
        scaleRange: [0.85, 1.25],
        parallax: 1,
        depth: -66,
      },
      // Scattered broken crates.
      {
        kind: 'debris-crate',
        intervalMs: 2800,
        xRange: [100, WORLD_WIDTH - 100],
        y: -40,
        rotationRange: [0, Math.PI * 2],
        scaleRange: [0.7, 1.1],
        parallax: 1,
        depth: -67,
      },
    ],
  },
};
