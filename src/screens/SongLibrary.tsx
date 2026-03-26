import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    flagged: 'bg-red-100 text-red-800',
    inactive: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-800',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
}

type Filter = 'all' | 'unassigned' | 'active' | 'flagged';

export default function SongLibrary() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

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

  const songs = data?.data || [];

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unassigned', label: 'Unassigned' },
    { key: 'active', label: 'Active' },
    { key: 'flagged', label: 'Flagged' },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: 'Song Library' }]} />
      <h1 className="text-2xl font-bold mb-4">Song Library</h1>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              filter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <table className="w-full bg-white rounded-lg border text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Generation System</th>
              <th className="text-left px-4 py-3 font-medium">Stores Assigned</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((s: any) => (
              <tr key={s.id} onClick={() => navigate(`/songs/${s.id}`)} className="border-b hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 font-medium">{s.title}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status || 'active'} /></td>
                <td className="px-4 py-3">{s.generation_system_id || '-'}</td>
                <td className="px-4 py-3">{s._count?.store_playlists ?? 0}</td>
                <td className="px-4 py-3">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {songs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No songs found</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
