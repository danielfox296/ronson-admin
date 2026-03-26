import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800', online: 'bg-green-100 text-green-800',
    onboarding: 'bg-yellow-100 text-yellow-800', draft: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-red-100 text-red-800', flagged: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-800',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
}

export default function StoreDetail() {
  const { clientId, storeId } = useParams<{ clientId: string; storeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showIcpForm, setShowIcpForm] = useState(false);
  const [icpForm, setIcpForm] = useState({ name: '', description: '' });
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [tab, setTab] = useState<'icps' | 'playlist' | 'playlog' | 'wonder'>('icps');
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerEmailLoaded, setPlayerEmailLoaded] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  const { data: storeData, isLoading } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => api<{ data: any }>(`/api/stores/${storeId}`),
  });

  const { data: icpsData } = useQuery({
    queryKey: ['store-icps', storeId],
    queryFn: () => api<{ data: any[] }>(`/api/stores/${storeId}/icps`),
  });

  const { data: playlistData } = useQuery({
    queryKey: ['store-playlist', storeId],
    queryFn: () => api<{ data: any[] }>(`/api/stores/${storeId}/playlist`),
    enabled: tab === 'playlist',
  });

  const { data: playEventsData } = useQuery({
    queryKey: ['store-play-events', storeId],
    queryFn: () => api<{ data: any[] }>(`/api/stores/${storeId}/play-events`),
    enabled: tab === 'playlog',
  });

  const { data: allSongsData } = useQuery({
    queryKey: ['songs-for-picker'],
    queryFn: () => api<{ data: any[] }>('/api/songs'),
    enabled: showSongPicker,
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api(`/api/stores/${storeId}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store', storeId] }); setEditing(false); },
  });

  const createIcpMutation = useMutation({
    mutationFn: (body: typeof icpForm) => api(`/api/stores/${storeId}/icps`, { method: 'POST', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store-icps', storeId] }); setShowIcpForm(false); setIcpForm({ name: '', description: '' }); },
  });

  const assignSongMutation = useMutation({
    mutationFn: (songId: string) => api(`/api/stores/${storeId}/playlist`, { method: 'POST', body: { song_id: songId, added_by: 'admin' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store-playlist', storeId] }); setShowSongPicker(false); },
  });

  const removeSongMutation = useMutation({
    mutationFn: (entryId: string) => api(`/api/stores/${storeId}/playlist/${entryId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store-playlist', storeId] }),
  });

  const saveWonderCredsMutation = useMutation({
    mutationFn: (body: { player_email?: string; player_password?: string }) => api(`/api/stores/${storeId}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store', storeId] }); setPasswordSaved(true); setTimeout(() => setPasswordSaved(false), 3000); },
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  const store = storeData?.data;
  if (!store) return <p className="text-red-600">Store not found</p>;

  const icps = icpsData?.data || [];
  const playlist = playlistData?.data || [];
  const playEvents = playEventsData?.data || [];
  const allSongs = allSongsData?.data || [];

  const startEdit = () => {
    setEditForm({ name: store.name, address_line_1: store.address_line_1, city: store.city, state: store.state, zip: store.zip, country: store.country, timezone: store.timezone });
    setEditing(true);
  };

  const tabs = [
    { key: 'icps', label: 'ICPs' },
    { key: 'playlist', label: 'Playlist' },
    { key: 'playlog', label: 'Play Log' },
    { key: 'wonder', label: 'Wonder Setup' },
  ] as const;

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Clients', href: '/clients' },
        { label: store.client?.name || 'Client', href: `/clients/${clientId}` },
        { label: store.name },
      ]} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{store.name}</h1>
        <StatusBadge status={store.status || 'active'} />
      </div>

      {editing ? (
        <div className="bg-white border rounded-lg p-4 mb-6 space-y-3">
          <input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <input placeholder="Address" value={editForm.address_line_1 || ''} onChange={(e) => setEditForm({ ...editForm, address_line_1: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="City" value={editForm.city || ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="State" value={editForm.state || ''} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Zip" value={editForm.zip || ''} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Country" value={editForm.country || ''} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Timezone" value={editForm.timezone || ''} onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => updateMutation.mutate(editForm)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Address:</span> {store.address_line_1}</div>
            <div><span className="text-gray-500">City:</span> {store.city}, {store.state} {store.zip}</div>
            <div><span className="text-gray-500">Country:</span> {store.country}</div>
            <div><span className="text-gray-500">Timezone:</span> {store.timezone}</div>
          </div>
          <button type="button" onClick={startEdit} className="mt-3 text-sm text-blue-600 hover:underline">Edit</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ICPs Tab */}
      {tab === 'icps' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">ICPs</h2>
            <button type="button" onClick={() => setShowIcpForm(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">+ New ICP</button>
          </div>
          {showIcpForm && (
            <div className="bg-white border rounded-lg p-4 mb-3 space-y-3">
              <input placeholder="ICP Name" value={icpForm.name} onChange={(e) => setIcpForm({ ...icpForm, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
              <textarea placeholder="Description" value={icpForm.description} onChange={(e) => setIcpForm({ ...icpForm, description: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" rows={2} />
              <div className="flex gap-2">
                <button type="button" onClick={() => createIcpMutation.mutate(icpForm)} disabled={!icpForm.name} className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">Create</button>
                <button type="button" onClick={() => setShowIcpForm(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="bg-white border rounded-lg">
            {icps.map((icp: any) => (
              <div
                key={icp.id}
                onClick={() => navigate(`/clients/${clientId}/stores/${storeId}/icps/${icp.id}`)}
                className="px-4 py-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <span className="font-medium">{icp.name}</span>
                {icp.description && <p className="text-gray-500 text-xs mt-1">{icp.description}</p>}
              </div>
            ))}
            {icps.length === 0 && <p className="px-4 py-6 text-center text-gray-500 text-sm">No ICPs yet</p>}
          </div>
        </div>
      )}

      {/* Playlist Tab */}
      {tab === 'playlist' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Playlist</h2>
            <button type="button" onClick={() => setShowSongPicker(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">+ Assign Song</button>
          </div>
          {showSongPicker && (
            <div className="bg-white border rounded-lg p-4 mb-3">
              <h3 className="font-medium text-sm mb-2">Pick a song to assign</h3>
              <div className="max-h-60 overflow-auto space-y-1">
                {allSongs.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded text-sm">
                    <span>{s.title}</span>
                    <button type="button" onClick={() => assignSongMutation.mutate(s.id)} className="text-blue-600 hover:underline text-xs">Assign</button>
                  </div>
                ))}
                {allSongs.length === 0 && <p className="text-gray-500 text-sm">No songs available</p>}
              </div>
              <button type="button" onClick={() => setShowSongPicker(false)} className="mt-2 border px-3 py-1 rounded text-sm">Close</button>
            </div>
          )}
          <div className="bg-white border rounded-lg">
            {playlist.map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 text-sm">
                <span>{entry.song?.title || entry.title || 'Untitled'}</span>
                <button type="button" onClick={() => removeSongMutation.mutate(entry.id)} className="text-red-600 hover:underline text-xs">Remove</button>
              </div>
            ))}
            {playlist.length === 0 && <p className="px-4 py-6 text-center text-gray-500 text-sm">No songs in playlist</p>}
          </div>
        </div>
      )}

      {/* Play Log Tab */}
      {tab === 'playlog' && (
        <div>
          <h2 className="font-semibold mb-3">Play Log</h2>
          <table className="w-full bg-white border rounded-lg text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Song Title</th>
                <th className="text-left px-4 py-3 font-medium">Started At</th>
                <th className="text-left px-4 py-3 font-medium">Duration Played</th>
              </tr>
            </thead>
            <tbody>
              {playEvents.map((ev: any) => (
                <tr key={ev.id} className="border-b">
                  <td className="px-4 py-3">{ev.song?.title || ev.title || 'Unknown'}</td>
                  <td className="px-4 py-3">{new Date(ev.started_at || ev.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{ev.duration_played ? `${ev.duration_played}s` : '-'}</td>
                </tr>
              ))}
              {playEvents.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No play events yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Wonder Setup Tab */}
      {tab === 'wonder' && (() => {
        // Load email from store data on first render of this tab
        if (!playerEmailLoaded && store.player_email) {
          setPlayerEmail(store.player_email);
          setPlayerEmailLoaded(true);
        } else if (!playerEmailLoaded) {
          setPlayerEmailLoaded(true);
        }
        return (
        <div>
          <h2 className="font-semibold mb-3">Wonder Setup</h2>
          <div className="bg-white border rounded-lg p-4 text-sm space-y-4">
            <div>
              <label className="text-gray-500 block mb-1">Player Login Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="store@example.com"
                  value={playerEmail}
                  onChange={(e) => setPlayerEmail(e.target.value)}
                  className="border rounded px-3 py-2 text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() => saveWonderCredsMutation.mutate({ player_email: playerEmail })}
                  disabled={!playerEmail.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  Save
                </button>
              </div>
              {store.player_email && <p className="text-gray-400 text-xs mt-1">Current: {store.player_email}</p>}
            </div>
            <div>
              <label className="text-gray-500 block mb-1">{store.has_player_password ? 'Reset Player Password' : 'Set Player Password'}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border rounded px-3 py-2 text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() => { saveWonderCredsMutation.mutate({ player_password: newPassword }); setNewPassword(''); }}
                  disabled={!newPassword.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  {store.has_player_password ? 'Reset' : 'Set'}
                </button>
              </div>
              {passwordSaved && <p className="text-green-600 text-xs mt-1">Saved successfully.</p>}
            </div>
            <div className="border-t pt-3 text-gray-500 text-xs">
              <p>To set up Wonder at this store:</p>
              <ol className="list-decimal ml-4 mt-1 space-y-1">
                <li>Open Wonder on the store device</li>
                <li>Enter the email and password set above</li>
              </ol>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
