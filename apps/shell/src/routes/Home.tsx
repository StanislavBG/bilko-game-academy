import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createGameSave } from '@bilko/platform-core';
import { Icon } from '../design/Icon';
import { CompassRose } from '../design/CompassRose';
import { ScenePlaceholder } from '../design/ScenePlaceholder';
import { BOAT_SHOOTER_STAGES, SHIPS, type ShellStage } from '../data/boat-shooter-shell';

interface BoatShooterProgress {
  stagesCleared?: string[];
  gems?: number;
  selectedShip?: string;
}

interface DailySnapshot { dateKey: string; shipName: string; modifierLabel: string; modifierBlurb: string }

const DAILY_MODIFIERS: ReadonlyArray<{ id: string; label: string; blurb: string }> = [
  { id: 'permanent-fog',     label: 'Permanent Fog',     blurb: 'Heavy mist for the entire run.' },
  { id: 'double-kamikaze',   label: 'Double Kamikaze',   blurb: 'Twice the powder-keg boats.' },
  { id: 'no-repairs',        label: 'No Repairs',        blurb: 'Repair Kits are disabled.' },
  { id: 'double-crit',       label: 'Bloodied Sights',   blurb: '+100% crit chance. Every shot is a roll of the dice.' },
  { id: 'triple-swarms',     label: 'Triple Swarms',     blurb: 'Cursed Swarms come in waves of three.' },
  { id: 'rapid-bosses',      label: 'Rapid Bosses',      blurb: 'Bosses fire 1.5× faster.' },
  { id: 'double-projectiles',label: 'Enemy Double-Shot', blurb: 'Every enemy fires twice.' },
  { id: 'halved-hp',         label: 'Halved HP',         blurb: 'Your maxHp is halved — speed kills.' },
];
const DAILY_SHIPS = ['Ember Corsair', 'Tempest Fury', 'Frostbound', 'Verdant Tide', 'Nightwake'] as const;

function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((today - start) / 86_400_000) + 1;
}
function currentDaily(): DailySnapshot {
  const now = new Date();
  const seed = ((dayOfYearUTC(now) * 997) + (now.getUTCFullYear() * 11)) % 2_147_483_648;
  const ship = DAILY_SHIPS[seed % DAILY_SHIPS.length] ?? DAILY_SHIPS[0]!;
  const mod = DAILY_MODIFIERS[Math.floor((seed * 31) % DAILY_MODIFIERS.length)] ?? DAILY_MODIFIERS[0]!;
  const y = now.getUTCFullYear().toString().padStart(4, '0');
  const m = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  return { dateKey: `${y}-${m}-${day}`, shipName: ship, modifierLabel: mod.label, modifierBlurb: mod.blurb };
}

