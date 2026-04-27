// Meta Shop — 7 upgrade tracks + treasure maps. Friendly framing.
function MetaShop({ state, setState, setRoute }) {
  const [purchasedFlash, setPurchasedFlash] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  function purchase(trackId) {
    const lvl = state.meta[trackId];
    if (lvl >= 10) return;
    const cost = META_COSTS[lvl + 1];
    if (state.gems < cost) {
      setToast({ kind: 'error', text: `Not enough gems. Need ${cost}.` });
      setTimeout(() => setToast(null), 2200);
      return;
    }
    setState(prev => ({
      ...prev,
      gems: prev.gems - cost,
      meta: { ...prev.meta, [trackId]: lvl + 1 },
    }));
    setPurchasedFlash(trackId);
    setTimeout(() => setPurchasedFlash(null), 400);
    const track = META_TRACKS.find(t => t.id === trackId);
    setToast({ kind: 'ok', text: `${track.name} upgraded to L${lvl+1}.` });
    setTimeout(() => setToast(null), 2200);
  }

  function assembleMap(mapId) {
    if (state.mapsAssembled.includes(mapId)) return;
    if (state.mapFragments < 5) return;
    setState(prev => ({
      ...prev,
      mapFragments: prev.mapFragments - 5,
      mapsAssembled: [...prev.mapsAssembled, mapId],
    }));
    setToast({ kind: 'ok', text: `Treasure map assembled.` });
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <PageHeader
        eyebrow="Boat Shooter"
        title="Meta Shop"
        subtitle="Spend gems on permanent upgrades that apply to every run."
        right={
          <div style={{ display: 'flex', gap: 10 }}>
            <BigCurrency icon="gem" value={state.gems} label="Gems" tone="gold"/>
            <BigCurrency icon="map" value={state.mapFragments} label="Map fragments" tone="ink"/>
          </div>
        }
      />

      {/* Tracks grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 36 }}>
        {META_TRACKS.map(t => {
          const lvl = state.meta[t.id];
          const maxed = lvl >= 10;
          const cost = maxed ? null : META_COSTS[lvl + 1];
          const canAfford = !maxed && state.gems >= cost;
          const flashing = purchasedFlash === t.id;

          return (
            <div key={t.id} className={`card ${flashing ? 'pop' : ''}`} style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--card-2)', display: 'grid', placeItems: 'center',
                  color: 'var(--ink)',
                }}>
                  <Icon name={t.icon} size={20}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="display" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{t.blurb}</div>
                </div>
                <div className="num" style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-soft)' }}>L{lvl}/10</div>
              </div>

              {/* Pip ladder */}
              <div style={{ display: 'flex', gap: 4, margin: '14px 0 14px' }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 10, borderRadius: 4,
                    background: i < lvl ? 'var(--ink)' : 'var(--bg-2)',
                    border: '1px solid var(--line)',
                    transition: 'background .25s ease',
                  }}/>
                ))}
              </div>

              {maxed ? (
                <button className="btn btn-disabled" style={{ width: '100%' }} disabled>
                  <Icon name="check" size={14}/> Mastered
                </button>
              ) : (
                <button
                  className={canAfford ? 'btn btn-primary' : 'btn btn-disabled'}
                  style={{ width: '100%' }}
                  onClick={() => purchase(t.id)}
                  disabled={!canAfford}>
                  <Icon name="gem" size={14}/>
                  Upgrade · {cost} gems
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Treasure maps */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <h2 className="display" style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Treasure Maps</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
        <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>5 fragments per map</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {TREASURE_MAPS.map(m => {
          const assembled = state.mapsAssembled.includes(m.id);
          const canAssemble = !assembled && state.mapFragments >= 5;
          return (
            <div key={m.id} className="card" style={{ padding: 14, opacity: assembled ? .7 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div className="display" style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>{m.detail}</div>
                </div>
                {assembled
                  ? <Badge tone="ok"><Icon name="check" size={12}/> Done</Badge>
                  : <Badge tone="neutral">5 frags</Badge>}
              </div>
              {!assembled && (
                <button className={canAssemble ? 'btn btn-ghost' : 'btn btn-disabled'}
                  style={{ width: '100%', marginTop: 12, fontSize: 12 }}
                  disabled={!canAssemble}
                  onClick={() => assembleMap(m.id)}>
                  <Icon name="map" size={13}/> Assemble
                </button>
              )}
            </div>
          );
        })}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '12px 18px', borderRadius: 10,
          background: toast.kind === 'ok' ? 'var(--ink)' : '#7e2424',
          color: '#fff', fontWeight: 600, fontSize: 13,
          animation: 'toastIn .18s ease-out',
          boxShadow: 'var(--shadow-pop)',
          zIndex: 50,
        }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

function BigCurrency({ icon, value, label, tone }) {
  const c = tone === 'gold'
    ? { bg: '#fff5d8', fg: 'var(--gold-700)', border: 'var(--gold-400)' }
    : { bg: 'var(--card)', fg: 'var(--ink)', border: 'var(--line)' };
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 12,
      background: c.bg, border: `1px solid ${c.border}`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <Icon name={icon} size={20} style={{ color: c.fg }}/>
      <div>
        <div className="num" style={{ fontWeight: 800, fontSize: 18, color: c.fg, lineHeight: 1 }}>{value}</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

window.MetaShop = MetaShop;
window.BigCurrency = BigCurrency;
