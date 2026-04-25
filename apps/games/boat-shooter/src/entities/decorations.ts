import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { WORLD_HEIGHT, WORLD_WIDTH, RIVER_SCROLL_SPEED } from '../constants';

/**
 * Decorative river surface clutter — lily pads, foam clumps, driftwood, reeds.
 *
 * Pure visuals: no collisions, no damage. They drift down with the river
 * current to give the water a sense of motion beyond just the tile scroll.
 * Kept cheap — ~30 live at any moment.
 */
type DecoKind =
  | 'lily'
  | 'foam'
  | 'driftwood'
  | 'reed'
  | 'shore-rock'
  | 'shore-grass'
  | 'fish-shadow'
  | 'ripple'
  | 'weed-patch'
  | 'pier-post'
  | 'cattail-cluster'
  | 'lily-cluster';

interface Decoration {
  container: Phaser.GameObjects.Container;
  kind: DecoKind;
  x: number;
  y: number;
  active: boolean;
  spinRate: number;
}

export class DecorationSystem {
  private items: Decoration[] = [];
  private spawnTimerMs = 0;

  constructor(private readonly scene: StageScene) {}

  private acquire(kind: DecoKind, x: number, y: number): Decoration {
    let d = this.items.find((i) => !i.active);
    if (!d) {
      d = {
        container: this.scene.add.container(x, y),
        kind,
        x,
        y,
        active: false,
        spinRate: 0,
      };
      d.container.setDepth(-60); // above water, below hazards + enemies
      this.items.push(d);
    }
    d.container.removeAll(true);
    this.render(d, kind);
    d.kind = kind;
    d.x = x;
    d.y = y;
    d.container.setPosition(x, y);
    d.container.setScale(0.8 + Math.random() * 0.4);
    d.container.setRotation(Math.random() * Math.PI * 2);
    d.spinRate = (Math.random() - 0.5) * 0.3; // rad/s drift-spin
    d.active = true;
    d.container.setVisible(true);
    return d;
  }

