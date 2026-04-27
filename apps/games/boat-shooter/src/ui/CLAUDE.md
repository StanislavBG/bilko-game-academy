# ui/ — purpose

Shared in-game UI primitives. Today: the playing-card metaphor used by every "pick one of N" overlay (level-up, merchant, boss spoils).

## Key files
- `card.ts` — `Card` data type + `CardKind` union + `CardElement` union + element→color/label maps. The composition unit.
- `card-view.ts` — `CardView` Phaser primitive (360 × 280) that renders one `Card`. Hover tween, hotkey badge, cost badge, click + keypress handler.

## Key types / contracts
- `Card` — `{ id, kind, title, detail, stats, costCoins?, hotkey?, iconKey?, apply(run): boolean }`. The `apply` callback returns `true` if the selection should consume the picker.
- `CardKind` — `'weapon' | 'passive' | 'stat' | 'heal' | 'evolution' | 'reroll'`. Determines the apply path the consuming scene wires up.
- `CardStats` — `{ attack?, defense?, element, level: 1..5 }`. Optional damage/defense pair so stat/heal cards can omit them.
- `CardElement` — `'fire' | 'storm' | 'frost' | 'earth' | 'shadow' | 'physical' | 'arcane' | 'none'`. Drives title-bar tint and the badge label via `CARD_ELEMENT_COLOR` / `CARD_ELEMENT_LABEL`.
- `CardViewOptions` — `{ card, x, y, playerCoins?, onSelect }`. `playerCoins` greys the cost badge when unaffordable.

## Adding a new card
1. Decide which `CardKind` it is. If none fits, extend the union and update every consumer (`level-up-scene`, `merchant-scene`, future boss-spoils-scene).
2. In the *consuming scene*, build a `Card` literal: pick stable `id`, set `kind`, `title`, `detail`, `stats` (must include `element` + `level`), and write the `apply(run)` mutation.
3. For shop cards, set `costCoins`. For level-up/spoils cards, leave it undefined.
4. Pick a `hotkey` if the slot is one of Q/W/E/R/T — leave undefined otherwise.
5. Instantiate `new CardView(scene, { card, x, y, playerCoins, onSelect: (c) => c.apply(runState) })`.
6. If you introduce a new `iconKey`, preload it in `systems/sprite-loader.ts`.

## Adding a new element family
1. Extend `CardElement` in `card.ts`.
2. Add the entry to both `CARD_ELEMENT_COLOR` and `CARD_ELEMENT_LABEL`.
3. If the element has gameplay implications (status/reaction), wire it through `weapons/`, `systems/battle.ts`, `systems/status.ts` — the card layer is display-only.

## Gotchas
- `apply` returning `false` keeps the picker open (used for "Heal" when at full HP, or a failed merchant purchase). Wire the falsey branch in the scene's `onSelect` so the player can pick something else.
- Card width is `CardView.W` (360) and height `CardView.H` (280); changing them ripples into every picker scene's layout math.
- `level` is required even when meaningless — pass `1` for stat/heal cards. Empty pip rows look broken on screen.
- Hotkey input is bound by the *scene*, not by `CardView` — the view only paints the badge. Don't double-bind.
