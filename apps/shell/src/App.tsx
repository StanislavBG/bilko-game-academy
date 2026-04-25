import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './routes/Home';
import { GameLauncher } from './routes/GameLauncher';
import { Settings } from './routes/Settings';
import { Leaderboards } from './routes/Leaderboards';
import { Profile } from './routes/Profile';
import { MetaShop } from './routes/MetaShop';
import { ShellFrame } from './components/ShellFrame';

export function App(): JSX.Element {
  return (
    <Routes>
      {/* The game route renders fullscreen without the shell chrome. */}
      <Route path="/game/:gameId" element={<GameLauncher />} />

      {/* Everything else lives inside the ShellFrame (nav + content). */}
      <Route element={<ShellFrame />}>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/leaderboards" element={<Leaderboards />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/meta/boat-shooter" element={<MetaShop />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
