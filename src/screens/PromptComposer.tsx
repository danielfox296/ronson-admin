import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, uploadFile } from '../lib/api.js';

const OUTCOME_MODES = [
  {
    id: 'linger', label: 'Linger', descriptor: 'Time in store',
    style: ['slow / languid / 65 BPM feel / unhurried','minor key / Dorian / melancholic warmth / noble sadness','laid-back / behind the beat / unhurried groove / relaxed feel','sparse / no drums / drumless / percussion-free / rhythm implied','hypnotic / looping / ostinato / repeating groove / minimal surface variation','instrumental / no vocals / wordless / vocalise','circular progression / unresolved / suspended / no strong cadence','gentle dynamic arc / subtle swells / breathing arrangement / natural dynamics'].join('\n'),
    exclude: ['uptempo / driving / forward motion / energetic','bright major / uplifting / Mixolydian / cheerful','pushing ahead of beat / urgent / forward drive','dense percussion / full kit / layered rhythm / busy beat','through-composed / evolving structure / high novelty','dense lyrics / sung vocals / prominent voice','strong resolution / resolved cadence / definitive ending','wide dynamic range / dramatic peaks / heavily compressed'].join('\n'),
    warning: 'Slow tempo only activates in minor key.',
  },
  {
    id: 'elevate', label: 'Elevate', descriptor: 'Premium perception',
    style: ['minor key / sophisticated harmonic depth / melancholic warmth','laid-back / behind the beat / effortlessness cue / luxury ease','sparse / low rhythmic density / space as quality signal','instrumental / no vocals / wordless / ambient quality','deceptive cadences / wistful redirected resolution / longing signal','wide dynamic range / uncompressed / dramatic peaks / craft quality'].join('\n'),
    exclude: ['bright major / uplifting / pop energy / cheerful','pushing ahead of beat / urgent / youth-coded','dense percussion / full kit / busy rhythm / energetic beat','dense lyrics / prominent vocals / attention-demanding voice','strong resolution / resolved cadence / definitive ending','narrow dynamic range / flat / heavily compressed / broadcast loud'].join('\n'),
  },
  {
    id: 'energize', label: 'Energize', descriptor: 'Browsing & variety',
    style: ['uptempo / driving / forward motion / 110 BPM feel','bright major / uplifting / Mixolydian / earthy major / positive valence','pushing / ahead of the beat / driving groove / forward momentum','dense percussion / full kit / layered rhythm / driving beat','through-composed / developing sections / structural novelty','dense vocal / sung / prominent voice / emotional engagement','strong resolution / satisfying cadence / completion feel'].join('\n'),
    exclude: ['slow / languid / unhurried / 65 BPM feel','minor key / Dorian / melancholic / dark harmonic color','laid-back / behind the beat / relaxed feel','sparse / no drums / drumless / percussion-free','hypnotic / looping / minimal variation / ostinato','instrumental / wordless / no vocal energy','circular / unresolved / suspended / no cadence'].join('\n'),
  },
  {
    id: 'move', label: 'Move', descriptor: 'Purchase decisions',
    style: ['slow / languid / 65 BPM feel / unhurried','minor key / Dorian / melancholic warmth / noble sadness','laid-back / behind the beat / luxury ease / effortlessness cue','sparse / low rhythmic density / craft signal / quality space','instrumental / no vocals / wordless / ambient quality','circular progression / unresolved / suspended / no strong cadence','gentle dynamic arc / subtle swells / natural dynamics / breathing arrangement'].join('\n'),
    exclude: ['uptempo / driving / forward motion / high energy','bright major / uplifting / positive valence / cheerful','pushing ahead of beat / urgent','dense percussion / full kit / driving beat / busy rhythm','dense lyrics / prominent vocals / attention-demanding','strong resolution / resolved cadence / definitive ending','narrow dynamic range / compressed / broadcast loud'].join('\n'),
    warning: 'Spending lift is loyalty-segment conditional (EMAC 2025).',
  },
];

