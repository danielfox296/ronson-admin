import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, uploadFile } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

/* ── Outcome mode definitions ── */
type OutcomeMode = 'linger' | 'elevate' | 'energize' | 'move';

interface OutcomeDefinition {
  id: OutcomeMode;
  label: string;
  descriptor: string;
  warning?: string;
  style: string;
  exclude: string;
  icon: React.ReactNode;
}

const OUTCOME_MODES: OutcomeDefinition[] = [
  {
    id: 'linger',
    label: 'Linger',
    descriptor: 'Maximize time in store',
    warning: 'Slow tempo only activates in minor key. Do not remove mode language from the Style field.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    style: [
      'slow / languid / 65 BPM feel / unhurried',
      'minor key / Dorian / melancholic warmth / noble sadness',
      'laid-back / behind the beat / unhurried groove / relaxed feel',
      'sparse / no drums / drumless / percussion-free / rhythm implied',
      'hypnotic / looping / ostinato / repeating groove / minimal surface variation',
      'instrumental / no vocals / wordless / vocalise',
      'circular progression / unresolved / suspended / no strong cadence',
      'gentle dynamic arc / subtle swells / breathing arrangement / natural dynamics',
    ].join('\n'),
    exclude: [
      'uptempo / driving / forward motion / energetic',
      'bright major / uplifting / Mixolydian / cheerful',
      'pushing ahead of beat / urgent / forward drive',
      'dense percussion / full kit / layered rhythm / busy beat',
      'through-composed / evolving structure / high novelty',
      'dense lyrics / sung vocals / prominent voice',
      'strong resolution / resolved cadence / definitive ending',
      'wide dynamic range / dramatic peaks / heavily compressed',
    ].join('\n'),
  },
  {
    id: 'elevate',
    label: 'Elevate',
    descriptor: 'Drive premium perception',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    style: [
      'minor key / sophisticated harmonic depth / melancholic warmth',
      'laid-back / behind the beat / effortlessness cue / luxury ease',
      'sparse / low rhythmic density / space as quality signal',
      'instrumental / no vocals / wordless / ambient quality',
      'deceptive cadences / wistful redirected resolution / longing signal',
      'wide dynamic range / uncompressed / dramatic peaks / craft quality',
    ].join('\n'),
    exclude: [
      'bright major / uplifting / pop energy / cheerful',
      'pushing ahead of beat / urgent / youth-coded',
      'dense percussion / full kit / busy rhythm / energetic beat',
      'dense lyrics / prominent vocals / attention-demanding voice',
      'strong resolution / resolved cadence / definitive ending',
      'narrow dynamic range / flat / heavily compressed / broadcast loud',
    ].join('\n'),
  },
  {
    id: 'energize',
    label: 'Energize',
    descriptor: 'Boost browsing and variety',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    style: [
      'uptempo / driving / forward motion / 110 BPM feel',
      'bright major / uplifting / Mixolydian / earthy major / positive valence',
      'pushing / ahead of the beat / driving groove / forward momentum',
      'dense percussion / full kit / layered rhythm / driving beat',
      'through-composed / developing sections / structural novelty',
      'dense vocal / sung / prominent voice / emotional engagement',
      'strong resolution / satisfying cadence / completion feel',
    ].join('\n'),
    exclude: [
      'slow / languid / unhurried / 65 BPM feel',
      'minor key / Dorian / melancholic / dark harmonic color',
      'laid-back / behind the beat / relaxed feel',
      'sparse / no drums / drumless / percussion-free',
      'hypnotic / looping / minimal variation / ostinato',
      'instrumental / wordless / no vocal energy',
      'circular / unresolved / suspended / no cadence',
    ].join('\n'),
  },
  {
    id: 'move',
    label: 'Move',
    descriptor: 'Drive purchase decisions',
    warning: 'Spending lift evidence is loyalty-segment conditional (EMAC 2025). Works best with known repeat customers.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
    style: [
      'slow / languid / 65 BPM feel / unhurried',
      'minor key / Dorian / melancholic warmth / noble sadness',
      'laid-back / behind the beat / luxury ease / effortlessness cue',
      'sparse / low rhythmic density / craft signal / quality space',
      'instrumental / no vocals / wordless / ambient quality',
      'circular progression / unresolved / suspended / no strong cadence',
      'gentle dynamic arc / subtle swells / natural dynamics / breathing arrangement',
    ].join('\n'),
    exclude: [
      'uptempo / driving / forward motion / high energy',
      'bright major / uplifting / positive valence / cheerful',
      'pushing ahead of beat / urgent',
      'dense percussion / full kit / driving beat / busy rhythm',
      'dense lyrics / prominent vocals / attention-demanding',
      'strong resolution / resolved cadence / definitive ending',
      'narrow dynamic range / compressed / broadcast loud',
    ].join('\n'),
  },
];

