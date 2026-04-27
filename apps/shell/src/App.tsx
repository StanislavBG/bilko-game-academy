import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './routes/Home';
import { Campaign } from './routes/Campaign';
import { Encyclopedia } from './routes/Encyclopedia';
import { Shipyard } from './routes/Shipyard';
import { GameLauncher } from './routes/GameLauncher';
import { Settings } from './routes/Settings';
import { Leaderboards } from './routes/Leaderboards';
import { Profile } from './routes/Profile';
import { MetaShop } from './routes/MetaShop';
import { AdminDashboard } from './routes/AdminDashboard';
import { AdminPublish } from './routes/AdminPublish';
import { AppShell } from './components/AppShell';
import { AdminFrame } from './components/AdminFrame';
import { GaragePage } from './admin/garage/garage-page';
import { EnemyLairPage } from './admin/lair/enemy-lair-page';
import { LevelPage } from './admin/levels/level-page';
import { EnvironmentsPage } from './admin/environments/env-page';
import { AbilitiesPage } from './admin/abilities/abilities-page';

export function App(): JSX.Element {
  return (
    <Routes>
      {/* The game route renders fullscreen without the shell chrome. */}
      <Route path="/game/:gameId" element={<GameLauncher/>}/>

      {/* Player app — left rail + content. */}
      <Route element={<AppShell/>}>
        <Route path="/"             element={<Home/>}/>
        <Route path="/campaign"     element={<Campaign/>}/>
        <Route path="/shipyard"     element={<Shipyard/>}/>
        <Route path="/encyclopedia" element={<Encyclopedia/>}/>
        <Route path="/leaderboards" element={<Leaderboards/>}/>
        <Route path="/profile"      element={<Profile/>}/>
        <Route path="/settings"     element={<Settings/>}/>
        <Route path="/meta/boat-shooter" element={<MetaShop/>}/>
      </Route>

      {/* Admin app — dark sidebar + ADMIN ribbon, wraps the existing
          per-section editor pages. */}
      <Route element={<AdminFrame/>}>
        <Route path="/admin"                            element={<AdminDashboard/>}/>
        <Route path="/admin/publish"                    element={<AdminPublish/>}/>
        <Route path="/admin/boat-shooter/garage"        element={<GaragePage/>}/>
        <Route path="/admin/boat-shooter/enemy-lair"    element={<EnemyLairPage/>}/>
        <Route path="/admin/boat-shooter/levels"        element={<LevelPage/>}/>
        <Route path="/admin/boat-shooter/environments"  element={<EnvironmentsPage/>}/>
        <Route path="/admin/boat-shooter/abilities"     element={<AbilitiesPage/>}/>
      </Route>

      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}
