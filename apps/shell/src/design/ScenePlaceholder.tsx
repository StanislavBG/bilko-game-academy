export type SceneTone = 'sea' | 'delta' | 'fog' | 'lava';

interface Props {
  label: string;
  tone?: SceneTone;
  height?: number;
}

const TONES: Record<SceneTone, { from: string; to: string; ink: string }> = {
  sea:   { from: '#bfd9e0', to: '#86b3bf', ink: '#143542' },
  delta: { from: '#f5e1b4', to: '#e1b86d', ink: '#5a3f10' },
  fog:   { from: '#cdd9e2', to: '#7e94a6', ink: '#2a3946' },
  lava:  { from: '#f0c5ad', to: '#c5572f', ink: '#3b160a' },
};

/** Stripe-tinted placeholder for stage / hero artwork. The real game uses
 *  Phaser canvases; in shell HTML routes we use this so the design reads
 *  the same as the prototype handoff. */
export function ScenePlaceholder({ label, tone = 'sea', height = 120 }: Props): JSX.Element {
  const t = TONES[tone];
  return (
    <div style={{
      position: 'relative',
      height,
      borderRadius: 12,
      overflow: 'hidden',
      background: `linear-gradient(160deg, ${t.from}, ${t.to})`,
      color: t.ink,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,.05) 0 8px, transparent 8px 16px)',
      }}/>
      <div className="mono" style={{
        position: 'absolute', left: 12, bottom: 10,
        fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .8,
      }}>{label}</div>
    </div>
  );
}