export function Home(): JSX.Element {
  const [progress, setProgress] = useState<BoatShooterProgress | null>(null);
  useEffect(() => {
    const save = createGameSave('boat-shooter');
    void save.load<BoatShooterProgress>('progress', {}).then(setProgress);
  }, []);

  const cleared = useMemo(() => new Set(progress?.stagesCleared ?? []), [progress]);
  const nextStage = useMemo(() => BOAT_SHOOTER_STAGES.find((s) => !cleared.has(s.id)), [cleared]);
  const progressPct = Math.round((cleared.size / BOAT_SHOOTER_STAGES.length) * 100);
  const ship = SHIPS.find((s) => s.id === (progress?.selectedShip ?? 'ember-corsair')) ?? SHIPS[0]!;
  const daily = useMemo(currentDaily, []);
  const gems = progress?.gems ?? 0;

  const continueLink = nextStage ? `/game/boat-shooter?stage=${nextStage.n}` : '/game/boat-shooter';

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px' }}>
      {/* HERO */}
      <div className="card paper-grain" style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr .9fr',
        overflow: 'hidden',
        marginBottom: 28,
        background: 'linear-gradient(135deg, #102a37 0%, #1f4754 60%, #2a6376 100%)',
        color: '#f5ede0',
        borderColor: 'transparent',
        minHeight: 360,
      }}>
        <div style={{ padding: '40px 44px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span className="pill" style={{
              background: 'rgba(224,176,99,.15)',
              borderColor: 'rgba(224,176,99,.4)',
              color: 'var(--gold-300)',
            }}>Now playing</span>
            <span className="mono" style={{
              fontSize: 11, color: 'rgba(255,255,255,.55)',
              letterSpacing: '.08em', textTransform: 'uppercase',
            }}>v0.4 · campaign</span>
          </div>

          <h1 className="display" style={{
            fontSize: 'clamp(40px, 5.4vw, 68px)',
            fontWeight: 700,
            lineHeight: .95,
            letterSpacing: '-0.025em',
            margin: '0 0 14px',
          }}>
            Boat Shooter
          </h1>
          <p style={{
            fontSize: 17, lineHeight: 1.5,
            color: 'rgba(255,255,255,.78)', maxWidth: 480,
            margin: '0 0 28px',
          }}>
            A top-down arcade shmup with weapon-stacking. Sail down the river, pick up cannons,
            lightning, harpoons — they all fire at once. Survive 15 stages and slay the Kraken.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            <Link to={continueLink} className="btn btn-gold" style={{ padding: '14px 22px', fontSize: 15 }}>
              <Icon name="play" size={18}/>
              {cleared.size === 0 ? 'Start campaign' : `Continue · Stage ${nextStage?.n}`}
            </Link>
            <Link to="/campaign" className="btn btn-ghost" style={{
              borderColor: 'rgba(255,255,255,.2)',
              color: '#fff', background: 'rgba(255,255,255,.08)',
            }}>
              <Icon name="map" size={16}/>
              View campaign map
            </Link>
          </div>

          <div style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span className="mono" style={{
                fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,.6)',
              }}>Campaign progress</span>
              <span className="num" style={{ fontWeight: 700, fontSize: 14, color: 'var(--gold-300)' }}>
                {cleared.size}/{BOAT_SHOOTER_STAGES.length}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progressPct}%`,
                background: 'linear-gradient(90deg, var(--gold-500), var(--gold-300))',
                borderRadius: 999, transition: 'width .4s ease',
              }}/>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
              <span><strong style={{ color: '#fff' }} className="num">{cleared.size}</strong> stages cleared</span>
              <span>·</span>
              <span><strong style={{ color: '#fff' }} className="num">{gems}</strong> gems banked</span>
              <span>·</span>
              <span>Ship: <strong style={{ color: 'var(--gold-300)' }}>{ship.name}</strong></span>
            </div>
          </div>
        </div>

        {/* Hero artwork side */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(224,176,99,.18), transparent 60%)',
        }}>
          <div style={{
            position: 'absolute', inset: 0, color: 'var(--gold-400)',
            opacity: .35, display: 'grid', placeItems: 'center',
          }}>
            <CompassRose size={340}/>
          </div>
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 260, height: 200,
          }}>
            <ScenePlaceholder label="HERO · BOAT vs KRAKEN" tone="sea" height={200}/>
          </div>
          <svg width="100%" height="60" style={{
            position: 'absolute', bottom: 0, left: 0,
            opacity: .2, color: 'var(--gold-300)',
          }} viewBox="0 0 400 60" preserveAspectRatio="none">
            <path d="M0,40 C50,20 100,55 150,35 C200,15 250,50 300,30 C350,10 400,45 450,25" stroke="currentColor" strokeWidth="1" fill="none"/>
            <path d="M0,50 C50,30 100,65 150,45 C200,25 250,60 300,40 C350,20 400,55 450,35" stroke="currentColor" strokeWidth="1" fill="none"/>
          </svg>
        </div>
      </div>

      {/* THREE-PANEL ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 18, marginBottom: 28,
      }}>
        <DailyCard daily={daily}/>
        <NextStageCard nextStage={nextStage}/>
        <ShipCard shipName={ship.name} shipTagline={ship.tagline}/>
      </div>

      {/* QUICK ACTIONS */}
      <div className="display" style={{ fontSize: 22, fontWeight: 700, margin: '20px 0 14px' }}>Quick actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <ActionCard icon="compass" title="Campaign map"  blurb="See all 15 stages and replay any."         to="/campaign"/>
        <ActionCard icon="anchor"  title="Shipyard"      blurb={`Choose your hero ship. ${SHIPS.filter(s=>s.unlocked).length} unlocked.`} to="/shipyard"/>
        <ActionCard icon="gem"     title="Spend gems"    blurb={`${gems} banked. 7 upgrade tracks.`}        to="/meta/boat-shooter"/>
        <ActionCard icon="trophy"  title="Leaderboards"  blurb="Daily, campaign, boss times."               to="/leaderboards"/>
      </div>
    </div>
  );
}

function DailyCard({ daily }: { daily: DailySnapshot }): JSX.Element {
  return (
    <Link to="/game/boat-shooter?daily=1" className="card paper-grain" style={{
      padding: 20, background: 'var(--card-2)',
      position: 'relative', overflow: 'hidden',
      textDecoration: 'none', color: 'inherit', display: 'block',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, color: 'var(--gold-400)', opacity: .15 }}>
        <CompassRose size={140}/>
      </div>
      <div className="pill" style={{
        background: 'rgba(224,176,99,.18)', borderColor: 'var(--gold-500)', color: 'var(--gold-700)',
      }}>Today's run</div>
      <div className="display" style={{ fontSize: 26, fontWeight: 700, margin: '10px 0 4px' }}>Daily Seed</div>
      <div className="mono" style={{
        fontSize: 11, color: 'var(--ink-mute)',
        textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12,
      }}>{daily.dateKey} · UTC</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        <div><strong>Ship:</strong> {daily.shipName}</div>
        <div><strong>Modifier:</strong> {daily.modifierLabel}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-mute)' }}>{daily.modifierBlurb}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 16 }}>
        <span className="btn btn-primary" style={{ padding: '10px 16px' }}>
          <Icon name="play" size={14}/> Run today
        </span>
      </div>
    </Link>
  );
}

function NextStageCard({ nextStage }: { nextStage: ShellStage | undefined }): JSX.Element {
  if (!nextStage) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div className="pill">Campaign</div>
        <div className="display" style={{ fontSize: 22, fontWeight: 700, marginTop: 10 }}>All clear, captain.</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
          You've cleared every stage. Try NG+ or chase a daily seed.
        </div>
      </div>
    );
  }
  const tone = nextStage.act === 1 ? 'delta' : nextStage.act === 2 ? 'fog' : 'lava';
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="pill">Next stage</div>
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <ScenePlaceholder label={`STAGE ${nextStage.n} · ${nextStage.biome.toUpperCase()}`} tone={tone} height={96}/>
      </div>
      <div className="display" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
        {nextStage.n}. {nextStage.name}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, marginBottom: 14 }}>{nextStage.tagline}</div>
      <Link to={`/game/boat-shooter?stage=${nextStage.n}`} className="btn btn-primary" style={{ width: '100%' }}>
        <Icon name="play" size={14}/> Sail to {nextStage.name}
      </Link>
    </div>
  );
}

function ShipCard({ shipName, shipTagline }: { shipName: string; shipTagline: string }): JSX.Element {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="pill">Your ship</div>
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <ScenePlaceholder label={`SHIP · ${shipName.toUpperCase()}`} tone="sea" height={96}/>
      </div>
      <div className="display" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{shipName}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, marginBottom: 14 }}>{shipTagline}</div>
      <Link to="/shipyard" className="btn btn-ghost" style={{ width: '100%' }}>
        <Icon name="anchor" size={14}/> Change ship
      </Link>
    </div>
  );
}

function ActionCard({
  icon, title, blurb, to,
}: {
  icon: 'compass' | 'anchor' | 'gem' | 'trophy';
  title: string; blurb: string; to: string;
}): JSX.Element {
  return (
    <Link to={to} className="card" style={{
      padding: 18, textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'var(--card)',
      transition: 'transform .12s ease, border-color .15s, box-shadow .15s',
      textDecoration: 'none', color: 'inherit',
    }}>
      <div style={{
        width: 44, height: 44, flexShrink: 0,
        borderRadius: 12, background: 'var(--card-2)',
        display: 'grid', placeItems: 'center', color: 'var(--ink)',
      }}>
        <Icon name={icon} size={22}/>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2, lineHeight: 1.4 }}>{blurb}</div>
      </div>
      <Icon name="arrow-right" size={16} style={{ color: 'var(--ink-mute)' }}/>
    </Link>
  );
}
