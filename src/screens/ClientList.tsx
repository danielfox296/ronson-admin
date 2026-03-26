import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    online: 'bg-green-100 text-green-800',
    onboarding: 'bg-yellow-100 text-yellow-800',
    draft: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-red-100 text-red-800',
    flagged: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default function ClientList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'independent' as string, primary_contact_name: '', primary_contact_email: '' });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', debounced],
    queryFn: () => api<{ data: any[] }>(`/api/clients?search=${encodeURIComponent(debounced)}`),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api('/api/clients', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowForm(false);
      setForm({ name: '', type: 'independent', primary_contact_name: '', primary_contact_email: '' });
    },
  });

  const clients = data?.data || [];

  return (
    <div>
      <Breadcrumb items={[{ label: 'Clients' }]} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button type="button" onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
          + New Client
        </button>
      </div>

      <input
        type="text"
        placeholder="Search clients..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm mb-4"
      />

      {showForm && (
        <div className="bg-white border rounded-lg p-4 mb-4 space-y-3">
          <h3 className="font-semibold">New Client</h3>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <div className="flex gap-4 text-sm">
            {['independent', 'franchisee', 'corporate_parent'].map((t) => (
              <label key={t} className="flex items-center gap-1">
                <input type="radio" name="client_type" value={t} checked={form.type === t} onChange={() => setForm({ ...form, type: t })} />
                {t.replace('_', ' ')}
              </label>
            ))}
          </div>
          <input placeholder="Contact Name" value={form.primary_contact_name} onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <input placeholder="Contact Email" type="email" value={form.primary_contact_email} onChange={(e) => setForm({ ...form, primary_contact_email: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="button" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 rounded text-sm hover:bg-gray-50">Cancel</button>
          </div>
          {createMutation.isError && <p className="text-red-600 text-sm">{(createMutation.error as Error).message}</p>}
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <table className="w-full bg-white rounded-lg border text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Stores</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c: any) => (
              <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="border-b hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.type}</td>
                <td className="px-4 py-3">{c._count?.stores ?? 0}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No clients found</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
