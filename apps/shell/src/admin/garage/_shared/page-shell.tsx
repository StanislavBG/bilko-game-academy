import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  token: string;
  onTokenChange: (value: string) => void;
  hasUnsaved: boolean;
  saving: boolean;
  saveError: string | null;
  onSaveAll: () => void;
  /** Optional banner — e.g. green flash on save success. */
  flash?: { kind: 'success'; message: string } | null;
  body: ReactNode;
}

export function PageShell({
  title,
  token,
  onTokenChange,
  hasUnsaved,
  saving,
  saveError,
  onSaveAll,
  flash,
  body,
}: Props): JSX.Element {
  return (
    <div className="flex flex-col h-screen bg-sea-800 text-sea-50">
      <header className="px-4 py-3 border-b border-sea-700 bg-sea-900 flex items-center gap-4">
        <Link to="/" className="text-sea-300 hover:text-gold-400 text-sm">
          ← Shell
        </Link>
        <h1 className="font-display text-xl text-gold-400 flex-1">{title}</h1>
        <label className="flex items-center gap-2 text-xs text-sea-300">
          <span>Admin token</span>
          <input
            type="password"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            placeholder="bearer"
            className="w-48 px-2 py-1 bg-sea-950 border border-sea-700 rounded text-sea-100 text-xs focus:outline-none focus:border-gold-500"
          />
        </label>
        <button
          type="button"
          onClick={onSaveAll}
          disabled={!hasUnsaved || saving}
          className={`px-4 py-1.5 rounded border text-sm uppercase tracking-wider transition-colors ${
            hasUnsaved && !saving
              ? 'border-gold-500 bg-gold-500/15 text-gold-400 hover:bg-gold-500/25'
              : 'border-sea-700 text-sea-500 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving…' : hasUnsaved ? 'Save All' : 'Saved'}
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
