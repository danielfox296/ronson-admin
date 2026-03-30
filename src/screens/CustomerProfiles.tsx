import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function CustomerProfiles() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newStoreId, setNewStoreId] = useState('');
  const [createError, setCreateError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['all-icps'],
    queryFn: () => api<{ data: any[] }>('/api/store-icps'),
  });

  const { data: storesData } = useQuery({
    queryKey: ['stores-for-create'],
    queryFn: () => api<{ data: any[] }>('/api/stores'),
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: () => api(`/api/stores/${newStoreId}/icps`, { method: 'POST', body: { name: newName, psychographic_summary: newSummary } }),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['all-icps'] });
      setShowCreate(false);
      setNewName('');
      setNewSummary('');
      setNewStoreId('');
      setCreateError('');
      // Navigate to the new audience
      const icp = result?.data;
      if (icp?.id) {
        const store = (storesData?.data || []).find((s: any) => s.id === newStoreId);
        const clientId = store?.client_id || '';
        navigate(`/clients/${clientId}/stores/${newStoreId}/audiences/${icp.id}`);
      }
    },
    onError: (err: any) => setCreateError(err.message || 'Failed to create audience'),
  });

  const allIcps = data?.data || [];

  // Extract unique clients for filter dropdown
  const clients = useMemo(() => {
    const map = new Map<string, string>();
    allIcps.forEach((icp: any) => {
      if (icp.store?.client) map.set(icp.store.client.id, icp.store.client.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allIcps]);

  // Filter
  const icps = useMemo(() => {
    let list = allIcps;
    if (clientFilter !== 'all') {
      list = list.filter((icp: any) => icp.store?.client?.id === clientFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((icp: any) =>
        (icp.name || '').toLowerCase().includes(q) ||
        (icp.psychographic_summary || '').toLowerCase().includes(q) ||
        (icp.store?.client?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allIcps, clientFilter, search]);

  // Stats
  const totalSongs = allIcps.reduce((sum: number, icp: any) => sum + (icp._count?.songs || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-none text-white">Customer Profiles</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r from-[#4a90a4] to-[#2d6a80] text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          CREATE NEW AUDIENCE
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-10">
        <div className="flex-1 min-w-[280px] relative">
          <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.25)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search profiles by name or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] py-3 pl-11 pr-4 text-sm rounded-xl focus:ring-2 focus:ring-[#4a90a4]/20 transition-all"
          />
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] py-3 px-5 text-xs font-bold tracking-widest uppercase text-[rgba(255,255,255,0.5)] rounded-xl cursor-pointer min-w-[160px]"
        >
          <option value="all">ALL CLIENTS</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] rounded-2xl h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {icps.map((icp: any) => (
            <IcpCard key={icp.id} icp={icp} navigate={navigate} />
          ))}

          {/* Ghost Card: Create New */}
          <div onClick={() => setShowCreate(true)} className="flex flex-col items-center justify-center bg-[rgba(255,255,255,0.01)] border-2 border-dashed border-[rgba(255,255,255,0.08)] rounded-2xl p-10 text-center group cursor-pointer hover:border-[#4a90a4]/40 hover:bg-[rgba(74,144,164,0.03)] transition-all min-h-[280px]">
            <div className="w-14 h-14 rounded-full bg-[rgba(255,255,255,0.04)] flex items-center justify-center mb-4 group-hover:bg-[rgba(74,144,164,0.15)] transition-colors">
              <svg className="w-6 h-6 text-[#4a90a4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </div>
            <h3 className="text-lg font-bold text-[rgba(255,255,255,0.8)] mb-1">Build New Audience</h3>
            <p className="text-xs text-[rgba(255,255,255,0.3)] max-w-[200px]">
              Define custom sonic characteristics and client parameters.
            </p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#1a1a25] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[rgba(255,255,255,0.87)] mb-4">New Audience Profile</h3>
            {createError && <p className="text-[#e74c3c] text-sm mb-3">{createError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[rgba(255,255,255,0.4)] mb-1">Store</label>
                <select
                  value={newStoreId}
                  onChange={(e) => setNewStoreId(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select a store...</option>
                  {(storesData?.data || []).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[rgba(255,255,255,0.4)] mb-1">Audience Name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Urban Millennials" className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[rgba(255,255,255,0.4)] mb-1">Psychographic Summary</label>
                <textarea value={newSummary} onChange={(e) => setNewSummary(e.target.value)} placeholder="Describe the audience's vibe, preferences, and sonic identity..." rows={3} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] py-2 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
              <button
                type="button"
                onClick={() => { if (!newStoreId || !newName || !newSummary) { setCreateError('All fields are required'); return; } createMutation.mutate(); }}
                disabled={createMutation.isPending}
                className="flex-1 bg-[#4a90a4] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#5ba3b8] transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Audience'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="col-span-3 bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] p-5 rounded-xl flex items-center gap-8">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[rgba(255,255,255,0.3)] uppercase mb-1">TOTAL PROFILES</p>
            <p className="text-2xl font-bold text-[rgba(255,255,255,0.87)]">{allIcps.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[rgba(255,255,255,0.3)] uppercase mb-1">TOTAL SONGS</p>
            <p className="text-2xl font-bold text-[#4a90a4]">{totalSongs.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[rgba(255,255,255,0.3)] uppercase mb-1">CLIENTS</p>
            <p className="text-2xl font-bold text-[rgba(255,255,255,0.87)]">{clients.length}</p>
          </div>
          {/* Mini waveform */}
          <div className="ml-auto flex items-end gap-1 h-10">
            {[0.4, 0.6, 1, 0.7, 0.3, 0.5, 0.8].map((h, i) => (
              <div key={i} className="w-1.5 rounded-full bg-[#4a90a4]" style={{ height: `${h * 100}%`, opacity: 0.2 + h * 0.6 }} />
            ))}
          </div>
        </div>
        <div className="bg-[rgba(74,144,164,0.08)] border-l-4 border-[#4a90a4] p-5 rounded-xl">
          <p className="text-[10px] font-bold tracking-widest text-[#4a90a4] uppercase mb-2">OVERVIEW</p>
          <p className="text-xs font-medium text-[rgba(255,255,255,0.6)] leading-relaxed">
            {allIcps.length} audience profiles across {clients.length} clients with {totalSongs} generated songs.
          </p>
        </div>
      </div>
    </div>
  );
}

function IcpCard({ icp, navigate }: { icp: any; navigate: (path: string) => void }) {
  const clientName = icp.store?.client?.name || 'Unknown';
  const storeName = icp.store?.name || 'Unknown Store';
  const songCount = icp._count?.songs || 0;
  const clientId = icp.store?.client?.id;
  const storeId = icp.store_id;

  // Determine a category label from psychographic or location
  const category = icp.location_type || icp.income_bracket || 'AUDIENCE';

  return (
    <div
      className="group relative flex flex-col bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer"
      onClick={() => navigate(`/clients/${clientId}/stores/${storeId}/audiences/${icp.id}`)}
    >
      {/* Gradient header band */}
      <div className="h-32 relative overflow-hidden bg-gradient-to-br from-[rgba(74,144,164,0.2)] to-[rgba(74,144,164,0.02)]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a25] via-transparent to-transparent" />
        <div className="absolute top-4 left-4">
          <span className="bg-[rgba(74,144,164,0.2)] text-[#4a90a4] text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full backdrop-blur-md">
            {category}
          </span>
        </div>
        {songCount > 0 && (
          <div className="absolute top-4 right-4">
            <span className="bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.5)] text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full">
              {songCount} SONGS
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col -mt-6 relative">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-[rgba(255,255,255,0.9)] tracking-tight mb-1 group-hover:text-[#4a90a4] transition-colors">{icp.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-widest">Client:</span>
            <span className="text-[10px] font-bold text-[#4a90a4] tracking-widest uppercase">{clientName}</span>
          </div>
        </div>

        {/* Psychographic summary as italic quote */}
        <p className="text-xs text-[rgba(255,255,255,0.55)] leading-relaxed mb-5 italic line-clamp-2">
          "{icp.psychographic_summary}"
        </p>

        {/* Metadata rows */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)]">
            <span className="text-[10px] font-bold tracking-widest uppercase text-[rgba(255,255,255,0.3)]">Store</span>
            <span className="text-xs font-medium text-[rgba(255,255,255,0.7)]">{storeName}</span>
          </div>
          {icp.gender && (
            <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)]">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[rgba(255,255,255,0.3)]">Gender</span>
              <span className="text-xs font-medium text-[rgba(255,255,255,0.7)]">{icp.gender}</span>
            </div>
          )}
          {(icp.age_range_low || icp.age_range_high) && (
            <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)]">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[rgba(255,255,255,0.3)]">Age</span>
              <span className="text-xs font-medium text-[rgba(255,255,255,0.7)]">
                {icp.age_range_low || '?'}–{icp.age_range_high || '?'}
              </span>
            </div>
          )}
          {icp.preferences && (
            <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)]">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[rgba(255,255,255,0.3)]">Tags</span>
              <div className="flex gap-1.5">
                {icp.preferences.split(',').slice(0, 3).map((tag: string, i: number) => (
                  <span key={i} className="text-[10px] bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.5)] px-2 py-0.5 rounded-full font-bold uppercase">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-auto grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${clientId}/stores/${storeId}/audiences/${icp.id}`); }}
            className="bg-[rgba(255,255,255,0.04)] py-2.5 text-[10px] font-bold tracking-widest uppercase text-[#4a90a4] border border-[rgba(255,255,255,0.09)] hover:bg-[#4a90a4] hover:text-white transition-all rounded-lg flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            VIEW PROFILE
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${clientId}/stores/${storeId}`); }}
            className="bg-[rgba(255,255,255,0.04)] py-2.5 text-[10px] font-bold tracking-widest uppercase text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.09)] hover:bg-[rgba(255,255,255,0.08)] transition-all rounded-lg flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            GO TO STORE
          </button>
        </div>
      </div>
    </div>
  );
}
