import { useEffect, useMemo, useState } from 'react';
import type { EnemyId, EnvironmentSpec, StageSpec } from '@bilko/boat-shooter-schema';
import { getStoredToken, putSection, setStoredToken } from '../garage/api-client';
import { PageBody, PageShell } from '../garage/_shared/page-shell';
import { useContentPack } from '../garage/_shared/api-state';
import { LevelList } from './level-list';
import { LevelDetail } from './level-detail';

type DirtyMap = Record<string, ReadonlySet<string>>;

function diffStage(prev: StageSpec, next: StageSpec): Set<string> {
  const keys: Array<keyof StageSpec> = [
    'title', 'displayCode', 'durationSec', 'environmentId', 'boss', 'spawnMode',
  ];
  const out = new Set<string>();
  for (const k of keys) {
    if (prev[k] !== next[k]) out.add(k);
  }
  if (JSON.stringify(prev.waves) !== JSON.stringify(next.waves)) out.add('waves');
  if (JSON.stringify(prev.enemyFormula) !== JSON.stringify(next.enemyFormula)) out.add('enemyFormula');
  return out;
}

export function LevelPage(): JSX.Element {
  const { status, reload, setPack } = useContentPack();
  const [stages, setStages] = useState<ReadonlyArray<StageSpec>>([]);
  const [environments, setEnvironments] = useState<ReadonlyArray<EnvironmentSpec>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [token, setToken] = useState<string>(() => getStoredToken());
  const [dirty, setDirty] = useState<DirtyMap>({});
  const [stagesDirty, setStagesDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: 'success'; message: string } | null>(null);

  useEffect(() => {
    if (status.kind !== 'ready') return;
    setStages(status.pack.stages);
    setEnvironments(status.pack.environments);
    setSelectedId((cur) => cur ?? status.pack.stages[0]?.id ?? null);
    setDirty({});
    setStagesDirty(false);
  }, [status]);

  const selected = useMemo(
    () => (selectedId ? stages.find((s) => s.id === selectedId) ?? null : null),
    [stages, selectedId],
  );

  const enemies = status.kind === 'ready' ? status.pack.enemies : [];

  function handleStageChange(next: StageSpec): void {
    if (status.kind !== 'ready') return;
    const original = status.pack.stages.find((s) => s.id === next.id);
    setStages((cur) => cur.map((s) => (s.id === next.id ? next : s)));
    setStagesDirty(true);
    if (original) {
      setDirty((d) => ({ ...d, [next.id]: diffStage(original, next) }));
    }
  }

  function handleAddStage(act: string): void {
    const stamp = Math.floor(Math.random() * 9000 + 1000);
    const newId = `stage-new-${stamp}`;
    const fallbackEnv = environments[0]?.id ?? 'env-rivermouth';
    const fallbackBoss = (enemies.find((e) => e.kind === 'boss')?.id ?? 'frigate-captain') as EnemyId;
    const next: StageSpec = {
      id: newId,
      title: 'New Stage',
      displayCode: `${act}-?`,
      durationSec: 90,
      environmentId: fallbackEnv,
      waves: [],
      boss: fallbackBoss,
    };
    setStages((cur) => [...cur, next]);
    setStagesDirty(true);
    setSelectedId(newId);
    setDirty((d) => ({ ...d, [newId]: new Set(['title', 'displayCode']) }));
  }

  function handleDeleteStage(id: string): void {
    setStages((cur) => cur.filter((s) => s.id !== id));
    setStagesDirty(true);
    setDirty((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
    if (selectedId === id) setSelectedId(stages[0]?.id ?? null);
  }

  function handleTokenChange(value: string): void {
    setToken(value);
    setStoredToken(value);
  }

  async function handleSaveAll(): Promise<void> {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (stagesDirty) {
        await putSection('stages', stages);
      }
      if (status.kind === 'ready') {
        setPack({ ...status.pack, stages });
      }
      setStagesDirty(false);
      setDirty({});
      setFlash({ kind: 'success', message: 'Saved.' });
      window.setTimeout(() => setFlash(null), 1800);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Level Design — Boat Shooter"
      token={token}
      onTokenChange={handleTokenChange}
      hasUnsaved={stagesDirty}
      saving={saving}
      saveError={saveError}
      onSaveAll={() => void handleSaveAll()}
      flash={flash}
      body={
        <PageBody
          loading={status.kind === 'loading'}
          errorReason={status.kind === 'error' ? status.reason : null}
          onRetry={reload}
          rail={
            <LevelList
              stages={stages}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddStage={handleAddStage}
              onDeleteStage={handleDeleteStage}
            />
          }
          main={
            status.kind === 'ready' && selected ? (
              <LevelDetail
                stage={selected}
                enemies={enemies}
                environments={environments}
                dirtyKeys={dirty[selected.id] ?? new Set<string>()}
                onChange={handleStageChange}
              />
            ) : status.kind === 'ready' ? (
              <div className="flex-1 flex items-center justify-center text-sea-400 text-sm">
                Select a stage from the left rail.
              </div>
            ) : (
              <div className="flex-1" />
            )
          }
        />
      }
    />
  );
}
