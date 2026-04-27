import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../design/Icon';

type Mode = 'player' | 'admin';

interface NavItemDef { id: string; label: string; icon: IconName; path: string }

const PLAYER_ITEMS: NavItemDef[] = [
  { id: 'home',         label: 'Home',         icon: 'home',    path: '/' },
  { id: 'campaign',     label: 'Campaign',     icon: 'compass', path: '/campaign' },
  { id: 'shipyard',     label: 'Shipyard',     icon: 'anchor',  path: '/shipyard' },
  { id: 'meta',         label: 'Meta Shop',    icon: 'gem',     path: '/meta/boat-shooter' },
  { id: 'encyclopedia', label: 'Encyclopedia', icon: 'book',    path: '/encyclopedia' },
  { id: 'leaderboards', label: 'Leaderboards', icon: 'trophy',  path: '/leaderboards' },
  { id: 'profile',      label: 'Profile',      icon: 'user',    path: '/profile' },
  { id: 'settings',     label: 'Settings',     icon: 'gear',    path: '/settings' },
];

const ADMIN_ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home',    path: '/admin' },
  { id: 'ships',     label: 'Ships',     icon: 'anchor',  path: '/admin/boat-shooter/garage' },
  { id: 'enemies',   label: 'Enemies',   icon: 'flame',   path: '/admin/boat-shooter/enemy-lair' },
  { id: 'weapons',   label: 'Weapons',   icon: 'bolt',    path: '/admin/boat-shooter/abilities' },
  { id: 'stages',    label: 'Stages',    icon: 'compass', path: '/admin/boat-shooter/levels' },
  { id: 'economy',   label: 'Economy',   icon: 'gem',     path: '/admin/boat-shooter/environments' },
  { id: 'publish',   label: 'Workflow',  icon: 'book',    path: '/admin/publish' },
];

interface CurrencyState { gems: number; mapFragments: number; rank: number; cleared: number }

export function Sidebar({ mode, currency }: { mode: Mode; currency: CurrencyState }): JSX.Element {
  const items = mode === 'admin' ? ADMIN_ITEMS : PLAYER_ITEMS;
  const isAdmin = mode === 'admin';
  const isNarrow = useNarrowQuery();

  if (isNarrow && mode === 'player') {
    return <BottomDock items={PLAYER_ITEMS.filter(i => ['home','campaign','encyclopedia','profile','settings'].includes(i.id))}/>;
  }

  return (
    <aside style={{
      background: isAdmin ? '#101a23' : 'var(--card)',
      color: isAdmin ? '#dde6ee' : 'var(--ink)',
      borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 16px',
      overflow: 'hidden',
    }}>
      <Wordmark isAdmin={isAdmin}/>
      <AppSwitcher isAdmin={isAdmin}/>

      {isAdmin
        ? <AdminBadge />
        : <PlayerCard currency={currency}/>}

      <div className="mono" style={{
        fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase',
        color: isAdmin ? 'rgba(255,255,255,.4)' : 'var(--ink-mute)',
        padding: '4px 8px', marginBottom: 6,
      }}>
        {isAdmin ? 'Configuration' : 'Game'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {items.map((i) => (
          <NavLink
            key={i.id}
            to={i.path}
            end={i.path === '/' || i.path === '/admin'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 12px', borderRadius: 10, border: 'none',
              background: isActive
                ? (isAdmin ? 'var(--gold-500)' : 'var(--ink)')
                : 'transparent',
              color: isActive
                ? (isAdmin ? '#101a23' : '#fff')
                : (isAdmin ? 'rgba(255,255,255,.78)' : 'var(--ink-soft)'),
              textDecoration: 'none',
              fontSize: 14, fontWeight: 600, transition: 'background .15s',
            })}
          >
            <Icon name={i.icon} size={18}/>
            {i.label}
          </NavLink>
        ))}
      </div>

      <div style={{ flex: 1 }}/>

      <div style={{
        padding: '12px 14px', borderRadius: 12,
        background: isAdmin ? 'rgba(255,255,255,.04)' : 'var(--card-2)',
        border: '1px dashed ' + (isAdmin ? 'rgba(255,255,255,.12)' : 'var(--line)'),
        fontSize: 11, lineHeight: 1.45,
        color: isAdmin ? 'rgba(255,255,255,.6)' : 'var(--ink-mute)',
      }}>
        {isAdmin ? (
          <>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4 }}>Admin app</div>
            Internal tool. Not seen by players. Can also run standalone.
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>Family-friendly</div>
            ESRB E · PEGI 7 · No ads, no purchases.
          </>
        )}
      </div>
    </aside>
  );
}

