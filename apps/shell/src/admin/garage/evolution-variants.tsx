import type { ShipSpec, SpriteManifest } from '@bilko/boat-shooter-schema';
import { spriteUrl } from './api-client';

interface Props {
  ship: ShipSpec;
  sprites: SpriteManifest;
}

export function EvolutionVariants({ ship, sprites }: Props): JSX.Element {
  const prefix = `player-${ship.id}`;
  // O(n) over the manifest — entries is small (low hundreds at most).
  const variants = sprites.entries.filter((e) => e.id.startsWith(prefix));

  return (
    <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg text-gold-400">Evolution Variants</h3>
        <button
          type="button"
          onClick={() => alert('next phase')}
          className="px-3 py-1 rounded border border-sea-600 text-sea-200 hover:border-gold-500 hover:text-gold-400 text-xs uppercase tracking-wider"
        >
          + Add variant
        </button>
      </div>
      {variants.length === 0 ? (
        <p className="text-xs text-sea-400 italic">
          No manifest entries match <code>{prefix}*</code>.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <div
              key={v.id}
              className="flex flex-col items-center gap-1 p-2 rounded border border-sea-700 bg-sea-950"
              title={v.id}
            >
              <img
                src={spriteUrl(v.id)}
                alt={v.id}
                width={64}
                height={64}
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = '0.2';
                }}
              />
              <span className="text-[10px] text-sea-300 max-w-[80px] truncate">{v.id}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
