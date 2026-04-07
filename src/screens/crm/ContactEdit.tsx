import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb.js';
import { useContact } from '../../lib/crm/useContacts.js';
import { useUpdateContact } from '../../lib/crm/useContactMutations.js';
import { CATEGORIES, STATUSES, humanizeEnum } from '../../lib/crm/types.js';
import { useCRMTags } from '../../lib/crm/useTags.js';
import TagInput from './components/TagInput.js';

export default function ContactEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useContact(id);
  const updateMutation = useUpdateContact(id!);
  const { data: tagsData } = useCRMTags();
  const tagSuggestions = (tagsData?.data ?? []).map((t) => t.tag);

  const contact = data?.data;
  const [initialized, setInitialized] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [tags, setTags] = useState<string[]>([]);

  if (!initialized && contact) {
    setForm({
      first_name: contact.first_name, last_name: contact.last_name,
      preferred_name: contact.preferred_name ?? '',
      email: contact.email ?? '', email_alt: contact.email_alt ?? '',
      phone: contact.phone ?? '', linkedin_url: contact.linkedin_url ?? '',
      twitter_handle: contact.twitter_handle ?? '', website_url: contact.website_url ?? '',
      organization_name: contact.organization_name ?? '', title: contact.title ?? '',
      category: contact.category, sub_category: contact.sub_category ?? '',
      status: contact.status, priority: contact.priority,
      city: contact.city ?? '', state: contact.state ?? '', country: contact.country ?? 'US',
      source: contact.source ?? '', source_detail: contact.source_detail ?? '',
      notes: contact.notes ?? '',
    });
    setTags(contact.tags ?? []);
    setInitialized(true);
  }

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateMutation.mutateAsync({ ...form, priority: Number(form.priority), tags });
    navigate(`/crm/contacts/${id}`);
  }

  if (isLoading || !initialized) return <p className="text-[rgba(255,255,255,0.45)]">Loading...</p>;
  if (!contact) return <p className="text-[#ea6152]">Contact not found</p>;

  return (
    <div>
      <Breadcrumb items={[{ label: 'CRM', href: '/crm' }, { label: 'Contacts', href: '/crm/contacts' }, { label: contact.full_name, href: `/crm/contacts/${id}` }, { label: 'Edit' }]} />

      <form onSubmit={handleSubmit}>
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-6 space-y-5">
          <h2 className="font-medium text-[rgba(255,255,255,0.87)]">Edit Contact</h2>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">First Name *</label>
              <input required value={form.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Last Name *</label>
              <input required value={form.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Preferred Name</label>
              <input value={form.preferred_name ?? ''} onChange={(e) => set('preferred_name', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Organization</label>
              <input value={form.organization_name ?? ''} onChange={(e) => set('organization_name', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Title</label>
              <input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Category *</label>
              <select required value={form.category ?? ''} onChange={(e) => set('category', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]">
                {CATEGORIES.map((c) => <option key={c} value={c}>{humanizeEnum(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Status</label>
              <select value={form.status ?? ''} onChange={(e) => set('status', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]">
                {STATUSES.map((s) => <option key={s} value={s}>{humanizeEnum(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Priority</label>
              <select value={form.priority ?? 3} onChange={(e) => set('priority', Number(e.target.value))} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]">
                {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>P{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Email</label>
              <input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Alt Email</label>
              <input type="email" value={form.email_alt ?? ''} onChange={(e) => set('email_alt', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Phone</label>
              <input type="tel" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">LinkedIn</label>
              <input type="url" value={form.linkedin_url ?? ''} onChange={(e) => set('linkedin_url', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Twitter</label>
              <input value={form.twitter_handle ?? ''} onChange={(e) => set('twitter_handle', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Website</label>
              <input type="url" value={form.website_url ?? ''} onChange={(e) => set('website_url', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">City</label>
              <input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">State</label>
              <input value={form.state ?? ''} onChange={(e) => set('state', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Country</label>
              <input value={form.country ?? 'US'} onChange={(e) => set('country', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Source</label>
              <input value={form.source ?? ''} onChange={(e) => set('source', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Source Detail</label>
              <input value={form.source_detail ?? ''} onChange={(e) => set('source_detail', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Tags</label>
            <TagInput
              tags={tags}
              onAdd={(t) => setTags((prev) => [...prev, t])}
              onRemove={(t) => setTags((prev) => prev.filter((x) => x !== t))}
              suggestions={tagSuggestions}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Notes</label>
            <textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={4} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)] resize-none font-mono" />
          </div>

          {updateMutation.isError && (
            <p className="text-[#ea6152] text-sm">{(updateMutation.error as Error).message}</p>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={updateMutation.isPending} className="bg-[#5ea2b6] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#70b4c8] disabled:opacity-50 transition-colors">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => navigate(`/crm/contacts/${id}`)} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
