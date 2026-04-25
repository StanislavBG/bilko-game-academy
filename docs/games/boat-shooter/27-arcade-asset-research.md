# Arcade-Shmup Asset Research → Boat Shooter Recommendations

Survey of how top arcade shmups treat **ship, enemy, and projectile
visuals** — condensed into actionable gaps in our current roster.

## 1. Reference set

| Game | Year | Key asset lesson |
|---|---|---|
| **Galaga** | 1981 | Distinct silhouettes at 16×16. Boss Galaga has a "face." |
| **1942 / 19XX** | 1984–96 | Clean drop-shadows, flak-burst puffs, visible tracer trails. |
| **Raiden** / **Raiden IV** | 1990–07 | Tracer lasers with bright core + soft halo. Explosions vary per enemy class. |
| **DoDonPachi** / **DoDonPachi Resurrection** | 1997–08 | Bullet-hell readability: enemy bullets are **high-contrast pink/blue** in a single saturated family, never mixed with particles. |
| **Ikaruga** | 2001 | **Polarity** — enemy bullets are pure black or white; the rule is the art. Zero ambiguity at 60fps dense-fire. |
| **Mushihimesama** | 2004 | Organic insect bullets; dense but patterned so the eye finds the gaps. |
| **Deathsmiles** | 2007 | Gothic palette; enemies are *characters* (faces, dialogue portraits). |
| **Jamestown+** | 2011 | 16-bit painterly ships on painterly backgrounds — closest to Boat Shooter's aesthetic target. |
| **Tyrian** / **Tyrian 2000** | 1995 | 30+ weapons each with a **distinct projectile sprite** (not just color swaps). |
| **Crimzon Clover** | 2011 | Bullets in two readable chromatic families; explosions have signature color identity. |
| **Sky Force Reloaded** | 2016 | Polished 2.5D, unified lighting top-left, high-density shadows, drop-animations on kills. |
| **Nova Drift** | 2022 | Vector-style clean silhouettes; hit-flash is a signature white-out. |
| **Vampire Survivors / Brotato / Halls of Torment** | 2022–24 | Low-res sprites + **massive juice** (damage numbers, hit-flash, screen shake) carry the fidelity. |
| **Luftrausers** | 2014 | Monochrome + heavy outline — silhouette is the whole identity. |

