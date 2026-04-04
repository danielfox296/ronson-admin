import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatDuration } from '../lib/utils.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<{ data: any }>('/api/dashboard'),
    refetchInterval: 30000,
  });

  const d = data?.data;
  const stats = d?.stats || {};
  const liveNow = d?.liveNow || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl tracking-tight leading-none text-white">Dashboard</h1>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard
            label="TOTAL SONGS"
            value={stats.totalSongs?.toLocaleString() || '0'}
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
          />
          <StatCard
            label="ACTIVE STORES"
            value={stats.activeStores?.toString() || '0'}
            sub="Live Now"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/></svg>}
          />
          <StatCard
            label="PLAYLISTS"
            value={stats.totalPlaylists?.toLocaleString() || '0'}
            sub="Active"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>}
          />
          <StatCard
            label="PLAY EVENTS"
            value={stats.totalPlayEvents?.toLocaleString() || '0'}
            sub="All time"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>}
          />
        </div>
      )}

      {/* Now Playing — full width */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-light text-[rgba(255,255,255,0.87)]">Now Playing</h2>
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="text-[#5ea2b6] hover:text-[#70b4c8] text-sm transition-colors"
          >
            View All Stores
          </button>
        </div>

        {liveNow.length === 0 ? (
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-8 text-center">
            <div className="text-[rgba(255,255,255,0.35)] text-sm">No stores playing right now</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {liveNow.map((item: any) => (
              <div
                key={item.id}
                className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 flex items-center gap-4 hover:border-[rgba(255,255,255,0.15)] transition-colors"
              >
                {/* Album art placeholder */}
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[rgba(74,144,164,0.3)] to-[rgba(74,144,164,0.05)] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[#5ea2b6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[rgba(255,255,255,0.87)] truncate">{item.song?.title || 'Unknown'}</div>
                  <div className="text-xs text-[rgba(255,255,255,0.35)] mt-0.5 uppercase tracking-wider flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#33be6a] animate-pulse" />
                    {item.store?.name || 'Unknown Store'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-[rgba(255,255,255,0.45)] uppercase">Duration</div>
                  <div className="text-sm text-[rgba(255,255,255,0.6)] font-mono mt-0.5">
                    {item.song?.duration_seconds ? formatDuration(Math.round(item.song.duration_seconds)) : '--:--'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-[rgba(255,255,255,0.45)] uppercase tracking-widest">{label}</div>
        {icon && <div className="text-[rgba(255,255,255,0.35)]">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-light text-[rgba(255,255,255,0.87)]">{value}</span>
        {sub && <span className="text-xs text-[#5ea2b6]">{sub}</span>}
      </div>
    </div>
  );
}
