import type {
  AbilityMaps,
  PassiveId,
  ShipAbilityMap,
  ShipId,
  WeaponId,
} from '@bilko/boat-shooter-schema';
import { PASSIVE_IDS, WEAPON_IDS } from './constants';

interface Props {
  shipId: ShipId;
  abilityMaps: AbilityMaps;
  onChange: (next: AbilityMaps) => void;
}

function findShip(maps: AbilityMaps, shipId: ShipId): ShipAbilityMap {
  const found = maps.ships.find((s) => s.shipId === shipId);
  if (found) return found;
  // Default-create a wildcard map so editing a ship that has no entry yet works.
  return { shipId, allowedWeapons: '*', allowedPassives: '*' };
}

function replaceShip(maps: AbilityMaps, next: ShipAbilityMap): AbilityMaps {
  const exists = maps.ships.some((s) => s.shipId === next.shipId);
  const ships = exists
    ? maps.ships.map((s) => (s.shipId === next.shipId ? next : s))
    : [...maps.ships, next];
  return { ...maps, ships };
}

export function CompatibilityGrid({ shipId, abilityMaps, onChange }: Props): JSX.Element {
  const ship = findShip(abilityMaps, shipId);
  const weaponsWild = ship.allowedWeapons === '*';
  const passivesWild = ship.allowedPassives === '*';
  const weaponSet: Set<WeaponId> = weaponsWild
    ? new Set<WeaponId>(WEAPON_IDS)
    : new Set<WeaponId>(ship.allowedWeapons as ReadonlyArray<WeaponId>);
  const passiveSet: Set<PassiveId> = passivesWild
    ? new Set<PassiveId>(PASSIVE_IDS)
    : new Set<PassiveId>(ship.allowedPassives as ReadonlyArray<PassiveId>);

  function toggleWeapon(id: WeaponId, checked: boolean): void {
    if (weaponsWild) return;
    const next = new Set(weaponSet);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(replaceShip(abilityMaps, {
      ...ship,
      allowedWeapons: WEAPON_IDS.filter((w) => next.has(w)),
    }));
  }

  function togglePassive(id: PassiveId, checked: boolean): void {
    if (passivesWild) return;
    const next = new Set(passiveSet);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(replaceShip(abilityMaps, {
      ...ship,
      allowedPassives: PASSIVE_IDS.filter((p) => next.has(p)),
    }));
  }

  function customizeWeapons(): void {
    onChange(replaceShip(abilityMaps, { ...ship, allowedWeapons: [...WEAPON_IDS] }));
  }

  function customizePassives(): void {
    onChange(replaceShip(abilityMaps, { ...ship, allowedPassives: [...PASSIVE_IDS] }));
  }

  return (
    <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
      <h3 className="font-display text-lg text-gold-400 mb-3">Compatibility</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm uppercase tracking-wider text-sea-200">
              Weapons {weaponsWild && <span className="text-sea-400">(all = *)</span>}
            </h4>
            {weaponsWild && (
              <button
                type="button"
                onClick={customizeWeapons}
                className="text-xs px-2 py-1 rounded border border-sea-600 text-sea-200 hover:border-gold-500 hover:text-gold-400"
              >
                Customize
              </button>
            )}
          </div>
          <div className="space-y-1">
            {WEAPON_IDS.map((id) => (
              <label
                key={id}
                className={`flex items-center gap-2 text-sm ${
                  weaponsWild ? 'text-sea-400' : 'text-sea-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={weaponSet.has(id)}
                  disabled={weaponsWild}
                  onChange={(e) => toggleWeapon(id, e.target.checked)}
                />
                <code>{id}</code>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm uppercase tracking-wider text-sea-200">
              Passives {passivesWild && <span className="text-sea-400">(all = *)</span>}
            </h4>
            {passivesWild && (
              <button
                type="button"
                onClick={customizePassives}
                className="text-xs px-2 py-1 rounded border border-sea-600 text-sea-200 hover:border-gold-500 hover:text-gold-400"
              >
                Customize
              </button>
            )}
          </div>
          <div className="space-y-1">
            {PASSIVE_IDS.map((id) => (
              <label
                key={id}
                className={`flex items-center gap-2 text-sm ${
                  passivesWild ? 'text-sea-400' : 'text-sea-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={passiveSet.has(id)}
                  disabled={passivesWild}
                  onChange={(e) => togglePassive(id, e.target.checked)}
                />
                <code>{id}</code>
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
