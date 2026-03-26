import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

export default function TemplateDetail() {
  const { clientId, storeId, icpId, refTrackId, templateId } = useParams<{
    clientId: string; storeId: string; icpId: string; refTrackId: string; templateId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [editingFactors, setEditingFactors] = useState(false);
  const [factorsForm, setFactorsForm] = useState<Record<string, string>>({});
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [promptForm, setPromptForm] = useState({ generation_system_id: '', prompt_text: '', created_by: 'admin' });

  const { data: templateData, isLoading } = useQuery({
    queryKey: ['template', refTrackId],
    queryFn: () => api<{ data: any }>(`/api/reference-tracks/${refTrackId}/template`),
  });

  const { data: genSystemsData } = useQuery({
    queryKey: ['generation-systems'],
    queryFn: () => api<{ data: any[] }>('/api/generation-systems'),
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api(`/api/templates/${templateId}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['template', refTrackId] }); setEditingName(false); setEditingFactors(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/api/templates/${templateId}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ref-track'] }); navigate(`/clients/${clientId}/stores/${storeId}/icps/${icpId}/ref-tracks/${refTrackId}`); },
  });

  const createPromptMutation = useMutation({
    mutationFn: (body: typeof promptForm) => api(`/api/templates/${templateId}/prompts`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', refTrackId] });
      setShowPromptForm(false);
      setPromptForm({ generation_system_id: '', prompt_text: '', created_by: 'admin' });
    },
  });

  if (isLoading) return <p className="text-[rgba(255,255,255,0.3)]">Loading...</p>;
  const template = templateData?.data;
  if (!template) return <p className="text-[#e74c3c]">Template not found</p>;

  const flowFactors = template.flow_factor_values || {};
  const prompts = template.prompts || [];
  const genSystems = genSystemsData?.data || [];

  const refTrack = template.reference_track || {};
  const icpName = refTrack.store_icp?.name || 'ICP';
  const storeName = refTrack.store_icp?.store?.name || 'Store';
  const clientName = refTrack.store_icp?.store?.client?.name || 'Client';

  const basePath = `/clients/${clientId}/stores/${storeId}/icps/${icpId}/ref-tracks/${refTrackId}`;

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Clients', href: '/clients' },
        { label: clientName, href: `/clients/${clientId}` },
        { label: storeName, href: `/clients/${clientId}/stores/${storeId}` },
        { label: icpName, href: `/clients/${clientId}/stores/${storeId}/icps/${icpId}` },
        { label: refTrack.title || 'Ref Track', href: basePath },
        { label: template.name || 'Template' },
      ]} />

      {/* Template Name */}
      <div className="flex items-center gap-3 mb-6">
        {editingName ? (
          <>
            <input value={nameVal} onChange={(e) => setNameVal(e.target.value)} className="text-2xl font-light border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1 bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)]" />
            <button type="button" onClick={() => updateMutation.mutate({ name: nameVal })} className="bg-[#4a90a4] text-white px-3 py-1 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">Save</button>
            <button type="button" onClick={() => setEditingName(false)} className="border border-[rgba(255,255,255,0.1)] px-3 py-1 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-light text-[rgba(255,255,255,0.87)]">{template.name || 'Untitled Template'}</h1>
            <button type="button" onClick={() => { setNameVal(template.name || ''); setEditingName(true); }} className="text-[#4a90a4] hover:text-[#5ba3b8] text-sm transition-colors">Edit</button>
          </>
        )}
      </div>

      {/* Flow Factor Values */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-[rgba(255,255,255,0.87)]">Flow Factor Values</h2>
          {!editingFactors && (
            <button type="button" onClick={() => { setFactorsForm({ ...flowFactors }); setEditingFactors(true); }} className="text-[#4a90a4] hover:text-[#5ba3b8] text-sm transition-colors">Edit</button>
          )}
        </div>
        {editingFactors ? (
          <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-2">
            {Object.keys(factorsForm).map((key) => (
              <div key={key} className="flex items-center gap-3 text-sm">
                <label className="w-48 text-[rgba(255,255,255,0.4)]">{key}</label>
                <input
                  value={factorsForm[key]}
                  onChange={(e) => setFactorsForm({ ...factorsForm, [key]: e.target.value })}
                  className="flex-1 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 bg-[rgba(255,255,255,0.03)]"
                />
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => updateMutation.mutate({ flow_factor_values: factorsForm })} className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">Save</button>
              <button type="button" onClick={() => setEditingFactors(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <table className="w-full bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm">
            <tbody>
              {Object.entries(flowFactors).map(([k, v]) => (
                <tr key={k} className="border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <td className="px-4 py-2 text-[rgba(255,255,255,0.4)] w-1/2">{k}</td>
                  <td className="px-4 py-2 text-[rgba(255,255,255,0.87)]">{String(v)}</td>
                </tr>
              ))}
              {Object.keys(flowFactors).length === 0 && (
                <tr><td colSpan={2} className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)]">No flow factor values set</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Prompts */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium text-[rgba(255,255,255,0.87)]">Prompts</h2>
        <button type="button" onClick={() => setShowPromptForm(true)} className="bg-[#4a90a4] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">+ New Prompt</button>
      </div>

      {showPromptForm && (
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-3 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-[rgba(255,255,255,0.5)]">Generation System</label>
            <select
              value={promptForm.generation_system_id}
              onChange={(e) => setPromptForm({ ...promptForm, generation_system_id: e.target.value })}
              className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]"
            >
              <option value="">Select...</option>
              {genSystems.map((gs: any) => (
                <option key={gs.id} value={gs.id}>{gs.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[rgba(255,255,255,0.5)]">Prompt Text</label>
            <textarea
              value={promptForm.prompt_text}
              onChange={(e) => setPromptForm({ ...promptForm, prompt_text: e.target.value })}
              className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]"
              rows={5}
            />
          </div>
          <input placeholder="Created By" value={promptForm.created_by} onChange={(e) => setPromptForm({ ...promptForm, created_by: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <div className="flex gap-2">
            <button type="button" onClick={() => createPromptMutation.mutate(promptForm)} disabled={!promptForm.prompt_text} className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors">Create</button>
            <button type="button" onClick={() => setShowPromptForm(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl">
        {prompts.map((p: any) => (
          <div
            key={p.id}
            onClick={() => navigate(`${basePath}/templates/${templateId}/prompts/${p.id}`)}
            className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.03)] cursor-pointer text-sm transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-[rgba(255,255,255,0.87)]">Prompt #{p.id.slice(-6)}</span>
              <span className="text-[rgba(255,255,255,0.3)] text-xs">{p.generation_system_id || 'No system'}</span>
            </div>
            <p className="text-[rgba(255,255,255,0.4)] text-xs mt-1 truncate">{p.prompt_text}</p>
          </div>
        ))}
        {prompts.length === 0 && <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-sm">No prompts yet</p>}
      </div>

      {/* Delete Template */}
      <div className="mt-8 border-t border-[rgba(255,255,255,0.06)] pt-6">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete template "${template.name}"?`)) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="text-[#e74c3c] hover:text-[#c0392b] text-sm font-medium transition-colors"
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete Template'}
        </button>
      </div>
    </div>
  );
}
