# Audio + Soundtrack Plan — Free Music & SFX Sources

Comprehensive review of every audio element the game needs, mapped to
specific free / CC-licensed source packs that fit the painterly pirate /
Age-of-Sail aesthetic. Goal: replace the current 100% procedural WebAudio
system with curated music + curated SFX while keeping procedural as a
seamless fallback when assets fail to load.

## 1. Current state — what we have

Audio is implemented entirely procedurally in `systems/audio.ts`:

- **3-layer adaptive music** (calm / combat / boss) — pure WebAudio
  oscillators per act. ~140 lines of synthesis code. Functional but
  thin; lacks the orchestration of real shanty/orchestral music.
- **17 SFX hooks**: `sfxCannon`, `sfxMusket`, `sfxExplosion`,
  `sfxLightning`, `sfxFlame`, `sfxHit`, `sfxCrit`, `sfxLevelUp`,
  `sfxCoin`, `sfxGem`, `sfxBossIntro`, `sfxBossDefeat`, `sfxReaction`,
  `sfxUiClick`, etc. All are tiny ~50–200 ms WebAudio synth events.
- **Settings**: `masterVolume` + `sfxVolume` + `musicVolume` honored.

What's missing: real instrumented music, varied SFX (not single-shot
synth blips), ambient bed under combat (water, wind, distant cannons).

## 2. Audio elements the game needs

### 2.1 Music (loops)
- Title / Home menu (calm orchestral pirate theme)
- Ship picker (slightly more energetic, anticipation)
- Stage 1–5 (Act I: sunlit delta — bright nautical adventure)
- Stage 6–10 (Act II: cursed fog — minor key, mysterious)
- Stage 11–15 (Act III: volcanic — heavy percussion, dread)
- Boss combat layer (separate from stage music — choir + strings + drums)
- Stage clear / victory fanfare
- Game over (somber piano / bagpipes drone)
- Merchant / shipyard (warm tavern hurdy-gurdy)
- Level up moment (4-second triumph stinger)

### 2.2 Combat SFX
- Cannon fire — 3 variants for variety: small / medium / heavy
- Broadside salvo — multi-cannon thunderclap
- Harpoon launch + impact thunk
- Chain lightning zap + branch
- Flamethrower whoosh (loop) + ignition crackle
- Mortar shell (whistle in flight) + impact boom
- Enemy musket pop (small caliber)
- Sniper rifle crack
- Generic enemy bullet hit

### 2.3 Impact / feedback SFX
- Player taking damage (4 variants for variety)
- Player iframe absorb ("ding")
- Enemy hit acknowledgment (3 variants for impact tier)
- Enemy crit (extra punchy)
- Enemy death — small (splinter pop)
- Enemy death — medium (chain explosion)
- Enemy death — heavy (cookoff)
- Boss spawn (low rumble + horn)
- Boss death (deep impact + crowd cheer)

### 2.4 Pickup / progression SFX
- Coin (3 tiers — small / medium / large different pitches)
- Gem (sparkle + chime)
- XP orb (synth pickup)
- Treasure-map fragment (mystical chime)
- Level up (triumphant 1-second cue)
- Stage clear (3-second flourish)
- Achievement unlock (sparkle ribbon)

### 2.5 UI SFX
- Click (light wood-tap)
- Hover (very subtle tick)
- Menu open / close (parchment unfurl / fold)
- Toggle on/off
- Error (low buzz)
- Notification arrive

### 2.6 Ambient beds (per biome, looping)
- Sunlit Delta — gentle river lapping + distant gulls
- Inland Channels — water + frog/insect ambient
- Open Sea — wind + waves
- Fog Bay — muffled wind + creaking masts
- Night biome — eerie wind + distant whispers
- Volcanic — low rumble + lava bubble + ash hiss

**Total scope:** ~12 music tracks + ~50 SFX + ~6 ambient loops. With
3-variant rotation on combat SFX → effective ~80 unique audio assets.

