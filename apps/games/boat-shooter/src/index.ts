import Phaser from 'phaser';
import type { GameContext, GameInstance, GameModule } from '@bilko/game-sdk';
import { StageScene } from './scenes/stage-scene';
import { HudScene } from './scenes/hud-scene';
import { LevelUpScene } from './scenes/level-up-scene';
import { MerchantScene } from './scenes/merchant-scene';
import { StageClearScene } from './scenes/stage-clear-scene';
import { GameOverScene } from './scenes/game-over-scene';
import { PauseScene } from './scenes/pause-scene';
import { ShipPickerScene } from './scenes/ship-picker-scene';
import { CombatLogScene } from './scenes/combat-log-scene';
import { PlayerPropsScene } from './scenes/player-props-scene';
import { RunSummaryScene } from './scenes/run-summary-scene';
import { PostMortemScene } from './scenes/post-mortem-scene';
import { RunState } from './run-state';
import { WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { DEFAULT_META_LEVELS, type MetaLevels } from './meta';
import { currentWeeklyChallenge } from './weekly';
import { currentDailyChallenge } from './daily';

/**
 * Boat Shooter — Game Module entry.
 *
 * The shell calls `mount(container, ctx)` which:
 *   1. Constructs a fresh RunState for this run.
 *   2. Creates a Phaser.Game in the container with the StageScene,
 *      HudScene, and LevelUpScene registered.
 *   3. Wires stage-clear + campaign-clear events to persist progress
 *      through `ctx.save` (IndexedDB).
 */

interface BoatShooterProgress {
  version: 1;
  stagesCleared: string[];
  gems: number;
  totalCoinsLifetime: number;
  meta: MetaLevels;
  ngPlus: number;
  campaignsCleared: number;
  achievements: string[];
  cosmetics: { hull: string; sails: string; figurehead: string; wake: string };
  mapFragments: number;
  mapsAssembled: string[];
  /** One-shot flag — set true the moment the opening tutorial finishes.
   *  Optional so legacy saves (pre-§1.1) read back as `undefined` → false. */
  tutorialSeen?: boolean;
}

const DEFAULT_PROGRESS: BoatShooterProgress = {
  version: 1,
  stagesCleared: [],
  gems: 0,
  totalCoinsLifetime: 0,
  meta: { ...DEFAULT_META_LEVELS },
  ngPlus: 0,
  campaignsCleared: 0,
  achievements: [],
  cosmetics: { hull: 'default', sails: 'anchor', figurehead: 'golden', wake: 'white' },
  mapFragments: 0,
  mapsAssembled: [],
  tutorialSeen: false,
};

const gameModule: GameModule = {
  id: 'boat-shooter',
  title: 'Boat Shooter',
  version: '0.1.0',
  mount(container: HTMLElement, ctx: GameContext): GameInstance {
    // Construct a placeholder RunState immediately; real meta-loaded one is
    // built after progress loads from IndexedDB.
    let runState = new RunState();
    let mergedProgress: BoatShooterProgress = DEFAULT_PROGRESS;

    // Device-pixel-ratio integration (docs/games/boat-shooter/24-asset-expansion-act-i.md §4.1).
    // Clamped to 3 so 4K/5K panels don't quadruple the render cost. Phaser 3
    // removed explicit `resolution` config fields on ScaleConfig + RenderConfig
    // around 3.6 (the renderer now tracks DPR internally through the scale
    // manager), so we still compute DPR here for the procedural canvas bakers
    // to size source textures up to retina density — see water-shader.ts et al.
    // The old API is passed through a cast to stay forward-compatible with
    // Phaser forks that re-introduce the field.
    const DPR = Math.min(window.devicePixelRatio || 1, 3);
    const scaleConfig: Phaser.Types.Core.ScaleConfig = {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    };
    (scaleConfig as Phaser.Types.Core.ScaleConfig & { resolution?: number }).resolution = DPR;
    const renderConfig: Phaser.Types.Core.RenderConfig = {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    };
    (renderConfig as Phaser.Types.Core.RenderConfig & { resolution?: number }).resolution = DPR;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      backgroundColor: '#0a4052',
      scale: scaleConfig,
      render: renderConfig,
      banner: false,
      audio: { disableWebAudio: false },
      // Empty scene list — scenes are registered + started after progress
      // loads so StageScene never auto-boots without its `init` data.
      scene: [],
    });

    // Resolve optional stage from URL ?stage=N; ?weekly=1 or ?daily=1 activates
    // the corresponding seeded challenge. If both flags are set, daily wins so
    // modifiers don't double-apply.
    const urlParams = new URLSearchParams(window.location.search);
    const stageParam = urlParams.get('stage');
    const stageId: string | number | undefined = stageParam !== null
      ? (Number.isFinite(Number(stageParam)) ? Number(stageParam) : stageParam)
      : undefined;
    const dailyMode = urlParams.get('daily') === '1';
    const weeklyMode = !dailyMode && urlParams.get('weekly') === '1';
    const godmode = urlParams.get('godmode') === '1';
    const speed = Math.max(1, Math.min(20, Number(urlParams.get('speed')) || 1));
    // Resolve the daily challenge once so the dateKey is stable across events
    // emitted during this run (even if the UTC day rolls over mid-campaign).
    const daily = dailyMode ? currentDailyChallenge() : null;

    // Load persistent progress BEFORE starting the stage so meta-tracks + NG+ apply.
    game.events.once(Phaser.Core.Events.READY, async () => {
      const loaded = await ctx.save.load<BoatShooterProgress>('progress', DEFAULT_PROGRESS);
      mergedProgress = { ...DEFAULT_PROGRESS, ...loaded, meta: { ...DEFAULT_META_LEVELS, ...(loaded.meta ?? {}) } };
      const weekly = weeklyMode ? currentWeeklyChallenge() : null;
      const modifiers = daily ? daily.modifiers : weekly ? weekly.modifiers : [];
      runState = new RunState(
        mergedProgress.meta,
        mergedProgress.ngPlus,
        'normal',
        modifiers,
      );
      if (godmode) runState.godmode = true;
      // Daily runs force a specific ship and bypass the picker entirely.
      if (daily) runState.shipId = daily.shipId;
      game.scene.add(StageScene.KEY, StageScene, false);
      // Stash desired speed on the scene manager so StageScene can pick it up in create().
      (game as unknown as { _bilkoSpeed?: number })._bilkoSpeed = speed;
      game.scene.add('HudScene', HudScene, false);
      game.scene.add('LevelUpScene', LevelUpScene, false);
      game.scene.add('MerchantScene', MerchantScene, false);
      game.scene.add('StageClearScene', StageClearScene, false);
      game.scene.add('GameOverScene', GameOverScene, false);
      game.scene.add('PauseScene', PauseScene, false);
      game.scene.add(ShipPickerScene.KEY, ShipPickerScene, false);
      game.scene.add(CombatLogScene.KEY, CombatLogScene, false);
      game.scene.add(PlayerPropsScene.KEY, PlayerPropsScene, false);
      game.scene.add(RunSummaryScene.KEY, RunSummaryScene, false);
      game.scene.add(PostMortemScene.KEY, PostMortemScene, false);

      // Fresh runs boot into the ship picker first. A "fresh run" is:
      //   - no ?stage= URL param, OR
      //   - ?stage=1 (explicitly starting from the beginning).
      // Mid-campaign jumps (?stage=2 and up) skip the picker and use the
      // default Ember Corsair — picking a ship mid-campaign doesn't fit
      // the narrative and would trigger stat-tweak double-apply.
      //
      // Daily runs also skip the picker: the ship is locked by the seed so
      // every player competes on identical terms.
      const isFreshRun = stageId === undefined || stageId === 1 || stageId === '1';
      if (daily) {
        game.scene.start(StageScene.KEY, {
          ctx, runState, stageId, cosmetics: mergedProgress.cosmetics,
          shipId: daily.shipId,
        });
      } else if (isFreshRun) {
        game.scene.start(ShipPickerScene.KEY, {
          ctx, runState, stageId, cosmetics: mergedProgress.cosmetics,
        });
      } else {
        game.scene.start(StageScene.KEY, {
          ctx, runState, stageId, cosmetics: mergedProgress.cosmetics,
        });
      }
    });

    // Persist progress when stage completes.
    const offStageClear = ctx.events.on('stage-clear', async (e) => {
      if (daily) {
        // Mirror the score formula used by StageScene.completeStage() so the
        // daily leaderboard ranks on the same basis as per-stage/campaign.
        const dailyScore =
          runState.coins +
          runState.gems * 50 +
          runState.level * 100 +
          runState.evolutions.size * 500;
        void ctx.leaderboard.submit({
          board: `daily-${daily.dateKey}`,
          score: dailyScore,
          durationMs: e.timeMs,
          meta: { stageId: e.stageId, shipId: daily.shipId },
        });
      }
      const progress = await ctx.save.load<BoatShooterProgress>('progress', DEFAULT_PROGRESS);
      const merged: BoatShooterProgress = { ...DEFAULT_PROGRESS, ...progress, meta: { ...DEFAULT_META_LEVELS, ...(progress.meta ?? {}) } };
      const next: BoatShooterProgress = {
        ...merged,
        stagesCleared: Array.from(new Set([...merged.stagesCleared, e.stageId])),
        gems: merged.gems + runState.gems,
        totalCoinsLifetime: merged.totalCoinsLifetime + runState.coins,
        mapFragments: merged.mapFragments + runState.mapFragmentsThisStage,
      };
      // Reset the in-run gems + fragment accumulator so they're not double-counted.
      runState.gems = 0;
      runState.mapFragmentsThisStage = 0;
      await ctx.save.save('progress', next);
      mergedProgress = next;
    });

    const offCampaignClear = ctx.events.on('campaign-clear', async (e) => {
      if (daily) {
        const campaignScore =
          runState.coins +
          runState.gems * 50 +
          runState.level * 100 +
          runState.evolutions.size * 500;
        void ctx.leaderboard.submit({
          board: `daily-${daily.dateKey}`,
          score: campaignScore,
          durationMs: e.timeMs,
          meta: { event: 'campaign-clear', shipId: daily.shipId },
        });
      }
      const progress = await ctx.save.load<BoatShooterProgress>('progress', DEFAULT_PROGRESS);
      const merged: BoatShooterProgress = { ...DEFAULT_PROGRESS, ...progress, meta: { ...DEFAULT_META_LEVELS, ...(progress.meta ?? {}) } };
      await ctx.save.save('progress', {
        ...merged,
        campaignsCleared: merged.campaignsCleared + 1,
        ngPlus: Math.max(merged.ngPlus, 1),
      });
    });

    return {
      unmount(): void {
        offStageClear();
        offCampaignClear();
        game.destroy(true, false);
      },
      pause(): void {
        game.scene.getScenes(true).forEach((s) => s.scene.pause());
      },
      resume(): void {
        game.scene.getScenes(true).forEach((s) => s.scene.resume());
      },
      getSave(): unknown {
        return {
          version: 1,
          currentRun: {
            level: runState.level,
            hp: runState.hp,
            weapons: runState.weapons,
            passives: runState.passives,
            coins: runState.coins,
            gems: runState.gems,
          },
        };
      },
      applySettings(): void {
        // Settings-driven toggles (reduced motion caps, colorblind remap, volume
        // routing) will apply in P6 when the Polish pass wires each system to
        // ctx.settings. For P1 the game just re-reads settings on demand.
      },
    };
  },
};

export default gameModule;
