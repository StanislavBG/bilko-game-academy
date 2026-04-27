import type {
  EnemyFormula,
  EnemyFormulaEntry,
  EnemyId,
  EnemySpec,
  StageSpec,
} from '@bilko/boat-shooter-schema';

interface Props {
  stage: StageSpec;
  enemies: ReadonlyArray<EnemySpec>;
  enabled: boolean;
  onChange: (next: StageSpec) => void;
}

const DEFAULT_FORMULA: EnemyFormula = {
  kind: 'weighted-random',
  tickSec: 4,
  pool: [],
  intensity: { start: 1, end: 3, curve: 'linear' },
};

export function FormulaEditor({ stage, enemies, enabled, onChange }: Props): JSX.Element {
  const formula = stage.enemyFormula ?? DEFAULT_FORMULA;
  const enemyOptions = [...enemies].sort((a, b) => a.id.localeCompare(b.id));

  function update(next: EnemyFormula): void {
    onChange({ ...stage, enemyFormula: next });
  }

  function setTick(v: number): void {
    update({ ...formula, tickSec: Math.max(0.1, v) });
  }

  function setIntensity(field: 'start' | 'end', v: number): void {
    update({ ...formula, intensity: { ...formula.intensity, [field]: Math.max(0, v) } });
  }

  function setCurve(c: 'linear' | 'exp'): void {
    update({ ...formula, intensity: { ...formula.intensity, curve: c } });
  }

  function updatePool(idx: number, next: EnemyFormulaEntry): void {
    update({ ...formula, pool: formula.pool.map((p, i) => (i === idx ? next : p)) });
  }

  function removePool(idx: number): void {
    update({ ...formula, pool: formula.pool.filter((_, i) => i !== idx) });
  }

  function addPool(): void {
    const fallback = (enemyOptions[0]?.id ?? 'scout-skiff') as EnemyId;
    update({
      ...formula,
      pool: [...formula.pool, { enemyId: fallback, weight: 1 }],
    });
  }

  return (
    <section className={enabled ? '' : 'opacity-60'}>
      <h3 className="text-[11px] uppercase tracking-wider text-sea-500 mb-2">Formula</h3>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-sea-300 mb-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-sea-500">Tick</span>
          <input
            type="number"
            step={0.5}
            min={0.1}
            value={formula.tickSec}
            disabled={!enabled}
            onChange={(e) => setTick(Number(e.target.value) || 0.1)}
            className="w-12 bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-100 text-sm tabular-nums px-0 py-0.5"
          />
          <span className="text-sea-500">s</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-sea-500">Intensity</span>
          <input
            type="number"
            step={1}
            min={0}
            value={formula.intensity.start}
            disabled={!enabled}
            onChange={(e) => setIntensity('start', Number(e.target.value) || 0)}
            className="w-10 bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-100 text-sm tabular-nums px-0 py-0.5 text-right"
          />
          <span className="text-sea-500">→</span>
          <input
            type="number"
            step={1}
            min={0}
            value={formula.intensity.end}
            disabled={!enabled}
            onChange={(e) => setIntensity('end', Number(e.target.value) || 0)}
            className="w-10 bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-100 text-sm tabular-nums px-0 py-0.5 text-right"
          />
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-sea-500">Curve</span>
          <select
            value={formula.intensity.curve}
            disabled={!enabled}
            onChange={(e) => setCurve(e.target.value as 'linear' | 'exp')}
            className="bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-100 text-sm px-0 py-0.5"
          >
            <option value="linear">linear</option>
            <option value="exp">exp</option>
          </select>
        </span>
      </div>

      <div className="space-y-1">
        {formula.pool.length === 0 && (
          <p className="text-xs text-sea-400 italic">No enemies in pool. Add one to start spawning.</p>
        )}
        {formula.pool.map((entry, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[1fr_50px_60px_60px_24px] gap-2 items-center text-sm group"
          >
            <select
              value={entry.enemyId}
              disabled={!enabled}
              onChange={(e) => updatePool(idx, { ...entry, enemyId: e.target.value as EnemyId })}
              className="bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-100 px-0 py-0.5"
            >
              {enemyOptions.map((e) => (
                <option key={e.id} value={e.id}>{e.id}</option>
              ))}
            </select>
            <input
              type="number"
              step={1}
              min={0}
              value={entry.weight}
              disabled={!enabled}
              onChange={(e) => updatePool(idx, { ...entry, weight: Math.max(0, Number(e.target.value) || 0) })}
              className="bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-200 tabular-nums px-0 py-0.5 text-right"
              title="Weight"
            />
            <input
              type="number"
              step={1}
              min={0}
              placeholder="min"
              value={entry.minStartSec ?? ''}
              disabled={!enabled}
              onChange={(e) => {
                const raw = e.target.value;
                const next: EnemyFormulaEntry = raw === ''
                  ? { enemyId: entry.enemyId, weight: entry.weight, ...(entry.maxStartSec !== undefined ? { maxStartSec: entry.maxStartSec } : {}) }
                  : { ...entry, minStartSec: Number(raw) || 0 };
                updatePool(idx, next);
              }}
              className="bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-300 tabular-nums px-0 py-0.5 text-right placeholder:text-sea-700"
              title="Min start sec (optional)"
            />
            <input
              type="number"
              step={1}
              min={0}
              placeholder="max"
              value={entry.maxStartSec ?? ''}
              disabled={!enabled}
              onChange={(e) => {
                const raw = e.target.value;
                const next: EnemyFormulaEntry = raw === ''
                  ? { enemyId: entry.enemyId, weight: entry.weight, ...(entry.minStartSec !== undefined ? { minStartSec: entry.minStartSec } : {}) }
                  : { ...entry, maxStartSec: Number(raw) || 0 };
                updatePool(idx, next);
              }}
              className="bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-300 tabular-nums px-0 py-0.5 text-right placeholder:text-sea-700"
              title="Max start sec (optional)"
            />
            <button
              type="button"
              disabled={!enabled}
              onClick={() => removePool(idx)}
              className="text-sea-700 group-hover:text-sea-500 hover:!text-red-400 text-sm"
              title="Remove pool entry"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!enabled}
        onClick={addPool}
        className="mt-2 text-[11px] uppercase tracking-wider text-sea-500 hover:text-gold-400 disabled:opacity-40"
      >
        + add to pool
      </button>
    </section>
  );
}
