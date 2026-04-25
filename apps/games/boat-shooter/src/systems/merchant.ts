import Phaser from 'phaser';
import type { StageScene } from '../scenes/stage-scene';
import { allWeapons } from '../weapons/weapon-catalog';
import { allPassives } from '../weapons/passive-catalog';
import { admiralsFlagRerollReduction } from './battle';

/**
 * Shipwright Cove — mid-stage merchant encounter.
 *
 * At ~90s into the stage, a dockside hut drifts in on the left bank.
 * For 15s the player can sail next to it to shop. Stock:
 *   - 1 random unowned weapon
 *   - 1 random unowned passive
 *   - 1 stat boost (+1 damage / +5% fire rate / +1 max HP)
 *   - 1 heal (+3 HP)
 *   - Reroll button
 *
 * Full camera-zoom UI is P3 polish. For P2, the merchant is rendered as
 * a floating HUT on the bank; touching it pauses and opens the merchant
 * UI in a DOM overlay (reuse LevelUpScene's card UI).
 */

interface StockItem {
  kind: 'weapon' | 'passive' | 'stat' | 'heal';
  id: string;
  label: string;
  detail: string;
  costCoins: number;
  apply: () => boolean; // returns true if applied, false if couldn't (e.g. slots full)
}

export class MerchantSystem {
  private scene: StageScene;
  private hut: Phaser.GameObjects.Container | null = null;
  private spawnedThisStage = false;
  private stock: StockItem[] = [];
  /** Reference to dynamic parts so proximity staging can modify them. */
  private lanternGlow: Phaser.GameObjects.Arc | null = null;
  private label: Phaser.GameObjects.Text | null = null;
  private ropeLine: Phaser.GameObjects.Graphics | null = null;
  /** Current proximity stage — `idle | approaching | close | docking`. */
  private approachStage: 'idle' | 'approaching' | 'close' | 'docking' = 'idle';
  private dockingStartedAt: number | null = null;
  private wakeCooldownMs = 0;

  constructor(scene: StageScene) {
    this.scene = scene;
  }

  update(elapsedSec: number): void {
    if (!this.spawnedThisStage && elapsedSec > 30) {
      this.spawnHut();
    }
    if (!this.hut) return;
    // Bob slightly.
    this.hut.y += Math.sin(this.scene.time.now / 600) * 0.2;

    // Distance-staged docking choreography.
    const p = this.scene.player;
    const dx = this.hut.x - p.x;
    const dy = this.hut.y - p.y;
    const dist = Math.hypot(dx, dy);

    // Stage thresholds: 250 = approaching, 140 = close, 80 = dock/open.
    // The docking animation is a ~450 ms sequence that runs before the
    // merchant scene actually launches, so the player sees the moment
    // of tying-up rather than snapping into a menu.
    const next =
      dist < 80  ? 'docking' :
      dist < 140 ? 'close' :
      dist < 250 ? 'approaching' :
      'idle';

    if (next !== this.approachStage) {
      this.enterStage(next);
    }
    this.tickStage(next, dx, dy, dist);
  }

  private enterStage(stage: 'idle' | 'approaching' | 'close' | 'docking'): void {
    this.approachStage = stage;
    if (!this.hut) return;
    switch (stage) {
      case 'idle':
        this.label?.setText('Shipwright Cove');
        if (this.lanternGlow) this.lanternGlow.setAlpha(0.4);
        break;
      case 'approaching':
        this.label?.setText('Shipwright Cove — swim close');
        if (this.lanternGlow) this.lanternGlow.setAlpha(0.65);
        break;
      case 'close':
        this.label?.setText('Approaching the dock…');
        if (this.lanternGlow) this.lanternGlow.setAlpha(0.95);
        break;
      case 'docking':
        this.label?.setText('Docking');
        this.dockingStartedAt = this.scene.time.now;
        // Brief pulse on the lantern + a one-shot wake burst between ship
        // and dock, then open the merchant after the tie-up beat.
        this.scene.fx.splash(this.hut.x, this.hut.y + 20);
        if (!this.scene.fx.reducedMotion() && this.lanternGlow) {
          this.scene.tweens.add({
            targets: this.lanternGlow,
            scale: { from: 1, to: 1.4 },
            duration: 220,
            yoyo: true,
          });
        }
        break;
    }
  }

