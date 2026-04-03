import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, uploadFile } from '../lib/api.js';
import { humanize, formatDuration } from '../lib/utils.js';
import Breadcrumb from '../components/Breadcrumb.js';
import OutcomeScores from '../components/OutcomeScores.js';

const reasonLabels: Record<string, string> = {
  off_brand: 'Not our vibe',
  customer_complaint: "Customers don't like it",
  too_loud: 'Too loud / intense',
  too_slow: 'Too slow / boring',
  inappropriate: 'Inappropriate',
};

function Triangle({ open, className = '' }: { open: boolean; className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${open ? 'rotate-90' : ''} ${className}`}>
      <path d="M3 1l5 4-5 4z" fill="currentColor" />
    </svg>
  );
}

function FeedbackSection({ songId }: { songId: string }) {
  const { data } = useQuery({
    queryKey: ['song-feedback', songId],
    queryFn: () => api<{ data: any[] }>(`/api/songs/${songId}/feedback`),
  });
  const feedback = data?.data || [];
  const loves = feedback.filter((f: any) => f.type === 'love');
  const reports = feedback.filter((f: any) => f.type === 'report');

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 text-center">
          <div className="text-2xl font-light text-[#70d4b3]">{loves.length}</div>
          <div className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Loves</div>
        </div>
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 text-center">
          <div className="text-2xl font-light text-[#f3aa8c]">{reports.length}</div>
          <div className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Reports</div>
        </div>
      </div>
      {reports.length > 0 && (
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl">
          <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.09)] text-xs text-[rgba(255,255,255,0.4)] font-medium">Report Details</div>
          {reports.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0 text-sm">
              <div>
                <span className="text-[#f3aa8c]">{reasonLabels[r.reason] || r.reason}</span>
                <span className="text-[rgba(255,255,255,0.3)] ml-2">from {r.store?.name || 'Unknown store'}</span>
              </div>
              <span className="text-[rgba(255,255,255,0.25)] text-xs">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[rgba(39,174,96,0.15)] text-[#33be6a]',
    generated: 'bg-[rgba(94,162,182,0.15)] text-[#5ea2b6]',
    draft: 'bg-[rgba(230,126,34,0.15)] text-[#e98f38]',
    flagged: 'bg-[rgba(231,76,60,0.15)] text-[#ea6152]',
    inactive: 'bg-[rgba(231,76,60,0.15)] text-[#ea6152]',
    removed: 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]',
    archived: 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]'}`}>{humanize(status)}</span>;
}

function isNumericValue(v: unknown): boolean {
  if (typeof v === 'number') return true;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    return trimmed !== '' && !isNaN(Number(trimmed));
  }
  return false;
}

