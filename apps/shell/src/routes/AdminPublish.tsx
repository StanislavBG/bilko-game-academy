import { Icon } from '../design/Icon';

export function AdminPublish(): JSX.Element {

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '24px 32px 48px', background: 'var(--bg)' }}>
      <header style={{ marginBottom: 22 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
          Edits land on disk · git is source of truth
        </div>
        <h1 className="display" style={{ fontSize: 38, fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
          Local-only Workflow
        </h1>
      </header>

      <section className="card" style={{ padding: 22, maxWidth: 760, marginBottom: 18 }}>
        <div className="display" style={{ fontWeight: 700, fontSize: 20, marginBottom: 10 }}>How edits flow</div>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          <li>You edit ship stats, enemies, levels, sprites in the admin tabs.</li>
          <li>The local content server (port 3001, bound to <code>127.0.0.1</code>) saves the change directly to:
            <ul style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-mute)' }}>
              <li><code>packages/boat-shooter-content/data/&lt;section&gt;.json</code></li>
              <li><code>apps/games/boat-shooter/assets/sprites/&lt;id&gt;.png</code></li>
            </ul>
          </li>
          <li>Vite HMR picks the change up; the running game previews it instantly.</li>
          <li>You review with <code className="mono">git status</code> + <code className="mono">git diff</code>.</li>
          <li>You <code className="mono">git commit</code> + <code className="mono">git push</code>. Production builds bundle the new JSON.</li>
        </ol>
      </section>

      <section className="card" style={{ padding: 22, maxWidth: 760, marginBottom: 18, background: 'var(--card-2)' }}>
        <div className="display" style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>What's preview-only in production</div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          <li>The admin app routes don't ship in production builds — only the player app does.</li>
          <li>The game runtime in production reads bundled JSON only; it doesn't try to fetch from any server.</li>
          <li>The content server is a local dev tool. Don't deploy it.</li>
        </ul>
      </section>

      <section className="card" style={{ padding: 22, maxWidth: 760 }}>
        <div className="display" style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Run the dev server</div>
        <pre className="mono" style={{
          background: '#101a23', color: '#dde6ee', padding: 14,
          borderRadius: 10, fontSize: 12, lineHeight: 1.6, overflow: 'auto',
        }}>
{`# Terminal 1 — admin write API (writes to canonical JSON in git)
pnpm --filter @bilko/content-server dev

# Terminal 2 — shell + Phaser game
pnpm --filter @bilko/shell dev`}
        </pre>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <a href="https://github.com/StanislavBG/bilko-game-academy" target="_blank" rel="noreferrer" className="btn btn-ghost">
            <Icon name="book" size={14}/> View repo
          </a>
        </div>
      </section>
    </div>
  );
}
