import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/** Outer frame for admin routes — dark sidebar + striped ADMIN ribbon
 *  marks visually that this is a separate app. Existing admin pages
 *  (/admin/boat-shooter/garage etc.) own their own page chrome and
 *  render inside the <Outlet/>. */
export function AdminFrame(): JSX.Element {
  return (
    <div className="app-shell density-roomy">
      <Sidebar
        mode="admin"
        currency={{ gems: 0, mapFragments: 0, rank: 0, cleared: 0 }}
      />
      <main style={{
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <AdminRibbon/>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Outlet/>
        </div>
      </main>
    </div>
  );
}

function AdminRibbon(): JSX.Element {
  return (
    <div style={{
      height: 28,
      flexShrink: 0,
      background:
        'repeating-linear-gradient(135deg, var(--gold-500) 0 12px, #1a2733 12px 24px)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '.18em',
      textTransform: 'uppercase',
      textShadow: '0 1px 0 rgba(0,0,0,.4)',
    }}>
      <span>ADMIN</span>
      <span style={{ opacity: .8 }}>·</span>
      <span>Configuration governance</span>
      <span style={{ opacity: .8 }}>·</span>
      <span>Internal tool</span>
    </div>
  );
}
