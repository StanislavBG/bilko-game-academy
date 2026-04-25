import type { StageScene } from '../scenes/stage-scene';
import type { Enemy } from '../entities/enemy';
import type { StatusId } from './status';
import matrix from '../data/reactions.json';

/**
 * Reaction detection + triggering.
 *
 * Rules (docs/games/boat-shooter/07-battle-system.md §4.6.4):
 *   - Fire when both/all required statuses are simultaneously active.
 *   - Per-enemy cooldown of 1.0 s per reaction.
 *   - 3-way reactions take priority — they consume all statuses before
 *     any 2-way can fire.
 *   - Bosses & mini-bosses take 20% reaction damage but full durations.
 *   - Each reaction has a distinct SFX sting + particle burst + toast label.
 */

interface ReactionDef {
  id: string;
  label: string;
  color: string;
  requires: StatusId[];
  consumes: StatusId[];
  effect: Record<string, unknown> & { kind: string };
}

interface ReactionMatrixJson {
  twoWay: ReactionDef[];
  threeWay: ReactionDef[];
  bossDamageScale: number;
  perEnemyCooldownMs: number;
}

const M = matrix as ReactionMatrixJson;

export class ReactionSystem {
  constructor(private readonly scene: StageScene) {}

  /** Called each frame — scan every enemy for eligible reactions. */
  update(_deltaMs: number): void {
    this.scene.enemies.forEachActive((e) => this.scanEnemy(e));
  }

  private scanEnemy(enemy: Enemy): void {
    const statuses = enemy.statuses;
    if (statuses.map.size < 2) return;

    const now = this.scene.time.now;
    const cds = enemy.reactionCooldowns ?? (enemy.reactionCooldowns = new Map());

    // 3-way takes priority.
    for (const r of M.threeWay) {
      if (!r.requires.every((s) => statuses.has(s))) continue;
      if ((cds.get(r.id) ?? 0) > now) continue;
      this.trigger(enemy, r);
      cds.set(r.id, now + M.perEnemyCooldownMs);
      return; // one reaction per frame per enemy
    }

    for (const r of M.twoWay) {
      if (!r.requires.every((s) => statuses.has(s))) continue;
      if ((cds.get(r.id) ?? 0) > now) continue;
      this.trigger(enemy, r);
      cds.set(r.id, now + M.perEnemyCooldownMs);
      return;
    }
  }

  private trigger(enemy: Enemy, r: ReactionDef): void {
    // Consume.
    for (const id of r.consumes) enemy.statuses.remove(id);

    // Apply effect.
    const isBoss = enemy.spec.armor >= 3 && enemy.spec.maxHp >= 40; // heuristic until Enemy has an explicit flag
    const dmgScale = isBoss ? M.bossDamageScale : 1.0;

    this.applyEffect(enemy, r, dmgScale);

    // Visual toast.
    this.spawnToast(enemy.x, enemy.y - (enemy.spec.visualRadius ?? enemy.spec.collisionRadius) - 24, r);

    // Particle burst.
    this.particleBurst(enemy.x, enemy.y, parseHexColor(r.color));

    // Achievement hooks — reaction IDs come straight from reactions.json.
    this.scene.achievements?.notifyReaction(r.id.toLowerCase(), isBoss);

    // Combat log + cyan screen-edge pulse.
    this.scene.combatLog?.push({
      kind: 'reaction',
      time: Date.now(),
      target: enemy.spec.id,
      reaction: r.id,
      amount: 0,
    });
    this.scene.vignette?.pulseOnDamage(2, 'cyan');
  }

