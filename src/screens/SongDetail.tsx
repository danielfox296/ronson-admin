import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[rgba(39,174,96,0.15)] text-[#27ae60]', online: 'bg-[rgba(39,174,96,0.15)] text-[#27ae60]',
    draft: 'bg-[rgba(230,126,34,0.15)] text-[#e67e22]', onboarding: 'bg-[rgba(230,126,34,0.15)] text-[#e67e22]',
    flagged: 'bg-[rgba(231,76,60,0.15)] text-[#e74c3c]', inactive: 'bg-[rgba(231,76,60,0.15)] text-[#e74c3c]',
    archived: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]'}`}>{status}</span>;
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

  if (isLoading) return <p className="text-[rgba(255,255,255,0.3)]">Loading...</p>;
  const song = songData?.data;
  if (!song) return <p className="text-[#e74c3c]">Song not found</p>;

  const lineage = song.lineage || {};
  const flowFactors = lineage.template?.flow_factor_values || {};
  const assignments = song.store_playlists || [];
  const stores = storesData?.data || [];

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
              <input value={titleVal} onChange={(e) => setTitleVal(e.target.value)} className="text-2xl font-light border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1 bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)]" />
              <button type="button" onClick={() => updateMutation.mutate({ title: titleVal })} className="bg-[#4a90a4] text-white px-3 py-1 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">Save</button>
              <button type="button" onClick={() => setEditingTitle(false)} className="border border-[rgba(255,255,255,0.1)] px-3 py-1 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-light text-[rgba(255,255,255,0.87)]">{song.title}</h1>
              <button type="button" onClick={() => { setTitleVal(song.title || ''); setEditingTitle(true); }} className="text-[#4a90a4] hover:text-[#5ba3b8] text-sm transition-colors">Edit</button>
            </>
          )}
          {editingStatus ? (
            <div className="flex items-center gap-2">
              <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1 text-sm bg-[rgba(255,255,255,0.03)]">
                <option value="generated">generated</option>
                <option value="active">active</option>
                <option value="flagged">flagged</option>
                <option value="removed">removed</option>
              </select>
              <button type="button" onClick={() => updateMutation.mutate({ status: statusVal })} className="bg-[#4a90a4] text-white px-3 py-1 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">Save</button>
              <button type="button" onClick={() => setEditingStatus(false)} className="border border-[rgba(255,255,255,0.1)] px-3 py-1 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <StatusBadge status={song.status || 'active'} />
              <button type="button" onClick={() => { setStatusVal(song.status || 'active'); setEditingStatus(true); }} className="text-[#4a90a4] hover:text-[#5ba3b8] text-xs transition-colors">change</button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => { if (window.confirm('Delete this song?')) deleteMutation.mutate(); }}
          className="border border-[rgba(231,76,60,0.3)] text-[#e74c3c] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(231,76,60,0.1)] transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Song Info */}
      <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-6 text-sm space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-[rgba(255,255,255,0.4)]">Duration:</span> <span className="text-[rgba(255,255,255,0.87)]">{song.duration_seconds ? `${song.duration_seconds}s` : '-'}</span></div>
          <div><span className="text-[rgba(255,255,255,0.4)]">Status:</span> <span className="text-[rgba(255,255,255,0.87)]">{song.status}</span></div>
          <div><span className="text-[rgba(255,255,255,0.4)]">Generation System:</span> <span className="text-[rgba(255,255,255,0.87)]">{song.generation_system_id || '-'}</span></div>
          <div><span className="text-[rgba(255,255,255,0.4)]">Created:</span> <span className="text-[rgba(255,255,255,0.87)]">{song.created_at ? new Date(song.created_at).toLocaleDateString() : '-'}</span></div>
        </div>
        {song.audio_file_url && (
          <div>
            <span className="text-[rgba(255,255,255,0.4)] block mb-1">Audio Preview:</span>
            <audio controls src={song.audio_file_url} className="w-full" />
          </div>
        )}
      </div>

      {/* Lineage */}
      {(lineageIcp || lineageRefTrack || lineageTemplate || lineagePrompt) && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3 text-[rgba(255,255,255,0.87)]">Lineage</h2>
          <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-sm space-y-2">
            {lineageIcp && (
              <div>
                <span className="text-[rgba(255,255,255,0.4)]">ICP:</span>{' '}
                {lineageIcp.store ? (
                  <Link to={`/clients/${lineageIcp.store.client_id}/stores/${lineageIcp.store.id}/icps/${lineageIcp.id}`} className="text-[#4a90a4] hover:text-[#5ba3b8] transition-colors">{lineageIcp.name}</Link>
                ) : (
                  <span className="text-[rgba(255,255,255,0.87)]">{lineageIcp.name}</span>
                )}
              </div>
            )}
            {lineageRefTrack && (
              <div>
                <span className="text-[rgba(255,255,255,0.4)]">Reference Track:</span>{' '}
                {lineageIcp?.store ? (
                  <Link to={`/clients/${lineageIcp.store.client_id}/stores/${lineageIcp.store.id}/icps/${lineageIcp.id}/ref-tracks/${lineageRefTrack.id}`} className="text-[#4a90a4] hover:text-[#5ba3b8] transition-colors">{lineageRefTrack.title}</Link>
                ) : (
                  <span className="text-[rgba(255,255,255,0.87)]">{lineageRefTrack.title}</span>
                )}
              </div>
            )}
            {lineageTemplate && (
              <div>
                <span className="text-[rgba(255,255,255,0.4)]">Template:</span>{' '}
                {lineageIcp?.store ? (
                  <Link to={`/clients/${lineageIcp.store.client_id}/stores/${lineageIcp.store.id}/icps/${lineageIcp.id}/ref-tracks/${lineageRefTrack?.id}/templates/${lineageTemplate.id}`} className="text-[#4a90a4] hover:text-[#5ba3b8] transition-colors">{lineageTemplate.name || 'Template'}</Link>
                ) : (
                  <span className="text-[rgba(255,255,255,0.87)]">{lineageTemplate.name || 'Template'}</span>
                )}
              </div>
            )}
            {lineagePrompt && (
              <div>
                <span className="text-[rgba(255,255,255,0.4)]">Prompt:</span>{' '}
                {lineageIcp?.store && lineageTemplate ? (
                  <Link to={`/clients/${lineageIcp.store.client_id}/stores/${lineageIcp.store.id}/icps/${lineageIcp.id}/ref-tracks/${lineageRefTrack?.id}/templates/${lineageTemplate.id}/prompts/${lineagePrompt.id}`} className="text-[#4a90a4] hover:text-[#5ba3b8] transition-colors">Prompt #{(lineagePrompt.id || '').slice(-6)}</Link>
                ) : (
                  <span className="text-[rgba(255,255,255,0.87)]">Prompt #{(lineagePrompt.id || '').slice(-6)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flow Factors (read-only) */}
      {Object.keys(flowFactors).length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3 text-[rgba(255,255,255,0.87)]">Flow Factors</h2>
          <table className="w-full bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm">
            <tbody>
              {Object.entries(flowFactors).map(([k, v]) => (
                <tr key={k} className="border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <td className="px-4 py-2 text-[rgba(255,255,255,0.4)] w-1/2">{k}</td>
                  <td className="px-4 py-2 text-[rgba(255,255,255,0.87)]">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Prompt Text (read-only) */}
      {lineagePrompt?.prompt_text && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3 text-[rgba(255,255,255,0.87)]">Prompt Text</h2>
          <pre className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-sm whitespace-pre-wrap text-[rgba(255,255,255,0.7)]">{lineagePrompt.prompt_text}</pre>
        </div>
      )}

      {/* Assignments */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium text-[rgba(255,255,255,0.87)]">Store Assignments</h2>
        <button type="button" onClick={() => setShowAssign(true)} className="bg-[#4a90a4] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">+ Assign to Store</button>
      </div>

      {showAssign && (
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-3">
          <h3 className="font-medium text-sm mb-2 text-[rgba(255,255,255,0.87)]">Pick a store</h3>
          <div className="max-h-60 overflow-auto space-y-1">
            {stores.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg text-sm transition-colors">
                <span className="text-[rgba(255,255,255,0.87)]">{s.name}</span>
                <button type="button" onClick={() => assignMutation.mutate(s.id)} className="text-[#4a90a4] hover:text-[#5ba3b8] text-xs transition-colors">Assign</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setShowAssign(false)} className="mt-2 border border-[rgba(255,255,255,0.1)] px-3 py-1 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Close</button>
        </div>
      )}

      <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl">
        {assignments.map((a: any) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 text-sm">
            <div>
              <span className="text-[rgba(255,255,255,0.87)]">{a.store?.name || 'Store'}</span>
              {a.added_by && <span className="text-[rgba(255,255,255,0.3)] ml-2">by {a.added_by}</span>}
            </div>
            <button type="button" onClick={() => unassignMutation.mutate(a.store_id)} className="text-[#e74c3c] hover:text-[#c0392b] text-xs transition-colors">Remove</button>
          </div>
        ))}
        {assignments.length === 0 && <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-sm">Not assigned to any stores</p>}
      </div>
    </div>
  );
}
