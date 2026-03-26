import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { humanize } from '../lib/utils.js';
import Breadcrumb from '../components/Breadcrumb.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[rgba(39,174,96,0.15)] text-[#27ae60]',
    online: 'bg-[rgba(39,174,96,0.15)] text-[#27ae60]',
    onboarding: 'bg-[rgba(230,126,34,0.15)] text-[#e67e22]',
    draft: 'bg-[rgba(230,126,34,0.15)] text-[#e67e22]',
    inactive: 'bg-[rgba(231,76,60,0.15)] text-[#e74c3c]',
    flagged: 'bg-[rgba(231,76,60,0.15)] text-[#e74c3c]',
    archived: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]'}`}>
      {humanize(status)}
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
        <h1 className="text-2xl font-light text-[rgba(255,255,255,0.87)]">Clients</h1>
        <button type="button" onClick={() => setShowForm(true)} className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5ba3b8] transition-colors">
          + New Client
        </button>
      </div>

      <input
        type="text"
        placeholder="Search clients..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm mb-4 bg-[rgba(255,255,255,0.03)]"
      />

      {showForm && (
        <div className="bg-[#12121a] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-medium text-[rgba(255,255,255,0.87)]">New Client</h3>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <div className="flex gap-4 text-sm text-[rgba(255,255,255,0.5)]">
            {['independent', 'franchisee', 'corporate_parent'].map((t) => (
              <label key={t} className="flex items-center gap-1">
                <input type="radio" name="client_type" value={t} checked={form.type === t} onChange={() => setForm({ ...form, type: t })} />
                {humanize(t)}
              </label>
            ))}
          </div>
          <input placeholder="Contact Name" value={form.primary_contact_name} onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <input placeholder="Contact Email" type="email" value={form.primary_contact_email} onChange={(e) => setForm({ ...form, primary_contact_email: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <div className="flex gap-2">
            <button type="button" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name} className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5ba3b8] disabled:opacity-50 transition-colors">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)] transition-colors">Cancel</button>
          </div>
          {createMutation.isError && <p className="text-[#e74c3c] text-sm">{(createMutation.error as Error).message}</p>}
        </div>
      )}

      {isLoading ? (
        <p className="text-[rgba(255,255,255,0.3)]">Loading...</p>
      ) : (
        <table className="w-full bg-[#12121a] rounded-xl text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)]">
              <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Name</th>
              <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Type</th>
              <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Stores</th>
              <th className="text-left px-4 py-3 font-medium text-[rgba(255,255,255,0.5)]">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c: any) => (
              <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors">
                <td className="px-4 py-3 text-[rgba(255,255,255,0.87)]">{c.name}</td>
                <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{humanize(c.type)}</td>
                <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{c._count?.stores ?? 0}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[rgba(255,255,255,0.3)]">No clients found</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
