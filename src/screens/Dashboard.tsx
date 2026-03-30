import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatDuration } from '../lib/utils.js';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const activityIcons: Record<string, { icon: string; color: string }> = {
  song_added: { icon: '♫', color: '#4a90a4' },
  love: { icon: '♥', color: '#5dcaa5' },
  report: { icon: '⚠', color: '#f0997b' },
  store_added: { icon: '◉', color: '#a78bfa' },
};

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
  const activity = d?.recentActivity || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight leading-none text-white">System Pulse</h1>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="TOTAL SONGS" value={stats.totalSongs?.toLocaleString() || '0'} />
          <StatCard label="ACTIVE STORES" value={stats.activeStores?.toString() || '0'} sub="Live Now" />
          <StatCard label="PLAYLISTS" value={stats.totalPlaylists?.toLocaleString() || '0'} sub="Active" />
          <StatCard label="PLAY EVENTS" value={stats.totalPlayEvents?.toLocaleString() || '0'} sub="All time" />
        </div>
      )}

      {/* Two-column: Live Now + Activity */}
      <div className="grid grid-cols-[1fr_380px] gap-6">
        {/* Live Now */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-light text-[rgba(255,255,255,0.87)]">Live Now</h2>
            <button
              type="button"
              onClick={() => navigate('/clients')}
              className="text-[#4a90a4] hover:text-[#5ba3b8] text-sm transition-colors"
            >
              View All Stores
            </button>
          </div>

          {liveNow.length === 0 ? (
            <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center">
              <div className="text-[rgba(255,255,255,0.2)] text-sm">No stores playing right now</div>
            </div>
          ) : (
            <div className="space-y-3">
              {liveNow.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 flex items-center gap-4 hover:border-[rgba(255,255,255,0.12)] transition-colors"
                >
                  {/* Album art placeholder */}
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[rgba(74,144,164,0.3)] to-[rgba(74,144,164,0.05)] flex items-center justify-center shrink-0">
                    <span className="text-[#4a90a4] text-lg">♫</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[rgba(255,255,255,0.87)] truncate">{item.song?.title || 'Unknown'}</div>
                    <div className="text-xs text-[rgba(255,255,255,0.3)] mt-0.5 uppercase tracking-wider flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#27ae60] animate-pulse" />
                      {item.store?.name || 'Unknown Store'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-[rgba(255,255,255,0.3)] uppercase">Duration</div>
                    <div className="text-sm text-[rgba(255,255,255,0.6)] font-mono mt-0.5">
                      {item.song?.duration_seconds ? formatDuration(Math.round(item.song.duration_seconds)) : '--:--'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-light text-[rgba(255,255,255,0.87)] mb-4">Recent Activity</h2>
          <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl divide-y divide-[rgba(255,255,255,0.04)]">
            {activity.length === 0 ? (
              <div className="p-6 text-center text-[rgba(255,255,255,0.2)] text-sm">No recent activity</div>
            ) : (
              activity.map((a: any, i: number) => {
                const icon = activityIcons[a.type] || { icon: '•', color: '#4a90a4' };
                return (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${icon.color}15` }}
                    >
                      <span style={{ color: icon.color, fontSize: 14 }}>{icon.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[rgba(255,255,255,0.87)]">{a.title}</div>
                      <div className="text-xs text-[rgba(255,255,255,0.4)] truncate mt-0.5">{a.subtitle}</div>
                    </div>
                    <div className="text-[10px] text-[rgba(255,255,255,0.25)] uppercase tracking-wide shrink-0 mt-1">
                      {timeAgo(a.timestamp)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
      <div className="text-[10px] text-[rgba(255,255,255,0.35)] uppercase tracking-widest mb-3">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-light text-[rgba(255,255,255,0.87)]">{value}</span>
        {sub && <span className="text-xs text-[#4a90a4]">{sub}</span>}
      </div>
    </div>
  );
}