/* ── Copy button ── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.7)]"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-[#33be6a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      )}
    </button>
  );
}

/* ── Field card ── */
function FieldCard({ label, value, onChange, rows }: { label: string; value: string; onChange?: (v: string) => void; rows?: number }) {
  return (
    <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.06)]">
        <span className="text-[9px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.5)] font-medium">{label}</span>
        <CopyBtn text={value} />
      </div>
      <textarea
        value={value}
        onChange={e => onChange?.(e.target.value)}
        rows={rows ?? 3}
        className="w-full bg-transparent text-[rgba(255,255,255,0.85)] text-sm px-4 py-3 resize-none focus:outline-none leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
}

/* ── Outcome card ── */
function OutcomeCard({
  outcome,
  selected,
  onSelect,
}: {
  outcome: OutcomeDefinition;
  selected: boolean;
  onSelect: (id: OutcomeMode | null) => void;
}) {
  const [showWarning, setShowWarning] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? null : outcome.id)}
      onMouseEnter={() => outcome.warning && setShowWarning(true)}
      onMouseLeave={() => setShowWarning(false)}
      className={`relative flex-1 flex flex-col items-start gap-2 px-4 py-3 rounded-xl border transition-all text-left ${
        selected
          ? 'border-[#5ea2b6] bg-[rgba(94,162,182,0.08)]'
          : 'border-[rgba(255,255,255,0.09)] bg-[#1b1b24] hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.02)]'
      }`}
    >
      <div className={`${selected ? 'text-[#5ea2b6]' : 'text-[rgba(255,255,255,0.35)]'} transition-colors`}>
        {outcome.icon}
      </div>
      <div>
        <p className={`text-sm font-medium leading-none mb-1 ${selected ? 'text-white' : 'text-[rgba(255,255,255,0.7)]'}`}>
          {outcome.label}
          {outcome.warning && (
            <span className="ml-1.5 text-[rgba(255,165,0,0.6)] text-[9px]">⚠</span>
          )}
        </p>
        <p className="text-[10px] text-[rgba(255,255,255,0.35)] leading-snug">{outcome.descriptor}</p>
      </div>
      {showWarning && outcome.warning && (
        <div className="absolute bottom-full left-0 mb-2 z-10 w-56 px-3 py-2 rounded-lg bg-[#2a2a18] border border-[rgba(255,165,0,0.25)] text-[10px] text-[rgba(255,200,80,0.9)] leading-snug shadow-xl">
          {outcome.warning}
        </div>
      )}
    </button>
  );
}

