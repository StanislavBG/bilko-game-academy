import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createGameSave } from '@bilko/platform-core';
import { Icon } from '../design/Icon';
import { ScenePlaceholder } from '../design/ScenePlaceholder';
import { ACTS, BOAT_SHOOTER_STAGES, type ShellStage } from '../data/boat-shooter-shell';

interface Progress { stagesCleared?: string[] }

export function Campaign(): JSX.Element {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    const save = createGameSave('boat-shooter');
    void save.load<Progress>('progress', {}).then(setProgress);
  }, []);

  const cleared = useMemo(() => new Set(progress?.stagesCleared ?? []), [progress]);
  const unlockedThrough = BOAT_SHOOTER_STAGES.reduce((acc, s, idx) => {
    if (idx === 0) return 1;
    const prev = BOAT_SHOOTER_STAGES[idx - 1]!;
    return cleared.has(prev.id) ? s.n : acc;
  }, 1);

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      <header style={{ marginBottom: 28, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 6 }}>
            Boat Shooter · 15 stages · 3 acts
          </div>
          <h1 className="display" style={{ fontSize: 42, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Campaign Map
          </h1>
        </div>
        <div className="num" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          <strong style={{ color: 'var(--ink)' }}>{cleared.size}</strong> / {BOAT_SHOOTER_STAGES.length} cleared
        </div>
      </header>

      {ACTS.map((act) => {
        const stages = BOAT_SHOOTER_STAGES.filter((s) => s.act === act.n);
        return (
          <section key={act.n} style={{ marginBottom: 36 }}>
            <ActHeader act={act}/>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14, marginTop: 14,
            }}>
              {stages.map((s) => (
                <StageTile
                  key={s.id}
                  stage={s}
                  cleared={cleared.has(s.id)}
                  locked={s.n > unlockedThrough}
                  isNext={s.n === unlockedThrough && !cleared.has(s.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ActHeader({ act }: { act: typeof ACTS[number] }): JSX.Element {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px', borderRadius: 14,
      background: act.bg,
      border: `1px solid ${act.color}33`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: act.color, color: '#fff',
        display: 'grid', placeItems: 'center',
        fontFamily: 'Fraunces, serif', fontWeight: 800, fontSize: 18,
      }}>{act.n}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="display" style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.1 }}>{act.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{act.blurb}</div>
      </div>
    </div>
  );
}

function StageTile({
  stage, cleared, locked, isNext,
}: {
  stage: ShellStage; cleared: boolean; locked: boolean; isNext: boolean;
}): JSX.Element {
  const tone = stage.act === 1 ? 'delta' : stage.act === 2 ? 'fog' : 'lava';

  const inner = (
    <>
      <ScenePlaceholder label={`STAGE ${stage.n} · ${stage.biome.toUpperCase()}`} tone={tone} height={96}/>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
            Stage {stage.n} · Act {stage.act}
          </div>
          <Status cleared={cleared} locked={locked} isNext={isNext}/>
        </div>
        <div className="display" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1, marginTop: 6 }}>{stage.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.45 }}>{stage.tagline}</div>
        {stage.boss && (
          <div className="pill" style={{ marginTop: 10, color: 'var(--crimson)', borderColor: 'rgba(181,69,69,.4)' }}>
            <Icon name="skull" size={11}/> Boss · {stage.boss}
          </div>
        )}
      </div>
    </>
  );

  const baseStyle: React.CSSProperties = {
    padding: 0, overflow: 'hidden',
    display: 'block',
    textDecoration: 'none', color: 'inherit',
    transition: 'transform .12s ease, border-color .15s, box-shadow .15s',
  };

  if (locked) {
    return (
      <div className="card" style={{ ...baseStyle, opacity: .55 }}>
        {inner}
      </div>
    );
  }
  return (
    <Link
      to={`/game/boat-shooter?stage=${stage.n}`}
      className="card"
      style={{
        ...baseStyle,
        ...(isNext ? { borderColor: 'var(--gold-500)', boxShadow: '0 0 0 3px rgba(199,148,72,.18), var(--shadow-card)' } : {}),
      }}
    >
      {inner}
    </Link>
  );
}

function Status({ cleared, locked, isNext }: { cleared: boolean; locked: boolean; isNext: boolean }): JSX.Element {
  if (cleared) return <span className="pill" style={{ color: 'var(--leaf)', borderColor: 'rgba(79,138,74,.4)' }}><Icon name="check" size={11}/> Cleared</span>;
  if (locked)  return <span className="pill" style={{ color: 'var(--ink-mute)' }}><Icon name="lock"  size={11}/> Locked</span>;
  if (isNext)  return <span className="pill" style={{ color: 'var(--gold-700)', borderColor: 'var(--gold-500)' }}><Icon name="play"  size={11}/> Next</span>;
  return <span className="pill"><Icon name="dot" size={10}/> Ready</span>;
}
