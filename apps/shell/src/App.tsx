import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './routes/Home';
import { GameLauncher } from './routes/GameLauncher';
import { GameHub } from './routes/GameHub';
import { Settings } from './routes/Settings';
import { Leaderboards } from './routes/Leaderboards';
import { Profile } from './routes/Profile';
import { MetaShop } from './routes/MetaShop';
import { ShellFrame } from './components/ShellFrame';
import { GaragePage } from './admin/garage/garage-page';
import { EnemyLairPage } from './admin/lair/enemy-lair-page';
import { LevelPage } from './admin/levels/level-page';
import { EnvironmentsPage } from './admin/environments/env-page';
import { AbilitiesPage } from './admin/abilities/abilities-page';

export function App(): JSX.Element {
  return (
    <Routes>
      {/* The game route renders fullscreen without the shell chrome. */}
      <Route path="/game/:gameId" element={<GameLauncher />} />

      {/* Admin tools render fullscreen — they own their own header. */}
      <Route path="/admin/boat-shooter/garage" element={<GaragePage />} />
      <Route path="/admin/boat-shooter/enemy-lair" element={<EnemyLairPage />} />
      <Route path="/admin/boat-shooter/levels" element={<LevelPage />} />
      <Route path="/admin/boat-shooter/environments" element={<EnvironmentsPage />} />
      <Route path="/admin/boat-shooter/abilities" element={<AbilitiesPage />} />

      {/* Everything else lives inside the ShellFrame (nav + content). */}
      <Route element={<ShellFrame />}>
        <Route path="/" element={<Home />} />
        <Route path="/games/:gameId" element={<GameHub />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/leaderboards" element={<Leaderboards />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/meta/boat-shooter" element={<MetaShop />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
