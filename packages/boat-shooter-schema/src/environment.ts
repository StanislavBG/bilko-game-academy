/**
 * Environment schema.
 *
 * An Environment captures every visual / atmospheric trait a stage can use:
 * water palette, weather overlay, scenery prop pool, music, optional
 * background sprite. Stages reference an environment by id, so the same
 * environment can power many stages — and tweaking it from the admin
 * console reskins every stage that uses it without touching wave data.
 */

export type EnvironmentId = string;

export type EnvironmentBiome =
  | 'rivermouth'
  | 'inland'
  | 'delta'
  | 'open-sea'
  | 'cursed'
  | 'volcanic'
  | 'frozen'
  | 'storm';

export type EnvironmentWeather =
  | 'clear'
  | 'rain'
  | 'storm'
  | 'fog'
  | 'ash'
  | 'snow';

export interface EnvironmentSpec {
  id: EnvironmentId;
  /** Player-facing display name (admin only — never rendered in-game). */
  name: string;
  biome: EnvironmentBiome;
  /** 3–6 hex colors for the water shader (e.g. ["#0a3a4a", "#1a5a6a", "#2a7a8a"]). */
  waterPaletteHex: ReadonlyArray<string>;
  weather: EnvironmentWeather;
  /** 0..1 — fog opacity multiplier. */
  fogOpacity: number;
  /** Multiplies `RIVER_SCROLL_SPEED` from constants. 1.0 = default. */
  riverScrollSpeedMul: number;
  /** Optional music id consumed by the audio system. */
  musicId?: string;
  /** Sprite ids of scenery the spawner picks from. Subset of the manifest. */
  sceneryProps: ReadonlyArray<string>;
  /** Optional full-screen backdrop sprite id. */
  backgroundSpriteId?: string;
  /** Free-form admin-only notes — never read by runtime. */
  notes?: string;
}
