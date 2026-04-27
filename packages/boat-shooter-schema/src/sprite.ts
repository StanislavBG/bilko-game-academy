/**
 * Sprite manifest schema.
 *
 * One entry per asset. Drives both the AI generator (`tools/generate-sprites.mjs`)
 * and the runtime loader (`systems/sprite-loader.ts`). Splitting category lets
 * the loader tolerate missing files for non-core kinds (procedural fallback)
 * while still flagging missing core sprites as errors.
 */
export type SpriteCategory =
  | 'player'
  | 'player-variant'
  | 'enemy'
  | 'boss'
  | 'pickup'
  | 'chest'
  | 'projectile'
  | 'scenery'
  | 'hazard'
  | 'icon'
  | 'bullet';

export type SpriteGenerator = 'gemini' | 'imagen';

export interface SpriteManifestEntry {
  /** Stable id. The runtime sprite key is `sprite-<id>`. */
  id: string;
  /** Drives loader policy + admin-app grouping. */
  category: SpriteCategory;
  /** AI prompt fed to the generator (tools/generate-sprites.mjs). */
  prompt: string;
  /** Style-lock variant key. Maps to a hardcoded prompt prefix in the generator. */
  styleLock?: 'default' | 'projectile' | 'scenery' | 'bullet';
  /** True if this sprite must exist on disk for the game to run. False = optional, procedural fallback. */
  required: boolean;
  /** Preferred backend. `imagen` = Imagen 4 (2K), `gemini` = Gemini 2.5 Flash Image (1K). */
  preferredGenerator?: SpriteGenerator;
}

export interface SpriteManifest {
  /** Schema version — bump when the entry shape changes incompatibly. */
  version: 1;
  entries: SpriteManifestEntry[];
}
