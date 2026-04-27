import { useState } from 'react';
import { Icon } from '../design/Icon';
import { ENEMIES, WEAPONS, type ShellEnemy, type ShellWeapon } from '../data/boat-shooter-shell';

type Tab = 'enemies' | 'weapons' | 'bosses';

export function Encyclopedia(): JSX.Element {
  const [tab, setTab] = useState<Tab>('enemies');
  const [search, setSearch] = useState('');

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <header style={{ marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 6 }}>
          Field Notes · Boat Shooter
        </div>
        <h1 className="display" style={{ fontSize: 42, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
          Encyclopedia
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 8, maxWidth: 640 }}>
          Every enemy, weapon, and boss you'll meet on the river. Tap a card for the full read.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <TabButton active={tab === 'enemies'} onClick={() => setTab('enemies')} icon="flame"  label="Enemies"/>
        <TabButton active={tab === 'bosses'}  onClick={() => setTab('bosses')}  icon="skull"  label="Bosses"/>
        <TabButton active={tab === 'weapons'} onClick={() => setTab('weapons')} icon="bolt"   label="Weapons"/>
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: 'auto',
            padding: '10px 14px', minHeight: 40,
            borderRadius: 10, border: '1px solid var(--line)',
            background: 'var(--card)', color: 'var(--ink)',
            fontFamily: 'Inter', fontSize: 13, minWidth: 220,
          }}
        />
      </div>

      {tab === 'enemies' && <EnemyGrid items={ENEMIES.filter((e) => !e.isBoss && match(e.name + ' ' + e.faction, search))}/>}
      {tab === 'bosses'  && <EnemyGrid items={ENEMIES.filter((e) =>  e.isBoss && match(e.name + ' ' + e.faction, search))}/>}
      {tab === 'weapons' && <WeaponGrid items={WEAPONS.filter((w) => match(w.name + ' ' + w.kind, search))}/>}
    </div>
  );
}

function match(haystack: string, q: string): boolean {
  if (!q.trim()) return true;
  return haystack.toLowerCase().includes(q.toLowerCase());
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: 'flame' | 'skull' | 'bolt'; label: string;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={active ? 'btn btn-primary' : 'btn btn-ghost'}
      style={{ padding: '10px 16px', fontSize: 13 }}
    >
      <Icon name={icon} size={14}/>
      {label}
    </button>
  );
}

function EnemyGrid({ items }: { items: ReadonlyArray<ShellEnemy> }): JSX.Element {
  if (items.length === 0) return <Empty/>;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 14,
    }}>
      {items.map((e) => (
        <article key={e.id} className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div className="display" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{e.name}</div>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              {e.faction}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6, marginBottom: 10, lineHeight: 1.45 }}>{e.blurb}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <Stat label="HP"    value={e.hp}/>
            <Stat label="DMG"   value={e.dmg}/>
            <Stat label="SPEED" value={e.speed}/>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-mute)' }}>
            Acts: {e.acts.map((a) => `Act ${a}`).join(' · ')}
          </div>
        </article>
      ))}
    </div>
  );
}

function WeaponGrid({ items }: { items: ReadonlyArray<ShellWeapon> }): JSX.Element {
  if (items.length === 0) return <Empty/>;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 14,
    }}>
      {items.map((w) => (
        <article key={w.id} className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div className="display" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{w.name}</div>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              {w.kind}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.45 }}>{w.blurb}</div>
        </article>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div style={{ background: 'var(--card-2)', borderRadius: 8, padding: '6px 8px' }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>{label}</div>
      <div className="num" style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Empty(): JSX.Element {
  return <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--ink-mute)' }}>No matches.</div>;
}
