import type { StageScene } from '../scenes/stage-scene';
import { rollDamage } from '../systems/battle';
import type { Enemy } from '../entities/enemy';
import Phaser from 'phaser';

/**
 * Per-weapon bespoke evolution behaviors.
 *
 * Each function replaces the "normal" L5 behavior with the dramatic
 * evolution transform spec'd in docs/games/boat-shooter/06-evolutions.md.
 * Weapons check `scene.runState.hasEvolution(id)` and call the matching
 * evolved function if present.
 */

/** E1 Cannonade Supreme — 6 spiraling projectiles + heavy mortar every 6th shot. */
export function fireCannonadeSupreme(scene: StageScene, shotCounterRef: { n: number }): void {
  const p = scene.player;
  const pool = scene.weapons.projectiles;
  shotCounterRef.n += 1;
  // Spiral: projectile angles rotate each shot so the pattern sweeps.
  const rotation = (shotCounterRef.n * 0.3) % (Math.PI * 2);
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (i / 6 - 0.5) * 0.8 + rotation;
    const speed = 820;
    const roll = rollDamage(scene.runState, 3);
    const proj = pool.acquire();
    proj.spawn({
      x: p.x + Math.cos(angle) * 30,
      y: p.y + Math.sin(angle) * 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: roll.damage,
      pierce: 3,
      ttlMs: 2200,
      radius: 9,
      color: 0xffd85a,
      weaponId: 'bow-cannon',
      isCrit: roll.isCrit,
    });
  }
  // Every 6th shot: heavy mortar to random enemy.
  if (shotCounterRef.n % 6 === 0) {
    const enemies: { x: number; y: number }[] = [];
    scene.enemies.forEachActive((e) => enemies.push({ x: e.x, y: e.y }));
    const tgt = enemies.length > 0 ? enemies[Math.floor(Math.random() * enemies.length)]! : { x: p.x, y: p.y - 400 };
    scene.time.delayedCall(900, () => {
      scene.fx.explosion(tgt.x, tgt.y, 120, 0xffaa3a);
      const r2 = 120 * 120;
      scene.enemies.forEachActive((e) => {
        const dx = e.x - tgt.x;
        const dy = e.y - tgt.y;
        if (dx * dx + dy * dy <= r2) {
          const roll = rollDamage(scene.runState, 10);
          e.takeDamage(roll.damage, 0, roll.isCrit);
          scene.damageNumbers.spawn(e.x, e.y, roll.damage, { crit: roll.isCrit });
        }
      });
    });
  }
}

/** E2 Thunderclap Broadside — synchronized salvo + radial shockwave. */
export function fireThunderclapBroadside(scene: StageScene): void {
  const p = scene.player;
  const pool = scene.weapons.projectiles;
  // All 10 cannons fire simultaneously at the player flanks.
  for (const sign of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const baseAngle = sign === -1 ? Math.PI : 0;
      const spreadDeg = (i - 2) * 8;
      const angle = baseAngle + (spreadDeg * Math.PI) / 180;
      const speed = 750;
      const roll = rollDamage(scene.runState, 4);
      const proj = pool.acquire();
      proj.spawn({
        x: p.x + sign * 30,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: roll.damage,
        pierce: 2,
        ttlMs: 2000,
        radius: 10,
        color: 0xff9b47,
        weaponId: 'broadside',
        isCrit: roll.isCrit,
      });
    }
  }
  // Radial shockwave — damage + knockback within 300 px.
  // Screen shake intentionally omitted (user feedback 2026-04-24): the
  // only shake-worthy moment is damage TAKEN by the player, not fire.
  scene.fx.explosion(p.x, p.y, 300, 0xffd85a);
  const r2 = 300 * 300;
  scene.enemies.forEachActive((e) => {
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    if (dx * dx + dy * dy > r2) return;
    const roll = rollDamage(scene.runState, 3);
    e.takeDamage(roll.damage, 0, roll.isCrit);
    // Knockback.
    const len = Math.hypot(dx, dy) || 1;
    e.setPos(e.x + (dx / len) * 60, e.y + (dy / len) * 60);
  });
}

