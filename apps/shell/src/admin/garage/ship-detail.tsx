import type {
  AbilityMaps,
  ShipSpec,
  SpriteManifest,
} from '@bilko/boat-shooter-schema';
import { CompatibilityGrid } from './compatibility-grid';
import { EvolutionVariants } from './evolution-variants';
import { SpriteCard } from './sprite-card';
import { StatsForm } from './stats-form';

interface Props {
  ship: ShipSpec;
  sprites: SpriteManifest;
  abilityMaps: AbilityMaps;
  dirtyKeys: ReadonlySet<string>;
  onShipChange: (next: ShipSpec) => void;
  onAbilityMapsChange: (next: AbilityMaps) => void;
  refetchContent?: () => void;
}

export function ShipDetail({
  ship,
  sprites,
  abilityMaps,
  dirtyKeys,
  onShipChange,
  onAbilityMapsChange,
  refetchContent,
}: Props): JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <header className="space-y-2">
        <input
          type="text"
          value={ship.displayName}
          onChange={(e) => onShipChange({ ...ship, displayName: e.target.value })}
          className="w-full bg-transparent border-b border-sea-700 focus:border-gold-500 focus:outline-none font-display text-3xl text-gold-400 pb-1"
        />
        <div className="flex items-center gap-3">
          <select
            value={ship.element}
            onChange={(e) =>
              onShipChange({ ...ship, element: e.target.value as ShipSpec['element'] })
            }
            className="bg-sea-950 border border-sea-700 rounded px-2 py-1 text-sm text-sea-100"
          >
            {(['fire', 'storm', 'frost', 'earth', 'shadow', 'physical', 'arcane', 'none'] as const).map(
              (el) => (
                <option key={el} value={el}>
                  {el}
                </option>
              ),
            )}
          </select>
          <code className="text-xs text-sea-400">{ship.id}</code>
        </div>
        <input
          type="text"
          value={ship.tagline}
          onChange={(e) => onShipChange({ ...ship, tagline: e.target.value })}
          placeholder="Tagline"
          className="w-full bg-transparent border-b border-sea-800 focus:border-gold-500 focus:outline-none text-sm italic text-sea-200 pb-1"
        />
      </header>

      <StatsForm ship={ship} dirtyKeys={dirtyKeys} onChange={onShipChange} />
      <SpriteCard
        ship={ship}
        sprites={sprites}
        {...(refetchContent ? { refetchContent } : {})}
      />
      <EvolutionVariants ship={ship} sprites={sprites} />
      <CompatibilityGrid
        shipId={ship.id}
        abilityMaps={abilityMaps}
        onChange={onAbilityMapsChange}
      />
    </div>
  );
}
