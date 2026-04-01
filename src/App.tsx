import { Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom';
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
import SunoCompose from './screens/SunoCompose.js';
import Prompts from './screens/Prompts.js';
import Account from './screens/Account.js';
import Analytics from './screens/Analytics.js';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  separatorAfter?: boolean;
};

function Layout() {
  const mainLinks: NavItem[] = [
    {
      to: '/compose',
      label: 'Compose',
      separatorAfter: true,
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    },
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    },
    {
      to: '/analytics',
      label: 'Analytics',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-6"/></svg>,
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
      separatorAfter: true,
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    },
    {
      to: '/config',
      label: 'Variables',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    },
    {
      to: '/prompts',
      label: 'Prompts',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    },
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-medium uppercase tracking-widest transition-colors ${
      isActive
        ? 'bg-[rgba(94,162,182,0.15)] text-white'
        : 'text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.87)]'
    }`;

  return (
    <div className="flex h-screen bg-[#111117]">
      {/* Sidebar */}
      <aside className="w-[172px] bg-[#15151d] text-white flex flex-col shrink-0 border-r border-[rgba(255,255,255,0.09)]">
        <div className="px-4 py-4 border-b border-[rgba(255,255,255,0.09)]">
          <img src="/logo.png" alt="Entuned" className="h-4" />
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {mainLinks.map((l) => (
            <div key={l.to}>
              <NavLink to={l.to} className={navLinkClass}>
                {l.icon}
                {l.label}
              </NavLink>
              {l.separatorAfter && (
                <div className="border-b border-[rgba(255,255,255,0.07)] mx-1 mt-1.5 mb-1" />
              )}
            </div>
          ))}
        </nav>

        {/* Account pinned to bottom */}
        <div className="p-2 border-t border-[rgba(255,255,255,0.07)]">
          <NavLink to="/account" className={navLinkClass}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Account
          </NavLink>
        </div>
      </aside>

      {/* Main area */}
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
        <Route path="analytics" element={<Analytics />} />
        <Route path="profiles" element={<CustomerProfiles />} />
        <Route path="clients" element={<ClientList />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="clients/:clientId/stores/:storeId" element={<StoreDetail />} />
        <Route path="clients/:clientId/stores/:storeId/audiences/:icpId" element={<AudiencePipeline />} />
        <Route path="clients/:clientId/stores/:storeId/audiences/:icpId/compose/:refTrackId" element={<SunoCompose />} />
        <Route path="songs" element={<SongLibrary />} />
        <Route path="songs/:id" element={<SongDetail />} />
        <Route path="compose" element={<PromptComposer />} />
        <Route path="config" element={<Config />} />
        <Route path="prompts" element={<Prompts />} />
        <Route path="account" element={<Account />} />
      </Route>
    </Routes>
  );
}
