import Phaser from 'phaser';
import type { GameContext } from '@bilko/game-sdk';
import { WORLD_WIDTH, WORLD_HEIGHT, RIVER_SCROLL_SPEED, SAFE_AREA_MARGIN, PLAYER_PLAY_MARGIN, HUD_DECK_HEIGHT } from '../constants';
import { RunState } from '../run-state';
import { Player } from '../entities/player';
import { WeaponSystem } from '../weapons/weapon-system';
import { EnemySystem } from '../entities/enemy-system';
import { PickupSystem } from '../entities/pickup-system';
import { DamageNumberSystem } from '../entities/damage-number';
import { CollisionSystem } from '../systems/collision';
import { WaveSpawner } from '../systems/wave-spawner';
import { stageById } from '../data/stages';
import type { StageSpec } from '../systems/wave-spawner';
import { getEnvironmentForStage } from '../content/active-pack';
import { StatusSystem } from '../systems/status';
import { ReactionSystem } from '../systems/reactions';
import { AoeZoneSystem } from '../systems/aoe-zone';
import { ChestSystem } from '../entities/chest';
import { MerchantSystem } from '../systems/merchant';
import { ShipwrightChestSystem } from '../systems/evolution-chest';
import { FxSystem } from '../systems/fx';
import { WaterShader, type WaterBiome } from '../systems/water-shader';
import { Vignette } from '../systems/vignette';
import { AudioSystem } from '../systems/audio';
import { AchievementTracker } from '../systems/achievement-tracker';
import { preloadSprites } from '../systems/sprite-loader';
import { ensureShipVariants } from '../systems/ship-compositor';
import { WeatherSystem } from '../systems/weather';
import { SceneryLayer } from '../systems/scenery';
import { CombatLog } from '../systems/combat-log';
import type { ShipConfig, ShipId } from '../data/starting-ships';
import { getShipConfig } from '../data/starting-ships';
import { HazardSystem } from '../entities/hazards';
import { DecorationSystem } from '../entities/decorations';
import { TutorialSystem, shouldRunTutorial } from '../systems/tutorial';

/**
 * Main gameplay scene. Owns the player, entities, systems, and the wave
 * timeline. HudScene runs in parallel as an overlay; LevelUpScene is
 * launched on level-up and pauses this scene.
 */
export class StageScene extends Phaser.Scene {
  static readonly KEY = 'StageScene';

  private water!: WaterShader;

  player!: Player;
  runState!: RunState;

  weapons!: WeaponSystem;
  enemies!: EnemySystem;
  pickups!: PickupSystem;
  damageNumbers!: DamageNumberSystem;
  collision!: CollisionSystem;
  spawner!: WaveSpawner;
  statuses!: StatusSystem;
  reactions!: ReactionSystem;
  aoeZone!: AoeZoneSystem;
  chests!: ChestSystem;
  merchant!: MerchantSystem;
  shipwright!: ShipwrightChestSystem;
  fx!: FxSystem;
  vignette!: Vignette;
  audio!: AudioSystem;
  achievements!: AchievementTracker;
  weather!: WeatherSystem;
  scenery!: SceneryLayer;
  hazards!: HazardSystem;
  decorations!: DecorationSystem;
  /** Opening tutorial (§1.1). Only instantiated on the first Stage-1 fresh run.
   *  When `tutorial?.active === true` the WaveSpawner is skipped in update(). */
  tutorial?: TutorialSystem;
  /** True between shouldRunTutorial() firing and the async progress load resolving.
   *  While pending, the spawner is also paused so scripted waves don't spawn before
   *  the tutorial decides whether to start. O(1) per frame. */
  private tutorialPending = false;
  /** Player-facing combat log — populated by damage / kill / status systems. */
  combatLog!: CombatLog;
  /** Wall-clock ms at stage start; subtracted from Date.now() for log timestamps. */
  stageStartMs = 0;
  leviathanInkState?: { nextSlamMs: number };

  private _ctx!: GameContext;

