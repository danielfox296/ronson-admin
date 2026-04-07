import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb.js';
import { useContacts } from '../../lib/crm/useContacts.js';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { PIPELINE_STATUSES, humanizeEnum } from '../../lib/crm/types.js';
import type { Contact, ContactStatus } from '../../lib/crm/types.js';
import CategoryBadge from './components/CategoryBadge.js';
import PriorityIndicator from './components/PriorityIndicator.js';

const PRIORITY_BORDER = ['', '#ea6152', '#e87a30', '#eaa152', '#5ea2b6', '#6ba38a'];

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1d ago';
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

interface CardProps {
  contact: Contact;
  onDragStart: (e: React.DragEvent, contactId: string) => void;
}

function PipelineCard({ contact, onDragStart }: CardProps) {
  const navigate = useNavigate();
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, contact.id)}
      onClick={() => navigate(`/crm/contacts/${contact.id}`)}
      className="bg-[#15151d] border border-[rgba(255,255,255,0.07)] rounded-lg p-2.5 cursor-pointer hover:border-[rgba(255,255,255,0.14)] transition-all mb-2"
      style={{ borderLeftColor: PRIORITY_BORDER[contact.priority] ?? PRIORITY_BORDER[3], borderLeftWidth: '3px' }}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[rgba(255,255,255,0.87)] truncate leading-tight">{contact.full_name}</p>
          {contact.organization_name && <p className="text-xs text-[rgba(255,255,255,0.4)] truncate">{contact.organization_name}</p>}
        </div>
        <PriorityIndicator priority={contact.priority} />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <CategoryBadge category={contact.category} />
        {contact.open_actions_count != null && contact.open_actions_count > 0 && (
          <span className="text-[10px] bg-[rgba(234,161,82,0.15)] text-[#eaa152] px-1.5 py-0.5 rounded font-bold">
            {contact.open_actions_count}
          </span>
        )}
      </div>
      <p className="text-[10px] text-[rgba(255,255,255,0.3)] mt-1.5">{relativeTime(contact.last_interaction_at)}</p>
    </div>
  );
}

export default function PipelineView() {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ContactStatus | null>(null);
  const { data } = useContacts({ limit: 200, include_archived: false });
  const contacts = data?.data ?? [];

  // Optimistic status map
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, ContactStatus>>({});
  const qc = useQueryClient();

  const grouped = PIPELINE_STATUSES.reduce<Record<ContactStatus, Contact[]>>((acc, status) => {
    acc[status] = contacts.filter((c) => (optimisticStatus[c.id] ?? c.status) === status);
    return acc;
  }, {} as any);

  function handleDragStart(e: React.DragEvent, contactId: string) {
    setDraggingId(contactId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(status: ContactStatus) {
    if (!draggingId) return;
    const prevId = draggingId;
    setOptimisticStatus((prev) => ({ ...prev, [prevId]: status }));
    setDraggingId(null);
    setDropTarget(null);
    api(`/api/crm/contacts/${prevId}`, { method: 'PATCH', body: { status } })
      .then(() => qc.invalidateQueries({ queryKey: ['crm-contacts'] }))
      .catch(() => {
        setOptimisticStatus((prev) => { const n = { ...prev }; delete n[prevId]; return n; });
      });
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'CRM', href: '/crm' }, { label: 'Pipeline' }]} />

      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STATUSES.map((status) => (
          <div
            key={status}
            className={`flex-shrink-0 w-48 ${dropTarget === status ? 'opacity-100' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDropTarget(status); }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={() => handleDrop(status)}
          >
            <div className={`bg-[rgba(255,255,255,0.03)] rounded-xl p-2.5 min-h-[400px] border ${dropTarget === status ? 'border-[#5ea2b6]' : 'border-[rgba(255,255,255,0.07)]'} transition-colors`}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.5)]">
                  {humanizeEnum(status)}
                </span>
                <span className="text-[10px] text-[rgba(255,255,255,0.3)]">{grouped[status].length}</span>
              </div>
              {grouped[status].map((c) => (
                <PipelineCard key={c.id} contact={c} onDragStart={handleDragStart} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
