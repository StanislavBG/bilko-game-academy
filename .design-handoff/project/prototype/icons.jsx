// Inline icon set — simple, geometric, friendly. No emoji.
function Icon({ name, size = 20, stroke = 1.75, className = '', style }) {
  const s = size;
  const common = {
    width: s, height: s, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
    className, style,
  };
  switch (name) {
    case 'home':       return <svg {...common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg>;
    case 'compass':    return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>;
    case 'trophy':     return <svg {...common}><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M5 5H3a3 3 0 0 0 4 3"/><path d="M19 5h2a3 3 0 0 1-4 3"/><path d="M9 14h6l-1 5h-4z"/><path d="M8 19h8"/></svg>;
    case 'user':       return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case 'gear':       return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a7.5 7.5 0 0 0 0-5l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-4.3-2.5L12 .5l-3 1.5a7.5 7.5 0 0 0-4.3 2.5l-2.4-1-2 3.5 2 1.5a7.5 7.5 0 0 0 0 5l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 4.3 2.5L12 23.5l3-1.5a7.5 7.5 0 0 0 4.3-2.5l2.4 1 2-3.5z"/></svg>;
    case 'gem':        return <svg {...common}><path d="m12 2 5 6-5 14L7 8z"/><path d="M2 8h20"/><path d="M7 8 12 2l5 6"/></svg>;
    case 'coin':       return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9 9h4a2 2 0 0 1 0 4H9"/><path d="M9 13h5a2 2 0 0 1 0 4H9"/><path d="M9 7v10"/></svg>;
    case 'map':        return <svg {...common}><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v16"/><path d="M15 6v16"/></svg>;
    case 'play':       return <svg {...common} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>;
    case 'lock':       return <svg {...common}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case 'check':      return <svg {...common}><path d="M5 12.5 10 17 19 7"/></svg>;
    case 'arrow-right':return <svg {...common}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>;
    case 'arrow-left': return <svg {...common}><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>;
    case 'flag':       return <svg {...common}><path d="M5 3v18"/><path d="M5 4h12l-2 4 2 4H5"/></svg>;
    case 'skull':      return <svg {...common}><path d="M5 11a7 7 0 1 1 14 0v4l-2 1v3h-3v-2h-4v2H7v-3l-2-1z"/><circle cx="9" cy="11" r="1.2" fill="currentColor"/><circle cx="15" cy="11" r="1.2" fill="currentColor"/></svg>;
    case 'fire':       return <svg {...common}><path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/></svg>;
    case 'flame':      return <svg {...common}><path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/></svg>;
    case 'shield':     return <svg {...common}><path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6z"/></svg>;
    case 'wind':       return <svg {...common}><path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h17a3 3 0 1 1-3 3"/><path d="M3 16h9"/></svg>;
    case 'star':       return <svg {...common}><path d="m12 3 2.7 5.5 6 .9-4.4 4.3 1.1 6L12 17l-5.4 2.7 1-6L3.3 9.4l6-.9z"/></svg>;
    case 'clover':     return <svg {...common}><path d="M12 12c0-3-3-4-3-7a3 3 0 0 1 6 0c0 3-3 4-3 7z"/><path d="M12 12c-3 0-4-3-7-3a3 3 0 0 0 0 6c3 0 4-3 7-3z"/><path d="M12 12c0 3 3 4 3 7a3 3 0 0 1-6 0c0-3 3-4 3-7z"/><path d="M12 12c3 0 4 3 7 3a3 3 0 0 0 0-6c-3 0-4 3-7 3z"/></svg>;
    case 'dice':       return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/></svg>;
    case 'bolt':       return <svg {...common}><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>;
    case 'wave':       return <svg {...common}><path d="M3 12c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3"/><path d="M3 18c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3"/></svg>;
    case 'volume':     return <svg {...common}><path d="M3 10v4h4l5 4V6L7 10z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>;
    case 'eye':        return <svg {...common}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'battery':    return <svg {...common}><rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4"/><path d="M6 10h6v4H6z" fill="currentColor"/></svg>;
    case 'anchor':     return <svg {...common}><circle cx="12" cy="5" r="2"/><path d="M12 7v14"/><path d="M5 14a7 7 0 0 0 14 0"/><path d="M3 14h4"/><path d="M17 14h4"/><path d="M9 11h6"/></svg>;
    case 'sparkle':    return <svg {...common}><path d="M12 3v6"/><path d="M12 15v6"/><path d="M3 12h6"/><path d="M15 12h6"/></svg>;
    case 'book':       return <svg {...common}><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-3a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h4z"/></svg>;
    case 'rocket':     return <svg {...common}><path d="M5 19c0-3 2-7 7-9s7-2 7-2-1 5-3 8-6 4-9 5z"/><circle cx="14" cy="10" r="1.5"/><path d="M5 19c-1 1-1 3 0 3s2-1 2-2"/></svg>;
    case 'plus':       return <svg {...common}><path d="M12 5v14"/><path d="M5 12h14"/></svg>;
    case 'pencil':     return <svg {...common}><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14 6l4 4"/></svg>;
    case 'dot':        return <svg {...common} fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6"/></svg>;
    default: return <svg {...common}/>;
  }
}

// Decorative compass rose for hero panel
function CompassRose({ size = 200 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1" opacity=".25"/>
      <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="1" opacity=".15"/>
      <g className="compass-rotate" style={{ transformOrigin: '100px 100px' }}>
        <path d="M100 14 L108 100 L100 186 L92 100 Z" fill="currentColor" opacity=".55"/>
        <path d="M14 100 L100 92 L186 100 L100 108 Z" fill="currentColor" opacity=".25"/>
        <path d="M40 40 L100 96 L160 40 L104 100 Z" fill="currentColor" opacity=".15"/>
        <path d="M40 160 L100 104 L160 160 L104 100 Z" fill="currentColor" opacity=".15"/>
      </g>
      <circle cx="100" cy="100" r="4" fill="currentColor"/>
    </svg>
  );
}

// Stage/scene placeholder — striped + label
function ScenePlaceholder({ label, tone = 'sea', height = 120 }) {
  const tones = {
    sea:    { from: '#bfd9e0', to: '#86b3bf', ink: '#143542' },
    delta:  { from: '#f5e1b4', to: '#e1b86d', ink: '#5a3f10' },
    fog:    { from: '#cdd9e2', to: '#7e94a6', ink: '#2a3946' },
    lava:   { from: '#f0c5ad', to: '#c5572f', ink: '#3b160a' },
  };
  const t = tones[tone] || tones.sea;
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
        position:'absolute', left: 12, bottom: 10,
        fontSize: 10, letterSpacing: '.08em', textTransform:'uppercase', opacity: .8,
      }}>{label}</div>
    </div>
  );
}

window.Icon = Icon;
window.CompassRose = CompassRose;
window.ScenePlaceholder = ScenePlaceholder;
