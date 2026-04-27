// Encyclopedia — player-facing browsable catalog of enemies, weapons, bosses.
// Read-only view of the Admin-configured data, presented as a friendly bestiary.
function Encyclopedia({ state }) {
  const [tab, setTab] = React.useState('enemies');
  const [selected, setSelected] = React.useState(null);

  const tabs = [
    { id: 'enemies', label: 'Enemies', count: ENEMIES.filter(e => !e.isBoss).length, icon: 'flame' },
    { id: 'bosses',  label: 'Bosses',  count: ENEMIES.filter(e => e.isBoss).length,  icon: 'trophy' },
    { id: 'weapons', label: 'Weapons', count: WEAPONS.length, icon: 'flame' },
    { id: 'ships',   label: 'Ships',   count: SHIPS.length,   icon: 'anchor' },
  ];

  let entries = [];
  if (tab === 'enemies') entries = ENEMIES.filter(e => !e.isBoss);
  if (tab === 'bosses')  entries = ENEMIES.filter(e => e.isBoss);
  if (tab === 'weapons') entries = WEAPONS;
  if (tab === 'ships')   entries = SHIPS;

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <PageHeader
        eyebrow="Boat Shooter"
        title="Encyclopedia"
        subtitle="Everything you've sailed past. Tap an entry to read more."
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id}
            onClick={() => { setTab(t.id); setSelected(null); }}
            className="card"
            style={{
              padding: '10px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              background: tab === t.id ? 'var(--ink)' : 'var(--card)',
              color: tab === t.id ? '#fff' : 'var(--ink)',
              borderColor: tab === t.id ? 'var(--ink)' : 'var(--line)',
            }}>
            <Icon name={t.icon} size={14}/>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</span>
            <span className="num" style={{
              fontSize: 11, padding: '2px 7px', borderRadius: 999,
              background: tab === t.id ? 'rgba(255,255,255,.15)' : 'var(--card-2)',
              color: tab === t.id ? 'rgba(255,255,255,.85)' : 'var(--ink-mute)',
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {entries.map(e => {
          const seen = state.encyclopediaSeen?.includes(e.id);
          const isShip = tab === 'ships';
          const isWeapon = tab === 'weapons';
          return (
            <button key={e.id} className="card"
              onClick={() => setSelected(e)}
              style={{
                padding: 0, cursor: 'pointer', textAlign: 'left',
                overflow: 'hidden',
              }}
              onMouseEnter={(ev) => ev.currentTarget.style.borderColor = 'var(--ink)'}
              onMouseLeave={(ev) => ev.currentTarget.style.borderColor = 'var(--line)'}>
              <ScenePlaceholder
                label={`${(isShip ? 'SHIP' : isWeapon ? 'WEAPON' : 'ENEMY')} · ${e.name.toUpperCase()}`}
                tone={e.isBoss ? 'lava' : isShip ? 'sea' : 'fog'}
                height={84}/>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{e.name}</div>
                  {e.isBoss && <Badge tone="warn">Boss</Badge>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>
                  {e.faction || e.kind || (isShip ? e.tagline : '')}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <EntryModal entry={selected} kind={tab} onClose={() => setSelected(null)}/>
      )}
    </div>
  );
}

function EntryModal({ entry, kind, onClose }) {
  const isShip = kind === 'ships';
  const isWeapon = kind === 'weapons';
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(12,37,49,.55)',
      display: 'grid', placeItems: 'center', padding: 24, zIndex: 200,
      animation: 'fadeUp .18s ease-out',
    }}>
      <div onClick={(e)=>e.stopPropagation()} className="card" style={{
        padding: 0, overflow: 'hidden', maxWidth: 560, width: '100%',
        boxShadow: 'var(--shadow-pop)',
      }}>
        <ScenePlaceholder
          label={`${(isShip ? 'SHIP' : isWeapon ? 'WEAPON' : 'ENEMY')} · ${entry.name.toUpperCase()}`}
          tone={entry.isBoss ? 'lava' : isShip ? 'sea' : 'fog'}
          height={180}/>
        <div style={{ padding: 28 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--ink-mute)', textTransform: 'uppercase', marginBottom: 6 }}>
            {entry.faction || entry.kind || 'Ship'}
          </div>
          <h2 className="display" style={{ fontSize: 32, fontWeight: 700, margin: 0, lineHeight: 1 }}>{entry.name}</h2>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 10, marginBottom: 18, lineHeight: 1.5 }}>
            {entry.blurb || entry.tagline}
          </p>
          {!isShip && !isWeapon && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <Stat2 label="HP"     value={entry.hp}/>
              <Stat2 label="Damage" value={entry.dmg}/>
              <Stat2 label="Speed"  value={entry.speed}/>
            </div>
          )}
          {isWeapon && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <Stat2 label="Base dmg" value={entry.base}/>
              <Stat2 label="Rate/s"   value={entry.rate}/>
              <Stat2 label="Type"     value={entry.kind}/>
            </div>
          )}
          {isShip && entry.stats && (
            <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
              {Object.entries(entry.stats).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 64, color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'capitalize' }}>{k}</span>
                  <div style={{ flex: 1, display: 'flex', gap: 3 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{
                        flex: 1, height: 6, borderRadius: 3,
                        background: i < v ? 'var(--ink)' : 'var(--bg-2)',
                        border: '1px solid var(--line)',
                      }}/>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat2({ label, value }) {
  return (
    <div style={{ padding: 10, background: 'var(--card-2)', borderRadius: 10, border: '1px solid var(--line)' }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '.1em', color: 'var(--ink-mute)', textTransform: 'uppercase' }}>{label}</div>
      <div className="num display" style={{ fontWeight: 700, fontSize: 17, marginTop: 2, textTransform: 'capitalize' }}>{value}</div>
    </div>
  );
}

window.Encyclopedia = Encyclopedia;
