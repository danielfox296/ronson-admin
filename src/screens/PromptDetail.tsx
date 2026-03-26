import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';
import FileUpload from '../components/FileUpload.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[rgba(39,174,96,0.15)] text-[#27ae60]',
    draft: 'bg-[rgba(230,126,34,0.15)] text-[#e67e22]',
    flagged: 'bg-[rgba(231,76,60,0.15)] text-[#e74c3c]',
    archived: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]'}`}>{status}</span>;
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

  if (isLoading) return <p className="text-[rgba(255,255,255,0.3)]">Loading...</p>;
  const prompt = promptData?.data;
  if (!prompt) return <p className="text-[#e74c3c]">Prompt not found</p>;

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

      <h1 className="text-2xl font-light mb-4 text-[rgba(255,255,255,0.87)]">Prompt Detail</h1>

      <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-6 text-sm space-y-3">
        <div><span className="text-[rgba(255,255,255,0.4)]">Generation System:</span> <span className="text-[rgba(255,255,255,0.87)]">{prompt.generation_system_id || 'Not set'}</span></div>
        <div><span className="text-[rgba(255,255,255,0.4)]">Created By:</span> <span className="text-[rgba(255,255,255,0.87)]">{prompt.created_by || '-'}</span></div>
        <div>
          <span className="text-[rgba(255,255,255,0.4)] block mb-1">Prompt Text:</span>
          <pre className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 whitespace-pre-wrap text-xs text-[rgba(255,255,255,0.7)]">{prompt.prompt_text}</pre>
        </div>
      </div>

      {/* Songs */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium text-[rgba(255,255,255,0.87)]">Songs</h2>
        <button type="button" onClick={() => setShowGenModal(true)} className="bg-[#4a90a4] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">Generate New Song</button>
      </div>

      {showGenModal && (
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-3 space-y-3">
          <h3 className="font-medium text-sm text-[rgba(255,255,255,0.87)]">Generate New Song</h3>
          <input placeholder="Title" value={genForm.title} onChange={(e) => setGenForm({ ...genForm, title: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <FileUpload onUploaded={(url) => setGenForm({ ...genForm, audio_file_url: url })} />
          {genForm.audio_file_url && <p className="text-[#27ae60] text-xs">Audio file uploaded</p>}
          <input placeholder="Duration (seconds)" type="number" value={genForm.duration_seconds} onChange={(e) => setGenForm({ ...genForm, duration_seconds: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <select value={genForm.generation_system_id} onChange={(e) => setGenForm({ ...genForm, generation_system_id: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]">
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
              className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors"
            >
              {generateMutation.isPending ? 'Creating...' : 'Create Song'}
            </button>
            <button type="button" onClick={() => setShowGenModal(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
          </div>
          {generateMutation.isError && <p className="text-[#e74c3c] text-sm">{(generateMutation.error as Error).message}</p>}
        </div>
      )}

      <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl">
        {songs.map((s: any) => (
          <div
            key={s.id}
            onClick={() => navigate(`/songs/${s.id}`)}
            className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.03)] cursor-pointer text-sm transition-colors"
          >
            <span className="font-medium text-[rgba(255,255,255,0.87)]">{s.title}</span>
            <StatusBadge status={s.status || 'active'} />
          </div>
        ))}
        {songs.length === 0 && <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-sm">No songs generated yet</p>}
      </div>
    </div>
  );
}
