# Audio Direction (platform-wide)

Platform-level audio: shell UI sounds, shared stingers, and middleware.

## Middleware

- **Howler.js** for shell UI audio (button clicks, navigation stings,
  leaderboard fanfare).
- **Phaser WebAudio** for in-game positional SFX (each game owns its own).
- Both obey the shared Master / Music / SFX volume sliders from Settings.

## Shared audio budget

- ~20 UI sounds: click, hover, page-in, page-out, notify, error, purchase,
  level-up fanfare, leaderboard-rank ding, boss-unlock chime.
- ~5 shared stingers: game-start, game-quit, achievement-unlock.
- Ambient shell home-screen loop (mellow pirate shanty with dynamic
  transitions when hovering tiles).

## Format

- **OGG Vorbis** primary (smaller, universal on Safari).
- **MP3** fallback for older browsers.
- All audio 44.1 kHz stereo; SFX mono where spatial audio isn't needed.
- Loudness normalization to -14 LUFS integrated.

## Sourcing

- **Music:** AI-generated via Suno / Udio.
- **SFX:** primarily Freesound.org (CC0 / CC-BY), asset pack supplements.
- See `10-asset-pipeline.md` for the full pipeline.

See `games/boat-shooter/18-audio-bible.md` for the game's specific audio.