export default function PromptComposer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get('clientId') || '');
  const [selectedStoreId, setSelectedStoreId] = useState(searchParams.get('storeId') || '');
  const [selectedIcpId, setSelectedIcpId] = useState(searchParams.get('icpId') || '');
  const [creativeDirection, setCreativeDirection] = useState(searchParams.get('topic') || '');
  const [selectedGenSystem, setSelectedGenSystem] = useState('');
  const [promptTitle, setPromptTitle] = useState('');
  const [editingTrack, setEditingTrack] = useState<any | null>(null);
  const [editTrackForm, setEditTrackForm] = useState<any>({});
  const [selectedTrackId, setSelectedTrackId] = useState(searchParams.get('trackId') || '');
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [droppedFile, setDroppedFile] = useState<{ file: File; name: string; duration: number } | null>(null);
  const [copyPromptCopied, setCopyPromptCopied] = useState(false);
  const [savedSongId, setSavedSongId] = useState('');
  const [finalizeError, setFinalizeError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Generated output fields
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [styleNegations, setStyleNegations] = useState('');
  const [voice, setVoice] = useState('');

  // Refine Lyrics modal
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineInstructions, setRefineInstructions] = useState('');

  // Restore cached output on mount (only if no URL params drove initial state)
  useEffect(() => {
    if (searchParams.get('icpId')) return; // URL params take priority
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

  // Auto-select track when arriving from ICP page with a trackId param
  const [autoTriggered, setAutoTriggered] = useState(false);
  useEffect(() => {
    if (searchParams.get('trackId') && refTracks.length > 0 && !autoTriggered) {
      setAutoTriggered(true);
      // Track is already pre-selected via useState initializer above — nothing more to do
    }
  }, [refTracks, autoTriggered, searchParams]);

  const { data: gsData } = useQuery({
    queryKey: ['generation-systems'],
    queryFn: () => api<{ data: any[] }>('/api/generation-systems'),
  });
  const genSystems = gsData?.data || [];

  // Auto-select Suno 5.5 gen system
  useEffect(() => {
    if (genSystems.length > 0 && !selectedGenSystem) {
      const suno55 = genSystems.find((gs: any) =>
        /suno.*(5\.5|5_5|fenix|chirp)/i.test(gs.name) || /5\.5/i.test(gs.name)
      ) || genSystems.find((gs: any) => /suno/i.test(gs.name));
      if (suno55) setSelectedGenSystem(suno55.id);
    }
  }, [genSystems, selectedGenSystem]);

  // Update reference track
  const updateTrackMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api(`/api/reference-tracks/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      setEditingTrack(null);
      queryClient.invalidateQueries({ queryKey: ['ref-tracks-compose', selectedIcpId] });
    },
  });

  const { data: outcomesData } = useQuery({
    queryKey: ['desired-outcomes'],
    queryFn: () => api<{ data: any[] }>('/api/prompts?type=outcome'),
  });
  const outcomeOptions = useMemo(() => {
    const fromApi = (outcomesData?.data || []).filter((o: any) => o.is_active).map((o: any) => {
      let parsed: any = {};
      try { parsed = JSON.parse(o.content); } catch {}
      return { id: o.slug, label: o.name, descriptor: o.era || '', style: parsed.style || '', exclude: parsed.exclude || '', warning: parsed.warning };
    });
    return fromApi.length > 0 ? fromApi : OUTCOME_MODES;
  }, [outcomesData]);

  // Generate — uses selected track + outcome if set
  const generateMutation = useMutation({
    mutationFn: () => api<{ data: any }>('/api/compose/generate', {
      method: 'POST',
      body: {
        store_icp_id: selectedIcpId,
        flow_factor_values: {},
        creative_direction: creativeDirection || undefined,
        reference_track_id: selectedTrackId || undefined,
        desired_outcome: selectedOutcome || undefined,
      },
    }),
    onSuccess: (result) => {
      setLyrics(result.data.lyrics || '');
      setVoice(result.data.voice || '');
      setStyle(result.data.style || '');
      setStyleNegations(result.data.style_negations || '');
      if (result.data.title) setPromptTitle(result.data.title);
    },
  });

  // Refine lyrics — keeps style/negations/voice, only rewrites words
  const refineLyricsMutation = useMutation({
    mutationFn: () => api<{ data: any }>('/api/compose/generate', {
      method: 'POST',
      body: {
        store_icp_id: selectedIcpId,
        flow_factor_values: {},
        creative_direction: `Refine these existing lyrics. Keep the same style, mood, and structure but apply these changes: ${refineInstructions}\n\nOriginal lyrics:\n${lyrics}`,
        reference_track_id: selectedTrackId || undefined,
        desired_outcome: selectedOutcome || undefined,
      },
    }),
    onSuccess: (result) => {
      setLyrics(result.data.lyrics || '');
      // Don't update style/negations/voice — keep them as-is
      setShowRefineModal(false);
      setRefineInstructions('');
    },
  });

  // Save to Library — requires file + title
  const saveMutation = useMutation({
    mutationFn: async () => {
      setFinalizeError('');
      const uploaded = await uploadFile(droppedFile!.file);
      return api<{ data: any }>('/api/compose/save', {
        method: 'POST',
        body: {
          store_icp_id: selectedIcpId,
          prompt_text: lyrics,
          flow_factor_values: {},
          prompt_parameters: { style, style_negations: styleNegations, voice },
          generation_system_id: selectedGenSystem || undefined,
          title: promptTitle,
          audio_file_url: uploaded.url,
          duration_seconds: Math.round(droppedFile!.duration),
          reference_track_id: selectedTrackId || undefined,
          desired_outcome: selectedOutcome || undefined,
        },
      });
    },
    onSuccess: (result) => {
      setSavedSongId(result.data.id);
      sessionStorage.removeItem('compose-output');
    },
    onError: (err: Error) => {
      setFinalizeError(err.message);
    },
  });

  const hasOutput = !!(lyrics || style || styleNegations || voice);
  const selectClass = "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm w-full";

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl tracking-tight leading-none text-white uppercase">Compose</h1>
        {hasOutput && (
          <button
            type="button"
            onClick={() => {
              const text = [`TITLE\n${promptTitle}`, `STYLE\n${style}`, `EXCLUDE\n${styleNegations}`, `LYRICS\n${lyrics}`].join('\n\n');
              navigator.clipboard.writeText(text);
              setCopyPromptCopied(true);
              setTimeout(() => setCopyPromptCopied(false), 1500);
            }}
            className="flex items-center gap-2 bg-[rgba(94,162,182,0.1)] border border-[rgba(94,162,182,0.25)] text-[#5ea2b6] hover:bg-[rgba(94,162,182,0.18)] py-2 px-4 rounded-lg text-sm font-semibold transition-all"
          >
            {copyPromptCopied ? (
              <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Copied</>
            ) : (
              <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy Prompt</>
            )}
          </button>
        )}
      </div>

      {/* Row 1: Three dropdowns in one row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)] block mb-1.5">Client</label>
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
          <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)] block mb-1.5">Store</label>
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
          <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)] block mb-1.5">Audience</label>
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
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)] block mb-2">What's this song about?</label>
            <textarea
              value={creativeDirection}
              onChange={(e) => setCreativeDirection(e.target.value)}
              placeholder="missing someone on a rainy night, the feeling when you walk into a new city, letting go of something that used to matter..."
              rows={3}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm resize-none placeholder:text-[rgba(255,255,255,0.42)]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)]">Reference Tracks</label>
                {refTracks.length > 0 && <span className="text-[10px] text-[rgba(255,255,255,0.35)]">{refTracks.length}</span>}
              </div>
              {selectedIcpId && selectedStoreId && selectedClientId && (
                <a
                  href={`/clients/${selectedClientId}/stores/${selectedStoreId}/audiences/${selectedIcpId}`}
                  className="text-[#4a90a4] hover:text-[#5ba3b8] text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  + Add
                </a>
              )}
            </div>
            <div className="max-h-[280px] overflow-y-auto border border-[rgba(255,255,255,0.06)] rounded-xl">
              {selectedIcpId ? (
                refTracks.length > 0 ? (
                  refTracks.map((t: any) => (
                    <div key={t.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0 group border-l-2 transition-colors ${selectedTrackId === t.id ? 'border-l-[#5ea2b6]' : 'border-l-transparent'}`}>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgba(74,144,164,0.25)] to-[rgba(74,144,164,0.05)] flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-[#4a90a4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[rgba(255,255,255,0.87)] truncate">{t.title}</p>
                        <p className="text-[10px] text-[rgba(255,255,255,0.55)]">{t.artist}{t.genre ? ` · ${t.genre}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => { setEditingTrack(t); setEditTrackForm({ title: t.title, artist: t.artist, genre: t.genre || '', bpm: t.bpm || '', musical_key: t.musical_key || '', mode: t.mode || '', production_era: t.production_era || '', instrumentation: t.instrumentation || '', vocal_tone: t.vocal_tone || '', suno_genre: t.suno_genre || '', tags: Array.isArray(t.tags) ? t.tags.join(', ') : (t.tags || '') }); }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] hover:text-[rgba(255,255,255,0.7)] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTrackId(selectedTrackId === t.id ? '' : t.id)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${
                            selectedTrackId === t.id
                              ? 'bg-[rgba(74,144,164,0.35)] text-white border border-[rgba(74,144,164,0.6)]'
                              : 'bg-[rgba(74,144,164,0.08)] text-[#4a90a4] hover:bg-[rgba(74,144,164,0.18)]'
                          }`}
                        >
                          {selectedTrackId === t.id ? '✓ Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-[rgba(255,255,255,0.55)] text-xs">No reference tracks for this audience</div>
                )
              ) : (
                <div className="px-4 py-8 text-center text-[rgba(255,255,255,0.55)] text-xs">Select an audience to see reference tracks</div>
              )}
            </div>
          </div>

          {/* Outcome Mode selector */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)] block mb-3">Desired Outcome</label>
            <div className="grid grid-cols-2 gap-2">
              {outcomeOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setSelectedOutcome(selectedOutcome === o.id ? null : o.id);
                  }}
                  className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border text-left transition-all ${
                    selectedOutcome === o.id
                      ? 'border-[#5ea2b6] bg-[rgba(94,162,182,0.1)] text-white'
                      : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.18)]'
                  }`}
                >
                  <span className="text-xs font-semibold leading-none">{o.label}</span>
                  <span className="text-[9px] text-[rgba(255,255,255,0.4)] leading-snug">{o.descriptor}</span>
                </button>
              ))}
            </div>
            {selectedOutcome && outcomeOptions.find(o => o.id === selectedOutcome)?.warning && (
              <p className="mt-2 text-[9px] text-[rgba(255,200,80,0.65)] leading-snug">
                ⚠ {outcomeOptions.find(o => o.id === selectedOutcome)?.warning}
              </p>
            )}
          </div>

          {/* Generate button row */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCreativeDirection('');
                setSelectedTrackId('');
                setSelectedOutcome(null);
                setLyrics('');
                setStyle('');
                setStyleNegations('');
                setVoice('');
                setPromptTitle('');
                setDroppedFile(null);
                sessionStorage.removeItem('compose-output');
              }}
              className="py-3 px-4 rounded-xl text-sm font-semibold transition-all bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.09)] hover:text-[rgba(255,255,255,0.6)]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={!selectedIcpId || generateMutation.isPending}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg flex items-center justify-center gap-2 ${
                selectedIcpId && (selectedTrackId || selectedOutcome)
                  ? 'bg-gradient-to-br from-[#4a90a4] to-[#2d6a80] text-white hover:opacity-90 shadow-[#4a90a4]/10'
                  : selectedIcpId
                    ? 'bg-[rgba(74,144,164,0.25)] text-[rgba(255,255,255,0.5)] hover:opacity-90'
                    : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.25)] cursor-not-allowed'
              }`}
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

        </div>

        {/* Right: Output */}
        <div className="space-y-4">
          {generateMutation.isError && (
            <div className="bg-[rgba(231,76,60,0.1)] border border-[rgba(231,76,60,0.2)] rounded-xl p-4 text-[#e74c3c] text-sm">
              {(generateMutation.error as Error)?.message}
            </div>
          )}

          {hasOutput ? (
            <>
              {/* Lyrics (left) + Style/Neg/Voice (right) */}
              <div className="grid grid-cols-2 gap-6 items-start">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)]">Lyrics</label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setShowRefineModal(true)} className="bg-[rgba(233,30,140,0.12)] text-[#e91e8c] hover:bg-[rgba(233,30,140,0.2)] px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        Refine
                      </button>
                      <button type="button" onClick={() => navigator.clipboard.writeText(lyrics)} className="text-[10px] text-[#4a90a4] hover:text-[#5ba3b8] transition-colors uppercase tracking-widest font-bold">Copy</button>
                    </div>
                  </div>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    rows={18}
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm leading-relaxed resize-none font-mono"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)]">Style</label>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] tabular-nums ${style.length > 450 ? 'text-[#ea6152]' : 'text-[rgba(255,255,255,0.3)]'}`}>{style.length}/450</span>
                        <button type="button" onClick={() => navigator.clipboard.writeText(style)} className="text-[10px] text-[#4a90a4] hover:text-[#5ba3b8] transition-colors uppercase tracking-widest font-bold">Copy</button>
                      </div>
                    </div>
                    <textarea
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      rows={5}
                      className={`w-full bg-[rgba(255,255,255,0.04)] border rounded-lg px-3 py-2 text-xs resize-none ${style.length > 450 ? 'border-[rgba(234,97,82,0.4)]' : 'border-[rgba(255,255,255,0.08)]'}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)]">Negative</label>
                      <button type="button" onClick={() => navigator.clipboard.writeText(styleNegations)} className="text-[10px] text-[#4a90a4] hover:text-[#5ba3b8] transition-colors uppercase tracking-widest font-bold">Copy</button>
                    </div>
                    <textarea
                      value={styleNegations}
                      onChange={(e) => setStyleNegations(e.target.value)}
                      rows={4}
                      className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)] block mb-2">Vocal Gender</label>
                    <select
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.5)] py-2 px-5 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                >
                  Regenerate
                </button>
              </div>

              {/* Finalize panel */}
              <div className="border-t border-[rgba(255,255,255,0.06)] pt-5 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)] mb-4">Finalize</p>

                {savedSongId ? (
                  /* State D — saved */
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-10 h-10 rounded-full bg-[rgba(39,174,96,0.15)] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#33be6a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p className="text-sm text-[rgba(255,255,255,0.7)]">Saved to library</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/songs/${savedSongId}`)}
                        className="bg-[#5ea2b6] hover:bg-[#70b4c8] text-white py-2 px-5 rounded-lg text-sm font-semibold transition-colors"
                      >
                        View Song
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreativeDirection('');
                          setSelectedTrackId('');
                          setSelectedOutcome(null);
                          setLyrics('');
                          setStyle('');
                          setStyleNegations('');
                          setVoice('');
                          setPromptTitle('');
                          setDroppedFile(null);
                          setSavedSongId('');
                          setFinalizeError('');
                          saveMutation.reset();
                          sessionStorage.removeItem('compose-output');
                        }}
                        className="bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.11)] text-[rgba(255,255,255,0.5)] py-2 px-5 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Compose Another
                      </button>
                    </div>
                  </div>
                ) : !droppedFile ? (
                  /* State A — drop zone */
                  <label
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const audio = new Audio(URL.createObjectURL(file));
                        audio.addEventListener('loadedmetadata', () => setDroppedFile({ file, name: file.name, duration: audio.duration }));
                        audio.addEventListener('error', () => setDroppedFile({ file, name: file.name, duration: 0 }));
                        if (!promptTitle) {
                          const stem = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                          setPromptTitle(stem.replace(/\b\w/g, (c) => c.toUpperCase()));
                        }
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-3 min-h-[160px] w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDragOver ? 'border-[#5ea2b6] bg-[rgba(94,162,182,0.05)]' : 'border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.22)]'}`}
                  >
                    <svg className="w-8 h-8 text-[rgba(255,255,255,0.25)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12"/></svg>
                    <div className="text-center">
                      <p className="text-sm text-[rgba(255,255,255,0.5)]">Drop your finished MP3 here</p>
                      <p className="text-xs text-[rgba(255,255,255,0.3)] mt-0.5">or click to choose a file</p>
                    </div>
                    <p className="text-[10px] text-[rgba(255,255,255,0.25)] uppercase tracking-widest">.mp3 · .wav · .flac</p>
                    <input
                      type="file"
                      accept=".mp3,.wav,.flac"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const audio = new Audio(URL.createObjectURL(file));
                          audio.addEventListener('loadedmetadata', () => setDroppedFile({ file, name: file.name, duration: audio.duration }));
                          audio.addEventListener('error', () => setDroppedFile({ file, name: file.name, duration: 0 }));
                          if (!promptTitle) {
                            const stem = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                            setPromptTitle(stem.replace(/\b\w/g, (c) => c.toUpperCase()));
                          }
                        }
                      }}
                    />
                  </label>
                ) : (
                  /* State B / C — file loaded */
                  <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 space-y-4">
                    {/* File info row */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(94,162,182,0.12)] flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-[#5ea2b6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[rgba(255,255,255,0.87)] truncate">{droppedFile.name}{droppedFile.duration > 0 ? ` · ${Math.floor(droppedFile.duration / 60)}:${String(Math.floor(droppedFile.duration % 60)).padStart(2, '0')}` : ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setDroppedFile(null); saveMutation.reset(); setFinalizeError(''); }}
                        className="text-[rgba(255,255,255,0.3)] hover:text-[#ea6152] transition-colors shrink-0"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>

                    {/* Audio preview */}
                    <audio src={URL.createObjectURL(droppedFile.file)} controls className="w-full h-8" />

                    {/* Title + Save row */}
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={promptTitle}
                        onChange={(e) => setPromptTitle(e.target.value)}
                        placeholder="Song title..."
                        className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || !promptTitle.trim()}
                        className="bg-[#5ea2b6] hover:bg-[#70b4c8] text-white py-2 px-5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                      >
                        {saveMutation.isPending ? (
                          <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                        ) : 'Save to Library'}
                      </button>
                    </div>

                    {finalizeError && (
                      <p className="text-[#ea6152] text-xs">{finalizeError}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Reference Track Edit Modal */}
      {editingTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingTrack(null)}>
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-2xl p-6 w-[640px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Edit Reference Track</h2>
              <button type="button" onClick={() => setEditingTrack(null)} className="text-[rgba(255,255,255,0.4)] hover:text-white transition-colors text-lg leading-none">×</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'title', label: 'Title' },
                { key: 'artist', label: 'Artist' },
                { key: 'genre', label: 'Genre' },
                { key: 'suno_genre', label: 'Suno Genre' },
                { key: 'bpm', label: 'BPM' },
                { key: 'musical_key', label: 'Key' },
                { key: 'mode', label: 'Mode' },
                { key: 'production_era', label: 'Production Era' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)] block mb-1.5">{label}</label>
                  <input
                    type="text"
                    value={editTrackForm[key] || ''}
                    onChange={(e) => setEditTrackForm((f: any) => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)] block mb-1.5">Instrumentation</label>
              <textarea
                value={editTrackForm.instrumentation || ''}
                onChange={(e) => setEditTrackForm((f: any) => ({ ...f, instrumentation: e.target.value }))}
                rows={2}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)] block mb-1.5">Vocal Tone</label>
              <input
                type="text"
                value={editTrackForm.vocal_tone || ''}
                onChange={(e) => setEditTrackForm((f: any) => ({ ...f, vocal_tone: e.target.value }))}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.45)] block mb-1.5">Tags (comma-separated)</label>
              <input
                type="text"
                value={editTrackForm.tags || ''}
                onChange={(e) => setEditTrackForm((f: any) => ({ ...f, tags: e.target.value }))}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button type="button" onClick={() => setEditingTrack(null)} className="px-4 py-2 text-sm text-[rgba(255,255,255,0.5)] hover:text-white transition-colors">Cancel</button>
              <button
                type="button"
                disabled={updateTrackMutation.isPending}
                onClick={() => {
                  const payload = {
                    ...editTrackForm,
                    bpm: editTrackForm.bpm ? Number(editTrackForm.bpm) : undefined,
                    tags: editTrackForm.tags ? editTrackForm.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
                  };
                  updateTrackMutation.mutate({ id: editingTrack.id, data: payload });
                }}
                className="bg-[#4a90a4] hover:bg-[#5ba3b8] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {updateTrackMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refine Lyrics Modal */}
      {showRefineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowRefineModal(false)}>
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-2xl p-6 w-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Refine Lyrics</h2>
              <button type="button" onClick={() => setShowRefineModal(false)} className="text-[rgba(255,255,255,0.4)] hover:text-white transition-colors text-lg leading-none">×</button>
            </div>
            <p className="text-xs text-[rgba(255,255,255,0.5)] mb-4">Describe how you'd like the lyrics changed. The style, negations, and voice will stay the same.</p>
            <textarea
              value={refineInstructions}
              onChange={(e) => setRefineInstructions(e.target.value)}
              placeholder="e.g. make the chorus more repetitive, change the metaphor in verse 2 from water to fire, make it less wordy..."
              rows={5}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm resize-none placeholder:text-[rgba(255,255,255,0.3)] mb-4"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setShowRefineModal(false)} className="px-4 py-2 text-sm text-[rgba(255,255,255,0.5)] hover:text-white transition-colors">Cancel</button>
              <button
                type="button"
                disabled={!refineInstructions.trim() || refineLyricsMutation.isPending}
                onClick={() => refineLyricsMutation.mutate()}
                className="bg-gradient-to-r from-[#e91e8c] to-[#c41874] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 hover:opacity-90 flex items-center gap-2"
              >
                {refineLyricsMutation.isPending ? (
                  <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Refining...</>
                ) : (
                  'Refine Lyrics'
                )}
              </button>
            </div>
            {refineLyricsMutation.isError && (
              <p className="mt-3 text-[#e74c3c] text-xs">{(refineLyricsMutation.error as Error).message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