  /** Time (ms) remaining until stage ends (after boss is dispatched). */
  stageEndedAt: number | null = null;

  constructor() {
    super({ key: StageScene.KEY });
  }

  private stageSpec!: StageSpec;
  /** Cosmetic selection from persistent profile. */
  cosmetics: { hull: string; sails: string; figurehead: string; wake: string } = {
    hull: 'default', sails: 'anchor', figurehead: 'golden', wake: 'white',
  };
  /** Visual ship tier (1..3 = Sloop → Cutter → Flagship across Act I). */
  shipTier: 1 | 2 | 3 = 3;
  /** Selected elemental ship config — drives visuals + starter loadout. */
  shipConfig: ShipConfig | undefined;

  init(data: {
    ctx: GameContext;
    runState: RunState;
    stageId?: string | number;
    cosmetics?: { hull: string; sails: string; figurehead: string; wake: string };
    shipId?: ShipId;
  }): void {
    this._ctx = data.ctx;
    this.runState = data.runState;
    this.stageSpec = data.stageId !== undefined ? stageById(data.stageId) : stageById(1);
    if (data.cosmetics) this.cosmetics = data.cosmetics;
    this.shipTier = this.shipTierForStage();
    // Ship config may already be set on runState (persisted mid-campaign);
    // init-time shipId overrides it so the picker can redirect mid-run.
    const shipId = data.shipId ?? this.runState.shipId;
    this.shipConfig = getShipConfig(shipId);
  }

  /** Stage → visual ship tier mapping. Later acts keep T3 by default. */
  private shipTierForStage(): 1 | 2 | 3 {
    const id = this.stageSpec.id;
    if (id.includes('stage-1')) return 1;
    if (id.includes('stage-2')) return 2;
    return 3;
  }

