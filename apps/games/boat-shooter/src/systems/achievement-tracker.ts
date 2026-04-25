import type { GameContext } from '@bilko/game-sdk';
import type { StageScene } from '../scenes/stage-scene';
import { ACHIEVEMENTS } from '../achievements';

/**
 * Hooks GameContext events to detect achievement unlocks and persist them.
 * Unlocks emit `{ type: 'achievement', id }` so the shell's toast component
 * can show a gold banner.
 */
export class AchievementTracker {
  private unlocked = new Set<string>();
  private killsThisRun = 0;
  private killsLifetime = 0;
  private critsFired = 0;
  private bankSnipersLifetime = 0;
  private cursedChestsLifetime = 0;
  private electrocutesThisRun = 0;
  private lowHpSecondsHeld = 0;
  private merchantPurchasedThisRun = false;

  constructor(private readonly scene: StageScene, private readonly ctx: GameContext) {
    this.loadUnlocked();

    this.ctx.events.on('enemy-killed', (e) => {
      this.killsThisRun += 1;
      this.killsLifetime += 1;
      if (this.killsThisRun === 1) this.unlock('first-blood');
      if (this.killsThisRun >= 100) this.unlock('combo-100');
      if (this.killsLifetime >= 1000) this.unlock('kill-1000');
      if (e.enemyId === 'bank-sniper-tower') {
        this.bankSnipersLifetime += 1;
        if (this.bankSnipersLifetime >= 50) this.unlock('bank-50');
      }
    });

    this.ctx.events.on('boss-defeated', (e) => {
      const map: Record<string, string> = {
        'frigate-captain': 'boss-frigate',
        'pirate-king': 'boss-pirate-king',
        'ghost-commodore': 'boss-ghost-commodore',
        'obsidian-warlord': 'boss-obsidian',
        'kraken-ancient': 'boss-kraken',
      };
      const aid = map[e.bossId];
      if (aid) this.unlock(aid);
    });

    this.ctx.events.on('stage-clear', (e) => {
      if (e.stageId.includes('stage-5')) this.unlock('act-i');
      if (e.stageId.includes('stage-10')) this.unlock('act-ii');
      if (e.stageId.includes('stage-15')) this.unlock('act-iii');
      if (e.stageId.startsWith('hidden-')) this.unlock('hidden-stage');
      // End-of-stage build checks — armory-maxed if all held weapons are L5.
      const rs = this.scene.runState;
      if (rs.weapons.length >= 6 && rs.weapons.every((w) => w.level === 5)) {
        this.unlock('all-weapons-l5');
      }
    });

    this.ctx.events.on('campaign-clear', (e) => {
      if (e.difficulty.startsWith('normal+')) this.unlock('clear-ngplus');
      const rs = this.scene.runState;
      if (rs.difficulty === 'easy') this.unlock('clear-easy');
      else if (rs.difficulty === 'hard') this.unlock('clear-hard');
      else this.unlock('clear-normal');
      if (!this.merchantPurchasedThisRun) this.unlock('no-merchant');
      if (rs.weapons.length === 1) this.unlock('one-weapon');
    });

    this.ctx.events.on('evolution', () => {
      this.unlock('first-evo');
      if (this.scene.runState.evolutions.size >= 8) this.unlock('all-evolutions');
    });

    // Tick HP-at-1 survival every second (simple 1s polling loop).
    this.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.scene.runState.hp === 1) {
          this.lowHpSecondsHeld += 1;
          if (this.lowHpSecondsHeld >= 30) this.unlock('survive-low');
        } else {
          this.lowHpSecondsHeld = 0;
        }
      },
    });
  }

  notifyCrit(): void {
    this.critsFired += 1;
    if (this.critsFired === 1) this.unlock('first-crit');
  }

  notifyGemsInRun(total: number): void {
    if (total >= 100) this.unlock('100-gems-run');
  }

  /** Called by reaction system when a reaction fires. */
  notifyReaction(reactionId: string, targetIsBoss: boolean): void {
    if (reactionId === 'electrocute') {
      this.electrocutesThisRun += 1;
      if (this.electrocutesThisRun >= 10) this.unlock('electrocute-10');
    }
    if (reactionId === 'cataclysm') this.unlock('cataclysm');
    if (reactionId === 'supernova' && targetIsBoss) this.unlock('supernova-boss');
    if (reactionId === 'shatter' && targetIsBoss) this.unlock('shatter-boss');
  }

  notifyMerchantPurchase(): void {
    this.merchantPurchasedThisRun = true;
  }

  notifyCursedChestOpened(): void {
    this.cursedChestsLifetime += 1;
    if (this.cursedChestsLifetime >= 10) this.unlock('cursed-10');
  }

  notifyCursedAmbushSurvived(): void {
    this.unlock('survive-ambush');
  }

  notifyMapAssembled(mapId: 1 | 2 | 3 | 4 | 5): void {
    this.unlock(`map-${mapId}`);
  }

  private async loadUnlocked(): Promise<void> {
    const progress = (await this.ctx.save.load<{ achievements?: string[]; killsLifetime?: number }>('progress', {})) ?? {};
    for (const id of progress.achievements ?? []) this.unlocked.add(id);
    this.killsLifetime = progress.killsLifetime ?? 0;
  }

  private async unlock(id: string): Promise<void> {
    if (this.unlocked.has(id)) return;
    if (!ACHIEVEMENTS.some((a) => a.id === id)) return;
    this.unlocked.add(id);
    this.ctx.events.emit({ type: 'achievement', id });

    const progress = (await this.ctx.save.load<{ achievements?: string[]; killsLifetime?: number }>('progress', {})) ?? {};
    await this.ctx.save.save('progress', {
      ...progress,
      achievements: Array.from(new Set([...(progress.achievements ?? []), id])),
      killsLifetime: this.killsLifetime,
    });
  }
}
