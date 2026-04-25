# Audio Bible (in-game)

## Music per act

- **Act I — Sunlit Delta:** Celtic pirate shanty + orchestral strings. Upbeat, adventurous.
- **Act II — Cursed Fog:** Eerie choir + atmospheric drones + muted brass. Spooky, tense.
- **Act III — Volcanic Reach:** Taiko drums + brass + synth pulse. Intense, driving.
- **Final Boss (Kraken):** Full orchestral bombast. 3-minute cue looping with Phase-specific layers.

## Dynamic layers

- Low-intensity base track always plays.
- **Combat layer** fades in when > 5 enemies on screen.
- **Boss layer** triggers on boss intro; act-specific theme.
- **Evolution chest sting** — brief 4-bar celebration.
- **Campaign victory sting** — triumphant orchestral stinger on Kraken defeat.

## SFX library (estimated 200+)

- **Weapons (26):** 13 primary fire SFX + 13 level-up stings. Each weapon
  has a recognizable attack signature (cannon boom, lightning crack, flame
  roar, mortar thunk, axe whirr, etc.).
- **Reactions (13):** unique audio-visual burst per reaction — Electrocute
  zap-crack, Steam hiss, Shatter glass, Cataclysm deep boom, Supernova
  ethereal roar, Ice Storm wind-chime cascade.
- **Enemies (~54):** fire / death / spawn SFX for 18 enemies.
- **Bosses (~18):** intro sting + defeat sting for 9 bosses.
- **UI (~20):** click, hover, buy, insufficient funds, level-up fanfare,
  heal, map fragment ping, achievement unlock.
- **Pickups (~10):** coin (S/M/L), gem, XP orb, boost, shield, magnet, heal.
- **Ambient (~10):** water, wind, rain, storm thunder, volcanic rumble, seagulls, fog whispers.
- **Hazard stingers (~10):** rock collision, whirlpool tug, waterfall roar, lava sizzle.

## Voicing

**No voice acting in v1.** All text bubbles voiced with a generic "boop-boop" text blip (can be disabled).

## Middleware

- **Phaser WebAudio** for in-game positional SFX (spatial attenuation by distance).
- **Howler.js** fallback for music (cross-fade friendly).
- Both respect Master / Music / SFX volume sliders from Settings.

## Sourcing

- **Music generation:** Suno / Udio with tag prompts per act. Review pass,
  pick best, master to -14 LUFS.
- **SFX:** Freesound.org (CC0 / CC-BY) primary; asset-pack supplements.
- **Custom stings:** layered via Audacity from free library clips.
- All audio normalized and tagged in an audio asset spreadsheet.
