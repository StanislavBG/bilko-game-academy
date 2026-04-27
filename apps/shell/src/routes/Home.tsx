import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type AgeBand = 'family' | 'adventure' | 'challenge';

interface GameTile {
  id: string;
  title: string;
  tagline: string;
  ageBand: AgeBand;
  available: boolean;
  emoji: string;
  /** Hub route when available; landing fallback when not. */
  hub?: string;
}

const AGE_BANDS: ReadonlyArray<{ id: AgeBand; title: string; subtitle: string }> = [
  { id: 'family', title: 'Family', subtitle: 'Ages 6+' },
  { id: 'adventure', title: 'Adventure', subtitle: 'Ages 9+' },
  { id: 'challenge', title: 'Challenge', subtitle: 'Teens & Up' },
];

const GAMES: ReadonlyArray<GameTile> = [
  { id: 'sky-pets', title: 'Sky Pets', tagline: 'Coming soon.', ageBand: 'family', available: false, emoji: '🐣' },
  { id: 'word-canyon', title: 'Word Canyon', tagline: 'Coming soon.', ageBand: 'family', available: false, emoji: '🪨' },
  { id: 'boat-shooter', title: 'Boat Shooter', tagline: 'Sail, shoot, stack weapons, survive.', ageBand: 'adventure', available: true, emoji: '⚓', hub: '/games/boat-shooter' },
  { id: 'star-runners', title: 'Star Runners', tagline: 'Coming soon.', ageBand: 'adventure', available: false, emoji: '🌠' },
  { id: 'mech-arena', title: 'Mech Arena', tagline: 'Coming soon.', ageBand: 'challenge', available: false, emoji: '🤖' },
  { id: 'shadow-deck', title: 'Shadow Deck', tagline: 'Coming soon.', ageBand: 'challenge', available: false, emoji: '🃏' },
];

export function Home(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden">
      <div className="text-center mb-3 md:mb-5">
        <p className="font-display text-base md:text-lg text-sea-200">{t('home.tagline')}</p>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-3 md:gap-5 min-h-0">
        {AGE_BANDS.map((band) => {
          const games = GAMES.filter((g) => g.ageBand === band.id);
          return (
            <section key={band.id} className="flex flex-col min-h-0">
              <header className="text-center mb-2">
                <h2 className="font-display text-xl md:text-2xl text-gold-400">{band.title}</h2>
                <p className="text-[10px] md:text-xs uppercase tracking-wider text-sea-400">
                  {band.subtitle}
                </p>
              </header>
              <div className="flex-1 grid grid-rows-2 gap-2 md:gap-3 min-h-0">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: GameTile }): JSX.Element {
  const { t } = useTranslation();

  if (!game.available) {
    return (
      <div className="rounded-lg bg-sea-900 border border-sea-700 flex flex-col items-center justify-center text-sea-500 p-3 min-h-0">
        <span className="text-3xl md:text-5xl mb-1 opacity-40">{game.emoji}</span>
        <span className="font-display text-sm md:text-base">{game.title}</span>
        <span className="text-[10px] uppercase tracking-wider mt-0.5">
          {t('home.comingSoon')}
        </span>
      </div>
    );
  }

  const target = game.hub ?? `/game/${game.id}`;
  return (
    <Link
      to={target}
      className="rounded-lg bg-gradient-to-br from-sea-700 to-sea-900 border border-sea-600 hover:border-gold-500 transition-colors flex flex-col justify-between p-3 md:p-4 overflow-hidden relative group min-h-0"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(224,176,99,0.15),transparent_70%)]" />
      <div className="relative flex items-start gap-2">
        <span className="text-3xl md:text-4xl">{game.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base md:text-xl text-gold-400 truncate">{game.title}</h3>
          <p className="text-[11px] md:text-xs text-sea-200 line-clamp-2">{game.tagline}</p>
        </div>
      </div>
      <span className="relative text-[10px] md:text-xs uppercase tracking-wider font-sans text-sea-300 group-hover:text-gold-400 self-end">
        Enter →
      </span>
    </Link>
  );
}
