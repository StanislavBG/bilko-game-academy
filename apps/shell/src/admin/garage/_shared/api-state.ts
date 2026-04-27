import { useCallback, useEffect, useState } from 'react';
import type { ContentPack } from '@bilko/boat-shooter-schema';
import { getContent } from '../api-client';

export type ContentPackStatus =
  | { kind: 'loading' }
  | { kind: 'error'; reason: string }
  | { kind: 'ready'; pack: ContentPack };

export interface UseContentPackResult {
  status: ContentPackStatus;
  reload: () => void;
  setPack: (next: ContentPack) => void;
}

export function useContentPack(): UseContentPackResult {
  const [status, setStatus] = useState<ContentPackStatus>({ kind: 'loading' });

  const reload = useCallback(() => {
    setStatus({ kind: 'loading' });
    void (async () => {
      try {
        const pack = await getContent();
        setStatus({ kind: 'ready', pack });
      } catch (err) {
        setStatus({ kind: 'error', reason: err instanceof Error ? err.message : String(err) });
      }
    })();
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const setPack = useCallback((next: ContentPack) => {
    setStatus((s) => (s.kind === 'ready' ? { kind: 'ready', pack: next } : s));
  }, []);

  return { status, reload, setPack };
}