function Wordmark({ isAdmin }: { isAdmin: boolean }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 18px' }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: isAdmin ? 'var(--gold-500)' : 'var(--ink)',
        color: isAdmin ? '#101a23' : 'var(--gold-400)',
        display: 'grid', placeItems: 'center',
        fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 22, letterSpacing: '-0.04em',
      }}>B</div>
      <div>
        <div className="display" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.1, color: isAdmin ? '#fff' : 'var(--ink)' }}>Bilko</div>
        <div className="mono" style={{
          fontSize: 9.5, letterSpacing: '.12em',
          color: isAdmin ? 'rgba(255,255,255,.5)' : 'var(--ink-mute)', textTransform: 'uppercase',
        }}>
          Game Academy
        </div>
      </div>
    </div>
  );
}

/** Admin half is dev-only — production renders just the Player chip. */
const ADMIN_ENABLED = import.meta.env.DEV;

function AppSwitcher({ isAdmin }: { isAdmin: boolean }): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  if (!ADMIN_ENABLED) return null;
  return (
    <div style={{
      padding: 4, borderRadius: 12,
      background: isAdmin ? 'rgba(0,0,0,.3)' : 'var(--card-2)',
      border: '1px solid ' + (isAdmin ? 'rgba(255,255,255,.08)' : 'var(--line)'),
      display: 'flex', gap: 2, marginBottom: 14,
    }}>
      <SwitcherButton
        active={!isAdmin}
        onClick={() => navigate('/')}
        label="Player" sub="Game" icon="play" accent="#1a2733"/>
      <SwitcherButton
        active={isAdmin}
        onClick={() => navigate('/admin')}
        label="Admin" sub="Local" icon="gear" accent="var(--gold-500)"
        adminMode={isAdmin}/>
    </div>
  );
  void location;
}

function SwitcherButton({
  active, onClick, label, sub, icon, accent, adminMode,
}: {
  active: boolean; onClick: () => void; label: string; sub: string;
  icon: IconName; accent: string; adminMode?: boolean;
}): JSX.Element {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderRadius: 9, cursor: 'pointer', border: 'none',
      background: active ? accent : 'transparent',
      color: active ? (label === 'Admin' ? '#101a23' : '#fff') : (adminMode ? 'rgba(255,255,255,.6)' : 'var(--ink-mute)'),
      transition: 'background .15s',
      textAlign: 'left',
    }}>
      <Icon name={icon} size={14}/>
      <div style={{ lineHeight: 1.1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
        <div className="mono" style={{ fontSize: 9, opacity: .8, textTransform: 'uppercase', letterSpacing: '.08em' }}>{sub}</div>
      </div>
    </button>
  );
}

function PlayerCard({ currency }: { currency: CurrencyState }): JSX.Element {
  return (
    <div className="card" style={{
      padding: 12, marginBottom: 16, marginTop: 4,
      borderRadius: 14, background: 'var(--card-2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 999,
          background: 'linear-gradient(140deg, var(--gold-400), var(--gold-600))',
          color: 'var(--d-sea-900)',
          display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14,
        }}>YO</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>Captain You</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)' }}>
            Rank {currency.rank} · {currency.cleared}/15 stages
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <CurrencyChip icon="gem" value={currency.gems}        label="Gems"/>
        <CurrencyChip icon="map" value={currency.mapFragments} label="Maps"/>
      </div>
    </div>
  );
}

function CurrencyChip({ icon, value, label }: { icon: IconName; value: number; label: string }): JSX.Element {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 8px', borderRadius: 8,
      background: 'var(--card)', border: '1px solid var(--line)',
    }}>
      <Icon name={icon} size={14} style={{ color: 'var(--gold-600)' }}/>
      <div style={{ lineHeight: 1, minWidth: 0 }}>
        <div className="num" style={{ fontWeight: 700, fontSize: 13 }}>{value}</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      </div>
    </div>
  );
}

function AdminBadge(): JSX.Element {
  return (
    <div style={{
      padding: 12, marginBottom: 16, marginTop: 4,
      borderRadius: 14, background: 'rgba(255,255,255,.04)',
      border: '1px solid rgba(255,255,255,.08)',
    }}>
      <div className="mono" style={{
        fontSize: 9, letterSpacing: '.12em',
        color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', marginBottom: 4,
      }}>
        Signed in as
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>bilko-eng</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>Admin · full access</div>
    </div>
  );
}

function BottomDock({ items }: { items: NavItemDef[] }): JSX.Element {
  return (
    <nav style={{
      gridColumn: '1 / -1',
      display: 'flex', justifyContent: 'space-around',
      background: 'var(--card)', borderTop: '1px solid var(--line)',
      padding: '8px 6px',
    }}>
      {items.map((i) => (
        <NavLink
          key={i.id}
          to={i.path}
          end={i.path === '/'}
          style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '8px 4px', background: 'transparent', border: 'none',
            color: isActive ? 'var(--ink)' : 'var(--ink-mute)',
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em',
            textDecoration: 'none',
          })}
        >
          <Icon name={i.icon} size={22}/>
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}

function useNarrowQuery(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 880px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 880px)');
    const handler = (e: MediaQueryListEvent): void => setNarrow(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return useMemo(() => narrow, [narrow]);
}
