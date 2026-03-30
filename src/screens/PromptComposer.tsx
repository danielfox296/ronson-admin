import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function PromptComposer() {
  const navigate = useNavigate();
  const [selectedIcpId, setSelectedIcpId] = useState('');
  const [flowValues, setFlowValues] = useState<Record<string, string>>({});
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [promptTitle, setPromptTitle] = useState('');
  const [selectedGenSystem, setSelectedGenSystem] = useState('');

  // Fetch all ICPs across all stores
  const { data: clientsData } = useQuery({
    queryKey: ['clients-for-compose'],
    queryFn: () => api<{ data: any[] }>('/api/clients'),
  });

  // Fetch stores for each client to get ICPs
  const { data: allStoresData } = useQuery({
    queryKey: ['all-stores-for-compose'],
    queryFn: async () => {
      const clients = (clientsData?.data || []);
      const storesPromises = clients.map((c: any) =>
        api<{ data: any[] }>(`/api/clients/${c.id}/stores`)
      );
      const results = await Promise.all(storesPromises);
      return results.flatMap((r: any) => r.data || []);
    },
    enabled: !!clientsData?.data?.length,
  });

  // Fetch ICPs for each store
  const { data: allIcpsData } = useQuery({
    queryKey: ['all-icps-for-compose', allStoresData?.length],
    queryFn: async () => {
      const stores = allStoresData || [];
      const icpPromises = stores.map((s: any) =>
        api<{ data: any[] }>(`/api/stores/${s.id}/icps`).then((r: any) =>
          (r.data || []).map((icp: any) => ({ ...icp, store_name: s.name, client_name: s.client?.name }))
        )
      );
      const results = await Promise.all(icpPromises);
      return results.flat();
    },
    enabled: !!allStoresData?.length,
  });

  const icps = allIcpsData || [];

  // Fetch flow factor configs
  const { data: ffData } = useQuery({
    queryKey: ['flow-factor-configs'],
    queryFn: () => api<{ data: any[] }>('/api/flow-factor-configs'),
  });

  const flowConfigs = ffData?.data || [];

  // Fetch generation systems
  const { data: gsData } = useQuery({
    queryKey: ['generation-systems'],
    queryFn: () => api<{ data: any[] }>('/api/generation-systems'),
  });

  const genSystems = gsData?.data || [];

  // Fetch reference tracks for selected ICP
  const { data: refTracksData } = useQuery({
    queryKey: ['ref-tracks-compose', selectedIcpId],
    queryFn: () => api<{ data: any[] }>(`/api/store-icps/${selectedIcpId}/reference-tracks`),
    enabled: !!selectedIcpId,
  });

  const refTracks = refTracksData?.data || [];
  const selectedIcp = useMemo(() => icps.find((i: any) => i.id === selectedIcpId), [icps, selectedIcpId]);

  // Generate prompt
  const generateMutation = useMutation({
    mutationFn: () => api<{ data: any }>('/api/compose/generate', {
      method: 'POST',
      body: {
        store_icp_id: selectedIcpId,
        flow_factor_values: flowValues,
        additional_instructions: additionalInstructions || undefined,
      },
    }),
    onSuccess: (result) => {
      setGeneratedPrompt(result.data.prompt_text);
    },
  });

  // Save prompt as draft song
  const saveMutation = useMutation({
    mutationFn: () => api<{ data: any }>('/api/compose/save', {
      method: 'POST',
      body: {
        store_icp_id: selectedIcpId,
        prompt_text: generatedPrompt,
        flow_factor_values: flowValues,
        generation_system_id: selectedGenSystem || undefined,
        title: promptTitle || 'Composed Prompt',
      },
    }),
    onSuccess: (result) => {
      navigate(`/songs/${result.data.id}`);
    },
  });

  // Group flow factors by category
  const groupedFlowFactors = useMemo(() => {
    const groups: Record<string, any[]> = {};
    flowConfigs.forEach((fc: any) => {
      if (!groups[fc.category]) groups[fc.category] = [];
      groups[fc.category].push(fc);
    });
    return groups;
  }, [flowConfigs]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[rgba(255,255,255,0.93)]">
          Prompt <span className="text-[#4a90a4] font-normal italic">Composer</span>
        </h1>
        <p className="text-[rgba(255,255,255,0.4)] text-sm mt-1">
          Generate AI music prompts from audience profiles and flow factors.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {/* Left: Inputs */}
        <div className="space-y-5">
          {/* ICP Selection */}
          <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.35)] block mb-3">Target Audience</label>
            <select
              value={selectedIcpId}
              onChange={(e) => { setSelectedIcpId(e.target.value); setGeneratedPrompt(''); }}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm"
            >
              <option value="">Select an audience profile...</option>
              {icps.map((icp: any) => (
                <option key={icp.id} value={icp.id}>
                  {icp.name} — {icp.store_name} ({icp.client_name})
                </option>
              ))}
            </select>

            {selectedIcp && (
              <div className="mt-4 space-y-2 text-xs text-[rgba(255,255,255,0.5)]">
                {selectedIcp.psychographic_summary && (
                  <p><span className="text-[rgba(255,255,255,0.3)]">Psychographic:</span> {selectedIcp.psychographic_summary}</p>
                )}
                {selectedIcp.preferences && (
                  <p><span className="text-[rgba(255,255,255,0.3)]">Preferences:</span> {selectedIcp.preferences}</p>
                )}
              </div>
            )}

            {refTracks.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.25)] mb-2">Reference Tracks ({refTracks.length})</p>
                <div className="space-y-1">
                  {refTracks.map((t: any) => (
                    <div key={t.id} className="text-xs text-[rgba(255,255,255,0.5)]">
                      {t.title} — <span className="text-[rgba(255,255,255,0.3)]">{t.artist}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Flow Factors */}
          {Object.keys(groupedFlowFactors).length > 0 && (
            <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.35)] block mb-3">Flow Factors</label>
              <div className="space-y-4">
                {Object.entries(groupedFlowFactors).map(([category, factors]) => (
                  <div key={category}>
                    <p className="text-[10px] text-[rgba(255,255,255,0.25)] uppercase tracking-wider mb-2">{category}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {factors.map((fc: any) => (
                        <div key={fc.id} className="flex items-center gap-2">
                          <label className="text-xs text-[rgba(255,255,255,0.5)] min-w-0 truncate flex-1" title={fc.description || fc.display_name}>{fc.display_name}</label>
                          {fc.value_type === 'enum' && fc.value_options ? (
                            <select
                              value={flowValues[fc.name] || ''}
                              onChange={(e) => setFlowValues({ ...flowValues, [fc.name]: e.target.value })}
                              className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1 text-xs w-28"
                            >
                              <option value="">-</option>
                              {(fc.value_options as string[]).map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : fc.value_type === 'scale' ? (
                            <input
                              type="range"
                              min={fc.value_range_low || 1}
                              max={fc.value_range_high || 10}
                              value={flowValues[fc.name] || Math.round(((fc.value_range_low || 1) + (fc.value_range_high || 10)) / 2)}
                              onChange={(e) => setFlowValues({ ...flowValues, [fc.name]: e.target.value })}
                              className="w-20 accent-[#4a90a4]"
                            />
                          ) : (
                            <input
                              type="text"
                              value={flowValues[fc.name] || ''}
                              onChange={(e) => setFlowValues({ ...flowValues, [fc.name]: e.target.value })}
                              placeholder="value"
                              className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1 text-xs w-28"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Instructions */}
          <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.35)] block mb-3">Additional Instructions</label>
            <textarea
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="e.g., 'Keep it under 120 BPM, avoid vocals, lean into ambient textures...'"
              rows={3}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm resize-none placeholder:text-[rgba(255,255,255,0.15)]"
            />
          </div>

          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={!selectedIcpId || generateMutation.isPending}
            className="w-full bg-gradient-to-br from-[#4a90a4] to-[#2d6a80] text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-[#4a90a4]/10 flex items-center justify-center gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Generate Prompt
              </>
            )}
          </button>
        </div>

        {/* Right: Output */}
        <div className="space-y-5">
          <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 min-h-[300px]">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.35)] block mb-3">Generated Prompt</label>

            {generateMutation.isError && (
              <p className="text-[#e74c3c] text-sm mb-3">{(generateMutation.error as Error).message}</p>
            )}

            {generatedPrompt ? (
              <div className="space-y-4">
                <textarea
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                  rows={8}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm leading-relaxed resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(generatedPrompt); }}
                    className="flex-1 bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.7)] py-2 rounded-lg text-sm font-medium hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    type="button"
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    className="bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] py-2 px-4 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg className="w-10 h-10 text-[rgba(255,255,255,0.1)] mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <p className="text-[rgba(255,255,255,0.2)] text-sm">Select an audience and click Generate</p>
              </div>
            )}
          </div>

          {/* Save as Draft */}
          {generatedPrompt && (
            <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.35)] block">Save as Draft Song</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={promptTitle}
                  onChange={(e) => setPromptTitle(e.target.value)}
                  placeholder="Song title..."
                  className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm"
                />
                <select
                  value={selectedGenSystem}
                  onChange={(e) => setSelectedGenSystem(e.target.value)}
                  className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Generation system...</option>
                  {genSystems.map((gs: any) => (
                    <option key={gs.id} value={gs.id}>{gs.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full bg-[#4a90a4] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Draft & View'}
              </button>
              {saveMutation.isError && (
                <p className="text-[#e74c3c] text-xs">{(saveMutation.error as Error).message}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
