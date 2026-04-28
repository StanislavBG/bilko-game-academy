import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Press `/` anywhere on the page to focus this input. */
  globalShortcut?: boolean;
}

/**
 * Compact search box for left-rail item lists. Esc clears. `/` focuses
 * (when `globalShortcut` is set), matching the GitHub / VS Code pattern.
 *
 * Stateless — the parent owns the query string.
 */
export function RailSearch({
  value, onChange, placeholder = 'Search…', globalShortcut = false,
}: Props): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!globalShortcut) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [globalShortcut]);

  return (
    <div className="px-3 py-2 border-b border-sea-700 relative">
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onChange('');
            ref.current?.blur();
          }
        }}
        className="w-full px-2 py-1.5 pr-7 bg-sea-950 border border-sea-700 rounded text-sea-100 text-xs focus:outline-none focus:border-gold-500 placeholder:text-sea-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-sea-500 hover:text-gold-400 text-xs"
        >
          ×
        </button>
      )}
    </div>
  );
}
