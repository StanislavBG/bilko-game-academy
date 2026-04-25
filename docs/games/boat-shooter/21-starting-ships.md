# Starting Ships — Elemental Loadouts

Five themed starting ships, each fusing **visual design**, **elemental
affinity**, **starter weapon**, **starter passive**, and **signature
skill-tree branch**. A sixth **Random** option rolls one of the five.

Why 5: four classic elements (Fire, Storm, Frost, Earth) plus a unique
naval-themed fifth (Spectral/Shadow) that gives Supernatural-act
players a thematic through-line.

This replaces the single-starter Bow Cannon bootstrap. The Bow Cannon
remains in the pool as a universally-rollable pickup.

---

## 1. Roster summary

| ID | Name | Element | Starter weapon | Starter passive | Skill branch |
|---|---|---|---|---|---|
| `ember-corsair` | **The Ember Corsair** | 🔥 Fire | Flamethrower (L1) | Crow's Nest (L1) | Pyre — burn & detonate |
| `tempest-fury` | **The Tempest Fury** | ⚡ Storm | Chain Lightning (L1) | Storm Compass (L1) | Gale — chain & stun |
| `frostbound` | **The Frostbound** | ❄ Frost | Mortar *frost-shells* (L1) | Copper Hull (L1) | Rime — freeze & shatter |
| `verdant-tide` | **The Verdant Tide** | 🌿 Earth/Wood | Harpoon (L1) | Spyglass (L1) | Grove — pierce & yank |
| `nightwake` | **The Nightwake** | 🌑 Shadow | Ghost-Crew Volley (L1) | Admiral's Flag (L1) | Shade — drain & haunt |
| `random` | **Random** | — | rolled from above | rolled from above | rolled from above |

Each ship **ALSO** carries the classic Bow Cannon at L1 — the player is
never locked out of the reliable workhorse weapon. The elemental weapon
is the signature, not the only option.

---

## 2. Per-ship design

### 2.1 🔥 The Ember Corsair
*"They burned three ships of the line and left the water boiling."*

**Visual identity.**
- Hull triad: charred ebony → crimson red → molten gold (`0x1a0a04` → `0xaa2810` → `0xffb040`).
- Sail: deep orange with a black phoenix emblem.
- Figurehead: brass flame crest at the bow.
- Trail: lingering ember-red wake (wake particles tinted `0xff6a30`).
- Lantern: bright orange core.

**Loadout.**
- Starter weapon: **W5 Flamethrower L1** — 60° cone, 1 dmg/tick @ 5/s, Burn 1/s × 2 s.
- Starter passive: **P1 Crow's Nest L1** — +15% damage.
- Always-granted: **W1 Bow Cannon L1** (fallback DPS).

**Stat tweaks vs. baseline.**
- baseDamage +10% (hot rolling start).
- maxHp −1 (the ship is fragile iron-hulled; the trade-off matches Fire themes).

**Skill tree — Pyre (3 branches × 3 tiers).**
```
Root: Ember Corsair
├─ A. Kiln (damage)
│   A1 Soot Linings      +10% burn damage
│   A2 Blazewood Hull    enemies hit by Burn give +1 coin
│   A3 Solar Furnace     Burn ticks every 0.75s instead of 1.0s
├─ B. Pyre (spread)
│   B1 Spitfire          Burn spreads to 1 adjacent enemy within 80 px
│   B2 Wildfire          Spread radius 80→140 px
│   B3 Conflagration     Burning enemies that die detonate (30 px, 3 dmg)
└─ C. Ash (defense)
    C1 Scorch Ward       5% fire resistance + extinguish incoming Burn
    C2 Cinder Armor      at HP≤50%, radiate 2 dmg/s within 120 px
    C3 Forge Reborn      respawn once per stage at 50% HP (cooldown: stage)
```

---

### 2.2 ⚡ The Tempest Fury
*"The storm follows her like a stray dog."*

**Visual identity.**
- Hull: deep navy → slate blue → silver (`0x0a1a3a` → `0x2a3a6a` → `0xb0c0d0`).
- Sail: ice-white with a black thunderbolt emblem.
- Figurehead: silver lightning-bolt spike at the bow.
- Trail: faint blue-white electric wake (tint `0xaaccff`).
- Lantern: cool cyan core.

**Loadout.**
- Starter weapon: **W4 Chain Lightning L1** — 1 target + 1 chain, 2 dmg, ~150 px chain, every 2.5 s.
- Starter passive: **P3 Storm Compass L1** — +20% crit chance.
- Always-granted: **W1 Bow Cannon L1**.

**Stat tweaks.**
- critChance +5% (storm rides on crits).
- speed +20 px/s (the Fury is nimble).

