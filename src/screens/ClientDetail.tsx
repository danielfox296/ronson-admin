import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    onboarding: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-800',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
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

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  const client = data?.data;
  if (!client) return <p className="text-red-600">Client not found</p>;

  const startEdit = () => {
    setEditForm({ name: client.name, type: client.type, primary_contact_name: client.primary_contact_name, primary_contact_email: client.primary_contact_email, status: client.status });
    setEditing(true);
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Clients', href: '/clients' }, { label: client.name }]} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <StatusBadge status={client.status} />
      </div>

      {editing ? (
        <div className="bg-white border rounded-lg p-4 mb-6 space-y-3">
          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <div className="flex gap-4 text-sm">
            {['independent', 'franchisee', 'corporate_parent'].map((t) => (
              <label key={t} className="flex items-center gap-1">
                <input type="radio" name="type" value={t} checked={editForm.type === t} onChange={() => setEditForm({ ...editForm, type: t })} />
                {t.replace('_', ' ')}
              </label>
            ))}
          </div>
          <input placeholder="Contact Name" value={editForm.primary_contact_name || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact_name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <input placeholder="Contact Email" value={editForm.primary_contact_email || ''} onChange={(e) => setEditForm({ ...editForm, primary_contact_email: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="button" onClick={() => updateMutation.mutate(editForm)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Type:</span> {client.type}</div>
            <div><span className="text-gray-500">Status:</span> {client.status}</div>
            <div><span className="text-gray-500">Contact:</span> {client.primary_contact_name}</div>
            <div><span className="text-gray-500">Email:</span> {client.primary_contact_email}</div>
          </div>
          <button type="button" onClick={startEdit} className="mt-3 text-sm text-blue-600 hover:underline">Edit</button>
        </div>
      )}

      {/* Stores */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Stores</h2>
          <button type="button" onClick={() => setShowStoreForm(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">+ New Store</button>
        </div>

        {showStoreForm && (
          <div className="bg-white border rounded-lg p-4 mb-3 space-y-3">
            <input placeholder="Store Name" value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
            <input placeholder="Address" value={storeForm.address_line_1} onChange={(e) => setStoreForm({ ...storeForm, address_line_1: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="City" value={storeForm.city} onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="State" value={storeForm.state} onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="Zip" value={storeForm.zip} onChange={(e) => setStoreForm({ ...storeForm, zip: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Country" value={storeForm.country} onChange={(e) => setStoreForm({ ...storeForm, country: e.target.value })} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="Timezone" value={storeForm.timezone} onChange={(e) => setStoreForm({ ...storeForm, timezone: e.target.value })} className="border rounded px-3 py-2 text-sm" />
              <input placeholder="Player Password" value={storeForm.player_password} onChange={(e) => setStoreForm({ ...storeForm, player_password: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => createStoreMutation.mutate(storeForm)} disabled={!storeForm.name} className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">Create</button>
              <button type="button" onClick={() => setShowStoreForm(false)} className="border px-4 py-2 rounded text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white border rounded-lg">
          {(client.stores || []).map((s: any) => (
            <div
              key={s.id}
              onClick={() => navigate(`/clients/${id}/stores/${s.id}`)}
              className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer text-sm"
            >
              <div>
                <span className="font-medium">{s.name}</span>
                {s.city && <span className="text-gray-500 ml-2">{s.city}, {s.state}</span>}
              </div>
              <StatusBadge status={s.status || 'active'} />
            </div>
          ))}
          {(!client.stores || client.stores.length === 0) && (
            <p className="px-4 py-6 text-center text-gray-500 text-sm">No stores yet</p>
          )}
        </div>
      </div>

      {/* Corporate ICPs */}
      {client.corporate_icps && client.corporate_icps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Corporate ICPs</h2>
          <div className="bg-white border rounded-lg">
            {client.corporate_icps.map((icp: any) => (
              <div key={icp.id} className="px-4 py-3 border-b last:border-0 text-sm">
                <span className="font-medium">{icp.name || icp.label}</span>
                {icp.description && <p className="text-gray-500 text-xs mt-1">{icp.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