## 3. Recommended free / CC sources

License grades:
- **CC0** = public domain, zero requirements — preferred.
- **CC-BY** = credit required — fine, just maintain a credits file.
- **Royalty-free** (Pixabay, Mixkit) = use freely, no attribution
  required, but each platform's terms apply.

### 3.1 Music sources

**Kevin MacLeod / Incompetech** — [incompetech.com](https://incompetech.com/music/royalty-free/music.html)
- License: **CC-BY 4.0** (or buy a no-attribution license for $30/track).
- Strengths: huge catalog (1500+ tracks), high production value, has a
  pirate/nautical category. The New York Times called him "arguably the
  most prolific composer you've never heard of." Per
  [Wikipedia](https://en.wikipedia.org/wiki/Kevin_MacLeod), the
  attribution license is the standard usage.
- Recommended tracks (browse at incompetech for actual files):
  - **"Pirate Captain Bobby"** — main menu / Act I exploration loop.
  - **"Sneaky Adventure"** — ship picker.
  - **"Carmen Habanera"** + **"Spazzmatica Polka"** — alt Act I high-energy.
  - **"Long Stroll"** — merchant / shipyard.
  - **"Shores of Avalon"** — Act II fog bay.
  - **"Easy Lemon"** — game-over / sad piano.
  - **"Fanfare for Space"** — stage clear / victory.

**OpenGameArt — CC0 Music collection** — [opengameart.org/content/cc0-music-0](https://opengameart.org/content/cc0-music-0)
- License: **CC0** (zero attribution required, public domain).
- Strengths: hundreds of pre-made loops authored *for game use*. Specifically:
  - "Sea of Storms" pack — pirate/storm orchestral loops.
  - "Adventure Music Pack" — bright Act-I-friendly loops.
  - "Boss Battle Theme" CC0 pack — multiple boss-fight tracks.

**alkakrab — Free Pirate Game Music Pack** — [alkakrab.itch.io/free-pirate-game-music-pack](https://alkakrab.itch.io/free-pirate-game-music-pack)
- License: free, attribution requested.
- Strengths: **8 pirate-themed orchestral tracks** authored as a cohesive
  pack. Exactly what the game needs for Acts I–III.

**Free Music Archive — Kevin MacLeod mirror** — [freemusicarchive.org/music/Kevin_MacLeod/](https://freemusicarchive.org/music/Kevin_MacLeod/)
- Same catalog as Incompetech, sometimes faster downloads.

**Pixabay Music** — [pixabay.com/music](https://pixabay.com/music)
- License: **Royalty-free, no attribution required** for any use.
- Strengths: searchable by mood/genre. Search "pirate", "naval",
  "sea shanty", "swashbuckler" for theme matches.

### 3.2 SFX sources

**Kenney — Impact Sounds** — [kenney.nl/assets/impact-sounds](https://kenney.nl/assets/impact-sounds)
- License: **CC0**. 130 sound assets.
- Use for: enemy hit acknowledgment, splinter death pop, generic impacts.

**Kenney — Pixel Shmup** — [kenney.nl/assets/pixel-shmup](https://kenney.nl/assets/pixel-shmup)
- License: **CC0**. 128 assets including SFX.
- Use for: shmup-arcade-style cannon fire, explosion variants, enemy
  bullets, pickup chimes.

**OpenGameArt — Action Game / SHMUP SFX Pack** — [opengameart.org/content/action-gameshmup-sfx-pack](https://opengameart.org/content/action-gameshmup-sfx-pack)
- License: **CC0**.
- Use for: explosion variants, lasers, bullet impacts.

**The Motion Monkey — Retro Arcade Sounds** — [themotionmonkey.co.uk/free-resources/retro-arcade-sounds](https://www.themotionmonkey.co.uk/free-resources/retro-arcade-sounds/)
- License: **CC0**, 300+ original sounds.
- Use for: UI clicks, pickup chimes, retro stingers.

**OpenGameArt — Pirate pack (190+)** — [opengameart.org/content/pirate-pack-190](https://opengameart.org/content/pirate-pack-190)
- License: mixed (check per file). **190+ pirate sound effects.**
- Use for: cannon variants, sword clashes, sailor voices, splash, water
  ambient. Direct theme match.

**Sonniss — Pirate Game SFX library** — [sonniss.com/sound-effects/pirate-game-sound-effects](https://sonniss.com/sound-effects/pirate-game-sound-effects/)
- Some assets free (Game Audio Bundle 2024 GDC giveaway is CC-BY).
- Use for: high-quality cannon, water, wind, ambient beds.

**Freesound.org** — searchable, mostly **CC-BY / CC0** mix per upload.
- Search recommendations: "wooden ship creak", "cannon fire 18th century",
  "musket shot", "harpoon thwip", "sea wind ambient".

**Pixabay Sound Effects** — [pixabay.com/sound-effects](https://pixabay.com/sound-effects)
- **Royalty-free, no attribution.** Search "cannon", "explosion",
  "splash", "coin", "level up".

**Mixkit — Free arcade SFX** — [mixkit.co/free-sound-effects/arcade](https://mixkit.co/free-sound-effects/arcade/)
- License: free for commercial use, no attribution.
- Use for: arcade-flavored coin/pickup, level-up chimes.

### 3.3 Ambient / atmospheric beds

**Freesound — water / ocean / wind** — search [freesound.org](https://freesound.org/) with terms:
- "ocean waves loop" / "calm water lapping"
- "ship creak loop"
- "distant cannon battle"
- "fog horn"

**Asbestos's Ambient Sea Pack** on OpenGameArt — typically CC-BY/CC0.

## 4. Theme consistency rules

Pick **ONE music composer per act** so every track in that act sounds
like it belongs to the same world. Recommended grouping:

| Act | Composer source | Why |
|---|---|---|
| Menu / picker / Act I (Sunlit) | alkakrab Pirate Pack OR MacLeod ("Pirate Captain Bobby" set) | Bright, adventurous, pirate orchestral |
| Act II (Cursed Fog) | OpenGameArt CC0 dark-fantasy pack | Minor-key, mysterious; matches ghost/fog theme |
| Act III (Volcanic) | MacLeod's heavier orchestral works ("Hard Work", "Industrial Cinematic") | Driving percussion, dread |
| Bosses (any act) | OpenGameArt CC0 "Boss Battle Theme" | High-tempo orchestral; cross-cuts cleanly |
| Game over | MacLeod "Easy Lemon" or pixabay piano | Somber, short |
| Stage clear | MacLeod "Fanfare for Space" or Mixkit victory | 4-second triumphant cue |

**Same artist within an act → coherent musical signature.** Different
artist between acts → amplifies the world-shift the player feels.

For SFX, **one library per category** keeps the texture consistent:
- All cannon fire → Kenney Pixel Shmup OR OpenGameArt Pirate Pack
  (pick one and stick with it).
- All UI clicks → Kenney Impact Sounds.
- All pickup chimes → Kenney Pixel Shmup pickup family.
- All ambient beds → Freesound or Asbestos's Ambient Sea Pack.

## 5. Variant counts (multiple tracks per element)

Per the user's request "use multiple tracks for every element":

### 5.1 Music — 2-track rotation per stage
Each stage gets **2 looping tracks** that randomly rotate on stage start
(deterministic seed if Daily run). Avoids the "I've heard this one too
many times" feeling on a 15-stage campaign.

### 5.2 SFX — 3-variant rotation on hot sounds
For sounds the player hears most:

| SFX | # variants |
|---|---|
| Cannon fire | 3 |
| Enemy musket | 3 |
| Coin pickup | 3 |
| Hit acknowledgment | 4 |
| Explosion (S/M/L) | 3 each = 9 |
| Splash | 2 |

The audio system picks one randomly per fire. Tiny variance is the
difference between "machinegun blip" and "alive combat."

## 6. Integration plan

### 6.1 New audio asset directory

```
apps/shell/public/boat-shooter-audio/
├── music/
│   ├── menu.ogg                  (or .mp3)
│   ├── picker.ogg
│   ├── act-1a.ogg
│   ├── act-1b.ogg
│   ├── act-2a.ogg
│   ├── act-2b.ogg
│   ├── act-3a.ogg
│   ├── act-3b.ogg
│   ├── boss-1.ogg
│   ├── boss-2.ogg
│   ├── stage-clear.ogg
│   ├── game-over.ogg
│   └── merchant.ogg
├── sfx/
│   ├── cannon-1.ogg, cannon-2.ogg, cannon-3.ogg
│   ├── musket-1.ogg ...
│   ├── explosion-s-1.ogg ...
│   ├── ...
└── ambient/
    ├── river.ogg
    ├── open-sea.ogg
    ├── fog.ogg
    └── volcanic.ogg
```

OGG Vorbis is the native browser format — small + universal. Fallback
.mp3 only if iOS Safari needs it (rare on modern iOS).

### 6.2 Audio loader extension

Add `apps/games/boat-shooter/src/systems/audio-loader.ts`:

```ts
const TRACKS = {
  'music-menu':       'boat-shooter-audio/music/menu.ogg',
  'music-act-1a':     'boat-shooter-audio/music/act-1a.ogg',
  ...
};

export function preloadAudio(scene: StageScene): void {
  for (const [key, url] of Object.entries(TRACKS)) {
    scene.load.audio(key, `/${url}`);
  }
  // Tolerate missing — falls back to procedural WebAudio.
  scene.load.on('loaderror', (file: { key: string }) => {
    if (file.key.startsWith('music-') || file.key.startsWith('sfx-')) {
      // Silently skip; AudioSystem checks scene.cache.audio.has(key).
    }
  });
}
```

### 6.3 AudioSystem refactor

Refactor `systems/audio.ts` so each `sfxCannon()` / `playActMusic()` etc.:
1. First checks if a real audio asset is cached for that key.
2. If yes, plays via `scene.sound.add(key).play({ volume: ... })`.
3. If no, falls back to the existing procedural WebAudio synth.

This way, missing assets never break the game — they just play the
synth fallback. Lets us roll out audio incrementally without flag-gating.

For variants: the function picks `sfxCannon-${1+Math.floor(Math.random()*3)}`.

### 6.4 Music cross-fade

`playActMusic(act)` uses Phaser's sound API:
```ts
const next = this.scene.sound.add(`music-act-${act}a`, { loop: true });
next.play({ volume: 0 });
next.fadeIn(2000);  // custom helper
this.currentMusic?.fadeOut(2000, () => this.currentMusic.stop());
```

Boss layer is a SECOND audio track played simultaneously, faded in over
1.5 s when boss spawns, faded out on boss death. Mixes naturally because
we authored the boss track as additive layering.

### 6.5 Settings respect

`ctx.settings.audio.musicVolume` (0–1) and `ctx.settings.audio.sfxVolume`
already exist. Apply on every `play()` call:
```ts
sound.play({ volume: assetVolume * sfxVolume * masterVolume });
```

## 7. Execution sequence

```
PHASE 1 — Sourcing (4 hours of curation, no code)
  1.1 Download alkakrab Pirate Pack (8 tracks).
  1.2 Download Kenney Pixel Shmup + Impact Sounds.
  1.3 Download OpenGameArt Pirate Pack (190+ files; cherry-pick ~30).
  1.4 Browse Incompetech for the 6 named tracks above.
  1.5 Pixabay Music: pick 2-3 ambient sea/wind loops.
  1.6 Convert all to OGG Vorbis @ 128 kbps mono for SFX, 192 kbps stereo
       for music. Total expected payload: ~25-40 MB pre-gzip.
  1.7 Author CREDITS.md mapping every file → composer + license + URL.

PHASE 2 — Pipeline (2 hours)
  2.1 Create apps/shell/public/boat-shooter-audio/ structure.
  2.2 Implement audio-loader.ts (Section 6.2).
  2.3 Refactor AudioSystem (Section 6.3) to prefer asset, fall back to
       synth. Keep all 17 current sfx* methods working.
  2.4 Add music cross-fade helper (Section 6.4).

PHASE 3 — Variant rotation (1 hour)
  3.1 Cannon fire: pick 1-of-3 randomly per call.
  3.2 Same for musket, hit, explosion, splash.
  3.3 Per-stage 2-track rotation (deterministic if daily seed set).

PHASE 4 — Boss layer (1 hour)
  4.1 Boss spawn → fade in boss track over 1.5 s.
  4.2 Boss death → fade out over 2 s, resume stage music.

PHASE 5 — Ambient beds (1 hour)
  5.1 Per-biome ambient loop, 30% volume relative to music.
  5.2 Cross-fade 4 s on biome change (already handled by water-shader's
       biome system — wire to audio.setBiome()).

PHASE 6 — Acceptance (1 hour)
  6.1 Playtest stages 1-15. Confirm music varies per stage.
  6.2 Confirm cannon-fire repetition feels alive (3-variant rotation).
  6.3 Confirm boss layer fades in cleanly + out on death.
  6.4 Confirm volume sliders in settings work.
  6.5 Confirm missing-asset fallback to procedural still works.

Total: ~10 hours of work across phases. Sourcing is the longest because
curation = listening to 50+ tracks and picking the right 30.
```

## 8. License compliance

Add a `CREDITS.md` at the repo root with a per-asset table:

```
| File                | Composer       | License | Source                                       |
|---------------------|----------------|---------|----------------------------------------------|
| music/act-1a.ogg    | Kevin MacLeod  | CC-BY 4.0 | https://incompetech.com/.../pirate-bobby   |
| music/act-1b.ogg    | alkakrab       | Free    | https://alkakrab.itch.io/.../track-3        |
| sfx/cannon-1.ogg    | Kenney         | CC0     | https://kenney.nl/assets/pixel-shmup        |
| ...                 | ...            | ...     | ...                                          |
```

Required by CC-BY licenses; a courtesy for CC0/free packs.

In-game credits: a "Music & Audio" section in the title-screen credits
roll that lists every CC-BY composer in alphabetical order (1 visible
credit per composer is enough — not per track).

## 9. Budget + size

- Music files: 12 tracks × ~2 MB = ~24 MB (192 kbps stereo OGG).
- SFX files: 50 sounds × ~50 KB = ~2.5 MB (128 kbps mono OGG).
- Ambient: 6 loops × ~1.5 MB = ~9 MB.
- **Total: ~35 MB**. Inside the PWA precache limit when chunked.

Service Worker strategy: precache only `music-menu.ogg` and core SFX
(~6 MB). Lazy-load per-act music + per-biome ambient on stage start.

## 10. Non-goals

- No original music composition. We curate from free libraries.
- No voice acting. Text only for character dialogue (consistent with art bible).
- No 3D positional audio — top-down 2D doesn't need it; stereo pan is enough.
- No microphone / live audio — the game is single-player.
- No music store / unlockable tracks — the soundtrack ships complete.

## 11. Risks

- **Same composer ubiquity** — Kevin MacLeod is in *thousands* of indie
  games. Players might recognize his tracks. Mitigation: rotate 50%
  alkakrab + 50% MacLeod across acts so no single act feels "that
  YouTube background music."
- **License drift** — pack maintainers occasionally revise licenses.
  Mitigation: snapshot every asset's license file alongside the audio
  in `boat-shooter-audio/LICENSES/<source>.txt`.
- **Browser autoplay restrictions** — Chrome blocks audio until user
  interaction. Mitigation: title screen has a click-to-start button
  that triggers the first sound; subsequent music plays freely.
