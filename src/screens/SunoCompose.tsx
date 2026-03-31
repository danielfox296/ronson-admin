import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, uploadFile } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

/* ── Copy button ── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.7)]"
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
function FieldCard({ label, value, copyValue, editable, onChange }: { label: string; value: string; copyValue?: string; editable?: boolean; onChange?: (v: string) => void }) {
  return (
    <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.06)]">
        <span className="text-[9px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.35)] font-medium">{label}</span>
        <CopyBtn text={copyValue ?? value} />
      </div>
      {editable ? (
        <textarea
          value={value}
          onChange={e => onChange?.(e.target.value)}
          rows={14}
          className="w-full bg-transparent text-[rgba(255,255,255,0.85)] text-sm px-4 py-3 resize-none focus:outline-none leading-relaxed font-mono"
          spellCheck={false}
        />
      ) : (
        <div className="px-4 py-3 text-[rgba(255,255,255,0.85)] text-sm whitespace-pre-wrap leading-relaxed">{value || <span className="text-[rgba(255,255,255,0.2)] italic">Generating...</span>}</div>
      )}
    </div>
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
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [instructions, setInstructions] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

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

  // Generate prompt from Claude
  const generate = useCallback(async () => {
    setGenerating(true);
    setGenError('');
    try {
      const result = await api<{ data: any }>('/api/compose/generate', {
        method: 'POST',
        body: { store_icp_id: icpId, reference_track_id: refTrackId, additional_instructions: instructions || undefined },
      });
      const d = (result as any)?.data;
      setStyle(d?.style || '');
      setExclude(d?.style_negations || '');
      setVoice(d?.voice || '');
      setLyrics(d?.lyrics || '');
    } catch (e: any) {
      setGenError(e?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [icpId, refTrackId, instructions]);

  // Auto-generate on mount
  const hasGenerated = useRef(false);
  if (!hasGenerated.current && refTrackId && icpId) {
    hasGenerated.current = true;
    generate();
  }

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

  return (
    <div className="min-h-screen bg-[#101018] text-white">
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Breadcrumb + back */}
        <Breadcrumb items={[
          { label: icp?.store?.client?.name || 'Client', href: `/clients/${clientId}` },
          { label: icp?.store?.name || 'Store', href: `/clients/${clientId}/stores/${storeId}` },
          { label: icp?.name || 'Audience', href: backPath },
          { label: 'Compose' },
        ]} />

        {/* Track header */}
        <div className="mt-6 mb-8">
          <h1 className="text-2xl font-light tracking-tight text-white leading-tight">
            {track ? `"${track.title}"` : 'Loading...'}
            {track?.artist && <span className="text-[rgba(255,255,255,0.4)]"> by {track.artist}</span>}
          </h1>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {chips.map((c, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.06)]">{c}</span>
              ))}
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

        {/* Fields */}
        {!generating && (style || exclude || voice || lyrics) && (
          <div className="space-y-4 mb-6">
            <FieldCard label="Style" value={style} />
            <FieldCard label="Exclude" value={exclude} />
            <FieldCard label="Voice" value={voice} />
            <FieldCard label="Lyrics" value={lyrics} editable onChange={setLyrics} />
          </div>
        )}

        {/* Regenerate controls */}
        {!generating && (style || lyrics) && (
          <div className="flex items-center gap-3 mb-10">
            <button type="button" onClick={generate} className="text-[#5ea2b6] hover:text-[#70b4c8] text-sm transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Regenerate
            </button>
            <button type="button" onClick={() => setShowInstructions(!showInstructions)} className="text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] text-xs transition-colors">
              {showInstructions ? 'Hide instructions' : 'Add instructions...'}
            </button>
          </div>
        )}

        {showInstructions && (
          <div className="mb-8">
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g. Make it more upbeat, add a bridge section, use Spanish lyrics..."
              rows={3}
              className="w-full bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl px-4 py-3 text-sm text-[rgba(255,255,255,0.85)] placeholder-[rgba(255,255,255,0.2)] resize-none focus:outline-none focus:border-[rgba(255,255,255,0.15)]"
            />
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[rgba(255,255,255,0.06)] mb-8" />

        {/* Upload section */}
        {!saved ? (
          <>
            <span className="text-[9px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.35)] font-medium block mb-3">Upload Suno Result</span>

            {!uploadedUrl ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-colors ${dragging ? 'border-[#5ea2b6] bg-[rgba(94,162,182,0.05)]' : 'border-[rgba(255,255,255,0.09)] hover:border-[rgba(255,255,255,0.15)]'}`}
              >
                <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-[rgba(255,255,255,0.4)] text-sm">
                    <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.2)] border-t-[#5ea2b6] rounded-full animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 mx-auto mb-2 text-[rgba(255,255,255,0.15)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                    <p className="text-[rgba(255,255,255,0.35)] text-sm">Drop your Suno .mp3 here</p>
                    <p className="text-[rgba(255,255,255,0.2)] text-xs mt-1">or click to browse</p>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl px-4 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-5 h-5 text-[#33be6a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm text-[rgba(255,255,255,0.5)] truncate">{uploadedName}</span>
                </div>
                <input
                  type="text"
                  value={songTitle}
                  onChange={e => setSongTitle(e.target.value)}
                  placeholder="Song title"
                  className="w-full bg-transparent border border-[rgba(255,255,255,0.09)] rounded-lg px-3 py-2 text-sm text-white placeholder-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[rgba(255,255,255,0.15)]"
                />
              </div>
            )}

            {uploadError && <p className="text-[#ea6152] text-xs mt-2">{uploadError}</p>}

            {uploadedUrl && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !songTitle}
                className="mt-4 w-full py-3 rounded-xl text-sm font-medium transition-colors bg-[#5ea2b6] hover:bg-[#70b4c8] text-white disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save to Playlist'}
              </button>
            )}
          </>
        ) : (
          <div className="text-center py-10">
            <svg className="w-10 h-10 mx-auto mb-3 text-[#33be6a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-[rgba(255,255,255,0.7)] text-sm mb-1">Saved to playlist</p>
            <p className="text-[rgba(255,255,255,0.3)] text-xs mb-4">{songTitle}</p>
            <div className="flex items-center justify-center gap-4">
              <button type="button" onClick={() => navigate(backPath)} className="text-[#5ea2b6] hover:text-[#70b4c8] text-sm transition-colors">Back to Audience</button>
              <button type="button" onClick={() => { setSaved(false); setUploadedUrl(''); setUploadedName(''); setSongTitle(''); }} className="text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] text-sm transition-colors">Compose another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
