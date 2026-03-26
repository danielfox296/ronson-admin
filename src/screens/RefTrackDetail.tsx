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

  const createTemplateMutation = useMutation({
    mutationFn: () => api(`/api/reference-tracks/${refTrackId}/template`, { method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ref-track-template', refTrackId] }),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  const ref = refData?.data;
  if (!ref) return <p className="text-red-600">Reference track not found</p>;

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

      <h1 className="text-2xl font-bold mb-4">{ref.title}</h1>

      {editing ? (
        <div className="bg-white border rounded-lg p-4 mb-6 space-y-3">
          <input placeholder="Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Artist" value={editForm.artist || ''} onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Genre" value={editForm.genre || ''} onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Album" value={editForm.album || ''} onChange={(e) => setEditForm({ ...editForm, album: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Duration (sec)" type="number" value={editForm.duration_seconds || ''} onChange={(e) => setEditForm({ ...editForm, duration_seconds: e.target.value ? Number(e.target.value) : '' })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Release Year" type="number" value={editForm.release_year || ''} onChange={(e) => setEditForm({ ...editForm, release_year: e.target.value ? Number(e.target.value) : '' })} className="border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => updateMutation.mutate(editForm)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-4 mb-6 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-500">Artist:</span> {ref.artist || '-'}</div>
            <div><span className="text-gray-500">Genre:</span> {ref.genre || '-'}</div>
            <div><span className="text-gray-500">Album:</span> {ref.album || '-'}</div>
            <div><span className="text-gray-500">Duration:</span> {ref.duration_seconds ? `${ref.duration_seconds}s` : '-'}</div>
            <div><span className="text-gray-500">Release Year:</span> {ref.release_year || '-'}</div>
          </div>
          <button type="button" onClick={startEdit} className="mt-3 text-blue-600 hover:underline">Edit</button>
        </div>
      )}

      {/* Template Section */}
      <h2 className="text-lg font-semibold mb-3">Template</h2>
      {templateLoading ? (
        <p className="text-gray-500 text-sm">Loading template...</p>
      ) : hasTemplate ? (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-sm">{template.name || 'Template'}</span>
            <button
              type="button"
              onClick={() => navigate(`/clients/${clientId}/stores/${storeId}/icps/${icpId}/ref-tracks/${refTrackId}/templates/${template.id}`)}
              className="text-blue-600 hover:underline text-sm"
            >
              View Details
            </button>
          </div>
          {template.flow_factor_values && Object.keys(template.flow_factor_values).length > 0 && (
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(template.flow_factor_values).map(([k, v]) => (
                  <tr key={k} className="border-t">
                    <td className="py-2 text-gray-500 pr-4">{k}</td>
                    <td className="py-2">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-6 text-center">
          <p className="text-gray-500 text-sm mb-3">No template exists for this reference track</p>
          <button
            type="button"
            onClick={() => createTemplateMutation.mutate()}
            disabled={createTemplateMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      )}
    </div>
  );
}
