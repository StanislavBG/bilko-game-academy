# content-server/ — purpose

Fastify HTTP service that backs the Boat Shooter "Garage" admin console.
Serves a merged `ContentPack` (bundled defaults from
`@bilko/boat-shooter-content` overlaid with admin edits in
`./data/overrides.json`) plus per-sprite PNGs (override → bundled
fallback). Bearer-token writes; public reads.

## Key files
- `src/server.ts` — Fastify app + route table. Boots `ensureDirs()`,
  registers CORS, parses `application/octet-stream` as raw buffer, and
  listens on `PORT` (default 3001).
- `src/bundled.ts` — reads the four bundled JSON files via
  `createRequire` + `req.resolve(...)` (avoids JSON-import assertions).
  Returns a `ContentPack`. `enemies / weapons / passives` default to
  empty arrays — no bundled JSON yet.
- `src/storage.ts` — `./data` layout: `overrides.json` (one file with
  all sections) + `sprites/<id>.png`. Atomic writes (`.tmp` + rename).
- `src/merge.ts` — id-keyed merge of bundled vs. override arrays;
  bundled `version` is preserved.
- `src/validate.ts` — runtime shape checks per section + URL→key map
  (`ability-maps` → `abilityMaps`).
- `src/auth.ts` — `requireBearer` Fastify preHandler. Refuses all writes
  with 503 when `ADMIN_TOKEN` is unset (fail-loud, not fail-open).
- `src/gemini.ts` — proxies `gemini-2.5-flash-image:generateContent`.
  Image-to-image when `useSource && sourcePngB64`.

## Endpoints
| Method | Path | Auth | |
|---|---|---|---|
| GET  | `/healthz` | public | ok |
| GET  | `/v1/content` | public | merged pack, ETag + 304 |
| PUT  | `/v1/content/section/:name` | bearer | replace one section |
| GET  | `/v1/sprite/:id.png` | public | override → bundled fallback |
| PUT  | `/v1/sprite/:id` | bearer | raw PNG body |
| POST | `/v1/sprite/:id/regen` | bearer | Gemini → save → return b64 |

`:name` ∈ `sprites | stages | ships | enemies | weapons | passives | ability-maps`.

## Env
- `PORT` (default 3001), `HOST` (default `0.0.0.0`).
- `BILKO_ORIGIN` — CORS origin in prod (default `*` in dev).
- `ADMIN_TOKEN` — bearer for writes. **Unset → all writes 503.**
- `GEMINI_API_KEY` — required by `/regen`. No `.env` scanning.
- `DATA_DIR` — overrides + sprites root (default `./data`).

## Scripts
- `pnpm dev` — `tsx watch src/server.ts`.
- `pnpm build` — `tsc -b` → `dist/`.
- `pnpm start` — `node dist/server.js`.
- `pnpm typecheck` — `tsc --noEmit`.

## Gotchas
- `module: NodeNext` in this app's tsconfig (overrides base `Bundler`)
  so compiled `dist/server.js` runs under plain Node ESM. Local imports
  use `.js` suffixes.
- Bundled-sprite fallback path is computed from `__dirname` up three
  levels (`apps/content-server/{src|dist}/server.{ts|js}` → repo root).
  Don't move the file deeper without updating `REPO_ROOT`.
- `application/octet-stream` is registered as a buffer parser; if you
  add other binary endpoints, reuse the existing parser instead of
  installing `@fastify/multipart` (we don't need multipart yet).
- ETag is sha1 of the serialized merged pack — recomputed every GET.
  Cheap (the pack is small), but if it grows past ~1 MB consider
  caching the `(json, etag)` and invalidating on PUT.
- Auth is fail-loud: missing `ADMIN_TOKEN` → 503, NOT 200. Don't
  "helpfully" relax this in dev.