**Skill tree — Gale.**
```
Root: Tempest Fury
├─ A. Spark (chains)
│   A1 Arc Splitter      +1 chain target
│   A2 Ionize            chains deal +0.5 dmg per hop
│   A3 Thunderclap       every 6th chain detonates a shockwave (80 px, 3 dmg)
├─ B. Gale (control)
│   B1 Squall            chain hits apply 0.2 s stun
│   B2 Hurricane         chain range 150→220 px
│   B3 Eye of the Storm  storm cloud trails the ship (passive ambient zaps)
└─ C. Rime (defense)
    C1 Lightning Rod     incoming enemy bullets within 60 px get zapped
    C2 Static Field      every 5 s of combat, grant 1 iframe pulse (0.4 s)
    C3 Tempest Mantle    -20% incoming non-physical damage
```

---

### 2.3 ❄ The Frostbound
*"Her cannons never fired hot iron. Only cold iron. Colder."*

**Visual identity.**
- Hull: pale blue-white → steel → frost cyan (`0xc4d8e4` → `0x7a9aaa` → `0x4a6a80`).
- Sail: white with a six-pointed snowflake emblem (pale cyan).
- Figurehead: crystal-shard prow tipped in frost.
- Trail: sparkling ice-dust wake (tint `0xe8f8ff`).
- Lantern: pale cyan core.

**Loadout.**
- Starter weapon: **W7 Mortar L1** — shell arcs to target, 4 dmg, 80 px splash, every 3.0 s. *Frost-variant: 20% chance to Freeze 1 s in splash.*
- Starter passive: **P2 Copper Hull L1** — −1 incoming damage (min 1).
- Always-granted: **W1 Bow Cannon L1**.

**Stat tweaks.**
- maxHp +2 (iron-hulled icebreaker).
- speed −20 px/s (heavy).

**Skill tree — Rime.**
```
Root: Frostbound
├─ A. Chill (control)
│   A1 Glacial Shells    mortar freeze chance 20→40%
│   A2 Hoarfrost         frozen enemies take +25% damage
│   A3 Absolute Zero     splash radius 80→120 px; pierces armor
├─ B. Rime (shatter)
│   B1 Crystal Cracks    shatter reaction deals +1 dmg
│   B2 Avalanche         mortar shell triggers shatter automatically on crit
│   B3 Glass Sea         every frozen death drops an ice-patch (slow 40%, 3 s)
└─ C. Ward (defense)
    C1 Frost Armor       iframes +0.2 s
    C2 Icecap             take ≤50% HP: gain 80 px radial freeze aura (0.5 s/s)
    C3 Polar Keel         cold/water-typed enemies deal -25% damage to you
```

---

### 2.4 🌿 The Verdant Tide
*"She was born in a swamp and speaks the language of roots."*

**Visual identity.**
- Hull: mossy green → dark oak → sun-bleached bone (`0x2a4a18` → `0x5a3a10` → `0xd8c098`).
- Sail: sun-bleached canvas with a stylized oak-leaf emblem (`0x5a8a30`).
- Figurehead: carved wooden boar at the bow.
- Trail: gold-green bioluminescent wake.
- Lantern: warm amber core.

**Loadout.**
- Starter weapon: **W3 Harpoon L1** — 1 harpoon, every 2.5 s, 3 dmg, 3 pierce; yanks small enemies.
- Starter passive: **P7 Spyglass L1** — +10% crit damage + enemies reveal +20% off-screen.
- Always-granted: **W1 Bow Cannon L1**.

**Stat tweaks.**
- baseDamage +0.5 flat (heavy wooden shafts).
- magnetRadius +20 px (vines pull coins).

**Skill tree — Grove.**
```
Root: Verdant Tide
├─ A. Root (control)
│   A1 Barbed Shaft      pierce +1
│   A2 Snaring Rope      yanked enemies root for 0.5 s on arrival
│   A3 Boar Charge       every 3rd harpoon crits automatically
├─ B. Grove (lifesteal)
│   B1 Green Rot         kills with the harpoon leave a 2 s 40%-slow patch
│   B2 Verdant Sap       1% of damage dealt heals (cap: 1 HP every 3 s)
│   B3 Heartwood         harpoon pierces through armor fully
└─ C. Drift (utility)
    C1 Dowsing Line      +20 px magnet radius
    C2 Seafarer's Vow    each stage starts with 1 free treasure map fragment
    C3 Groveheart        stage-clear heals +2 HP instead of base +1
```

---

### 2.5 🌑 The Nightwake
*"They never found her crew. Only the lanterns. Still lit."*

**Visual identity.**
- Hull: pitch-black → bruised purple → spectral cyan (`0x0a0a14` → `0x2a1a4a` → `0x7a9acc`).
- Sail: translucent grey with a faceless skull emblem; alpha 0.78 (ghostly).
- Figurehead: skeletal arm reaching forward, gold-capped.
- Trail: pale cyan will-o-wisp wake.
- Lantern: pale cyan-green core, flickers.

