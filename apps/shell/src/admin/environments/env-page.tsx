import { useEffect, useMemo, useState } from 'react';
import type { EnvironmentSpec } from '@bilko/boat-shooter-schema';
import { getStoredToken, putSection, setStoredToken } from '../garage/api-client';
import { PageBody, PageShell } from '../garage/_shared/page-shell';
import { useContentPack } from '../garage/_shared/api-state';
import { EnvList } from './env-list';
import { EnvDetail } from './env-detail';

type DirtyMap = Record<string, ReadonlySet<string>>;

const SCALAR_KEYS: ReadonlyArray<keyof EnvironmentSpec> = [
  'name', 'biome', 'weather', 'fogOpacity', 'riverScrollSpeedMul', 'musicId',
  'backgroundSpriteId', 'notes',
];

function diffEnv(prev: EnvironmentSpec, next: EnvironmentSpec): Set<string> {
  const out = new Set<string>();
  for (const k of SCALAR_KEYS) {
    if (prev[k] !== next[k]) out.add(String(k));
  }
  if (JSON.stringify(prev.waterPaletteHex) !== JSON.stringify(next.waterPaletteHex)) out.add('waterPaletteHex');
  if (JSON.stringify(prev.sceneryProps) !== JSON.stringify(next.sceneryProps)) out.add('sceneryProps');
  return out;
}

export function EnvironmentsPage(): JSX.Element {
  const { status, reload, setPack } = useContentPack();
  const [environments, setEnvironments] = useState<ReadonlyArray<EnvironmentSpec>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [token, setToken] = useState<string>(() => getStoredToken());
  const [dirty, setDirty] = useState<DirtyMap>({});
  const [envsDirty, setEnvsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: 'success'; message: string } | null>(null);

  useEffect(() => {
    if (status.kind !== 'ready') return;
    setEnvironments(status.pack.environments);
    setSelectedId((cur) => cur ?? status.pack.environments[0]?.id ?? null);
    setDirty({});
    setEnvsDirty(false);
  }, [status]);

  const selected = useMemo(
    () => (selectedId ? environments.find((e) => e.id === selectedId) ?? null : null),
    [environments, selectedId],
  );

  function handleEnvChange(next: EnvironmentSpec): void {
    if (status.kind !== 'ready') return;
    const original = status.pack.environments.find((e) => e.id === next.id);
    setEnvironments((cur) => cur.map((e) => (e.id === next.id ? next : e)));
    setEnvsDirty(true);
    if (original) {
      setDirty((d) => ({ ...d, [next.id]: diffEnv(original, next) }));
    }
  }

  function handleAdd(): void {
    const stamp = Math.floor(Math.random() * 9000 + 1000);
    const newId = `env-new-${stamp}`;
    const next: EnvironmentSpec = {
      id: newId,
      name: 'New Environment',
      biome: 'rivermouth',
      waterPaletteHex: ['#2c5a6e', '#4a8aa8', '#7ec0d6'],
      weather: 'clear',
      fogOpacity: 0,
      riverScrollSpeedMul: 1,
      sceneryProps: [],
    };
    setEnvironments((cur) => [...cur, next]);
    setEnvsDirty(true);
    setSelectedId(newId);
    setDirty((d) => ({ ...d, [newId]: new Set(['name']) }));
  }

  function handleDelete(id: string): void {
    setEnvironments((cur) => cur.filter((e) => e.id !== id));
    setEnvsDirty(true);
    setDirty((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
    if (selectedId === id) setSelectedId(environments[0]?.id ?? null);
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
      if (envsDirty) {
        await putSection('environments', environments);
      }
      if (status.kind === 'ready') {
        setPack({ ...status.pack, environments });
      }
      setEnvsDirty(false);
      setDirty({});
      setFlash({ kind: 'success', message: 'Saved.' });
      window.setTimeout(() => setFlash(null), 1800);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleRevert(): void {
    if (status.kind !== 'ready') return;
    setEnvironments(status.pack.environments);
    setEnvsDirty(false);
    setDirty({});
    setSaveError(null);
  }

  return (
    <PageShell
      title="Environments — Boat Shooter"
      token={token}
      onTokenChange={handleTokenChange}
      hasUnsaved={envsDirty}
      dirtySectionCount={envsDirty ? 1 : 0}
      saving={saving}
      saveError={saveError}
      onSaveAll={() => void handleSaveAll()}
      onRevert={handleRevert}
      flash={flash}
      body={
        <PageBody
          loading={status.kind === 'loading'}
          errorReason={status.kind === 'error' ? status.reason : null}
          onRetry={reload}
          rail={
            <EnvList
              environments={environments}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
          }
          main={
            status.kind === 'ready' && selected ? (
              <EnvDetail
                env={selected}
                sprites={status.pack.sprites.entries}
                dirtyKeys={dirty[selected.id] ?? new Set<string>()}
                onChange={handleEnvChange}
              />
            ) : status.kind === 'ready' ? (
              <div className="flex-1 flex items-center justify-center text-sea-400 text-sm">
                Select an environment from the left rail.
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
