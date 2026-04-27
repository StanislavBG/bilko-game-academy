# Asset Organization & Naming Convention

Canonical reference for adding new visual assets to Boat Shooter (and
future games in the academy). Locked down so we don't drift across
sessions / agents.

## 1. Naming convention

All sprite keys follow:

```
sprite-<category>-<id>            // for categorized sprites
sprite-<id>                       // for top-level sprites (player, bosses, coins, chests)
```

Filename equals the key minus the `sprite-` prefix:
- key `sprite-bullet-fire` → file `bullet-fire.png`
- key `sprite-player-ember-corsair` → file `player-ember-corsair.png`
- key `sprite-frigate-captain` → file `frigate-captain.png`

## 2. Categories

| Category | Prefix | Examples | Source size |
|---|---|---|---|
| **Player ships** | `sprite-player(-variant)?` | `player`, `player-ember-corsair` | 2048×2048 (Imagen 4) |
| **Enemies** | `sprite-<enemy-id>` | `scout-skiff`, `patrol-gunboat` | 2048×2048 |
| **Bosses** | `sprite-<boss-id>` | `frigate-captain`, `kraken-ancient` | 2048×2048 |
| **Pickups** | `sprite-<pickup-id>` | `coin-small`, `coin-medium`, `coin-large`, `gem`, `xp-orb` | 1024×1024 (Gemini) |
| **Chests** | `sprite-chest-<tier>` | `chest-wooden`, `chest-shipwright` | 1024×1024 |
| **Projectiles (player)** | `sprite-proj-<style>` | `proj-cannonball`, `proj-harpoon` | 1024×1024 |
| **Bullets (enemy)** | `sprite-bullet-<kind>` | `bullet-musket`, `bullet-fire` | 1024×1024 |
| **Hazards** | `sprite-hazard-<id>` | `hazard-rock-large`, `hazard-barrel`, `hazard-treasure-crate` | 2048×2048 |
| **Scenery / decoration** | `sprite-scenery-<id>` | `scenery-reed-clump`, `scenery-fish-school` | 2048×2048 |
| **UI icons (weapons + passives)** | `sprite-icon-<id>` | `icon-bow-cannon`, `icon-spyglass` | 1024×1024 |

## 3. On-screen size targets

For scenery, see `apps/games/boat-shooter/src/systems/scenery.ts::TARGET_PROP_WIDTHS`. Rules:

- **Anything below 50 px** target width reads as a "black box" at retina. Bump.
- Hero hull (player + enemy ships): ~140 px display from a 2048² source.
- Bullets: 32–40 px display from a 1024² source.
- Scenery flora (grass, reeds, lilies): 40–96 px depending on density needed.
- Bank decoration (mangrove, blockade lines): 200+ px.
- Bosses: 320–480 px display.

## 4. Adding a new sprite — checklist

1. **Pick the category + base id.** Compose the key + filename per §1.
2. **Add a prompt** to `tools/generate-sprites.mjs` in the matching category section. Use the existing `STYLE_LOCK` / `BULLET_STYLE_LOCK` / `SCENERY_STYLE_LOCK` / `HAZARD_STYLE_LOCK` / `ICON_STYLE_LOCK` for that category.
3. **Generate** with Imagen 4 for hero/scenery (`--imagen` flag → 2K native), or Gemini 2.5 Flash Image for icons/bullets (default → 1K).
4. **Register the key** in `apps/games/boat-shooter/src/systems/sprite-loader.ts` — `CORE_SPRITE_IDS` (gameplay-critical) or `SCENERY_IDS` / `HAZARD_IDS` / `ICON_IDS` / `BULLET_IDS` / `PROJECTILE_IDS` (graceful-missing). Do NOT add to both lists.
5. **For scenery only**: add the kind to `scenery.ts::PropKind` union + `TARGET_PROP_WIDTHS` table + spawn spec in the relevant biome's `MANIFESTS` entry.
6. **For enemies only**: write the entity class in `entities/enemies/` + add to `enemy-system.ts::EnemyType` union + `spawn()` switch.
7. **No-text negative prompt** is hardcoded in the style locks; double-check the generated PNG has no letters/labels.

## 5. Sprite QA gates

- **Top-down or 3/4?** Gameplay sprites must be true top-down. Bosses can take some 3/4 dramatic license. Scenery banks/towers can be 3/4. Test by viewing alongside `sprite-player.png` — does the orientation match?
- **No white halo.** The chroma-key in `sprite-loader.ts::chromaKeyBlackToTransparent` knocks `R+G+B ≤ 80` to transparent. The PRD-1 anti-fringe pass attenuates `R+G+B > 700` edge pixels with transparent neighbors. If a sprite still shows a white outline, regenerate with a clearer "solid black background, no white border, no glow" clause.
- **Centered subject.** Every sprite is centered with margin so per-spec scale + rotation work. If a sprite is offset, it'll appear to drift sideways at runtime.
- **Single subject.** No collages of multiple boats or items in one PNG (except explicitly authored "trio" / "school" sprites).

## 6. Update cadence

- Sprite **regeneration** is cheap (Imagen 4 ~10 s/image, Gemini ~5 s/image) — re-run any time the prompt improves.
- Sprite **size bumps** (in `TARGET_PROP_WIDTHS`) need no asset regen — pure display-time scale change.
- **Filename changes** require: regenerate, update sprite-loader, update any consumer that reads `sprite-<id>` by name (`enemy-system.spawn`, `scenery::spawnProp`, etc.).

## 7. Stage display codes

Stages also follow a naming + display convention:

- **Internal `id`** stays `stage-<n>-<biome>` (e.g. `stage-1-rivermouth`) — hardcoded in 25+ places, do NOT rename.
- **`displayCode`** is the player-facing label (e.g. `'1-1'`) per `StageSpec`. Format: `<act>-<stage>` where act 1/2/3 = sunlit / fog / volcanic, stage 1–5.
- HUD banner reads `displayCode + ' • ' + title`. Source of truth: `data/stages/stage-N.ts`.

## 8. Bytes budget

Current asset payload at native 2K + 1K mix ≈ 250 MB total uncompressed PNG. After service-worker compression we ship ~12 MB precache + ~50 MB lazy-cache for sprites. Budget per game module: 100 MB precache, 200 MB lazy. Stay well under.