/** E3 Tempest Cannonade — permanent storm cloud above boat; unlimited chain. */
export function fireTempestCannonade(scene: StageScene): void {
  const p = scene.player;
  // Pick random enemy as primary target.
  const enemies: { x: number; y: number; hp: number; runtimeId: number }[] = [];
  scene.enemies.forEachActive((e) => enemies.push({ x: e.x, y: e.y, hp: e.hp, runtimeId: e.runtimeId }));
  if (enemies.length === 0) return;
  const primary = enemies[Math.floor(Math.random() * enemies.length)]!;
  // Chain unlimited within 200 px.
  const visited = new Set<number>();
  let prev = primary;
  let prevX = p.x;
  let prevY = p.y - 100;
  const maxChain = 12; // soft cap to prevent runaway
  for (let i = 0; i < maxChain; i++) {
    if (!prev) break;
    visited.add(prev.runtimeId);
    const enemy = findEnemy(scene, prev.runtimeId);
    if (enemy) {
      const roll = rollDamage(scene.runState, 4, 'lightning');
      enemy.takeDamage(roll.damage, 0, roll.isCrit);
      enemy.statuses.apply('shock', 300);
      scene.damageNumbers.spawn(enemy.x, enemy.y, roll.damage, { crit: roll.isCrit });
      drawBolt(scene, prevX, prevY, enemy.x, enemy.y);
      prevX = enemy.x;
      prevY = enemy.y;
    }
    // Find next within 200 px, not visited.
    const next = enemies.find(
      (e) => !visited.has(e.runtimeId) && Math.hypot(e.x - prevX, e.y - prevY) <= 200,
    );
    if (!next) break;
    prev = next;
  }
}

function findEnemy(scene: StageScene, id: number): Enemy | null {
  let found: Enemy | null = null;
  scene.enemies.forEachActive((e) => {
    if (e.runtimeId === id) found = e;
  });
  return found;
}

function drawBolt(scene: StageScene, x1: number, y1: number, x2: number, y2: number): void {
  const g = scene.add.graphics();
  g.lineStyle(4, 0x8ae8ff, 1).beginPath().moveTo(x1, y1);
  const segments = 5;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const x = Phaser.Math.Linear(x1, x2, t) + (Math.random() * 16 - 8);
    const y = Phaser.Math.Linear(y1, y2, t) + (Math.random() * 16 - 8);
    g.lineTo(x, y);
  }
  g.strokePath();
  g.setDepth(20);
  scene.tweens.add({ targets: g, alpha: { from: 1, to: 0 }, duration: 180, onComplete: () => g.destroy() });
}

/** E4 Inferno Breath — 360° fire aura, radius 320 px. */
export function tickInfernoBreath(scene: StageScene): void {
  const p = scene.player;
  const r2 = 320 * 320;
  scene.enemies.forEachActive((e) => {
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    if (dx * dx + dy * dy > r2) return;
    const roll = rollDamage(scene.runState, 3);
    e.takeDamage(roll.damage, 0, roll.isCrit);
    e.statuses.apply('burn', 6000, { dps: 6 });
  });
  // Visual — render a transparent disk around the player.
  const aura = scene.add.circle(p.x, p.y, 320, 0xff6a2a, 0.15);
  aura.setDepth(7);
  scene.tweens.add({
    targets: aura,
    alpha: { from: 0.15, to: 0 },
    duration: 200,
    onComplete: () => aura.destroy(),
  });
}

/** E5 Sawblade Fortress — 2 concentric axe rings (inner 6 fast, outer 10 slow) + reflect damage. */
// (Handled inline in spinning-axes.ts when evolution is held.)

/** E6 Leviathan Ink — tentacle slam every 3s + boss-poison-bypass. */
export function tickLeviathanInk(scene: StageScene, trailX: number, trailY: number): void {
  // Called each frame when the aura is active. Periodically summons a tentacle slam.
  if (!scene.leviathanInkState) scene.leviathanInkState = { nextSlamMs: 3000 };
  scene.leviathanInkState.nextSlamMs -= scene.game.loop.delta;
  if (scene.leviathanInkState.nextSlamMs > 0) return;
  scene.leviathanInkState.nextSlamMs = 3000;
  // Find highest-HP enemy in range.
  let target: ReturnType<typeof findEnemy> = null;
  let bestHp = 0;
  scene.enemies.forEachActive((e) => {
    if (e.hp > bestHp && Math.hypot(e.x - trailX, e.y - trailY) <= 350) {
      bestHp = e.hp;
      target = e;
    }
  });
  if (target) {
    const t = target as unknown as { x: number; y: number; takeDamage(d: number, ap: number, c: boolean): number; statuses: { apply(id: string, ms: number): void } };
    const roll = rollDamage(scene.runState, 25);
    t.takeDamage(roll.damage, 0, roll.isCrit);
    t.statuses.apply('shock', 1000);
    // Tentacle visual.
    const tent = scene.add.rectangle(t.x, t.y, 80, 30, 0x5a2a8a, 0.8);
    tent.setDepth(20);
    scene.tweens.add({
      targets: tent,
      scale: { from: 0.3, to: 1.3 },
      alpha: { from: 0.9, to: 0 },
      duration: 500,
      onComplete: () => tent.destroy(),
    });
  }
}

/** E7 Minefield — dense mines + kill-spawns-more. Mines persist no timer. */
// (Handled inline in stern-mines.ts when evolution held.)

/** E8 Ghost Armada — 6 permanent orbiting ghosts that auto-fire. */
// (Handled inline in ghost-crew-volley.ts when evolution held.)
