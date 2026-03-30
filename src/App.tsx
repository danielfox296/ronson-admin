import { Routes, Route, Navigate, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  const links = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    },
    {
      to: '/clients',
      label: 'Clients',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 21h18"/>
          <path d="M5 21V7l7-4 7 4v14"/>
          <path d="M9 21v-4h6v4"/>
          <rect x="9" y="10" width="2" height="2"/>
          <rect x="13" y="10" width="2" height="2"/>
        </svg>
      ),
    },
    {
      to: '/songs',
      label: 'Songs',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    },
    {
      to: '/config',
      label: 'Variables',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    },
  ];

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isComposePage = location.pathname === '/compose';

  return (
    <div className="flex h-screen bg-[#101018]">
      {/* Sidebar */}
      <aside className="w-[220px] bg-[#14141e] text-white flex flex-col shrink-0 border-r border-[rgba(255,255,255,0.09)]">
        <div className="px-5 py-5 border-b border-[rgba(255,255,255,0.09)]">
          <img src="/logo.png" alt="Entuned" className="h-5" />
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
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

        {/* Account section */}
        <div className="border-t border-[rgba(255,255,255,0.09)] p-3">
          <div className="text-[9px] font-medium uppercase tracking-widest text-[rgba(255,255,255,0.25)] px-3 mb-1.5">Account</div>
          <NavLink
            to="/config"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'text-[rgba(255,255,255,0.87)]' : 'text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.7)]'}`
            }
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Change Password
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.7)] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar with Compose button */}
        <div className="flex items-center justify-end px-6 h-11 border-b border-[rgba(255,255,255,0.09)] bg-[#101018] shrink-0">
          <button
            type="button"
            onClick={() => navigate('/compose')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isComposePage
                ? 'bg-[rgba(74,144,164,0.2)] text-[#4a90a4] border border-[rgba(74,144,164,0.3)]'
                : 'bg-[rgba(74,144,164,0.1)] text-[#5ba3b8] border border-[rgba(74,144,164,0.15)] hover:bg-[rgba(74,144,164,0.18)] hover:border-[rgba(74,144,164,0.3)]'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Compose
          </button>
        </div>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
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
