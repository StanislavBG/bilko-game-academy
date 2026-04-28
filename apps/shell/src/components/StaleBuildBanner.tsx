import { useEffect, useState } from 'react';

/**
 * Self-recovery for stale SW caches.
 *
 * When a new build deploys, a returning visitor's service worker can
 * keep serving the previous bundle. The previous bundle's lazy imports
 * point at chunk filenames that no longer exist on disk, so the next
 * dynamic `import()` rejects with "error loading dynamically imported
 * module".
 *
 * We listen for that rejection globally, drop the SW + caches, and
 * surface a "Reload" banner. One click fixes it without DevTools.
 */
const STALE_CHUNK_RE =
  /(error loading dynamically imported module|Failed to fetch dynamically imported module|ChunkLoadError)/i;

export function StaleBuildBanner(): JSX.Element | null {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    function flag(reason: unknown): void {
      const msg = reason instanceof Error ? reason.message : String(reason ?? '');
      if (STALE_CHUNK_RE.test(msg)) {
        setStale(true);
        // Best-effort: tear down SW + caches so the reload sees fresh JS.
        void clearStaleCaches();
      }
    }
    const onRejection = (e: PromiseRejectionEvent): void => flag(e.reason);
    const onError = (e: ErrorEvent): void => flag(e.error ?? e.message);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  if (!stale) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 99999,
        background: '#1a2733',
        color: '#f5e6c0',
        border: '1px solid #c79448',
        boxShadow: '0 6px 24px rgba(0,0,0,.35)',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
      }}
    >
      <span>A new version was deployed. Reload to load it.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          background: '#c79448', color: '#1a2733',
          border: 'none', borderRadius: 8,
          padding: '6px 12px',
          fontWeight: 700, fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Reload
      </button>
    </div>
  );
}

async function clearStaleCaches(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // Best-effort. If teardown fails, the user can still hard-reload.
  }
}