  private render(d: Decoration, kind: DecoKind): void {
    const g = this.scene.add.graphics();
    switch (kind) {
      case 'lily': {
        // Deep-green pad with lighter highlight + tiny pink flower.
        g.fillStyle(0x2a5c3a, 0.9).fillCircle(0, 0, 22);
        g.fillStyle(0x4a8856, 0.7).fillCircle(-4, -4, 14);
        g.fillStyle(0x143022, 1).lineStyle(2, 0x143022, 1);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(14, -14);
        g.strokePath();
        g.fillStyle(0xff8ac4, 0.9).fillCircle(10, -4, 3.5);
        break;
      }
      case 'foam': {
        // Cluster of white/cream bubbles.
        for (let i = 0; i < 7; i++) {
          const fx = (Math.random() - 0.5) * 26;
          const fy = (Math.random() - 0.5) * 12;
          const r = 3 + Math.random() * 4;
          g.fillStyle(0xffffff, 0.45 + Math.random() * 0.2).fillCircle(fx, fy, r);
        }
        break;
      }
      case 'driftwood': {
        // Dark log with a couple of plank lines.
        g.fillStyle(0x3a2410, 1).fillRect(-20, -5, 40, 10);
        g.lineStyle(1, 0x2a1610, 0.9);
        g.strokeRect(-20, -5, 40, 10);
        g.lineBetween(-12, -5, -12, 5);
        g.lineBetween(6, -5, 6, 5);
        break;
      }
      case 'reed': {
        // Three thin green blades.
        g.fillStyle(0x4a7a3a, 0.9);
        g.fillRect(-1, -18, 2, 36);
        g.fillRect(-8, -12, 2, 24);
        g.fillRect(6, -14, 2, 28);
        g.fillStyle(0x7acc66, 0.85);
        g.fillCircle(0, -18, 2);
        g.fillCircle(-7, -12, 2);
        g.fillCircle(7, -14, 2);
        break;
      }
      case 'shore-rock': {
        // Larger dark rock with a lichen highlight.
        g.fillStyle(0x3a342a, 1).fillCircle(0, 0, 26);
        g.fillStyle(0x2a2420, 1).fillCircle(8, -4, 12);
        g.fillStyle(0x5a6a3a, 0.4).fillCircle(-8, -10, 7);
        g.lineStyle(2, 0x1a1410, 0.8).strokeCircle(0, 0, 26);
        break;
      }
      case 'shore-grass': {
        // Thick grass tuft — 8 short blades.
        g.fillStyle(0x3a6628, 0.9);
        for (let i = 0; i < 8; i++) {
          const bx = (Math.random() - 0.5) * 28;
          const by = (Math.random() - 0.5) * 8;
          const h = 10 + Math.random() * 6;
          g.fillRect(bx, by - h / 2, 2, h);
        }
        // Tiny yellow flower accents.
        g.fillStyle(0xffe24a, 0.95);
        g.fillCircle(-6, -8, 1.5);
        g.fillCircle(5, -3, 1.5);
        break;
      }
      case 'fish-shadow': {
        // Black teardrop — school of fish swimming under the surface.
        g.fillStyle(0x0a1a20, 0.55);
        g.beginPath();
        g.moveTo(-16, 0);
        g.lineTo(0, -5);
        g.lineTo(10, -2);
        g.lineTo(12, 2);
        g.lineTo(0, 5);
        g.closePath();
        g.fillPath();
        // Tail fork.
        g.fillStyle(0x0a1a20, 0.45);
        g.beginPath();
        g.moveTo(12, 2);
        g.lineTo(18, 6);
        g.lineTo(18, -6);
        g.lineTo(12, -2);
        g.closePath();
        g.fillPath();
        break;
      }
      case 'ripple': {
        // Expanding ring — drawn once, tween handles animation externally.
        g.lineStyle(2, 0xffffff, 0.5);
        g.strokeCircle(0, 0, 10);
        break;
      }
      case 'weed-patch': {
        // Submerged riverweed — wavy dark-green strands.
        g.fillStyle(0x1a3a26, 0.7);
        for (let i = 0; i < 18; i++) {
          const fx = (Math.random() - 0.5) * 50;
          const len = 8 + Math.random() * 16;
          g.fillRect(fx, 0, 1.5, len);
        }
        // Tiny sediment dots.
        g.fillStyle(0x4a5a40, 0.5);
        for (let i = 0; i < 10; i++) {
          g.fillCircle((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 12, 1);
        }
        break;
      }
      case 'pier-post': {
        // Half-submerged wooden pier piling — old log with rusted iron hoop.
        g.fillStyle(0x2a1a10, 1).fillRect(-6, -22, 12, 44);
        g.fillStyle(0x4a2e1a, 1).fillRect(-5, -22, 10, 44);
        g.fillStyle(0x2a1a10, 1).fillRect(-6, -2, 12, 4); // hoop
        g.fillStyle(0xffffff, 0.45).fillRect(-3, -22, 1.5, 44); // grain highlight
        // Splash ring at waterline.
        g.lineStyle(1.5, 0xffffff, 0.4).strokeEllipse(0, 4, 22, 6);
        // A little moss tuft on top.
        g.fillStyle(0x4a7a3a, 0.85);
        g.fillCircle(-2, -22, 3);
        g.fillCircle(2, -23, 2);
        break;
      }
      case 'cattail-cluster': {
        // Three tall cattails with brown tips.
        for (let i = -1; i <= 1; i++) {
          const cx = i * 8;
          g.fillStyle(0x4a7a3a, 0.95).fillRect(cx - 0.75, -28, 1.5, 30);
          g.fillStyle(0x6a4a1a, 1).fillRect(cx - 1.5, -28, 3, 8);
          g.fillStyle(0x4a3a14, 1).fillRect(cx - 1.5, -22, 3, 2);
        }
        // Base reflection.
        g.fillStyle(0xffffff, 0.25).fillEllipse(0, 4, 26, 4);
        break;
      }
      case 'lily-cluster': {
        // Group of 5 lily pads with a flower in the middle.
        const positions: [number, number, number][] = [
          [0, 0, 18],
          [-22, -4, 14],
          [20, -2, 14],
          [-12, 16, 12],
          [14, 14, 12],
        ];
        for (const [px, py, r] of positions) {
          g.fillStyle(0x2a5c3a, 0.9).fillCircle(px, py, r);
          g.fillStyle(0x4a8856, 0.7).fillCircle(px - 3, py - 3, r * 0.65);
          g.fillStyle(0x143022, 1).lineStyle(1.5, 0x143022, 1);
          g.beginPath();
          g.moveTo(px, py); g.lineTo(px + r * 0.8, py - r * 0.8);
          g.strokePath();
        }
        // Flower center.
        g.fillStyle(0xffd24a, 1).fillCircle(0, 0, 3);
        g.fillStyle(0xff8ac4, 0.9);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          g.fillCircle(Math.cos(a) * 5, Math.sin(a) * 5, 2.5);
        }
        break;
      }
    }
    d.container.add(g);
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const scrollPx = RIVER_SCROLL_SPEED * dt;

    for (const d of this.items) {
      if (!d.active) continue;
      d.y += scrollPx;
      d.container.y = d.y;
      d.container.rotation += d.spinRate * dt;
      if (d.y > WORLD_HEIGHT + 40) {
        d.active = false;
        d.container.setVisible(false);
      }
    }

    // Calmer spawn cadence — with the river drifting at 50 px/s, decorations
    // linger on screen ~20 s, so we don't need to flood new ones in.
    this.spawnTimerMs += deltaMs;
    if (this.spawnTimerMs > 1100) {
      this.spawnTimerMs = 0;
      this.spawnRandom();
    }
  }

