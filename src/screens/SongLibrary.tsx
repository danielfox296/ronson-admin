import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { humanize } from '../lib/utils.js';
import Breadcrumb from '../components/Breadcrumb.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[rgba(39,174,96,0.15)] text-[#27ae60]',
    generated: 'bg-[rgba(74,144,164,0.15)] text-[#4a90a4]',
    draft: 'bg-[rgba(230,126,34,0.15)] text-[#e67e22]',
    flagged: 'bg-[rgba(231,76,60,0.15)] text-[#e74c3c]',
    inactive: 'bg-[rgba(231,76,60,0.15)] text-[#e74c3c]',
    removed: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
    archived: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]'}`}>{humanize(status)}</span>;
}

type Filter = 'all' | 'unassigned' | 'active' | 'flagged';

export default function SongLibrary() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (filter === 'unassigned') params.set('unassigned', 'true');
    if (filter === 'active') params.set('status', 'active');
    if (filter === 'flagged') params.set('status', 'flagged');
    return params.toString();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['songs', filter],
    queryFn: () => api<{ data: any[] }>(`/api/songs?${buildQuery()}`),
  });

  const { data: gsData } = useQuery({
    queryKey: ['generation-systems'],
    queryFn: () => api<{ data: any[] }>('/api/generation-systems'),
  });

  const gsNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    (gsData?.data || []).forEach((gs: any) => { m[gs.id] = gs.name; });
    return m;
  }, [gsData]);

  const allSongs = data?.data || [];

  // Client-side search filter
  const songs = useMemo(() => {
    if (!debounced) return allSongs;
    const q = debounced.toLowerCase();
    return allSongs.filter((s: any) => (s.title || '').toLowerCase().includes(q));
  }, [allSongs, debounced]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unassigned', label: 'Unassigned' },
    { key: 'active', label: 'Active' },
    { key: 'flagged', label: 'Flagged' },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: 'Song Library' }]} />

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-[#4a90a4] text-white' : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Search songs by title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm mb-4 bg-[rgba(255,255,255,0.03)]"
      />

      {isLoading ? (
        <p className="text-[rgba(255,255,255,0.3)]">Loading...</p>
      ) : (
        <table className="w-full bg-[#12121a] rounded-xl text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)]">
              <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Title</th>
              <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Status</th>
              <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Generation System</th>
              <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Stores Assigned</th>
              <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Created</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((s: any) => (
              <tr key={s.id} onClick={() => navigate(`/songs/${s.id}`)} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium text-[rgba(255,255,255,0.87)]">{s.title}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status || 'active'} /></td>
                <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{s.generation_system_id ? (gsNameMap[s.generation_system_id] || s.generation_system_id) : '-'}</td>
                <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{s._count?.store_playlists ?? 0}</td>
                <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {songs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[rgba(255,255,255,0.3)]">No songs found</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
