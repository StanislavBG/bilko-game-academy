import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  token: string;
  onTokenChange: (value: string) => void;
  hasUnsaved: boolean;
  saving: boolean;
  saveError: string | null;
  onSaveAll: () => void;
  /** Roll back local edits to the last loaded pack. Optional — pages that
   *  don't implement it just won't show the Discard button. */
  onRevert?: () => void;
  /** Number of dirty sections (e.g. ships + ability-maps = 2). Surfaces in
   *  the Save All button as "(N)" so the dev knows scope at a glance. */
  dirtySectionCount?: number;
  /** Optional banner — e.g. green flash on save success. */
  flash?: { kind: 'success'; message: string } | null;
  body: ReactNode;
}

/**
 * Top-bar shell for every admin page.
 *
 * UX features:
 *  - Cmd/Ctrl+S triggers Save All (matches CMS muscle memory).
 *  - `beforeunload` warns the dev they have unsaved edits.
 *  - The admin token field is hidden behind a gear toggle by default
 *    (the local content-server allows writes from 127.0.0.1 without a
 *    token; the field is only useful if the dev opted into bearer auth).
 *  - "Discard" button next to Save All when dirty + onRevert is wired.
 *  - "(N)" badge on Save All shows how many sections are dirty.
 */
export function PageShell({
  title,
  token,
  onTokenChange,
  hasUnsaved,
  saving,
  saveError,
  onSaveAll,
  onRevert,
  dirtySectionCount,
  flash,
  body,
}: Props): JSX.Element {
  const [tokenOpen, setTokenOpen] = useState(false);

  // Cmd/Ctrl+S → Save All.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        if (hasUnsaved && !saving) {
          e.preventDefault();
          onSaveAll();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasUnsaved, saving, onSaveAll]);

  // Leave-page guard when there are unsaved edits.
  useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent): void => {
      e.preventDefault();
      // Modern browsers ignore custom strings but still show their own.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);

  // Common admin-UI papercut: scrolling a long form past a focused
  // <input type="number"> silently mutates the value via the mouse wheel.
  // Blur the input on wheel so scrolling moves the page, not the value.
  useEffect(() => {
    const handler = (e: WheelEvent): void => {
      const t = e.target as HTMLElement | null;
      if (t && t instanceof HTMLInputElement && t.type === 'number' && document.activeElement === t) {
        t.blur();
      }
    };
    window.addEventListener('wheel', handler, { passive: true });
    return () => window.removeEventListener('wheel', handler);
  }, []);

  return (
    <div className="flex flex-col h-full bg-sea-800 text-sea-50">
      <header className="px-4 py-3 border-b border-sea-700 bg-sea-900 flex items-center gap-3">
        <Link to="/" className="text-sea-300 hover:text-gold-400 text-sm">
          ← Shell
        </Link>
        <h1 className="font-display text-xl text-gold-400 flex-1">{title}</h1>

        {/* Token gear — collapsed by default; admin server is loopback-only. */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setTokenOpen((v) => !v)}
            title="Bearer token (optional)"
            aria-label="Bearer token"
            className={`w-8 h-8 rounded border text-sea-300 hover:text-gold-400 hover:border-gold-500 flex items-center justify-center text-sm ${
              tokenOpen ? 'border-gold-500 text-gold-400 bg-gold-500/10' : 'border-sea-700'
            }`}
          >
            ⚙
          </button>
          {tokenOpen && (
            <div className="absolute right-0 top-9 w-72 z-50 bg-sea-900 border border-sea-700 rounded-lg shadow-lg p-3">
              <div className="text-[11px] text-sea-300 mb-2 leading-snug">
                Bearer token. Optional — leave blank if the local server has no
                <code className="text-sea-400"> ADMIN_TOKEN</code> env var.
              </div>
              <input
                type="password"
                value={token}
                onChange={(e) => onTokenChange(e.target.value)}
                placeholder="(empty = no auth)"
                className="w-full px-2 py-1 bg-sea-950 border border-sea-700 rounded text-sea-100 text-xs focus:outline-none focus:border-gold-500"
              />
            </div>
          )}
        </div>

        {/* Discard — only when dirty + page implements onRevert. */}
        {hasUnsaved && onRevert && (
          <button
            type="button"
            onClick={() => {
              if (!saving && window.confirm('Discard all unsaved edits?')) onRevert();
            }}
            disabled={saving}
            title="Discard unsaved edits"
            className="px-3 py-1.5 rounded border border-sea-700 text-sea-300 hover:border-red-500 hover:text-red-300 text-sm uppercase tracking-wider transition-colors"
          >
            Discard
          </button>
        )}

        <button
          type="button"
          onClick={onSaveAll}
          disabled={!hasUnsaved || saving}
          title="Save All — Cmd/Ctrl+S"
          className={`px-4 py-1.5 rounded border text-sm uppercase tracking-wider transition-colors flex items-center gap-2 ${
            hasUnsaved && !saving
              ? 'border-gold-500 bg-gold-500/15 text-gold-400 hover:bg-gold-500/25'
              : 'border-sea-700 text-sea-500 cursor-not-allowed'
          }`}
        >
          <span>{saving ? 'Saving…' : hasUnsaved ? 'Save All' : 'Saved'}</span>
          {hasUnsaved && !saving && dirtySectionCount !== undefined && dirtySectionCount > 0 && (
            <span className="px-1.5 rounded bg-gold-500/30 text-gold-200 text-[11px] tabular-nums">
              {dirtySectionCount}
            </span>
          )}
          <span className="hidden md:inline text-[10px] text-sea-500 font-mono">
            ⌘S
          </span>
        </button>
      </header>

      {saveError && (
        <div className="px-4 py-2 bg-red-900/40 border-b border-red-700 text-red-200 text-sm">
          Save failed: {saveError}
        </div>
      )}
      {flash?.kind === 'success' && (
        <div className="px-4 py-2 bg-green-900/40 border-b border-green-700 text-green-200 text-sm">
          {flash.message}
        </div>
      )}

      {body}
    </div>
  );
}

interface BodyProps {
  loading: boolean;
  errorReason: string | null;
  onRetry: () => void;
  rail: ReactNode;
  main: ReactNode;
}

export function PageBody({ loading, errorReason, onRetry, rail, main }: BodyProps): JSX.Element {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sea-300">
        <div className="animate-pulse text-sm uppercase tracking-wider">Loading content…</div>
      </div>
    );
  }
  if (errorReason) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-lg border border-red-700 bg-red-900/30 p-5 text-red-100">
          <h2 className="font-display text-xl text-red-300 mb-2">Content server unreachable</h2>
          <p className="text-sm mb-3 break-words">{errorReason}</p>
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 rounded border border-red-400 text-red-100 hover:bg-red-800/40 text-sm uppercase tracking-wider"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex min-h-0">
      {rail}
      {main}
    </div>
  );
}
