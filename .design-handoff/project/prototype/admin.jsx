// Admin app — config governance for Boat Shooter.
// Player app = the game. Admin app = the controls behind the game.
// Clearly marked as Admin everywhere: ribbon, route prefix, neutral palette.

function AdminApp({ adminRoute, setAdminRoute, switchToPlayer }) {
  function renderRoute() {
    switch (adminRoute) {
      case 'dashboard':  return <AdminDashboard setAdminRoute={setAdminRoute}/>;
      case 'ships':      return <AdminShips/>;
      case 'enemies':    return <AdminEnemies/>;
      case 'weapons':    return <AdminWeapons/>;
      case 'stages':     return <AdminStages/>;
      case 'economy':    return <AdminEconomy/>;
      case 'publish':    return <AdminPublish switchToPlayer={switchToPlayer}/>;
      default:           return <AdminDashboard setAdminRoute={setAdminRoute}/>;
    }
  }
  return (
    <div className="admin-frame" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AdminTopRibbon switchToPlayer={switchToPlayer}/>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {renderRoute()}
      </div>
    </div>
  );
}

function AdminTopRibbon({ switchToPlayer }) {
  return (
    <div style={{
      background: 'repeating-linear-gradient(135deg, #1a2733 0 12px, #243140 12px 24px)',
      color: '#fff',
      padding: '10px 24px',
      display: 'flex', alignItems: 'center', gap: 14,
      borderBottom: '1px solid var(--line)',
      flexShrink: 0,
    }}>
      <div style={{
        background: 'var(--gold-500)', color: 'var(--sea-900)',
        padding: '3px 10px', borderRadius: 6,
        fontWeight: 800, fontSize: 11, letterSpacing: '.12em',
        fontFamily: "'JetBrains Mono', monospace",
      }}>ADMIN</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>Boat Shooter — Configuration Console</div>
      <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', letterSpacing: '.08em' }}>
        env: dev · build 0.4.2 · author: bilko-eng
      </span>
      <div style={{ flex: 1 }}/>
      <button className="btn btn-ghost"
        style={{ borderColor: 'rgba(255,255,255,.25)', color: '#fff', background: 'rgba(255,255,255,.06)', padding: '8px 14px', minHeight: 36, fontSize: 12 }}
        onClick={() => window.open(window.location.pathname + '#admin', '_blank')}>
        <Icon name="arrow-right" size={12}/> Open standalone
      </button>
      <button className="btn btn-gold" style={{ padding: '8px 14px', minHeight: 36, fontSize: 12 }}
        onClick={switchToPlayer}>
        <Icon name="play" size={12}/> Back to Player app
      </button>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────
function AdminDashboard({ setAdminRoute }) {
  const stats = [
    { label: 'Ships',   count: SHIPS.length,                    route: 'ships',   icon: 'anchor' },
    { label: 'Enemies', count: ENEMIES.filter(e=>!e.isBoss).length, route: 'enemies', icon: 'flame' },
    { label: 'Bosses',  count: ENEMIES.filter(e=>e.isBoss).length,  route: 'enemies', icon: 'trophy' },
    { label: 'Weapons', count: WEAPONS.length,                  route: 'weapons', icon: 'flame' },
    { label: 'Stages',  count: STAGES.length,                   route: 'stages',  icon: 'compass' },
    { label: 'Meta tracks', count: META_TRACKS.length,          route: 'economy', icon: 'gem' },
  ];
  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <PageHeader
        eyebrow="Admin Console"
        title="Boat Shooter configuration"
        subtitle="Edit the data the game runs on. Changes save as drafts; publish to push them to players."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge tone="warn"><Icon name="dot" size={10}/> 3 unsaved drafts</Badge>
            <Badge tone="ok"><Icon name="check" size={12}/> Last published 2h ago</Badge>
          </div>
        }/>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <button key={s.label} className="card"
            onClick={() => setAdminRoute(s.route)}
            style={{
              padding: 18, textAlign: 'left', cursor: 'pointer',
              background: 'var(--card)',
            }}
            onMouseEnter={(e)=> e.currentTarget.style.borderColor = 'var(--ink)'}
            onMouseLeave={(e)=> e.currentTarget.style.borderColor = 'var(--line)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-mute)', marginBottom: 4 }}>
              <Icon name={s.icon} size={14}/>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
            <div className="display num" style={{ fontSize: 36, fontWeight: 700 }}>{s.count}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>Manage →</div>
          </button>
        ))}
      </div>

      <div className="display" style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 14px' }}>Recent activity</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {[
          { who: 'bilko-eng', what: 'Edited "Kraken Ancient" — bumped HP 4000 → 4500', when: '12 min ago', kind: 'edit' },
          { who: 'bilko-eng', what: 'Created weapon "Storm Compass"', when: '1h ago', kind: 'create' },
          { who: 'designer', what: 'Reordered stages 11–13', when: '3h ago', kind: 'edit' },
          { who: 'bilko-eng', what: 'Published config v0.4.2 to staging', when: '2h ago', kind: 'publish' },
        ].map((row, i, arr) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '24px 1fr 120px',
            padding: '14px 18px', alignItems: 'center', gap: 12,
            borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--line-soft)',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: row.kind === 'publish' ? 'var(--gold-500)' : row.kind === 'create' ? 'var(--leaf)' : 'var(--card-2)',
              color: row.kind === 'edit' ? 'var(--ink-mute)' : '#fff',
              display: 'grid', placeItems: 'center',
            }}>
              <Icon name={row.kind === 'publish' ? 'check' : row.kind === 'create' ? 'plus' : 'pencil'} size={11}/>
            </div>
            <div>
              <div style={{ fontSize: 13 }}>{row.what}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)', marginTop: 2 }}>{row.who}</div>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', textAlign: 'right' }}>{row.when}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ships ────────────────────────────────────────────────────────