**Loadout.**
- Starter weapon: **W13 Ghost-Crew Volley L1** — 4 spectral crew appear every 3.5 s, each fires 1 shot, 1 dmg.
- Starter passive: **P8 Admiral's Flag L1** — +1 projectile on Bow Cannon & Broadside.
- Always-granted: **W1 Bow Cannon L1** (benefits from the Admiral's Flag bonus).

**Stat tweaks.**
- maxHp −1 (paper-hulled).
- critMultiplier +0.25× (ghost crit strikes the soul, not the armor).

**Skill tree — Shade.**
```
Root: Nightwake
├─ A. Veil (evasion)
│   A1 Fade              +0.15 s iframes
│   A2 Slipwake           dashes leave a 0.2 s afterimage that soaks 1 hit
│   A3 Shadowcross       movement through enemies is frictionless (no contact dmg if moving >80% speed)
├─ B. Haunt (damage)
│   B1 Spectral Shot     ghost crew fires 2 shots per volley (was 1)
│   B2 Lifeline          on kill: +1 temporary crew (5 s, max 3)
│   B3 Wailing Hour      every 30 s, a phantom broadside triggers for free
└─ C. Drain (sustain)
    C1 Hungry Sails      kills grant 1 coin extra (stacks multiplicatively with coinValueMult)
    C2 Soul Tally        every 30 kills, heal +1 HP
    C3 Pact of Fathoms   bosses drop an extra gem + enable a haunted re-fight node
```

---

### 2.6 🎲 Random
Picks one of the five above at run start. The random roll is *shown* on
the picker ("You'll command: The Frostbound") so the player can back out
of a roll they don't want — removing the "bad random" pain.

---

## 3. Skill-tree execution model

Skill trees are **not** implemented in this milestone. They are **data**
in `src/data/starting-ships.ts` so a later UI pass can render them.

Each node is declared as:

```ts
interface SkillNode {
  id: string;
  title: string;
  desc: string;
  tier: 1 | 2 | 3;
  branch: 'A' | 'B' | 'C';
  /** Runtime hook — a pure function applied to RunState at grant time. */
  grant?: (run: RunState) => void;
}
```

Intended trigger: nodes unlock at stage-clear (one free pick per stage),
with stage 1 → 1 node, stage 2 → 2 nodes, stage 3 → 3 nodes. This aligns
with our three-act pacing; by Act III the player has a completed 9-node
tree. That's the design; wiring is a follow-up task.

---

## 4. Picker UI

A new Phaser scene **`ShipPickerScene`** runs **once per fresh run**,
before StageScene. Six tiles on a parchment backdrop:

```
┌──────────────┬──────────────┬──────────────┐
│ 🔥  Ember    │ ⚡  Tempest  │ ❄ Frostbound │
│  Corsair     │  Fury        │              │
├──────────────┼──────────────┼──────────────┤
│ 🌿 Verdant   │ 🌑 Nightwake │ 🎲  Random    │
│  Tide        │              │              │
└──────────────┴──────────────┴──────────────┘

Element:    Fire
Starter:    Flamethrower + Crow's Nest
Branch:     Pyre (damage ▸ spread ▸ defense)

                   [ SET SAIL ]
```

- Clicking a tile selects it (highlights the tile + updates the info
  panel).
- The **SET SAIL** button launches StageScene with `{ shipId }`.
- **Random** rolls server-side on click; the reveal is dramatic (short
  fade + name flash) but the player can still re-roll.

The picker is **skipped** when `?stage=N` > 1 (returning mid-campaign
already has a committed ship). On a new run (`?stage=1` or no param),
it always shows.

---

## 5. Cosmetics interaction

Cosmetics (hull/sails/figurehead) the player unlocked earlier in the run
history **override** the ship's default palette:

- If the player has selected a cosmetic hull in the profile panel, that
  hull paints on top of the ship's elemental base.
- Emblems on the sail take priority over the ship's default emblem.
- Figurehead cosmetic overrides the ship's elemental figurehead.

This keeps the cosmetic economy valuable while the starting-ship choice
drives the mechanical identity.

---

## 6. Implementation checklist

1. ✅ Write this doc (20 min).
2. ☐ `src/data/starting-ships.ts` — export `SHIP_CONFIGS` + `ShipId` + `rollRandomShipId`.
3. ☐ Add `runState.shipId: ShipId` (seeded from StageScene init data).
4. ☐ Extend `Player.buildDetailedShip()` to read the selected ship and
   recolor the hull/sail/emblem/figurehead/lantern accordingly.
5. ☐ Modify `StageScene.init()` to accept `shipId` and add
   `addOrLevelWeapon(config.starterWeapon)` + `addOrLevelPassive(config.starterPassive)`
   instead of the hardcoded `'bow-cannon'`.
6. ☐ New `ShipPickerScene` — tile grid + info panel + set-sail button.
7. ☐ Rewire `index.ts` so the boot sequence runs the picker first on a
   fresh run, then launches StageScene with the chosen ship.
8. ☐ Typecheck + build pass.

Skill-tree node grants + picker UI for upgrades are **explicitly out of
scope** for this milestone — data only.
