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

  const deleteMutation = useMutation({
    mutationFn: () => api(`/api/store-icps/${icpId}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store-icps'] }); navigate(`/clients/${clientId}/stores/${storeId}`); },
  });

  const createRefMutation = useMutation({
    mutationFn: (body: any) => api(`/api/store-icps/${icpId}/reference-tracks`, { method: 'POST', body: { ...body, duration_seconds: body.duration_seconds ? Number(body.duration_seconds) : undefined, release_year: body.release_year ? Number(body.release_year) : undefined } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['icp-ref-tracks', icpId] });
      setShowRefForm(false);
      setRefForm({ title: '', artist: '', genre: '', album: '', duration_seconds: '', release_year: '' });
    },
  });

  if (isLoading) return <p className="text-[rgba(255,255,255,0.3)]">Loading...</p>;
  const icp = icpData?.data;
  if (!icp) return <p className="text-[#e74c3c]">ICP not found</p>;

  const refTracks = refTracksData?.data || [];
  const storeName = icp.store?.name || 'Store';
  const clientName = icp.store?.client?.name || 'Client';

  const startEdit = () => {
    setEditForm({ name: icp.name, psychographic_summary: icp.psychographic_summary || '' });
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

      <h1 className="text-2xl font-light mb-4 text-[rgba(255,255,255,0.87)]">{icp.name}</h1>

      {editing ? (
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-6 space-y-3">
          <input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <textarea placeholder="Psychographic Summary" value={editForm.psychographic_summary} onChange={(e) => setEditForm({ ...editForm, psychographic_summary: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" rows={3} />
          <div className="flex gap-2">
            <button type="button" onClick={() => updateMutation.mutate(editForm)} className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-6 text-sm">
          {icp.psychographic_summary && <p className="text-[rgba(255,255,255,0.5)] mb-2">{icp.psychographic_summary}</p>}
          {icp.age_range && <div><span className="text-[rgba(255,255,255,0.4)]">Age Range:</span> <span className="text-[rgba(255,255,255,0.87)]">{icp.age_range}</span></div>}
          {icp.gender && <div><span className="text-[rgba(255,255,255,0.4)]">Gender:</span> <span className="text-[rgba(255,255,255,0.87)]">{icp.gender}</span></div>}
          {icp.lifestyle_tags && <div><span className="text-[rgba(255,255,255,0.4)]">Lifestyle:</span> <span className="text-[rgba(255,255,255,0.87)]">{Array.isArray(icp.lifestyle_tags) ? icp.lifestyle_tags.join(', ') : icp.lifestyle_tags}</span></div>}
          <button type="button" onClick={startEdit} className="mt-3 text-[#4a90a4] hover:text-[#5ba3b8] transition-colors">Edit</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium text-[rgba(255,255,255,0.87)]">Reference Tracks</h2>
        <button type="button" onClick={() => setShowRefForm(true)} className="bg-[#4a90a4] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">+ New Reference Track</button>
      </div>

      {showRefForm && (
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-3 space-y-3">
          <input placeholder="Title" value={refForm.title} onChange={(e) => setRefForm({ ...refForm, title: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Artist" value={refForm.artist} onChange={(e) => setRefForm({ ...refForm, artist: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            <input placeholder="Genre" value={refForm.genre} onChange={(e) => setRefForm({ ...refForm, genre: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Album" value={refForm.album} onChange={(e) => setRefForm({ ...refForm, album: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            <input placeholder="Duration (sec)" type="number" value={refForm.duration_seconds} onChange={(e) => setRefForm({ ...refForm, duration_seconds: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            <input placeholder="Release Year" type="number" value={refForm.release_year} onChange={(e) => setRefForm({ ...refForm, release_year: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => createRefMutation.mutate(refForm)} disabled={!refForm.title} className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors">Create</button>
            <button type="button" onClick={() => setShowRefForm(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl">
        {refTracks.map((rt: any) => (
          <div
            key={rt.id}
            onClick={() => navigate(`/clients/${clientId}/stores/${storeId}/icps/${icpId}/ref-tracks/${rt.id}`)}
            className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.03)] cursor-pointer text-sm transition-colors"
          >
            <div>
              <span className="font-medium text-[rgba(255,255,255,0.87)]">{rt.title}</span>
              {rt.artist && <span className="text-[rgba(255,255,255,0.4)] ml-2">by {rt.artist}</span>}
            </div>
            {rt.genre && <span className="text-[rgba(255,255,255,0.3)] text-xs">{rt.genre}</span>}
          </div>
        ))}
        {refTracks.length === 0 && <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-sm">No reference tracks yet</p>}
      </div>

      {/* Delete ICP */}
      <div className="mt-8 border-t border-[rgba(255,255,255,0.06)] pt-6">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete ${icp.name}?`)) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="text-[#e74c3c] hover:text-[#c0392b] text-sm font-medium transition-colors"
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete ICP'}
        </button>
      </div>
    </div>
  );
}
