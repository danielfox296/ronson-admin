import { Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Login from './screens/Login.js';
import Dashboard from './screens/Dashboard.js';
import ClientList from './screens/ClientList.js';
import ClientDetail from './screens/ClientDetail.js';
import StoreDetail from './screens/StoreDetail.js';
import AudiencePipeline from './screens/AudiencePipeline.js';
import SongLibrary from './screens/SongLibrary.js';
import SongDetail from './screens/SongDetail.js';
import Config from './screens/Config.js';
import CustomerProfiles from './screens/CustomerProfiles.js';
import PromptComposer from './screens/PromptComposer.js';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Layout() {
  const navigate = useNavigate();
  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
    { to: '/clients', label: 'Clients', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { to: '/profiles', label: 'Audiences', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { to: '/songs', label: 'Song Library', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> },
    { to: '/compose', label: 'Compose', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
    { to: '/config', label: 'Settings', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
  ];

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      <aside className="w-[220px] bg-[#0d0d14] text-white flex flex-col shrink-0 border-r border-[rgba(255,255,255,0.06)]">
        <div className="px-5 py-5 border-b border-[rgba(255,255,255,0.06)]">
          <img src="/logo.png" alt="Entuned" className="h-5" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-[rgba(74,144,164,0.15)] text-white' : 'text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.87)]'}`
              }
            >
              {l.icon}
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={logout} className="px-5 py-4 text-sm text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.7)] text-left border-t border-[rgba(255,255,255,0.06)] transition-colors">
          Logout
        </button>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profiles" element={<CustomerProfiles />} />
        <Route path="clients" element={<ClientList />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="clients/:clientId/stores/:storeId" element={<StoreDetail />} />
        <Route path="clients/:clientId/stores/:storeId/audiences/:icpId" element={<AudiencePipeline />} />
        <Route path="songs" element={<SongLibrary />} />
        <Route path="songs/:id" element={<SongDetail />} />
        <Route path="compose" element={<PromptComposer />} />
        <Route path="config" element={<Config />} />
      </Route>
    </Routes>
  );
}
