// Settings — audio + display. Plain-language, kid-friendly.
function Settings({ tweaks, setTweak }) {
  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <PageHeader
        eyebrow="Bilko Game Academy"
        title="Settings"
        subtitle="Audio, display, and accessibility. Apply across every game."
      />

      <div style={{ display: 'grid', gap: 24, maxWidth: 700 }}>

        <SettingsSection icon="volume" title="Audio">
          <SettingSlider label="Master volume" value={tweaks.master} onChange={(v)=>setTweak('master', v)}/>
          <SettingSlider label="Music"         value={tweaks.music}  onChange={(v)=>setTweak('music', v)}/>
          <SettingSlider label="Sound effects" value={tweaks.sfx}    onChange={(v)=>setTweak('sfx', v)}/>
        </SettingsSection>

        <SettingsSection icon="eye" title="Display & accessibility">
          <SettingToggle label="Reduced motion"
            sub="Tones down screen-shake, animations, and post-FX."
            checked={tweaks.reducedMotion} onChange={(v)=>setTweak('reducedMotion', v)}/>
          <SettingToggle label="High contrast"
            sub="Bolder outlines and stronger color separation."
            checked={tweaks.highContrast} onChange={(v)=>setTweak('highContrast', v)}/>
          <SettingToggle label="Battery saver"
            sub="Disables expensive shaders. Recommended for older iPads."
            checked={tweaks.batterySaver} onChange={(v)=>setTweak('batterySaver', v)}/>
        </SettingsSection>

        <SettingsSection icon="user" title="Player">
          <SettingRow label="Captain name">
            <input type="text" defaultValue="Captain You" style={{
              background: 'var(--card)',
              border: '1px solid var(--line)', borderRadius: 8,
              padding: '8px 12px', fontSize: 14, fontFamily: 'inherit',
              minWidth: 220,
            }}/>
          </SettingRow>
          <SettingRow label="Language">
            <select defaultValue="en" style={{
              background: 'var(--card)',
              border: '1px solid var(--line)', borderRadius: 8,
              padding: '8px 12px', fontSize: 14, fontFamily: 'inherit',
            }}>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </SettingRow>
        </SettingsSection>

        <SettingsSection icon="gear" title="Data">
          <SettingRow label="Local save">
            <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>Stored in this browser. Cloud sync ships in P7.</span>
          </SettingRow>
          <SettingRow label="">
            <button className="btn btn-ghost" style={{ color: 'var(--crimson)', borderColor: 'rgba(181,69,69,.4)' }}>
              Reset all progress
            </button>
          </SettingRow>
        </SettingsSection>

      </div>
    </div>
  );
}

function SettingsSection({ icon, title, children }) {
  return (
    <section className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Icon name={icon} size={18}/>
        <h2 className="display" style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>{children}</div>
    </section>
  );
}

function SettingSlider({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 140, fontSize: 13, fontWeight: 600 }}>{label}</div>
      <input type="range" min="0" max="1" step="0.05" value={value}
        onChange={(e)=>onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--ink)' }}/>
      <div className="num" style={{ width: 48, textAlign: 'right', fontSize: 13, color: 'var(--ink-mute)' }}>
        {Math.round(value * 100)}%
      </div>
    </div>
  );
}

function SettingToggle({ label, sub, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div onClick={()=>onChange(!checked)} style={{
        width: 44, height: 26, borderRadius: 999,
        background: checked ? 'var(--ink)' : 'var(--bg-2)',
        border: '1px solid var(--line)',
        position: 'relative', transition: 'background .15s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 20, height: 20, borderRadius: 999,
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          transition: 'left .15s',
        }}/>
      </div>
    </label>
  );
}

function SettingRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 140, fontSize: 13, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );
}

window.SettingsScreen = Settings;