function AdminShips() {
  const [selectedId, setSelectedId] = React.useState(SHIPS[0].id);
  const ship = SHIPS.find(s => s.id === selectedId);
  return (
    <ConfigList
      eyebrow="Admin · Garage"
      title="Ships"
      subtitle="Player-selectable hero ships. Stats below are the design defaults; players can tune via Tweaks at runtime."
      items={SHIPS}
      selectedId={selectedId}
      onSelect={setSelectedId}
      renderListItem={(s) => (
        <>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>
            {s.unlocked ? 'Unlocked' : 'Locked at start'} · HP {s.baseHp} · Speed {s.baseSpeed}
            {s.isDefault && <> · <strong style={{ color: 'var(--gold-700)' }}>Default</strong></>}
          </div>
        </>
      )}
      renderEditor={(s) => (
        <ShipEditor ship={s}/>
      )}
    />
  );
}

function ShipEditor({ ship }) {
  return (
    <>
      <ScenePlaceholder label={`SHIP · ${ship.name.toUpperCase()}`} tone="sea" height={140}/>
      <div style={{ padding: 24 }}>
        <FieldHeader>Identity</FieldHeader>
        <FormGrid>
          <Field label="ID"   value={ship.id}      mono readOnly/>
          <Field label="Name" value={ship.name}/>
          <Field label="Tagline" value={ship.tagline} full/>
        </FormGrid>

        <FieldHeader>Base stats <Hint>What every player gets when they pick this ship.</Hint></FieldHeader>
        <FormGrid>
          <Field label="Base HP"     value={ship.baseHp}    type="number"/>
          <Field label="Base speed"  value={ship.baseSpeed} type="number" suffix="px/s"/>
          <Field label="Fire rate"   value={ship.fireRate}  type="number" suffix="× base"/>
        </FormGrid>

        <FieldHeader>Display rating <Hint>1–5 pips shown on the player's Shipyard card.</Hint></FieldHeader>
        <FormGrid cols={4}>
          {Object.entries(ship.stats).map(([k, v]) => (
            <Field key={k} label={k} value={v} type="number" max={5} cap/>
          ))}
        </FormGrid>

        <FieldHeader>Availability</FieldHeader>
        <FormGrid>
          <FieldToggle label="Unlocked from start" checked={ship.unlocked}/>
          <FieldToggle label="Default ship for new players" checked={!!ship.isDefault}/>
          {!ship.unlocked && <Field label="Unlock hint" value={ship.unlockHint || ''} full/>}
        </FormGrid>

        <SaveBar/>
      </div>
    </>
  );
}

