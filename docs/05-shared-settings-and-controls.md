# Shared Settings & Controls

Settings are set once in the shell and apply to every game on the platform.
Games read them through `ctx.settings` and subscribe to changes.

## Settings schema

```ts
export interface SharedSettings {
  audio: {
    masterVolume: number;       // 0..1
    musicVolume: number;        // 0..1
    sfxVolume: number;          // 0..1
    subtitleVolume: number;     // 0..1 (dialogue boop)
  };
  display: {
    reducedMotion: boolean;     // damp shake, flash, particles; cap FPS if needed
    colorblindPalette: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
    highContrast: boolean;      // black outlines + bright player glow
    textScale: number;          // 1.0..2.0 (100%..200%)
    batterySaver: boolean;      // cap 30 fps, disable post-FX
  };
  controls: {
    scheme: 'touch-drag' | 'virtual-joystick' | 'keyboard-mouse' | 'gamepad';
    holdToFire: boolean;        // false = auto-fire (default), true = hold to fire
    oneHanded: boolean;         // iPad: mirror to one side
    bindings: ControlsMap;      // remap-per-action
    hapticFeedback: boolean;    // iPad Haptic Engine (if supported)
  };
  account: {
    signedIn: boolean;
    username: string | null;
    cloudSave: boolean;
  };
  language: string;             // 'en' for v1
  profanityFilter: boolean;     // always true for family-friendly v1
}
```

## Controls map

```ts
export interface ControlsMap {
  steer: Binding;               // directional input
  fire: Binding;                // primary fire (only if holdToFire = true)
  special: Binding;             // special weapon / ultimate
  boost: Binding;               // dash
  pause: Binding;
}

export type Binding =
  | { kind: 'touch'; region?: 'left-half' | 'right-half' | 'whole' }
  | { kind: 'keyboard'; keys: string[] }       // e.g. ['w','ArrowUp']
  | { kind: 'gamepad'; axis?: string; button?: number };
```

## Default bindings

| Action | Touch | Keyboard | Gamepad |
|--------|-------|----------|---------|
| Steer | drag anywhere | WASD + arrows | left stick |
| Fire | auto | Space | A (button 0) |
| Special | button (UI) | Shift | RT |
| Boost | double-tap direction | Shift + direction | LT |
| Pause | swipe down | Esc | Start |

## Remapping

The Settings → Controls screen lets the user rebind any action. Rebinds
persist to IndexedDB and apply immediately across all games.
