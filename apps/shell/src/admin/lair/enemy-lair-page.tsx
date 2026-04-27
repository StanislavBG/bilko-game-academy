import { useEffect, useMemo, useState } from 'react';
import type {
  AbilityMaps,
  EnemyAbilityMap,
  EnemyId,
  EnemySpec,
} from '@bilko/boat-shooter-schema';
import { getStoredToken, putSection, setStoredToken } from '../garage/api-client';
import { PageBody, PageShell } from '../garage/_shared/page-shell';
import { useContentPack } from '../garage/_shared/api-state';
import { EnemyDetail } from './enemy-detail';
import { EnemyList } from './enemy-list';

type DirtyMap = Record<string, ReadonlySet<string>>;

function findAbilityMap(maps: AbilityMaps, enemyId: EnemyId): EnemyAbilityMap {
  const found = maps.enemies.find((e) => e.enemyId === enemyId);
  if (found) return found;
  return { enemyId, attacks: [] };
}

function replaceAbilityMap(maps: AbilityMaps, next: EnemyAbilityMap): AbilityMaps {
  const exists = maps.enemies.some((e) => e.enemyId === next.enemyId);
  const enemies = exists
    ? maps.enemies.map((e) => (e.enemyId === next.enemyId ? next : e))
    : [...maps.enemies, next];
  return { ...maps, enemies };
}

function diffEnemyKeys(a: EnemySpec, b: EnemySpec): Set<string> {
  const keys = new Set<string>();
  const allKeys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  for (const k of allKeys) {
    if (k === 'drops') continue;
    const av = (a as unknown as Record<string, unknown>)[k];
    const bv = (b as unknown as Record<string, unknown>)[k];
    if (av !== bv) keys.add(k);
  }
  const dropKeys = new Set<string>([
    ...Object.keys(a.drops ?? {}),
    ...Object.keys(b.drops ?? {}),
  ]);
  for (const k of dropKeys) {
    const av = (a.drops as unknown as Record<string, unknown>)[k];
    const bv = (b.drops as unknown as Record<string, unknown>)[k];
    if (av !== bv) keys.add(`drops.${k}`);
  }
  return keys;
}

export function EnemyLairPage(): JSX.Element {
  const { status, reload, setPack } = useContentPack();
  const [enemies, setEnemies] = useState<ReadonlyArray<EnemySpec>>([]);
  const [abilityMaps, setAbilityMaps] = useState<AbilityMaps | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [token, setToken] = useState<string>(() => getStoredToken());
  const [dirty, setDirty] = useState<DirtyMap>({});
  const [enemiesDirty, setEnemiesDirty] = useState(false);
  const [abilityMapsDirty, setAbilityMapsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: 'success'; message: string } | null>(null);

  useEffect(() => {
    if (status.kind !== 'ready') return;
    setEnemies(status.pack.enemies);
    setAbilityMaps(status.pack.abilityMaps);
    setSelectedId((cur) => cur ?? status.pack.enemies[0]?.id ?? null);
    setDirty({});
    setEnemiesDirty(false);
    setAbilityMapsDirty(false);
  }, [status]);

  const selected = useMemo(
    () => (selectedId ? enemies.find((e) => e.id === selectedId) ?? null : null),
    [enemies, selectedId],
  );

  function handleEnemyChange(next: EnemySpec): void {
    if (status.kind !== 'ready') return;
    const original = status.pack.enemies.find((e) => e.id === next.id);
    setEnemies((cur) => cur.map((e) => (e.id === next.id ? next : e)));
    setEnemiesDirty(true);
    if (original) {
      setDirty((d) => ({ ...d, [next.id]: diffEnemyKeys(original, next) }));
    }
  }

  function handleAbilityMapChange(next: EnemyAbilityMap): void {
    if (!abilityMaps) return;
    setAbilityMaps(replaceAbilityMap(abilityMaps, next));
    setAbilityMapsDirty(true);
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
      if (enemiesDirty) {
        await putSection('enemies', enemies);
      }
      if (abilityMapsDirty && abilityMaps) {
        await putSection('ability-maps', { version: 1, ...abilityMaps });
      }
      if (status.kind === 'ready') {
        setPack({
          ...status.pack,
          enemies,
          abilityMaps: abilityMaps ?? status.pack.abilityMaps,
        });
      }
      setEnemiesDirty(false);
      setAbilityMapsDirty(false);
      setDirty({});
      setFlash({ kind: 'success', message: 'Saved.' });
      window.setTimeout(() => setFlash(null), 1800);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const hasUnsaved = enemiesDirty || abilityMapsDirty;
  const selectedAbilityMap =
    selected && abilityMaps ? findAbilityMap(abilityMaps, selected.id) : null;

  return (
    <PageShell
      title="Enemy Lair — Boat Shooter"
      token={token}
      onTokenChange={handleTokenChange}
      hasUnsaved={hasUnsaved}
      saving={saving}
      saveError={saveError}
      onSaveAll={() => void handleSaveAll()}
      flash={flash}
      body={
        <PageBody
          loading={status.kind === 'loading'}
          errorReason={status.kind === 'error' ? status.reason : null}
          onRetry={reload}
          rail={<EnemyList enemies={enemies} selectedId={selectedId} onSelect={setSelectedId} />}
          main={
            status.kind === 'ready' && abilityMaps && selected && selectedAbilityMap ? (
              <EnemyDetail
                enemy={selected}
                sprites={status.pack.sprites}
                abilityMap={selectedAbilityMap}
                dirtyKeys={dirty[selected.id] ?? new Set<string>()}
                onEnemyChange={handleEnemyChange}
                onAbilityMapChange={handleAbilityMapChange}
                refetchContent={reload}
              />
            ) : status.kind === 'ready' && enemies.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sea-400 text-sm p-6 text-center">
                <div className="max-w-md">
                  <p className="mb-2">No enemies in the content pack yet.</p>
                  <p className="text-xs italic text-sea-500">
                    The runtime treats <code>pack.enemies</code> as the source of truth; the
                    bundled defaults currently ship an empty enemies array. Once
                    <code>enemies.json</code> is populated, this list will fill in.
                  </p>
                </div>
              </div>
            ) : status.kind === 'ready' ? (
              <div className="flex-1 flex items-center justify-center text-sea-400 text-sm">
                Select an enemy from the left rail.
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
