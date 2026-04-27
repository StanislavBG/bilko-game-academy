import { useState } from 'react';
import type { ShipSpec, SpriteManifest } from '@bilko/boat-shooter-schema';
import { spriteUrl } from './api-client';
import { SpriteWidget } from './sprite-widget';

interface Props {
  ship: ShipSpec;
  sprites: SpriteManifest;
  refetchContent?: () => void;
  /** Override the sprite id — defaults to `player-<shipId>`. The Lair passes
   *  the bare enemy id so the card can be reused without forking. */
  spriteId?: string;
}

export function SpriteCard({ ship, sprites, refetchContent, spriteId }: Props): JSX.Element {
  const id = spriteId ?? `player-${ship.id}`;
  const [open, setOpen] = useState(false);
  const [thumbUrl, setThumbUrl] = useState(() => spriteUrl(id));
  const manifestPrompt = sprites.entries.find((e) => e.id === id)?.prompt ?? '';

  return (
    <section className="rounded-lg border border-sea-700 bg-sea-900/60 p-4">
      <h3 className="font-display text-lg text-gold-400 mb-3">Sprite</h3>
      <div className="flex items-start gap-4">
        <img
          src={thumbUrl}
          alt={ship.displayName}
          width={240}
          height={240}
          className="w-60 h-60 object-contain bg-sea-950 rounded border border-sea-700"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = '0.2';
          }}
        />
        <div className="flex-1 space-y-3">
          <div className="text-xs text-sea-300">
            id: <code className="text-sea-100">{id}</code>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="px-4 py-2 rounded border border-gold-600 bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 text-sm uppercase tracking-wider"
          >
            {open ? 'Close Sprite Widget' : 'Open Sprite Widget'}
          </button>
        </div>
      </div>
      {open && (
        <SpriteWidget
          spriteId={id}
          manifestPrompt={manifestPrompt}
          onClose={() => setOpen(false)}
          onSaved={(url) => setThumbUrl(url)}
          {...(refetchContent ? { refetchContent } : {})}
        />
      )}
    </section>
  );
}
