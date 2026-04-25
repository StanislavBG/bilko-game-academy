/**
 * The contract every game in the library implements. The shell mounts a game
 * by importing its module, calling `mount(containerDiv, ctx)`, and later
 * `instance.unmount()`. See docs/04-game-sdk-contract.md.
 */

import type { EventBus, GameEvent } from './event-bus';

export interface GameModule {
  id: string;
  title: string;
  version: string;
  mount(container: HTMLElement, ctx: GameContext): GameInstance;
}

export interface GameInstance {
  unmount(): void;
  pause(): void;
  resume(): void;
  getSave(): unknown;
  applySettings(): void;
}

export interface GameContext {
  save: SaveAdapter;
  settings: ReadonlySettings;
  controls: ReadonlyControlsMap;
  leaderboard: LeaderboardAPI;
  events: EventBus<GameEvent>;
  pause(): void;
  resume(): void;
}

export interface SaveAdapter {
  load<T>(key: string, defaultValue: T): Promise<T>;
  save<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ReadonlySettings {
  readonly audio: {
    readonly masterVolume: number;
    readonly musicVolume: number;
    readonly sfxVolume: number;
    readonly subtitleVolume: number;
  };
  readonly display: {
    readonly reducedMotion: boolean;
    readonly colorblindPalette: ColorblindPalette;
    readonly highContrast: boolean;
    readonly textScale: number;
    readonly batterySaver: boolean;
  };
  readonly controls: {
    readonly scheme: ControlScheme;
    readonly holdToFire: boolean;
    readonly oneHanded: boolean;
    readonly hapticFeedback: boolean;
  };
  readonly language: string;
  subscribe(listener: (s: ReadonlySettings) => void): () => void;
}

export type ColorblindPalette = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type ControlScheme = 'touch-drag' | 'virtual-joystick' | 'keyboard-mouse' | 'gamepad';

export interface ReadonlyControlsMap {
  readonly steer: Binding;
  readonly fire: Binding;
  readonly special: Binding;
  readonly boost: Binding;
  readonly pause: Binding;
}

export type Binding =
  | { kind: 'touch'; region?: 'left-half' | 'right-half' | 'whole' }
  | { kind: 'keyboard'; keys: readonly string[] }
  | { kind: 'gamepad'; axis?: string; button?: number };

export interface LeaderboardAPI {
  submit(entry: LeaderboardEntry): Promise<void>;
  fetch(board: string, opts?: FetchOpts): Promise<readonly LeaderboardRow[]>;
}

export interface LeaderboardEntry {
  board: string;
  score: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

export interface FetchOpts {
  limit?: number;
  friendsOnly?: boolean;
  period?: 'all-time' | 'weekly';
}

export interface LeaderboardRow {
  rank: number;
  username: string;
  score: number;
  durationMs?: number;
  submittedAt: string;
  meta?: Record<string, unknown>;
}
