import type {
  EnemyId,
  EnemySpec,
  EnvironmentSpec,
  StageSpawnMode,
  StageSpec,
} from '@bilko/boat-shooter-schema';
import { STAGE_SPAWN_MODES } from '../garage/constants';
import { WaveEditor } from './wave-editor';
import { FormulaEditor } from './formula-editor';

interface Props {
  stage: StageSpec;
  enemies: ReadonlyArray<EnemySpec>;
  environments: ReadonlyArray<EnvironmentSpec>;
  dirtyKeys: ReadonlySet<string>;
  onChange: (next: StageSpec) => void;
}

export function LevelDetail({
  stage,
  enemies,
  environments,
  dirtyKeys,
  onChange,
}: Props): JSX.Element {
  const mode: StageSpawnMode = stage.spawnMode ?? 'waves';
  const showWaves = mode === 'waves' || mode === 'both';
  const showFormula = mode === 'formula' || mode === 'both';
  const bossOptions = [...enemies]
    .filter((e) => e.kind === 'boss' || e.kind === 'mini-boss' || e.maxHp >= 60)
    .sort((a, b) => a.id.localeCompare(b.id));

  function patch<K extends keyof StageSpec>(key: K, value: StageSpec[K]): void {
    onChange({ ...stage, [key]: value });
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-6 space-y-8 max-w-4xl">
      {/* Header — title + code, then a single inline strip */}
      <header className="space-y-2">
        <div className="flex items-baseline gap-3">
          <input
            type="text"
            value={stage.title}
            onChange={(e) => patch('title', e.target.value)}
            className="font-display text-3xl text-sea-50 bg-transparent border-0 border-b border-transparent hover:border-sea-700 focus:border-gold-500 focus:outline-none px-0 py-0.5 flex-1 min-w-0"
          />
          <input
            type="text"
            value={stage.displayCode}
            onChange={(e) => patch('displayCode', e.target.value)}
            className="font-display text-xl text-gold-400 bg-transparent border-0 border-b border-transparent hover:border-sea-700 focus:border-gold-500 focus:outline-none px-0 py-0.5 w-16 text-right tabular-nums"
          />
          {(dirtyKeys.has('title') || dirtyKeys.has('displayCode')) && <Dot />}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-sea-300">
          <Inline label="Duration" dirty={dirtyKeys.has('durationSec')}>
            <input
              type="number"
              step={5}
              min={10}
              value={stage.durationSec}
              onChange={(e) => patch('durationSec', Math.max(10, Number(e.target.value) || 60))}
              className="w-16 bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-100 text-sm tabular-nums px-0 py-0.5"
            />
            <span className="text-sea-500 ml-1">s</span>
          </Inline>
          <Inline label="Environment" dirty={dirtyKeys.has('environmentId')}>
            <select
              value={stage.environmentId}
              onChange={(e) => patch('environmentId', e.target.value)}
              className="bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-100 text-sm px-0 py-0.5"
            >
              {environments.map((env) => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
              {!environments.find((e) => e.id === stage.environmentId) && stage.environmentId && (
                <option value={stage.environmentId}>{stage.environmentId} (missing)</option>
              )}
            </select>
          </Inline>
          <Inline label="Boss" dirty={dirtyKeys.has('boss')}>
            <select
              value={stage.boss}
              onChange={(e) => patch('boss', e.target.value as EnemyId)}
              className="bg-transparent border-b border-sea-800 hover:border-sea-600 focus:border-gold-500 focus:outline-none text-sea-100 text-sm px-0 py-0.5"
            >
              {bossOptions.map((b) => (
                <option key={b.id} value={b.id}>{b.id}</option>
              ))}
            </select>
          </Inline>
          <Inline label="Spawns" dirty={dirtyKeys.has('spawnMode')}>
            <span className="inline-flex gap-0.5">
              {STAGE_SPAWN_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => patch('spawnMode', m)}
                  className={`px-1.5 py-0.5 text-[11px] uppercase tracking-wider transition-colors ${
                    mode === m ? 'text-gold-400' : 'text-sea-500 hover:text-sea-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </span>
          </Inline>
        </div>
      </header>

      {showWaves && (
        <WaveEditor
          stage={stage}
          enemies={enemies}
          enabled
          onChange={onChange}
        />
      )}

      {showFormula && (
        <FormulaEditor
          stage={stage}
          enemies={enemies}
          enabled
          onChange={onChange}
        />
      )}
    </main>
  );
}

function Inline({
  label,
  dirty,
  children,
}: {
  label: string;
  dirty: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-sea-500">{label}</span>
      {children}
      {dirty && <Dot />}
    </span>
  );
}

function Dot(): JSX.Element {
  return <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" title="Unsaved" />;
}
