// Left rail (Player) + admin sidebar + App Switcher.
function Sidebar({ mode, setMode, route, setRoute, adminRoute, setAdminRoute, state }) {
  const playerItems = [
    { id: 'home',         label: 'Home',         icon: 'home' },
    { id: 'campaign',     label: 'Campaign',     icon: 'compass' },
    { id: 'shipyard',     label: 'Shipyard',     icon: 'anchor' },
    { id: 'meta',         label: 'Meta Shop',    icon: 'gem' },
    { id: 'encyclopedia', label: 'Encyclopedia', icon: 'book' },
    { id: 'leaderboards', label: 'Leaderboards', icon: 'trophy' },
    { id: 'profile',      label: 'Profile',      icon: 'user' },
    { id: 'settings',     label: 'Settings',     icon: 'gear' },
  ];
  const adminItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'ships',     label: 'Ships',     icon: 'anchor' },
    { id: 'enemies',   label: 'Enemies',   icon: 'flame' },
    { id: 'weapons',   label: 'Weapons',   icon: 'flame' },
    { id: 'stages',    label: 'Stages',    icon: 'compass' },
    { id: 'economy',   label: 'Economy',   icon: 'gem' },
    { id: 'publish',   label: 'Publish',   icon: 'rocket' },
  ];
  const items = mode === 'admin' ? adminItems : playerItems;
  const activeId = mode === 'admin' ? adminRoute : route;
  const setActive = mode === 'admin' ? setAdminRoute : setRoute;

  // narrow ⇒ bottom dock (Player only)
  const isNarrow = window.matchMedia('(max-width: 880px)').matches;

  if (isNarrow && mode === 'player') {
    const main = playerItems.filter(i => ['home','campaign','encyclopedia','profile','settings'].includes(i.id));
    return (
      <nav style={{
        gridColumn: '1 / -1',
        display: 'flex', justifyContent: 'space-around',
        background: 'var(--card)', borderTop: '1px solid var(--line)',
        padding: '8px 6px',
      }}>
        {main.map(i => (
          <button key={i.id} onClick={() => setActive(i.id)} style={{
            flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            padding: '8px 4px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: route === i.id ? 'var(--ink)' : 'var(--ink-mute)',
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em',
          }}>
            <Icon name={i.icon} size={22}/>{i.label}
          </button>
        ))}
      </nav>
    );
  }

  const isAdmin = mode === 'admin';

  return (
    <aside style={{
      background: isAdmin ? '#101a23' : 'var(--card)',
      color: isAdmin ? '#dde6ee' : 'var(--ink)',
      borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 16px',
    }}>
      {/* Wordmark */}
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
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.12em',
            color: isAdmin ? 'rgba(255,255,255,.5)' : 'var(--ink-mute)', textTransform: 'uppercase' }}>
            Game Academy
          </div>
        </div>
      </div>

      {/* App Switcher — the headline element. Two clear apps. */}
      <AppSwitcher mode={mode} setMode={setMode}/>

      {/* Player chip OR Admin user badge */}
      {isAdmin ? (
        <div style={{
          padding: 12, marginBottom: 16, marginTop: 4,
          borderRadius: 14, background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.08)',
        }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '.12em', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', marginBottom: 4 }}>
            Signed in as
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>bilko-eng</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>Admin · full access</div>
        </div>
      ) : (
        <div className="card" style={{
          padding: 12, marginBottom: 16, marginTop: 4,
          borderRadius: 14, background: 'var(--card-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 999,
              background: 'linear-gradient(140deg, var(--gold-400), var(--gold-600))',
              color: 'var(--sea-900)',
              display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14,
            }}>YO</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>Captain You</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)' }}>Rank 5 · {state.stagesCleared.length}/15 stages</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <CurrencyChip icon="gem"  value={state.gems}        label="Gems"/>
            <CurrencyChip icon="map"  value={state.mapFragments} label="Maps"/>
          </div>
        </div>
      )}

      {/* Section label */}
      <div className="mono" style={{
        fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase',
        color: isAdmin ? 'rgba(255,255,255,.4)' : 'var(--ink-mute)',
        padding: '4px 8px', marginBottom: 6,
      }}>
        {isAdmin ? 'Configuration' : 'Game'}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(i => {
          const active = activeId === i.id;
          return (
            <button key={i.id} onClick={() => setActive(i.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 12px', borderRadius: 10, border: 'none',
              background: active
                ? (isAdmin ? 'var(--gold-500)' : 'var(--ink)')
                : 'transparent',
              color: active
                ? (isAdmin ? '#101a23' : '#fff')
                : (isAdmin ? 'rgba(255,255,255,.78)' : 'var(--ink-soft)'),
              cursor: 'pointer', textAlign: 'left',
              fontSize: 14, fontWeight: 600, transition: 'background .15s',
            }}
            onMouseEnter={(e)=> { if(!active) e.currentTarget.style.background = isAdmin ? 'rgba(255,255,255,.06)' : 'var(--card-2)'; }}
            onMouseLeave={(e)=> { if(!active) e.currentTarget.style.background = 'transparent'; }}>
              <Icon name={i.icon} size={18}/>
              {i.label}
            </button>
          );
        })}
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

function AppSwitcher({ mode, setMode }) {
  return (
    <div style={{
      padding: 4,
      borderRadius: 12,
      background: mode === 'admin' ? 'rgba(0,0,0,.3)' : 'var(--card-2)',
      border: '1px solid ' + (mode === 'admin' ? 'rgba(255,255,255,.08)' : 'var(--line)'),
      display: 'flex', gap: 2,
      marginBottom: 14,
    }}>
      <SwitcherButton
        active={mode === 'player'}
        onClick={() => setMode('player')}
        label="Player"
        sub="Game"
        icon="play"
        accent="#1a2733"/>
      <SwitcherButton
        active={mode === 'admin'}
        onClick={() => setMode('admin')}
        label="Admin"
        sub="Configs"
        icon="gear"
        accent="var(--gold-500)"
        adminMode={mode === 'admin'}/>
    </div>
  );
}

function SwitcherButton({ active, onClick, label, sub, icon, accent, adminMode }) {
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

function CurrencyChip({ icon, value, label }) {
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

window.Sidebar = Sidebar;