Sources consulted during this pass:
- [Best shmups 2025 — GAM3S.GG](https://gam3s.gg/news/best-shoot-em-up-games-to-play-in-2025/)
- [Bullet-hell 2024–25 round-up — YouTube](https://www.youtube.com/watch?v=QA-aBthHcys)
- [The Anatomy of a Shmup — Game Developer](https://www.gamedeveloper.com/design/the-anatomy-of-a-shmup)
- [Ikaruga polarity breakdown — Vice](https://www.vice.com/en/article/sheppard-video-game-pie116-v15n6/)
- [DoDonPachi — Shmups Wiki](https://shmups.wiki/library/DoDonPachi)

## 2. Cross-cutting findings

Rules every great shmup follows, ranked by effect on readability:

1. **Enemy bullets are a closed family.** One or two chromatic families,
   high saturation, never overlap with particle/FX colors. Ikaruga =
   2 colors (black/white). DoDonPachi = pink/blue. Player bullets are
   always different. **Boat Shooter currently:** enemy bullets are
   `0xff4a3a` solid red circles for ALL enemies regardless of element.
   Red overlaps with: damage vignette, hazard rims, burn DoT visuals.
   **Gap: critical.**
2. **Distinct silhouettes at 32×32.** You can read "scout vs brigand
   vs gunboat" from the thumbnail. Boat Shooter ships this — AI
   sprites are silhouette-distinct. ✅
3. **Signature death per enemy class.** Small enemies pop; mid-size
   chain-explode; heavies do a 3-beat cascade. **Boat Shooter:**
   death-by-element was added for the player's weapon element, but
   enemy-class identity doesn't carry through the death. **Gap: medium.**
4. **Consistent light direction across the roster.** Pick top-left,
   apply everywhere. Boat Shooter's AI batch was generated with
   "orthographic top-down" but without a unified light-direction
   clause, so some ships read lit from above (player.png) vs from
   below (a couple of enemy gens). **Gap: minor, fixable in prompts.**
5. **Drop-shadow under every floating object.** Boat Shooter does this
   already via the `shadow` ellipse in the Enemy base (✅). Good.
6. **Tracer / trail on every projectile**, with **core + halo**
   layering. Boat Shooter projectiles have this (`body + core +
   highlight` primitive pattern + optional AI sprite). ✅
7. **Hit-flash is white, brief, and loud.** 60 ms full-white on every
   hit enemy. Boat Shooter tints red for 100 ms (`playHitReaction`) —
   less punchy than white. **Gap: minor.**
8. **Bullets are LARGER than you'd expect.** Dense bullet hell games
   use 14–18 px bullets at 720p display, not 6 px. Readable at all
   zoom levels. Boat Shooter's enemy bullets are `radius: 6 px`
   (12 px diameter). **Gap: minor — bump the radius.**

## 3. Boat Shooter gap analysis — prioritized

### GAP 1 — Enemy bullets (CRITICAL)

`entities/enemy-system.ts::spawnEnemyBullet` creates a hard-coded
`scene.add.circle(x, y, 6, 0xff4a3a, 1)` with a dark stroke. Every
enemy's fire — musket, cannon, sniper, mortar impact, poison spit,
cursed bolt — renders **identically**.

**Fix:** introduce a **`bulletKind`** field on enemy bullets. Kinds:
- `musket` (default — Navy rifles, scout volleys)
- `cannon` (Patrol Gunboat, heavy shell)
- `sniper` (Bank Sniper — long thin pellet, white core)
- `shadow` (Ghost Ship phantom bolt — purple wisp)
- `venom` (Sea Serpent — green drip)
- `fire` (Mortar Barge ember, Powder-Keg shrapnel)
- `frost` (Frost Barge variant — cyan shard)
- `storm` (Tempest Gunboat variant — electric white-cyan)

Each kind gets a 64×64 AI-generated sprite via the existing Gemini
pipeline, keyed `sprite-bullet-<kind>`. Falls back to a tinted circle
(tint per kind) if sprite missing.

Size bump: circle/sprite radius 6 → 8 so bullets are readable in a
bullet-storm. Collision radius stays at 10 for fair hitboxes.

### GAP 2 — Unified light direction prompt

Every future Gemini batch prepends the following clause to the
existing `STYLE_LOCK`:

> "Lighting: sun from the upper-left at 45° — highlights on the upper-
> left surfaces, soft shadow cast to the lower-right. Consistent
> across the whole roster."

Already-shipped sprites that read off-direction (auditing needed):
- `sprite-patrol-gunboat` — lit from below; regen candidate.
- `sprite-ramming-brigand` — flat; regen candidate.

### GAP 3 — White hit-flash (not red)

`entities/enemy.ts::playHitReaction` currently sets a red tint
(`0xff5050`) for 100 ms. Change to **pure white** (`0xffffff`) for
80 ms, which is the universal shmup convention. Red-tint stays as a
fallback for ghost-element enemies (already alpha-flickering instead,
so keep that branch).

### GAP 4 — Boss intro should have a name-card freeze

Bosses spawn with a banner today. Top arcade shmups use a **1.5 s
camera hold + zoom** with the boss sprite at 1.25× display scale and
a parchment name card sliding in. Already covered in
`26-game-designer-enhancements.md` §3.3 but callout here because
it's also an asset ask: each boss gets a 256² **portrait** PNG for
the name-card.

### GAP 5 — Tracer tails on enemy bullets

Player projectiles emit a fading trail every 40 ms. Enemy bullets
don't. Add a **per-tick trail dot** for any bullet kind in the `fire`
/ `storm` / `frost` families. Physical/musket stays trail-less (the
tradition — Galaga bullets have no trail).

### GAP 6 — Death-by-enemy-class

Orthogonal to death-by-element. A Patrol Gunboat should chain-
explode bow-to-stern. A Scout Skiff should splinter-pop. A Mortar
Barge should cookoff the tube + leave a smoke column. This layer
goes on *top* of the element-death. Engineering: add
`spec.deathStyle: 'pop' | 'chain' | 'cookoff' | 'dissolve' | 'splash'`
and implement the corresponding routines in `enemy.ts::kill()`.

### GAP 7 — Arcade-style screen juice on kills

Top arcade shmups hit-stop every boss kill and chain "x3 KILL!"
stack callouts. Boat Shooter has the HudScene streak overlay (from
the earlier HUD agent) ✅ — but no hit-stop. Cheap add: on any boss
kill, `scene.time.timeScale = 0.1` for 120 ms, camera zoom +4%.

## 4. Implementation this round

Ship only GAP 1 + partial GAP 2 in this pass — they're the highest
leverage per hour:

1. **Generate 8 enemy-bullet sprites** via Gemini — musket, cannon,
   sniper, shadow, venom, fire, frost, storm.
2. **Add `sprite-bullet-*` keys** to `systems/sprite-loader.ts`
   `OPTIONAL_SPRITE_IDS` so they load at boot.
3. **Rewrite `enemy-system.ts::spawnEnemyBullet`** to accept
   `bulletKind?: BulletKind`; render a sprite when loaded, tint-circle
   fallback when not; bump default radius 6 → 8.
4. **Thread bulletKind from 4 Act I shooters**:
   - Scout Skiff → `musket`
   - Patrol Gunboat → `cannon`
   - Bank Sniper Tower → `sniper`
   - (Mortar Barge fires an AoE not a bullet — skip.)
5. **Strengthen STYLE_LOCK** in the generator to include the
   light-direction clause for future gens.

Deferred to a follow-up:
- GAPs 3, 4, 5, 6, 7 — each warrants its own ticket.

## 5. Acceptance

- On Stage 1, firing a Scout Skiff bullet no longer looks identical to
  a Patrol Gunboat bullet. Gunboat bullets are visibly heavier.
- Enemy bullets read distinctly vs player damage-vignette and vs
  enemy/hazard rim-glow at 1920×1080.
- `pnpm typecheck` + `pnpm build` green.
