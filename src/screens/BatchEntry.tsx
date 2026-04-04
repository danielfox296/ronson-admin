import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { formatDuration } from '../lib/utils.js';

// ── Types ────────────────────────────────────────────────────────────

interface FactorConfig {
  id: string;
  name: string;          // factor_key
  display_name: string;
  category: string;
  phase: number;
  value_type: string;    // "slider" | "text"
  value_range_low: number | null;
  value_range_high: number | null;
  step: number | null;
  unit: string | null;
  value_options: string[] | null;
  description: string | null;
  sort_order: number;
}

interface QueueSong {
  id: string;
  title: string | null;
  file_url: string;
  duration_seconds: number;
  created_at: string;
  factor_count: number;
}

type FactorValues = Record<string, { numeric_value: number | null; string_value: string | null }>;

// Special sentinel — distinguishes "user hasn't touched this" from "user set it to X"
const UNSET = Symbol('UNSET');
type FormValue = number | string | typeof UNSET;
type FormState = Record<string, FormValue>;

// ── Phase metadata ───────────────────────────────────────────────────

const PHASE_META: Record<number, { label: string; description: string }> = {
  1: { label: 'PHASE 1', description: 'Primary Manipulation Variables' },
  2: { label: 'PHASE 2', description: 'Control Variables' },
  3: { label: 'PHASE 3', description: 'Proprietary Territory' },
  4: { label: 'PHASE 4', description: 'Speculative / Granular' },
};

// ── Main component ───────────────────────────────────────────────────

