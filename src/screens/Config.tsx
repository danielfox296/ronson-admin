import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

export default function Config() {
  const queryClient = useQueryClient();

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

  // --- Change Password ---
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [pwMsg, setPwMsg] = useState('');
  const changePwMutation = useMutation({
    mutationFn: (body: typeof pwForm) => api('/api/auth/change-password', { method: 'POST', body }),
    onSuccess: () => { setPwForm({ current_password: '', new_password: '' }); setPwMsg('Password changed successfully'); },
    onError: (e: any) => setPwMsg(e.message || 'Failed to change password'),
  });

  const flowFactors = ffData?.data || [];
  const genSystems = gsData?.data || [];

  return (
    <div>
      <Breadcrumb items={[{ label: 'Config' }]} />
      <h1 className="text-2xl font-bold mb-6">Configuration</h1>

      {/* Flow Factors */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Flow Factors</h2>
          <button type="button" onClick={() => { resetFfForm(); setShowFfForm(true); }} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">+ Add</button>
        </div>

        {showFfForm && (
          <div className="bg-white border rounded-lg p-4 mb-3 space-y-3">
            <input placeholder="Name" value={ffForm.name} onChange={(e) => setFfForm({ ...ffForm, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
            <input placeholder="Display Name" value={ffForm.display_name} onChange={(e) => setFfForm({ ...ffForm, display_name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Category" value={ffForm.category} onChange={(e) => setFfForm({ ...ffForm, category: e.target.value })} className="border rounded px-3 py-2 text-sm" />
              <select value={ffForm.value_type} onChange={(e) => setFfForm({ ...ffForm, value_type: e.target.value })} className="border rounded px-3 py-2 text-sm">
                <option value="number">number</option>
                <option value="string">string</option>
                <option value="boolean">boolean</option>
                <option value="enum">enum</option>
              </select>
              <input placeholder="Weight" type="number" step="0.01" value={ffForm.importance_weight} onChange={(e) => setFfForm({ ...ffForm, importance_weight: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => editingFfId ? updateFfMutation.mutate({ id: editingFfId, body: ffForm }) : createFfMutation.mutate(ffForm)}
                disabled={!ffForm.name}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              >
                {editingFfId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetFfForm} className="border px-4 py-2 rounded text-sm">Cancel</button>
            </div>
          </div>
        )}

        {ffLoading ? <p className="text-gray-500 text-sm">Loading...</p> : (
          <table className="w-full bg-white border rounded-lg text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Display Name</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Weight</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {flowFactors.map((ff: any) => (
                <tr key={ff.id} className="border-b">
                  <td className="px-4 py-3">{ff.name}</td>
                  <td className="px-4 py-3">{ff.display_name}</td>
                  <td className="px-4 py-3">{ff.category}</td>
                  <td className="px-4 py-3">{ff.value_type}</td>
                  <td className="px-4 py-3">{ff.importance_weight}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button type="button" onClick={() => startEditFf(ff)} className="text-blue-600 hover:underline">Edit</button>
                    <button type="button" onClick={() => { if (confirm('Delete this flow factor?')) deleteFfMutation.mutate(ff.id); }} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {flowFactors.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No flow factors configured</td></tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* Generation Systems */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Generation Systems</h2>
          <button type="button" onClick={() => { resetGsForm(); setShowGsForm(true); }} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">+ Add</button>
        </div>

        {showGsForm && (
          <div className="bg-white border rounded-lg p-4 mb-3 space-y-3">
            <input placeholder="Name" value={gsForm.name} onChange={(e) => setGsForm({ ...gsForm, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
            <input placeholder="Provider" value={gsForm.provider} onChange={(e) => setGsForm({ ...gsForm, provider: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={gsForm.is_active} onChange={(e) => setGsForm({ ...gsForm, is_active: e.target.checked })} />
              Active
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => editingGsId ? updateGsMutation.mutate({ id: editingGsId, body: gsForm }) : createGsMutation.mutate(gsForm)}
                disabled={!gsForm.name}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              >
                {editingGsId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetGsForm} className="border px-4 py-2 rounded text-sm">Cancel</button>
            </div>
          </div>
        )}

        {gsLoading ? <p className="text-gray-500 text-sm">Loading...</p> : (
          <table className="w-full bg-white border rounded-lg text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Provider</th>
                <th className="text-left px-4 py-3 font-medium">Active</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {genSystems.map((gs: any) => (
                <tr key={gs.id} className="border-b">
                  <td className="px-4 py-3">{gs.name}</td>
                  <td className="px-4 py-3">{gs.provider}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggleGsActive(gs)} className={`px-2 py-0.5 rounded-full text-xs font-medium ${gs.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {gs.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => startEditGs(gs)} className="text-blue-600 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
              {genSystems.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No generation systems configured</td></tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* Change Password */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Account</h2>
        <div className="bg-white border rounded-lg p-4 space-y-3 max-w-md">
          <h3 className="font-medium text-sm">Change Password</h3>
          <input
            type="password"
            placeholder="Current Password"
            value={pwForm.current_password}
            onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="New Password"
            value={pwForm.new_password}
            onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => { setPwMsg(''); changePwMutation.mutate(pwForm); }}
            disabled={!pwForm.current_password || !pwForm.new_password || changePwMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {changePwMutation.isPending ? 'Changing...' : 'Change Password'}
          </button>
          {pwMsg && <p className={`text-sm ${changePwMutation.isError ? 'text-red-600' : 'text-green-600'}`}>{pwMsg}</p>}
        </div>
      </section>
    </div>
  );
}
