# admin/garage/ — purpose

Admin console for tuning Boat Shooter content (ships, ability maps,
sprites) against the online content store. Mounted at
`/admin/boat-shooter/garage`. PRD: `docs/games/boat-shooter/30-garage-admin.md`.

## Key files
- `garage-page.tsx` — top-level page; loads `ContentPack`, owns local
  edit state + dirty flags, exposes a `Save All` that PUTs each dirty
  section. Mounts fullscreen (no `ShellFrame`).
- `ship-list.tsx` — left rail. 5 ships, 48×48 thumbs from `spriteUrl`.
- `ship-detail.tsx` — main pane. Stacks four cards: stats, sprite,
  evolution variants, compatibility.
- `stats-form.tsx` — `baselineDelta` numeric inputs + +/- steppers.
  Yellow dot on dirty fields.
- `compatibility-grid.tsx` — weapon (13) + passive (8) checkbox grid;
  greys out wildcard `'*'` until "Customize" expands it.
- `sprite-card.tsx` — placeholder. Big thumb + "Open Sprite Widget"
  button (alerts; full canvas tools land in a follow-up).
- `evolution-variants.tsx` — placeholder. Lists every manifest entry
  whose id starts with `player-<shipId>`.
- `api-client.ts` — fetch wrapper for the content server. Reads base
  URL from `VITE_CONTENT_SERVER_URL` (fallback `http://localhost:3001`)
  and bearer token from `localStorage['garage:token']`. Throws on
  non-2xx with the response body's `reason` if available.
- `constants.ts` — runtime mirrors of the `WeaponId` / `PassiveId`
  unions + the `baselineDelta` field list.

## Server contract
- `GET /v1/content` → full `ContentPack` (public).
- `PUT /v1/content/section/:name` → JSON section (auth bearer).
- `GET /v1/sprite/:id.png` → PNG (public). `spriteUrl(id)` builds it.
- `PUT /v1/sprite/:id` → PNG bytes (auth, follow-up).
- `POST /v1/sprite/:id/regen` → `{ url, pngB64 }` (auth, follow-up).

## Save flow
Edits update local component state + a per-ship dirty-key set. The
top-bar `Save All` button is enabled while *any* section is dirty; on
click it `putSection('ships', …)` and/or `putSection('ability-maps', …)`
in order, then re-baselines the snapshot.

## Adding a new card
1. Make a new `*-card.tsx` taking `ship`, `dirtyKeys`, and an `onChange`.
2. Slot it into `ship-detail.tsx` between the existing cards.
3. If the card edits a new section, extend `garage-page.tsx`'s save
   flow with another `putSection('<name>', …)` branch.

## Gotchas
- The page assumes the content server is reachable; if not, it shows a
  red retry banner. Do **not** silently fall back to bundled defaults
  here — that's the game runtime's job, not the admin's.
- `exactOptionalPropertyTypes: true` — when clearing a `baselineDelta`
  field, `delete` it rather than assigning `undefined`.
- Don't import from `apps/games/boat-shooter/` — the admin only knows
  `@bilko/boat-shooter-schema` + `@bilko/boat-shooter-content`.
