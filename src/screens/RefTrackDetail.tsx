import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

export default function RefTrackDetail() {
  const { clientId, storeId, icpId, refTrackId } = useParams<{
    clientId: string; storeId: string; icpId: string; refTrackId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const { data: refData, isLoading } = useQuery({
    queryKey: ['ref-track', refTrackId],
    queryFn: () => api<{ data: any }>(`/api/reference-tracks/${refTrackId}`),
  });

  const { data: templateData, isLoading: templateLoading, error: templateError } = useQuery({
    queryKey: ['ref-track-template', refTrackId],
    queryFn: () => api<{ data: any }>(`/api/reference-tracks/${refTrackId}/template`),
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api(`/api/reference-tracks/${refTrackId}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ref-track', refTrackId] }); setEditing(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/api/reference-tracks/${refTrackId}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['icp-ref-tracks'] }); navigate(`/clients/${clientId}/stores/${storeId}/icps/${icpId}`); },
  });

  const createTemplateMutation = useMutation({
    mutationFn: () => api(`/api/reference-tracks/${refTrackId}/template`, { method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ref-track-template', refTrackId] }),
  });

  if (isLoading) return <p className="text-[rgba(255,255,255,0.3)]">Loading...</p>;
  const ref = refData?.data;
  if (!ref) return <p className="text-[#e74c3c]">Reference track not found</p>;

  const template = templateData?.data;
  const hasTemplate = !!template && !templateError;

  const icpName = ref.store_icp?.name || 'ICP';
  const storeName = ref.store_icp?.store?.name || 'Store';
  const clientName = ref.store_icp?.store?.client?.name || 'Client';

  const startEdit = () => {
    setEditForm({ title: ref.title, artist: ref.artist, genre: ref.genre, album: ref.album, duration_seconds: ref.duration_seconds, release_year: ref.release_year });
    setEditing(true);
  };

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Clients', href: '/clients' },
        { label: clientName, href: `/clients/${clientId}` },
        { label: storeName, href: `/clients/${clientId}/stores/${storeId}` },
        { label: icpName, href: `/clients/${clientId}/stores/${storeId}/icps/${icpId}` },
        { label: ref.title },
      ]} />

      <h1 className="text-2xl font-light mb-4 text-[rgba(255,255,255,0.87)]">{ref.title}</h1>

      {editing ? (
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-6 space-y-3">
          <input placeholder="Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Artist" value={editForm.artist || ''} onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            <input placeholder="Genre" value={editForm.genre || ''} onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Album" value={editForm.album || ''} onChange={(e) => setEditForm({ ...editForm, album: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            <input placeholder="Duration (sec)" type="number" value={editForm.duration_seconds || ''} onChange={(e) => setEditForm({ ...editForm, duration_seconds: e.target.value ? Number(e.target.value) : '' })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            <input placeholder="Release Year" type="number" value={editForm.release_year || ''} onChange={(e) => setEditForm({ ...editForm, release_year: e.target.value ? Number(e.target.value) : '' })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => updateMutation.mutate(editForm)} className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-6 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-[rgba(255,255,255,0.4)]">Artist:</span> <span className="text-[rgba(255,255,255,0.87)]">{ref.artist || '-'}</span></div>
            <div><span className="text-[rgba(255,255,255,0.4)]">Genre:</span> <span className="text-[rgba(255,255,255,0.87)]">{ref.genre || '-'}</span></div>
            <div><span className="text-[rgba(255,255,255,0.4)]">Album:</span> <span className="text-[rgba(255,255,255,0.87)]">{ref.album || '-'}</span></div>
            <div><span className="text-[rgba(255,255,255,0.4)]">Duration:</span> <span className="text-[rgba(255,255,255,0.87)]">{ref.duration_seconds ? `${ref.duration_seconds}s` : '-'}</span></div>
            <div><span className="text-[rgba(255,255,255,0.4)]">Release Year:</span> <span className="text-[rgba(255,255,255,0.87)]">{ref.release_year || '-'}</span></div>
          </div>
          <button type="button" onClick={startEdit} className="mt-3 text-[#4a90a4] hover:text-[#5ba3b8] transition-colors">Edit</button>
        </div>
      )}

      {/* Template Section */}
      <h2 className="text-lg font-medium mb-3 text-[rgba(255,255,255,0.87)]">Template</h2>
      {templateLoading ? (
        <p className="text-[rgba(255,255,255,0.3)] text-sm">Loading template...</p>
      ) : hasTemplate ? (
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-sm text-[rgba(255,255,255,0.87)]">{template.name || 'Template'}</span>
            <button
              type="button"
              onClick={() => navigate(`/clients/${clientId}/stores/${storeId}/icps/${icpId}/ref-tracks/${refTrackId}/templates/${template.id}`)}
              className="text-[#4a90a4] hover:text-[#5ba3b8] text-sm transition-colors"
            >
              View Details
            </button>
          </div>
          {template.flow_factor_values && Object.keys(template.flow_factor_values).length > 0 && (
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(template.flow_factor_values).map(([k, v]) => (
                  <tr key={k} className="border-t border-[rgba(255,255,255,0.04)]">
                    <td className="py-2 text-[rgba(255,255,255,0.4)] pr-4">{k}</td>
                    <td className="py-2 text-[rgba(255,255,255,0.87)]">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 text-center">
          <p className="text-[rgba(255,255,255,0.3)] text-sm mb-3">No template exists for this reference track</p>
          <button
            type="button"
            onClick={() => createTemplateMutation.mutate()}
            disabled={createTemplateMutation.isPending}
            className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5ba3b8] disabled:opacity-50 transition-colors"
          >
            {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      )}

      {/* Delete Reference Track */}
      <div className="mt-8 border-t border-[rgba(255,255,255,0.06)] pt-6">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete "${ref.title}"?`)) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="text-[#e74c3c] hover:text-[#c0392b] text-sm font-medium transition-colors"
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete Reference Track'}
        </button>
      </div>
    </div>
  );
}