// ── Enemies (incl. bosses) ───────────────────────────────────────
function AdminEnemies() {
  const [selectedId, setSelectedId] = React.useState(ENEMIES[0].id);
  const [filter, setFilter] = React.useState('all'); // all | regular | boss
  const visible = ENEMIES.filter(e => filter === 'all' ? true : filter === 'boss' ? e.isBoss : !e.isBoss);
  const enemy = ENEMIES.find(e => e.id === selectedId) || visible[0];
  return (
    <ConfigList
      eyebrow="Admin · Bestiary"
      title="Enemies & Bosses"
      subtitle="Hostile entities the player encounters. Tune HP, damage, and which acts they appear in."
      items={visible}
      selectedId={enemy.id}
      onSelect={setSelectedId}
      headerControls={
        <Segmented value={filter} onChange={setFilter}
          options={[
            { value: 'all',     label: 'All',     count: ENEMIES.length },
            { value: 'regular', label: 'Regular', count: ENEMIES.filter(e=>!e.isBoss).length },
            { value: 'boss',    label: 'Bosses',  count: ENEMIES.filter(e=>e.isBoss).length },
          ]}/>
      }
      renderListItem={(e) => (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{e.name}</div>
            {e.isBoss && <Badge tone="warn">Boss</Badge>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>
            {e.faction} · HP {e.hp} · DMG {e.dmg}
          </div>
        </>
      )}
      renderEditor={(e) => <EnemyEditor enemy={e}/>}
    />
  );
}

function EnemyEditor({ enemy }) {
  return (
    <>
      <ScenePlaceholder label={`${enemy.isBoss ? 'BOSS' : 'ENEMY'} · ${enemy.name.toUpperCase()}`}
        tone={enemy.isBoss ? 'lava' : 'fog'} height={140}/>
      <div style={{ padding: 24 }}>
        <FieldHeader>Identity</FieldHeader>
        <FormGrid>
          <Field label="ID" value={enemy.id} mono readOnly/>
          <Field label="Name" value={enemy.name}/>
          <Field label="Faction" value={enemy.faction}/>
          <FieldToggle label="Is boss" checked={!!enemy.isBoss}/>
        </FormGrid>

        <FieldHeader>Combat</FieldHeader>
        <FormGrid cols={3}>
          <Field label="HP" value={enemy.hp} type="number"/>
          <Field label="Damage" value={enemy.dmg} type="number"/>
          <Field label="Speed" value={enemy.speed} type="number" suffix="px/s"/>
        </FormGrid>

        <FieldHeader>Player-facing copy <Hint>Shown in the Encyclopedia.</Hint></FieldHeader>
        <FormGrid>
          <Field label="Description" value={enemy.blurb} full multiline/>
        </FormGrid>

        <FieldHeader>Spawns in acts</FieldHeader>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1,2,3].map(a => {
            const on = enemy.acts.includes(a);
            return (
              <div key={a} style={{
                padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: on ? 'var(--ink)' : 'var(--card-2)',
                color: on ? '#fff' : 'var(--ink-mute)',
                border: '1px solid ' + (on ? 'var(--ink)' : 'var(--line)'),
                cursor: 'pointer',
              }}>Act {a}</div>
            );
          })}
        </div>

        <SaveBar/>
      </div>
    </>
  );
}

