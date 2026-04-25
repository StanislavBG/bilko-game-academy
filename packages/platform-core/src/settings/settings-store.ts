import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ReadonlySettings, ColorblindPalette, ControlScheme } from '@bilko/game-sdk';
import { createPlatformSave } from '../save/save-adapter';

export interface SettingsState {
  audio: {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    subtitleVolume: number;
  };
  display: {
    reducedMotion: boolean;
    colorblindPalette: ColorblindPalette;
    highContrast: boolean;
    textScale: number;
    batterySaver: boolean;
  };
  controls: {
    scheme: ControlScheme;
    holdToFire: boolean;
    oneHanded: boolean;
    hapticFeedback: boolean;
  };
  language: string;
  profanityFilter: boolean;
  set: <K extends SettingsKey>(path: K, value: SettingsValue<K>) => void;
  hydrateFromStorage: () => Promise<void>;
}

type SettingsKey =
  | `audio.${keyof SettingsState['audio']}`
  | `display.${keyof SettingsState['display']}`
  | `controls.${keyof SettingsState['controls']}`
  | 'language'
  | 'profanityFilter';

type SettingsValue<K extends SettingsKey> =
  K extends `audio.${infer K2}` ? K2 extends keyof SettingsState['audio'] ? SettingsState['audio'][K2] : never :
  K extends `display.${infer K2}` ? K2 extends keyof SettingsState['display'] ? SettingsState['display'][K2] : never :
  K extends `controls.${infer K2}` ? K2 extends keyof SettingsState['controls'] ? SettingsState['controls'][K2] : never :
  K extends 'language' ? string :
  K extends 'profanityFilter' ? boolean :
  never;

const DEFAULT_SETTINGS: Omit<SettingsState, 'set' | 'hydrateFromStorage'> = {
  audio: { masterVolume: 0.8, musicVolume: 0.7, sfxVolume: 0.8, subtitleVolume: 1.0 },
  display: {
    reducedMotion: false,
    colorblindPalette: 'none',
    highContrast: false,
    textScale: 1.0,
    batterySaver: false,
  },
  controls: {
    scheme: 'touch-drag',
    holdToFire: false,
    oneHanded: false,
    hapticFeedback: true,
  },
  language: 'en',
  profanityFilter: true,
};

const STORAGE_KEY = 'settings';
const save = createPlatformSave();

export const useSettings = create<SettingsState>()(
  subscribeWithSelector((set) => ({
    ...DEFAULT_SETTINGS,
    set(path, value) {
      set((state) => {
        const next = structuredClone(state) as SettingsState;
        const [group, field] = path.split('.') as [keyof SettingsState, string];
        if (field) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (next[group] as any)[field] = value;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (next as any)[group] = value;
        }
        // fire-and-forget persist
        void save.save(STORAGE_KEY, stripActions(next));
        return next;
      });
    },
    async hydrateFromStorage() {
      const stored = await save.load<Partial<SettingsState> | null>(STORAGE_KEY, null);
      if (!stored) return;
      set((state) => ({ ...state, ...stored }));
    },
  })),
);

function stripActions(s: SettingsState): Omit<SettingsState, 'set' | 'hydrateFromStorage'> {
  const { set: _a, hydrateFromStorage: _b, ...rest } = s;
  return rest;
}

/**
 * Returns a ReadonlySettings view suitable for passing to a GameContext.
 * The `subscribe` callback invokes the listener whenever any setting changes.
 */
export function readonlySettings(): ReadonlySettings {
  const snapshot = () => {
    const s = useSettings.getState();
    return {
      audio: { ...s.audio },
      display: { ...s.display },
      controls: {
        scheme: s.controls.scheme,
        holdToFire: s.controls.holdToFire,
        oneHanded: s.controls.oneHanded,
        hapticFeedback: s.controls.hapticFeedback,
      },
      language: s.language,
    };
  };

  return {
    ...snapshot(),
    subscribe(listener: (s: ReadonlySettings) => void): () => void {
      return useSettings.subscribe((state, prev) => {
        if (state === prev) return;
        listener(readonlySettings());
      });
    },
  } as ReadonlySettings;
}
