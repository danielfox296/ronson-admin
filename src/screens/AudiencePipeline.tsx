import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseBlob } from 'music-metadata-browser';
import { api, uploadFile } from '../lib/api.js';
import { humanize, formatDuration } from '../lib/utils.js';
import Breadcrumb from '../components/Breadcrumb.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const LAYER_CATEGORIES = [
  { key: 'physiological', label: 'L1 · Physiological', color: 'rgba(245,196,179,0.9)', fields: ['bpm', 'volume', 'dynamic_range', 'groove_feel', 'phrase_length', 'arousal'] },
  { key: 'affective',     label: 'L2 · Affective',     color: 'rgba(250,199,117,0.9)', fields: ['energy', 'valence', 'danceability', 'mode', 'harmony', 'melody', 'vocal_tone', 'repetition', 'tension', 'trance_fluency', 'intimacy', 'emotional_arc'] },
  { key: 'associative',   label: 'L3 · Associative',   color: 'rgba(159,225,203,0.9)', fields: ['musical_key', 'familiarity', 'production_era', 'instrumentation', 'scale_type', 'sophistication', 'nostalgia', 'identity_signal'] },
  { key: 'semantic',      label: 'L4 · Semantic',      color: 'rgba(206,203,246,0.9)', fields: ['lyrical_content', 'lyrical_density', 'vocal_language', 'vocal_diction', 'register_accent', 'cultural_signal', 'cognitive_load', 'lyrical_theme'] },
];

const FLOAT_FIELDS = new Set([
  'volume', 'dynamic_range', 'arousal',
  'energy', 'valence', 'danceability', 'repetition', 'tension', 'trance_fluency', 'intimacy',
  'familiarity', 'sophistication', 'nostalgia',
  'lyrical_density', 'cognitive_load',
]);

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[rgba(39,174,96,0.15)] text-[#33be6a]',
    generated: 'bg-[rgba(74,144,164,0.15)] text-[#5ea2b6]',
    draft: 'bg-[rgba(230,126,34,0.15)] text-[#e98f38]',
    flagged: 'bg-[rgba(231,76,60,0.15)] text-[#ea6152]',
    removed: 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]'}`}>
      {humanize(status)}
    </span>
  );
}

function InlineEdit({ value, onSave, as = 'input', className = '', placeholder = '' }: {
  value: string; onSave: (v: string) => void;
  as?: 'input' | 'textarea'; className?: string; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { if (draft !== value) onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };
  const cls = 'border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1 text-sm bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)] w-full';
  if (!editing) return (
    <span onClick={() => setEditing(true)} className={`cursor-pointer hover:bg-[rgba(255,255,255,0.05)] rounded px-1 -mx-1 transition-colors ${className}`} title="Click to edit">
      {value || <span className="text-[rgba(255,255,255,0.2)] italic">{placeholder || 'empty'}</span>}
    </span>
  );
  if (as === 'textarea') return (
    <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }} className={cls} rows={4} />
  );
  return (
    <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }} className={cls} />
  );
}

interface AudioMeta {
  title: string;
  artist?: string;
  album?: string;
  genre?: string;
  bpm?: number;
  key?: string;
  year?: number;
  duration: number;
}

