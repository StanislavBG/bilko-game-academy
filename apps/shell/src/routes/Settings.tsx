import { useTranslation } from 'react-i18next';
import { useSettings } from '@bilko/platform-core/settings';

export function Settings(): JSX.Element {
  const { t } = useTranslation();
  const audio = useSettings((s) => s.audio);
  const display = useSettings((s) => s.display);
  const setSetting = useSettings((s) => s.set);

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-8">
      <h2 className="font-display text-3xl text-gold-400">{t('settings.title')}</h2>

      <section>
        <h3 className="font-display text-xl mb-3">{t('settings.audio')}</h3>
        <Slider
          label={t('settings.audio.master')}
          value={audio.masterVolume}
          onChange={(v) => setSetting('audio.masterVolume', v)}
        />
        <Slider
          label={t('settings.audio.music')}
          value={audio.musicVolume}
          onChange={(v) => setSetting('audio.musicVolume', v)}
        />
        <Slider
          label={t('settings.audio.sfx')}
          value={audio.sfxVolume}
          onChange={(v) => setSetting('audio.sfxVolume', v)}
        />
      </section>

      <section>
        <h3 className="font-display text-xl mb-3">{t('settings.display')}</h3>
        <Toggle
          label={t('settings.display.reducedMotion')}
          checked={display.reducedMotion}
          onChange={(v) => setSetting('display.reducedMotion', v)}
        />
        <Toggle
          label={t('settings.display.highContrast')}
          checked={display.highContrast}
          onChange={(v) => setSetting('display.highContrast', v)}
        />
        <Toggle
          label={t('settings.display.batterySaver')}
          checked={display.batterySaver}
          onChange={(v) => setSetting('display.batterySaver', v)}
        />
      </section>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}): JSX.Element {
  return (
    <label className="flex items-center justify-between py-2 gap-6">
      <span className="text-sea-100">{label}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 max-w-xs accent-gold-500"
      />
      <span className="text-sea-300 tabular-nums w-12 text-right">
        {Math.round(value * 100)}%
      </span>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sea-100">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-gold-500"
      />
    </label>
  );
}
