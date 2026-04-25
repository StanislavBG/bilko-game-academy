import Phaser from 'phaser';
import { PLAYER_BASELINE, COMBAT_BASELINE } from './constants';
import { applyMetaToRun, DEFAULT_META_LEVELS, type MetaLevels } from './meta';
import type { ModifierId } from './weekly';

/**
 * RunState holds all mutable state for the current campaign run:
 * player stats, weapons held, passives, coins, gems, XP, and derived
 * multipliers from passives. It's the single source of truth that
 * systems read when computing damage, fire rates, magnet radius, etc.
 *
 * A fresh RunState is created at campaign start; it's destroyed at
 * campaign end (win or die). Persistent state (meta tracks, gems-
 * between-runs, cosmetics) is separate — loaded from IndexedDB.
 */

export interface HeldWeapon {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
}

export interface HeldPassive {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
}

/** Emitted by RunState as high-level run events. */
export type RunEvent =
  | { type: 'hp-changed'; hp: number; maxHp: number }
  | { type: 'xp-changed'; xp: number; xpToNext: number; level: number }
  | { type: 'level-up'; newLevel: number }
  | { type: 'coins-changed'; total: number }
  | { type: 'gems-changed'; total: number }
  | { type: 'weapon-gained'; id: string }
  | { type: 'weapon-leveled'; id: string; level: number }
  | { type: 'passive-gained'; id: string }
  | { type: 'passive-leveled'; id: string; level: number }
  | { type: 'player-died' };

export class RunState extends Phaser.Events.EventEmitter {
  /* Player vitals */
  hp: number;
  readonly maxHpBase: number;
  hpFlatBonus = 0; // from stat boosts / meta

  /* Combat stats — baseline in constants, modified by passives/level-ups */
  speed: number;
  accel: number;
  magnetRadius: number;
  critChance: number;
  critMultiplier: number;
  baseDamage: number; // flat damage bonus from stat boosts
  damageMultiplier = 1.0; // multiplicative buffs (sum of passive percents applied via getters)
  coinValueMult: number;

  /* Loadout */
  readonly weapons: HeldWeapon[] = [];
  readonly passives: HeldPassive[] = [];
  static readonly MAX_WEAPONS = 6;
  static readonly MAX_PASSIVES = 6;

  /* Progression */
  xp = 0;
  level = 1;
  coins = 0; // in-run
  gems = 0; // in-run picks; added to persistent pool at campaign end or stage end

  /* Evolutions granted this run (weapon evo IDs). */
  readonly evolutions = new Set<string>();

  /* Treasure map fragments earned during this stage (reset on stage clear). */
  mapFragmentsThisStage = 0;

  /** Meta levels (persistent across runs; injected at construction). */
  readonly meta: MetaLevels;
  /** NG+ iteration (0 = normal; 1+ = NG+ remix). */
  readonly ngPlus: number;
  /** Difficulty tier — affects enemy HP/damage scalar at spawn. */
  readonly difficulty: 'easy' | 'normal' | 'hard' = 'normal';
  /** Active weekly-challenge modifiers — empty for normal runs. */
  readonly weeklyModifiers: readonly ModifierId[];

  /** Chosen starting ship — drives visual + starter weapon + stat tweaks.
   *  Set externally after construction via `applyShip()`. */
  shipId: import('./data/starting-ships').ShipId = 'ember-corsair';

  constructor(
    meta: MetaLevels = DEFAULT_META_LEVELS,
    ngPlus = 0,
    difficulty: 'easy' | 'normal' | 'hard' = 'normal',
    weeklyModifiers: readonly ModifierId[] = [],
  ) {
    super();
    this.maxHpBase = PLAYER_BASELINE.maxHP;
    this.hp = this.maxHpBase;
    this.speed = PLAYER_BASELINE.speed;
    this.accel = PLAYER_BASELINE.accel;
    this.magnetRadius = PLAYER_BASELINE.magnetRadius;
    this.critChance = PLAYER_BASELINE.critChance;
    this.critMultiplier = PLAYER_BASELINE.critMultiplier;
    this.baseDamage = COMBAT_BASELINE.baseDamage;
    this.coinValueMult = PLAYER_BASELINE.coinValueMult;
    this.meta = meta;
    this.ngPlus = ngPlus;
    this.difficulty = difficulty;
    this.weeklyModifiers = weeklyModifiers;

    applyMetaToRun(this, meta);
    if (meta.hull === 10) this.hpFlatBonus += 2; // extra +2 at L10

    // Apply weekly challenge modifiers that land on RunState itself.
    if (weeklyModifiers.includes('halved-hp')) {
      this.hpFlatBonus -= Math.floor(this.maxHp / 2);
    }
    if (weeklyModifiers.includes('double-crit')) {
      this.critChance += 1.0;
    }

    this.hp = this.maxHp;
  }

  hasWeeklyModifier(id: ModifierId): boolean {
    return this.weeklyModifiers.includes(id);
  }

