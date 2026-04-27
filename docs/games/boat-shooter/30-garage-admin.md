# 30 — Garage Admin Console

> **Status:** drafted 2026-04-25 / implementation in flight
> **Goal:** an online content store the game reads at boot + a web admin
> ("Garage") to tune ship stats, sprites, and ability maps without
> redeploying the game build.

## Why

Today the game's content (stages, ships, weapons, ability maps, sprites)
lives in JSON files inside `packages/boat-shooter-content/`. Bundled
defaults work offline, but every tuning change still requires a code
edit + redeploy. We want **the online store to be source of truth at
runtime** so balance changes happen "from the console."

The first surface the admin gets is the **Garage** — a per-ship view
that shows stats, sprites + sprite evolution variants, and weapon /
passive compatibility, with edits saved back to the store.

## Architecture

```
┌──────────────────────┐
│   Garage UI (React)  │
│   admin route in     │
│   apps/shell         │
└──────────┬───────────┘
           │ HTTP
           ▼
┌──────────────────────────────────┐
│  apps/content-server (Fastify)   │
│                                  │
│  GET   /v1/content        public │
│  PUT   /v1/content/:section auth │
│  GET   /v1/sprite/:id.png public │
│  PUT   /v1/sprite/:id     auth   │
│  POST  /v1/sprite/:id/regen auth │
└──────────┬───────────────────────┘
           │ persists
           ▼
   /data/overrides.json
   /data/sprites/<id>.png
           ▲
           │ GET at boot, 1.5s timeout
┌──────────┴──────────────┐
│  boat-shooter runtime   │
│  bundled defaults  ⊕    │
│  remote overlay         │
└─────────────────────────┘
```

**Bundled fallback** — `packages/boat-shooter-content/data/*.json` ship
with the game. If the content server is unreachable in 1.5 s, the game
plays the bundled values. No spinner, no "offline" toast — silent
fallback.

**Sprite URL strategy** — the existing sprite-loader builds URLs from
`<BASE_URL>boat-shooter-sprites/<id>.png`. We keep that as the fallback.
When `VITE_CONTENT_SERVER_URL` is set, the loader prefers
`<server>/v1/sprite/<id>.png`; on 404 the loader falls through to the
bundled URL. The chroma-key pass runs identically either way.

## Content server endpoints

### `GET /v1/content` (public)

Returns the full merged `ContentPack` (bundled defaults overlaid with
admin overrides). Schema is the `ContentPack` from
`@bilko/boat-shooter-schema`. Cached behind ETag; client uses
conditional GET.

### `PUT /v1/content/section/:name` (auth)

Overwrites one section of the override blob. `:name` ∈
`{ sprites, stages, ships, enemies, weapons, passives, ability-maps }`.
Body = the section's JSON. Validated against the schema before write.

### `GET /v1/sprite/:id.png` (public)

Returns the latest PNG for a sprite id. Falls back to the bundled
sprite if no override exists. `Cache-Control: public, max-age=60` so
the game picks up regenerations within a minute (admin can force a
hard refresh).

### `PUT /v1/sprite/:id` (auth)

Body: PNG bytes. Saves to `/data/sprites/<id>.png`. Used after the
admin's canvas-edit pipeline (crop / erase / rotate). Updates the
manifest's modified timestamp.

### `POST /v1/sprite/:id/regen` (auth)

Body: `{ prompt: string; useSource?: boolean; sourcePngB64?: string }`.
Server calls Gemini 2.5 Flash Image (`gemini-2.5-flash-image`); if
`useSource` is true, the request includes the source PNG so Gemini does
image-to-image. Returns the saved URL + base64 of the new PNG so the UI
can preview without round-tripping through the cache.

## Auth

Single shared bearer token. Server reads `ADMIN_TOKEN` from env;
clients send `Authorization: Bearer <token>` for write endpoints. Token
lives in admin localStorage (per browser). Read endpoints are public so
the game can fetch unauthenticated.

## Garage UI

Route: `/admin/boat-shooter/garage`.

**Layout** — two panes:
- Left rail: ship list (5 rows). Each row shows sprite thumb + name.
- Main area: ship detail with four cards.

**Cards (per ship):**
1. **Stats** — `baselineDelta` form (maxHp, speed, accel, magnetRadius,
   critChance, critMultiplier). Number inputs + +/- steppers.
2. **Sprite** — the sprite widget (see below).
3. **Evolution variants** — thumb strip of all `sprite-player-<ship>-*`
   variants. "+ Add variant" opens a sub-prompt.
4. **Compatibility** — two columns of checkboxes (13 weapons + 8
   passives). Saves into `ability-maps.json::ships[shipId]`.

**Save** — debounced PUT per section. Yellow "unsaved changes" banner
until the server confirms.

## Sprite widget

A 320×320 canvas + toolbar + prompt panel.

**Edit tools** (client-side ImageData ops):
- Crop (drag rectangle).
- Rotate 90° / -90° / free-angle slider.
- Flip horizontal / vertical.
- Eraser brush (paint α=0 to clean halos).
- Reset (revert to last saved).

**Generate panel:**
- Prompt textarea pre-filled from the manifest entry's `prompt`.
- Toggle: "Use current sprite as input" (image-to-image vs text-only).
- **Generate** → POSTs to `/v1/sprite/:id/regen`. Spinner; result
  becomes the active canvas image; previous active image goes to the
  history strip (last 5).
- **Save** → PUT canvas → server.
- **Save as variant** → prompts for variant suffix; creates a new
  manifest entry `sprite-<id>-<suffix>` and saves the PNG under that
  key.

## Phases

| # | Scope | Status |
|---|---|---|
| 1 | Content server (Fastify) — read + auth-write + Gemini proxy | building |
| 2 | Runtime overlay — boot fetch + sprite URL switch | building |
| 3 | Garage UI — ship list + stats + compatibility | building |
| 4 | Sprite widget — canvas tools + Gemini regen | next |
| 5 | Deploy — content-server on Render | last |

## Acceptance

- **Server up, online:** edit Ember Corsair `maxHp` 5 → 8 in Garage,
  hit Save, refresh the game; first stage starts with HP 8.
- **Server down, offline:** stop the content server; refresh the game;
  Ember Corsair starts at HP 5 (bundled). No console errors.
- **Sprite regen:** click Generate on a ship sprite with a tweaked
  prompt; new sprite appears in the canvas within ~10 s; refresh the
  game; the new sprite renders.
- **Compatibility:** uncheck `chain-lightning` for Ember Corsair;
  level-up offers in a fresh run never include chain-lightning.

## Out of scope (deferred)

- Multi-user / role-based auth.
- Live in-Garage game preview (mount Phaser inside the admin tab).
- Pixel-painting beyond the eraser brush.
- Diff / version history beyond the in-memory 5-deep history strip.
- Stage editor (planned next: `31-stage-editor.md`).
- Weapon / passive editor (planned: `32-weapon-editor.md`).
