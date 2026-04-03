import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { humanize, formatDuration } from '../lib/utils.js';
import Breadcrumb from '../components/Breadcrumb.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[rgba(39,174,96,0.15)] text-[#33be6a]', online: 'bg-[rgba(39,174,96,0.15)] text-[#33be6a]',
    onboarding: 'bg-[rgba(230,126,34,0.15)] text-[#e98f38]', draft: 'bg-[rgba(230,126,34,0.15)] text-[#e98f38]',
    inactive: 'bg-[rgba(231,76,60,0.15)] text-[#ea6152]', flagged: 'bg-[rgba(231,76,60,0.15)] text-[#ea6152]',
    archived: 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]'}`}>{humanize(status)}</span>;
}

export default function StoreDetail() {
  const { clientId, storeId } = useParams<{ clientId: string; storeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showIcpForm, setShowIcpForm] = useState(false);
  const [icpForm, setIcpForm] = useState({ name: '', psychographic_summary: '' });
  const [tab, setTab] = useState<'audiences' | 'playlog' | 'ambient' | 'player'>('audiences');
  const [deleteIcpTarget, setDeleteIcpTarget] = useState<{ id: string; name: string; songCount: number } | null>(null);
  const [undoIcpTarget, setUndoIcpTarget] = useState<{ id: string; name: string; timerId: ReturnType<typeof setTimeout> } | null>(null);
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerEmailLoaded, setPlayerEmailLoaded] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [defaultMode, setDefaultMode] = useState('');
  const [defaultModeLoaded, setDefaultModeLoaded] = useState(false);
  const [modeSaved, setModeSaved] = useState(false);

  const { data: storeData, isLoading } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => api<{ data: any }>(`/api/stores/${storeId}`),
  });

  const { data: icpsData } = useQuery({
    queryKey: ['store-icps', storeId],
    queryFn: () => api<{ data: any[] }>(`/api/stores/${storeId}/icps`),
  });

  const { data: playEventsData } = useQuery({
    queryKey: ['store-play-events', storeId],
    queryFn: () => api<{ data: any[] }>(`/api/stores/${storeId}/play-events`),
    enabled: tab === 'playlog',
  });

  const { data: ambientData } = useQuery({
    queryKey: ['store-ambient', storeId],
    queryFn: () => api<{ data: any[] }>(`/api/stores/${storeId}/ambient-readings`),
    enabled: tab === 'ambient',
  });

  const store = storeData?.data;

  // Fix: use useEffect instead of render-time setState for player email
  useEffect(() => {
    if (store && !playerEmailLoaded) {
      if (store.player_email) {
        setPlayerEmail(store.player_email);
      }
      setPlayerEmailLoaded(true);
    }
  }, [store, playerEmailLoaded]);

  useEffect(() => {
    if (store && !defaultModeLoaded) {
      setDefaultMode(store.default_mode || 'linger');
      setDefaultModeLoaded(true);
    }
  }, [store, defaultModeLoaded]);

  const updateMutation = useMutation({
    mutationFn: (body: any) => api(`/api/stores/${storeId}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store', storeId] }); setEditing(false); },
  });

  const createIcpMutation = useMutation({
    mutationFn: (body: typeof icpForm) => api(`/api/stores/${storeId}/icps`, { method: 'POST', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store-icps', storeId] }); setShowIcpForm(false); setIcpForm({ name: '', psychographic_summary: '' }); },
  });

  const deleteIcpMutation = useMutation({
    mutationFn: (id: string) => api(`/api/store-icps/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store-icps', storeId] }),
  });

  const saveWonderCredsMutation = useMutation({
    mutationFn: (body: { player_email?: string; player_password?: string }) => api(`/api/stores/${storeId}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store', storeId] }); setPasswordSaved(true); setTimeout(() => setPasswordSaved(false), 3000); },
  });

  if (isLoading) return <p className="text-[rgba(255,255,255,0.3)]">Loading...</p>;
  if (!store) return <p className="text-[#ea6152]">Store not found</p>;

  const icps = icpsData?.data || [];
  const playEvents = playEventsData?.data || [];

  const startEdit = () => {
    setEditForm({ name: store.name, address_line_1: store.address_line_1, city: store.city, state: store.state, zip: store.zip, country: store.country, timezone: store.timezone });
    setEditing(true);
  };

  const tabs = [
    { key: 'audiences', label: 'Audiences' },
    { key: 'playlog', label: 'Play Log' },
    { key: 'ambient', label: 'Ambient' },
    { key: 'player', label: 'Player Setup' },
  ] as const;

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Clients', href: '/clients' },
        { label: store.client?.name || 'Client', href: `/clients/${clientId}` },
        { label: store.name },
      ]} />

      <div className="flex items-center justify-between mb-4">
        <div />
        <StatusBadge status={store.status || 'active'} />
      </div>

      {editing ? (
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 mb-6 space-y-3">
          <div>
            <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Store Name</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          </div>
          <div>
            <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Address</label>
            <input value={editForm.address_line_1 || ''} onChange={(e) => setEditForm({ ...editForm, address_line_1: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">City</label>
              <input value={editForm.city || ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            </div>
            <div>
              <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">State</label>
              <input value={editForm.state || ''} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            </div>
            <div>
              <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Zip</label>
              <input value={editForm.zip || ''} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Country</label>
              <input value={editForm.country || ''} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            </div>
            <div>
              <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Timezone</label>
              <input value={editForm.timezone || ''} onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => updateMutation.mutate(editForm)} className="bg-[#5ea2b6] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#70b4c8] transition-colors">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 mb-6 cursor-pointer hover:bg-[rgba(255,255,255,0.01)] transition-colors" onClick={startEdit}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-0.5">Address</label>
              <span className="text-[rgba(255,255,255,0.87)]">{store.address_line_1 || <span className="text-[rgba(255,255,255,0.2)] italic">Not set</span>}</span>
            </div>
            <div>
              <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-0.5">City / State / Zip</label>
              <span className="text-[rgba(255,255,255,0.87)]">{[store.city, store.state, store.zip].filter(Boolean).join(', ') || <span className="text-[rgba(255,255,255,0.2)] italic">Not set</span>}</span>
            </div>
            <div>
              <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-0.5">Country</label>
              <span className="text-[rgba(255,255,255,0.87)]">{store.country || <span className="text-[rgba(255,255,255,0.2)] italic">Not set</span>}</span>
            </div>
            <div>
              <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-0.5">Timezone</label>
              <span className="text-[rgba(255,255,255,0.87)]">{store.timezone || <span className="text-[rgba(255,255,255,0.2)] italic">Not set</span>}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#5ea2b6]">Click to edit</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[rgba(255,255,255,0.09)] mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-[#5ea2b6] text-white' : 'border-transparent text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Audiences Tab */}
      {tab === 'audiences' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-[rgba(255,255,255,0.87)]">Audiences</h2>
            <button type="button" onClick={() => setShowIcpForm(true)} className="bg-[#5ea2b6] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#70b4c8] transition-colors">+ New Audience</button>
          </div>
          {showIcpForm && (
            <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 mb-3 space-y-3">
              <input placeholder="Audience Name" value={icpForm.name} onChange={(e) => setIcpForm({ ...icpForm, name: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
              <textarea placeholder="Psychographic Summary" value={icpForm.psychographic_summary} onChange={(e) => setIcpForm({ ...icpForm, psychographic_summary: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" rows={2} />
              <div className="flex gap-2">
                <button type="button" onClick={() => createIcpMutation.mutate(icpForm)} disabled={!icpForm.name} className="bg-[#5ea2b6] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#70b4c8] transition-colors">Create</button>
                <button type="button" onClick={() => setShowIcpForm(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
              </div>
            </div>
          )}
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl">
            {icps.map((icp: any) => (
              <div
                key={icp.id}
                className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.03)] text-sm transition-colors group"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/clients/${clientId}/stores/${storeId}/audiences/${icp.id}`)}
                  className="flex-1 text-left"
                >
                  <span className="font-medium text-[rgba(255,255,255,0.87)]">{icp.name}</span>
                  {icp._count?.songs > 0 && (
                    <span className="ml-2 text-[rgba(255,255,255,0.3)] text-xs">{icp._count.songs} song{icp._count.songs !== 1 ? 's' : ''}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDeleteIcpTarget({ id: icp.id, name: icp.name, songCount: icp._count?.songs || 0 }); }}
                  className="opacity-0 group-hover:opacity-100 text-[rgba(255,255,255,0.2)] hover:text-[#ea6152] text-xs transition-all ml-4 shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
            {icps.length === 0 && <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-sm">No audiences yet</p>}
          </div>
        </div>
      )}

      {/* Play Log Tab */}
      {tab === 'playlog' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-[rgba(255,255,255,0.87)]">Play Log</h2>
            <div className="flex items-center gap-4">
              <span className="text-xs text-[rgba(255,255,255,0.4)]">
                <span className="text-[rgba(255,255,255,0.7)] font-medium tabular-nums">{playEvents.length}</span> plays
                {playEvents.length > 0 && (
                  <> · <span className="text-[rgba(255,255,255,0.7)] font-medium tabular-nums">{Math.round(playEvents.reduce((sum: number, ev: any) => sum + (ev.duration_played || 0), 0) / 60)}</span> min total</>
                )}
              </span>
            </div>
          </div>
          <table className="w-full bg-[#1b1b24] rounded-xl text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.09)]">
                <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Song Title</th>
                <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Started At</th>
                <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Duration Played</th>
              </tr>
            </thead>
            <tbody>
              {playEvents.map((ev: any) => (
                <tr key={ev.id} className="border-b border-[rgba(255,255,255,0.04)]">
                  <td className="px-4 py-3 text-[rgba(255,255,255,0.87)]">{ev.song?.title || ev.title || 'Unknown'}</td>
                  <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{new Date(ev.started_at || ev.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{ev.duration_played ? formatDuration(Math.round(ev.duration_played)) : '-'}</td>
                </tr>
              ))}
              {playEvents.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-[rgba(255,255,255,0.3)]">No play events yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete ICP warning modal */}
      {deleteIcpTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0e0e1a] border border-[rgba(231,76,60,0.3)] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-base font-medium text-[rgba(255,255,255,0.87)] mb-2">Delete Audience?</h2>
            <p className="text-sm text-[rgba(255,255,255,0.5)] mb-1">
              <span className="text-[rgba(255,255,255,0.87)]">{deleteIcpTarget.name}</span> will be permanently removed.
            </p>
            {deleteIcpTarget.songCount > 0 && (
              <div className="bg-[rgba(231,76,60,0.08)] border border-[rgba(231,76,60,0.2)] rounded-lg px-4 py-3 my-4">
                <p className="text-[#ea6152] text-sm font-medium">
                  {deleteIcpTarget.songCount} song{deleteIcpTarget.songCount !== 1 ? 's' : ''} will also be deleted.
                </p>
                <p className="text-[rgba(255,255,255,0.4)] text-xs mt-1">This cannot be fully undone — you'll have a 5-second window to cancel.</p>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  const target = deleteIcpTarget;
                  setDeleteIcpTarget(null);
                  const timerId = setTimeout(() => {
                    deleteIcpMutation.mutate(target.id);
                    setUndoIcpTarget(null);
                  }, 5000);
                  setUndoIcpTarget({ id: target.id, name: target.name, timerId });
                }}
                className="flex-1 bg-[#ea6152] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#c0392b] transition-colors"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteIcpTarget(null)}
                className="flex-1 border border-[rgba(255,255,255,0.1)] py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {undoIcpTarget && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1a1a2a] border border-[rgba(255,255,255,0.1)] rounded-full px-5 py-3 shadow-2xl">
          <span className="text-sm text-[rgba(255,255,255,0.7)]">Deleting <span className="text-[rgba(255,255,255,0.87)]">{undoIcpTarget.name}</span>…</span>
          <button
            type="button"
            onClick={() => {
              clearTimeout(undoIcpTarget.timerId);
              setUndoIcpTarget(null);
            }}
            className="bg-[#5ea2b6] text-white px-3 py-1 rounded-full text-sm font-medium hover:bg-[#70b4c8] transition-colors"
          >
            Undo
          </button>
        </div>
      )}

      {/* Ambient Tab */}
      {tab === 'ambient' && (
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl">
          {(ambientData?.data || []).length === 0 ? (
            <p className="px-4 py-8 text-center text-[rgba(255,255,255,0.3)] text-sm">No ambient readings recorded yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.09)]">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.3)]">Time</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.3)]">Avg dB</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.3)]">Peak dB</th>
                </tr>
              </thead>
              <tbody>
                {(ambientData?.data || []).map((r: any) => (
                  <tr key={r.id} className="border-b border-[rgba(255,255,255,0.04)] last:border-0">
                    <td className="px-4 py-2 text-[rgba(255,255,255,0.6)]">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-[rgba(255,255,255,0.87)] font-mono">{r.avg_db?.toFixed(1)}</td>
                    <td className="px-4 py-2 text-right text-[rgba(255,255,255,0.6)] font-mono">{r.peak_db?.toFixed(1) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Player Setup Tab */}
      {tab === 'player' && (
        <div>
          <h2 className="font-medium mb-3 text-[rgba(255,255,255,0.87)]">Player Setup</h2>
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 text-sm space-y-4">
            <div>
              <label className="text-[rgba(255,255,255,0.4)] block mb-1">Player Login Email</label>
              <div className="flex gap-2">
                <input type="email" placeholder="store@example.com" value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm flex-1 bg-[rgba(255,255,255,0.03)]" />
                <button type="button" onClick={() => saveWonderCredsMutation.mutate({ player_email: playerEmail })} disabled={!playerEmail.trim()} className="bg-[#5ea2b6] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#70b4c8] transition-colors">Save</button>
              </div>
              {store.player_email && <p className="text-[rgba(255,255,255,0.2)] text-xs mt-1">Current: {store.player_email}</p>}
            </div>
            <div>
              <label className="text-[rgba(255,255,255,0.4)] block mb-1">{store.has_player_password ? 'Reset Player Password' : 'Set Player Password'}</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm flex-1 bg-[rgba(255,255,255,0.03)]" />
                <button type="button" onClick={() => { saveWonderCredsMutation.mutate({ player_password: newPassword }); setNewPassword(''); }} disabled={!newPassword.trim()} className="bg-[#5ea2b6] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#70b4c8] transition-colors">{store.has_player_password ? 'Reset' : 'Set'}</button>
              </div>
              {passwordSaved && <p className="text-[#33be6a] text-xs mt-1">Saved successfully.</p>}
            </div>
            <div>
              <label className="text-[rgba(255,255,255,0.4)] block mb-1">Default Outcome Mode</label>
              <div className="flex gap-2">
                <select
                  value={defaultMode}
                  onChange={(e) => setDefaultMode(e.target.value)}
                  className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm flex-1 bg-[rgba(255,255,255,0.03)]"
                >
                  <option value="linger">Linger — Stay longer, explore more</option>
                  <option value="elevate">Elevate — Spend more per item</option>
                  <option value="energize">Energize — More activity, more items</option>
                  <option value="move">Move — Increase turnover</option>
                </select>
                <button
                  type="button"
                  onClick={() => { saveWonderCredsMutation.mutate({ default_mode: defaultMode } as any); setModeSaved(true); setTimeout(() => setModeSaved(false), 3000); }}
                  className="bg-[#5ea2b6] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#70b4c8] transition-colors"
                >
                  Save
                </button>
              </div>
              {modeSaved && <p className="text-[#33be6a] text-xs mt-1">Mode saved.</p>}
              <p className="text-[rgba(255,255,255,0.2)] text-xs mt-1">Wonder will start in this mode when the player connects.</p>
            </div>
            <div className="border-t border-[rgba(255,255,255,0.09)] pt-3 text-[rgba(255,255,255,0.4)] text-xs">
              <p>To set up the player at this store:</p>
              <ol className="list-decimal ml-4 mt-1 space-y-1">
                <li>Open the player on the store device</li>
                <li>Enter the email and password set above</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
