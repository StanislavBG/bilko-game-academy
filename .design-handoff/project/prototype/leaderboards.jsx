// Leaderboards — three boards, cleaner table.
function Leaderboards({ state }) {
  const [tab, setTab] = React.useState('campaign');
  const tabs = [
    { id: 'campaign', label: 'Campaign', subtitle: 'High score · all stages cleared', rows: LB_CAMPAIGN, mode: 'score+time' },
    { id: 'daily',    label: "Today's run", subtitle: DAILY_RUN.dateKey + ' · seeded', rows: LB_DAILY, mode: 'score' },
    { id: 'bosses',   label: 'Boss times', subtitle: 'The Kraken Ancient · solo', rows: LB_BOSSES, mode: 'time' },
  ];
  const t = tabs.find(x => x.id === tab);

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <PageHeader
        eyebrow="Boat Shooter"
        title="Leaderboards"
        subtitle="Your runs, ranked. Local-only for now; cloud sync ships in P7."
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {tabs.map(x => (
          <button key={x.id} onClick={() => setTab(x.id)} className="card" style={{
            padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
            background: tab === x.id ? 'var(--ink)' : 'var(--card)',
            color: tab === x.id ? '#fff' : 'var(--ink)',
            borderColor: tab === x.id ? 'var(--ink)' : 'var(--line)',
            minWidth: 200,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{x.label}</div>
            <div style={{ fontSize: 11, opacity: .7, marginTop: 2 }}>{x.subtitle}</div>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 1fr 140px 120px',
          padding: '12px 18px', borderBottom: '1px solid var(--line)',
          background: 'var(--card-2)',
        }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>Rank</div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>Captain</div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', textAlign: 'right' }}>
            {t.mode === 'time' ? 'Time' : 'Score'}
          </div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', textAlign: 'right' }}>
            {t.mode === 'score+time' ? 'Run time' : ''}
          </div>
        </div>
        {t.rows.map((r, i) => (
          <div key={r.rank} style={{
            display: 'grid', gridTemplateColumns: '60px 1fr 140px 120px',
            padding: '14px 18px',
            borderBottom: i === t.rows.length - 1 ? 'none' : '1px solid var(--line-soft)',
            background: r.you ? 'rgba(224,176,99,.10)' : 'transparent',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RankBadge rank={r.rank}/>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 999,
                background: r.you ? 'var(--gold-500)' : 'var(--card-2)',
                color: r.you ? '#fff' : 'var(--ink-soft)',
                display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11,
                border: '1px solid var(--line)',
              }}>{r.username.slice(0,2).toUpperCase()}</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {r.username}
                {r.you && <span className="pill" style={{ marginLeft: 8, background: 'var(--gold-500)', borderColor: 'var(--gold-500)', color: '#fff' }}>You</span>}
              </div>
            </div>
            <div className="num display" style={{ fontWeight: 700, fontSize: 17, textAlign: 'right' }}>
              {t.mode === 'time' ? formatMs(r.durationMs) : r.score.toLocaleString()}
            </div>
            <div className="num" style={{ fontSize: 12, color: 'var(--ink-mute)', textAlign: 'right' }}>
              {t.mode === 'score+time' && r.durationMs ? formatMs(r.durationMs) : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  const isPodium = rank <= 3;
  const colors = { 1: '#e0b063', 2: '#bdbdbd', 3: '#cd7f32' };
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 8,
      background: isPodium ? colors[rank] : 'transparent',
      color: isPodium ? '#fff' : 'var(--ink-mute)',
      display: 'grid', placeItems: 'center',
      fontWeight: 800, fontSize: 13,
    }}>{rank}</div>
  );
}

function formatMs(ms) {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s - m*60);
  return `${m}m ${String(r).padStart(2,'0')}s`;
}

window.Leaderboards = Leaderboards;
