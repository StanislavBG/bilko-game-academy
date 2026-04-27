# scenes/ — purpose

Phaser scene graph. `StageScene` is the simulation; everything else is overlay / picker / summary that pauses or replaces it.

## Key files
- `stage-scene.ts` — main gameplay scene (~565 lines). Owns Player + every system; reads `data/stages` for the current `StageSpec`. Constants: `StageScene.KEY = 'StageScene'`.
- `hud-scene.ts` — runs in parallel with StageScene. HP bar, XP bar, weapon icons, coin/gem counters, stage banner.
- `level-up-scene.ts` — paused overlay with 3 `CardView` picks (weapon / passive / stat / heal / reroll). Uses Q/W/E hotkeys.
- `merchant-scene.ts` — shop overlay opened from a chest tile; same `CardView` primitive. T = reroll.
- `boss-spoils-scene.ts` — (in-progress) post-boss bonus picker, mirrors LevelUpScene shape.
- `ship-picker-scene.ts` — fresh-run gate: 5 elemental ships + Random tile. `KEY = 'ShipPickerScene'`.
- `pause-scene.ts`, `game-over-scene.ts`, `stage-clear-scene.ts`, `run-summary-scene.ts`, `post-mortem-scene.ts`, `combat-log-scene.ts`, `player-props-scene.ts` — modal overlays.
- `util/pretty-name.ts` — id → display name helper.

## Launch order
1. `index.ts` registers every scene with `add(KEY, …, false)` (no auto-start).
2. Picks first scene based on URL params:
   - daily run → `StageScene` directly with locked ship.
   - fresh run (no `?stage=` or `?stage=1`) → `ShipPickerScene`, which then starts `StageScene`.
   - mid-campaign jump (`?stage=2..15`) → `StageScene` directly.
3. `StageScene.create()` launches `HudScene` in parallel.
4. Mid-stage events launch overlays and `pause()` the StageScene.
5. `StageClearScene` chooses next stage or `RunSummaryScene`.

## Pause / resume rules
- Overlays (LevelUp, Merchant, Pause, BossSpoils) call `this.scene.pause('StageScene')` on entry and `resume` on exit.
- The HUD scene is *not* paused — it stays interactive (open combat log, settings).
- Death → `GameOverScene` *stops* StageScene rather than pausing; from there you can return home or replay.

## Adding a new scene
1. Create `<name>-scene.ts`, export class with `static readonly KEY = 'Name'`.
2. Implement `init(data)` for handoff state, `create()` for graphics, optional `update()`.
3. Register in `index.ts` `mount()` (the long `game.scene.add(...)` block) — order matters only for default render layering.
4. From the launch site, call `this.scene.launch(MyScene.KEY, {...})` for overlays, `start` for replacements.

## Gotchas
- StageScene reads `(game as any)._bilkoSpeed` for the `?speed=N` debug param — set in `index.ts` before scene start.
- Cards are 360 × 280 (`CardView.W/H`); 3 fit horizontally with gap. If you change card count per scene, recompute the layout center.
- Hotkeys Q/W/E/R/T are reserved by `CardView` — do not bind them in StageScene.
- `cosmetics` and `shipId` are forwarded through every scene transition's `init` data; missing them resets to defaults.
