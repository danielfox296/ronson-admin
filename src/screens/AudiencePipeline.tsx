import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, uploadFile } from '../lib/api.js';
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

  // Expanded state for reference tracks
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  // Forms
  const [showRefForm, setShowRefForm] = useState(false);
  const [refForm, setRefForm] = useState({ title: '', artist: '', genre: '', album: '', duration_seconds: '', release_year: '' });
  const [addPromptForTemplate, setAddPromptForTemplate] = useState<string | null>(null);
  const [promptForm, setPromptForm] = useState({ generation_system_id: '', prompt_text: '', created_by: 'admin' });
  const [registerSongForPrompt, setRegisterSongForPrompt] = useState<string | null>(null);
  const [songForm, setSongForm] = useState({ title: '', audio_file_url: '', duration_seconds: '', generation_system_id: '' });

  /* ---- Queries ---- */

  const { data: icpData, isLoading } = useQuery({
    queryKey: ['icp', icpId],
    queryFn: () => api<{ data: any }>(`/api/store-icps/${icpId}`),
  });

  const { data: refTracksData } = useQuery({
    queryKey: ['icp-ref-tracks', icpId],
    queryFn: () => api<{ data: any[] }>(`/api/store-icps/${icpId}/reference-tracks`),
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
  const flowFactorConfigs: any[] = flowFactorConfigsData?.data || [];
  const genSystems: any[] = genSystemsData?.data || [];

  const ffDisplayMap = useMemo(() => {
    const m: Record<string, string> = {};
    flowFactorConfigs.forEach((ff) => { m[ff.name] = ff.display_name || ff.name; });
    return m;
  }, [flowFactorConfigs]);

  const gsNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    genSystems.forEach((gs) => { m[gs.id] = gs.name; });
    return m;
  }, [genSystems]);

  const firstActiveSystemId = useMemo(() => {
    const active = genSystems.find((gs) => gs.is_active);
    return active?.id || '';
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

  const createTemplateMutation = useMutation({
    mutationFn: ({ refTrackId, title }: { refTrackId: string; title: string }) =>
      api(`/api/reference-tracks/${refTrackId}/template`, {
        method: 'POST',
        body: { name: `Template for ${title}`, flow_factor_values: {}, created_by: 'admin' },
      }),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['ref-track-template', variables.refTrackId] }),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api(`/api/templates/${id}`, { method: 'PUT', body }),
    onSuccess: () => {
      refTracks.forEach((rt) => queryClient.invalidateQueries({ queryKey: ['ref-track-template', rt.id] }));
    },
  });

  const createPromptMutation = useMutation({
    mutationFn: ({ templateId, body }: { templateId: string; body: any }) =>
      api(`/api/templates/${templateId}/prompts`, { method: 'POST', body }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['template-prompts', variables.templateId] });
      setAddPromptForTemplate(null);
      setPromptForm({ generation_system_id: '', prompt_text: '', created_by: 'admin' });
    },
  });

  const registerSongMutation = useMutation({
    mutationFn: ({ promptId, body }: { promptId: string; body: any }) =>
      api(`/api/songs/from-prompt/${promptId}`, { method: 'POST', body }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prompt-songs', variables.promptId] });
      setRegisterSongForPrompt(null);
      setSongForm({ title: '', audio_file_url: '', duration_seconds: '', generation_system_id: '' });
    },
  });

  /* ---- Toggle helpers ---- */

  const toggleTrack = (id: string) => {
    setExpandedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const togglePrompt = (id: string) => {
    setExpandedPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
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
        <div className="mb-4">
          <InlineEdit
            value={icp.name}
            onSave={(v) => updateIcpMutation.mutate({ name: v })}
            className="text-base font-light text-[rgba(255,255,255,0.6)]"
          />
        </div>

        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-sm space-y-3">
          <div>
            <span className="text-[rgba(255,255,255,0.4)] block mb-1">Psychographic Summary</span>
            <InlineEdit
              value={icp.psychographic_summary || ''}
              onSave={(v) => updateIcpMutation.mutate({ psychographic_summary: v })}
              as="textarea"
              className="text-[rgba(255,255,255,0.87)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[rgba(255,255,255,0.4)]">Age Range:</span>{' '}
              <InlineEdit value={icp.age_range || ''} onSave={(v) => updateIcpMutation.mutate({ age_range: v })} className="text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <span className="text-[rgba(255,255,255,0.4)]">Gender:</span>{' '}
              <InlineEdit value={icp.gender || ''} onSave={(v) => updateIcpMutation.mutate({ gender: v })} className="text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <span className="text-[rgba(255,255,255,0.4)]">Income Bracket:</span>{' '}
              <InlineEdit value={icp.income_bracket || ''} onSave={(v) => updateIcpMutation.mutate({ income_bracket: v })} className="text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <span className="text-[rgba(255,255,255,0.4)]">Location Type:</span>{' '}
              <InlineEdit value={icp.location_type || ''} onSave={(v) => updateIcpMutation.mutate({ location_type: v })} className="text-[rgba(255,255,255,0.87)]" />
            </div>
          </div>

          {icp.lifestyle_tags && (
            <div>
              <span className="text-[rgba(255,255,255,0.4)]">Lifestyle:</span>{' '}
              <span className="text-[rgba(255,255,255,0.87)]">{Array.isArray(icp.lifestyle_tags) ? icp.lifestyle_tags.join(', ') : icp.lifestyle_tags}</span>
            </div>
          )}
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
            <RefTrackCard
              key={rt.id}
              rt={rt}
              expanded={expandedTracks.has(rt.id)}
              onToggle={() => toggleTrack(rt.id)}
              ffDisplayMap={ffDisplayMap}
              gsNameMap={gsNameMap}
              genSystems={genSystems}
              firstActiveSystemId={firstActiveSystemId}
              expandedPrompts={expandedPrompts}
              onTogglePrompt={togglePrompt}
              onUpdateRef={(body) => updateRefMutation.mutate({ id: rt.id, body })}
              onDeleteRef={() => {
                if (window.confirm(`Delete "${rt.title}"?`)) deleteRefMutation.mutate(rt.id);
              }}
              onCreateTemplate={() => createTemplateMutation.mutate({ refTrackId: rt.id, title: rt.title })}
              onUpdateTemplate={(id, body) => updateTemplateMutation.mutate({ id, body })}
              addPromptForTemplate={addPromptForTemplate}
              setAddPromptForTemplate={setAddPromptForTemplate}
              promptForm={promptForm}
              setPromptForm={setPromptForm}
              onCreatePrompt={(templateId) => createPromptMutation.mutate({ templateId, body: promptForm })}
              registerSongForPrompt={registerSongForPrompt}
              setRegisterSongForPrompt={setRegisterSongForPrompt}
              songForm={songForm}
              setSongForm={setSongForm}
              onRegisterSong={(promptId) =>
                registerSongMutation.mutate({
                  promptId,
                  body: {
                    title: songForm.title,
                    audio_file_url: songForm.audio_file_url,
                    duration_seconds: songForm.duration_seconds ? Number(songForm.duration_seconds) : undefined,
                    generation_system_id: songForm.generation_system_id || undefined,
                  },
                })
              }
              navigate={navigate}
              createTemplatePending={createTemplateMutation.isPending}
            />
          ))}
          {refTracks.length === 0 && (
            <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-sm">
              No reference tracks yet
            </div>
          )}
        </div>

        {/* Add Reference Track */}
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
              <button type="button" onClick={() => createRefMutation.mutate(refForm)} disabled={!refForm.title} className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors">Create</button>
              <button type="button" onClick={() => setShowRefForm(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowRefForm(true)} className="mt-3 bg-[#4a90a4] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">
            + Add Reference Track
          </button>
        )}
      </section>

      {/* ============================================================ */}
      {/*  Delete Audience                                              */}
      {/* ============================================================ */}
      <div className="mt-12 border-t border-[rgba(255,255,255,0.06)] pt-6">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete "${icp.name}"?`)) {
              deleteIcpMutation.mutate();
            }
          }}
          disabled={deleteIcpMutation.isPending}
          className="text-[#e74c3c] hover:text-[#c0392b] text-sm font-medium transition-colors"
        >
          {deleteIcpMutation.isPending ? 'Deleting...' : 'Delete Audience'}
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Reference Track Card                                               */
/* ================================================================== */

function RefTrackCard({
  rt,
  expanded,
  onToggle,
  ffDisplayMap,
  gsNameMap,
  genSystems,
  firstActiveSystemId,
  expandedPrompts,
  onTogglePrompt,
  onUpdateRef,
  onDeleteRef,
  onCreateTemplate,
  onUpdateTemplate,
  addPromptForTemplate,
  setAddPromptForTemplate,
  promptForm,
  setPromptForm,
  onCreatePrompt,
  registerSongForPrompt,
  setRegisterSongForPrompt,
  songForm,
  setSongForm,
  onRegisterSong,
  navigate,
  createTemplatePending,
}: {
  rt: any;
  expanded: boolean;
  onToggle: () => void;
  ffDisplayMap: Record<string, string>;
  gsNameMap: Record<string, string>;
  genSystems: any[];
  firstActiveSystemId: string;
  expandedPrompts: Set<string>;
  onTogglePrompt: (id: string) => void;
  onUpdateRef: (body: any) => void;
  onDeleteRef: () => void;
  onCreateTemplate: () => void;
  onUpdateTemplate: (id: string, body: any) => void;
  addPromptForTemplate: string | null;
  setAddPromptForTemplate: (v: string | null) => void;
  promptForm: any;
  setPromptForm: (v: any) => void;
  onCreatePrompt: (templateId: string) => void;
  registerSongForPrompt: string | null;
  setRegisterSongForPrompt: (v: string | null) => void;
  songForm: any;
  setSongForm: (v: any) => void;
  onRegisterSong: (promptId: string) => void;
  navigate: ReturnType<typeof useNavigate>;
  createTemplatePending: boolean;
}) {
  return (
    <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-[rgba(255,255,255,0.03)] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[rgba(255,255,255,0.3)]">{expanded ? '\u25BC' : '\u25B6'}</span>
          <span className="font-medium text-[rgba(255,255,255,0.87)]">{rt.title}</span>
          {rt.artist && <span className="text-[rgba(255,255,255,0.4)]">-- {rt.artist}</span>}
        </div>
        {rt.genre && <span className="text-[rgba(255,255,255,0.3)] text-xs">{rt.genre}</span>}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-4 space-y-5">
          {/* Track metadata */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-[rgba(255,255,255,0.4)]">Title:</span>{' '}
              <InlineEdit value={rt.title} onSave={(v) => onUpdateRef({ title: v })} className="text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <span className="text-[rgba(255,255,255,0.4)]">Artist:</span>{' '}
              <InlineEdit value={rt.artist || ''} onSave={(v) => onUpdateRef({ artist: v })} className="text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <span className="text-[rgba(255,255,255,0.4)]">Album:</span>{' '}
              <InlineEdit value={rt.album || ''} onSave={(v) => onUpdateRef({ album: v })} className="text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <span className="text-[rgba(255,255,255,0.4)]">Genre:</span>{' '}
              <InlineEdit value={rt.genre || ''} onSave={(v) => onUpdateRef({ genre: v })} className="text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <span className="text-[rgba(255,255,255,0.4)]">Duration:</span>{' '}
              <span className="text-[rgba(255,255,255,0.87)]">{rt.duration_seconds ? formatDuration(rt.duration_seconds) : '-'}</span>
            </div>
            <div>
              <span className="text-[rgba(255,255,255,0.4)]">Release Year:</span>{' '}
              <InlineEdit value={rt.release_year?.toString() || ''} onSave={(v) => onUpdateRef({ release_year: v ? Number(v) : null })} className="text-[rgba(255,255,255,0.87)]" />
            </div>
          </div>

          {/* Flow Factors */}
          <TemplateSection
            refTrackId={rt.id}
            ffDisplayMap={ffDisplayMap}
            onCreateTemplate={onCreateTemplate}
            onUpdateTemplate={onUpdateTemplate}
            createTemplatePending={createTemplatePending}
          />

          {/* Prompts */}
          <PromptsSection
            refTrackId={rt.id}
            gsNameMap={gsNameMap}
            genSystems={genSystems}
            firstActiveSystemId={firstActiveSystemId}
            expandedPrompts={expandedPrompts}
            onTogglePrompt={onTogglePrompt}
            addPromptForTemplate={addPromptForTemplate}
            setAddPromptForTemplate={setAddPromptForTemplate}
            promptForm={promptForm}
            setPromptForm={setPromptForm}
            onCreatePrompt={onCreatePrompt}
            registerSongForPrompt={registerSongForPrompt}
            setRegisterSongForPrompt={setRegisterSongForPrompt}
            songForm={songForm}
            setSongForm={setSongForm}
            onRegisterSong={onRegisterSong}
            navigate={navigate}
          />

          {/* Delete track */}
          <div className="border-t border-[rgba(255,255,255,0.04)] pt-3">
            <button type="button" onClick={onDeleteRef} className="text-[#e74c3c] hover:text-[#c0392b] text-xs transition-colors">
              Delete Reference Track
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Template (Flow Factors) sub-section                                */
/* ================================================================== */

function TemplateSection({
  refTrackId,
  ffDisplayMap,
  onCreateTemplate,
  onUpdateTemplate,
  createTemplatePending,
}: {
  refTrackId: string;
  ffDisplayMap: Record<string, string>;
  onCreateTemplate: () => void;
  onUpdateTemplate: (id: string, body: any) => void;
  createTemplatePending: boolean;
}) {
  const { data: templateData, isLoading, error } = useQuery({
    queryKey: ['ref-track-template', refTrackId],
    queryFn: () => api<{ data: any }>(`/api/reference-tracks/${refTrackId}/template`),
    retry: false,
  });

  const template = templateData?.data;
  const hasTemplate = !!template && !error;
  const factors = template?.flow_factor_values || {};

  if (isLoading) return <p className="text-[rgba(255,255,255,0.3)] text-xs">Loading template...</p>;

  if (!hasTemplate) {
    return (
      <div className="border border-[rgba(255,255,255,0.04)] rounded-lg p-4 text-center">
        <p className="text-[rgba(255,255,255,0.3)] text-xs mb-2">No template exists for this track</p>
        <button
          type="button"
          onClick={onCreateTemplate}
          disabled={createTemplatePending}
          className="bg-[#4a90a4] text-white px-3 py-1 rounded-lg text-xs hover:bg-[#5ba3b8] disabled:opacity-50 transition-colors"
        >
          {createTemplatePending ? 'Creating...' : 'Create Template'}
        </button>
      </div>
    );
  }

  const factorEntries = Object.entries(factors);

  return (
    <div>
      <h4 className="text-xs font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-wide mb-2">Flow Factors</h4>
      {factorEntries.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {factorEntries.map(([key, val]) => (
            <div key={key} className="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
              <span className="text-[rgba(255,255,255,0.4)]">{ffDisplayMap[key] || key}</span>
              <InlineEdit
                value={String(val)}
                onSave={(v) => onUpdateTemplate(template.id, { flow_factor_values: { ...factors, [key]: v } })}
                className="text-[rgba(255,255,255,0.87)]"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[rgba(255,255,255,0.3)] text-xs">No flow factor values set</p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Prompts sub-section                                                */
/* ================================================================== */

function PromptsSection({
  refTrackId,
  gsNameMap,
  genSystems,
  firstActiveSystemId,
  expandedPrompts,
  onTogglePrompt,
  addPromptForTemplate,
  setAddPromptForTemplate,
  promptForm,
  setPromptForm,
  onCreatePrompt,
  registerSongForPrompt,
  setRegisterSongForPrompt,
  songForm,
  setSongForm,
  onRegisterSong,
  navigate,
}: {
  refTrackId: string;
  gsNameMap: Record<string, string>;
  genSystems: any[];
  firstActiveSystemId: string;
  expandedPrompts: Set<string>;
  onTogglePrompt: (id: string) => void;
  addPromptForTemplate: string | null;
  setAddPromptForTemplate: (v: string | null) => void;
  promptForm: any;
  setPromptForm: (v: any) => void;
  onCreatePrompt: (templateId: string) => void;
  registerSongForPrompt: string | null;
  setRegisterSongForPrompt: (v: string | null) => void;
  songForm: any;
  setSongForm: (v: any) => void;
  onRegisterSong: (promptId: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { data: templateData } = useQuery({
    queryKey: ['ref-track-template', refTrackId],
    queryFn: () => api<{ data: any }>(`/api/reference-tracks/${refTrackId}/template`),
    retry: false,
  });

  const template = templateData?.data;
  if (!template) return null;

  return (
    <PromptsList
      templateId={template.id}
      gsNameMap={gsNameMap}
      genSystems={genSystems}
      firstActiveSystemId={firstActiveSystemId}
      expandedPrompts={expandedPrompts}
      onTogglePrompt={onTogglePrompt}
      addPromptForTemplate={addPromptForTemplate}
      setAddPromptForTemplate={setAddPromptForTemplate}
      promptForm={promptForm}
      setPromptForm={setPromptForm}
      onCreatePrompt={onCreatePrompt}
      registerSongForPrompt={registerSongForPrompt}
      setRegisterSongForPrompt={setRegisterSongForPrompt}
      songForm={songForm}
      setSongForm={setSongForm}
      onRegisterSong={onRegisterSong}
      navigate={navigate}
    />
  );
}

function PromptsList({
  templateId,
  gsNameMap,
  genSystems,
  firstActiveSystemId,
  expandedPrompts,
  onTogglePrompt,
  addPromptForTemplate,
  setAddPromptForTemplate,
  promptForm,
  setPromptForm,
  onCreatePrompt,
  registerSongForPrompt,
  setRegisterSongForPrompt,
  songForm,
  setSongForm,
  onRegisterSong,
  navigate,
}: {
  templateId: string;
  gsNameMap: Record<string, string>;
  genSystems: any[];
  firstActiveSystemId: string;
  expandedPrompts: Set<string>;
  onTogglePrompt: (id: string) => void;
  addPromptForTemplate: string | null;
  setAddPromptForTemplate: (v: string | null) => void;
  promptForm: any;
  setPromptForm: (v: any) => void;
  onCreatePrompt: (templateId: string) => void;
  registerSongForPrompt: string | null;
  setRegisterSongForPrompt: (v: string | null) => void;
  songForm: any;
  setSongForm: (v: any) => void;
  onRegisterSong: (promptId: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { data: promptsData } = useQuery({
    queryKey: ['template-prompts', templateId],
    queryFn: () => api<{ data: any[] }>(`/api/templates/${templateId}/prompts`),
  });

  const prompts: any[] = promptsData?.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-wide">Prompts</h4>
        <button
          type="button"
          onClick={() => {
            setPromptForm({ generation_system_id: firstActiveSystemId, prompt_text: '', created_by: 'admin' });
            setAddPromptForTemplate(templateId);
          }}
          className="text-[#4a90a4] hover:text-[#5ba3b8] text-xs transition-colors"
        >
          + Add Prompt
        </button>
      </div>

      {/* Add Prompt Form */}
      {addPromptForTemplate === templateId && (
        <div className="border border-[rgba(255,255,255,0.06)] rounded-lg p-3 mb-3 space-y-2">
          <select
            value={promptForm.generation_system_id}
            onChange={(e) => setPromptForm({ ...promptForm, generation_system_id: e.target.value })}
            className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]"
          >
            <option value="">Select generation system...</option>
            {genSystems.map((gs: any) => (
              <option key={gs.id} value={gs.id}>{gs.name}</option>
            ))}
          </select>
          <textarea
            placeholder="Prompt text..."
            value={promptForm.prompt_text}
            onChange={(e) => setPromptForm({ ...promptForm, prompt_text: e.target.value })}
            className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]"
            rows={4}
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => onCreatePrompt(templateId)} disabled={!promptForm.prompt_text} className="bg-[#4a90a4] text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors">Create</button>
            <button type="button" onClick={() => setAddPromptForTemplate(null)} className="border border-[rgba(255,255,255,0.1)] px-3 py-1.5 rounded-lg text-xs text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Prompt list */}
      <div className="space-y-1">
        {prompts.map((p: any) => (
          <PromptCard
            key={p.id}
            prompt={p}
            expanded={expandedPrompts.has(p.id)}
            onToggle={() => onTogglePrompt(p.id)}
            gsNameMap={gsNameMap}
            genSystems={genSystems}
            firstActiveSystemId={firstActiveSystemId}
            registerSongForPrompt={registerSongForPrompt}
            setRegisterSongForPrompt={setRegisterSongForPrompt}
            songForm={songForm}
            setSongForm={setSongForm}
            onRegisterSong={onRegisterSong}
            navigate={navigate}
          />
        ))}
        {prompts.length === 0 && (
          <p className="text-[rgba(255,255,255,0.3)] text-xs py-2">No prompts yet</p>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Prompt Card                                                        */
/* ================================================================== */

function PromptCard({
  prompt,
  expanded,
  onToggle,
  gsNameMap,
  genSystems,
  firstActiveSystemId,
  registerSongForPrompt,
  setRegisterSongForPrompt,
  songForm,
  setSongForm,
  onRegisterSong,
  navigate,
}: {
  prompt: any;
  expanded: boolean;
  onToggle: () => void;
  gsNameMap: Record<string, string>;
  genSystems: any[];
  firstActiveSystemId: string;
  registerSongForPrompt: string | null;
  setRegisterSongForPrompt: (v: string | null) => void;
  songForm: any;
  setSongForm: (v: any) => void;
  onRegisterSong: (promptId: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const truncated = prompt.prompt_text ? prompt.prompt_text.slice(0, 100) + (prompt.prompt_text.length > 100 ? '...' : '') : '';
  const systemName = gsNameMap[prompt.generation_system_id] || 'Unknown';

  return (
    <div className="border border-[rgba(255,255,255,0.04)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <span className="text-[rgba(255,255,255,0.6)]">{truncated || 'Empty prompt'}</span>
        </div>
        <div className="flex items-center gap-3 ml-3 shrink-0">
          <span className="text-[rgba(255,255,255,0.3)]">{systemName}</span>
          {prompt.created_at && (
            <span className="text-[rgba(255,255,255,0.2)]">{new Date(prompt.created_at).toLocaleDateString()}</span>
          )}
          <span className="text-[rgba(255,255,255,0.3)]">{expanded ? '\u25BC' : '\u25B6'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[rgba(255,255,255,0.04)] px-3 py-3 space-y-3">
          {/* Full prompt text */}
          <pre className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-lg p-3 text-xs text-[rgba(255,255,255,0.7)] whitespace-pre-wrap">
            {prompt.prompt_text}
          </pre>

          {/* Songs */}
          <SongsList
            promptId={prompt.id}
            promptSystemId={prompt.generation_system_id}
            gsNameMap={gsNameMap}
            genSystems={genSystems}
            firstActiveSystemId={firstActiveSystemId}
            registerSongForPrompt={registerSongForPrompt}
            setRegisterSongForPrompt={setRegisterSongForPrompt}
            songForm={songForm}
            setSongForm={setSongForm}
            onRegisterSong={onRegisterSong}
            navigate={navigate}
          />
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Songs list within a prompt                                         */
/* ================================================================== */

function SongsList({
  promptId,
  promptSystemId,
  gsNameMap,
  genSystems,
  firstActiveSystemId,
  registerSongForPrompt,
  setRegisterSongForPrompt,
  songForm,
  setSongForm,
  onRegisterSong,
  navigate,
}: {
  promptId: string;
  promptSystemId: string;
  gsNameMap: Record<string, string>;
  genSystems: any[];
  firstActiveSystemId: string;
  registerSongForPrompt: string | null;
  setRegisterSongForPrompt: (v: string | null) => void;
  songForm: any;
  setSongForm: (v: any) => void;
  onRegisterSong: (promptId: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { data: songsData } = useQuery({
    queryKey: ['prompt-songs', promptId],
    queryFn: () => api<{ data: any[] }>(`/api/songs/from-prompt/${promptId}`),
  });

  const songs: any[] = songsData?.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h5 className="text-xs font-medium text-[rgba(255,255,255,0.4)]">Generated Songs</h5>
        <button
          type="button"
          onClick={() => {
            setSongForm({ title: '', audio_file_url: '', duration_seconds: '', generation_system_id: promptSystemId || firstActiveSystemId });
            setRegisterSongForPrompt(promptId);
          }}
          className="text-[#4a90a4] hover:text-[#5ba3b8] text-xs transition-colors"
        >
          + Register Song
        </button>
      </div>

      {/* Register Song Form */}
      {registerSongForPrompt === promptId && (
        <div className="border border-[rgba(255,255,255,0.06)] rounded-lg p-3 mb-2 space-y-2">
          <input placeholder="Title" value={songForm.title} onChange={(e) => setSongForm({ ...songForm, title: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <FileUpload onUploaded={(url) => setSongForm({ ...songForm, audio_file_url: url })} />
          {songForm.audio_file_url && <p className="text-[#27ae60] text-xs">Audio file uploaded</p>}
          <input placeholder="Duration (seconds)" type="number" value={songForm.duration_seconds} onChange={(e) => setSongForm({ ...songForm, duration_seconds: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <select
            value={songForm.generation_system_id}
            onChange={(e) => setSongForm({ ...songForm, generation_system_id: e.target.value })}
            className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]"
          >
            <option value="">Select generation system...</option>
            {genSystems.map((gs: any) => (
              <option key={gs.id} value={gs.id}>{gs.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={() => onRegisterSong(promptId)} disabled={!songForm.title || !songForm.audio_file_url} className="bg-[#4a90a4] text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors">Register</button>
            <button type="button" onClick={() => setRegisterSongForPrompt(null)} className="border border-[rgba(255,255,255,0.1)] px-3 py-1.5 rounded-lg text-xs text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Song list */}
      {songs.map((s: any) => (
        <div
          key={s.id}
          className="flex items-center gap-3 px-2 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.02)] rounded transition-colors"
        >
          <span
            onClick={() => navigate(`/songs/${s.id}`)}
            className="font-medium text-[#4a90a4] hover:text-[#5ba3b8] cursor-pointer transition-colors"
          >
            {s.title}
          </span>
          <StatusBadge status={s.status || 'generated'} />
          <span className="text-[rgba(255,255,255,0.3)]">{s.duration_seconds ? formatDuration(s.duration_seconds) : '-'}</span>
          {s.audio_file_url && (
            <audio controls src={s.audio_file_url} className="h-6 max-w-[200px]" />
          )}
          {s.created_at && (
            <span className="text-[rgba(255,255,255,0.2)] ml-auto">{new Date(s.created_at).toLocaleDateString()}</span>
          )}
        </div>
      ))}
      {songs.length === 0 && (
        <p className="text-[rgba(255,255,255,0.2)] text-xs py-1">No songs yet</p>
      )}
    </div>
  );
}