  private applyEffect(enemy: Enemy, r: ReactionDef, dmgScale: number): void {
    const e = r.effect;
    switch (e.kind) {
      case 'lightning-multiplier': {
        const dmg = 4 * dmgScale; // baseline "reaction punch"; true multiplier applied in battle for live lightning hits
        enemy.takeStatusDamage(dmg * (e.multiplier as number) / 4, 'shock');
        if (typeof e.stunMs === 'number') {
          enemy.statuses.apply('shock', e.stunMs);
        }
        break;
      }
      case 'aoe': {
        const radius = e.radius as number;
        const dmg = (e.damage as number) * dmgScale;
        this.aoeDamage(enemy.x, enemy.y, radius, dmg);
        if (typeof e.slowMs === 'number') {
          // slowFactor not used in P2 directly — deferred; Poison handles slow for now.
        }
        if (typeof e.stunMs === 'number') {
          enemy.statuses.apply('shock', e.stunMs);
        }
        if (e.reapplyAll === true) {
          enemy.statuses.apply('burn', 3000, { dps: 3 });
          enemy.statuses.apply('poison', 3000, { dps: 2 });
          enemy.statuses.apply('shock', 500);
        }
        break;
      }
      case 'burst': {
        enemy.takeStatusDamage((e.damage as number) * dmgScale, 'burn');
        break;
      }
      case 'extend-freeze': {
        const f = enemy.statuses.map.get('freeze');
        if (f) {
          const mul = (e.multiplier as number) ?? 1;
          const add = (e.addMs as number) ?? 0;
          f.remainingMs = f.remainingMs * mul + add;
        }
        if (e.applyPoisonOnThaw === true) {
          // Stash a flag on the enemy for when freeze expires.
          enemy.pendingPoisonOnThaw = true;
        }
        break;
      }
      case 'intensify-dot': {
        for (const s of enemy.statuses.map.values()) {
          if ((s.id === 'burn' || s.id === 'poison') && s.dpsDamage !== undefined) {
            s.dpsDamage *= e.multiplier as number;
          }
        }
        break;
      }
      case 'next-hit-multiplier': {
        enemy.shatterPending = {
          multiplier: e.multiplier as number,
          bypassArmor: e.bypassArmor === true,
        };
        break;
      }
      case 'stun-per-tick': {
        // Convulsion: while Poison active, each tick stuns 0.1 s.
        enemy.convulsionActive = true;
        break;
      }
      case 'spread-poison': {
        const count = (e.targets as number) ?? 3;
        const radius = (e.radius as number) ?? 100;
        const near: Enemy[] = [];
        this.scene.enemies.forEachActive((other) => {
          if (other === enemy) return;
          if (other.distanceTo(enemy.x, enemy.y) <= radius) near.push(other);
        });
        near.slice(0, count).forEach((n) => n.statuses.apply('poison', 3000, { dps: 2 }));
        break;
      }
      case 'screen-clear': {
        const dmg = (e.damage as number) * dmgScale;
        this.scene.enemies.forEachActive((n) => {
          n.takeStatusDamage(dmg, 'shock');
          n.statuses.apply('freeze', (e.freezeMs as number) ?? 1000);
        });
        this.scene.cameras.main.flash(400, 255, 255, 255);
        break;
      }
      case 'frost-zone': {
        const radius = (e.radius as number) ?? 150;
        const dps = (e.dps as number) ?? 3;
        const dur = (e.durationMs as number) ?? 5000;
        this.scene.aoeZone.spawn(enemy.x, enemy.y, radius, dur, dps, 'freeze-tick');
        break;
      }
    }
  }

  private aoeDamage(x: number, y: number, radius: number, dmg: number): void {
    const r2 = radius * radius;
    this.scene.enemies.forEachActive((e) => {
      if ((e.x - x) * (e.x - x) + (e.y - y) * (e.y - y) <= r2) {
        e.takeStatusDamage(dmg, 'burn');
      }
    });
    this.scene.damageNumbers.spawn(x, y, dmg, { crit: false });
  }

  private spawnToast(x: number, y: number, r: ReactionDef): void {
    const t = this.scene.add.text(x, y, r.label, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '24px',
      color: r.color,
      stroke: '#000',
      strokeThickness: 3,
    });
    t.setOrigin(0.5, 1);
    t.setDepth(60);
    this.scene.tweens.add({
      targets: t,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  private particleBurst(x: number, y: number, color: number): void {
    const c = this.scene.add.circle(x, y, 8, color, 1);
    c.setDepth(55);
    this.scene.tweens.add({
      targets: c,
      scale: { from: 1, to: 5 },
      alpha: { from: 1, to: 0 },
      duration: 500,
      onComplete: () => c.destroy(),
    });
  }
}

function parseHexColor(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}