  /**
   * Apply the starting-ship stat tweaks. Call ONCE per run, right after
   * RunState construction and before `new Player`. Idempotent-safe only
   * if `previousShipId` is passed; otherwise treat as fire-and-forget.
   */
  applyShip(config: import('./data/starting-ships').ShipConfig): void {
    this.shipId = config.id;
    const t = config.statTweaks;
    if (t.baseDamageMult !== undefined) this.damageMultiplier *= t.baseDamageMult;
    if (t.baseDamageFlat !== undefined) this.baseDamage += t.baseDamageFlat;
    if (t.maxHpDelta !== undefined) this.hpFlatBonus += t.maxHpDelta;
    if (t.speedDelta !== undefined) this.speed += t.speedDelta;
    if (t.critChanceDelta !== undefined) this.critChance += t.critChanceDelta;
    if (t.critMultiplierDelta !== undefined) this.critMultiplier += t.critMultiplierDelta;
    if (t.magnetRadiusDelta !== undefined) this.magnetRadius += t.magnetRadiusDelta;
    // Re-clamp HP to the new max.
    this.hp = this.maxHp;
  }

  /* ---------- HP ---------- */

  get maxHp(): number {
    return this.maxHpBase + this.hpFlatBonus;
  }

  heal(amount: number): void {
    if (amount <= 0 || this.hp >= this.maxHp) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.emitRun({ type: 'hp-changed', hp: this.hp, maxHp: this.maxHp });
  }

  damage(amount: number): void {
    if (amount <= 0 || this.hp <= 0) return;
    if (this.godmode) return; // debug — skip all incoming damage
    const wasAlive = this.hp > 0;
    this.hp = Math.max(0, this.hp - amount);
    this.emitRun({ type: 'hp-changed', hp: this.hp, maxHp: this.maxHp });
    if (wasAlive && this.hp <= 0) {
      this.emitRun({ type: 'player-died' });
    }
  }

  /** Debug: full invulnerability + 3× damage for bot playtests. Toggled via ?godmode=1. */
  godmode = false;

  /* ---------- XP / Level ---------- */

  xpToNext(): number {
    // Early-game curve is gentler so the first 2-3 level-ups land fast —
    // the player sees the upgrade-loop within 30s of Stage 1 instead of 60s.
    // L1→L2 needs 5 XP (was 10); L2→L3 needs 8; L3→L4 needs 12; then the
    // usual 1.22× compounding kicks in so late-game pacing is unchanged.
    if (this.level === 1) return 5;
    if (this.level === 2) return 8;
    if (this.level === 3) return 12;
    return Math.floor(12 * Math.pow(1.22, this.level - 3));
  }

  addXp(amount: number): void {
    if (amount <= 0) return;
    this.xp += amount;
    let leveledUp = false;
    while (this.xp >= this.xpToNext()) {
      this.xp -= this.xpToNext();
      this.level += 1;
      leveledUp = true;
      this.emitRun({ type: 'level-up', newLevel: this.level });
    }
    this.emitRun({
      type: 'xp-changed',
      xp: this.xp,
      xpToNext: this.xpToNext(),
      level: this.level,
    });
    // Note: the level-up event should be consumed by the StageScene to
    // pause and show the LevelUpScene. The event is emitted before
    // xp-changed so UI settles after the pick is made.
    void leveledUp;
  }

  /* ---------- Economy ---------- */

  addCoins(n: number): void {
    if (n === 0) return;
    this.coins = Math.max(0, this.coins + n);
    this.emitRun({ type: 'coins-changed', total: this.coins });
  }

  /** Spend coins — returns true if the purchase went through. */
  spendCoins(n: number): boolean {
    if (n <= 0 || this.coins < n) return false;
    this.coins -= n;
    this.emitRun({ type: 'coins-changed', total: this.coins });
    return true;
  }

  addGems(n: number): void {
    if (n <= 0) return;
    this.gems += n;
    this.emitRun({ type: 'gems-changed', total: this.gems });
  }

  /* ---------- Loadout ---------- */

  addOrLevelWeapon(id: string): boolean {
    const existing = this.weapons.find((w) => w.id === id);
    if (existing) {
      if (existing.level < 5) {
        existing.level = (existing.level + 1) as HeldWeapon['level'];
        this.emitRun({ type: 'weapon-leveled', id, level: existing.level });
        return true;
      }
      return false; // already max
    }
    if (this.weapons.length >= RunState.MAX_WEAPONS) return false;
    this.weapons.push({ id, level: 1 });
    this.emitRun({ type: 'weapon-gained', id });
    return true;
  }

  addOrLevelPassive(id: string): boolean {
    const existing = this.passives.find((p) => p.id === id);
    if (existing) {
      if (existing.level < 5) {
        existing.level = (existing.level + 1) as HeldPassive['level'];
        this.emitRun({ type: 'passive-leveled', id, level: existing.level });
        return true;
      }
      return false;
    }
    if (this.passives.length >= RunState.MAX_PASSIVES) return false;
    this.passives.push({ id, level: 1 });
    this.emitRun({ type: 'passive-gained', id });
    return true;
  }

  weaponLevel(id: string): number {
    return this.weapons.find((w) => w.id === id)?.level ?? 0;
  }

  passiveLevel(id: string): number {
    return this.passives.find((p) => p.id === id)?.level ?? 0;
  }

  hasEvolution(id: string): boolean {
    return this.evolutions.has(id);
  }

  grantEvolution(id: string): void {
    this.evolutions.add(id);
  }

  /* ---------- Typed emit ---------- */

  private emitRun(e: RunEvent): void {
    this.emit(e.type, e);
  }

  // Convenience typed subscribe (keeps callers from typing the event name as a string).
  onRun<T extends RunEvent['type']>(
    type: T,
    handler: (event: Extract<RunEvent, { type: T }>) => void,
  ): () => void {
    const wrapped = (event: Extract<RunEvent, { type: T }>): void => handler(event);
    this.on(type, wrapped);
    return () => this.off(type, wrapped);
  }
}
