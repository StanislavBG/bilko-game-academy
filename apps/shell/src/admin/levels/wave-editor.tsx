import type { EnemyId, EnemySpec, StageSpec, Wave, WavePattern } from '@bilko/boat-shooter-schema';
import { WAVE_PATTERNS } from '../garage/constants';

interface Props {
  stage: StageSpec;
  enemies: ReadonlyArray<EnemySpec>;
  enabled: boolean;
  onChange: (next: StageSpec) => void;
}

function sortWaves(waves: ReadonlyArray<Wave>): Wave[] {
  return [...waves].sort((a, b) => a.at - b.at);
}

export function WaveEditor({ stage, enemies, enabled, onChange }: Props): JSX.Element {
  const enemyOptions = [...enemies].sort((a, b) => a.id.localeCompare(b.id));

  function update(idx: number, next: Wave): void {
    const waves = stage.waves.map((w, i) => (i === idx ? next : w));
    onChange({ ...stage, waves });
  }

  function commitAt(idx: number, next: Wave): void {
    onChange({ ...stage, waves: sortWaves(stage.waves.map((w, i) => (i === idx ? next : w))) });
  }

  function remove(idx: number): void {
    onChange({ ...stage, waves: stage.waves.filter((_, i) => i !== idx) });
  }

  function add(): void {
    const last = stage.waves.length > 0 ? stage.waves[stage.waves.length - 1]! : null;
    const fallbackEnemy = (enemyOptions[0]?.id ?? 'scout-skiff') as EnemyId;
    const seed: Wave = {
      at: last ? Math.min(last.at + 4, stage.durationSec) : 2,
      spawn: last?.spawn ?? fallbackEnemy,
      count: 3,
      pattern: 'staggered-line',
    };
    onChange({ ...stage, waves: sortWaves([...stage.waves, seed]) });
  }

  return (
    <section className={enabled ? '' : 'opacity-60'}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[11px] uppercase tracking-wider text-sea-500">
          Waves · {stage.waves.length}
        </h3>
      </div>

      <div className="space-y-1">
        {stage.waves.length === 0 && (
          <p className="text-xs text-sea-400 italic">No waves. Add one to start the timeline.</p>
        )}
        {stage.waves.map((w, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[60px_1fr_50px_120px_24px] gap-2 items-center text-sm group"
          >
            <input
              type="number"
              step={1}
              min={0}
              value={w.at}
              disabled={!enabled}
              onChange={(e) => update(idx, { ...w, at: Number(e.target.value) || 0 })}
              onBlur={(e) => commitAt(idx, { ...w, at: Number(e.target.value) || 0 })}
              className="bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-200 tabular-nums px-0 py-0.5"
              title="Spawn time (seconds)"
            />
            <select
              value={w.spawn}
              disabled={!enabled}
              onChange={(e) => update(idx, { ...w, spawn: e.target.value as EnemyId })}
              className="bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-100 px-0 py-0.5"
            >
              {enemyOptions.map((e) => (
                <option key={e.id} value={e.id}>{e.id}</option>
              ))}
              {!enemyOptions.find((e) => e.id === w.spawn) && (
                <option value={w.spawn}>{w.spawn} (missing)</option>
              )}
            </select>
            <input
              type="number"
              step={1}
              min={1}
              value={w.count}
              disabled={!enabled}
              onChange={(e) => update(idx, { ...w, count: Math.max(1, Number(e.target.value) || 1) })}
              className="bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-200 tabular-nums px-0 py-0.5 text-right"
              title="Count"
            />
            <select
              value={w.pattern}
              disabled={!enabled}
              onChange={(e) => update(idx, { ...w, pattern: e.target.value as WavePattern })}
              className="bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-300 px-0 py-0.5 text-xs"
            >
              {WAVE_PATTERNS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => remove(idx)}
              className="text-sea-700 group-hover:text-sea-500 hover:!text-red-400 text-sm"
              title="Remove wave"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!enabled}
        onClick={add}
        className="mt-2 text-[11px] uppercase tracking-wider text-sea-500 hover:text-gold-400 disabled:opacity-40"
      >
        + add wave
      </button>
    </section>
  );
}
