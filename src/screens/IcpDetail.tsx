import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

export default function IcpDetail() {
  const { clientId, storeId, icpId } = useParams<{ clientId: string; storeId: string; icpId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showRefForm, setShowRefForm] = useState(false);
  const [refForm, setRefForm] = useState({ title: '', artist: '', genre: '', album: '', duration_seconds: '', release_year: '' });

  const { data: icpData, isLoading } = useQuery({
    queryKey: ['icp', icpId],
    queryFn: () => api<{ data: any }>(`/api/store-icps/${icpId}`),
  });

  const { data: refTracksData } = useQuery({
    queryKey: ['icp-ref-tracks', icpId],
    queryFn: () => api<{ data: any[] }>(`/api/store-icps/${icpId}/reference-tracks`),
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api(`/api/store-icps/${icpId}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['icp', icpId] }); setEditing(false); },
  });

  const createRefMutation = useMutation({
    mutationFn: (body: any) => api(`/api/store-icps/${icpId}/reference-tracks`, { method: 'POST', body: { ...body, duration_seconds: body.duration_seconds ? Number(body.duration_seconds) : undefined, release_year: body.release_year ? Number(body.release_year) : undefined } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['icp-ref-tracks', icpId] });
      setShowRefForm(false);
      setRefForm({ title: '', artist: '', genre: '', album: '', duration_seconds: '', release_year: '' });
    },
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  const icp = icpData?.data;
  if (!icp) return <p className="text-red-600">ICP not found</p>;

  const refTracks = refTracksData?.data || [];
  const storeName = icp.store?.name || 'Store';
  const clientName = icp.store?.client?.name || 'Client';

  const startEdit = () => {
    setEditForm({ name: icp.name, description: icp.description || '' });
    setEditing(true);
  };

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Clients', href: '/clients' },
        { label: clientName, href: `/clients/${clientId}` },
        { label: storeName, href: `/clients/${clientId}/stores/${storeId}` },
        { label: icp.name },
      ]} />

      <h1 className="text-2xl font-bold mb-4">{icp.name}</h1>

      {editing ? (
        <div className="bg-white border rounded-lg p-4 mb-6 space-y-3">
          <input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <textarea placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" rows={3} />
          <div className="flex gap-2">
            <button type="button" onClick={() => updateMutation.mutate(editForm)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-4 mb-6 text-sm">
          {icp.description && <p className="text-gray-600 mb-2">{icp.description}</p>}
          {icp.age_range && <div><span className="text-gray-500">Age Range:</span> {icp.age_range}</div>}
          {icp.gender && <div><span className="text-gray-500">Gender:</span> {icp.gender}</div>}
          {icp.lifestyle_tags && <div><span className="text-gray-500">Lifestyle:</span> {Array.isArray(icp.lifestyle_tags) ? icp.lifestyle_tags.join(', ') : icp.lifestyle_tags}</div>}
          <button type="button" onClick={startEdit} className="mt-3 text-blue-600 hover:underline">Edit</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Reference Tracks</h2>
        <button type="button" onClick={() => setShowRefForm(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">+ New Reference Track</button>
      </div>

      {showRefForm && (
        <div className="bg-white border rounded-lg p-4 mb-3 space-y-3">
          <input placeholder="Title" value={refForm.title} onChange={(e) => setRefForm({ ...refForm, title: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Artist" value={refForm.artist} onChange={(e) => setRefForm({ ...refForm, artist: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Genre" value={refForm.genre} onChange={(e) => setRefForm({ ...refForm, genre: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Album" value={refForm.album} onChange={(e) => setRefForm({ ...refForm, album: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Duration (sec)" type="number" value={refForm.duration_seconds} onChange={(e) => setRefForm({ ...refForm, duration_seconds: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Release Year" type="number" value={refForm.release_year} onChange={(e) => setRefForm({ ...refForm, release_year: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => createRefMutation.mutate(refForm)} disabled={!refForm.title} className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">Create</button>
            <button type="button" onClick={() => setShowRefForm(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg">
        {refTracks.map((rt: any) => (
          <div
            key={rt.id}
            onClick={() => navigate(`/clients/${clientId}/stores/${storeId}/icps/${icpId}/ref-tracks/${rt.id}`)}
            className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer text-sm"
          >
            <div>
              <span className="font-medium">{rt.title}</span>
              {rt.artist && <span className="text-gray-500 ml-2">by {rt.artist}</span>}
            </div>
            {rt.genre && <span className="text-gray-400 text-xs">{rt.genre}</span>}
          </div>
        ))}
        {refTracks.length === 0 && <p className="px-4 py-6 text-center text-gray-500 text-sm">No reference tracks yet</p>}
      </div>
    </div>
  );
}
