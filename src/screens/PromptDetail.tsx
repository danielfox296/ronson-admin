import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';
import FileUpload from '../components/FileUpload.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    flagged: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-800',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
}

export default function PromptDetail() {
  const { clientId, storeId, icpId, refTrackId, templateId, promptId } = useParams<{
    clientId: string; storeId: string; icpId: string; refTrackId: string; templateId: string; promptId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ title: '', audio_file_url: '', duration_seconds: '', generation_system_id: '' });

  const { data: promptData, isLoading } = useQuery({
    queryKey: ['prompt', promptId],
    queryFn: () => api<{ data: any }>(`/api/prompts/${promptId}`),
  });

  const { data: genSystemsData } = useQuery({
    queryKey: ['generation-systems'],
    queryFn: () => api<{ data: any[] }>('/api/generation-systems'),
  });

  const generateMutation = useMutation({
    mutationFn: (body: any) => api(`/api/songs/from-prompt/${promptId}`, {
      method: 'POST',
      body: {
        title: body.title,
        audio_file_url: body.audio_file_url,
        duration_seconds: body.duration_seconds ? Number(body.duration_seconds) : undefined,
        generation_system_id: body.generation_system_id || undefined,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt', promptId] });
      setShowGenModal(false);
      setGenForm({ title: '', audio_file_url: '', duration_seconds: '', generation_system_id: '' });
    },
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  const prompt = promptData?.data;
  if (!prompt) return <p className="text-red-600">Prompt not found</p>;

  const songs = prompt.songs || [];
  const genSystems = genSystemsData?.data || [];

  const tmpl = prompt.template || {};
  const refTrack = tmpl.reference_track || {};
  const icp = refTrack.store_icp || {};
  const store = icp.store || {};
  const client = store.client || {};

  const basePath = `/clients/${clientId}/stores/${storeId}/icps/${icpId}/ref-tracks/${refTrackId}`;

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Clients', href: '/clients' },
        { label: client.name || 'Client', href: `/clients/${clientId}` },
        { label: store.name || 'Store', href: `/clients/${clientId}/stores/${storeId}` },
        { label: icp.name || 'ICP', href: `/clients/${clientId}/stores/${storeId}/icps/${icpId}` },
        { label: refTrack.title || 'Ref Track', href: basePath },
        { label: tmpl.name || 'Template', href: `${basePath}/templates/${templateId}` },
        { label: `Prompt #${(promptId || '').slice(-6)}` },
      ]} />

      <h1 className="text-2xl font-bold mb-4">Prompt Detail</h1>

      <div className="bg-white border rounded-lg p-4 mb-6 text-sm space-y-3">
        <div><span className="text-gray-500">Generation System:</span> {prompt.generation_system_id || 'Not set'}</div>
        <div><span className="text-gray-500">Created By:</span> {prompt.created_by || '-'}</div>
        <div>
          <span className="text-gray-500 block mb-1">Prompt Text:</span>
          <pre className="bg-gray-50 border rounded p-3 whitespace-pre-wrap text-xs">{prompt.prompt_text}</pre>
        </div>
      </div>

      {/* Songs */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Songs</h2>
        <button type="button" onClick={() => setShowGenModal(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">Generate New Song</button>
      </div>

      {showGenModal && (
        <div className="bg-white border rounded-lg p-4 mb-3 space-y-3">
          <h3 className="font-semibold text-sm">Generate New Song</h3>
          <input placeholder="Title" value={genForm.title} onChange={(e) => setGenForm({ ...genForm, title: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <FileUpload onUploaded={(url) => setGenForm({ ...genForm, audio_file_url: url })} />
          {genForm.audio_file_url && <p className="text-green-600 text-xs">Audio file uploaded</p>}
          <input placeholder="Duration (seconds)" type="number" value={genForm.duration_seconds} onChange={(e) => setGenForm({ ...genForm, duration_seconds: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <select value={genForm.generation_system_id} onChange={(e) => setGenForm({ ...genForm, generation_system_id: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">Generation System (optional)</option>
            {genSystems.map((gs: any) => (
              <option key={gs.id} value={gs.id}>{gs.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => generateMutation.mutate(genForm)}
              disabled={!genForm.title || !genForm.audio_file_url || generateMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {generateMutation.isPending ? 'Creating...' : 'Create Song'}
            </button>
            <button type="button" onClick={() => setShowGenModal(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
          {generateMutation.isError && <p className="text-red-600 text-sm">{(generateMutation.error as Error).message}</p>}
        </div>
      )}

      <div className="bg-white border rounded-lg">
        {songs.map((s: any) => (
          <div
            key={s.id}
            onClick={() => navigate(`/songs/${s.id}`)}
            className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer text-sm"
          >
            <span className="font-medium">{s.title}</span>
            <StatusBadge status={s.status || 'active'} />
          </div>
        ))}
        {songs.length === 0 && <p className="px-4 py-6 text-center text-gray-500 text-sm">No songs generated yet</p>}
      </div>
    </div>
  );
}
