import { useCallback, useMemo, useState } from 'react';

export interface DirtyTracker<T> {
  value: T;
  set: (next: T) => void;
  isDirty: boolean;
  markClean: (cleanValue?: T) => void;
  dirtyKeys: ReadonlySet<string>;
  setDirtyKeys: (keys: ReadonlySet<string>) => void;
}

export function useDirty<T>(initial: T): DirtyTracker<T> {
  const [value, setValue] = useState<T>(initial);
  const [baseline, setBaseline] = useState<T>(initial);
  const [dirtyKeys, setDirtyKeysState] = useState<ReadonlySet<string>>(() => new Set<string>());

  const isDirty = useMemo(() => value !== baseline || dirtyKeys.size > 0, [value, baseline, dirtyKeys]);

  const set = useCallback((next: T) => {
    setValue(next);
  }, []);

  const markClean = useCallback((cleanValue?: T) => {
    if (cleanValue !== undefined) {
      setValue(cleanValue);
      setBaseline(cleanValue);
    } else {
      setBaseline(value);
    }
    setDirtyKeysState(new Set<string>());
  }, [value]);

  const setDirtyKeys = useCallback((keys: ReadonlySet<string>) => {
    setDirtyKeysState(keys);
  }, []);

  return { value, set, isDirty, markClean, dirtyKeys, setDirtyKeys };
}