  preload(): void {
    // Preload AI-generated sprites (optional — scene still renders if assets are missing).
    preloadSprites(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a4052');
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    // Soft fade-in from black at stage start — gentler than cut-to-gameplay.
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Pick up the debug speed multiplier injected by the game module.
    const speedFromUrl = (this.game as unknown as { _bilkoSpeed?: number })._bilkoSpeed ?? 1;
    this.timeMultiplier = speedFromUrl;
    // Also scale Phaser's own tween + time system so delayedCalls + tweens
    // align with the accelerated gameplay.
    this.tweens.timeScale = speedFromUrl;
    this.time.timeScale = speedFromUrl;

    // FX + water first so everything else can rely on them.
    // Env data drives water/weather/scenery when the active pack ships an
    // EnvironmentSpec for this stage; otherwise fall through to the legacy
    // biome-by-id inference so default content plays exactly as before.
    this.fx = new FxSystem(this);
    this.water = new WaterShader(this);
    const env = getEnvironmentForStage(this.stageSpec.id);
    const biome = this.biomeForStage();
    if (env) {
      this.water.setEnvironment(env);
      this.riverScrollMul = env.riverScrollSpeedMul;
    } else {
      this.water.setBiome(biome);
    }
    this.vignette = new Vignette(this);
    this.vignette.setBiome(this.water.currentBiome());
    this.audio = new AudioSystem();
    this.audio.attachSettings(this._ctx.settings);
    this.achievements = new AchievementTracker(this, this._ctx);

    // Act-themed music loop based on biome.
    const resolvedBiome = this.water.currentBiome();
    const actIBiomes: WaterBiome[] = ['sunlit', 'rivermouth', 'channels', 'open-sea'];
    const act = actIBiomes.includes(resolvedBiome) ? 1 : resolvedBiome === 'fog' ? 2 : 3;
    this.audio.playActMusic(act);

    // Kill the music loop the moment this scene stops — prevents the
    // orchestral loop from bleeding into Home, Campaign, or GameOver.
    const stopAudio = (): void => {
      this.audio?.stopMusic();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stopAudio);
    this.events.once(Phaser.Scenes.Events.DESTROY, stopAudio);
    this.events.on(Phaser.Scenes.Events.SLEEP, stopAudio);
    // Resume music when the scene wakes back up (from pause/sleep).
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.audio.playActMusic(act));

    // Ambient weather (fog in Act II, ashfall in Act III).
    this.weather = new WeatherSystem(this);
    if (env) this.weather.setEnvironment(env);
    else this.weather.setBiome(biome);

    // Scenery — reeds / mangroves / fleet silhouettes; pure visual, no collision.
    this.scenery = new SceneryLayer(this);
    if (env) this.scenery.setEnvironment(env);
    else this.scenery.setBiome(biome);

    // Hazards — rocks + barrels drift in from above on a timer.
    this.hazards = new HazardSystem(this);
    this.decorations = new DecorationSystem(this);
    this.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => {
        if (Math.random() < 0.6) {
          this.hazards.spawnRock(
            SAFE_AREA_MARGIN + Math.random() * (WORLD_WIDTH - SAFE_AREA_MARGIN * 2),
            -80,
            40 + Math.random() * 30,
          );
        }
        if (Math.random() < 0.4) {
          this.hazards.spawnBarrel(
            SAFE_AREA_MARGIN + Math.random() * (WORLD_WIDTH - SAFE_AREA_MARGIN * 2),
            -80,
          );
        }
      },
    });

    // Combat log — zero-cost ring buffer the HUD scenes subscribe to.
    this.combatLog = new CombatLog();
    this.stageStartMs = Date.now();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('combatdebug') === '1') {
      this.combatLog.setVerboseDebug(true);
    }

    // Systems.
    this.damageNumbers = new DamageNumberSystem(this);
    this.pickups = new PickupSystem(this);
    this.enemies = new EnemySystem(this);
    this.weapons = new WeaponSystem(this);
    this.collision = new CollisionSystem(this);
    this.statuses = new StatusSystem(this);
    this.reactions = new ReactionSystem(this);
    this.aoeZone = new AoeZoneSystem(this);
    this.chests = new ChestSystem(this);
    this.merchant = new MerchantSystem(this);
    this.shipwright = new ShipwrightChestSystem(this);

    // Bake the per-ship sprite variants now — sprite-player is loaded,
    // and the chroma-key has already replaced the texture source with a
    // transparent canvas. Composited variants read from that canvas.
    ensureShipVariants(this);

    // Player.
    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT * 0.75);

    // Start the player with the chosen ship's loadout: ONLY the elemental
    // weapon + the elemental passive at L1 (PRD 7 — earn-your-power arc).
    // Bow Cannon stays in the level-up + merchant pool — players can pick
    // it as their second weapon if they want.
    if (this.shipConfig) {
      // Apply elemental stat tweaks once per run. If the player is
      // returning mid-campaign the tweaks were already baked in during
      // the first stage, so guard against double-apply by checking the
      // runState.shipId (set by applyShip).
      if (this.runState.shipId !== this.shipConfig.id) {
        this.runState.applyShip(this.shipConfig);
      }
      this.runState.addOrLevelWeapon(this.shipConfig.starterWeapon);
      this.runState.addOrLevelPassive(this.shipConfig.starterPassive);
    }

    // Wave schedule.
    this.spawner = new WaveSpawner(this, this.stageSpec);

    // Launch the HUD scene as an overlay.
    this.scene.launch('HudScene', { runState: this.runState });
    // Launch the glanceable bottom-corner panels (see
    // docs/games/boat-shooter/23-hud-and-combat-log.md). Both read through
    // `StageScene.KEY` so their scene-lookups point at us.
    this.scene.launch('CombatLogScene', { stageKey: StageScene.KEY });
    this.scene.launch('PlayerPropsScene', { stageKey: StageScene.KEY, runState: this.runState });

    // React to level-ups by pausing and launching LevelUpScene.
    this.runState.onRun('level-up', () => {
      this.audio.sfxLevelUp();
      this.scene.pause();
      this.scene.launch('LevelUpScene', { runState: this.runState, stageKey: this.scene.key });
    });

    // React to player death: pause + game-over overlay.
    this.runState.onRun('player-died', () => {
      this.scene.pause();
      this.scene.launch('GameOverScene', {
        runState: this.runState,
        stageId: this.stageSpec.id,
        ctx: this._ctx,
      });
    });

    // Escape pauses the stage (any time — even during loot-gather or boss intro).
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.scene.isActive() && !this.scene.isPaused()) {
        this.scene.pause();
        this.scene.launch('PauseScene', { stageKey: this.scene.key });
      }
    });
    // P also pauses (mouse-held players who can't reach Esc easily).
    this.input.keyboard?.on('keydown-P', () => {
      if (this.scene.isActive() && !this.scene.isPaused()) {
        this.scene.pause();
        this.scene.launch('PauseScene', { stageKey: this.scene.key });
      }
    });

    // Opening tutorial — async-gated by the `tutorialSeen` flag in persistent
    // save (§1.1 of docs/games/boat-shooter/26-game-designer-enhancements.md).
    // The URL flag `?tutorial=1` forces a replay; `?tutorial=0` suppresses it
    // even on a fresh save (handy for QA).
    this.maybeStartTutorial();

    // Skip the READY/GO banner when the tutorial is about to take over the
    // opening moments — it renders its own title card and would otherwise
    // stack on top of this one.
    if (!this.tutorialPending) {
      this.showStageIntro();
    }
  }

  /**
   * Resolves the tutorial URL flag synchronously, then async-loads progress to
   * check `tutorialSeen`. While the load is in flight the spawner is paused so
   * no wave spawns before the decision lands. Complexity: O(1).
   */
  private maybeStartTutorial(): void {
    const url = new URLSearchParams(window.location.search);
    const flag = url.get('tutorial');
    const urlFlag: 'force' | 'skip' | 'default' =
      flag === '1' ? 'force' : flag === '0' ? 'skip' : 'default';
    if (urlFlag === 'skip') return;

    const stageId = this.stageSpec.id;
    const level = this.runState.level;
    // Cheap pre-check — avoids the async save load entirely when stage/level
    // disqualify us anyway.
    const stageAllows = stageId.startsWith('stage-1-');
    if (!stageAllows && urlFlag !== 'force') return;
    if (level !== 1 && urlFlag !== 'force') return;

    this.tutorialPending = true;
    void (async (): Promise<void> => {
      let tutorialSeen = false;
      try {
        const prog = await this._ctx.save.load<{ tutorialSeen?: boolean }>('progress', {});
        tutorialSeen = prog?.tutorialSeen === true;
      } catch {
        tutorialSeen = false;
      }
      // Scene may have shut down between the kick-off and the resolve.
      if (!this.scene || !this.scene.isActive()) {
        this.tutorialPending = false;
        return;
      }
      const ok = shouldRunTutorial({ stageId, level, tutorialSeen, urlFlag });
      this.tutorialPending = false;
      if (!ok) return;
      this.tutorial = new TutorialSystem(this);
      this.tutorial.start();
    })();

    // On scene teardown, abort the tutorial to clean up UI + listeners.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.tutorial?.abort());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.tutorial?.abort());
  }

  /** Brief READY → GO! intro so the player has a beat before waves start.
   *  Also flashes the act-stage `displayCode` (e.g. "1-1 Rivermouth")
   *  per PRD 3 so the player feels the campaign progression. */
  private showStageIntro(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    // Stage label badge — small painterly card above the GET READY text.
    const code = this.stageSpec.displayCode ?? '';
    const labelText = code ? `${code}  •  ${this.stageSpec.title}` : this.stageSpec.title;
    const label = this.add.text(W / 2, H / 2 - 80, labelText, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '36px',
      color: '#cce4ea',
      stroke: '#000',
      strokeThickness: 4,
      resolution: Math.max(2, window.devicePixelRatio || 1),
    }).setOrigin(0.5, 0.5).setDepth(1500).setAlpha(0);
    this.tweens.add({ targets: label, alpha: 1, duration: 400 });
    this.time.delayedCall(1500, () => {
      this.tweens.add({ targets: label, alpha: 0, duration: 600, onComplete: () => label.destroy() });
    });

    const ready = this.add.text(W / 2, H / 2, 'GET READY', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '96px',
      color: '#e0b063',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5, 0.5).setDepth(1500).setAlpha(0);
    this.tweens.add({ targets: ready, alpha: 1, scale: { from: 0.6, to: 1 }, duration: 400, ease: 'Back.out' });
    this.time.delayedCall(900, () => {
      ready.setText('GO!');
      ready.setColor('#8fce5a');
      this.tweens.add({
        targets: ready,
        scale: { from: 1.2, to: 1.6 },
        alpha: { from: 1, to: 0 },
        duration: 500,
        onComplete: () => ready.destroy(),
      });
    });
  }

  /** Debug time multiplier (1 = normal; set via ?speed=N URL flag). */
  timeMultiplier = 1;
  /** Multiplier on RIVER_SCROLL_SPEED — driven by env.riverScrollSpeedMul; defaults to 1. */
  private riverScrollMul = 1;

  override update(_time: number, deltaMs: number): void {
    const dt = deltaMs * this.timeMultiplier;
    // Scroll water (creates the illusion of the boat moving up the river).
    this.water.scroll(dt, RIVER_SCROLL_SPEED * this.riverScrollMul);

    // Tutorial (§1.1) — ticked before systems so its enemy spawns land this
    // frame. The spawner is skipped while the tutorial is active OR pending
    // (async save-flag load in flight) so scripted waves don't clash with
    // the tutorial's hand-placed Scout Skiff.
    this.tutorial?.tick(dt);
    const tutorialBlocking = this.tutorialPending || (this.tutorial?.active ?? false);

    // Tick everything. Order matters: spawner → enemies → player → weapons → projectiles → collision → pickups.
    if (!tutorialBlocking) this.spawner.update(dt);
    this.enemies.update(dt);
    this.player.update(dt);
    this.weapons.update(dt);
    this.pickups.update(dt);
    this.aoeZone.update(dt);
    this.chests.update(dt);
    this.shipwright.update();
    this.merchant.update(this.spawner.progress() * this.spawner.spec.durationSec);
    this.hazards.update(dt);
    this.decorations.update(dt);
    this.scenery.update(dt);
    this.collision.update(dt);
    this.statuses.update(dt);
    this.reactions.update(dt);
    this.damageNumbers.update(dt);

    // Adaptive music — feed combat intensity to the audio layer mix.
    // activeEnemies / 10 + 0.5 if boss is active (clamped to 1).
    // audio.setDanger internally smooths toward this over 2 s so calling
    // once per frame is safe.
    const activeEnemies = this.enemies.count();
    const bossActive = this.spawner?.bossIsActive() ?? false;
    const danger = Math.min(1, activeEnemies / 10 + (bossActive ? 0.5 : 0));
    this.audio.setDanger(danger);
  }

  /** Accessor for systems that need the full GameContext (settings etc). */
  getCtx(): GameContext {
    return this._ctx;
  }

  /** Stage spec ID — used by overlay scenes (player-props-scene). */
  getStageId(): string {
    return this.stageSpec?.id ?? '—';
  }

  /** Clamp a position to the playable area. The bottom margin keeps the
   *  player above the wooden HUD deck so the boat never slides under it. */
  clampToPlayArea(x: number, y: number): { x: number; y: number } {
    return {
      x: Phaser.Math.Clamp(x, PLAYER_PLAY_MARGIN, WORLD_WIDTH - PLAYER_PLAY_MARGIN),
      y: Phaser.Math.Clamp(
        y,
        PLAYER_PLAY_MARGIN,
        WORLD_HEIGHT - HUD_DECK_HEIGHT - PLAYER_PLAY_MARGIN,
      ),
    };
  }

  /** Transition to stage-end after boss defeat. */
  completeStage(): void {
    if (this.stageEndedAt !== null) return;
    this.stageEndedAt = this.time.now;
    this._ctx.events.emit({
      type: 'stage-clear',
      stageId: this.stageSpec.id,
      timeMs: this.stageEndedAt,
    });
    // Submit per-stage high-score to the local leaderboard.
    const score =
      this.runState.coins +
      this.runState.gems * 50 +
      this.runState.level * 100 +
      this.runState.evolutions.size * 500;
    void this._ctx.leaderboard.submit({
      board: 'per-stage-normal',
      score,
      durationMs: this.stageEndedAt,
      meta: { stageId: this.stageSpec.id },
    });
    // If this was the final stage → emit campaign-clear.
    if (this.stageSpec.id.includes('stage-15') || this.stageSpec.boss === 'kraken-ancient') {
      this._ctx.events.emit({
        type: 'campaign-clear',
        difficulty: `normal${this.runState.ngPlus > 0 ? `+${this.runState.ngPlus}` : ''}`,
        timeMs: this.stageEndedAt,
      });
      // Campaign leaderboard submit.
      void this._ctx.leaderboard.submit({
        board: `campaign-normal${this.runState.ngPlus > 0 ? `-ngplus${this.runState.ngPlus}` : ''}`,
        score,
        durationMs: this.stageEndedAt,
      });
      // Boss kill time (final Kraken).
      void this._ctx.leaderboard.submit({
        board: 'boss-kraken-normal',
        score: Math.max(1, 10_000_000 - this.stageEndedAt), // faster = higher
        durationMs: this.stageEndedAt,
      });
    }

    const banner = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 40, 'STAGE CLEAR', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '120px',
      color: '#e0b063',
      stroke: '#000',
      strokeThickness: 6,
    });
    banner.setOrigin(0.5, 0.5);
    banner.setDepth(1000);
    this.tweens.add({ targets: banner, alpha: { from: 0, to: 1 }, duration: 500 });

    // Loot-gather window — keep gameplay running for 6 s so the player can
    // sweep up the boss's drops + any straggling coins before the overlay locks.
    const sub = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 60, '', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '36px',
      color: '#cce4ea',
      stroke: '#000',
      strokeThickness: 3,
    });
    sub.setOrigin(0.5, 0.5);
    sub.setDepth(1000);
    sub.setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, duration: 400 });

    const lootSeconds = 6;
    let remaining = lootSeconds;
    const updateLabel = (): void => {
      sub.setText(`Gather your loot… ${remaining}`);
    };
    updateLabel();
    const countdown = this.time.addEvent({
      delay: 1000,
      repeat: lootSeconds - 1,
      callback: () => {
        remaining -= 1;
        updateLabel();
      },
    });

    this.time.delayedCall(lootSeconds * 1000, () => {
      countdown.remove();
      banner.destroy();
      sub.destroy();
      this.scene.pause();
      // PRD 9 — Boss Spoils overlay sits between the loot-gather window
      // and StageClearScene. On close, advance to the existing summary.
      this.scene.launch('BossSpoilsScene', {
        runState: this.runState,
        stageKey: this.scene.key,
        onClose: () => {
          this.scene.launch('StageClearScene', {
            runState: this.runState,
            stageId: this.stageSpec.id,
            ctx: this._ctx,
            stageKey: this.scene.key,
          });
        },
      });
    });
  }

  private biomeForStage(): WaterBiome {
    const id = this.stageSpec.id;
    // Act I sub-variants — first three stages each read as a distinct place.
    if (id.includes('stage-1')) return 'rivermouth';
    if (id.includes('stage-2')) return 'channels';
    if (id.includes('stage-3')) return 'open-sea';
    if (id.includes('stage-4') || id.includes('stage-5')) return 'sunlit';
    if (id.includes('stage-6') || id.includes('stage-7') || id.includes('stage-8') || id.includes('stage-9') || id.includes('stage-10')) {
      return 'fog';
    }
    if (id.includes('stage-12')) return 'night';
    return 'volcanic';
  }
}