  private spawnRandom(): void {
    // Weighted pool — lily / foam common; rocks, grass, weeds moderate;
    // fish, piers, cattails, ripples occasional. More variety = denser feel.
    const pool: DecoKind[] = [
      'lily', 'lily',
      'foam', 'foam', 'foam',
      'driftwood',
      'reed', 'reed',
      'shore-rock', 'shore-rock',
      'shore-grass', 'shore-grass',
      'weed-patch', 'weed-patch',
      'cattail-cluster',
      'pier-post',
      'lily-cluster',
      'fish-shadow',
      'ripple',
    ];
    const kind = pool[Math.floor(Math.random() * pool.length)]!;

    // Bank-only kinds stay close to the edges; open-water kinds roam.
    const bankOnly =
      kind === 'shore-rock' || kind === 'shore-grass' || kind === 'reed' ||
      kind === 'cattail-cluster' || kind === 'pier-post';
    const midOnly = kind === 'fish-shadow' || kind === 'ripple' || kind === 'weed-patch' || kind === 'lily-cluster';

    const roll = Math.random();
    let x: number;
    if (bankOnly) {
      x = roll < 0.5 ? 10 + Math.random() * 150 : WORLD_WIDTH - 160 + Math.random() * 150;
    } else if (midOnly) {
      x = 300 + Math.random() * (WORLD_WIDTH - 600);
    } else if (roll < 0.4) {
      x = 20 + Math.random() * 200;
    } else if (roll < 0.8) {
      x = WORLD_WIDTH - 220 + Math.random() * 200;
    } else {
      x = Math.random() * WORLD_WIDTH;
    }
    const d = this.acquire(kind, x, -40);

    // Ripple rings animate while they drift down.
    if (kind === 'ripple') {
      this.scene.tweens.add({
        targets: d.container,
        scale: { from: 0.4, to: 2.4 },
        alpha: { from: 0.6, to: 0 },
        duration: 2200,
        ease: 'Sine.out',
      });
    }
  }

  clear(): void {
    for (const d of this.items) {
      if (d.active) d.container.setVisible(false);
      d.active = false;
    }
    this.items.length = 0;
  }
}
