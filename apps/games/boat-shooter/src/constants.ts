/**
 * World constants for Boat Shooter.
 *
 * The game runs in a 1920×1080 logical coordinate system; Phaser's
 * Scale.FIT scales the canvas to fit the viewport.
 */

export const WORLD_WIDTH = 1920;
export const WORLD_HEIGHT = 1080;

/** River scroll rate (px/sec). 50 px/s is a calm "drift" — fast enough to
 * read direction, slow enough to avoid the parallax dizziness the higher
 * values induced. */
export const RIVER_SCROLL_SPEED = 50;

/** Player baseline stats (see docs/games/boat-shooter/03-player-ship.md). */
export const PLAYER_BASELINE = {
  maxHP: 6,
  speed: 700, // px/sec — snappy; outpaces every normal enemy including rammers
  accel: 3200, // px/sec^2 — reach max speed in ~0.2s for responsive dodging
  iframeDurationMs: 900,
  magnetRadius: 80, // px — close-range only (PRD 2). Drops drift down with the river; the player must sail near them. Cargo Nets / passives multiply this.
  coinValueMult: 1.0,
  critChance: 0.1,
  critMultiplier: 1.5,
} as const;

/** Combat pace baseline ("Brisk arcade"). */
export const COMBAT_BASELINE = {
  projectileSpeed: 800, // px/sec
  baseDamage: 1,
  baseFireRate: 3.0, // shots/sec
} as const;

/** XP orb + coin tuning. */
export const XP_TUNING = {
  magnetRangeMultiplier: 1.0, // applied on top of player magnetRadius
  offscreenLossMs: 3000, // orbs/coins lost if below stage bottom for this long
  levelupCadenceBase: 25, // XP points ~= kill count to reach L1; ramps
} as const;

/** Player damage-number visual tuning. */
export const DAMAGE_NUMBER = {
  floatUpPx: 60,
  lifetimeMs: 700,
  startFontSize: 26,
} as const;

/** Safe play area — keep a margin from screen edges to avoid finger-occlusion on iPad. */
export const SAFE_AREA_MARGIN = 80;
/** Player-only margin (lets the boat roam closer to top/bottom than enemy spawns). */
export const PLAYER_PLAY_MARGIN = 40;
/** Wooden bottom HUD deck height — gameplay area ends at WORLD_HEIGHT - HUD_DECK_HEIGHT. */
export const HUD_DECK_HEIGHT = 216;
