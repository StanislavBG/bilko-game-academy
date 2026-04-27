import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '../design/Icon';
import { getContent } from '../admin/garage/api-client';

interface PackStats {
  stages: number;
  enemies: number;
  weapons: number;
  passives: number;
  ships: number;
  environments: number;
  sprites: number;
}

export function AdminDashboard(): JSX.Element {
  const [stats, setStats] = useState<PackStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverUp, setServerUp] = useState<boolean | null>(null);

  useEffect(() => {
    void getContent()
      .then((pack) => {
        setStats({
          stages: pack.stages.length,
          enemies: pack.enemies.length,
          weapons: pack.weapons.length,
          passives: pack.passives.length,
          ships: pack.ships.length,
          environments: pack.environments.length,
          sprites: pack.sprites.entries.length,
        });
        setServerUp(true);
      })
      .catch((err) => {
        setServerUp(false);
        setError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '24px 32px 48px', background: 'var(--bg)' }}>
      <header style={{ marginBottom: 22 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
          Configuration governance
        </div>
        <h1 className="display" style={{ fontSize: 38, fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
          Admin Dashboard
        </h1>
      </header>

      <section className="card" style={{ padding: 18, marginBottom: 18, background: serverUp === false ? 'rgba(181,69,69,.08)' : 'var(--card-2)', borderColor: serverUp === false ? 'rgba(181,69,69,.4)' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 10, height: 10, borderRadius: 999,
            background: serverUp === null ? 'var(--ink-mute)' : serverUp ? 'var(--leaf)' : 'var(--crimson)',
          }}/>
          <strong>{serverUp === null ? 'Checking content server…' : serverUp ? 'Content server reachable' : 'Content server offline'}</strong>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '.06em' }}>
            {import.meta.env.VITE_CONTENT_SERVER_URL ?? 'http://localhost:3001'}
          </span>
        </div>
        {serverUp === false && (
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8, lineHeight: 1.4 }}>
            Edits won't persist until the server is up. Run <code>pnpm --filter @bilko/content-server dev</code>.
            <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>{error}</div>
          </div>
        )}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 14 }}>
            <DashStat label="Stages"       value={stats.stages}/>
            <DashStat label="Environments" value={stats.environments}/>
            <DashStat label="Enemies"      value={stats.enemies}/>
            <DashStat label="Weapons"      value={stats.weapons}/>
            <DashStat label="Passives"     value={stats.passives}/>
            <DashStat label="Ships"        value={stats.ships}/>
            <DashStat label="Sprites"      value={stats.sprites}/>
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <ConsoleTile to="/admin/boat-shooter/garage"       icon="anchor"  label="Ships"       sub="Stats · sprite · evolution · loadout"/>
        <ConsoleTile to="/admin/boat-shooter/enemy-lair"   icon="flame"   label="Enemies"     sub="Stats · drops · attack patterns"/>
        <ConsoleTile to="/admin/boat-shooter/abilities"    icon="bolt"    label="Weapons"     sub="Curves · element · sprite icons"/>
        <ConsoleTile to="/admin/boat-shooter/levels"       icon="compass" label="Stages"      sub="Wave timeline · enemy formula"/>
        <ConsoleTile to="/admin/boat-shooter/environments" icon="gem"     label="Economy"     sub="Water · weather · scenery"/>
        <ConsoleTile to="/admin/publish"                   icon="rocket"  label="Publish"     sub="Push overlay to live"/>
      </section>
    </div>
  );
}

function DashStat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>{label}</div>
      <div className="num" style={{ fontWeight: 700, fontSize: 18, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function ConsoleTile({
  to, icon, label, sub,
}: {
  to: string; icon: IconName; label: string; sub: string;
}): JSX.Element {
  return (
    <Link to={to} className="card" style={{
      padding: 16, display: 'flex', alignItems: 'center', gap: 12,
      textDecoration: 'none', color: 'inherit',
    }}>
      <div style={{
        width: 44, height: 44, flexShrink: 0,
        borderRadius: 12, background: 'var(--card-2)',
        display: 'grid', placeItems: 'center', color: 'var(--gold-700)',
      }}>
        <Icon name={icon} size={22}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
      </div>
      <Icon name="arrow-right" size={16} style={{ color: 'var(--ink-mute)' }}/>
    </Link>
  );
}