  private tickStage(
    stage: 'idle' | 'approaching' | 'close' | 'docking',
    dx: number,
    dy: number,
    dist: number,
  ): void {
    const p = this.scene.player;
    if (!this.hut) return;

    // Approaching: occasional wake particle between ship and dock to
    // telegraph "this is where you're heading."
    if (stage === 'approaching' || stage === 'close') {
      this.wakeCooldownMs -= 16;
      if (this.wakeCooldownMs <= 0) {
        this.wakeCooldownMs = stage === 'close' ? 120 : 220;
        const t = 0.3 + Math.random() * 0.4; // 30–70% along the segment
        const wx = p.x + dx * t;
        const wy = p.y + dy * t;
        this.scene.fx.wakeBurst(wx, wy, 0xcde4ea);
      }
    }

    // Close: stretch a dashed rope hint from the ship to the dock so the
    // player feels the connection before they fully dock. Redrawn each
    // tick because both endpoints move.
    if (stage === 'close') {
      this.ensureRope();
      if (this.ropeLine) {
        this.ropeLine.clear();
        this.ropeLine.lineStyle(1.5, 0xe0b063, 0.55);
        const seg = 6;
        for (let i = 0; i < seg; i++) {
          if (i % 2 !== 0) continue;
          const t0 = i / seg;
          const t1 = (i + 1) / seg;
          this.ropeLine.beginPath();
          this.ropeLine.moveTo(p.x + dx * t0, p.y + dy * t0);
          this.ropeLine.lineTo(p.x + dx * t1, p.y + dy * t1);
          this.ropeLine.strokePath();
        }
      }
    } else if (this.ropeLine) {
      this.ropeLine.clear();
    }

    // Docking: short 450 ms tie-up beat, then open the merchant scene.
    if (stage === 'docking' && this.dockingStartedAt !== null) {
      const elapsed = this.scene.time.now - this.dockingStartedAt;
      if (elapsed >= 450) {
        this.openMerchant();
      }
    }
    void dist;
  }

  private ensureRope(): void {
    if (this.ropeLine) return;
    this.ropeLine = this.scene.add.graphics();
    this.ropeLine.setDepth(5);
  }

