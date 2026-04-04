import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { humanize } from '../lib/utils.js';
import Breadcrumb from '../components/Breadcrumb.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[rgba(39,174,96,0.15)] text-[#33be6a]',
    onboarding: 'bg-[rgba(230,126,34,0.15)] text-[#e98f38]',
    inactive: 'bg-[rgba(231,76,60,0.15)] text-[#ea6152]',
    archived: 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]'}`}>{humanize(status)}</span>;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: '', address_line_1: '', city: '', state: '', zip: '', country: '', timezone: '', player_password: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => api<{ data: any }>(`/api/clients/${id}`),
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api(`/api/clients/${id}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client', id] }); setEditing(false); },
  });

  const createStoreMutation = useMutation({
    mutationFn: (body: typeof storeForm) => api(`/api/clients/${id}/stores`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      setShowStoreForm(false);
      setStoreForm({ name: '', address_line_1: '', city: '', state: '', zip: '', country: '', timezone: '', player_password: '' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api(`/api/clients/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); navigate('/clients'); },
  });

  if (isLoading) return <p className="text-[rgba(255,255,255,0.45)]">Loading...</p>;
  const client = data?.data;
  if (!client) return <p className="text-[#ea6152]">Client not found</p>;

  const startEdit = () => {
    setEditForm({ name: client.name, type: client.type, primary_contact_name: client.primary_contact_name, primary_contact_email: client.primary_contact_email, status: client.status });
    setEditing(true);
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Clients', href: '/clients' }, { label: client.name }]} />

      <div className="flex items-center justify-between mb-4">
        <div />
        <StatusBadge status={client.status} />
      </div>

      {editing ? (
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 mb-6 space-y-3">
          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <div className="flex gap-4 text-sm text-[rgba(255,255,255,0.5)]">
            {['independent', 'franchisee', 'corporate_parent'].map((t) => (
              <label key={t} className="flex items-center gap-1">
                <input type="radio" name="type" value={t} checked={editForm.type === t} onChange={() => setEditForm({ ...editForm, type: t })} />
                {humanize(t)}
              </label>
            ))}
          </div>
          <input placeholder="Contact Name" value={editForm.primary_contact_name || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact_name: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <input placeholder="Contact Email" value={editForm.primary_contact_email || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact_email: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
          <div className="flex gap-2">
            <button type="button" onClick={() => updateMutation.mutate(editForm)} className="bg-[#5ea2b6] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#70b4c8] transition-colors">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-[rgba(255,255,255,0.4)]">Type:</span> <span className="text-[rgba(255,255,255,0.87)]">{humanize(client.type)}</span></div>
            <div><span className="text-[rgba(255,255,255,0.4)]">Status:</span> <span className="text-[rgba(255,255,255,0.87)]">{humanize(client.status)}</span></div>
            <div><span className="text-[rgba(255,255,255,0.4)]">Contact:</span> <span className="text-[rgba(255,255,255,0.87)]">{client.primary_contact_name}</span></div>
            <div><span className="text-[rgba(255,255,255,0.4)]">Email:</span> <span className="text-[rgba(255,255,255,0.87)]">{client.primary_contact_email}</span></div>
          </div>
          <button type="button" onClick={startEdit} className="mt-3 text-sm text-[#5ea2b6] hover:text-[#70b4c8] transition-colors">Edit</button>
        </div>
      )}

      {/* Stores */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-[rgba(255,255,255,0.87)]">Stores</h2>
          <button type="button" onClick={() => setShowStoreForm(true)} className="bg-[#5ea2b6] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#70b4c8] transition-colors">+ New Store</button>
        </div>

        {showStoreForm && (
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 mb-3 space-y-3">
            <input placeholder="Store Name" value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            <input placeholder="Address" value={storeForm.address_line_1} onChange={(e) => setStoreForm({ ...storeForm, address_line_1: e.target.value })} className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="City" value={storeForm.city} onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
              <input placeholder="State" value={storeForm.state} onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
              <input placeholder="Zip" value={storeForm.zip} onChange={(e) => setStoreForm({ ...storeForm, zip: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Country" value={storeForm.country} onChange={(e) => setStoreForm({ ...storeForm, country: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
              <input placeholder="Timezone" value={storeForm.timezone} onChange={(e) => setStoreForm({ ...storeForm, timezone: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
              <input placeholder="Player Password" value={storeForm.player_password} onChange={(e) => setStoreForm({ ...storeForm, player_password: e.target.value })} className="border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => createStoreMutation.mutate(storeForm)} disabled={!storeForm.name} className="bg-[#5ea2b6] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#70b4c8] transition-colors">Create</button>
              <button type="button" onClick={() => setShowStoreForm(false)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl">
          {(client.stores || []).map((s: any) => (
            <div
              key={s.id}
              onClick={() => navigate(`/clients/${id}/stores/${s.id}`)}
              className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.03)] cursor-pointer text-sm transition-colors"
            >
              <div>
                <span className="font-medium text-[rgba(255,255,255,0.87)]">{s.name}</span>
                {s.city && <span className="text-[rgba(255,255,255,0.4)] ml-2">{s.city}, {s.state}</span>}
              </div>
              <StatusBadge status={s.status || 'active'} />
            </div>
          ))}
          {(!client.stores || client.stores.length === 0) && (
            <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.45)] text-sm">No stores yet</p>
          )}
        </div>
      </div>

      {/* Corporate Audience Profiles */}
      {client.corporate_icps && client.corporate_icps.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3 text-[rgba(255,255,255,0.87)]">Corporate Audience Profiles</h2>
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl">
            {client.corporate_icps.map((icp: any) => (
              <div key={icp.id} className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 text-sm">
                <span className="font-medium text-[rgba(255,255,255,0.87)]">{icp.name}</span>
                {icp.psychographic_summary && <p className="text-[rgba(255,255,255,0.4)] text-xs mt-1">{icp.psychographic_summary}</p>}
                <div className="flex gap-3 text-[rgba(255,255,255,0.45)] text-xs mt-1">
                  {icp.gender && <span>Gender: {icp.gender}</span>}
                  {(icp.age_range_low || icp.age_range_high) && <span>Age: {icp.age_range_low || '?'}–{icp.age_range_high || '?'}</span>}
                  {icp.income_bracket && <span>Income: {icp.income_bracket}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deactivate Client - moved to very bottom */}
      <div className="mt-8 border-t border-[rgba(255,255,255,0.09)] pt-6">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Are you sure you want to deactivate ${client.name}?`)) {
              deactivateMutation.mutate();
            }
          }}
          disabled={deactivateMutation.isPending}
          className="text-[#ea6152] hover:text-[#c0392b] text-sm font-medium transition-colors"
        >
          {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate Client'}
        </button>
      </div>
    </div>
  );
}
