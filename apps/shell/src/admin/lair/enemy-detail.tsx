import type {
  EnemyAbilityMap,
  EnemySpec,
  ShipSpec,
  SpriteManifest,
} from '@bilko/boat-shooter-schema';
import { SpriteCard } from '../garage/sprite-card';
import { AttackList } from './attack-list';
import { DropsForm } from './drops-form';
import { EnemyStatsForm } from './enemy-stats-form';

interface Props {
  enemy: EnemySpec;
  sprites: SpriteManifest;
  abilityMap: EnemyAbilityMap;
  dirtyKeys: ReadonlySet<string>;
  onEnemyChange: (next: EnemySpec) => void;
  onAbilityMapChange: (next: EnemyAbilityMap) => void;
  refetchContent?: () => void;
}

export function EnemyDetail({
  enemy,
  sprites,
  abilityMap,
  dirtyKeys,
  onEnemyChange,
  onAbilityMapChange,
  refetchContent,
}: Props): JSX.Element {
  // SpriteCard reads `ship.id` + `ship.displayName` (for the alt text of the
  // big thumb). For an enemy we have no ShipSpec, so we satisfy the structural
  // type with the two fields the card actually touches; `spriteId` overrides
  // the sprite key the card pulls from the server.
  const cardShip: Pick<ShipSpec, 'id' | 'displayName'> = {
    id: enemy.id as unknown as ShipSpec['id'],
    displayName: enemy.id,
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <header className="space-y-2">
        <h2 className="font-display text-3xl text-gold-400">{enemy.id}</h2>
        <code className="text-xs text-sea-400">
          {enemy.kind} · {enemy.element}
        </code>
      </header>

      <EnemyStatsForm enemy={enemy} dirtyKeys={dirtyKeys} onChange={onEnemyChange} />
      <DropsForm enemy={enemy} dirtyKeys={dirtyKeys} onChange={onEnemyChange} />
      <SpriteCard
        ship={cardShip as ShipSpec}
        sprites={sprites}
        spriteId={enemy.id}
        {...(refetchContent ? { refetchContent } : {})}
      />
      <AttackList enemyId={enemy.id} abilityMap={abilityMap} onChange={onAbilityMapChange} />
    </div>
  );
}
