// Campaign — three Acts as horizontal swimlanes; each stage as a full card.
function Campaign({ state, setState, setRoute, setSelectedStage }) {
  const cleared = new Set(state.stagesCleared);
  const unlockedThrough = STAGES.reduce((acc, s, idx) => {
    if (idx === 0) return 1;
    const prev = STAGES[idx - 1];
    return cleared.has(prev.id) ? s.n : acc;
  }, 1);

  const stagesByAct = ACTS.map(a => ({ act: a, list: STAGES.filter(s => s.act === a.n) }));

  function play(stage) {
    setSelectedStage(stage.id);
    setRoute('play');
  }

  function clearStage(id) {
    if (cleared.has(id)) return;
    setState(prev => ({
      ...prev,
      stagesCleared: [...prev.stagesCleared, id],
      gems: prev.gems + 12,
    }));
  }

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <PageHeader
        eyebrow="Boat Shooter"
        title="Campaign Map"
        subtitle="Sail downriver across three acts. Clear a stage to unlock the next."
        right={
          <DifficultyPicker
            value={state.difficulty}
            onChange={(d) => setState(p => ({ ...p, difficulty: d }))}
          />
        }
      />

      {/* Act overview strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {ACTS.map(a => {
          const list = STAGES.filter(s => s.act === a.n);
          const done = list.filter(s => cleared.has(s.id)).length;
          return (
            <div key={a.n} className="card" style={{
              padding: 16,
              background: a.bg,
              borderColor: 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,.55)' }}>
                  Act {a.n}
                </div>
                <div className="num" style={{ fontWeight: 700, fontSize: 13 }}>{done}/{list.length}</div>
              </div>
              <div className="display" style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: '#1a1a1a' }}>{a.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,.6)', marginTop: 4 }}>{a.blurb}</div>
              <div style={{ height: 6, borderRadius: 999, background: 'rgba(0,0,0,.1)', marginTop: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(done/list.length)*100}%`, background: a.color, borderRadius: 999, transition: 'width .4s' }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage swimlanes */}
      {stagesByAct.map(({ act, list }) => (
        <section key={act.n} style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <span className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
              Act {act.n}
            </span>
            <h2 className="display" style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{act.name}</h2>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
          }}>
            {list.map(stage => {
              const isCleared = cleared.has(stage.id);
              const isLocked  = stage.n > unlockedThrough;
              const isNext    = stage.n === unlockedThrough && !isCleared;
              const tone = act.n === 1 ? 'delta' : act.n === 2 ? 'fog' : 'lava';
              return (
                <StageCard key={stage.id}
                  stage={stage} act={act} tone={tone}
                  isCleared={isCleared} isLocked={isLocked} isNext={isNext}
                  onPlay={() => play(stage)}
                  onSimulateClear={() => clearStage(stage.id)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function StageCard({ stage, act, tone, isCleared, isLocked, isNext, onPlay, onSimulateClear }) {
  return (
    <div className="card" style={{
      padding: 0,
      overflow: 'hidden',
      opacity: isLocked ? .55 : 1,
      borderColor: isNext ? act.color : 'var(--line)',
      borderWidth: isNext ? 2 : 1,
      boxShadow: isNext ? `0 0 0 4px ${hex2rgba(act.color, .15)}, var(--shadow-card)` : 'var(--shadow-card)',
      transition: 'transform .12s, box-shadow .15s, border-color .15s',
      cursor: isLocked ? 'not-allowed' : 'pointer',
    }}
    onMouseEnter={(e)=>{ if(!isLocked) e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseLeave={(e)=>{ e.currentTarget.style.transform = 'none'; }}
    onClick={() => !isLocked && onPlay()}>
      <div style={{ position: 'relative' }}>
        <ScenePlaceholder label={`STAGE ${stage.n} · ${stage.biome}`} tone={tone} height={104}/>
        {/* status badge */}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          {isCleared && <Badge tone="ok"><Icon name="check" size={12}/> Cleared</Badge>}
          {isNext    && <Badge tone="active" color={act.color}>Next</Badge>}
          {isLocked  && <Badge tone="locked"><Icon name="lock" size={12}/></Badge>}
          {!isCleared && !isNext && !isLocked && <Badge tone="neutral">Replay</Badge>}
        </div>
        {stage.boss && (
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <Badge tone="boss"><Icon name="skull" size={12}/> Boss</Badge>
          </div>
        )}
      </div>

      <div style={{ padding: 14 }}>
        <div className="num" style={{ fontWeight: 700, fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '.06em' }}>
          STAGE {String(stage.n).padStart(2,'0')}
        </div>
        <div className="display" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15, marginTop: 2 }}>
          {stage.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 4, lineHeight: 1.4, minHeight: 32 }}>
          {stage.tagline}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {!isLocked ? (
            <button className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} onClick={(e)=>{ e.stopPropagation(); onPlay(); }}>
              <Icon name="play" size={13}/> {isCleared ? 'Replay' : 'Sail'}
            </button>
          ) : (
            <button className="btn btn-disabled" style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} disabled>
              <Icon name="lock" size={13}/> Locked
            </button>
          )}
          {!isLocked && !isCleared && (
            <button className="btn btn-ghost" style={{ padding: '8px 10px', fontSize: 12 }}
              title="Simulate clearing this stage"
              onClick={(e) => { e.stopPropagation(); onSimulateClear(); }}>
              <Icon name="check" size={12}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ children, tone, color }) {
  const palettes = {
    ok:      { bg: '#d8efd8', fg: '#2f6f2f', border: '#a9d9a9' },
    locked:  { bg: 'rgba(0,0,0,.5)', fg: '#fff', border: 'transparent' },
    boss:    { bg: 'rgba(0,0,0,.7)', fg: '#fff', border: 'transparent' },
    neutral: { bg: 'rgba(255,255,255,.85)', fg: 'var(--ink)', border: 'var(--line)' },
    active:  { bg: '#fff', fg: '#1a1a1a', border: color || 'var(--ink)' },
  };
  const p = palettes[tone] || palettes.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 8px',
      borderRadius: 999,
      fontSize: 10, fontWeight: 700,
      letterSpacing: '.06em', textTransform: 'uppercase',
      background: p.bg, color: p.fg,
      border: `1px solid ${p.border}`,
      backdropFilter: 'blur(6px)',
    }}>{children}</span>
  );
}

function PageHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        {eyebrow && (
          <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--ink-mute)', textTransform: 'uppercase', marginBottom: 6 }}>
            {eyebrow}
          </div>
        )}
        <h1 className="display" style={{ fontSize: 'clamp(34px, 4vw, 48px)', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: 8, marginBottom: 0, maxWidth: 600 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function DifficultyPicker({ value, onChange }) {
  const opts = ['easy', 'normal', 'hard'];
  return (
    <div style={{
      display: 'inline-flex',
      padding: 4, borderRadius: 12,
      background: 'var(--card)', border: '1px solid var(--line)',
    }}>
      {opts.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: '8px 14px', borderRadius: 8,
          border: 'none', cursor: 'pointer',
          background: value === o ? 'var(--ink)' : 'transparent',
          color: value === o ? '#fff' : 'var(--ink-soft)',
          fontWeight: 600, fontSize: 12, textTransform: 'capitalize',
          transition: 'background .12s',
        }}>{o}</button>
      ))}
    </div>
  );
}

function hex2rgba(c, a) {
  // Resolves CSS var-strings or hex; for our act colors which are CSS vars we
  // just produce a fallback. Inline approximation per act.
  const map = {
    'var(--act-1-warm)': `rgba(232,184,107,${a})`,
    'var(--act-2-cool)': `rgba(108,141,166,${a})`,
    'var(--act-3-ember)': `rgba(197,87,47,${a})`,
  };
  return map[c] || `rgba(0,0,0,${a})`;
}

window.Campaign = Campaign;
window.PageHeader = PageHeader;
