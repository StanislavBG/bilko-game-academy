import Phaser from 'phaser';
import { Weapon } from './weapon';
import { rollDamage } from '../systems/battle';
import type { Enemy } from '../entities/enemy';
import { fireTempestCannonade } from './evolved-behaviors';

/**
 * W4 Chain Lightning — instant beam to nearest enemy, chains to nearby targets.
 *
 * Per-level (docs/games/boat-shooter/04-weapons.md W4):
 *   L1: 1 target + 1 chain, every 2.5s, 2 dmg, ~150px chain
 *   L2: 1 + 2 chains, every 2.0s
 *   L3: 1 + 3 chains, every 2.0s, +1 dmg
 *   L4: 1 + 4 chains, every 1.5s, +0.3s stun
 *   L5: 1 + 5 chains, every 1.0s, +1 dmg, +0.5s stun
 *
 * Applies Shock status on hit starting L4. Target selection: first enemy is
 * nearest to player; each subsequent chain is nearest un-hit enemy within
 * `chainRange` of the previous target.
 */
export class ChainLightning extends Weapon {
  readonly id = 'chain-lightning';
  private cooldownMs = 0;

  update(deltaMs: number): void {
    const lvl = this.level();
    if (lvl === 0) return;
    this.cooldownMs -= deltaMs;
    if (this.cooldownMs > 0) return;
    if (this.scene.runState.hasEvolution('tempest-cannonade')) {
      fireTempestCannonade(this.scene);
      this.cooldownMs = this.withCDR(400); // 0.4s cadence
      return;
    }
    const cfg = this.configFor(lvl);
    this.fire(cfg);
    this.cooldownMs = this.withCDR(cfg.intervalMs);
  }

  private configFor(lvl: number): {
    chains: number;
    intervalMs: number;
    dmg: number;
    chainRange: number;
    stunMs: number;
  } {
    switch (lvl) {
      // PRD 7 buff: 2500→2000ms (1.25× rate) since the elemental is now the only starter weapon.
      case 1: return { chains: 1, intervalMs: 2000, dmg: 2, chainRange: 150, stunMs: 0 };
      case 2: return { chains: 2, intervalMs: 2000, dmg: 2, chainRange: 150, stunMs: 0 };
      case 3: return { chains: 3, intervalMs: 2000, dmg: 3, chainRange: 150, stunMs: 0 };
      case 4: return { chains: 4, intervalMs: 1500, dmg: 3, chainRange: 150, stunMs: 300 };
      case 5:
      default: return { chains: 5, intervalMs: 1000, dmg: 4, chainRange: 150, stunMs: 500 };
    }
  }

  private fire(cfg: ReturnType<typeof this.configFor>): void {
    const first = this.scene.enemies.nearestTo(this.scene.player.x, this.scene.player.y);
    if (!first) return;

    const visited = new Set<number>();
    let prev: Enemy = first;
    let prevX = this.scene.player.x;
    let prevY = this.scene.player.y;

    for (let i = 0; i <= cfg.chains; i++) {
      if (!prev) break;
      visited.add(prev.runtimeId);

      const roll = rollDamage(this.scene.runState, cfg.dmg);
      // Lightning × Wet reaction gives Electrocute +dmg burst. Detection happens in ReactionSystem.
      const wetBonus = prev.statuses.has('wet') ? 2.0 : 1.0;
      const applied = prev.takeDamage(roll.damage * wetBonus, 0, roll.isCrit);
      this.scene.damageNumbers.spawn(prev.x, prev.y, applied, { crit: roll.isCrit });

      if (cfg.stunMs > 0) prev.statuses.apply('shock', cfg.stunMs);

      // Visual bolt from prev to current target.
      this.drawBolt(prevX, prevY, prev.x, prev.y);

      // Find next chain target.
      prevX = prev.x;
      prevY = prev.y;
      const next = this.findChain(prev, cfg.chainRange, visited);
      if (!next) break;
      prev = next;
    }
  }

  private findChain(from: Enemy, range: number, visited: Set<number>): Enemy | null {
    const r2 = range * range;
    let best: Enemy | null = null;
    let bestD2 = Infinity;
    this.scene.enemies.forEachActive((e) => {
      if (visited.has(e.runtimeId)) return;
      const dx = e.x - from.x;
      const dy = e.y - from.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) return;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    });
    return best;
  }

  private drawBolt(x1: number, y1: number, x2: number, y2: number): void {
    const g = this.scene.add.graphics();
    g.lineStyle(4, 0x8ae8ff, 1).beginPath().moveTo(x1, y1);
    // Jittered segments for lightning feel.
    const segments = 6;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = Phaser.Math.Linear(x1, x2, t) + (Math.random() * 18 - 9);
      const y = Phaser.Math.Linear(y1, y2, t) + (Math.random() * 18 - 9);
      g.lineTo(x, y);
    }
    g.strokePath();
    g.setDepth(20);
    this.scene.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0 },
      duration: 200,
      onComplete: () => g.destroy(),
    });
  }
}
