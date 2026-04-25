import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function ShellFrame(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full bg-sea-800 text-sea-50">
      <header className="px-6 py-4 border-b border-sea-700 bg-sea-900">
        <h1 className="font-display text-2xl tracking-wide text-gold-400">{t('app.title')}</h1>
      </header>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <nav className="flex justify-around border-t border-sea-700 bg-sea-900 px-4 py-3">
        <NavItem to="/" label={t('nav.home')} />
        <NavItem to="/leaderboards" label={t('nav.leaderboards')} />
        <NavItem to="/profile" label={t('nav.profile')} />
        <NavItem to="/settings" label={t('nav.settings')} />
      </nav>
    </div>
  );
}

function NavItem({ to, label }: { to: string; label: string }): JSX.Element {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `text-sm uppercase tracking-wider font-sans px-3 py-2 rounded transition-colors ${
          isActive ? 'text-gold-400' : 'text-sea-200 hover:text-sea-50'
        }`
      }
    >
      {label}
    </NavLink>
  );
}
