import { useEffect, useMemo, useState } from 'react';
import type { AbilityMaps, ShipSpec } from '@bilko/boat-shooter-schema';
import { getStoredToken, putSection, setStoredToken } from './api-client';
import { ShipDetail } from './ship-detail';
import { ShipList } from './ship-list';
import { PageBody, PageShell } from './_shared/page-shell';
import { useContentPack } from './_shared/api-state';

type DirtyMap = Record<string, ReadonlySet<string>>;

export function GaragePage(): JSX.Element {
  const { status, reload, setPack } = useContentPack();
  const [ships, setShips] = useState<ReadonlyArray<ShipSpec>>([]);
  const [abilityMaps, setAbilityMaps] = useState<AbilityMaps | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [token, setToken] = useState<string>(() => getStoredToken());
  const [dirty, setDirty] = useState<DirtyMap>({});
  const [shipsDirty, setShipsDirty] = useState(false);
  const [abilityMapsDirty, setAbilityMapsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: 'success'; message: string } | null>(null);

  useEffect(() => {
    if (status.kind !== 'ready') return;
    setShips(status.pack.ships);
    setAbilityMaps(status.pack.abilityMaps);
    setSelectedId((cur) => cur ?? status.pack.ships[0]?.id ?? null);
    setDirty({});
    setShipsDirty(false);
    setAbilityMapsDirty(false);
  }, [status]);

  const selected = useMemo(
    () => (selectedId ? ships.find((s) => s.id === selectedId) ?? null : null),
    [ships, selectedId],
  );

  function handleShipChange(next: ShipSpec): void {
    if (status.kind !== 'ready') return;
    const original = status.pack.ships.find((s) => s.id === next.id);
    setShips((cur) => cur.map((s) => (s.id === next.id ? next : s)));
    setShipsDirty(true);
    if (original) {
      const changed = new Set<string>();
      const allKeys = new Set<string>([
        ...Object.keys(original.baselineDelta),
        ...Object.keys(next.baselineDelta),
      ]);
      for (const k of allKeys) {
        const a = (original.baselineDelta as Record<string, number | undefined>)[k];
        const b = (next.baselineDelta as Record<string, number | undefined>)[k];
        if (a !== b) changed.add(`baselineDelta.${k}`);
      }
      setDirty((d) => ({ ...d, [next.id]: changed }));
    }
  }

  function handleAbilityMapsChange(next: AbilityMaps): void {
    setAbilityMaps(next);
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
      if (shipsDirty) {
        await putSection('ships', { version: 1, ships });
      }
      if (abilityMapsDirty && abilityMaps) {
        await putSection('ability-maps', { version: 1, ...abilityMaps });
      }
      if (status.kind === 'ready') {
        setPack({ ...status.pack, ships, abilityMaps: abilityMaps ?? status.pack.abilityMaps });
      }
      setShipsDirty(false);
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

  const hasUnsaved = shipsDirty || abilityMapsDirty;
  const dirtySectionCount = (shipsDirty ? 1 : 0) + (abilityMapsDirty ? 1 : 0);

  function handleRevert(): void {
    if (status.kind !== 'ready') return;
    setShips(status.pack.ships);
    setAbilityMaps(status.pack.abilityMaps);
    setShipsDirty(false);
    setAbilityMapsDirty(false);
    setDirty({});
    setSaveError(null);
  }

  return (
    <PageShell
      title="Garage — Boat Shooter"
      token={token}
      onTokenChange={handleTokenChange}
      hasUnsaved={hasUnsaved}
      dirtySectionCount={dirtySectionCount}
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
          rail={<ShipList ships={ships} selectedId={selectedId} onSelect={setSelectedId} />}
          main={
            status.kind === 'ready' && abilityMaps && selected ? (
              <ShipDetail
                ship={selected}
                sprites={status.pack.sprites}
                abilityMaps={abilityMaps}
                dirtyKeys={dirty[selected.id] ?? new Set<string>()}
                onShipChange={handleShipChange}
                onAbilityMapsChange={handleAbilityMapsChange}
                refetchContent={reload}
              />
            ) : status.kind === 'ready' ? (
              <div className="flex-1 flex items-center justify-center text-sea-400 text-sm">
                Select a ship from the left rail.
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
