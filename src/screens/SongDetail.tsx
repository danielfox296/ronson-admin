import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800', online: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800', onboarding: 'bg-yellow-100 text-yellow-800',
    flagged: 'bg-red-100 text-red-800', inactive: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-800',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
}

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusVal, setStatusVal] = useState('');

  const { data: songData, isLoading } = useQuery({
    queryKey: ['song', id],
    queryFn: () => api<{ data: any }>(`/api/songs/${id}`),
  });

  const { data: storesData } = useQuery({
    queryKey: ['stores-for-assign'],
    queryFn: () => api<{ data: any[] }>('/api/stores'),
    enabled: showAssign,
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api(`/api/songs/${id}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['song', id] }); setEditingTitle(false); setEditingStatus(false); },
  });

  const assignMutation = useMutation({
    mutationFn: (storeId: string) => api(`/api/stores/${storeId}/playlist`, { method: 'POST', body: { song_id: id, added_by: 'admin' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['song', id] }); setShowAssign(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/api/songs/${id}`, { method: 'DELETE' }),
    onSuccess: () => navigate('/songs'),
  });

  const unassignMutation = useMutation({
    mutationFn: (storeId: string) => api(`/api/stores/${storeId}/playlist/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['song', id] }),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  const song = songData?.data;
  if (!song) return <p className="text-red-600">Song not found</p>;

  const lineage = song.lineage || {};
  const flowFactors = lineage.template?.flow_factor_values || {};
  const assignments = song.store_playlists || [];
  const stores = storesData?.data || [];

  // Build lineage links
  const lineageIcp = lineage.icp;
  const lineageRefTrack = lineage.reference_track;
  const lineageTemplate = lineage.template;
  const lineagePrompt = lineage.prompt;

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Song Library', href: '/songs' },
        { label: song.title },
      ]} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {editingTitle ? (
            <>
              <input value={titleVal} onChange={(e) => setTitleVal(e.target.value)} className="text-2xl font-bold border rounded px-2 py-1" />
              <button type="button" onClick={() => updateMutation.mutate({ title: titleVal })} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Save</button>
              <button type="button" onClick={() => setEditingTitle(false)} className="border px-3 py-1 rounded text-sm">Cancel</button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{song.title}</h1>
              <button type="button" onClick={() => { setTitleVal(song.title || ''); setEditingTitle(true); }} className="text-blue-600 hover:underline text-sm">Edit</button>
            </>
          )}
          {editingStatus ? (
            <div className="flex items-center gap-2">
              <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)} className="border rounded px-2 py-1 text-sm">
                <option value="generated">generated</option>
                <option value="active">active</option>
                <option value="flagged">flagged</option>
                <option value="removed">removed</option>
              </select>
              <button type="button" onClick={() => updateMutation.mutate({ status: statusVal })} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Save</button>
              <button type="button" onClick={() => setEditingStatus(false)} className="border px-3 py-1 rounded text-sm">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <StatusBadge status={song.status || 'active'} />
              <button type="button" onClick={() => { setStatusVal(song.status || 'active'); setEditingStatus(true); }} className="text-blue-600 hover:underline text-xs">change</button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => { if (window.confirm('Delete this song?')) deleteMutation.mutate(); }}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
        >
          Delete
        </button>
      </div>

      {/* Song Info */}
      <div className="bg-white border rounded-lg p-4 mb-6 text-sm space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-gray-500">Duration:</span> {song.duration_seconds ? `${song.duration_seconds}s` : '-'}</div>
          <div><span className="text-gray-500">Status:</span> {song.status}</div>
          <div><span className="text-gray-500">Generation System:</span> {song.generation_system_id || '-'}</div>
          <div><span className="text-gray-500">Created:</span> {song.created_at ? new Date(song.created_at).toLocaleDateString() : '-'}</div>
        </div>
        {song.audio_file_url && (
          <div>
            <span className="text-gray-500 block mb-1">Audio Preview:</span>
            <audio controls src={song.audio_file_url} className="w-full" />
          </div>
        )}
      </div>

      {/* Lineage */}
      {(lineageIcp || lineageRefTrack || lineageTemplate || lineagePrompt) && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Lineage</h2>
          <div className="bg-white border rounded-lg p-4 text-sm space-y-2">
            {lineageIcp && (
              <div>
                <span className="text-gray-500">ICP:</span>{' '}
                {lineageIcp.store ? (
                  <Link to={`/clients/${lineageIcp.store.client_id}/stores/${lineageIcp.store.id}/icps/${lineageIcp.id}`} className="text-blue-600 hover:underline">{lineageIcp.name}</Link>
                ) : (
                  <span>{lineageIcp.name}</span>
                )}
              </div>
            )}
            {lineageRefTrack && (
              <div>
                <span className="text-gray-500">Reference Track:</span>{' '}
                {lineageIcp?.store ? (
                  <Link to={`/clients/${lineageIcp.store.client_id}/stores/${lineageIcp.store.id}/icps/${lineageIcp.id}/ref-tracks/${lineageRefTrack.id}`} className="text-blue-600 hover:underline">{lineageRefTrack.title}</Link>
                ) : (
                  <span>{lineageRefTrack.title}</span>
                )}
              </div>
            )}
            {lineageTemplate && (
              <div>
                <span className="text-gray-500">Template:</span>{' '}
                {lineageIcp?.store ? (
                  <Link to={`/clients/${lineageIcp.store.client_id}/stores/${lineageIcp.store.id}/icps/${lineageIcp.id}/ref-tracks/${lineageRefTrack?.id}/templates/${lineageTemplate.id}`} className="text-blue-600 hover:underline">{lineageTemplate.name || 'Template'}</Link>
                ) : (
                  <span>{lineageTemplate.name || 'Template'}</span>
                )}
              </div>
            )}
            {lineagePrompt && (
              <div>
                <span className="text-gray-500">Prompt:</span>{' '}
                {lineageIcp?.store && lineageTemplate ? (
                  <Link to={`/clients/${lineageIcp.store.client_id}/stores/${lineageIcp.store.id}/icps/${lineageIcp.id}/ref-tracks/${lineageRefTrack?.id}/templates/${lineageTemplate.id}/prompts/${lineagePrompt.id}`} className="text-blue-600 hover:underline">Prompt #{(lineagePrompt.id || '').slice(-6)}</Link>
                ) : (
                  <span>Prompt #{(lineagePrompt.id || '').slice(-6)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flow Factors (read-only) */}
      {Object.keys(flowFactors).length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Flow Factors</h2>
          <table className="w-full bg-white border rounded-lg text-sm">
            <tbody>
              {Object.entries(flowFactors).map(([k, v]) => (
                <tr key={k} className="border-b last:border-0">
                  <td className="px-4 py-2 text-gray-500 w-1/2">{k}</td>
                  <td className="px-4 py-2">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Prompt Text (read-only) */}
      {lineagePrompt?.prompt_text && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Prompt Text</h2>
          <pre className="bg-white border rounded-lg p-4 text-sm whitespace-pre-wrap">{lineagePrompt.prompt_text}</pre>
        </div>
      )}

      {/* Assignments */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Store Assignments</h2>
        <button type="button" onClick={() => setShowAssign(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">+ Assign to Store</button>
      </div>

      {showAssign && (
        <div className="bg-white border rounded-lg p-4 mb-3">
          <h3 className="font-medium text-sm mb-2">Pick a store</h3>
          <div className="max-h-60 overflow-auto space-y-1">
            {stores.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded text-sm">
                <span>{s.name}</span>
                <button type="button" onClick={() => assignMutation.mutate(s.id)} className="text-blue-600 hover:underline text-xs">Assign</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setShowAssign(false)} className="mt-2 border px-3 py-1 rounded text-sm">Close</button>
        </div>
      )}

      <div className="bg-white border rounded-lg">
        {assignments.map((a: any) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 text-sm">
            <div>
              <span>{a.store?.name || 'Store'}</span>
              {a.added_by && <span className="text-gray-400 ml-2">by {a.added_by}</span>}
            </div>
            <button type="button" onClick={() => unassignMutation.mutate(a.store_id)} className="text-red-600 hover:underline text-xs">Remove</button>
          </div>
        ))}
        {assignments.length === 0 && <p className="px-4 py-6 text-center text-gray-500 text-sm">Not assigned to any stores</p>}
      </div>
    </div>
  );
}