function FlowFactorsSection({ flowFactors, editingFlow, flowForm, setEditingFlow, setFlowForm, onSave }: {
  flowFactors: Record<string, unknown>;
  editingFlow: boolean;
  flowForm: Record<string, string>;
  setEditingFlow: (v: boolean) => void;
  setFlowForm: (v: Record<string, string>) => void;
  onSave: () => void;
}) {
  const entries = Object.entries(editingFlow ? flowForm : flowFactors);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">Flow Factors</h2>
        {!editingFlow ? (
          <button type="button" onClick={() => { setEditingFlow(true); setFlowForm(Object.fromEntries(Object.entries(flowFactors).map(([k, v]) => [k, String(v)]))); }} className="text-[#5ea2b6] text-[10px] font-bold uppercase tracking-widest hover:text-[#70b4c8]">Edit</button>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={onSave} className="bg-[#5ea2b6] text-white px-3 py-1 rounded-lg text-xs">Save</button>
            <button type="button" onClick={() => setEditingFlow(false)} className="text-[rgba(255,255,255,0.4)] text-xs">Cancel</button>
          </div>
        )}
      </div>
      <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl divide-y divide-[rgba(255,255,255,0.04)] max-h-[500px] overflow-y-auto">
        {entries.map(([k, v]) => {
          const numeric = isNumericValue(v);
          const numVal = numeric ? Number(v) : 0;
          return (
            <div key={k} className="flex items-center gap-3 px-4 py-2 text-xs">
              <span className="text-[rgba(255,255,255,0.4)] w-36 shrink-0 truncate">{k}</span>
              {editingFlow ? (
                numeric ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.1}
                      value={Number(flowForm[k]) || 0}
                      onChange={(e) => setFlowForm({ ...flowForm, [k]: e.target.value })}
                      className="flex-1 h-1.5 appearance-none rounded-full bg-[rgba(255,255,255,0.08)] accent-[#5ea2b6] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5ea2b6]"
                    />
                    <span className="font-mono w-10 text-right text-[rgba(255,255,255,0.5)]">{Number(flowForm[k] || 0).toFixed(1)}</span>
                  </div>
                ) : (
                  <input
                    value={flowForm[k] || ''}
                    onChange={(e) => setFlowForm({ ...flowForm, [k]: e.target.value })}
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs flex-1"
                  />
                )
              ) : (
                numeric ? (
                  <>
                    <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[rgba(255,255,255,0.2)]" style={{ width: `${Math.min(100, numVal)}%` }} />
                    </div>
                    <span className="font-mono w-10 text-right text-[rgba(255,255,255,0.5)]">{numVal % 1 === 0 ? numVal : numVal.toFixed(1)}</span>
                  </>
                ) : (
                  <span className="text-[rgba(255,255,255,0.8)] font-medium flex-1 text-right">{String(v)}</span>
                )
              )}
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)]">No flow factors set</p>
        )}
      </div>
    </div>
  );
}

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusVal, setStatusVal] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptForm, setPromptForm] = useState({ style: '', style_negations: '', voice: '', lyrics: '' });
  const [editingFlow, setEditingFlow] = useState(false);
  const [flowForm, setFlowForm] = useState<Record<string, string>>({});

  // Collapsible state
  const [showPrompt, setShowPrompt] = useState(false);
  const [showCreative, setShowCreative] = useState(true);
  const [showNegative, setShowNegative] = useState(true);
  const [showVoice, setShowVoice] = useState(true);
  const [showLyrics, setShowLyrics] = useState(true);

  const { data: songData, isLoading } = useQuery({
    queryKey: ['song', id],
    queryFn: () => api<{ data: any }>(`/api/songs/${id}`),
  });

  const { data: storesData } = useQuery({
    queryKey: ['stores-for-assign'],
    queryFn: () => api<{ data: any[] }>('/api/stores'),
    enabled: showAssign,
  });

  const { data: gsData } = useQuery({
    queryKey: ['generation-systems'],
    queryFn: () => api<{ data: any[] }>('/api/generation-systems'),
  });

  const gsNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    (gsData?.data || []).forEach((gs: any) => { m[gs.id] = gs.name; });
    return m;
  }, [gsData]);

  const updateMutation = useMutation({
    mutationFn: (body: any) => api(`/api/songs/${id}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['song', id] }); setEditingTitle(false); setEditingStatus(false); },
  });

  const assignMutation = useMutation({
    mutationFn: (storeId: string) => api(`/api/stores/${storeId}/playlist`, { method: 'POST', body: { song_id: id, added_by: 'admin' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['song', id] }); setShowAssign(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/api/songs/${id}`, { method: 'DELETE' }),
    onSuccess: () => navigate('/songs'),
  });

  const unassignMutation = useMutation({
    mutationFn: (storeId: string) => api(`/api/stores/${storeId}/playlist/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['song', id] }),
  });

  const handleUploadMp3 = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadFile(file);
      const audio = new Audio(result.url);
      const duration = await new Promise<number>((resolve) => {
        audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
        audio.addEventListener('error', () => resolve(0));
      });
      await updateMutation.mutateAsync({ audio_file_url: result.url, duration_seconds: Math.round(duration) });
    } catch { /* handled by mutation */ }
    setUploading(false);
  }, [updateMutation]);

  if (isLoading) return <p className="text-[rgba(255,255,255,0.3)]">Loading...</p>;
  const song = songData?.data;
  if (!song) return <p className="text-[#ea6152]">Song not found</p>;

  const lineage = song.lineage || {};
  const flowFactors = song.flow_factor_values || {};
  const promptParams = song.prompt_parameters || {};
  const assignments = song.store_playlists || [];
  const stores = storesData?.data || [];
  const hasMp3 = !!song.audio_file_url;

  const filteredStores = storeSearch
    ? stores.filter((s: any) => (s.name || '').toLowerCase().includes(storeSearch.toLowerCase()))
    : stores;

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Songs', href: '/songs' },
        { label: song.title || 'Untitled' },
      ]} />

      {/* Lineage */}
      {(lineage.client || lineage.store || lineage.store_icp) && (
        <div className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.55)] mb-3">
          {lineage.client && <span>{lineage.client.name}</span>}
          {lineage.store && <><span className="text-[rgba(255,255,255,0.15)]">/</span><span>{lineage.store.name}</span></>}
          {lineage.store_icp && <><span className="text-[rgba(255,255,255,0.15)]">/</span><span className="text-[#5ea2b6]">{lineage.store_icp.name}</span></>}
        </div>
      )}

      {/* Title + Status + Metadata */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input value={titleVal} onChange={(e) => setTitleVal(e.target.value)} className="text-lg font-medium border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1 text-[rgba(255,255,255,0.87)]" autoFocus />
              <button type="button" onClick={() => updateMutation.mutate({ title: titleVal })} className="bg-[#5ea2b6] text-white px-3 py-1 rounded-lg text-xs hover:bg-[#70b4c8]">Save</button>
              <button type="button" onClick={() => setEditingTitle(false)} className="text-[rgba(255,255,255,0.4)] text-xs">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium text-[rgba(255,255,255,0.87)]">{song.title || 'Untitled'}</span>
              <button
                type="button"
                onClick={() => { setTitleVal(song.title || ''); setEditingTitle(true); }}
                className="text-[rgba(255,255,255,0.25)] hover:text-[#5ea2b6] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            </div>
          )}

          <span className="text-[rgba(255,255,255,0.1)]">|</span>

          {editingStatus ? (
            <div className="flex items-center gap-2">
              <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1 text-xs">
                <option value="draft">Draft</option>
                <option value="generated">Generated</option>
                <option value="active">Active</option>
                <option value="flagged">Flagged</option>
                <option value="removed">Removed</option>
              </select>
              <button type="button" onClick={() => updateMutation.mutate({ status: statusVal })} className="bg-[#5ea2b6] text-white px-3 py-1 rounded-lg text-xs">Save</button>
              <button type="button" onClick={() => setEditingStatus(false)} className="text-[rgba(255,255,255,0.4)] text-xs">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <StatusBadge status={song.status || 'active'} />
              <button type="button" onClick={() => { setStatusVal(song.status || 'active'); setEditingStatus(true); }} className="text-[#5ea2b6] hover:text-[#70b4c8] text-[10px]">change</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-[rgba(255,255,255,0.4)]">
          {song.duration_seconds > 0 && <span>{formatDuration(Math.round(song.duration_seconds))}</span>}
          {song.generation_system_id && <span>{gsNameMap[song.generation_system_id] || 'System'}</span>}
          <span>{song.created_at ? new Date(song.created_at).toLocaleDateString() : ''}</span>
        </div>
      </div>

      {/* Two-column layout: 1/3 player | 2/3 content */}
      <div className="grid grid-cols-[1fr_2fr] gap-6">
        {/* Left: Audio Player */}
        <div>
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 sticky top-0">
            {hasMp3 ? (
              <audio controls src={song.audio_file_url} className="w-full" />
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[rgba(255,255,255,0.08)] rounded-xl p-6 cursor-pointer hover:border-[#5ea2b6]/40 hover:bg-[rgba(94,162,182,0.03)] transition-all">
                <svg className="w-6 h-6 text-[#5ea2b6] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12"/></svg>
                <span className="text-sm text-[rgba(255,255,255,0.4)]">{uploading ? 'Uploading...' : 'No audio — click to upload'}</span>
                <span className="text-[10px] text-[rgba(255,255,255,0.2)] mt-1">MP3, WAV, FLAC</span>
                <input type="file" accept=".mp3,.wav,.flac" className="hidden" disabled={uploading} onChange={(e) => { if (e.target.files?.[0]) handleUploadMp3(e.target.files[0]); }} />
              </label>
            )}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* 1. Store Assignments */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">Store Assignments</h2>
              <button type="button" onClick={() => setShowAssign(true)} className="bg-[#5ea2b6] text-white px-3 py-1.5 rounded-lg text-xs hover:bg-[#70b4c8] transition-colors">+ Assign to Store</button>
            </div>

            {showAssign && (
              <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 mb-3">
                <input
                  type="text"
                  placeholder="Search stores..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm mb-2"
                />
                <div className="max-h-48 overflow-auto space-y-1">
                  {filteredStores.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg text-sm transition-colors">
                      <span className="text-[rgba(255,255,255,0.87)]">{s.name}</span>
                      <button type="button" onClick={() => assignMutation.mutate(s.id)} className="text-[#5ea2b6] hover:text-[#70b4c8] text-xs">Assign</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => { setShowAssign(false); setStoreSearch(''); }} className="mt-2 text-[rgba(255,255,255,0.4)] text-xs">Close</button>
              </div>
            )}

            <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl">
              {assignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 text-sm">
                  <div>
                    <span className="text-[rgba(255,255,255,0.87)]">{a.store?.name || 'Store'}</span>
                    {a.added_by && <span className="text-[rgba(255,255,255,0.3)] ml-2">by {a.added_by}</span>}
                  </div>
                  <button type="button" onClick={() => unassignMutation.mutate(a.store_id)} className="text-[#ea6152] hover:text-[#f07060] text-xs">Remove</button>
                </div>
              ))}
              {assignments.length === 0 && <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-sm">Not assigned to any stores</p>}
            </div>
          </div>

          {/* 2. Feedback */}
          <FeedbackSection songId={id!} />

          {/* 3. Flow Factors + Outcome Strength side by side */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {(Object.keys(flowFactors).length > 0 || editingFlow) && (
              <FlowFactorsSection
                flowFactors={flowFactors}
                editingFlow={editingFlow}
                flowForm={flowForm}
                setEditingFlow={setEditingFlow}
                setFlowForm={setFlowForm}
                onSave={() => { updateMutation.mutate({ flow_factor_values: flowForm }); setEditingFlow(false); }}
              />
            )}
            <OutcomeScores songId={id!} />
          </div>

          {/* 4. Suno Prompt — collapsible */}
          {(song.prompt_text || promptParams.style || promptParams.style_negations || promptParams.voice || editingPrompt) && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setShowPrompt(!showPrompt)} className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">Suno Prompt</h2>
                  <Triangle open={showPrompt} className="text-[rgba(255,255,255,0.25)]" />
                </button>
                {showPrompt && (
                  !editingPrompt ? (
                    <button type="button" onClick={() => { setEditingPrompt(true); setPromptForm({ style: promptParams.style || '', style_negations: promptParams.style_negations || '', voice: promptParams.voice || '', lyrics: song.prompt_text || '' }); }} className="text-[#5ea2b6] text-[10px] font-bold uppercase tracking-widest hover:text-[#70b4c8]">Edit</button>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { updateMutation.mutate({ prompt_text: promptForm.lyrics, prompt_parameters: { style: promptForm.style, style_negations: promptForm.style_negations, voice: promptForm.voice } }); setEditingPrompt(false); }} className="bg-[#5ea2b6] text-white px-3 py-1 rounded-lg text-xs">Save</button>
                      <button type="button" onClick={() => setEditingPrompt(false)} className="text-[rgba(255,255,255,0.4)] text-xs">Cancel</button>
                    </div>
                  )
                )}
              </div>

              {showPrompt && (
                <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl divide-y divide-[rgba(255,255,255,0.04)]">
                  {/* Creative */}
                  <div className="px-4 py-3">
                    <button type="button" onClick={() => setShowCreative(!showCreative)} className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#5ea2b6]">Creative</span>
                      <Triangle open={showCreative} className="text-[rgba(255,255,255,0.2)]" />
                    </button>
                    {showCreative && (
                      <div className="mt-2">
                        {editingPrompt ? (
                          <textarea value={promptForm.style} onChange={(e) => setPromptForm({ ...promptForm, style: e.target.value })} rows={3} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm resize-none" />
                        ) : (
                          <p className="text-sm text-[rgba(255,255,255,0.8)]">{promptParams.style || <span className="text-[rgba(255,255,255,0.2)] italic">Not set</span>}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Negative */}
                  <div className="px-4 py-3">
                    <button type="button" onClick={() => setShowNegative(!showNegative)} className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#f3aa8c]">Negative</span>
                      <Triangle open={showNegative} className="text-[rgba(255,255,255,0.2)]" />
                    </button>
                    {showNegative && (
                      <div className="mt-2">
                        {editingPrompt ? (
                          <textarea value={promptForm.style_negations} onChange={(e) => setPromptForm({ ...promptForm, style_negations: e.target.value })} rows={2} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm resize-none" />
                        ) : (
                          <p className="text-sm text-[rgba(255,255,255,0.8)]">{promptParams.style_negations || <span className="text-[rgba(255,255,255,0.2)] italic">Not set</span>}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vocal Gender */}
                  <div className="px-4 py-3">
                    <button type="button" onClick={() => setShowVoice(!showVoice)} className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.55)]">Vocal Gender</span>
                      <Triangle open={showVoice} className="text-[rgba(255,255,255,0.2)]" />
                    </button>
                    {showVoice && (
                      <div className="mt-2">
                        {editingPrompt ? (
                          <select value={promptForm.voice} onChange={(e) => setPromptForm({ ...promptForm, voice: e.target.value })} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm">
                            <option value="">Not set</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        ) : (
                          <p className="text-sm text-[rgba(255,255,255,0.8)] capitalize">{promptParams.voice || <span className="text-[rgba(255,255,255,0.2)] italic">Not set</span>}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lyrics */}
                  <div className="px-4 py-3">
                    <button type="button" onClick={() => setShowLyrics(!showLyrics)} className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.55)]">Lyrics</span>
                      <Triangle open={showLyrics} className="text-[rgba(255,255,255,0.2)]" />
                    </button>
                    {showLyrics && (
                      <div className="mt-2">
                        {editingPrompt ? (
                          <textarea value={promptForm.lyrics} onChange={(e) => setPromptForm({ ...promptForm, lyrics: e.target.value })} rows={10} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm resize-none font-mono leading-relaxed" />
                        ) : (
                          <pre className="text-sm whitespace-pre-wrap text-[rgba(255,255,255,0.7)] font-sans leading-relaxed max-h-60 overflow-y-auto">{song.prompt_text || <span className="text-[rgba(255,255,255,0.2)] italic">No lyrics</span>}</pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Delete */}
          <div className="border-t border-[rgba(255,255,255,0.09)] pt-6">
            <button
              type="button"
              onClick={() => { if (window.confirm('Delete this song?')) deleteMutation.mutate(); }}
              className="text-[#ea6152] hover:text-[#f07060] text-sm font-medium transition-colors"
            >
              Delete Song
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
