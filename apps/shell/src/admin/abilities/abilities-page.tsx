import { useEffect, useMemo, useState } from 'react';
import type { PassiveSpec, WeaponSpec } from '@bilko/boat-shooter-schema';
import { getStoredToken, putSection, setStoredToken } from '../garage/api-client';
import { PageBody, PageShell } from '../garage/_shared/page-shell';
import { useContentPack } from '../garage/_shared/api-state';
import { AbilityList, type AbilityKind } from './ability-list';
import { AbilityDetail } from './ability-detail';

type Spec = WeaponSpec | PassiveSpec;
type DirtyMap = Record<string, ReadonlySet<string>>;

const SCALAR_KEYS: ReadonlyArray<keyof Spec> = [
  'displayName', 'taglineShort', 'element',
];

function diffAbility(prev: Spec, next: Spec): Set<string> {
  const out = new Set<string>();
  for (const k of SCALAR_KEYS) {
    if (prev[k] !== next[k]) out.add(String(k));
  }
  if ('attackTier' in prev && 'attackTier' in next && prev.attackTier !== next.attackTier) {
    out.add('attackTier');
  }
  if ('defenseTier' in prev && 'defenseTier' in next && prev.defenseTier !== next.defenseTier) {
    out.add('defenseTier');
  }
  if (JSON.stringify(prev.curves) !== JSON.stringify(next.curves)) out.add('curves');
  return out;
}

export function AbilitiesPage(): JSX.Element {
  const { status, reload, setPack } = useContentPack();
  const [kind, setKind] = useState<AbilityKind>('weapons');
  const [weapons, setWeapons] = useState<ReadonlyArray<WeaponSpec>>([]);
  const [passives, setPassives] = useState<ReadonlyArray<PassiveSpec>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [token, setToken] = useState<string>(() => getStoredToken());
  const [dirty, setDirty] = useState<DirtyMap>({});
  const [weaponsDirty, setWeaponsDirty] = useState(false);
  const [passivesDirty, setPassivesDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: 'success'; message: string } | null>(null);

  useEffect(() => {
    if (status.kind !== 'ready') return;
    setWeapons(status.pack.weapons);
    setPassives(status.pack.passives);
    setSelectedId((cur) => cur ?? status.pack.weapons[0]?.id ?? null);
    setDirty({});
    setWeaponsDirty(false);
    setPassivesDirty(false);
  }, [status]);

  // When section toggles, jump to the first item of that section.
  useEffect(() => {
    const list = kind === 'weapons' ? weapons : passives;
    if (list.length > 0 && !list.find((x) => x.id === selectedId)) {
      setSelectedId(list[0]!.id);
    }
  }, [kind, weapons, passives, selectedId]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    if (kind === 'weapons') return weapons.find((w) => w.id === selectedId) ?? null;
    return passives.find((p) => p.id === selectedId) ?? null;
  }, [kind, weapons, passives, selectedId]);

  function handleAbilityChange(next: Spec): void {
    if (status.kind !== 'ready') return;
    if (kind === 'weapons') {
      const original = status.pack.weapons.find((w) => w.id === next.id);
      setWeapons((cur) => cur.map((w) => (w.id === next.id ? (next as WeaponSpec) : w)));
      setWeaponsDirty(true);
      if (original) setDirty((d) => ({ ...d, [next.id]: diffAbility(original, next) }));
    } else {
      const original = status.pack.passives.find((p) => p.id === next.id);
      setPassives((cur) => cur.map((p) => (p.id === next.id ? (next as PassiveSpec) : p)));
      setPassivesDirty(true);
      if (original) setDirty((d) => ({ ...d, [next.id]: diffAbility(original, next) }));
    }
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
      if (weaponsDirty) await putSection('weapons', weapons);
      if (passivesDirty) await putSection('passives', passives);
      if (status.kind === 'ready') {
        setPack({ ...status.pack, weapons, passives });
      }
      setWeaponsDirty(false);
      setPassivesDirty(false);
      setDirty({});
      setFlash({ kind: 'success', message: 'Saved.' });
      window.setTimeout(() => setFlash(null), 1800);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const hasUnsaved = weaponsDirty || passivesDirty;

  return (
    <PageShell
      title="Abilities — Boat Shooter"
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
          rail={
            <div className="flex flex-col w-72 shrink-0 border-r border-sea-700 bg-sea-900/60">
              <div className="flex border-b border-sea-700">
                {(['weapons', 'passives'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`flex-1 px-3 py-2 text-xs uppercase tracking-wider transition-colors ${
                      kind === k
                        ? 'bg-sea-800 text-gold-400'
                        : 'text-sea-300 hover:bg-sea-800/40'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                <AbilityList
                  kind={kind}
                  weapons={weapons}
                  passives={passives}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
              <div className="px-3 py-2 border-t border-sea-700 text-[10px] italic text-sea-500">
                Enemy attacks live in the Enemy Lair tab.
              </div>
            </div>
          }
          main={
            status.kind === 'ready' && selected ? (
              <AbilityDetail
                kind={kind}
                ability={selected}
                sprites={status.pack.sprites}
                refetchContent={reload}
                dirtyKeys={dirty[selected.id] ?? new Set<string>()}
                onChange={handleAbilityChange}
              />
            ) : status.kind === 'ready' ? (
              <div className="flex-1 flex items-center justify-center text-sea-400 text-sm">
                Select a {kind === 'weapons' ? 'weapon' : 'passive'} from the left rail.
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
