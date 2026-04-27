// Root app — two apps: Player (the game) and Admin (config governance).
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "roomy",
  "accent": "warmGold",
  "actColors": true,
  "copyTone": "plain",
  "defaultShipOverride": "ember-corsair",
  "master": 0.8,
  "music": 0.6,
  "sfx": 0.8,
  "reducedMotion": false,
  "highContrast": false,
  "batterySaver": false
}/*EDITMODE-END*/;

function App() {
  // Mode: 'player' (the game) or 'admin' (config governance)
  const initialMode = window.location.hash === '#admin' ? 'admin' : 'player';
  const [mode, setMode] = useState(initialMode);
  const [route, setRoute] = useState('home');
  const [adminRoute, setAdminRoute] = useState('dashboard');
  const [selectedStage, setSelectedStage] = useState(null);
  const [state, setState] = useState({
    ...INITIAL_STATE,
    encyclopediaSeen: ['skiff','kamikaze','gunboat','frigate','boss-pirate-king','ghost-skiff','swarm'],
  });
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply default ship override from Tweaks
  useEffect(() => {
    if (tweaks.defaultShipOverride && tweaks.defaultShipOverride !== state.defaultShip) {
      setState(prev => ({ ...prev, defaultShip: tweaks.defaultShipOverride, selectedShip: tweaks.defaultShipOverride }));
    }
  }, [tweaks.defaultShipOverride]);

  // Apply accent override
  useEffect(() => {
    const accents = {
      warmGold: { gold400: '#e0b063', gold500: '#c79448', gold600: '#a37835' },
      coolCyan: { gold400: '#6ec3c6', gold500: '#3f9ea2', gold600: '#2a7a7d' },
      ember:    { gold400: '#e88a5a', gold500: '#c5572f', gold600: '#9a3f1f' },
    };
    const a = accents[tweaks.accent] || accents.warmGold;
    document.documentElement.style.setProperty('--gold-400', a.gold400);
    document.documentElement.style.setProperty('--gold-500', a.gold500);
    document.documentElement.style.setProperty('--gold-600', a.gold600);
  }, [tweaks.accent]);

  // Update hash when mode changes (so standalone Admin link survives reload)
  useEffect(() => {
    if (mode === 'admin' && window.location.hash !== '#admin') {
      window.history.replaceState(null, '', '#admin');
    } else if (mode === 'player' && window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [mode]);

  const densityClass = `density-${tweaks.density || 'roomy'}`;

  function renderPlayer() {
    switch (route) {
      case 'home':         return <Home state={state} setState={setState} setRoute={setRoute} setSelectedStage={setSelectedStage}/>;
      case 'campaign':     return <Campaign state={state} setState={setState} setRoute={setRoute} setSelectedStage={setSelectedStage}/>;
      case 'shipyard':     return <Shipyard state={state} setState={setState}/>;
      case 'meta':         return <MetaShop state={state} setState={setState} setRoute={setRoute}/>;
      case 'encyclopedia': return <Encyclopedia state={state}/>;
      case 'leaderboards': return <Leaderboards state={state}/>;
      case 'profile':      return <Profile state={state} setState={setState} setRoute={setRoute}/>;
      case 'settings':     return <SettingsScreen tweaks={tweaks} setTweak={setTweak}/>;
      case 'play':         return <PlayLaunch stageId={selectedStage} state={state} setState={setState} setRoute={setRoute}/>;
      default:             return <Home state={state} setState={setState} setRoute={setRoute} setSelectedStage={setSelectedStage}/>;
    }
  }

  return (
    <div className={`app ${densityClass}`}>
      <Sidebar
        mode={mode} setMode={setMode}
        route={route} setRoute={setRoute}
        adminRoute={adminRoute} setAdminRoute={setAdminRoute}
        state={state}/>
      <main style={{ overflow: 'hidden', position: 'relative' }}>
        {mode === 'admin'
          ? <AdminApp adminRoute={adminRoute} setAdminRoute={setAdminRoute} switchToPlayer={() => setMode('player')}/>
          : renderPlayer()}
      </main>
      {mode === 'player' && (
        <TweaksPanel title="Tweaks" defaultOpen={false}>
          <TweakSection title="Default ship">
            <TweakSelect
              label="Ship for new runs"
              value={tweaks.defaultShipOverride}
              onChange={(v) => setTweak('defaultShipOverride', v)}
              options={SHIPS.filter(s => s.unlocked).map(s => ({ value: s.id, label: s.name }))}/>
          </TweakSection>
          <TweakSection title="Layout">
            <TweakRadio
              label="Density" value={tweaks.density}
              onChange={(v) => setTweak('density', v)}
              options={[
                { value: 'cozy',     label: 'Cozy' },
                { value: 'roomy',    label: 'Roomy' },
                { value: 'spacious', label: 'Spacious' },
              ]}/>
            <TweakToggle label="Tint stages by Act" value={tweaks.actColors} onChange={(v) => setTweak('actColors', v)}/>
          </TweakSection>
          <TweakSection title="Color">
            <TweakRadio
              label="Accent" value={tweaks.accent}
              onChange={(v) => setTweak('accent', v)}
              options={[
                { value: 'warmGold', label: 'Gold' },
                { value: 'coolCyan', label: 'Cyan' },
                { value: 'ember',    label: 'Ember' },
              ]}/>
          </TweakSection>
          <TweakSection title="Copy">
            <TweakRadio
              label="Tone" value={tweaks.copyTone}
              onChange={(v) => setTweak('copyTone', v)}
              options={[
                { value: 'plain',     label: 'Plain' },
                { value: 'flavorful', label: 'Flavorful' },
              ]}/>
          </TweakSection>
        </TweaksPanel>
      )}
    </div>
  );
}

// Mock "playing" screen.
function PlayLaunch({ stageId, state, setState, setRoute }) {
  const stage = STAGES.find(s => s.id === stageId);
  const ship  = SHIPS.find(s => s.id === state.selectedShip) || SHIPS[0];
  function complete() {
    if (!state.stagesCleared.includes(stage.id)) {
      setState(prev => ({
        ...prev,
        stagesCleared: [...prev.stagesCleared, stage.id],
        gems: prev.gems + 18,
        mapFragments: prev.mapFragments + 1,
      }));
    }
    setRoute('campaign');
  }
  if (!stage) {
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 32 }}>
        <button className="btn btn-ghost" onClick={()=>setRoute('home')}>← Back home</button>
      </div>
    );
  }
  const tone = stage.act === 1 ? 'delta' : stage.act === 2 ? 'fog' : 'lava';
  return (
    <div className="page-enter" style={{ height: '100%', padding: 32, display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', maxWidth: 720, width: '100%' }}>
        <ScenePlaceholder label={`STAGE ${stage.n} · ${stage.biome}`} tone={tone} height={220}/>
        <div style={{ padding: 32 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--ink-mute)', textTransform: 'uppercase', marginBottom: 6 }}>
            Stage {stage.n} · Act {stage.act}
          </div>
          <h1 className="display" style={{ fontSize: 38, fontWeight: 700, margin: 0, lineHeight: 1 }}>{stage.name}</h1>
          <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: 8, marginBottom: 20 }}>{stage.tagline}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            <Briefing label="Ship" value={ship.name}/>
            <Briefing label="Difficulty" value={state.difficulty} cap/>
            {stage.boss
              ? <Briefing label="Boss" value={stage.boss}/>
              : <Briefing label="Goal" value="Survive & sail"/>}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setRoute('campaign')}>← Back</button>
            <button className="btn btn-ghost" onClick={complete}>
              <Icon name="check" size={14}/> Mark cleared (demo)
            </button>
            <button className="btn btn-primary">
              <Icon name="play" size={14}/> Launch run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Briefing({ label, value, cap }) {
  return (
    <div className="card" style={{ padding: 12, background: 'var(--card-2)' }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4, textTransform: cap ? 'capitalize' : 'none' }}>{value}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
