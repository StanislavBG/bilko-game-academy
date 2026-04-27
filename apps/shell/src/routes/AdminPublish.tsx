import { Icon } from '../design/Icon';

export function AdminPublish(): JSX.Element {
  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '24px 32px 48px', background: 'var(--bg)' }}>
      <header style={{ marginBottom: 22 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
          Push overlay to live
        </div>
        <h1 className="display" style={{ fontSize: 38, fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
          Publish
        </h1>
      </header>

      <section className="card" style={{ padding: 22, maxWidth: 720 }}>
        <div className="display" style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>How publishing works</div>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
          The game runtime fetches <code>/v1/content</code> from the content server at boot. Every save you make in the
          admin tabs lands as an override in <code>data/overrides.json</code>; the server merges defaults ⊕ overrides
          and serves the result. Players see your edits on their next launch.
        </p>
        <div style={{ marginTop: 18, padding: 14, background: 'var(--card-2)', borderRadius: 12, border: '1px dashed var(--line)' }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 6 }}>
            Coming soon
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
            <li>Snapshot &amp; diff: see exactly what changed since last publish.</li>
            <li>Promote staging → production with one click.</li>
            <li>One-click rollback to the last good overlay.</li>
            <li>Audit log of who published what when.</li>
          </ul>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-disabled">
            <Icon name="rocket" size={14}/> Publish to live (soon)
          </button>
          <button type="button" className="btn btn-ghost">
            <Icon name="arrow-left" size={14}/> View diff (soon)
          </button>
        </div>
      </section>
    </div>
  );
}