// ── Weapons ──────────────────────────────────────────────────────
function AdminWeapons() {
  const [selectedId, setSelectedId] = React.useState(WEAPONS[0].id);
  const w = WEAPONS.find(x => x.id === selectedId);
  return (
    <ConfigList
      eyebrow="Admin · Arsenal"
      title="Weapons"
      subtitle="Stackable weapons players pick up mid-run. Tune base damage and fire rate."
      items={WEAPONS}
      selectedId={selectedId}
      onSelect={setSelectedId}
      renderListItem={(w) => (
        <>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{w.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>
            {w.kind} · base {w.base} · {w.rate}/s
          </div>
        </>
      )}
      renderEditor={(w) => (
        <>
          <ScenePlaceholder label={`WEAPON · ${w.name.toUpperCase()}`} tone="sea" height={140}/>
          <div style={{ padding: 24 }}>
            <FieldHeader>Identity</FieldHeader>
            <FormGrid>
              <Field label="ID" value={w.id} mono readOnly/>
              <Field label="Name" value={w.name}/>
              <Field label="Type" value={w.kind} select options={['projectile','beam','arc','aoe','passive','orbiter']}/>
            </FormGrid>
            <FieldHeader>Combat</FieldHeader>
            <FormGrid>
              <Field label="Base damage" value={w.base} type="number"/>
              <Field label="Fire rate"   value={w.rate} type="number" suffix="/s"/>
            </FormGrid>
            <FieldHeader>Description</FieldHeader>
            <FormGrid>
              <Field label="Player-facing blurb" value={w.blurb} full multiline/>
            </FormGrid>
            <SaveBar/>
          </div>
        </>
      )}
    />
  );
}

// ── Stages ───────────────────────────────────────────────────────
function AdminStages() {
  const [selectedId, setSelectedId] = React.useState(STAGES[0].id);
  const stage = STAGES.find(s => s.id === selectedId);
  return (
    <ConfigList
      eyebrow="Admin · Voyage"
      title="Stages"
      subtitle="The 15-stage campaign across 3 acts. Stages reference enemy IDs from the Bestiary."
      items={STAGES}
      selectedId={selectedId}
      onSelect={setSelectedId}
      renderListItem={(s) => (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono num" style={{ fontSize: 11, color: 'var(--ink-mute)', minWidth: 22 }}>{String(s.n).padStart(2,'0')}</span>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
            {s.boss && <Badge tone="warn">Boss</Badge>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>Act {s.act} · {s.biome}</div>
        </>
      )}
      renderEditor={(s) => (
        <>
          <ScenePlaceholder label={`STAGE ${s.n} · ${s.biome.toUpperCase()}`}
            tone={s.act === 1 ? 'delta' : s.act === 2 ? 'fog' : 'lava'} height={140}/>
          <div style={{ padding: 24 }}>
            <FieldHeader>Identity</FieldHeader>
            <FormGrid>
              <Field label="ID" value={s.id} mono readOnly/>
              <Field label="Stage #" value={s.n} type="number"/>
              <Field label="Name" value={s.name}/>
              <Field label="Act" value={s.act} type="number" max={3}/>
              <Field label="Biome" value={s.biome}/>
              <Field label="Duration" value={s.duration} type="number" suffix="sec"/>
            </FormGrid>
            <FieldHeader>Boss</FieldHeader>
            <FormGrid>
              <Field label="Boss enemy ID (optional)" value={s.boss || '—'}/>
            </FormGrid>
            <FieldHeader>Player-facing copy</FieldHeader>
            <FormGrid>
              <Field label="Tagline" value={s.tagline} full multiline/>
            </FormGrid>
            <FieldHeader>Spawn pool <Hint>Enemy IDs that can appear during this stage.</Hint></FieldHeader>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {s.enemies.map(eid => (
                <div key={eid} className="mono" style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 11,
                  background: 'var(--card-2)', border: '1px solid var(--line)', color: 'var(--ink-soft)',
                }}>{eid}</div>
              ))}
              <button className="mono" style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                background: 'transparent', border: '1px dashed var(--line)', color: 'var(--ink-mute)',
              }}>+ add</button>
            </div>
            <SaveBar/>
          </div>
        </>
      )}
    />
  );
}