async function readAudioMeta(file: File): Promise<AudioMeta> {
  const fallbackTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Parse ID3 / Vorbis / MP4 tags via music-metadata-browser
  let tags: AudioMeta = { title: fallbackTitle, duration: 0 };
  try {
    const metadata = await parseBlob(file);
    const c = metadata.common;
    tags.title = c.title || fallbackTitle;
    tags.artist = c.artist || undefined;
    tags.album = c.album || undefined;
    tags.genre = c.genre?.[0] || undefined;
    tags.bpm = c.bpm || undefined;
    tags.key = (c as any).key || (c as any).initialkey || undefined;
    tags.year = c.year || undefined;
    if (metadata.format.duration) tags.duration = Math.round(metadata.format.duration);
  } catch {
    // Fallback: use HTML5 Audio for duration
    tags.duration = await new Promise<number>((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      const done = (d: number) => { URL.revokeObjectURL(url); resolve(d); };
      audio.addEventListener('loadedmetadata', () => done(Math.round(audio.duration)), { once: true });
      audio.addEventListener('error', () => done(0), { once: true });
      audio.src = url;
    });
  }
  return tags;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export default function AudiencePipeline() {
  const { clientId, storeId, icpId } = useParams<{ clientId: string; storeId: string; icpId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Profile
  const [showProfile, setShowProfile] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  // Reference tracks
  const [showRefForm, setShowRefForm] = useState(false);
  const [refForm, setRefForm] = useState({ title: '', artist: '', genre: '', album: '', duration_seconds: '', release_year: '' });
  const [bulkText, setBulkText] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  const [refFilter, setRefFilter] = useState('');

  // Songs
  const [songFilter, setSongFilter] = useState('');
  const [showSongModal, setShowSongModal] = useState(false);
  const [showFlowFactors, setShowFlowFactors] = useState(false);
  const [songForm, setSongForm] = useState({ title: '', audio_file_url: '', duration_seconds: '', generation_system_id: '', prompt_text: '', created_by: 'admin' });
  const [fileMeta, setFileMeta] = useState<AudioMeta | null>(null);
  const [flowFactorValues, setFlowFactorValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- Queries ---- */

  const { data: icpData, isLoading } = useQuery({
    queryKey: ['icp', icpId],
    queryFn: () => api<{ data: any }>(`/api/store-icps/${icpId}`),
  });

  const { data: refTracksData } = useQuery({
    queryKey: ['icp-ref-tracks', icpId],
    queryFn: () => api<{ data: any[] }>(`/api/store-icps/${icpId}/reference-tracks`),
  });

  const { data: songsData, isLoading: songsLoading } = useQuery({
    queryKey: ['icp-songs', icpId],
    queryFn: () => api<{ data: any[] }>(`/api/store-icps/${icpId}/songs`),
  });

  const { data: flowFactorConfigsData } = useQuery({
    queryKey: ['flow-factors'],
    queryFn: () => api<{ data: any[] }>('/api/flow-factors'),
    enabled: showSongModal,
  });

  const { data: genSystemsData } = useQuery({
    queryKey: ['generation-systems'],
    queryFn: () => api<{ data: any[] }>('/api/generation-systems'),
    enabled: showSongModal,
  });

  /* ---- Derived ---- */

  // api() returns { data: [...] }; React Query wraps as { data: { data: [...] } }
  // Use helper to unwrap robustly regardless of nesting
  const unwrap = (d: any): any => {
    if (!d) return d;
    if (Array.isArray(d)) return d;
    if (d?.data !== undefined) return Array.isArray(d.data) ? d.data : d.data;
    return d;
  };
  const unwrapArr = (d: any): any[] => { const v = unwrap(d); return Array.isArray(v) ? v : []; };

  const icp = unwrap(icpData?.data);
  const allRefTracks: any[] = unwrapArr(refTracksData?.data);
  const allSongs: any[] = unwrapArr(songsData?.data);
  const flowFactorConfigs: any[] = unwrapArr(flowFactorConfigsData?.data);
  const genSystems: any[] = unwrapArr(genSystemsData?.data);
  const firstActiveSystemId = useMemo(() => genSystems.find((g) => g.is_active)?.id || '', [genSystems]);
  const storeName = icp?.store?.name || 'Store';
  const clientName = icp?.store?.client?.name || 'Client';

  const refTracks = useMemo(() => {
    if (!refFilter) return allRefTracks;
    const q = refFilter.toLowerCase();
    return allRefTracks.filter((t) => t.title?.toLowerCase().includes(q) || t.artist?.toLowerCase().includes(q));
  }, [allRefTracks, refFilter]);


  const songs = useMemo(() => {
    if (!songFilter) return allSongs;
    const q = songFilter.toLowerCase();
    return allSongs.filter((s) => s.title?.toLowerCase().includes(q) || s.status?.toLowerCase().includes(q));
  }, [allSongs, songFilter]);

  /* ---- Mutations ---- */

  const updateIcpMutation = useMutation({
    mutationFn: (body: any) => api(`/api/store-icps/${icpId}`, { method: 'PUT', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['icp', icpId] }),
  });

  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [analyzeErrors, setAnalyzeErrors] = useState<Record<string, string>>({});

  const analyzeRefMutation = useMutation({
    mutationFn: (id: string) => api(`/api/reference-tracks/${id}/analyze`, { method: 'POST' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['icp-ref-tracks', icpId] });
      setAnalyzingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    },
    onError: (err: any, id: string) => {
      setAnalyzingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      const raw = err?.message || 'Analysis failed';
      const msg = raw.toLowerCase().includes('fetch') ? 'network error — server unreachable' : raw;
      setAnalyzeErrors((prev) => ({ ...prev, [id]: msg }));
    },
  });

  const triggerAnalysis = (id: string) => {
    setAnalyzingIds((prev) => new Set(prev).add(id));
    setAnalyzeErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
    analyzeRefMutation.mutate(id);
  };

  const createRefMutation = useMutation({
    mutationFn: (body: any) => api(`/api/store-icps/${icpId}/reference-tracks`, { method: 'POST', body: { ...body, duration_seconds: body.duration_seconds ? Number(body.duration_seconds) : undefined, release_year: body.release_year ? Number(body.release_year) : undefined } }),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['icp-ref-tracks', icpId] });
      setShowRefForm(false);
      setRefForm({ title: '', artist: '', genre: '', album: '', duration_seconds: '', release_year: '' });
      const newId = result?.data?.id;
      if (newId) triggerAnalysis(newId);
    },
  });

  const bulkAddRefMutation = useMutation({
    mutationFn: (tracks: { title: string; artist: string }[]) =>
      api(`/api/store-icps/${icpId}/reference-tracks/bulk`, { method: 'POST', body: { tracks } }),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['icp-ref-tracks', icpId] });
      setShowBulkAdd(false); setBulkText(''); setBulkError('');
      const newTracks: any[] = Array.isArray(result?.data) ? result.data : [];
      newTracks.forEach((t) => { if (t?.id) triggerAnalysis(t.id); });
    },
    onError: (err: Error) => { setBulkError(err.message || 'Failed to add tracks'); },
  });

  const [bulkError, setBulkError] = useState('');

  const handleBulkSubmit = () => {
    setBulkError('');
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const tracks = lines.map((line) => {
      // Try multiple separators: " - ", " — ", " – ", ", "
      for (const sep of [' - ', ' — ', ' – ', ', ']) {
        if (line.includes(sep)) {
          const idx = line.indexOf(sep);
          return { title: line.slice(0, idx).trim(), artist: line.slice(idx + sep.length).trim() };
        }
      }
      // No separator found — treat whole line as title with "Unknown" artist
      return { title: line, artist: 'Unknown' };
    }).filter((t) => t.title);
    if (tracks.length === 0) {
      setBulkError('No tracks detected. Use format: Title - Artist');
      return;
    }
    bulkAddRefMutation.mutate(tracks);
  };

  const updateRefMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api(`/api/reference-tracks/${id}`, { method: 'PUT', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['icp-ref-tracks', icpId] }),
  });

  const deleteRefMutation = useMutation({
    mutationFn: (id: string) => api(`/api/reference-tracks/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['icp-ref-tracks', icpId] }),
  });

  const createSongMutation = useMutation({
    mutationFn: (body: any) => api(`/api/store-icps/${icpId}/songs`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['icp-songs', icpId] });
      closeSongModal();
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: (id: string) => api(`/api/songs/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['icp-songs', icpId] }),
  });

  /* ---- File handling ---- */

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['mp3', 'wav', 'flac'].includes(ext)) {
      setUploadError('Only .mp3, .wav, .flac files are accepted');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const [meta, result] = await Promise.all([readAudioMeta(file), uploadFile(file)]);
      setFileMeta(meta);
      setSongForm((prev) => ({
        ...prev,
        audio_file_url: result.url,
        title: prev.title || meta.title,
        duration_seconds: meta.duration ? String(meta.duration) : prev.duration_seconds,
      }));
      setShowSongModal(true);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const closeSongModal = () => {
    setShowSongModal(false);
    setSongForm({ title: '', audio_file_url: '', duration_seconds: '', generation_system_id: '', prompt_text: '', created_by: 'admin' });
    setFlowFactorValues({});
    setFileMeta(null);
    setUploadError('');
    setShowFlowFactors(false);
  };

  const handleSongSubmit = () => {
    if (!songForm.audio_file_url || !songForm.duration_seconds) { setUploadError('Please upload an audio file first.'); return; }
    createSongMutation.mutate({
      title: songForm.title || undefined,
      audio_file_url: songForm.audio_file_url,
      duration_seconds: Number(songForm.duration_seconds),
      generation_system_id: songForm.generation_system_id || firstActiveSystemId || undefined,
      flow_factor_values: Object.keys(flowFactorValues).length > 0 ? flowFactorValues : undefined,
      prompt_text: songForm.prompt_text || undefined,
      created_by: songForm.created_by || 'admin',
    });
  };

  /* ---- Render ---- */

  if (isLoading) return <p className="text-[rgba(255,255,255,0.3)]">Loading...</p>;
  if (!icp) return <p className="text-[#ea6152]">Audience not found</p>;

  const ageRange = [icp.age_range_low, icp.age_range_high].filter(Boolean).join('–');

  return (
    <div className="flex flex-col h-full">
      <Breadcrumb items={[
        { label: 'Clients', href: '/clients' },
        { label: clientName, href: `/clients/${clientId}` },
        { label: storeName, href: `/clients/${clientId}/stores/${storeId}` },
        { label: icp.name },
      ]} />

      {/* ── Row 1: Profile (left) + Reference Tracks (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* ── Left: Audience Profile ── */}
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl overflow-hidden">
          <button type="button" onClick={() => setShowProfile((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[rgba(74,144,164,0.15)] border border-[rgba(74,144,164,0.3)] flex items-center justify-center text-[#5ea2b6] text-sm font-semibold shrink-0">
                {icp.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-[rgba(255,255,255,0.87)]">{icp.name}</span>
                {icp.psychographic_summary && (
                  <p className="text-xs text-[rgba(255,255,255,0.55)] mt-0.5 truncate">{icp.psychographic_summary.slice(0, 80)}{icp.psychographic_summary.length > 80 ? '…' : ''}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex flex-wrap gap-1.5 text-[10px] text-[rgba(255,255,255,0.55)]">
                {ageRange && <span className="bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">{ageRange}</span>}
                {icp.gender && <span className="bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">{icp.gender}</span>}
                {icp.income_bracket && <span className="bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">{icp.income_bracket}</span>}
                {icp.location_type && <span className="bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">{icp.location_type}</span>}
              </div>
              <span className={`text-[rgba(255,255,255,0.3)] text-xs transition-transform ${showProfile ? 'rotate-180' : ''}`}>▼</span>
            </div>
          </button>

          {showProfile && (
            <div className="border-t border-[rgba(255,255,255,0.09)] px-4 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
              {/* Demographics */}
              <div>
                <span className="text-[rgba(255,255,255,0.25)] text-xs uppercase tracking-widest block mb-2">Demographics</span>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {[
                    { label: 'Age Range', value: ageRange, hint: 'e.g. 25-45', onSave: (v: string) => { const parts = v.split(/[-–]/); updateIcpMutation.mutate({ age_range_low: parseInt(parts[0]) || null, age_range_high: parseInt(parts[1]) || null }); } },
                    { label: 'Gender', value: icp.gender || '', hint: 'e.g. Female', onSave: (v: string) => updateIcpMutation.mutate({ gender: v || null }) },
                    { label: 'Income', value: icp.income_bracket || '', hint: 'e.g. $50–80K', onSave: (v: string) => updateIcpMutation.mutate({ income_bracket: v || null }) },
                    { label: 'Location', value: icp.location_type || '', hint: 'e.g. Urban', onSave: (v: string) => updateIcpMutation.mutate({ location_type: v || null }) },
                  ].map(({ label, value, hint, onSave }) => (
                    <div key={label} className="flex items-baseline gap-2">
                      <span className="text-[rgba(255,255,255,0.4)] shrink-0 w-16 text-xs">{label}</span>
                      <InlineEdit value={value} onSave={onSave} placeholder={hint} className="text-[rgba(255,255,255,0.87)]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[rgba(255,255,255,0.04)]" />

              {/* Psychographics */}
              <div>
                <span className="text-[rgba(255,255,255,0.25)] text-xs uppercase tracking-widest block mb-2">Psychographics</span>
                <div className="space-y-3">
                  {[
                    { label: 'Summary', field: 'psychographic_summary', value: icp.psychographic_summary || '' },
                    { label: 'Preferences & Values', field: 'preferences', value: icp.preferences || '' },
                    { label: 'Media Consumption', field: 'media_consumption', value: icp.media_consumption || '' },
                  ].map(({ label, field, value }) => (
                    <div key={field}>
                      <span className="text-[rgba(255,255,255,0.4)] block mb-1 text-xs">{label}</span>
                      <InlineEdit value={value} onSave={(v) => updateIcpMutation.mutate({ [field]: v || null })} as="textarea" className="text-[rgba(255,255,255,0.87)]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[rgba(255,255,255,0.04)]" />

              {/* Full details */}
              <div>
                <button type="button" onClick={() => setShowFullDetails((v) => !v)} className="flex items-center gap-2 text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.6)] text-xs uppercase tracking-widest transition-colors">
                  <span>{showFullDetails ? '▼' : '▶'}</span>Full Profile Details
                </button>
                {showFullDetails && (
                  <div className="mt-3">
                    <p className="text-[rgba(255,255,255,0.25)] text-xs mb-2">Paste full audience research, extended notes, or any context here.</p>
                    <InlineEdit value={icp.notes || ''} onSave={(v) => updateIcpMutation.mutate({ notes: v || null })} as="textarea" className="text-[rgba(255,255,255,0.7)]" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Reference Tracks ── */}
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl flex flex-col overflow-hidden min-h-[360px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.09)] shrink-0">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-[rgba(255,255,255,0.87)]">Reference Tracks</h2>
              <span className="text-xs text-[rgba(255,255,255,0.3)]">{allRefTracks.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.09)] rounded-lg px-2.5 py-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="4" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2"/><path d="M8.5 8.5L11 11" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                <input value={refFilter} onChange={(e) => setRefFilter(e.target.value)} placeholder="Filter..." className="bg-transparent border-none outline-none text-xs text-[rgba(255,255,255,0.87)] w-16 placeholder:text-[rgba(255,255,255,0.2)]" />
              </div>
              <button type="button" onClick={() => { setShowBulkAdd(true); setShowRefForm(false); }} className="border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)] hover:border-[rgba(255,255,255,0.2)] rounded-lg px-2.5 py-1 text-xs transition-colors flex items-center gap-1">
                <span>+</span> Add
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {showBulkAdd && (
              <div className="border-b border-[rgba(255,255,255,0.09)] px-4 py-3 space-y-2">
                <p className="text-[10px] text-[rgba(255,255,255,0.55)] uppercase tracking-widest font-bold">One per line: Title - Artist</p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={"Midnight City - M83\nSunday Morning - No Doubt\nBlue Monday - New Order"}
                  rows={6}
                  className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)] resize-none font-mono leading-relaxed placeholder:text-[rgba(255,255,255,0.15)]"
                  autoFocus
                />
                {bulkError && <p className="text-[#ea6152] text-xs">{bulkError}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[rgba(255,255,255,0.25)]">
                    {bulkText.split('\n').filter((l) => l.trim()).length} tracks detected
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowBulkAdd(false); setBulkText(''); }} className="border border-[rgba(255,255,255,0.1)] px-3 py-1.5 rounded-lg text-xs text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
                    <button
                      type="button"
                      onClick={handleBulkSubmit}
                      disabled={bulkAddRefMutation.isPending || !bulkText.trim()}
                      className="bg-[#5ea2b6] text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 hover:bg-[#70b4c8] transition-colors"
                    >
                      {bulkAddRefMutation.isPending ? 'Adding...' : 'Add All'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {refTracks.map((rt) => {
              const isAnalyzing = analyzingIds.has(rt.id);
              return (
                <div key={rt.id} className="border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <button type="button" onClick={() => setExpandedTracks((prev) => { const n = new Set(prev); n.has(rt.id) ? n.delete(rt.id) : n.add(rt.id); return n; })} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[rgba(255,255,255,0.03)] text-left transition-colors">
                    <div className="flex-1 min-w-0">
                      <span className="text-[rgba(255,255,255,0.87)]">{rt.title}</span>
                      {rt.artist && <span className="text-[rgba(255,255,255,0.4)] ml-2">— {rt.artist}</span>}
                    </div>
                    {isAnalyzing && (
                      <span className="flex items-center gap-1 text-[10px] text-[#5ea2b6] shrink-0">
                        <span className="inline-block w-2.5 h-2.5 border border-[#5ea2b6]/40 border-t-[#5ea2b6] rounded-full animate-spin" />
                        Analyzing
                      </span>
                    )}
                    {!isAnalyzing && rt.genre && <span className="text-[rgba(255,255,255,0.25)] text-xs shrink-0">{rt.genre}</span>}
                    {rt.duration_seconds && <span className="text-[rgba(255,255,255,0.25)] text-xs tabular-nums shrink-0">{formatDuration(rt.duration_seconds)}</span>}
                  </button>
                  {expandedTracks.has(rt.id) && (
                    <div className="border-t border-[rgba(255,255,255,0.09)] px-4 py-3 space-y-3">
                      <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-xs">
                        {([['Title', rt.title, 'title'], ['Artist', rt.artist, 'artist'], ['Genre', rt.genre, 'genre'], ['Album', rt.album, 'album']] as [string, string, string][]).map(([label, val, field]) => (
                          <div key={field} className="flex items-baseline gap-1">
                            <span className="text-[rgba(255,255,255,0.3)] shrink-0">{label}:</span>
                            <InlineEdit value={val || ''} onSave={(v) => updateRefMutation.mutate({ id: rt.id, body: { [field]: v } })} className="text-[rgba(255,255,255,0.7)]" />
                          </div>
                        ))}
                      </div>
                      {rt.analyzed && (
                        <div className="border-t border-[rgba(255,255,255,0.04)] pt-2 space-y-2.5">
                          {LAYER_CATEGORIES.map(({ key, label, color, fields }) => {
                            const populated = fields.filter((f) => rt[f] != null);
                            if (populated.length === 0) return null;
                            return (
                              <div key={key}>
                                <p className="text-[9px] uppercase tracking-widest mb-1.5 font-medium" style={{ color }}>{label}</p>
                                <div className="grid grid-cols-2 gap-x-5 gap-y-1">
                                  {populated.map((f) => {
                                    const val = rt[f];
                                    const lbl = f.replace(/_/g, ' ');
                                    if (f === 'bpm') return (
                                      <div key={f} className="flex items-center gap-1.5">
                                        <span className="text-[rgba(255,255,255,0.3)] text-[10px] shrink-0">{lbl}</span>
                                        <span className="text-[rgba(255,255,255,0.75)] text-[10px] font-medium tabular-nums">{Math.round(val)}</span>
                                      </div>
                                    );
                                    if (FLOAT_FIELDS.has(f)) return (
                                      <div key={f} className="flex items-center gap-1.5">
                                        <span className="text-[rgba(255,255,255,0.3)] text-[10px] shrink-0 w-[72px] truncate">{lbl}</span>
                                        <div className="flex-1 h-[3px] bg-[rgba(255,255,255,0.07)] rounded-full">
                                          <div className="h-full rounded-full" style={{ width: `${Math.round(val * 100)}%`, backgroundColor: color }} />
                                        </div>
                                        <span className="text-[rgba(255,255,255,0.35)] text-[10px] tabular-nums shrink-0 w-5 text-right">{Math.round(val * 100)}</span>
                                      </div>
                                    );
                                    return (
                                      <div key={f} className="flex items-baseline gap-1.5 min-w-0">
                                        <span className="text-[rgba(255,255,255,0.3)] text-[10px] shrink-0">{lbl}</span>
                                        <span className="text-[rgba(255,255,255,0.65)] text-[10px] truncate">{String(val)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                          {rt.analysis_data?.notes && (
                            <p className="text-[rgba(255,255,255,0.38)] text-[10px] italic border-t border-[rgba(255,255,255,0.04)] pt-2">{rt.analysis_data.notes}</p>
                          )}
                        </div>
                      )}
                      {!rt.analyzed && !isAnalyzing && (
                        <p className="text-[rgba(255,255,255,0.2)] text-xs italic">Not yet analyzed</p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <button type="button" onClick={() => triggerAnalysis(rt.id)} disabled={isAnalyzing} className="text-[#5ea2b6] hover:text-[#70b4c8] text-xs transition-colors disabled:opacity-40 shrink-0">
                            {isAnalyzing ? 'Analyzing…' : 'Re-analyze'}
                          </button>
                          <button type="button" onClick={() => api(`/api/reference-tracks/${rt.id}/analyze-ping`, { method: 'POST' }).then((d: any) => alert(JSON.stringify(d))).catch((e: any) => alert('ping failed: ' + e.message))} className="text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] text-[10px] transition-colors shrink-0">ping</button>
                          {analyzeErrors[rt.id] && <span className="text-[#ea6152] text-[10px] truncate">{analyzeErrors[rt.id]}</span>}
                        </div>
                        <button type="button" onClick={() => { if (window.confirm(`Delete "${rt.title}"?`)) deleteRefMutation.mutate(rt.id); }} className="text-[#ea6152] hover:text-[#c0392b] text-xs transition-colors shrink-0">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {refTracks.length === 0 && !showBulkAdd && (
              <div className="px-4 py-8 text-center">
                <p className="text-[rgba(255,255,255,0.25)] text-xs mb-2">No reference tracks</p>
                <button type="button" onClick={() => setShowBulkAdd(true)} className="text-[#5ea2b6] hover:text-[#70b4c8] text-xs transition-colors">+ Add tracks</button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Row 2: Song Library (full width) ── */}
      <div className="flex-1 min-h-0">
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl flex flex-col overflow-hidden min-h-[360px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.09)] shrink-0">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-[rgba(255,255,255,0.87)]">Songs</h2>
              <span className="text-xs text-[rgba(255,255,255,0.3)]">{allSongs.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.09)] rounded-lg px-2.5 py-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="4" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2"/><path d="M8.5 8.5L11 11" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                <input value={songFilter} onChange={(e) => setSongFilter(e.target.value)} placeholder="Filter..." className="bg-transparent border-none outline-none text-xs text-[rgba(255,255,255,0.87)] w-16 placeholder:text-[rgba(255,255,255,0.2)]" />
              </div>
              <button type="button" onClick={() => setShowSongModal(true)} className="bg-[#5ea2b6] text-white rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-[#70b4c8] transition-colors flex items-center gap-1">
                <span>+</span> Upload
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Drop zone */}
            <div
              className={`mx-2 mt-2 mb-1 p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${dragging ? 'border-[#5ea2b6] bg-[rgba(74,144,164,0.08)]' : 'border-[rgba(255,255,255,0.09)] hover:border-[rgba(255,255,255,0.15)]'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".mp3,.wav,.flac" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {uploading ? (
                <p className="text-[#5ea2b6] text-xs">Uploading…</p>
              ) : (
                <>
                  <p className="text-[rgba(255,255,255,0.55)] text-xs">Drop audio files here</p>
                  <p className="text-[rgba(255,255,255,0.15)] text-[10px] mt-0.5">MP3, WAV, FLAC</p>
                </>
              )}
            </div>
            {uploadError && !showSongModal && <p className="text-[#ea6152] text-xs px-4 py-1">{uploadError}</p>}

            {songsLoading && <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-xs">Loading...</p>}
            {!songsLoading && songs.map((song) => (
              <div key={song.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                <StatusBadge status={song.status || 'generated'} />
                <span className="flex-1 text-sm text-[rgba(255,255,255,0.87)] truncate">{song.title || 'Untitled'}</span>
                {song.duration_seconds && <span className="text-[rgba(255,255,255,0.25)] text-xs tabular-nums shrink-0">{formatDuration(song.duration_seconds)}</span>}
                <button type="button" onClick={() => navigate(`/songs/${song.id}`)} className="text-[#5ea2b6] hover:text-[#70b4c8] text-xs transition-colors shrink-0">View</button>
                <button type="button" onClick={() => { if (window.confirm(`Delete "${song.title || 'this song'}"?`)) deleteSongMutation.mutate(song.id); }} className="text-[rgba(255,255,255,0.15)] hover:text-[#ea6152] text-xs transition-colors shrink-0">Delete</button>
              </div>
            ))}
            {!songsLoading && songs.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-[rgba(255,255,255,0.25)] text-xs mb-2">No songs yet</p>
                <button type="button" onClick={() => setShowSongModal(true)} className="text-[#5ea2b6] hover:text-[#70b4c8] text-xs transition-colors">+ Add first song</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Song Modal ── */}
      {showSongModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0e0e1a] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[rgba(255,255,255,0.09)]">
              <h2 className="text-base font-medium text-[rgba(255,255,255,0.87)]">Add Song</h2>
              <button type="button" onClick={closeSongModal} className="text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] transition-colors text-lg leading-none">✕</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* File drop zone */}
              {songForm.audio_file_url ? (
                <div className="space-y-2">
                  <audio controls src={songForm.audio_file_url} className="w-full" />
                  <button type="button" onClick={() => setSongForm((p) => ({ ...p, audio_file_url: '', duration_seconds: '' }))} className="text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.5)] text-xs transition-colors">Remove file</button>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? 'border-[#5ea2b6] bg-[rgba(74,144,164,0.08)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <p className="text-[#5ea2b6] text-sm">Uploading…</p>
                  ) : (
                    <>
                      <p className="text-[rgba(255,255,255,0.4)] text-sm">Drop audio file here or click to browse</p>
                      <p className="text-[rgba(255,255,255,0.2)] text-xs mt-1">.mp3 · .wav · .flac — title & duration auto-detected</p>
                    </>
                  )}
                </div>
              )}
              {uploadError && <p className="text-[#ea6152] text-xs">{uploadError}</p>}

              {/* Detected metadata */}
              {fileMeta && (fileMeta.artist || fileMeta.album || fileMeta.genre || fileMeta.bpm || fileMeta.key || fileMeta.year) && (
                <div className="bg-[rgba(74,144,164,0.06)] border border-[rgba(74,144,164,0.15)] rounded-lg px-3 py-2.5">
                  <span className="text-[#5ea2b6] text-[10px] uppercase tracking-widest font-medium block mb-1.5">Detected from file</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {fileMeta.artist && <span className="text-[rgba(255,255,255,0.6)]"><span className="text-[rgba(255,255,255,0.3)]">Artist:</span> {fileMeta.artist}</span>}
                    {fileMeta.album && <span className="text-[rgba(255,255,255,0.6)]"><span className="text-[rgba(255,255,255,0.3)]">Album:</span> {fileMeta.album}</span>}
                    {fileMeta.genre && <span className="text-[rgba(255,255,255,0.6)]"><span className="text-[rgba(255,255,255,0.3)]">Genre:</span> {fileMeta.genre}</span>}
                    {fileMeta.bpm && <span className="text-[rgba(255,255,255,0.6)]"><span className="text-[rgba(255,255,255,0.3)]">BPM:</span> {fileMeta.bpm}</span>}
                    {fileMeta.key && <span className="text-[rgba(255,255,255,0.6)]"><span className="text-[rgba(255,255,255,0.3)]">Key:</span> {fileMeta.key}</span>}
                    {fileMeta.year && <span className="text-[rgba(255,255,255,0.6)]"><span className="text-[rgba(255,255,255,0.3)]">Year:</span> {fileMeta.year}</span>}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Title</label>
                <input placeholder="Auto-filled from file" value={songForm.title} onChange={(e) => setSongForm((p) => ({ ...p, title: e.target.value }))} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)]" />
              </div>

              {/* Duration + Gen system */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Duration (sec)</label>
                  <input type="number" placeholder="Auto-filled from file" value={songForm.duration_seconds} onChange={(e) => setSongForm((p) => ({ ...p, duration_seconds: e.target.value }))} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)]" />
                </div>
                <div>
                  <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Generation System</label>
                  <select value={songForm.generation_system_id} onChange={(e) => setSongForm((p) => ({ ...p, generation_system_id: e.target.value }))} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[#0e0e1a] text-[rgba(255,255,255,0.87)]">
                    <option value="">— Default —</option>
                    {genSystems.map((gs) => <option key={gs.id} value={gs.id}>{gs.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Prompt text */}
              <div>
                <label className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Prompt Text</label>
                <textarea placeholder="The prompt used to generate this song…" value={songForm.prompt_text} onChange={(e) => setSongForm((p) => ({ ...p, prompt_text: e.target.value }))} rows={3} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)] resize-none" />
              </div>

              {/* Flow factors — collapsible */}
              {flowFactorConfigs.length > 0 && (
                <div>
                  <button type="button" onClick={() => setShowFlowFactors((v) => !v)} className="flex items-center gap-2 text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.6)] text-xs uppercase tracking-widest transition-colors">
                    <span>{showFlowFactors ? '▼' : '▶'}</span>Flow Factor Values
                  </button>
                  {showFlowFactors && (
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                      {flowFactorConfigs.map((ff) => (
                        <div key={ff.name} className="flex items-center gap-2">
                          <span className="text-[rgba(255,255,255,0.4)] text-xs w-28 shrink-0 truncate" title={ff.display_name}>{ff.display_name || ff.name}</span>
                          <input type="text" value={flowFactorValues[ff.name] || ''} onChange={(e) => setFlowFactorValues((p) => ({ ...p, [ff.name]: e.target.value }))} className="flex-1 border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)]" placeholder={ff.value_type === 'numeric' ? '0–10' : '…'} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 px-6 pb-5">
              <button type="button" onClick={handleSongSubmit} disabled={createSongMutation.isPending || !songForm.audio_file_url || uploading} className="flex-1 bg-[#5ea2b6] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[#70b4c8] transition-colors">
                {createSongMutation.isPending ? 'Saving…' : 'Add Song'}
              </button>
              <button type="button" onClick={closeSongModal} className="flex-1 border border-[rgba(255,255,255,0.1)] py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
