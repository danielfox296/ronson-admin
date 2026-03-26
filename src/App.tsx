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
    <div className="flex h-screen bg-gray-50">
      <aside className="w-[200px] bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-4 text-lg font-bold border-b border-gray-700">Entune Admin</div>
        <nav className="flex-1 p-2 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={logout} className="p-4 text-sm text-gray-400 hover:text-white text-left border-t border-gray-700">
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
