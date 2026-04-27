// Profile — stats, achievements, wardrobe + Shipyard (single-game ship roster).
function Profile({ state, setState, setRoute }) {
  const [tab, setTab] = React.useState('stats');
  const earned = ACHIEVEMENTS.filter(a => a.earned).length;
  const groups = [...new Set(ACHIEVEMENTS.map(a => a.group))];

  function setCosmetic(key, val) {
    setState(prev => ({ ...prev, cosmetics: { ...prev.cosmetics, [key]: val } }));
  }

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <PageHeader
        eyebrow="Captain You"
        title="Profile"
        subtitle="Track stats, earn achievements, customize your ship."
      />

      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line)', width: 'fit-content', marginBottom: 24 }}>
        {['stats','achievements','wardrobe'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t ? 'var(--ink)' : 'transparent',
            color: tab === t ? '#fff' : 'var(--ink-soft)',
            fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          <Stat label="Stages cleared" value={`${state.stagesCleared.length}/15`} icon="flag"/>
          <Stat label="Campaigns cleared" value={state.campaignsCleared} icon="trophy"/>
          <Stat label="NG+ runs" value={state.ngPlus} icon="sparkle"/>
          <Stat label="Lifetime coins" value={state.totalCoinsLifetime.toLocaleString()} icon="coin"/>
          <Stat label="Gems banked" value={state.gems} icon="gem"/>
          <Stat label="Achievements" value={`${earned}/${ACHIEVEMENTS.length}`} icon="star"/>
        </div>
      )}

      {tab === 'achievements' && (
        <div style={{ display: 'grid', gap: 24 }}>
          {groups.map(g => (
            <section key={g}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
                <h3 className="display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{g}</h3>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                  {ACHIEVEMENTS.filter(a => a.group === g && a.earned).length}/{ACHIEVEMENTS.filter(a => a.group === g).length}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {ACHIEVEMENTS.filter(a => a.group === g).map(a => (
                  <div key={a.id} className="card" style={{
                    padding: 14, opacity: a.earned ? 1 : .55,
                    borderColor: a.earned ? 'var(--gold-400)' : 'var(--line)',
                    background: a.earned ? '#fff8e6' : 'var(--card)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: a.earned ? 'var(--gold-500)' : 'var(--bg-2)',
                        color: a.earned ? '#fff' : 'var(--ink-mute)',
                        display: 'grid', placeItems: 'center',
                      }}>
                        <Icon name={a.earned ? 'trophy' : 'lock'} size={18}/>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>{a.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'wardrobe' && (
        <div style={{ display: 'grid', gap: 24 }}>
          <Wardrobe label="Hull" current={state.cosmetics.hull} options={HULL_VARIANTS} onPick={(v) => setCosmetic('hull', v)}/>
          <Wardrobe label="Sails" current={state.cosmetics.sails} options={SAILS_VARIANTS} onPick={(v) => setCosmetic('sails', v)}/>
          <p style={{ fontSize: 12, color: 'var(--ink-mute)' }}>Hull & sail variants apply automatically on your next run.</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-mute)' }}>
        <Icon name={icon} size={14}/>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</div>
      </div>
      <div className="display num" style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Wardrobe({ label, current, options, onPick }) {
  return (
    <section>
      <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map(o => {
          const active = current === o;
          return (
            <button key={o} onClick={() => onPick(o)} style={{
              padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
              background: active ? 'var(--ink)' : 'var(--card)',
              border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line)'),
              color: active ? '#fff' : 'var(--ink)',
              fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
            }}>{o}</button>
          );
        })}
      </div>
    </section>
  );
}

// Shipyard — separate route. Pick from the ship roster.
function Shipyard({ state, setState }) {
  function selectShip(id) {
    setState(prev => ({ ...prev, selectedShip: id }));
  }
  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <PageHeader
        eyebrow="Boat Shooter"
        title="Shipyard"
        subtitle="Choose your hero ship. Each ship has its own balance of hull, speed, cannons, and luck."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {SHIPS.map(s => {
          const active = state.selectedShip === s.id;
          const locked = !s.unlocked;
          return (
            <div key={s.id} className="card" style={{
              padding: 0,
              overflow: 'hidden',
              opacity: locked ? .55 : 1,
              borderColor: active ? 'var(--ink)' : 'var(--line)',
              borderWidth: active ? 2 : 1,
              boxShadow: active ? '0 0 0 4px rgba(28,38,49,.08), var(--shadow-card)' : 'var(--shadow-card)',
            }}>
              <div style={{ position: 'relative' }}>
                <ScenePlaceholder label={`SHIP · ${s.name.toUpperCase()}`} tone="sea" height={120}/>
                {active && (
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <Badge tone="active" color="var(--ink)">In service</Badge>
                  </div>
                )}
                {locked && (
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <Badge tone="locked"><Icon name="lock" size={12}/> Locked</Badge>
                  </div>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <div className="display" style={{ fontSize: 20, fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2, marginBottom: 12 }}>{s.tagline}</div>
                <ShipStats stats={s.stats}/>
                {locked ? (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-mute)', textAlign: 'center', padding: 8, border: '1px dashed var(--line)', borderRadius: 8 }}>
                    {s.unlockHint}
                  </div>
                ) : (
                  <button className={active ? 'btn btn-disabled' : 'btn btn-primary'} style={{ width: '100%', marginTop: 12 }}
                    disabled={active} onClick={() => selectShip(s.id)}>
                    {active ? <><Icon name="check" size={14}/> Selected</> : <><Icon name="anchor" size={14}/> Select</>}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShipStats({ stats }) {
  const rows = [
    { key: 'hull',    label: 'Hull',    icon: 'shield' },
    { key: 'speed',   label: 'Speed',   icon: 'wind' },
    { key: 'cannons', label: 'Cannons', icon: 'flame' },
    { key: 'luck',    label: 'Luck',    icon: 'clover' },
  ];
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {rows.map(r => (
        <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <Icon name={r.icon} size={14} style={{ color: 'var(--ink-mute)' }}/>
          <span style={{ width: 64, color: 'var(--ink-soft)', fontWeight: 600 }}>{r.label}</span>
          <div style={{ flex: 1, display: 'flex', gap: 3 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 3,
                background: i < stats[r.key] ? 'var(--ink)' : 'var(--bg-2)',
                border: '1px solid var(--line)',
              }}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

window.Profile = Profile;
window.Shipyard = Shipyard;
