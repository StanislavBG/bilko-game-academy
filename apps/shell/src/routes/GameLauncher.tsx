import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GameContext, GameEvent, GameInstance, GameModule } from '@bilko/game-sdk';
import { createEventBus } from '@bilko/game-sdk';
import { createGameSave, createLocalLeaderboard, readonlySettings } from '@bilko/platform-core';
import { AchievementToasts } from '../components/AchievementToast';

type Registry = Record<string, () => Promise<{ default: GameModule }>>;

// Lazy-import each game module so they're code-split and not loaded on the Home page.
const GAMES: Registry = {
  'boat-shooter': () => import('@bilko/boat-shooter'),
};

export function GameLauncher(): JSX.Element {
  const { gameId } = useParams<{ gameId: string }>();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<GameInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Shared event bus between game + shell so the shell can show toasts.
  const eventBus = useMemo(() => createEventBus<GameEvent>(), []);
  const eventSource = useMemo(
    () => ({
      subscribe(handler: (evt: { type: 'achievement'; id: string }) => void): () => void {
        return eventBus.on('achievement', handler);
      },
    }),
    [eventBus],
  );

  useEffect(() => {
    if (!gameId) return;
    const loader = GAMES[gameId];
    if (!loader) {
      setError(`Unknown game: ${gameId}`);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const mod = await loader();
        if (cancelled || !containerRef.current) return;

        const ctx: GameContext = {
          save: createGameSave(gameId),
          settings: readonlySettings(),
          controls: {
            steer: { kind: 'touch', region: 'whole' },
            fire: { kind: 'keyboard', keys: ['Space'] },
            special: { kind: 'keyboard', keys: ['Shift'] },
            boost: { kind: 'keyboard', keys: ['b'] },
            pause: { kind: 'keyboard', keys: ['Escape'] },
          },
          leaderboard: createLocalLeaderboard(gameId, 'guest'),
          events: eventBus,
          pause: () => instanceRef.current?.pause(),
          resume: () => instanceRef.current?.resume(),
        };

        instanceRef.current = mod.default.mount(containerRef.current, ctx);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      instanceRef.current?.unmount();
      instanceRef.current = null;
    };
  }, [gameId, eventBus]);

  return (
    <div className="game-canvas-host">
      <div ref={containerRef} className="w-full h-full" />
      <Link
        to="/"
        className="absolute top-4 left-4 text-sm text-sea-100 bg-sea-900/70 hover:bg-sea-900 px-3 py-1.5 rounded backdrop-blur"
      >
        ← {t('game.back')}
      </Link>
      <AchievementToasts eventSource={eventSource} />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-sea-900/90 text-red-300 p-8">
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}
    </div>
  );
}
