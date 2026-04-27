import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createGameSave } from '@bilko/platform-core';
import { Icon } from '../design/Icon';
import { ScenePlaceholder } from '../design/ScenePlaceholder';
import { SHIPS } from '../data/boat-shooter-shell';

interface Progress { selectedShip?: string }

export function Shipyard(): JSX.Element {
  const [selected, setSelected] = useState<string>('ember-corsair');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const save = createGameSave('boat-shooter');
    void save.load<Progress>('progress', {}).then((p) => {
      setSelected(p?.selectedShip ?? 'ember-corsair');
      setHydrated(true);
    });
  }, []);

  function pick(id: string): void {
    setSelected(id);
    const save = createGameSave('boat-shooter');
    void save.load<Progress>('progress', {}).then((p) => {
      void save.save<Progress>('progress', { ...(p ?? {}), selectedShip: id });
    });
  }

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <header style={{ marginBottom: 22 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 6 }}>
          Pick your hero ship
        </div>
        <h1 className="display" style={{ fontSize: 42, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
          Shipyard
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 8, maxWidth: 640 }}>
          Each ship plays differently — fire weighting, hull, speed, luck. Switch any time between runs.
        </p>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 18,
      }}>
        {SHIPS.map((ship) => {
          const active = ship.id === selected;
          return (
            <article key={ship.id} className="card" style={{
              padding: 0, overflow: 'hidden',
              opacity: ship.unlocked ? 1 : .55,
              ...(active ? { borderColor: 'var(--gold-500)', boxShadow: '0 0 0 3px rgba(199,148,72,.18), var(--shadow-card)' } : {}),
            }}>
              <ScenePlaceholder label={`SHIP · ${ship.name.toUpperCase()}`} tone="sea" height={140}/>
              <div style={{ padding: 18 }}>
                <div className="display" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{ship.name}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.5 }}>{ship.tagline}</div>
                {!ship.unlocked && ship.unlockHint && (
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 10, fontStyle: 'italic' }}>
                    🔒 {ship.unlockHint}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  {ship.unlocked ? (
                    <button
                      type="button"
                      onClick={() => pick(ship.id)}
                      disabled={!hydrated}
                      className={active ? 'btn btn-gold' : 'btn btn-primary'}
                      style={{ flex: 1, padding: '10px 14px' }}
                    >
                      <Icon name={active ? 'check' : 'anchor'} size={14}/>
                      {active ? 'Selected' : 'Choose ship'}
                    </button>
                  ) : (
                    <button type="button" disabled className="btn btn-disabled" style={{ flex: 1, padding: '10px 14px' }}>
                      <Icon name="lock" size={14}/> Locked
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <Link to="/game/boat-shooter" className="btn btn-gold" style={{ padding: '12px 18px' }}>
          <Icon name="play" size={14}/> Sail with this ship
        </Link>
      </div>
    </div>
  );
}
