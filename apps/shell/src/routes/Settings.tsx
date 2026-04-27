import { useTranslation } from 'react-i18next';
import { useSettings } from '@bilko/platform-core/settings';
import { Icon } from '../design/Icon';

export function Settings(): JSX.Element {
  const { t } = useTranslation();
  const audio = useSettings((s) => s.audio);
  const display = useSettings((s) => s.display);
  const setSetting = useSettings((s) => s.set);

  return (
    <div className="page-enter scroll" style={{ height: '100%', padding: '32px 36px 56px', maxWidth: 720, margin: '0 auto' }}>
      <header style={{ marginBottom: 22 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
          Per-device · saved automatically
        </div>
        <h1 className="display" style={{ fontSize: 38, fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
          {t('settings.title')}
        </h1>
      </header>

      <section className="card" style={{ padding: 22, marginBottom: 18 }}>
        <SectionHead icon="volume" title={t('settings.audio')}/>
        <Slider label={t('settings.audio.master')} value={audio.masterVolume} onChange={(v) => setSetting('audio.masterVolume', v)}/>
        <Slider label={t('settings.audio.music')}  value={audio.musicVolume}  onChange={(v) => setSetting('audio.musicVolume', v)}/>
        <Slider label={t('settings.audio.sfx')}    value={audio.sfxVolume}    onChange={(v) => setSetting('audio.sfxVolume', v)}/>
      </section>

      <section className="card" style={{ padding: 22 }}>
        <SectionHead icon="eye" title={t('settings.display')}/>
        <Toggle label={t('settings.display.reducedMotion')} checked={display.reducedMotion} onChange={(v) => setSetting('display.reducedMotion', v)}/>
        <Toggle label={t('settings.display.highContrast')}  checked={display.highContrast}  onChange={(v) => setSetting('display.highContrast', v)}/>
        <Toggle label={t('settings.display.batterySaver')}  checked={display.batterySaver}  onChange={(v) => setSetting('display.batterySaver', v)}/>
      </section>
    </div>
  );
}

function SectionHead({ icon, title }: { icon: 'volume' | 'eye'; title: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <Icon name={icon} size={18} style={{ color: 'var(--gold-600)' }}/>
      <h2 className="display" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h2>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }): JSX.Element {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>{label}</span>
      <input
        type="range" min="0" max="1" step="0.05"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, maxWidth: 220, accentColor: 'var(--gold-500)' }}
      />
      <span className="num" style={{ width: 48, textAlign: 'right', fontSize: 13, color: 'var(--ink-soft)' }}>
        {Math.round(value * 100)}%
      </span>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <span style={{ fontSize: 14, color: 'var(--ink)' }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 20, height: 20, accentColor: 'var(--gold-500)' }}
      />
    </label>
  );
}