// ── Economy ──────────────────────────────────────────────────────
function AdminEconomy() {
  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <PageHeader
        eyebrow="Admin · Economy"
        title="Meta progression & economy"
        subtitle="Permanent upgrade tracks players spend gems on between runs."/>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: 20 }}>
          <FieldHeader>Currency</FieldHeader>
          <FormGrid>
            <Field label="Coins per kill (base)" value={3} type="number"/>
            <Field label="Gem drop rate" value="0.04" type="number" suffix="probability"/>
            <Field label="Map fragment rate" value="0.20" type="number" suffix="per stage clear"/>
            <Field label="Daily run reward" value="50" type="number" suffix="gems"/>
          </FormGrid>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <FieldHeader>Run difficulty</FieldHeader>
          <FormGrid>
            <Field label="Enemy HP scaling per stage" value="+8%" />
            <Field label="Boss HP multiplier"        value="2.5×"/>
            <Field label="NG+ enemy HP multiplier"   value="1.5×"/>
            <Field label="Daily seed difficulty"     value="hard" select options={['easy','normal','hard','nightmare']}/>
          </FormGrid>
        </div>
      </div>

      <div className="display" style={{ fontSize: 22, fontWeight: 700, margin: '0 0 14px' }}>Upgrade tracks</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '40px 1fr 1fr 90px 90px 110px',
          padding: '12px 18px', background: 'var(--card-2)', borderBottom: '1px solid var(--line)',
        }}>
          {['', 'Track', 'Description', 'Levels', 'L1 cost', 'L10 cost'].map(h => (
            <div key={h} className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>{h}</div>
          ))}
        </div>
        {META_TRACKS.map((t, i) => (
          <div key={t.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 1fr 90px 90px 110px',
            padding: '14px 18px', alignItems: 'center', gap: 8,
            borderBottom: i === META_TRACKS.length - 1 ? 'none' : '1px solid var(--line-soft)',
          }}>
            <Icon name={t.icon} size={16} style={{ color: 'var(--ink-soft)' }}/>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.blurb}</div>
            <div className="num" style={{ fontSize: 13 }}>10</div>
            <div className="num" style={{ fontSize: 13, color: 'var(--gold-700)' }}>{META_COSTS[1]} gems</div>
            <div className="num" style={{ fontSize: 13, color: 'var(--gold-700)' }}>{META_COSTS[10]} gems</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Publish ──────────────────────────────────────────────────────
function AdminPublish({ switchToPlayer }) {
  const [step, setStep] = React.useState('idle'); // idle | publishing | done
  function publish() {
    setStep('publishing');
    setTimeout(() => setStep('done'), 1200);
  }
  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <PageHeader
        eyebrow="Admin · Publish"
        title="Publish configuration"
        subtitle="Push your draft changes to the live Player app. Players will see the new values on their next run."/>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18 }}>
        <div className="card" style={{ padding: 24 }}>
          <FieldHeader>Pending changes <Hint>3 entities have unsaved drafts.</Hint></FieldHeader>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {[
              { kind: 'enemies/boss-kraken', summary: 'HP 4000 → 4500' },
              { kind: 'weapons/storm-compass', summary: 'New weapon (passive)' },
              { kind: 'stages', summary: 'Reordered 11–13' },
            ].map(d => (
              <li key={d.kind} style={{
                padding: '12px 14px', background: 'var(--card-2)', borderRadius: 10,
                border: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--gold-500)' }}/>
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{d.kind}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.summary}</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', minHeight: 28, fontSize: 11 }}>Discard</button>
              </li>
            ))}
          </ul>

          <FieldHeader style={{ marginTop: 24 }}>Release notes <Hint>Optional. Visible to players in the Encyclopedia.</Hint></FieldHeader>
          <textarea defaultValue="Kraken Ancient is now a fairer fight with slightly more HP — the phase 3 cooldown is longer. New passive: Storm Compass. Stage order tightened in Act III."
            style={{
              width: '100%', minHeight: 100, resize: 'vertical',
              background: 'var(--card-2)', border: '1px solid var(--line)', borderRadius: 10,
              padding: 12, fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)',
            }}/>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn btn-ghost">Save draft</button>
            <button className={step === 'publishing' ? 'btn btn-disabled' : 'btn btn-gold'}
              onClick={publish} disabled={step === 'publishing'}>
              <Icon name={step === 'done' ? 'check' : 'rocket'} size={14}/>
              {step === 'idle' ? 'Publish to Player app' :
               step === 'publishing' ? 'Publishing…' :
               'Published ✓ Re-publish'}
            </button>
          </div>
          {step === 'done' && (
            <div style={{ marginTop: 14, padding: 14, background: '#e8f5e8', border: '1px solid #a9d9a9', borderRadius: 10, fontSize: 13 }}>
              <strong>Published.</strong> Config v0.4.3 is now live for players. <button onClick={switchToPlayer} className="mono" style={{ background: 'none', border: 'none', color: 'var(--leaf)', cursor: 'pointer', fontWeight: 700, padding: 0, textDecoration: 'underline' }}>Open Player app →</button>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24, background: 'var(--card-2)' }}>
          <FieldHeader>How publishing works</FieldHeader>
          <ol style={{ paddingLeft: 18, margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
            <li>Drafts stay local until you publish.</li>
            <li>Publishing bumps the config version and pushes to all players.</li>
            <li>Already-running player sessions keep the old config until they finish their current run.</li>
            <li>Every publish is reversible — you can roll back from the Activity log.</li>
          </ol>
          <FieldHeader style={{ marginTop: 22 }}>Standalone mode</FieldHeader>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 10 }}>
            The Admin app can run as its own standalone application — no Player UI in the same window. Useful for ops, content editors, or QA.
          </p>
          <code className="mono" style={{
            display: 'block', padding: 10, background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 8, fontSize: 11, color: 'var(--ink-soft)',
          }}>npm run admin</code>
        </div>
      </div>
    </div>
  );
}

