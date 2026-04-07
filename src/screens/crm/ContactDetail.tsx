import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb.js';
import { useContact } from '../../lib/crm/useContacts.js';
import { useUpdateContact, useDeleteContact } from '../../lib/crm/useContactMutations.js';
import { useInteractions, useCreateInteraction, useDeleteInteraction } from '../../lib/crm/useInteractions.js';
import { useCreateAction, useUpdateAction, useDeleteAction } from '../../lib/crm/useNextActions.js';
import { useAddTag, useRemoveTag, useCRMTags } from '../../lib/crm/useTags.js';
import { STATUSES, CATEGORIES, humanizeEnum } from '../../lib/crm/types.js';
import type { NextAction } from '../../lib/crm/types.js';
import CategoryBadge from './components/CategoryBadge.js';
import CRMStatusBadge from './components/StatusBadge.js';
import PriorityIndicator from './components/PriorityIndicator.js';
import InteractionTimeline from './components/InteractionTimeline.js';
import InteractionForm from './components/InteractionForm.js';
import NextActionList from './components/NextActionList.js';
import NextActionForm from './components/NextActionForm.js';
import TagInput from './components/TagInput.js';

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingAction, setEditingAction] = useState<NextAction | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);

  const { data, isLoading } = useContact(id);
  const { data: interactionsData } = useInteractions(id);
  const { data: tagsData } = useCRMTags();

  const updateMutation = useUpdateContact(id!);
  const deleteMutation = useDeleteContact(id!);
  const createInteraction = useCreateInteraction(id!);
  const deleteInteraction = useDeleteInteraction(id!);
  const createAction = useCreateAction(id!);
  const updateAction = useUpdateAction(id);
  const deleteAction = useDeleteAction(id);
  const addTag = useAddTag(id!);
  const removeTag = useRemoveTag(id!);

  const tagSuggestions = (tagsData?.data ?? []).map((t) => t.tag);

  if (isLoading) return <p className="text-[rgba(255,255,255,0.45)]">Loading...</p>;
  const contact = data?.data;
  if (!contact) return <p className="text-[#ea6152]">Contact not found</p>;

  const interactions = interactionsData?.data ?? contact.interactions ?? [];
  const actions = contact.next_actions ?? [];
  const tags = contact.tags ?? [];

  async function handleArchive() {
    if (!window.confirm(`Archive ${contact!.full_name}?`)) return;
    await deleteMutation.mutateAsync();
    navigate('/crm/contacts');
  }

  function startEditNotes() {
    setNotesValue(contact!.notes ?? '');
    setEditingNotes(true);
  }

  async function saveNotes() {
    await updateMutation.mutateAsync({ notes: notesValue });
    setEditingNotes(false);
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'CRM', href: '/crm' }, { label: 'Contacts', href: '/crm/contacts' }, { label: contact.full_name }]} />

      <div className="flex gap-5">
        {/* Left column */}
        <div className="w-72 shrink-0 space-y-4">
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[rgba(94,162,182,0.2)] flex items-center justify-center shrink-0">
                <span className="text-[#5ea2b6] font-semibold text-sm">
                  {contact.first_name[0]}{contact.last_name[0]}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[rgba(255,255,255,0.87)] truncate">{contact.full_name}</p>
                {contact.preferred_name && <p className="text-xs text-[rgba(255,255,255,0.4)]">"{contact.preferred_name}"</p>}
              </div>
            </div>

            {contact.title && <p className="text-sm text-[rgba(255,255,255,0.6)] mb-0.5">{contact.title}</p>}
            {contact.organization_name && <p className="text-sm text-[rgba(255,255,255,0.5)] mb-3">{contact.organization_name}</p>}

            <div className="flex flex-wrap gap-2 mb-3">
              <CategoryBadge category={contact.category} />
              <PriorityIndicator priority={contact.priority} showLabel />
            </div>

            {/* Status dropdown */}
            {editingStatus ? (
              <select
                autoFocus
                value={contact.status}
                onChange={async (e) => {
                  await updateMutation.mutateAsync({ status: e.target.value });
                  setEditingStatus(false);
                }}
                onBlur={() => setEditingStatus(false)}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-sm text-[rgba(255,255,255,0.87)] mb-3"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{humanizeEnum(s)}</option>)}
              </select>
            ) : (
              <div className="mb-3 cursor-pointer" onClick={() => setEditingStatus(true)} title="Click to change status">
                <CRMStatusBadge status={contact.status} />
              </div>
            )}

            {/* Contact methods */}
            <div className="space-y-1.5 text-sm mb-3">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-[#5ea2b6] hover:text-[#70b4c8] transition-colors truncate">
                  <span className="text-[rgba(255,255,255,0.3)] shrink-0">✉</span> {contact.email}
                </a>
              )}
              {contact.email_alt && (
                <a href={`mailto:${contact.email_alt}`} className="flex items-center gap-2 text-[rgba(255,255,255,0.5)] hover:text-[#5ea2b6] transition-colors truncate">
                  <span className="text-[rgba(255,255,255,0.2)] shrink-0">✉</span> {contact.email_alt}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-[#5ea2b6] transition-colors">
                  <span className="text-[rgba(255,255,255,0.3)] shrink-0">📞</span> {contact.phone}
                </a>
              )}
              {contact.linkedin_url && (
                <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[rgba(255,255,255,0.5)] hover:text-[#5ea2b6] transition-colors truncate">
                  <span className="text-[rgba(255,255,255,0.3)] shrink-0">in</span> LinkedIn
                </a>
              )}
              {contact.twitter_handle && (
                <p className="flex items-center gap-2 text-[rgba(255,255,255,0.5)]">
                  <span className="text-[rgba(255,255,255,0.3)] shrink-0">𝕏</span> {contact.twitter_handle}
                </p>
              )}
              {contact.website_url && (
                <a href={contact.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[rgba(255,255,255,0.5)] hover:text-[#5ea2b6] transition-colors truncate">
                  <span className="text-[rgba(255,255,255,0.3)] shrink-0">↗</span> Website
                </a>
              )}
            </div>

            {/* Tags */}
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1.5">Tags</p>
              <TagInput
                tags={tags}
                onAdd={(tag) => addTag.mutate(tag)}
                onRemove={(tag) => removeTag.mutate(tag)}
                suggestions={tagSuggestions}
              />
            </div>

            {/* Linked client */}
            {contact.client && (
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Client</p>
                <button type="button" onClick={() => navigate(`/clients/${contact.client!.id}`)} className="text-sm text-[#5ea2b6] hover:text-[#70b4c8] transition-colors">
                  {contact.client.name}
                </button>
              </div>
            )}

            {/* Geo */}
            {(contact.city || contact.state || contact.country) && (
              <p className="text-xs text-[rgba(255,255,255,0.4)] mb-3">
                📍 {[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}
              </p>
            )}

            {/* Source */}
            {contact.source && (
              <p className="text-xs text-[rgba(255,255,255,0.35)] mb-3">
                Source: {contact.source}{contact.source_detail ? ` · ${contact.source_detail}` : ''}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-[rgba(255,255,255,0.07)]">
              <button type="button" onClick={() => navigate(`/crm/contacts/${id}/edit`)} className="text-xs text-[#5ea2b6] hover:text-[#70b4c8] transition-colors">Edit</button>
              <span className="text-[rgba(255,255,255,0.2)]">·</span>
              <button type="button" onClick={handleArchive} className="text-xs text-[rgba(255,255,255,0.35)] hover:text-[#ea6152] transition-colors">Archive</button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Notes */}
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">Notes</h2>
              {!editingNotes && (
                <button type="button" onClick={startEditNotes} className="text-xs text-[#5ea2b6] hover:text-[#70b4c8] transition-colors">{contact.notes ? 'Edit' : '+ Add'}</button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={6}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)] resize-none font-mono"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={saveNotes} disabled={updateMutation.isPending} className="bg-[#5ea2b6] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#70b4c8] disabled:opacity-50 transition-colors">Save</button>
                  <button type="button" onClick={() => setEditingNotes(false)} className="text-sm text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors">Cancel</button>
                </div>
              </div>
            ) : contact.notes ? (
              <pre className="text-sm text-[rgba(255,255,255,0.7)] whitespace-pre-wrap font-sans leading-relaxed">{contact.notes}</pre>
            ) : (
              <p className="text-sm text-[rgba(255,255,255,0.3)] italic">No notes yet</p>
            )}
          </div>

          {/* Next Actions */}
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">
                Next Actions
                {actions.filter((a) => !a.completed).length > 0 && (
                  <span className="ml-2 text-[#eaa152]">{actions.filter((a) => !a.completed).length}</span>
                )}
              </h2>
              {!showActionForm && !editingAction && (
                <button type="button" onClick={() => setShowActionForm(true)} className="text-xs text-[#5ea2b6] hover:text-[#70b4c8] transition-colors">+ Add</button>
              )}
            </div>

            {(showActionForm || editingAction) && (
              <div className="mb-3">
                <NextActionForm
                  initial={editingAction ?? undefined}
                  onSubmit={async (data) => {
                    if (editingAction) {
                      await updateAction.mutateAsync({ id: editingAction.id, ...data });
                      setEditingAction(null);
                    } else {
                      await createAction.mutateAsync(data);
                      setShowActionForm(false);
                    }
                  }}
                  onCancel={() => { setShowActionForm(false); setEditingAction(null); }}
                  isPending={createAction.isPending || updateAction.isPending}
                />
              </div>
            )}

            <NextActionList
              actions={actions}
              onToggleComplete={(id, completed) => updateAction.mutate({ id, completed })}
              onDelete={(id) => deleteAction.mutate(id)}
              onEdit={(action) => { setEditingAction(action); setShowActionForm(false); }}
            />
          </div>

          {/* Activity Timeline */}
          <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">Activity</h2>
              {!showInteractionForm && (
                <button type="button" onClick={() => setShowInteractionForm(true)} className="text-xs text-[#5ea2b6] hover:text-[#70b4c8] transition-colors">+ Log Interaction</button>
              )}
            </div>
            {showInteractionForm && (
              <div className="mb-4 bg-[#15151d] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
                <InteractionForm
                  onSubmit={async (data) => {
                    await createInteraction.mutateAsync(data);
                    setShowInteractionForm(false);
                  }}
                  onCancel={() => setShowInteractionForm(false)}
                  isPending={createInteraction.isPending}
                />
              </div>
            )}
            <InteractionTimeline
              interactions={interactions}
              onDelete={(id) => deleteInteraction.mutate(id)}
            />
          </div>

          {/* Attachments */}
          {contact.attachments && contact.attachments.length > 0 && (
            <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-3">Attachments</h2>
              <div className="grid grid-cols-2 gap-2">
                {contact.attachments.map((att) => (
                  <div key={att.id} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg p-3">
                    <p className="text-sm font-medium text-[rgba(255,255,255,0.8)]">{att.title}</p>
                    <p className="text-xs text-[rgba(255,255,255,0.35)] mt-0.5">{att.type}</p>
                    {att.url && <a href={att.url} target="_blank" rel="noreferrer" className="text-xs text-[#5ea2b6] hover:text-[#70b4c8] mt-1 inline-block transition-colors">Open →</a>}
                    {att.description && <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">{att.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
