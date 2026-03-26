import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { humanize } from '../lib/utils.js';
import Breadcrumb from '../components/Breadcrumb.js';

export default function Config() {
  const queryClient = useQueryClient();

  // --- Change Password ---
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [pwMsg, setPwMsg] = useState('');
  const changePwMutation = useMutation({
    mutationFn: (body: typeof pwForm) => api('/api/auth/change-password', { method: 'POST', body }),
    onSuccess: () => { setPwForm({ current_password: '', new_password: '' }); setPwMsg('Password changed successfully'); },
    onError: (e: any) => setPwMsg(e.message || 'Failed to change password'),
  });

  // --- Flow Factors ---
  const { data: ffData, isLoading: ffLoading } = useQuery({
    queryKey: ['flow-factors'],
    queryFn: () => api<{ data: any[] }>('/api/flow-factors'),
  });
  const [showFfForm, setShowFfForm] = useState(false);
  const [ffForm, setFfForm] = useState({ name: '', display_name: '', category: '', value_type: 'number', importance_weight: '' });
  const [editingFfId, setEditingFfId] = useState<string | null>(null);

  const createFfMutation = useMutation({
    mutationFn: (body: any) => api('/api/flow-factors', { method: 'POST', body: { ...body, importance_weight: body.importance_weight ? Number(body.importance_weight) : undefined } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['flow-factors'] }); resetFfForm(); },
  });
  const updateFfMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api(`/api/flow-factors/${id}`, { method: 'PUT', body: { ...body, importance_weight: body.importance_weight ? Number(body.importance_weight) : undefined } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['flow-factors'] }); resetFfForm(); },
  });
  const deleteFfMutation = useMutation({
    mutationFn: (id: string) => api(`/api/flow-factors/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flow-factors'] }),
  });

  const resetFfForm = () => {
    setShowFfForm(false);
    setEditingFfId(null);
    setFfForm({ name: '', display_name: '', category: '', value_type: 'number', importance_weight: '' });
  };
  const startEditFf = (ff: any) => {
    setFfForm({ name: ff.name, display_name: ff.display_name || '', category: ff.category || '', value_type: ff.value_type || 'number', importance_weight: ff.importance_weight?.toString() || '' });
    setEditingFfId(ff.id);
    setShowFfForm(true);
  };

  // --- Generation Systems ---
  const { data: gsData, isLoading: gsLoading } = useQuery({
    queryKey: ['generation-systems'],
    queryFn: () => api<{ data: any[] }>('/api/generation-systems'),
  });
  const [showGsForm, setShowGsForm] = useState(false);
  const [gsForm, setGsForm] = useState({ name: '', provider: '', is_active: true });
  const [editingGsId, setEditingGsId] = useState<string | null>(null);

  const createGsMutation = useMutation({
    mutationFn: (body: any) => api('/api/generation-systems', { method: 'POST', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['generation-systems'] }); resetGsForm(); },
  });
  const updateGsMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api(`/api/generation-systems/${id}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['generation-systems'] }); resetGsForm(); },
  });
  const deleteGsMutation = useMutation({
    mutationFn: (id: string) => api(`/api/generation-systems/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generation-systems'] }),
  });

  const resetGsForm = () => {
    setShowGsForm(false);
    setEditingGsId(null);
    setGsForm({ name: '', provider: '', is_active: true });
  };
  const startEditGs = (gs: any) => {
    setGsForm({ name: gs.name, provider: gs.provider || '', is_active: gs.is_active ?? true });
    setEditingGsId(gs.id);
    setShowGsForm(true);
  };

  const toggleGsActive = (gs: any) => {
    updateGsMutation.mutate({ id: gs.id, body: { is_active: !gs.is_active } });
  };

  const flowFactors = ffData?.data || [];
  const genSystems = gsData?.data || [];

  return (
    <div>
      <Breadcrumb items={[{ label: 'Settings' }]} />

      {/* Account / Change Password - moved to top */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-3 text-[rgba(255,255,255,0.87)]">Account</h2>
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-3 max-w-md">
          <h3 className="font-medium text-sm text-[rgba(255,255,255,0.87)]">Change Password</h3>
          <input
            type="password"
            placeholder="Current Password"
            value={pwForm.current_password}
            onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
            className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]"
          />
          <input
            type="password"
            placeholder="New Password"
            value={pwForm.new_password}
            onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
            className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]"
          />
          <button
            type="button"
            onClick={() => { setPwMsg(''); changePwMutation.mutate(pwForm); }}
            disabled={!pwForm.current_password || !pwForm.new_password || changePwMutation.isPending}
            className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors"
          >
            {changePwMutation.isPending ? 'Changing...' : 'Change Password'}
          </button>
          {pwMsg && <p className={`text-sm ${changePwMutation.isError ? 'text-[#e74c3c]' : 'text-[#27ae60]'}`}>{pwMsg}</p>}
        </div>
      </section>

      {/* Flow Factors */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-[rgba(255,255,255,0.87)]">Flow Factors</h2>
          <button type="button" onClick={() => { resetFfForm(); setShowFfForm(true); }} className="bg-[#4a90a4] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">+ Add</button>
        </div>

        {showFfForm && (
          <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-3 space-y-3">
            <div>
              <label className="block text-xs text-[rgba(255,255,255,0.4)] mb-1">Key (internal identifier)</label>
              <input placeholder="e.g. tempo_bpm" value={ffForm.name} onChange={(e) => setFfForm({ ...ffForm, name: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            </div>
            <div>
              <label className="block text-xs text-[rgba(255,255,255,0.4)] mb-1">Label (shown in admin)</label>
              <input placeholder="e.g. Tempo (BPM)" value={ffForm.display_name} onChange={(e) => setFfForm({ ...ffForm, display_name: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-[rgba(255,255,255,0.4)] mb-1">Category</label>
                <input placeholder="Category" value={ffForm.category} onChange={(e) => setFfForm({ ...ffForm, category: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)] w-full" />
              </div>
              <div>
                <label className="block text-xs text-[rgba(255,255,255,0.4)] mb-1">Value Type</label>
                <select value={ffForm.value_type} onChange={(e) => setFfForm({ ...ffForm, value_type: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)] w-full">
                  <option value="number">Number</option>
                  <option value="string">String</option>
                  <option value="boolean">Boolean</option>
                  <option value="enum">Enum</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[rgba(255,255,255,0.4)] mb-1">Importance Weight (0-1)</label>
                <input placeholder="0.5" type="number" step="0.01" min="0" max="1" value={ffForm.importance_weight} onChange={(e) => setFfForm({ ...ffForm, importance_weight: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)] w-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => editingFfId ? updateFfMutation.mutate({ id: editingFfId, body: ffForm }) : createFfMutation.mutate(ffForm)}
                disabled={!ffForm.name}
                className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors"
              >
                {editingFfId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetFfForm} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {ffLoading ? <p className="text-[rgba(255,255,255,0.3)] text-sm">Loading...</p> : (
          <table className="w-full bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Key</th>
                <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Label</th>
                <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Category</th>
                <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Type</th>
                <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Weight</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {flowFactors.map((ff: any) => (
                <tr key={ff.id} className="border-b border-[rgba(255,255,255,0.04)]">
                  <td className="px-4 py-3 text-[rgba(255,255,255,0.87)]">{ff.name}</td>
                  <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{ff.display_name}</td>
                  <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{ff.category}</td>
                  <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{humanize(ff.value_type || '')}</td>
                  <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{ff.importance_weight}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button type="button" onClick={() => startEditFf(ff)} className="text-[#4a90a4] hover:text-[#5ba3b8] transition-colors">Edit</button>
                    <button type="button" onClick={() => { if (confirm('Delete this flow factor?')) deleteFfMutation.mutate(ff.id); }} className="text-[#e74c3c] hover:text-[#c0392b] transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
              {flowFactors.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)]">No flow factors configured</td></tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* Generation Systems */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-[rgba(255,255,255,0.87)]">Generation Systems</h2>
          <button type="button" onClick={() => { resetGsForm(); setShowGsForm(true); }} className="bg-[#4a90a4] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">+ Add</button>
        </div>

        {showGsForm && (
          <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-3 space-y-3">
            <input placeholder="Name" value={gsForm.name} onChange={(e) => setGsForm({ ...gsForm, name: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            <input placeholder="Provider" value={gsForm.provider} onChange={(e) => setGsForm({ ...gsForm, provider: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            <label className="flex items-center gap-2 text-sm text-[rgba(255,255,255,0.5)]">
              <input type="checkbox" checked={gsForm.is_active} onChange={(e) => setGsForm({ ...gsForm, is_active: e.target.checked })} />
              Active
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => editingGsId ? updateGsMutation.mutate({ id: editingGsId, body: gsForm }) : createGsMutation.mutate(gsForm)}
                disabled={!gsForm.name}
                className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#5ba3b8] transition-colors"
              >
                {editingGsId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetGsForm} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {gsLoading ? <p className="text-[rgba(255,255,255,0.3)] text-sm">Loading...</p> : (
          <table className="w-full bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Name</th>
                <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Provider</th>
                <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Active</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {genSystems.map((gs: any) => (
                <tr key={gs.id} className="border-b border-[rgba(255,255,255,0.04)]">
                  <td className="px-4 py-3 text-[rgba(255,255,255,0.87)]">{gs.name}</td>
                  <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{gs.provider}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggleGsActive(gs)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${gs.is_active ? 'bg-[rgba(39,174,96,0.15)] text-[#27ae60]' : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]'}`}>
                      {gs.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button type="button" onClick={() => startEditGs(gs)} className="text-[#4a90a4] hover:text-[#5ba3b8] transition-colors">Edit</button>
                    <button type="button" onClick={() => { if (window.confirm(`Delete "${gs.name}"?`)) deleteGsMutation.mutate(gs.id); }} className="text-[#e74c3c] hover:text-[#ff6b6b] transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
              {genSystems.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)]">No generation systems configured</td></tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
