import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { humanize, formatDuration } from '../lib/utils.js';
import Breadcrumb from '../components/Breadcrumb.js';
import FileUpload from '../components/FileUpload.js';

/* ------------------------------------------------------------------ */
/*  Shared small components                                            */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[rgba(39,174,96,0.15)] text-[#27ae60]',
    generated: 'bg-[rgba(74,144,164,0.15)] text-[#4a90a4]',
    draft: 'bg-[rgba(230,126,34,0.15)] text-[#e67e22]',
    flagged: 'bg-[rgba(231,76,60,0.15)] text-[#e74c3c]',
    removed: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
    archived: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]'}`}>
      {humanize(status)}
    </span>
  );
}

function InlineEdit({
  value,
  onSave,
  as = 'input',
  className = '',
}: {
  value: string;
  onSave: (v: string) => void;
  as?: 'input' | 'textarea';
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => { if (draft !== value) onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        className={`cursor-pointer hover:bg-[rgba(255,255,255,0.05)] rounded px-1 -mx-1 transition-colors ${className}`}
        title="Click to edit"
      >
        {value || <span className="text-[rgba(255,255,255,0.2)] italic">empty</span>}
      </span>
    );
  }

  const inputCls = 'border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1 text-sm bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)] w-full';

  if (as === 'textarea') {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
        className={inputCls}
        rows={3}
      />
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') cancel();
      }}
      className={inputCls}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function AudiencePipeline() {
  const { clientId, storeId, icpId } = useParams<{ clientId: string; storeId: string; icpId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRefForm, setShowRefForm] = useState(false);
  const [refForm, setRefForm] = useState({ title: '', artist: '', genre: '', album: '', duration_seconds: '', release_year: '' });
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(0);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showSongForm, setShowSongForm] = useState(false);
  const [songForm, setSongForm] = useState({
    title: '',
    audio_file_url: '',
    duration_seconds: '',
    generation_system_id: '',
    prompt_text: '',
    created_by: 'admin',
  });
  const [flowFactorValues, setFlowFactorValues] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState('');

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
  });

  const { data: genSystemsData } = useQuery({
    queryKey: ['generation-systems'],
    queryFn: () => api<{ data: any[] }>('/api/generation-systems'),
  });

  /* ---- Derived ---- */

  const icp = icpData?.data;
  const refTracks: any[] = refTracksData?.data || [];
  const songs: any[] = songsData?.data || [];
  const flowFactorConfigs: any[] = flowFactorConfigsData?.data || [];
  const genSystems: any[] = genSystemsData?.data || [];

  const firstActiveSystemId = useMemo(() => {
    return genSystems.find((gs) => gs.is_active)?.id || '';
  }, [genSystems]);

  const storeName = icp?.store?.name || 'Store';
  const clientName = icp?.store?.client?.name || 'Client';

  /* ---- Mutations ---- */

  const updateIcpMutation = useMutation({
    mutationFn: (body: any) => api(`/api/store-icps/${icpId}`, { method: 'PUT', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['icp', icpId] }),
  });

  const deleteIcpMutation = useMutation({
    mutationFn: () => api(`/api/store-icps/${icpId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-icps'] });
      navigate(`/clients/${clientId}/stores/${storeId}`);
    },
  });

  const startDeleteWithUndo = () => {
    setShowDeleteModal(false);
    setUndoCountdown(5);
    undoIntervalRef.current = setInterval(() => {
      setUndoCountdown((n) => n - 1);
    }, 1000);
    undoTimerRef.current = setTimeout(() => {
      clearInterval(undoIntervalRef.current!);
      setUndoCountdown(0);
      deleteIcpMutation.mutate();
    }, 5000);
  };

  const cancelDelete = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    setUndoCountdown(0);
  };

  const createRefMutation = useMutation({
    mutationFn: (body: any) =>
      api(`/api/store-icps/${icpId}/reference-tracks`, {
        method: 'POST',
        body: {
          ...body,
          duration_seconds: body.duration_seconds ? Number(body.duration_seconds) : undefined,
          release_year: body.release_year ? Number(body.release_year) : undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['icp-ref-tracks', icpId] });
      setShowRefForm(false);
      setRefForm({ title: '', artist: '', genre: '', album: '', duration_seconds: '', release_year: '' });
    },
  });

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
      setShowSongForm(false);
      setSongForm({ title: '', audio_file_url: '', duration_seconds: '', generation_system_id: '', prompt_text: '', created_by: 'admin' });
      setFlowFactorValues({});
      setUploadError('');
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: (id: string) => api(`/api/songs/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['icp-songs', icpId] }),
  });

  const toggleTrack = (id: string) => {
    setExpandedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSongSubmit = () => {
    if (!songForm.audio_file_url || !songForm.duration_seconds) {
      setUploadError('Please upload an audio file first.');
      return;
    }
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
  if (!icp) return <p className="text-[#e74c3c]">Audience not found</p>;

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Clients', href: '/clients' },
        { label: clientName, href: `/clients/${clientId}` },
        { label: storeName, href: `/clients/${clientId}/stores/${storeId}` },
        { label: icp.name },
      ]} />

      {/* ============================================================ */}
      {/*  Section 1: Audience Profile                                  */}
      {/* ============================================================ */}
      <section className="mb-8">
        {/* Audience name — inline editable */}
        <div className="mb-4">
          <InlineEdit
            value={icp.name}
            onSave={(v) => updateIcpMutation.mutate({ name: v })}
            className="text-base font-light text-[rgba(255,255,255,0.6)]"
          />
        </div>

        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-sm space-y-4">

          {/* Demographics */}
          <div>
            <span className="text-[rgba(255,255,255,0.25)] text-xs uppercase tracking-widest block mb-2">Demographics</span>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[rgba(255,255,255,0.4)] shrink-0 w-28">Age Range</span>
                <InlineEdit
                  value={[icp.age_range_low, icp.age_range_high].filter(Boolean).join('–') || ''}
                  onSave={(v) => {
                    const parts = v.split(/[-–]/);
                    const low = parseInt(parts[0]);
                    const high = parseInt(parts[1]);
                    updateIcpMutation.mutate({
                      age_range_low: isNaN(low) ? null : low,
                      age_range_high: isNaN(high) ? null : high,
                    });
                  }}
                  className="text-[rgba(255,255,255,0.87)]"
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[rgba(255,255,255,0.4)] shrink-0 w-28">Gender</span>
                <InlineEdit
                  value={icp.gender || ''}
                  onSave={(v) => updateIcpMutation.mutate({ gender: v || null })}
                  className="text-[rgba(255,255,255,0.87)]"
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[rgba(255,255,255,0.4)] shrink-0 w-28">Income</span>
                <InlineEdit
                  value={icp.income_bracket || ''}
                  onSave={(v) => updateIcpMutation.mutate({ income_bracket: v || null })}
                  className="text-[rgba(255,255,255,0.87)]"
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[rgba(255,255,255,0.4)] shrink-0 w-28">Location</span>
                <InlineEdit
                  value={icp.location_type || ''}
                  onSave={(v) => updateIcpMutation.mutate({ location_type: v || null })}
                  className="text-[rgba(255,255,255,0.87)]"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[rgba(255,255,255,0.04)]" />

          {/* Psychographics */}
          <div>
            <span className="text-[rgba(255,255,255,0.25)] text-xs uppercase tracking-widest block mb-2">Psychographics</span>
            <div className="space-y-3">
              <div>
                <span className="text-[rgba(255,255,255,0.4)] block mb-1">Summary</span>
                <InlineEdit
                  value={icp.psychographic_summary || ''}
                  onSave={(v) => updateIcpMutation.mutate({ psychographic_summary: v })}
                  as="textarea"
                  className="text-[rgba(255,255,255,0.87)]"
                />
              </div>
              <div>
                <span className="text-[rgba(255,255,255,0.4)] block mb-1">Preferences & Values</span>
                <InlineEdit
                  value={icp.preferences || ''}
                  onSave={(v) => updateIcpMutation.mutate({ preferences: v || null })}
                  as="textarea"
                  className="text-[rgba(255,255,255,0.87)]"
                />
              </div>
              <div>
                <span className="text-[rgba(255,255,255,0.4)] block mb-1">Media Consumption</span>
                <InlineEdit
                  value={icp.media_consumption || ''}
                  onSave={(v) => updateIcpMutation.mutate({ media_consumption: v || null })}
                  as="textarea"
                  className="text-[rgba(255,255,255,0.87)]"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[rgba(255,255,255,0.04)]" />

          {/* Full Details — collapsible */}
          <div>
            <button
              type="button"
              onClick={() => setShowFullDetails((v) => !v)}
              className="flex items-center gap-2 text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.6)] text-xs uppercase tracking-widest transition-colors"
            >
              <span>{showFullDetails ? '▼' : '▶'}</span>
              Full Profile Details
            </button>
            {showFullDetails && (
              <div className="mt-3">
                <p className="text-[rgba(255,255,255,0.25)] text-xs mb-2">Paste a full audience profile, research notes, or any extended context here.</p>
                <InlineEdit
                  value={icp.notes || ''}
                  onSave={(v) => updateIcpMutation.mutate({ notes: v || null })}
                  as="textarea"
                  className="text-[rgba(255,255,255,0.7)]"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 2: Reference Tracks                                  */}
      {/* ============================================================ */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-[rgba(255,255,255,0.87)]">Reference Tracks</h2>
        </div>

        <div className="space-y-2">
          {refTracks.map((rt) => (
            <div key={rt.id} className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleTrack(rt.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-[rgba(255,255,255,0.03)] transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[rgba(255,255,255,0.3)]">{expandedTracks.has(rt.id) ? '▼' : '▶'}</span>
                  <span className="font-medium text-[rgba(255,255,255,0.87)]">{rt.title}</span>
                  {rt.artist && <span className="text-[rgba(255,255,255,0.4)]">— {rt.artist}</span>}
                </div>
                {rt.genre && <span className="text-[rgba(255,255,255,0.3)] text-xs">{rt.genre}</span>}
              </button>

              {expandedTracks.has(rt.id) && (
                <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-4 space-y-3">
                  <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-[rgba(255,255,255,0.4)]">Title:</span>{' '}<InlineEdit value={rt.title} onSave={(v) => updateRefMutation.mutate({ id: rt.id, body: { title: v } })} className="text-[rgba(255,255,255,0.87)]" /></div>
                    <div><span className="text-[rgba(255,255,255,0.4)]">Artist:</span>{' '}<InlineEdit value={rt.artist || ''} onSave={(v) => updateRefMutation.mutate({ id: rt.id, body: { artist: v } })} className="text-[rgba(255,255,255,0.87)]" /></div>
                    <div><span className="text-[rgba(255,255,255,0.4)]">Genre:</span>{' '}<InlineEdit value={rt.genre || ''} onSave={(v) => updateRefMutation.mutate({ id: rt.id, body: { genre: v } })} className="text-[rgba(255,255,255,0.87)]" /></div>
                    <div><span className="text-[rgba(255,255,255,0.4)]">Album:</span>{' '}<InlineEdit value={rt.album || ''} onSave={(v) => updateRefMutation.mutate({ id: rt.id, body: { album: v } })} className="text-[rgba(255,255,255,0.87)]" /></div>
                    <div><span className="text-[rgba(255,255,255,0.4)]">Duration:</span>{' '}<span className="text-[rgba(255,255,255,0.87)]">{rt.duration_seconds ? formatDuration(rt.duration_seconds) : '-'}</span></div>
                    <div><span className="text-[rgba(255,255,255,0.4)]">Year:</span>{' '}<InlineEdit value={rt.release_year?.toString() || ''} onSave={(v) => updateRefMutation.mutate({ id: rt.id, body: { release_year: v ? Number(v) : null } })} className="text-[rgba(255,255,255,0.87)]" /></div>
                  </div>
                  <div className="border-t border-[rgba(255,255,255,0.04)] pt-3">
                    <button type="button" onClick={() => { if (window.confirm(`Delete "${rt.title}"?`)) deleteRefMutation.mutate(rt.id); }} className="text-[#e74c3c] hover:text-[#c0392b] text-xs transition-colors">
                      Delete Reference Track
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {refTracks.length === 0 && (
            <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-sm">
              No reference tracks yet
            </div>
          )}
        </div>

        {showRefForm ? (
          <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mt-3 space-y-3">
            <h3 className="font-medium text-sm text-[rgba(255,255,255,0.87)]">Add Reference Track</h3>
            <input placeholder="Title" value={refForm.title} onChange={(e) => setRefForm({ ...refForm, title: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Artist" value={refForm.artist} onChange={(e) => setRefForm({ ...refForm, artist: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
              <input placeholder="Genre" value={refForm.genre} onChange={(e) => setRefForm({ ...refForm, genre: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Album" value={refForm.album} onChange={(e) => setRefForm({ ...refForm, album: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
              <input placeholder="Duration (sec)" type="number" value={refForm.duration_seconds} onChange={(e) => setRefForm({ ...refForm, duration_seconds: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
              <input placeholder="Release Year" type="number" value={refForm.release_year} onChange={(e) => setRefForm({ ...refForm, release_year: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => createRefMutation.mutate(refForm)} disabled={!refForm.title || !refForm.artist} className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors">Create</button>
              <button type="button" onClick={() => setShowRefForm(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowRefForm(true)} className="mt-3 border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)] px-3 py-1.5 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.04)] transition-colors">
            + Add Reference Track
          </button>
        )}
      </section>

      {/* ============================================================ */}
      {/*  Section 3: Songs                                             */}
      {/* ============================================================ */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-[rgba(255,255,255,0.87)]">Songs</h2>
          <span className="text-[rgba(255,255,255,0.3)] text-xs">{songs.length} track{songs.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl mb-3 overflow-hidden">
          {songsLoading && <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-sm">Loading...</p>}
          {!songsLoading && songs.map((song, i) => (
            <div key={song.id} className={`flex items-center justify-between px-4 py-3 text-sm ${i < songs.length - 1 ? 'border-b border-[rgba(255,255,255,0.04)]' : ''}`}>
              <div className="flex items-center gap-3 min-w-0">
                <StatusBadge status={song.status || 'generated'} />
                <span className="text-[rgba(255,255,255,0.87)] truncate">{song.title || 'Untitled'}</span>
                {song.duration_seconds && <span className="text-[rgba(255,255,255,0.3)] text-xs shrink-0">{formatDuration(song.duration_seconds)}</span>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/songs/${song.id}`)}
                  className="text-[#4a90a4] hover:text-[#5ba3b8] text-xs transition-colors"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => { if (window.confirm(`Delete "${song.title || 'this song'}"?`)) deleteSongMutation.mutate(song.id); }}
                  className="text-[#e74c3c] hover:text-[#c0392b] text-xs transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!songsLoading && songs.length === 0 && (
            <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-sm">No songs yet</p>
          )}
        </div>

        {showSongForm ? (
          <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-4">
            <h3 className="font-medium text-sm text-[rgba(255,255,255,0.87)]">Add Song</h3>

            {/* Audio Upload */}
            <div>
              <span className="text-[rgba(255,255,255,0.4)] text-xs block mb-2">Audio File</span>
              {songForm.audio_file_url ? (
                <div className="space-y-2">
                  <audio controls src={songForm.audio_file_url} className="w-full" />
                  <button type="button" onClick={() => setSongForm({ ...songForm, audio_file_url: '', duration_seconds: '' })} className="text-[rgba(255,255,255,0.3)] text-xs hover:text-[rgba(255,255,255,0.5)] transition-colors">Remove</button>
                </div>
              ) : (
                <FileUpload
                  onUploaded={(url) => {
                    setUploadError('');
                    setSongForm((prev) => ({ ...prev, audio_file_url: url }));
                  }}
                />
              )}
              {uploadError && <p className="text-[#e74c3c] text-xs mt-1">{uploadError}</p>}
            </div>

            {/* Title */}
            <input
              placeholder="Title (optional)"
              value={songForm.title}
              onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
              className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)]"
            />

            {/* Duration (auto-filled from upload) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Duration (sec)</span>
                <input
                  type="number"
                  placeholder="Duration"
                  value={songForm.duration_seconds}
                  onChange={(e) => setSongForm({ ...songForm, duration_seconds: e.target.value })}
                  className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)]"
                />
              </div>
              <div>
                <span className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Generation System</span>
                <select
                  value={songForm.generation_system_id}
                  onChange={(e) => setSongForm({ ...songForm, generation_system_id: e.target.value })}
                  className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[#12121a] text-[rgba(255,255,255,0.87)]"
                >
                  <option value="">— Select —</option>
                  {genSystems.map((gs) => (
                    <option key={gs.id} value={gs.id}>{gs.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prompt Text */}
            <div>
              <span className="text-[rgba(255,255,255,0.4)] text-xs block mb-1">Prompt Text</span>
              <textarea
                placeholder="The prompt used to generate this song..."
                value={songForm.prompt_text}
                onChange={(e) => setSongForm({ ...songForm, prompt_text: e.target.value })}
                rows={4}
                className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)] resize-none"
              />
            </div>

            {/* Flow Factor Values */}
            {flowFactorConfigs.length > 0 && (
              <div>
                <span className="text-[rgba(255,255,255,0.4)] text-xs block mb-2">Flow Factor Values</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {flowFactorConfigs.map((ff) => (
                    <div key={ff.name} className="flex items-center gap-2">
                      <span className="text-[rgba(255,255,255,0.4)] text-xs w-32 shrink-0">{ff.display_name || ff.name}</span>
                      <input
                        type="text"
                        value={flowFactorValues[ff.name] || ''}
                        onChange={(e) => setFlowFactorValues((prev) => ({ ...prev, [ff.name]: e.target.value }))}
                        className="flex-1 border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)]"
                        placeholder={ff.value_type === 'numeric' ? '0–10' : '...'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSongSubmit}
                disabled={createSongMutation.isPending || !songForm.audio_file_url}
                className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors"
              >
                {createSongMutation.isPending ? 'Saving...' : 'Add Song'}
              </button>
              <button
                type="button"
                onClick={() => { setShowSongForm(false); setUploadError(''); setFlowFactorValues({}); setSongForm({ title: '', audio_file_url: '', duration_seconds: '', generation_system_id: '', prompt_text: '', created_by: 'admin' }); }}
                className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowSongForm(true)} className="bg-[#4a90a4] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">
            + Add Song
          </button>
        )}
      </section>

      {/* ============================================================ */}
      {/*  Delete Audience                                              */}
      {/* ============================================================ */}
      <div className="mt-12 border-t border-[rgba(255,255,255,0.06)] pt-6">
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          disabled={deleteIcpMutation.isPending || undoCountdown > 0}
          className="text-[#e74c3c] hover:text-[#c0392b] text-sm font-medium transition-colors disabled:opacity-40"
        >
          Delete Audience
        </button>
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#12121a] border border-[rgba(231,76,60,0.3)] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-base font-medium text-[rgba(255,255,255,0.87)]">Delete Audience</h2>
            </div>
            <p className="text-sm text-[rgba(255,255,255,0.6)] mb-2">
              You're about to permanently delete <span className="text-[rgba(255,255,255,0.87)] font-medium">"{icp.name}"</span>.
            </p>
            {songs.length > 0 && (
              <div className="bg-[rgba(231,76,60,0.1)] border border-[rgba(231,76,60,0.2)] rounded-lg px-3 py-2 mb-4 text-sm text-[#e74c3c]">
                This will also delete <strong>{songs.length} song{songs.length !== 1 ? 's' : ''}</strong> attached to this audience.
              </div>
            )}
            <p className="text-xs text-[rgba(255,255,255,0.3)] mb-5">
              You'll have 5 seconds to undo after confirming.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startDeleteWithUndo}
                className="flex-1 bg-[#e74c3c] hover:bg-[#c0392b] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Yes, delete everything
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Undo toast ── */}
      {undoCountdown > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#1e1e2e] border border-[rgba(231,76,60,0.4)] rounded-xl px-5 py-3 shadow-2xl">
          <span className="text-sm text-[rgba(255,255,255,0.7)]">
            Deleting "{icp.name}" in <span className="text-[#e74c3c] font-medium tabular-nums">{undoCountdown}s</span>…
          </span>
          <button
            type="button"
            onClick={cancelDelete}
            className="bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.87)] text-sm font-medium px-3 py-1 rounded-lg transition-colors"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