/* ── Main ── */
export default function SunoCompose() {
  const { clientId, storeId, icpId, refTrackId } = useParams<{ clientId: string; storeId: string; icpId: string; refTrackId: string }>();
  const navigate = useNavigate();
  const backPath = `/clients/${clientId}/stores/${storeId}/audiences/${icpId}`;

  // State
  const [style, setStyle] = useState('');
  const [exclude, setExclude] = useState('');
  const [voice, setVoice] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeMode | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [instructions, setInstructions] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [templatesUsed, setTemplatesUsed] = useState<string[]>([]);

  // Upload state
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploadedName, setUploadedName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch reference track
  const { data: trackData } = useQuery({
    queryKey: ['ref-track', refTrackId],
    queryFn: () => api<{ data: any }>(`/api/reference-tracks/${refTrackId}`),
  });
  const track = (trackData as any)?.data;

  // Fetch ICP for breadcrumb
  const { data: icpData } = useQuery({
    queryKey: ['icp', icpId],
    queryFn: () => api<{ data: any }>(`/api/store-icps/${icpId}`),
  });
  const icp = (icpData as any)?.data;

  // Save suno prompt to reference track's analysis_data (includes desired_outcome)
  const saveSunoPrompt = useCallback(async (s: string, e: string, v: string, l: string, tpl?: string[], outcome?: OutcomeMode | null) => {
    if (!refTrackId) return;
    const existing = track?.analysis_data || {};
    await api(`/api/reference-tracks/${refTrackId}`, {
      method: 'PUT',
      body: { analysis_data: { ...existing, suno: { style: s, exclude: e, voice: v, lyrics: l, templates: tpl || templatesUsed, desired_outcome: outcome !== undefined ? outcome : selectedOutcome } } },
    }).catch(() => {});
  }, [refTrackId, track?.analysis_data, templatesUsed, selectedOutcome]);

  // Debounced auto-save on field edits
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSave = useCallback((s: string, e: string, v: string, l: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSunoPrompt(s, e, v, l), 1500);
  }, [saveSunoPrompt]);

  // Field setters that trigger auto-save
  const updateStyle = (v: string) => { setStyle(v); autoSave(v, exclude, voice, lyrics); };
  const updateExclude = (v: string) => { setExclude(v); autoSave(style, v, voice, lyrics); };
  const updateVoice = (v: string) => { setVoice(v); autoSave(style, exclude, v, lyrics); };
  const updateLyrics = (v: string) => { setLyrics(v); autoSave(style, exclude, voice, v); };

  // Handle outcome card selection — populate style/exclude fields
  const handleOutcomeSelect = useCallback((id: OutcomeMode | null) => {
    setSelectedOutcome(id);
    if (id) {
      const def = OUTCOME_MODES.find(o => o.id === id);
      if (def) {
        setStyle(def.style);
        setExclude(def.exclude);
        // Save immediately with new outcome
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveSunoPrompt(def.style, def.exclude, voice, lyrics, templatesUsed, id);
      }
    } else {
      // Deselected — save current state with null outcome
      saveSunoPrompt(style, exclude, voice, lyrics, templatesUsed, null);
    }
  }, [voice, lyrics, style, exclude, templatesUsed, saveSunoPrompt]);

  // Generate prompt from Claude
  const generate = useCallback(async () => {
    setGenerating(true);
    setGenError('');
    try {
      const result = await api<{ data: any }>('/api/compose/generate', {
        method: 'POST',
        body: { store_icp_id: icpId, reference_track_id: refTrackId, additional_instructions: instructions || undefined, desired_outcome: selectedOutcome || undefined },
      });
      const d = (result as any)?.data;
      const s = d?.style || '', e = d?.style_negations || '', v = d?.voice || '', l = d?.lyrics || '';
      const tpl = d?.templates_used || [];
      setStyle(s); setExclude(e); setVoice(v); setLyrics(l); setTemplatesUsed(tpl);
      saveSunoPrompt(s, e, v, l, tpl, selectedOutcome);
    } catch (err: any) {
      setGenError(err?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [icpId, refTrackId, instructions, selectedOutcome, saveSunoPrompt]);

  // On track load: populate from saved data or generate once
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current || !track || !icpId) return;
    initDone.current = true;
    const suno = (track.analysis_data as any)?.suno;
    if (suno?.style || suno?.lyrics) {
      setStyle(suno.style || ''); setExclude(suno.exclude || ''); setVoice(suno.voice || ''); setLyrics(suno.lyrics || '');
      if (Array.isArray(suno.templates)) setTemplatesUsed(suno.templates);
      if (suno.desired_outcome) setSelectedOutcome(suno.desired_outcome as OutcomeMode);
      setLoaded(true);
    } else {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  // File upload
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('audio/')) { setUploadError('Please upload an audio file'); return; }
    setUploading(true);
    setUploadError('');
    try {
      const { url } = await uploadFile(file);
      setUploadedUrl(url);
      setUploadedName(file.name);
      setSongTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  // Save to playlist
  const handleSave = async () => {
    if (!uploadedUrl) return;
    setSaving(true);
    try {
      await api('/api/compose/save', {
        method: 'POST',
        body: {
          store_icp_id: icpId,
          reference_track_id: refTrackId,
          title: songTitle || 'Untitled',
          audio_file_url: uploadedUrl,
          prompt_text: lyrics,
          style,
          style_negations: exclude,
          voice,
          desired_outcome: selectedOutcome || undefined,
        },
      });
      setSaved(true);
    } catch (e: any) {
      setUploadError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Quick-info chips from track analysis
  const chips = track ? [
    track.bpm && `${Math.round(track.bpm)} BPM`,
    track.musical_key,
    track.mode,
    track.production_era,
    track.instrumentation,
  ].filter(Boolean) : [];

  const showPromptArea = !generating && (style || exclude || voice || lyrics || loaded);

  return (
    <div>
      <div className="px-6 py-6">

        {/* Header row */}
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="min-w-0">
            <Breadcrumb items={[
              { label: icp?.store?.client?.name || 'Client', href: `/clients/${clientId}` },
              { label: icp?.store?.name || 'Store', href: `/clients/${clientId}/stores/${storeId}` },
              { label: icp?.name || 'Audience', href: backPath },
              { label: 'Compose' },
            ]} />
            <h1 className="text-4xl tracking-tight leading-none text-white mt-3">
              {track ? `"${track.title}"` : 'Loading...'}
              {track?.artist && <span className="text-[rgba(255,255,255,0.4)]"> by {track.artist}</span>}
            </h1>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {chips.map((c, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.45)] border border-[rgba(255,255,255,0.06)]">{c}</span>
                ))}
              </div>
            )}
            {templatesUsed.length > 0 && (
              <p className="text-[10px] text-[rgba(255,255,255,0.25)] mt-1.5">Using: {templatesUsed.join(' + ')}</p>
            )}
          </div>

          {/* Upload drop zone */}
          {!saved && (
            <div className="shrink-0 w-[200px]">
              {!uploadedUrl ? (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition-colors ${dragging ? 'border-[#5ea2b6] bg-[rgba(94,162,182,0.05)]' : 'border-[rgba(255,255,255,0.09)] hover:border-[rgba(255,255,255,0.15)]'}`}
                >
                  <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2 text-[rgba(255,255,255,0.4)] text-xs">
                      <div className="w-3 h-3 border-2 border-[rgba(255,255,255,0.2)] border-t-[#5ea2b6] rounded-full animate-spin" />
                      Uploading...
                    </div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mx-auto mb-1 text-[rgba(255,255,255,0.15)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                      <p className="text-[rgba(255,255,255,0.3)] text-[11px]">Drop .mp3 here</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl px-3 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#33be6a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span className="text-[11px] text-[rgba(255,255,255,0.5)] truncate">{uploadedName}</span>
                  </div>
                  <input type="text" value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Title" className="w-full bg-transparent border border-[rgba(255,255,255,0.09)] rounded-lg px-2 py-1.5 text-xs text-white placeholder-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[rgba(255,255,255,0.15)]" />
                  <button type="button" onClick={handleSave} disabled={saving || !songTitle} className="w-full py-1.5 rounded-lg text-xs font-medium bg-[#5ea2b6] hover:bg-[#70b4c8] text-white disabled:opacity-40 transition-colors">
                    {saving ? 'Saving...' : 'Save to Playlist'}
                  </button>
                </div>
              )}
              {uploadError && <p className="text-[#ea6152] text-[10px] mt-1">{uploadError}</p>}
            </div>
          )}
          {saved && (
            <div className="shrink-0 w-[200px] bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl px-3 py-3 text-center">
              <svg className="w-6 h-6 mx-auto mb-1 text-[#33be6a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-[rgba(255,255,255,0.6)] text-[11px] mb-2">Saved</p>
              <div className="flex gap-2 text-[10px]">
                <button type="button" onClick={() => navigate(backPath)} className="text-[#5ea2b6] hover:text-[#70b4c8] transition-colors">Back</button>
                <button type="button" onClick={() => { setSaved(false); setUploadedUrl(''); setUploadedName(''); setSongTitle(''); }} className="text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] transition-colors">New</button>
              </div>
            </div>
          )}
        </div>

        {/* Generation error */}
        {genError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[rgba(231,76,60,0.1)] border border-[rgba(231,76,60,0.2)] text-[#ea6152] text-sm">{genError}</div>
        )}

        {/* Loading state */}
        {generating && (
          <div className="mb-6 flex items-center gap-3 text-[rgba(255,255,255,0.4)] text-sm">
            <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.2)] border-t-[#5ea2b6] rounded-full animate-spin" />
            Generating Suno prompt from analysis...
          </div>
        )}

        {/* Outcome selector — full width above prompt grid */}
        {showPromptArea && (
          <>
            <div className="mb-5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.35)] font-medium mb-2.5">Desired Outcome</p>
              <div className="flex gap-2">
                {OUTCOME_MODES.map(outcome => (
                  <OutcomeCard
                    key={outcome.id}
                    outcome={outcome}
                    selected={selectedOutcome === outcome.id}
                    onSelect={handleOutcomeSelect}
                  />
                ))}
              </div>
              {selectedOutcome && OUTCOME_MODES.find(o => o.id === selectedOutcome)?.warning && (
                <p className="mt-2 text-[10px] text-[rgba(255,200,80,0.7)] flex items-start gap-1.5">
                  <span className="shrink-0">⚠</span>
                  <span>{OUTCOME_MODES.find(o => o.id === selectedOutcome)?.warning}</span>
                </p>
              )}
            </div>

            {/* Two-column prompt grid */}
            <div className="grid grid-cols-[1fr_340px] gap-5">
              <FieldCard label="Lyrics" value={lyrics} onChange={updateLyrics} rows={20} />
              <div className="space-y-3">
                <FieldCard label="Style" value={style} onChange={updateStyle} rows={9} />
                <FieldCard label="Exclude" value={exclude} onChange={updateExclude} rows={8} />
                <FieldCard label="Voice" value={voice} onChange={updateVoice} rows={1} />
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={generate}
                    className="text-[#5ea2b6] hover:text-[#70b4c8] text-xs transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.5)] text-[11px] transition-colors"
                  >
                    {showInstructions ? 'Hide' : 'Instructions...'}
                  </button>
                </div>
                {showInstructions && (
                  <textarea
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    placeholder="e.g. More upbeat, add a bridge, Spanish lyrics..."
                    rows={3}
                    className="w-full bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl px-3 py-2 text-xs text-[rgba(255,255,255,0.85)] placeholder-[rgba(255,255,255,0.2)] resize-none focus:outline-none focus:border-[rgba(255,255,255,0.15)]"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
