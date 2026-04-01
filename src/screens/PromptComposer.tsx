import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, uploadFile } from '../lib/api.js';

export default function PromptComposer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get('clientId') || '');
  const [selectedStoreId, setSelectedStoreId] = useState(searchParams.get('storeId') || '');
  const [selectedIcpId, setSelectedIcpId] = useState(searchParams.get('icpId') || '');
  const [creativeDirection, setCreativeDirection] = useState('');
  const [selectedGenSystem, setSelectedGenSystem] = useState('');
  const [promptTitle, setPromptTitle] = useState('');
  const [generatingTrackId, setGeneratingTrackId] = useState<string | null>(null);
  const [autoGenerateTrackId] = useState(searchParams.get('trackId') || '');
  const [droppedFile, setDroppedFile] = useState<{ file: File; name: string; duration: number } | null>(null);

  // Generated output fields
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [styleNegations, setStyleNegations] = useState('');
  const [voice, setVoice] = useState('');

  // Suno parameters
  const [weirdness, setWeirdness] = useState(0.5);
  const [styleInfluence, setStyleInfluence] = useState(0.5);
  const [sunoIds, setSunoIds] = useState<string[]>([]);
  const [sunoStatus, setSunoStatus] = useState<string>(''); // '', 'submitting', 'generating', 'complete', 'error'
  const [sunoError, setSunoError] = useState('');
  const [sunoResults, setSunoResults] = useState<any[]>([]);
  const [savedSongId, setSavedSongId] = useState('');
  const [downloadingSunoId, setDownloadingSunoId] = useState('');

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

  // Auto-trigger "Use Style" when arriving from ICP page with a trackId
  const [autoTriggered, setAutoTriggered] = useState(false);
  useEffect(() => {
    if (autoGenerateTrackId && selectedIcpId && refTracks.length > 0 && !autoTriggered && !lyrics) {
      setAutoTriggered(true);
      setGeneratingTrackId(autoGenerateTrackId);
      generateFromTrackMutation.mutate(autoGenerateTrackId);
    }
  }, [autoGenerateTrackId, selectedIcpId, refTracks, autoTriggered, lyrics]);

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

  // Submit to Suno
  const sunoSubmitMutation = useMutation({
    mutationFn: async () => {
      // First save the draft so we have a song_id
      let songId = savedSongId;
      if (!songId) {
        const saved = await api<{ data: any }>('/api/compose/save', {
          method: 'POST',
          body: {
            store_icp_id: selectedIcpId,
            prompt_text: lyrics,
            flow_factor_values: {},
            prompt_parameters: { style, style_negations: styleNegations, voice, weirdness, style_influence: styleInfluence },
            generation_system_id: selectedGenSystem || undefined,
            title: promptTitle || 'Composed Prompt',
          },
        });
        songId = saved.data.id;
        setSavedSongId(songId);
      }

      return api<{ data: any }>('/api/suno/submit', {
        method: 'POST',
        body: {
          song_id: songId,
          lyrics,
          style,
          style_negations: styleNegations,
          voice,
          title: promptTitle || 'Untitled',
          weirdness,
          style_influence: styleInfluence,
        },
      });
    },
    onSuccess: (result) => {
      setSunoIds(result.data.suno_ids || []);
      setSunoStatus('generating');
      setSunoError('');
    },
    onError: (err: Error) => {
      setSunoStatus('error');
      setSunoError(err.message);
    },
  });

  // Poll Suno status
  useEffect(() => {
    if (sunoStatus !== 'generating' || sunoIds.length === 0) return;
    const interval = setInterval(async () => {
      try {
        const result = await api<{ data: any[] }>(`/api/suno/status/${sunoIds.join(',')}`);
        setSunoResults(result.data);
        const allComplete = result.data.every((s: any) => s.status === 'complete');
        const anyError = result.data.some((s: any) => s.status === 'error');
        if (allComplete) setSunoStatus('complete');
        else if (anyError) { setSunoStatus('error'); setSunoError('One or more tracks failed in Suno'); }
      } catch { /* keep polling */ }
    }, 8000);
    return () => clearInterval(interval);
  }, [sunoStatus, sunoIds]);

  // Track which suno IDs have been downloaded and their song IDs
  const [downloadedTracks, setDownloadedTracks] = useState<Record<string, string>>({});

  // Download completed Suno track to R2
  const sunoDownloadMutation = useMutation({
    mutationFn: (sunoId: string) => {
      setDownloadingSunoId(sunoId);
      return api<{ data: any }>('/api/suno/download', {
        method: 'POST',
        body: { suno_id: sunoId, song_id: savedSongId },
      });
    },
    onSuccess: (result, sunoId) => {
      setDownloadingSunoId('');
      setDownloadedTracks(prev => ({ ...prev, [sunoId]: result.data.song_id || result.data.suno_id }));
    },
    onError: () => { setDownloadingSunoId(''); },
  });

  // ─── Suno Token Status ───
  const [sunoTokenSeconds, setSunoTokenSeconds] = useState<number | null>(null);
  const [sunoTokenConnected, setSunoTokenConnected] = useState(false);
  const [sunoTokenRefreshing, setSunoTokenRefreshing] = useState(false);
  const [sunoTokenError, setSunoTokenError] = useState('');

  const fetchTokenStatus = useCallback(async () => {
    try {
      const result = await api<{ data: { has_token: boolean; seconds_remaining: number } }>('/api/suno/token-status');
      setSunoTokenConnected(result.data.has_token);
      setSunoTokenSeconds(result.data.seconds_remaining);
      setSunoTokenError('');
      return result.data;
    } catch {
      setSunoTokenConnected(false);
      setSunoTokenSeconds(0);
      return null;
    }
  }, []);

  const refreshSunoToken = useCallback(async () => {
    setSunoTokenRefreshing(true);
    setSunoTokenError('');
    try {
      const clerkResp = await fetch('https://clerk.suno.com/v1/client?_clerk_js_version=5', { credentials: 'include' });
      if (!clerkResp.ok) throw new Error('Clerk request failed — are you logged into suno.com?');
      const clerkData = await clerkResp.json();
      const session = clerkData?.response?.sessions?.find((s: any) => s.status === 'active');
      if (!session) throw new Error('No active Suno session — log into suno.com first');
      const jwt = session.last_active_token?.jwt;
      if (!jwt) throw new Error('No token in Suno session');
      const pushResult = await api<{ data: any }>('/api/suno/refresh', { method: 'POST', body: { token: jwt } });
      if (pushResult.data?.cached) {
        await fetchTokenStatus();
      }
    } catch (err: any) {
      setSunoTokenError(err.message || 'Failed to refresh Suno token');
    } finally {
      setSunoTokenRefreshing(false);
    }
  }, [fetchTokenStatus]);

  // Poll token status every 60s + auto-refresh if low
  useEffect(() => {
    fetchTokenStatus().then(data => {
      if (data && (data.seconds_remaining < 600 || !data.has_token)) {
        refreshSunoToken();
      }
    });
    const interval = setInterval(fetchTokenStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchTokenStatus, refreshSunoToken]);

  // Local countdown tick every second
  useEffect(() => {
    if (sunoTokenSeconds === null || sunoTokenSeconds <= 0) return;
    const tick = setInterval(() => {
      setSunoTokenSeconds(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [sunoTokenSeconds]);

  const formatTokenTime = (secs: number) => {
    if (secs <= 0) return 'expired';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const tokenStatusColor = !sunoTokenConnected || (sunoTokenSeconds !== null && sunoTokenSeconds <= 0)
    ? '#e74c3c' // red
    : (sunoTokenSeconds !== null && sunoTokenSeconds < 600)
      ? '#f39c12' // yellow
      : '#2ecc71'; // green

  const tokenStatusLabel = !sunoTokenConnected || (sunoTokenSeconds !== null && sunoTokenSeconds <= 0)
    ? 'Disconnected'
    : (sunoTokenSeconds !== null && sunoTokenSeconds < 600)
      ? 'Expiring'
      : 'Connected';

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
            <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.3)] block mb-2">What's this song about?</label>
            <textarea
              value={creativeDirection}
              onChange={(e) => setCreativeDirection(e.target.value)}
              placeholder="missing someone on a rainy night, the feeling when you walk into a new city, letting go of something that used to matter..."
              rows={3}
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

              {/* Suno Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.55)]">Weirdness</label>
                    <span className="text-xs text-[rgba(255,255,255,0.4)] tabular-nums">{Math.round(weirdness * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={weirdness}
                    onChange={(e) => setWeirdness(Number(e.target.value))}
                    className="w-full accent-[#e91e8c] h-1.5"
                  />
                </div>
                <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.55)]">Style Influence</label>
                    <span className="text-xs text-[rgba(255,255,255,0.4)] tabular-nums">{Math.round(styleInfluence * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={styleInfluence}
                    onChange={(e) => setStyleInfluence(Number(e.target.value))}
                    className="w-full accent-[#e91e8c] h-1.5"
                  />
                </div>
              </div>

              {/* Suno Token Status */}
              <div className="flex items-center gap-3 bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-xl px-4 py-2.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {tokenStatusLabel !== 'Disconnected' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ backgroundColor: tokenStatusColor }} />
                  )}
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: tokenStatusColor }} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: tokenStatusColor }}>
                  Suno {tokenStatusLabel}
                </span>
                {sunoTokenSeconds !== null && sunoTokenSeconds > 0 && (
                  <span className="text-[10px] text-[rgba(255,255,255,0.4)] tabular-nums">
                    {formatTokenTime(sunoTokenSeconds)}
                  </span>
                )}
                <div className="flex-1" />
                {sunoTokenError && (
                  <span className="text-[10px] text-[#e74c3c] truncate max-w-[200px]" title={sunoTokenError}>
                    {sunoTokenError}
                  </span>
                )}
                <button
                  type="button"
                  onClick={refreshSunoToken}
                  disabled={sunoTokenRefreshing}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#4a90a4] hover:text-[#5ba3b8] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {sunoTokenRefreshing ? (
                    <><span className="inline-block w-2.5 h-2.5 border border-[#4a90a4]/30 border-t-[#4a90a4] rounded-full animate-spin" /> Refreshing...</>
                  ) : 'Refresh'}
                </button>
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
                  className="bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.5)] py-2 px-5 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSunoStatus('submitting'); sunoSubmitMutation.mutate(); }}
                  disabled={sunoSubmitMutation.isPending || sunoStatus === 'generating'}
                  className="bg-gradient-to-r from-[#e91e8c] to-[#c41874] text-white py-2 px-5 rounded-lg text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all flex items-center gap-2"
                >
                  {sunoStatus === 'submitting' || sunoSubmitMutation.isPending ? (
                    <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                  ) : sunoStatus === 'generating' ? (
                    <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                      Submit to Suno
                    </>
                  )}
                </button>
              </div>

              {/* Suno Status */}
              {sunoStatus === 'generating' && (
                <div className="bg-[rgba(233,30,140,0.08)] border border-[rgba(233,30,140,0.2)] rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-4 h-4 border-2 border-[#e91e8c]/30 border-t-[#e91e8c] rounded-full animate-spin" />
                    <div>
                      <p className="text-sm text-[rgba(255,255,255,0.87)]">Suno is generating your track...</p>
                      <p className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5">This usually takes 1-3 minutes. Polling every 8s.</p>
                    </div>
                  </div>
                  {sunoResults.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {sunoResults.map((r: any) => (
                        <div key={r.id} className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.55)]">
                          <span className={r.status === 'complete' ? 'text-emerald-400' : 'text-[rgba(255,255,255,0.3)]'}>{r.status}</span>
                          <span>{r.title || r.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {sunoStatus === 'complete' && sunoResults.length > 0 && (
                <div className="bg-[rgba(46,204,113,0.08)] border border-[rgba(46,204,113,0.2)] rounded-xl p-4">
                  <p className="text-sm text-emerald-400 font-semibold mb-3">Generation complete!</p>
                  <div className="space-y-2">
                    {sunoResults.filter((r: any) => r.status === 'complete').map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[rgba(255,255,255,0.87)]">{r.title || r.id}</p>
                          {r.duration && <p className="text-[10px] text-[rgba(255,255,255,0.4)]">{Math.round(r.duration)}s</p>}
                        </div>
                        {downloadedTracks[r.id] ? (
                          <a
                            href={`/songs/${downloadedTracks[r.id]}`}
                            onClick={(e) => { e.preventDefault(); navigate(`/songs/${downloadedTracks[r.id]}`); }}
                            className="text-emerald-400 text-xs font-semibold hover:underline"
                          >
                            Saved — View
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => sunoDownloadMutation.mutate(r.id)}
                            disabled={downloadingSunoId === r.id}
                            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {downloadingSunoId === r.id ? 'Downloading...' : 'Download to Library'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sunoStatus === 'error' && sunoError && (
                <div className="bg-[rgba(231,76,60,0.1)] border border-[rgba(231,76,60,0.2)] rounded-xl p-4 text-[#e74c3c] text-sm">
                  {sunoError}
                </div>
              )}

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
