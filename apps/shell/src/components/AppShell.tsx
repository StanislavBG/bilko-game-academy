import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { createGameSave } from '@bilko/platform-core';
import { Sidebar } from './Sidebar';

interface BoatShooterProgress {
  stagesCleared?: string[];
  gems?: number;
  mapFragments?: number;
}

/** Outer frame for player routes — left rail + main content. The sidebar
 *  reads progress from the boat-shooter save to render the captain card. */
export function AppShell(): JSX.Element {
  const [progress, setProgress] = useState<BoatShooterProgress | null>(null);
  useEffect(() => {
    const save = createGameSave('boat-shooter');
    void save.load<BoatShooterProgress>('progress', {}).then(setProgress);
  }, []);

  const cleared = progress?.stagesCleared?.length ?? 0;
  const gems = progress?.gems ?? 0;
  const mapFragments = progress?.mapFragments ?? 0;
  const rank = Math.max(1, Math.floor(cleared / 3) + 1);

  return (
    <div className="app-shell density-roomy">
      <Sidebar
        mode="player"
        currency={{ gems, mapFragments, rank, cleared }}
      />
      <main style={{ overflow: 'hidden', position: 'relative' }}>
        <Outlet />
      </main>
    </div>
  );
}
