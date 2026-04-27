import { useMemo } from 'react';
import type {
  EnvironmentBiome,
  EnvironmentSpec,
  EnvironmentWeather,
  SpriteManifestEntry,
} from '@bilko/boat-shooter-schema';
import { ENVIRONMENT_BIOMES, ENVIRONMENT_WEATHERS } from '../garage/constants';

interface Props {
  env: EnvironmentSpec;
  sprites: ReadonlyArray<SpriteManifestEntry>;
  dirtyKeys: ReadonlySet<string>;
  onChange: (next: EnvironmentSpec) => void;
}

export function EnvDetail({ env, sprites, dirtyKeys, onChange }: Props): JSX.Element {
  const sceneryEntries = useMemo(
    () => sprites.filter((s) => s.category === 'scenery').sort((a, b) => a.id.localeCompare(b.id)),
    [sprites],
  );

  function patch<K extends keyof EnvironmentSpec>(key: K, value: EnvironmentSpec[K]): void {
    onChange({ ...env, [key]: value });
  }

  function toggleScenery(spriteId: string): void {
    const has = env.sceneryProps.includes(spriteId);
    const next = has
      ? env.sceneryProps.filter((s) => s !== spriteId)
      : [...env.sceneryProps, spriteId];
    patch('sceneryProps', next);
  }

  function setPalette(idx: number, hex: string): void {
    const next = env.waterPaletteHex.map((c, i) => (i === idx ? hex : c));
    patch('waterPaletteHex', next);
  }

  function addPalette(): void {
    if (env.waterPaletteHex.length >= 6) return;
    patch('waterPaletteHex', [...env.waterPaletteHex, '#3a8aa8']);
  }

  function removePalette(idx: number): void {
    if (env.waterPaletteHex.length <= 3) return;
    patch('waterPaletteHex', env.waterPaletteHex.filter((_, i) => i !== idx));
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-4">
      {/* Header */}
      <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
        <h3 className="font-display text-lg text-gold-400 mb-3">Environment</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" dirty={dirtyKeys.has('name')}>
            <input
              type="text"
              value={env.name}
              onChange={(e) => patch('name', e.target.value)}
              className="w-full px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm focus:outline-none focus:border-gold-500"
            />
          </Field>
          <Field label="Biome" dirty={dirtyKeys.has('biome')}>
            <select
              value={env.biome}
              onChange={(e) => patch('biome', e.target.value as EnvironmentBiome)}
              className="w-full px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm focus:outline-none focus:border-gold-500"
            >
              {ENVIRONMENT_BIOMES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Weather" dirty={dirtyKeys.has('weather')}>
            <select
              value={env.weather}
              onChange={(e) => patch('weather', e.target.value as EnvironmentWeather)}
              className="w-full px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm focus:outline-none focus:border-gold-500"
            >
              {ENVIRONMENT_WEATHERS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Fog opacity (${env.fogOpacity.toFixed(2)})`} dirty={dirtyKeys.has('fogOpacity')}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={env.fogOpacity}
              onChange={(e) => patch('fogOpacity', Number(e.target.value))}
              className="w-full accent-gold-500"
            />
          </Field>
          <Field label="River scroll ×mult" dirty={dirtyKeys.has('riverScrollSpeedMul')}>
            <input
              type="number"
              step={0.1}
              min={0.1}
              value={env.riverScrollSpeedMul}
              onChange={(e) => patch('riverScrollSpeedMul', Math.max(0.1, Number(e.target.value) || 1))}
              className="w-full px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm tabular-nums focus:outline-none focus:border-gold-500"
            />
          </Field>
          <Field label="Music id" dirty={dirtyKeys.has('musicId')}>
            <input
              type="text"
              value={env.musicId ?? ''}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val === '') {
                  const { musicId: _drop, ...rest } = env;
                  void _drop;
                  onChange(rest as EnvironmentSpec);
                } else {
                  patch('musicId', val);
                }
              }}
              placeholder="rivermouth-theme"
              className="w-full px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm focus:outline-none focus:border-gold-500"
            />
          </Field>
        </div>
      </section>

      {/* Water palette */}
      <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg text-gold-400">
            Water palette ({env.waterPaletteHex.length}/6)
          </h3>
          <button
            type="button"
            onClick={addPalette}
            disabled={env.waterPaletteHex.length >= 6}
            className="px-3 py-1 rounded border border-sea-600 text-sea-200 hover:border-gold-500 hover:text-gold-400 text-xs uppercase tracking-wider disabled:opacity-40"
          >
            + Add color
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {env.waterPaletteHex.map((hex, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={hex}
                onChange={(e) => setPalette(idx, e.target.value)}
                className="w-12 h-12 rounded border border-sea-600 bg-sea-950 cursor-pointer"
              />
              <input
                type="text"
                value={hex}
                onChange={(e) => setPalette(idx, e.target.value)}
                className="w-20 px-1 py-0.5 bg-sea-950 border border-sea-600 rounded text-sea-100 text-[10px] tabular-nums focus:outline-none focus:border-gold-500"
              />
              <button
                type="button"
                onClick={() => removePalette(idx)}
                disabled={env.waterPaletteHex.length <= 3}
                className="text-[10px] text-sea-500 hover:text-red-400 disabled:opacity-40"
              >
                remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Scenery props */}
      <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
        <h3 className="font-display text-lg text-gold-400 mb-3">
          Scenery props ({env.sceneryProps.length}/{sceneryEntries.length} selected)
        </h3>
        <div className="grid grid-cols-3 gap-1.5 max-h-72 overflow-y-auto">
          {sceneryEntries.map((s) => {
            const checked = env.sceneryProps.includes(s.id);
            return (
              <label
                key={s.id}
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer ${
                  checked ? 'bg-sea-700/60 text-gold-300' : 'text-sea-300 hover:bg-sea-800/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleScenery(s.id)}
                  className="accent-gold-500"
                />
                <span className="truncate">{s.id}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
        <h3 className="font-display text-lg text-gold-400 mb-3">Notes (admin-only)</h3>
        <textarea
          value={env.notes ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              const { notes: _drop, ...rest } = env;
              void _drop;
              onChange(rest as EnvironmentSpec);
            } else {
              patch('notes', val);
            }
          }}
          rows={3}
          placeholder="Free-form designer notes…"
          className="w-full px-2 py-1 bg-sea-950 border border-sea-600 rounded text-sea-100 text-sm focus:outline-none focus:border-gold-500"
        />
      </section>
    </main>
  );
}

function Field({
  label,
  dirty,
  children,
}: {
  label: string;
  dirty: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="flex flex-col text-xs text-sea-300">
      <span className="mb-1 uppercase tracking-wider flex items-center gap-1">
        {label}
        {dirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" title="Unsaved" />}
      </span>
      {children}
    </label>
  );
}
