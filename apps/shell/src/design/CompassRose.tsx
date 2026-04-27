interface Props { size?: number }

/** Decorative compass-rose for hero panels. Rotates slowly via CSS. */
export function CompassRose({ size = 200 }: Props): JSX.Element {
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
