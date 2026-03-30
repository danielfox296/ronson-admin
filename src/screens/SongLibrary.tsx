import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, uploadFile } from '../lib/api.js';
import { humanize, formatDuration } from '../lib/utils.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[rgba(39,174,96,0.15)] text-[#27ae60]',
    generated: 'bg-[rgba(74,144,164,0.15)] text-[#4a90a4]',
    draft: 'bg-[rgba(230,126,34,0.15)] text-[#e67e22]',
    flagged: 'bg-[rgba(231,76,60,0.15)] text-[#e74c3c]',
    inactive: 'bg-[rgba(231,76,60,0.15)] text-[#e74c3c]',
    removed: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
    archived: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]'}`}>{humanize(status)}</span>;
}

type Filter = 'all' | 'unassigned' | 'active' | 'flagged';

export default function SongLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [hoveredIconId, setHoveredIconId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    setUploadError('');
    try {
      for (const file of Array.from(files)) {
        const result = await uploadFile(file);
        const audio = new Audio(result.url);
        const duration = await new Promise<number>((resolve) => {
          audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
          audio.addEventListener('error', () => resolve(0));
        });
        await api('/api/songs', {
          method: 'POST',
          body: {
            title: file.name.replace(/\.(mp3|wav|flac)$/i, ''),
            audio_file_url: result.url,
            duration_seconds: Math.round(duration),
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setShowUpload(false);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Stop audio when component unmounts
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (filter === 'unassigned') params.set('unassigned', 'true');
    if (filter === 'active') params.set('status', 'active');
    if (filter === 'flagged') params.set('status', 'flagged');
    return params.toString();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['songs', filter],
    queryFn: () => api<{ data: any[] }>(`/api/songs?${buildQuery()}`),
  });

  const allSongs = data?.data || [];

  const songs = useMemo(() => {
    if (!debounced) return allSongs;
    const q = debounced.toLowerCase();
    return allSongs.filter((s: any) => (s.title || '').toLowerCase().includes(q));
  }, [allSongs, debounced]);

  const handleIconClick = (e: React.MouseEvent, song: any) => {
    e.stopPropagation();
    if (playingId === song.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      audioRef.current?.pause();
      if (song.audio_file_url) {
        const el = new Audio(song.audio_file_url);
        el.onended = () => setPlayingId(null);
        el.play().catch(() => {});
        audioRef.current = el;
        setPlayingId(song.id);
      }
    }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All Tracks' },
    { key: 'active', label: 'Active' },
    { key: 'unassigned', label: 'Unassigned' },
    { key: 'flagged', label: 'Flagged' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-4xl tracking-tight leading-none text-white">Songs</h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.7)] px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12"/></svg>
            Bulk Upload
          </button>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="bg-gradient-to-br from-[#4a90a4] to-[#2d6a80] text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-[#4a90a4]/10"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Add New Track
          </button>
        </div>
      </div>

      {/* Filter Bar + Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex bg-[rgba(255,255,255,0.04)] p-1 rounded-xl">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-[#4a90a4] text-white shadow-sm'
                  : 'text-[rgba(255,255,255,0.45)] hover:text-[rgba(255,255,255,0.8)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-[rgba(255,255,255,0.08)]" />

        <div className="relative flex-1 max-w-sm">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.25)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search track or artist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full bg-[rgba(255,255,255,0.04)] border-none rounded-xl pl-9 py-2 text-sm focus:ring-2 focus:ring-[#4a90a4]/30 transition-all ${search ? 'pr-9' : 'pr-4'}`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-[#1a1a25] rounded-2xl p-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[rgba(255,255,255,0.03)] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#1a1a25] rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.02)]">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">Title</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] text-center">Loves</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] text-center">Reports</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] text-center">Stores</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {songs.map((s: any) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/songs/${s.id}`)}
                  className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg bg-gradient-to-br from-[rgba(74,144,164,0.25)] to-[rgba(74,144,164,0.05)] flex items-center justify-center shrink-0 cursor-pointer hover:from-[rgba(74,144,164,0.4)] hover:to-[rgba(74,144,164,0.1)] transition-all"
                        onMouseEnter={() => setHoveredIconId(s.id)}
                        onMouseLeave={() => setHoveredIconId(null)}
                        onClick={(e) => handleIconClick(e, s)}
                      >
                        {playingId === s.id ? (
                          /* Pause icon */
                          <svg className="w-4 h-4 text-[#4a90a4]" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        ) : hoveredIconId === s.id ? (
                          /* Play icon */
                          <svg className="w-4 h-4 text-[#4a90a4]" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        ) : (
                          /* Note icon */
                          <svg className="w-4 h-4 text-[#4a90a4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        )}
                      </div>
                      <div>
                        <p className="font-normal text-[rgba(255,255,255,0.9)] group-hover:text-[#4a90a4] transition-colors">{s.title || 'Untitled'}</p>
                        {s.duration_seconds && (
                          <p className="text-[10px] text-[rgba(255,255,255,0.55)] mt-0.5">{formatDuration(Math.round(s.duration_seconds))}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={s.status || 'active'} /></td>
                  <td className="px-6 py-4 text-center">
                    {s.loves > 0 ? (
                      <span className="text-[#5dcaa5] font-semibold text-sm">{s.loves}</span>
                    ) : (
                      <span className="text-[rgba(255,255,255,0.1)] text-sm">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {s.reports > 0 ? (
                      <span className="text-[#f0997b] font-semibold text-sm">{s.reports}</span>
                    ) : (
                      <span className="text-[rgba(255,255,255,0.1)] text-sm">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {(s._count?.store_playlists ?? 0) > 0 ? (
                      <div className="flex justify-center">
                        <span className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[10px] font-bold text-[rgba(255,255,255,0.5)]">
                          {s._count?.store_playlists}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[rgba(255,255,255,0.1)] text-sm">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-[rgba(255,255,255,0.4)] text-sm">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
              {songs.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[rgba(255,255,255,0.25)] text-sm">No tracks found</td></tr>
              )}
            </tbody>
          </table>

          {/* Footer */}
          {songs.length > 0 && (
            <div className="px-6 py-3 border-t border-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.3)] text-xs">
              Showing {songs.length} of {allSongs.length} tracks
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !uploading && setShowUpload(false)}>
          <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[rgba(255,255,255,0.87)] mb-4">Upload Tracks</h3>
            {uploadError && <p className="text-[#e74c3c] text-sm mb-3">{uploadError}</p>}
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[rgba(255,255,255,0.1)] rounded-xl p-8 cursor-pointer hover:border-[#4a90a4]/40 hover:bg-[rgba(74,144,164,0.03)] transition-all">
              <svg className="w-8 h-8 text-[#4a90a4] mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12"/></svg>
              <span className="text-sm text-[rgba(255,255,255,0.5)]">{uploading ? 'Uploading...' : 'Drop files or click to browse'}</span>
              <span className="text-[10px] text-[rgba(255,255,255,0.25)] mt-1">MP3, WAV, FLAC</span>
              <input
                type="file"
                accept=".mp3,.wav,.flac"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => { if (e.target.files?.length) handleFileUpload(e.target.files); }}
              />
            </label>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setShowUpload(false)} disabled={uploading} className="flex-1 border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] py-2 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
