import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import Breadcrumb from '../components/Breadcrumb.js';

const TYPE_OPTIONS = ['system', 'era', 'genre'];

export default function Prompts() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['prompt-templates'],
    queryFn: () => api<{ data: any[] }>('/api/prompts'),
  });
  const templates: any[] = (data as any)?.data || [];

  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ type: 'genre', name: '', slug: '', era: '', content: '', is_active: true });
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const resetForm = () => { setForm({ type: 'genre', name: '', slug: '', era: '', content: '', is_active: true }); setEditing(null); setShowForm(false); };

  const createMutation = useMutation({
    mutationFn: (body: any) => api('/api/prompts', { method: 'POST', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prompt-templates'] }); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api(`/api/prompts/${id}`, { method: 'PUT', body }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prompt-templates'] }); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/prompts/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prompt-templates'] }),
  });

  const startEdit = (t: any) => {
    setForm({ type: t.type, name: t.name, slug: t.slug, era: t.era || '', content: t.content, is_active: t.is_active });
    setEditing(t);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const filtered = filterType ? templates.filter(t => t.type === filterType) : templates;
  const grouped = { system: filtered.filter(t => t.type === 'system'), era: filtered.filter(t => t.type === 'era'), genre: filtered.filter(t => t.type === 'genre') };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Prompts' }]} />
      <div className="flex items-center justify-between mt-4 mb-6">
        <h1 className="text-3xl font-light tracking-tight text-white">Prompts</h1>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <button type="button" onClick={() => api('/api/prompts/seed', { method: 'POST' }).then(() => queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })).catch((e: any) => alert('Seed failed: ' + e.message))} className="px-4 py-2 rounded-lg text-xs font-medium bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] transition-colors">
              Seed from Skill
            </button>
          )}
          <button type="button" onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 rounded-lg text-xs font-medium bg-[#5ea2b6] hover:bg-[#70b4c8] text-white transition-colors">
            + New Prompt
          </button>
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 mb-5">
        {['', ...TYPE_OPTIONS].map(t => (
          <button key={t} type="button" onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-[11px] transition-colors ${filterType === t ? 'bg-[rgba(94,162,182,0.15)] text-white' : 'text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]'}`}>
            {t || 'All'}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-5 mb-6 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)] block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-[rgba(255,255,255,0.09)] rounded-lg px-3 py-2 text-sm">
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)] block mb-1">Name</label>
              <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value, slug: editing ? form.slug : autoSlug(e.target.value) }); }} placeholder="e.g. Yacht Rock" className="w-full border border-[rgba(255,255,255,0.09)] rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)] block mb-1">Slug</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="yacht-rock" className="w-full border border-[rgba(255,255,255,0.09)] rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)] block mb-1">Era</label>
              <input value={form.era} onChange={e => setForm({ ...form, era: e.target.value })} placeholder="1970s" className="w-full border border-[rgba(255,255,255,0.09)] rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.35)] block mb-1">Content</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={16} className="w-full border border-[rgba(255,255,255,0.09)] rounded-xl px-4 py-3 text-sm font-mono resize-y leading-relaxed" spellCheck={false} />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.5)] cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              Active
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg text-xs text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-lg text-xs font-medium bg-[#5ea2b6] hover:bg-[#70b4c8] text-white transition-colors">
                {editing ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Template list */}
      {isLoading ? (
        <p className="text-[rgba(255,255,255,0.3)] text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-[rgba(255,255,255,0.3)] text-sm">No prompt templates yet.</p>
      ) : (
        <div className="space-y-6">
          {(['system', 'era', 'genre'] as const).map(type => {
            const items = grouped[type];
            if (items.length === 0) return null;
            return (
              <div key={type}>
                <span className="text-[9px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.25)] font-medium block mb-2">{type}</span>
                <div className="space-y-1">
                  {items.map((t: any) => (
                    <div key={t.id} className="bg-[#1b1b24] border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-[rgba(255,255,255,0.02)]" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.is_active ? 'bg-[#33be6a]' : 'bg-[rgba(255,255,255,0.15)]'}`} />
                          <span className="text-sm text-[rgba(255,255,255,0.8)] truncate">{t.name}</span>
                          {t.era && <span className="text-[10px] text-[rgba(255,255,255,0.3)]">{t.era}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button" onClick={e => { e.stopPropagation(); startEdit(t); }} className="text-[rgba(255,255,255,0.3)] hover:text-[#5ea2b6] text-[11px] transition-colors">Edit</button>
                          <button type="button" onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${t.name}"?`)) deleteMutation.mutate(t.id); }} className="text-[rgba(255,255,255,0.2)] hover:text-[#ea6152] text-[11px] transition-colors">Delete</button>
                        </div>
                      </div>
                      {expandedId === t.id && (
                        <div className="border-t border-[rgba(255,255,255,0.04)] px-4 py-3 max-h-[400px] overflow-y-auto">
                          <pre className="text-[12px] text-[rgba(255,255,255,0.55)] whitespace-pre-wrap font-mono leading-relaxed">{t.content}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