export default function BatchEntry() {
  const queryClient = useQueryClient();

  // Queue controls
  const [filter, setFilter] = useState<'untagged' | 'partial' | 'all'>('untagged');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title_asc' | 'title_desc'>('newest');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Phase accordion (Phase 1 expanded by default)
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1]));

  // Form state
  const [formState, setFormState] = useState<FormState>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Delete confirmation
  const [showDelete, setShowDelete] = useState(false);

  // Audio ref
  const audioRef = useRef<HTMLAudioElement>(null);

  // ── Queries ──────────────────────────────────────────────────────

  const { data: configData } = useQuery({
    queryKey: ['flow-factor-configs-v2'],
    queryFn: () => api<{ data: FactorConfig[] }>('/api/flow-factors/config'),
    staleTime: Infinity,
  });

  const { data: queueData, refetch: refetchQueue } = useQuery({
    queryKey: ['batch-queue', filter, sort],
    queryFn: () => api<{ data: QueueSong[]; total: number }>(`/api/songs/batch-queue?filter=${filter}&sort=${sort}`),
  });

  const configs = configData?.data ?? [];
  const queue = queueData?.data ?? [];
  const total = queueData?.total ?? 0;
  const currentSong = queue[currentIndex] as QueueSong | undefined;

  // Group configs by phase
  const configsByPhase = useMemo(() => {
    const map = new Map<number, FactorConfig[]>();
    for (const c of configs) {
      const list = map.get(c.phase) || [];
      list.push(c);
      map.set(c.phase, list);
    }
    return map;
  }, [configs]);

  // Fetch factors for current song
  const { data: factorsData, refetch: refetchFactors } = useQuery({
    queryKey: ['song-flow-factors', currentSong?.id],
    queryFn: () => api<{ data: FactorValues }>(`/api/songs/${currentSong!.id}/flow-factors`),
    enabled: !!currentSong,
  });

  // ── Load form state when song changes ────────────────────────────

  useEffect(() => {
    if (!currentSong || !configs.length) return;

    const saved = factorsData?.data ?? {};
    const state: FormState = {};

    for (const c of configs) {
      const val = saved[c.name];
      if (val) {
        state[c.name] = val.numeric_value ?? val.string_value ?? UNSET;
      } else {
        state[c.name] = UNSET;
      }
    }

    setFormState(state);
    setIsDirty(false);
  }, [currentSong?.id, factorsData, configs]);

  // ── Auto-play audio when song changes ────────────────────────────

  useEffect(() => {
    if (!currentSong || !audioRef.current) return;
    audioRef.current.src = currentSong.file_url;
    audioRef.current.load();
    audioRef.current.play().catch(() => {});
  }, [currentSong?.id]);

  // ── Beforeunload warning ─────────────────────────────────────────

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Mutations ────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (payload: { songId: string; factors: Record<string, { numeric_value?: number; string_value?: string }> }) =>
      api(`/api/songs/${payload.songId}/flow-factors`, { method: 'PUT', body: { factors: payload.factors } }),
  });

  const titleMutation = useMutation({
    mutationFn: (payload: { id: string; title: string }) =>
      api(`/api/songs/${payload.id}`, { method: 'PATCH', body: { title: payload.title } }),
    onSuccess: () => refetchQueue(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/songs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      refetchQueue();
      setShowDelete(false);
    },
  });

  // ── Form helpers ─────────────────────────────────────────────────

  const setFactorValue = useCallback((key: string, value: number | string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const buildPayload = useCallback(() => {
    const factors: Record<string, { numeric_value?: number; string_value?: string }> = {};
    for (const [key, val] of Object.entries(formState)) {
      if (val === UNSET) continue;
      if (typeof val === 'number') {
        factors[key] = { numeric_value: val };
      } else {
        factors[key] = { string_value: val as string };
      }
    }
    return factors;
  }, [formState]);

  // ── Navigation helpers ───────────────────────────────────────────

  const advance = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Reached end — refetch queue in case new songs appeared
      setCurrentIndex(0);
      refetchQueue();
    }
  }, [currentIndex, queue.length, refetchQueue]);

  const handleSaveAndNext = useCallback(async () => {
    if (!currentSong || saving) return;
    setSaving(true);
    try {
      await saveMutation.mutateAsync({ songId: currentSong.id, factors: buildPayload() });
      setIsDirty(false);
      advance();
    } finally {
      setSaving(false);
    }
  }, [currentSong, saving, saveMutation, buildPayload, advance]);

  const handleSkip = useCallback(() => {
    setIsDirty(false);
    advance();
  }, [advance]);

  const handleDelete = useCallback(async () => {
    if (!currentSong) return;
    await deleteMutation.mutateAsync(currentSong.id);
    // If we deleted the last song, go back one index
    if (currentIndex >= queue.length - 1 && currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentSong, deleteMutation, currentIndex, queue.length]);

  const handleTitleSave = useCallback(() => {
    if (!currentSong || !titleDraft.trim()) return;
    titleMutation.mutate({ id: currentSong.id, title: titleDraft.trim() });
    setEditingTitle(false);
  }, [currentSong, titleDraft, titleMutation]);

  // ── Keyboard shortcuts ───────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 'Enter') { e.preventDefault(); handleSaveAndNext(); }
      if (meta && e.key === 'ArrowRight') { e.preventDefault(); handleSkip(); }
      if (e.key === ' ' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        const a = audioRef.current;
        if (a) a.paused ? a.play() : a.pause();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSaveAndNext, handleSkip]);

  // Reset index when filter/sort changes
  useEffect(() => { setCurrentIndex(0); }, [filter, sort]);

  // ── Count set factors per phase ──────────────────────────────────

  const phaseSetCounts = useMemo(() => {
    const counts: Record<number, { set: number; total: number }> = {};
    for (const [phase, phaseConfigs] of configsByPhase) {
      let set = 0;
      for (const c of phaseConfigs) {
        if (formState[c.name] !== undefined && formState[c.name] !== UNSET) set++;
      }
      counts[phase] = { set, total: phaseConfigs.length };
    }
    return counts;
  }, [configsByPhase, formState]);

  // ── Render ───────────────────────────────────────────────────────

  const allDone = queue.length === 0;
  const isLastSong = currentIndex >= queue.length - 1;
  const progress = total > 0 ? ((currentIndex + 1) / total) : 0;

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-[rgba(255,255,255,0.87)]">Batch Entry</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-[rgba(255,255,255,0.4)]">
            Filter
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-[rgba(255,255,255,0.87)]"
            >
              <option value="untagged">Untagged</option>
              <option value="partial">Partial</option>
              <option value="all">All</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[rgba(255,255,255,0.4)]">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-[rgba(255,255,255,0.87)]"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title_asc">Title A–Z</option>
              <option value="title_desc">Title Z–A</option>
            </select>
          </label>
        </div>
      </div>

      {/* Progress */}
      {!allDone && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-[rgba(255,255,255,0.4)] mb-1">
            <span>Song {currentIndex + 1} of {total}</span>
          </div>
          <div className="w-full h-[3px] bg-[#1e1e1e] rounded-full overflow-hidden">
            <div className="h-full bg-[#2dd4bf] transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {allDone && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-[rgba(255,255,255,0.4)] text-sm mb-4">
            {filter === 'untagged' ? 'All songs have been tagged!' : 'No songs match this filter.'}
          </div>
          <button
            onClick={() => { setFilter('all'); }}
            className="px-4 py-2 text-xs bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-lg text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.08)]"
          >
            Show all songs
          </button>
        </div>
      )}

      {/* Main content */}
      {currentSong && (
        <>
          {/* Player card */}
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 mb-4">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              {editingTitle ? (
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
                  className="flex-1 bg-transparent border-b border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.87)] text-sm font-medium outline-none py-0.5"
                />
              ) : (
                <button
                  onClick={() => { setTitleDraft(currentSong.title || ''); setEditingTitle(true); }}
                  className="group flex items-center gap-1.5 text-sm font-medium text-[rgba(255,255,255,0.87)] hover:text-white"
                >
                  {currentSong.title || 'Untitled'}
                  <svg className="w-3 h-3 text-[rgba(255,255,255,0.25)] group-hover:text-[rgba(255,255,255,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                </button>
              )}
              <button
                onClick={() => setShowDelete(true)}
                className="text-[rgba(255,255,255,0.25)] hover:text-[#ef4444] transition-colors p-1"
                title="Delete song"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>

            {/* Audio player */}
            <AudioPlayer audioRef={audioRef} duration={currentSong.duration_seconds} />
          </div>

          {/* Delete confirm dialog */}
          {showDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-6 max-w-sm">
                <h3 className="text-sm font-semibold text-[rgba(255,255,255,0.87)] mb-2">Delete "{currentSong.title || 'Untitled'}"?</h3>
                <p className="text-xs text-[rgba(255,255,255,0.4)] mb-4">
                  This removes the song, all flow factor data, outcome scores, and playback history. This cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowDelete(false)} className="px-3 py-1.5 text-xs text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.87)]">Cancel</button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 text-xs bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Phase sections */}
          {[1, 2, 3, 4].map((phase) => {
            const phaseConfigs = configsByPhase.get(phase);
            if (!phaseConfigs?.length) return null;
            const meta = PHASE_META[phase];
            const expanded = expandedPhases.has(phase);
            const counts = phaseSetCounts[phase];

            return (
              <div key={phase} className="mb-3">
                <button
                  onClick={() => {
                    setExpandedPhases((prev) => {
                      const next = new Set(prev);
                      next.has(phase) ? next.delete(phase) : next.add(phase);
                      return next;
                    });
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded-lg text-left"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-3 h-3 text-[rgba(255,255,255,0.4)] transition-transform ${expanded ? 'rotate-90' : ''}`}
                      viewBox="0 0 10 10"
                    >
                      <path d="M3 1l5 4-5 4z" fill="currentColor" />
                    </svg>
                    <span className="text-xs font-semibold tracking-wider text-[rgba(255,255,255,0.5)] uppercase">
                      {meta.label}
                    </span>
                    <span className="text-xs text-[rgba(255,255,255,0.3)]">— {meta.description}</span>
                  </div>
                  <span className="text-xs text-[rgba(255,255,255,0.3)]">
                    {counts?.set ?? 0}/{counts?.total ?? 0} set
                  </span>
                </button>

                {expanded && (
                  <div className="bg-[#1b1b24] border border-t-0 border-[rgba(255,255,255,0.06)] rounded-b-lg px-4 py-3 space-y-3">
                    {phaseConfigs.map((config) => (
                      <FactorInput
                        key={config.name}
                        config={config}
                        value={formState[config.name]}
                        onChange={(val) => setFactorValue(config.name, val)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Sticky action bar */}
          <div className="fixed bottom-0 left-[172px] right-0 bg-[#111117]/95 backdrop-blur border-t border-[rgba(255,255,255,0.06)] px-6 py-3 z-40">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <button
                onClick={handleSkip}
                disabled={saving}
                className="px-4 py-2 text-xs text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors disabled:opacity-50"
              >
                Skip
              </button>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[rgba(255,255,255,0.2)]">
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to save
                </span>
                <button
                  onClick={handleSaveAndNext}
                  disabled={saving}
                  className="px-5 py-2 text-xs font-medium bg-[#2dd4bf] text-[#0a0a0a] rounded-lg hover:bg-[#5eead4] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : isLastSong ? 'Save & Finish' : 'Save & Next'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── AudioPlayer ──────────────────────────────────────────────────────

function AudioPlayer({ audioRef, duration }: { audioRef: React.RefObject<HTMLAudioElement | null>; duration: number }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [loadError, setLoadError] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => setAudioDuration(a.duration || duration);
    const onError = () => setLoadError(true);
    const onLoaded = () => setLoadError(false);

    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('error', onError);
    a.addEventListener('loadeddata', onLoaded);

    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('error', onError);
      a.removeEventListener('loadeddata', onLoaded);
    };
  }, [audioRef, duration]);

  // Reset on song change
  useEffect(() => {
    setCurrentTime(0);
    setAudioDuration(duration);
    setLoadError(false);
  }, [duration]);

  const seek = (e: React.MouseEvent) => {
    if (!progressRef.current || !audioRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * audioDuration;
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    a.paused ? a.play() : a.pause();
  };

  const restart = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  if (loadError) {
    return (
      <div className="text-xs text-[#ef4444]/70 py-2">
        Audio failed to load. You can still enter factor values.
      </div>
    );
  }

  const pct = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div>
      <audio ref={audioRef} preload="auto" />
      {/* Scrub bar */}
      <div
        ref={progressRef}
        className="w-full h-1.5 bg-[#1e1e1e] rounded-full cursor-pointer mb-2 group"
        onClick={seek}
      >
        <div className="h-full bg-[#2dd4bf] rounded-full relative transition-all" style={{ width: `${pct}%` }}>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#2dd4bf] border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={restart} className="text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]" title="Restart">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
        <button onClick={togglePlay} className="text-[rgba(255,255,255,0.87)] hover:text-white" title={playing ? 'Pause' : 'Play'}>
          {playing ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>
          )}
        </button>
        <span className="text-xs text-[rgba(255,255,255,0.4)] tabular-nums">
          {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(audioDuration))}
        </span>
      </div>
    </div>
  );
}

// ── FactorInput ──────────────────────────────────────────────────────

function FactorInput({ config, value, onChange }: { config: FactorConfig; value: FormValue | undefined; onChange: (v: number | string) => void }) {
  const isUnset = value === undefined || value === UNSET;

  if (config.value_type === 'slider') {
    return <SliderInput config={config} value={isUnset ? null : (value as number)} onChange={onChange} />;
  }

  // Text input — dropdown if options exist, else free text
  if (config.value_options && Array.isArray(config.value_options) && config.value_options.length > 0) {
    return (
      <div className="flex items-center gap-3">
        <label className="w-40 shrink-0 text-xs text-[rgba(255,255,255,0.6)] flex items-center gap-1" title={config.description || undefined}>
          {config.display_name}
          {config.description && (
            <svg className="w-3 h-3 text-[rgba(255,255,255,0.2)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          )}
        </label>
        <select
          value={isUnset ? '' : (value as string)}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 text-xs text-[rgba(255,255,255,0.87)] outline-none focus:border-[#2dd4bf]/50"
        >
          <option value="" disabled>Select…</option>
          {config.value_options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  // Free text
  return (
    <div className="flex items-center gap-3">
      <label className="w-40 shrink-0 text-xs text-[rgba(255,255,255,0.6)]" title={config.description || undefined}>
        {config.display_name}
      </label>
      <input
        type="text"
        value={isUnset ? '' : (value as string)}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter…"
        className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 text-xs text-[rgba(255,255,255,0.87)] outline-none focus:border-[#2dd4bf]/50 placeholder:text-[rgba(255,255,255,0.2)]"
      />
    </div>
  );
}

// ── SliderInput ──────────────────────────────────────────────────────

function SliderInput({ config, value, onChange }: { config: FactorConfig; value: number | null; onChange: (v: number) => void }) {
  const min = config.value_range_low ?? 0;
  const max = config.value_range_high ?? 10;
  const step = config.step ?? 1;
  const mid = (min + max) / 2;
  const isUnset = value === null;

  // Display value — show midpoint position when unset but don't emit it
  const displayValue = isUnset ? mid : value;

  return (
    <div className="flex items-center gap-3">
      <label className="w-40 shrink-0 text-xs text-[rgba(255,255,255,0.6)] flex items-center gap-1" title={config.description || undefined}>
        {config.display_name}
        {config.description && (
          <svg className="w-3 h-3 text-[rgba(255,255,255,0.2)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        )}
      </label>
      <div className="flex-1 flex items-center gap-2">
        <span className="text-[10px] text-[rgba(255,255,255,0.2)] w-6 text-right">{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`flex-1 h-1 rounded-full appearance-none cursor-pointer ${isUnset ? 'slider-unset' : 'slider-active'}`}
          style={{
            background: isUnset
              ? '#333333'
              : `linear-gradient(to right, #2dd4bf 0%, #2dd4bf ${((displayValue - min) / (max - min)) * 100}%, #1e1e1e ${((displayValue - min) / (max - min)) * 100}%, #1e1e1e 100%)`,
          }}
        />
        <span className="text-[10px] text-[rgba(255,255,255,0.2)] w-6">{max}</span>
      </div>
      <span className={`w-16 text-right text-xs tabular-nums ${isUnset ? 'text-[rgba(255,255,255,0.15)]' : 'text-[rgba(255,255,255,0.87)]'}`}>
        {isUnset ? '—' : `${value}${config.unit ? ` ${config.unit}` : ''}`}
      </span>
    </div>
  );
}
