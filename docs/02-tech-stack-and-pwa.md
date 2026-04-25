# Tech Stack & PWA Strategy

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript (strict) | Type safety across many games + shell. |
| Build | Vite 5 | Fast HMR, native ESM, best PWA plugin. |
| PWA | `vite-plugin-pwa` + Workbox | Offline play, iPadOS "Add to Home Screen" installable. |
| Game engine | **Phaser 3.80+** | Best-graphic 2D WebGL engine that runs natively in browser, no WASM startup tax, great on iPad Safari. Post-FX pipelines, lights, particles, Spine/Tiled support. |
| Shell UI | React 18 + Tailwind CSS | For home, game selector, settings, leaderboards, profile. |
| State | Zustand + IndexedDB (via `idb-keyval`) | Tiny, fast, survives offline. IndexedDB is the iPad-safe persistence layer (localStorage is evicted). |
| Audio | Howler.js (shell) + Phaser WebAudio (in-game) | Shell for UI/music; Phaser for positional game SFX. |
| Backend (P5+) | Supabase (Postgres + Auth + Realtime) | Leaderboards, cloud save, optional account. Starts 100% local. |
| Asset pipeline | Midjourney/SDXL + Aseprite + Tiled + TexturePacker + Spine | AI-first; hand-edit in Aseprite; Spine for complex boss rigs. |
| Testing | Vitest + Playwright | Unit + E2E including PWA install flow. |

## Rejected alternatives

- **Godot 4 HTML5 export** — beautiful, but 30–70 MB WASM bundle, slow cold-start on iPad, fullscreen/audio quirks in iOS Safari.
- **Unity WebGL** — worst-in-class iOS Safari support, huge bundle, closed tooling.
- **PixiJS raw** — just a renderer; we'd reimplement what Phaser already gives us.
- **Babylon / Three.js** — 3D engines; overkill for 2D top-down.
- **Construct 3 / GDevelop** — no-code, can't own the source at the scale we want.

## PWA strategy

- **Manifest** (`public/manifest.webmanifest`): `display: standalone`, portrait/landscape, named "Bilko Game Academy", icons at 192/512/maskable.
- **Service worker:** Workbox precache for shell chunk + on-demand cache for game assets (cache-first with version header).
- **First-run:** prompt "Add to Home Screen" after user starts interacting (not on cold load).
- **iPad specifics:**
  - Apple-touch-icon at 180×180.
  - `apple-mobile-web-app-capable: yes`.
  - `apple-mobile-web-app-status-bar-style: black-translucent`.
  - Orientation lock via CSS + JS fallback.
- **Offline:** full campaign is playable offline after install. Cloud sync
  happens opportunistically when online.

## Performance budgets

- Initial shell bundle (gzipped): < 300 KB.
- Total app + assets (installed): < 25 MB gzipped.
- 60 fps on iPad Air 4 with ≥ 30 enemies + 3 weapons firing.
- Reduced-motion mode caps FPS at 30 and disables post-FX pipelines for
  older iPads.
