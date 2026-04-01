import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, uploadFile } from '../lib/api.js';

export default function PromptComposer() {
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedIcpId, setSelectedIcpId] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [creativeDirection, setCreativeDirection] = useState('');
  const [selectedGenSystem, setSelectedGenSystem] = useState('');
  const [promptTitle, setPromptTitle] = useState('');
  const [generatingTrackId, setGeneratingTrackId] = useState<string | null>(null);
  const [droppedFile, setDroppedFile] = useState<{ file: File; name: string; duration: number } | null>(null);

  // Generated output fields
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [styleNegations, setStyleNegations] = useState('');
  const [voice, setVoice] = useState('');

  // Restore cached output on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('compose-output');
      if (cached) {
        const d = JSON.parse(cached);
        if (d.selectedIcpId) setSelectedIcpId(d.selectedIcpId);
        if (d.selectedStoreId) setSelectedStoreId(d.selectedStoreId);
        if (d.selectedClientId) setSelectedClientId(d.selectedClientId);
        if (d.lyrics) setLyrics(d.lyrics);
        if (d.style) setStyle(d.style);
        if (d.styleNegations) setStyleNegations(d.styleNegations);
        if (d.voice) setVoice(d.voice);
        if (d.promptTitle) setPromptTitle(d.promptTitle);
        if (d.creativeDirection) setCreativeDirection(d.creativeDirection);
      }
    } catch { /* ignore parse errors */ }
  }, []);

  // Cache output whenever it changes
  const cacheOutput = useCallback(() => {
    if (lyrics || style || styleNegations || voice) {
      sessionStorage.setItem('compose-output', JSON.stringify({
        selectedClientId, selectedStoreId, selectedIcpId,
        lyrics, style, styleNegations, voice, promptTitle, creativeDirection,
      }));
    }
  }, [selectedClientId, selectedStoreId, selectedIcpId, lyrics, style, styleNegations, voice, promptTitle, creativeDirection]);

  useEffect(() => { cacheOutput(); }, [cacheOutput]);

  // Data fetching
  const { data: clientsData } = useQuery({
    queryKey: ['clients-for-compose'],
    queryFn: () => api<{ data: any[] }>('/api/clients'),
  });
  const clients = clientsData?.data || [];

  // Auto-select client if only one
  useEffect(() => {
    if (clients.length === 1 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const { data: storesData } = useQuery({
    queryKey: ['stores-for-compose', selectedClientId],
    queryFn: () => api<{ data: any[] }>(`/api/clients/${selectedClientId}/stores`),
    enabled: !!selectedClientId,
  });
  const stores = storesData?.data || [];

  // Auto-select store if only one
  useEffect(() => {
    if (stores.length === 1 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [stores, selectedStoreId]);

  const { data: icpsData } = useQuery({
    queryKey: ['icps-for-compose', selectedStoreId],
    queryFn: () => api<{ data: any[] }>(`/api/stores/${selectedStoreId}/icps`),
    enabled: !!selectedStoreId,
  });
  const icps = icpsData?.data || [];

  // Auto-select ICP if only one
  useEffect(() => {
    if (icps.length === 1 && !selectedIcpId) {
      setSelectedIcpId(icps[0].id);
    }
  }, [icps, selectedIcpId]);

  const { data: refTracksData } = useQuery({
    queryKey: ['ref-tracks-compose', selectedIcpId],
    queryFn: () => api<{ data: any[] }>(`/api/store-icps/${selectedIcpId}/reference-tracks`),
    enabled: !!selectedIcpId,
  });
  const refTracks = refTracksData?.data || [];

  const { data: gsData } = useQuery({
    queryKey: ['generation-systems'],
    queryFn: () => api<{ data: any[] }>('/api/generation-systems'),
  });
  const genSystems = gsData?.data || [];

  // Generate
  const generateMutation = useMutation({
    mutationFn: () => api<{ data: any }>('/api/compose/generate', {
      method: 'POST',
      body: {
        store_icp_id: selectedIcpId,
        flow_factor_values: {},
        additional_instructions: additionalInstructions || undefined,
        creative_direction: creativeDirection || undefined,
      },
    }),
    onSuccess: (result) => {
      setLyrics(result.data.lyrics || '');
      setStyle(result.data.style || '');
      setStyleNegations(result.data.style_negations || '');
      setVoice(result.data.voice || '');
    },
  });

  // Generate from a specific reference track
  const generateFromTrackMutation = useMutation({
    mutationFn: (trackId: string) => api<{ data: any }>('/api/compose/generate', {
      method: 'POST',
      body: {
        store_icp_id: selectedIcpId,
        flow_factor_values: {},
        additional_instructions: additionalInstructions || undefined,
        creative_direction: creativeDirection || undefined,
        reference_track_id: trackId,
      },
    }),
    onSuccess: (result) => {
      setLyrics(result.data.lyrics || '');
      setStyle(result.data.style || '');
      setStyleNegations(result.data.style_negations || '');
      setVoice(result.data.voice || '');
      setGeneratingTrackId(null);
    },
    onError: () => { setGeneratingTrackId(null); },
  });

  // Save
  const saveMutation = useMutation({
    mutationFn: async () => {
      let audio_file_url = '';
      let duration_seconds = 0;
      if (droppedFile) {
        const uploaded = await uploadFile(droppedFile.file);
        audio_file_url = uploaded.url;
        duration_seconds = Math.round(droppedFile.duration);
      }
      return api<{ data: any }>('/api/compose/save', {
        method: 'POST',
        body: {
          store_icp_id: selectedIcpId,
          prompt_text: lyrics,
          flow_factor_values: {},
          prompt_parameters: { style, style_negations: styleNegations, voice },
          generation_system_id: selectedGenSystem || undefined,
          title: promptTitle || 'Composed Prompt',
          audio_file_url: audio_file_url || undefined,
          duration_seconds: duration_seconds || undefined,
        },
      });
    },
    onSuccess: (result) => {
      sessionStorage.removeItem('compose-output');
      navigate(`/songs/${result.data.id}`);
    },
  });

  const hasOutput = !!(lyrics || style || styleNegations || voice);
  const selectClass = "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm w-full";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl tracking-tight leading-none text-white">Compose</h1>
      </div>

      {/* Row 1: Three dropdowns in one row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.3)] block mb-1.5">Client</label>
          <select
            value={selectedClientId}
            onChange={(e) => { setSelectedClientId(e.target.value); setSelectedStoreId(''); setSelectedIcpId(''); setLyrics(''); setStyle(''); setStyleNegations(''); setVoice(''); }}
            className={selectClass}
          >
            <option value="">Select client...</option>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.3)] block mb-1.5">Store</label>
          <select
            value={selectedStoreId}
            onChange={(e) => { setSelectedStoreId(e.target.value); setSelectedIcpId(''); setLyrics(''); setStyle(''); setStyleNegations(''); setVoice(''); }}
            disabled={!selectedClientId}
            className={`${selectClass} disabled:opacity-40`}
          >
            <option value="">{selectedClientId ? 'Select store...' : '—'}</option>
            {stores.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.3)] block mb-1.5">Audience</label>
          <select
            value={selectedIcpId}
            onChange={(e) => { setSelectedIcpId(e.target.value); setLyrics(''); setStyle(''); setStyleNegations(''); setVoice(''); }}
            disabled={!selectedStoreId}
            className={`${selectClass} disabled:opacity-40`}
          >
            <option value="">{selectedStoreId ? 'Select audience...' : '—'}</option>
            {icps.map((icp: any) => <option key={icp.id} value={icp.id}>{icp.name}</option>)}
          </select>
        </div>
      </div>

      {/* Main content: two columns */}
      <div className="grid grid-cols-[380px_1fr] gap-6">
        {/* Left: Reference Tracks + Instructions + Generate */}
        <div className="space-y-4">
          {/* Creative Direction */}
          <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.3)] block mb-2">Creative Direction</label>
            <textarea
              value={creativeDirection}
              onChange={(e) => setCreativeDirection(e.target.value)}
              placeholder="nostalgia, rainy day, self-reflection, late-night drive..."
              rows={2}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm resize-none placeholder:text-[rgba(255,255,255,0.28)]"
            />
          </div>

          <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.09)]">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-semibold text-[rgba(255,255,255,0.87)]">Reference Tracks</h2>
                {refTracks.length > 0 && <span className="text-xs text-[rgba(255,255,255,0.3)]">{refTracks.length}</span>}
              </div>
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {selectedIcpId ? (
                refTracks.length > 0 ? (
                  refTracks.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0 group">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgba(74,144,164,0.25)] to-[rgba(74,144,164,0.05)] flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-[#4a90a4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[rgba(255,255,255,0.87)] truncate">{t.title}</p>
                        <p className="text-[10px] text-[rgba(255,255,255,0.55)]">{t.artist}{t.genre ? ` · ${t.genre}` : ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setGeneratingTrackId(t.id); generateFromTrackMutation.mutate(t.id); }}
                        disabled={generatingTrackId === t.id}
                        className="shrink-0 bg-[rgba(74,144,164,0.12)] text-[#4a90a4] hover:bg-[rgba(74,144,164,0.25)] px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                      >
                        {generatingTrackId === t.id ? (
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 border-2 border-[#4a90a4]/30 border-t-[#4a90a4] rounded-full animate-spin" />
                            Working...
                          </span>
                        ) : 'Use Style'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-[rgba(255,255,255,0.38)] text-xs">No reference tracks for this audience</div>
                )
              ) : (
                <div className="px-4 py-8 text-center text-[rgba(255,255,255,0.38)] text-xs">Select an audience to see reference tracks</div>
              )}
            </div>
          </div>

          {/* Additional Instructions */}
          <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.3)] block mb-2">Additional Instructions</label>
            <textarea
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="e.g., 'Under 120 BPM, no vocals, ambient textures...'"
              rows={3}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm resize-none placeholder:text-[rgba(255,255,255,0.28)]"
            />
          </div>

          {/* Generate button */}
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
        <div className="space-y-4">
          {(generateMutation.isError || generateFromTrackMutation.isError) && (
            <div className="bg-[rgba(231,76,60,0.1)] border border-[rgba(231,76,60,0.2)] rounded-xl p-4 text-[#e74c3c] text-sm">
              {((generateMutation.error || generateFromTrackMutation.error) as Error)?.message}
            </div>
          )}

          {hasOutput ? (
            <>
              {/* Lyrics */}
              <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.55)]">Lyrics</label>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(lyrics)}
                    className="text-[10px] text-[#4a90a4] hover:text-[#5ba3b8] transition-colors uppercase tracking-widest font-bold"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  rows={12}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm leading-relaxed resize-none font-mono"
                />
              </div>

              {/* Style + Negations + Voice row */}
              <div className="grid grid-cols-[1fr_1fr_auto] gap-4">
                <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.55)]">Creative</label>
                    <button type="button" onClick={() => navigator.clipboard.writeText(style)} className="text-[10px] text-[#4a90a4] hover:text-[#5ba3b8] transition-colors uppercase tracking-widest font-bold">Copy</button>
                  </div>
                  <textarea
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    rows={3}
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs resize-none"
                  />
                </div>
                <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.55)]">Negative</label>
                    <button type="button" onClick={() => navigator.clipboard.writeText(styleNegations)} className="text-[10px] text-[#4a90a4] hover:text-[#5ba3b8] transition-colors uppercase tracking-widest font-bold">Copy</button>
                  </div>
                  <textarea
                    value={styleNegations}
                    onChange={(e) => setStyleNegations(e.target.value)}
                    rows={3}
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs resize-none"
                  />
                </div>
                <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 flex flex-col items-center justify-center min-w-[100px]">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.55)] mb-2">Vocal Gender</label>
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-center"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.5)] py-2 px-5 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                >
                  Regenerate
                </button>
                <div className="flex-1" />
                <input
                  type="text"
                  value={promptTitle}
                  onChange={(e) => setPromptTitle(e.target.value)}
                  placeholder="Song title..."
                  className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm w-48"
                />
                {/* MP3 Drop */}
                <label
                  className="border border-dashed border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-[10px] text-[rgba(255,255,255,0.4)] cursor-pointer hover:border-[#4a90a4]/40 transition-colors flex items-center gap-1.5"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(74,144,164,0.5)'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = ''; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '';
                    const file = e.dataTransfer.files[0];
                    if (file && /\.(mp3|wav|flac)$/i.test(file.name)) {
                      const audio = new Audio(URL.createObjectURL(file));
                      audio.addEventListener('loadedmetadata', () => {
                        setDroppedFile({ file, name: file.name, duration: audio.duration });
                        if (!promptTitle) {
                          setPromptTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
                        }
                      });
                    }
                  }}
                >
                  {droppedFile ? (
                    <span className="text-[#4a90a4]">{droppedFile.name} ({Math.round(droppedFile.duration)}s)</span>
                  ) : (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12"/></svg>
                      Drop MP3
                    </>
                  )}
                  <input type="file" accept=".mp3,.wav,.flac" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const audio = new Audio(URL.createObjectURL(file));
                      audio.addEventListener('loadedmetadata', () => {
                        setDroppedFile({ file, name: file.name, duration: audio.duration });
                        if (!promptTitle) {
                          setPromptTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
                        }
                      });
                    }
                  }} />
                </label>
                <select
                  value={selectedGenSystem}
                  onChange={(e) => setSelectedGenSystem(e.target.value)}
                  className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Gen system...</option>
                  {genSystems.map((gs: any) => <option key={gs.id} value={gs.id}>{gs.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="bg-[#4a90a4] text-white py-2 px-5 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
                </button>
              </div>
              {saveMutation.isError && (
                <p className="text-[#e74c3c] text-xs">{(saveMutation.error as Error).message}</p>
              )}
            </>
          ) : (
            <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <svg className="w-12 h-12 text-[rgba(255,255,255,0.08)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              <p className="text-[rgba(255,255,255,0.38)] text-sm">Select an audience and click Generate Prompt</p>
              <p className="text-[rgba(255,255,255,0.22)] text-xs mt-1">Lyrics, creative, negative, and voice will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