// ── Shared admin UI ──────────────────────────────────────────────
function ConfigList({ eyebrow, title, subtitle, items, selectedId, onSelect, renderListItem, renderEditor, headerControls }) {
  const selected = items.find(i => i.id === selectedId) || items[0];
  return (
    <div className="page-enter" style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', overflow: 'hidden' }}>
      <div style={{ padding: '24px 36px 16px' }}>
        <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle}
          right={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {headerControls}
              <button className="btn btn-primary" style={{ padding: '8px 14px', minHeight: 36, fontSize: 12 }}>
                <Icon name="plus" size={12}/> New
              </button>
            </div>
          }/>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '320px 1fr',
        gap: 0, padding: '0 36px 36px', overflow: 'hidden',
      }}>
        {/* List */}
        <div className="card scroll" style={{ padding: 0, overflow: 'auto', borderRadius: '14px 0 0 14px' }}>
          {items.map((it, i) => {
            const active = it.id === selected.id;
            return (
              <button key={it.id} onClick={() => onSelect(it.id)} style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '12px 16px', background: active ? 'var(--ink)' : 'transparent',
                color: active ? '#fff' : 'var(--ink)',
                border: 'none',
                borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--line-soft)',
                display: 'block',
              }}>
                {renderListItem(it)}
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="card scroll" style={{
          padding: 0, overflow: 'auto', borderRadius: '0 14px 14px 0',
          borderLeft: 'none',
        }}>
          {renderEditor(selected)}
        </div>
      </div>
    </div>
  );
}

