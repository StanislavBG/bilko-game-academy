import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GameContext, GameEvent, GameInstance, GameModule, LeaderboardAPI, LeaderboardEntry } from '@bilko/game-sdk';
import { createEventBus } from '@bilko/game-sdk';
import { createGameSave, createLocalLeaderboard, readonlySettings } from '@bilko/platform-core';
import { AchievementToasts } from '../components/AchievementToast';

const BILKO_HOST = 'https://bilko.run';

// Mapping from local game achievement IDs to server registry keys.
// Local IDs use kebab-case; server keys use snake_case.
const ACHIEVEMENT_MAP: Record<string, string> = {
  'first-blood': 'first_kill',
};

type Registry = Record<string, () => Promise<{ default: GameModule }>>;

// Lazy-import each game module so they're code-split and not loaded on the Home page.
const GAMES: Registry = {
  'boat-shooter': () => import('@bilko/boat-shooter'),
};

function createCloudLeaderboard(gameId: string, localBoard: LeaderboardAPI): LeaderboardAPI {
  return {
    async submit(entry: LeaderboardEntry): Promise<void> {
      await localBoard.submit(entry);
      // Fire-and-forget to cloud — don't block the game on network availability.
      void fetch(`${BILKO_HOST}/api/games/${gameId}/scores`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ score: entry.score, mode: entry.board }),
      }).catch(() => {/* silently ignore network errors */});
    },
    fetch: localBoard.fetch.bind(localBoard),
  };
}

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

  // Mirror achievement unlocks to the cloud. Maps local IDs → server keys.
  useEffect(() => {
    if (!gameId) return;
    return eventBus.on('achievement', (evt: { type: 'achievement'; id: string }) => {
      const serverKey = ACHIEVEMENT_MAP[evt.id];
      if (!serverKey) return;
      void fetch(`${BILKO_HOST}/api/games/${gameId}/unlock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: serverKey }),
      }).catch(() => {/* silently ignore network errors */});
    });
  }, [gameId, eventBus]);

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

        const local = createLocalLeaderboard(gameId, 'guest');
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
          leaderboard: createCloudLeaderboard(gameId, local),
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
      {error && <ErrorOverlay message={error}/>}
    </div>
  );
}

function ErrorOverlay({ message }: { message: string }): JSX.Element {
  // Most likely cause when the lazy game-module import fails on a returning
  // visitor: their service worker cached a previous build's bundle that
  // points at chunk filenames that no longer exist on disk. Reload =
  // recovery. The StaleBuildBanner also catches this globally; this is the
  // friendly in-place version for users who already nav'd into the game.
  const isChunkLoadError = /Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError/i.test(message);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-sea-900/95 text-sea-100 p-8">
      <div className="max-w-md text-center">
        <h2 className="font-display text-2xl text-gold-400 mb-3">
          {isChunkLoadError ? 'A new version is available' : 'Game failed to load'}
        </h2>
        <p className="text-sm text-sea-300 mb-5">
          {isChunkLoadError
            ? "The cached build doesn't match the current deploy. Reload to pick up the new code."
            : 'Something went wrong while loading the game module.'}
        </p>
        <pre className="whitespace-pre-wrap text-[11px] text-red-300 bg-sea-950 rounded p-3 mb-5 text-left max-h-32 overflow-auto">
          {message}
        </pre>
        <button
          type="button"
          onClick={async () => {
            try {
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister()));
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
            } finally {
              window.location.reload();
            }
          }}
          className="px-4 py-2 rounded bg-gold-500 text-sea-900 font-bold uppercase tracking-wider text-sm hover:bg-gold-400"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
