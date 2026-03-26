import { Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Login from './screens/Login.js';
import ClientList from './screens/ClientList.js';
import ClientDetail from './screens/ClientDetail.js';
import StoreDetail from './screens/StoreDetail.js';
import IcpDetail from './screens/IcpDetail.js';
import RefTrackDetail from './screens/RefTrackDetail.js';
import TemplateDetail from './screens/TemplateDetail.js';
import PromptDetail from './screens/PromptDetail.js';
import SongLibrary from './screens/SongLibrary.js';
import SongDetail from './screens/SongDetail.js';
import Config from './screens/Config.js';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Layout() {
  const navigate = useNavigate();
  const links = [
    { to: '/clients', label: 'Clients' },
    { to: '/songs', label: 'Song Library' },
    { to: '/config', label: 'Config' },
  ];

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      <aside className="w-[220px] bg-[#0d0d14] text-white flex flex-col shrink-0 border-r border-[rgba(255,255,255,0.06)]">
        <div className="px-5 py-5 text-base font-light tracking-wide text-[rgba(255,255,255,0.87)] border-b border-[rgba(255,255,255,0.06)]">Entune Admin</div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-[rgba(74,144,164,0.15)] text-white border-l-2 border-[#4a90a4] pl-[10px]' : 'text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.87)]'}`
              }
            >
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
        <Route index element={<Navigate to="/clients" replace />} />
        <Route path="clients" element={<ClientList />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="clients/:clientId/stores/:storeId" element={<StoreDetail />} />
        <Route path="clients/:clientId/stores/:storeId/icps/:icpId" element={<IcpDetail />} />
        <Route path="clients/:clientId/stores/:storeId/icps/:icpId/ref-tracks/:refTrackId" element={<RefTrackDetail />} />
        <Route path="clients/:clientId/stores/:storeId/icps/:icpId/ref-tracks/:refTrackId/templates/:templateId" element={<TemplateDetail />} />
        <Route path="clients/:clientId/stores/:storeId/icps/:icpId/ref-tracks/:refTrackId/templates/:templateId/prompts/:promptId" element={<PromptDetail />} />
        <Route path="songs" element={<SongLibrary />} />
        <Route path="songs/:id" element={<SongDetail />} />
        <Route path="config" element={<Config />} />
      </Route>
    </Routes>
  );
}