function FieldHeader({ children, style }) {
  return (
    <div className="mono" style={{
      fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
      color: 'var(--ink-mute)', margin: '8px 0 10px',
      paddingBottom: 6, borderBottom: '1px solid var(--line-soft)',
      display: 'flex', alignItems: 'center', gap: 8,
      ...style,
    }}>{children}</div>
  );
}
function Hint({ children }) {
  return <span style={{ fontSize: 10, color: 'var(--ink-mute)', textTransform: 'none', letterSpacing: 0, fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>· {children}</span>;
}
function FormGrid({ children, cols = 2 }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 18 }}>{children}</div>;
}
function Field({ label, value, mono, readOnly, type = 'text', suffix, full, multiline, select, options, max, cap }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: full ? '1 / -1' : 'auto' }}>
      <span className="mono" style={{ fontSize: 10, letterSpacing: '.08em', textTransform: cap ? 'capitalize' : 'uppercase', color: 'var(--ink-mute)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
        {select ? (
          <select defaultValue={value} disabled={readOnly} style={inputStyle(mono, readOnly)}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : multiline ? (
          <textarea defaultValue={value} readOnly={readOnly} style={{ ...inputStyle(mono, readOnly), minHeight: 70, resize: 'vertical' }}/>
        ) : (
          <input type={type} defaultValue={value} readOnly={readOnly} max={max}
            style={inputStyle(mono, readOnly)}/>
        )}
        {suffix && <span className="mono" style={{
          fontSize: 11, color: 'var(--ink-mute)', alignSelf: 'center', whiteSpace: 'nowrap',
        }}>{suffix}</span>}
      </div>
    </label>
  );
}
function inputStyle(mono, readOnly) {
  return {
    flex: 1,
    background: readOnly ? 'var(--bg-2)' : 'var(--card)',
    border: '1px solid var(--line)', borderRadius: 8,
    padding: '8px 10px', fontSize: 13,
    fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
    color: readOnly ? 'var(--ink-mute)' : 'var(--ink)',
  };
}
function FieldToggle({ label, checked }) {
  const [on, setOn] = React.useState(checked);
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0' }}>
      <div onClick={() => setOn(!on)} style={{
        width: 36, height: 22, borderRadius: 999,
        background: on ? 'var(--ink)' : 'var(--bg-2)',
        border: '1px solid var(--line)', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: on ? 16 : 2,
          width: 16, height: 16, borderRadius: 999, background: '#fff',
          transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)',
        }}/>
      </div>
      <span style={{ fontSize: 13 }}>{label}</span>
    </label>
  );
}
function SaveBar() {
  return (
    <div style={{
      marginTop: 24, padding: 14, background: 'var(--card-2)',
      borderRadius: 10, border: '1px dashed var(--line)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <Icon name="dot" size={10} style={{ color: 'var(--gold-500)' }}/>
      <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-soft)' }}>
        Unsaved draft. Click <strong>Save draft</strong> to keep your changes, or <strong>Publish</strong> to push live.
      </div>
      <button className="btn btn-ghost" style={{ padding: '8px 14px', minHeight: 32, fontSize: 12 }}>Save draft</button>
      <button className="btn btn-primary" style={{ padding: '8px 14px', minHeight: 32, fontSize: 12 }}>Publish</button>
    </div>
  );
}
function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--card-2)', border: '1px solid var(--line)', borderRadius: 10 }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: active ? 'var(--ink)' : 'transparent',
            color: active ? '#fff' : 'var(--ink-soft)',
            fontSize: 12, fontWeight: 600,
          }}>
            {o.label} <span className="num" style={{ opacity: .6, marginLeft: 4 }}>{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}

window.AdminApp = AdminApp;
