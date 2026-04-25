# Environment & Hazards

All 8 hazard families ship in v1. Hazards are **authored in Tiled** (TMX
tilemap + object layers) so level designers can place them visually.
Weather / time-of-day are Phaser post-FX pipelines toggled per stage.

## 1. Rocks & Islands
Static collision obstacles; damage on impact (2 dmg + brief stun). Can be
navigated around; shape spawn lanes.

## 2. Narrow Passages & Choke Points
River narrows force tight maneuvering; bank enemies (Sniper Towers, Bank
Bandits) ambush. Great tension beats between open sections.

## 3. Whirlpools & Currents
Radial pull on the boat (and projectiles!). Redirects enemy bullets,
creates kinetic chaos. Stronger on Hard / NG+.

## 4. Waterfalls / Rapids / Speed Zones
Forced scroll-speed swings; screen shake; temporary reduced control
authority (acceleration halved). Dramatic beats between calm sections.

## 5. Destructible Environment
Shootable bridges, dams, piers, barrels, watch-towers. Opens shortcuts or
drops debris on enemies. **Friendly fire: YES** (see battle system).
Clear painterly affordance (lighter outline + bright highlights).

## 6. Weather / Time-of-Day Shifts
- **Fog** — Act II default; reduces visibility; scary-mood.
- **Storm** — Stage 9/10/14; lightning flashes illuminate scene; rain particles; reduced visibility.
- **Night** — Stage 8, 12; cursed palette; lanterns on enemies glow.
- **Sunrise/Sunset** — opening + closing stages; warm palette.
- **Ashfall (volcanic)** — Act III; darker sky; ash particles; 50% visibility in Warlord P3.

All implemented as Phaser post-FX pipelines toggled per stage. Reduced
motion mode disables the most expensive shaders.

## 7. Branching Tributaries (path choice)
At a designated point in the stage, the river forks. Player picks left /
right. Each branch has a different enemy/loot composition. Permanent
choice for the run. Replayability hook.

## 8. Bank Enemies (shore-based)
Cannons, archers, mortar emplacements on banks. Player can't reach them
directly but must shoot while passing. See Env1 Bank Bandits + N4 Bank
Sniper Tower in `08-enemies.md`.

## Biome arc (recap from `11-stages.md`)

| Stages | Biome | Dominant hazards |
|--------|-------|-------------------|
| 1–5 | Sunlit Delta | rocks, narrow passages, bandits, bridges |
| 6–10 | Cursed Fog | fog, storm, weather-dark, whirlpools |
| 11–15 | Volcanic Reach | rapids, ashfall, lava (B5 arena), Kraken foreshadowing |