  private spawnHut(): void {
    this.spawnedThisStage = true;
    const x = 180;
    const y = 600;
    const container = this.scene.add.container(x, y);
    container.setDepth(4);

    const g = this.scene.add.graphics();
    // Hut on a small dock.
    g.fillStyle(0x8b5a2b, 1).fillRect(-40, -30, 80, 50);
    g.fillStyle(0xe0b063, 1).fillTriangle(-40, -30, 40, -30, 0, -56);
    g.fillStyle(0x2a1a08, 1).fillRect(-6, 0, 12, 20);
    // Dock planks.
    g.fillStyle(0x5a3a20, 1).fillRect(-50, 20, 100, 8);
    container.add(g);

    // Mooring bollards at the end of each dock plank.
    g.fillStyle(0x2a1a08, 1).fillCircle(-46, 24, 3);
    g.fillStyle(0x2a1a08, 1).fillCircle(46, 24, 3);

    // Lantern on the hut roof — its glow scales with player proximity.
    const lanternPost = this.scene.add.rectangle(28, -40, 2, 12, 0x2a1a08, 1);
    container.add(lanternPost);
    const lanternGlow = this.scene.add.circle(28, -48, 10, 0xffd85a, 0.4);
    lanternGlow.setBlendMode(Phaser.BlendModes.ADD);
    container.add(lanternGlow);
    const lanternCore = this.scene.add.circle(28, -48, 3, 0xffffff, 1);
    container.add(lanternCore);
    this.lanternGlow = lanternGlow;
    // Gentle idle flicker on the core, independent of proximity staging.
    if (!this.scene.fx.reducedMotion()) {
      this.scene.tweens.add({
        targets: lanternCore,
        alpha: { from: 0.75, to: 1 },
        duration: 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    // Generate stock.
    this.stock = this.makeStock();

    // Floating banner — text updates per approach stage.
    const label = this.scene.add.text(0, -70, 'Shipwright Cove', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '20px',
      color: '#e0b063',
      stroke: '#000',
      strokeThickness: 2,
      resolution: Math.max(2, window.devicePixelRatio || 1),
    });
    label.setOrigin(0.5, 0.5);
    container.add(label);
    this.label = label;

    this.hut = container;
  }

  private makeStock(): StockItem[] {
    const items: StockItem[] = [];
    const rs = this.scene.runState;

    // 1 random unowned weapon OR levelable.
    const pickableWeapons = allWeapons().filter((w) => rs.weaponLevel(w.id) < 5);
    if (pickableWeapons.length > 0) {
      const w = pickableWeapons[Math.floor(Math.random() * pickableWeapons.length)]!;
      const held = rs.weaponLevel(w.id);
      items.push({
        kind: 'weapon',
        id: w.id,
        label: w.displayName,
        detail: held === 0 ? `NEW · ${w.taglineShort}` : `LEVEL ${held + 1} · ${w.taglineShort}`,
        costCoins: held === 0 ? 30 : 60,
        apply: () => rs.addOrLevelWeapon(w.id),
      });
    }

    // 1 passive.
    const pickablePassives = allPassives().filter((p) => rs.passiveLevel(p.id) < 5);
    if (pickablePassives.length > 0) {
      const p = pickablePassives[Math.floor(Math.random() * pickablePassives.length)]!;
      const held = rs.passiveLevel(p.id);
      items.push({
        kind: 'passive',
        id: p.id,
        label: p.displayName,
        detail: held === 0 ? `NEW · ${p.taglineShort}` : `LEVEL ${held + 1} · ${p.taglineShort}`,
        costCoins: held === 0 ? 40 : 80,
        apply: () => rs.addOrLevelPassive(p.id),
      });
    }

    // Heal — suppressed when the Weekly Challenge forbids repairs.
    if (!rs.hasWeeklyModifier('no-repairs')) {
      items.push({
        kind: 'heal',
        id: 'heal-3',
        label: 'Repair Kit',
        detail: '+3 HP',
        costCoins: 40,
        apply: () => {
          const before = rs.hp;
          rs.heal(3);
          return rs.hp > before;
        },
      });
    }

    // Stat boost.
    items.push({
      kind: 'stat',
      id: 'dmg-plus',
      label: 'Sharpened Steel',
      detail: '+1 flat base damage',
      costCoins: 25,
      apply: () => {
        rs.baseDamage += 1;
        return true;
      },
    });

    return items;
  }

  private openMerchant(): void {
    if (!this.hut) return;
    // Launch MerchantScene overlay with our stock.
    this.scene.scene.pause();
    this.scene.scene.launch('MerchantScene', {
      runState: this.scene.runState,
      stock: this.stock,
      stageKey: this.scene.scene.key,
      onClose: () => {
        this.hut?.destroy();
        this.hut = null;
        this.ropeLine?.destroy();
        this.ropeLine = null;
        this.lanternGlow = null;
        this.label = null;
        this.approachStage = 'idle';
        this.dockingStartedAt = null;
      },
      rerollCostReduction: admiralsFlagRerollReduction(this.scene.runState),
      makeStock: () => (this.stock = this.makeStock()),
    });
  }
}
