import { useNavigate } from 'react-router-dom';
import type { Contact } from '../../../lib/crm/types.js';
import CategoryBadge from './CategoryBadge.js';
import PriorityIndicator from './PriorityIndicator.js';

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1d ago';
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

export default function ContactCard({ contact }: { contact: Contact }) {
  const navigate = useNavigate();
  const PRIORITY_BORDER = ['', '#ea6152', '#e87a30', '#eaa152', '#5ea2b6', '#6ba38a'];

  return (
    <div
      onClick={() => navigate(`/crm/contacts/${contact.id}`)}
      className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-3 cursor-pointer hover:border-[rgba(255,255,255,0.16)] transition-all"
      style={{ borderLeftColor: PRIORITY_BORDER[contact.priority] ?? PRIORITY_BORDER[3], borderLeftWidth: '3px' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-[rgba(255,255,255,0.87)] text-sm truncate">{contact.full_name}</p>
          {contact.organization_name && (
            <p className="text-xs text-[rgba(255,255,255,0.45)] truncate">{contact.title ? `${contact.title} · ` : ''}{contact.organization_name}</p>
          )}
        </div>
        <PriorityIndicator priority={contact.priority} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <CategoryBadge category={contact.category} />
        {contact.open_actions_count != null && contact.open_actions_count > 0 && (
          <span className="text-[10px] bg-[rgba(234,161,82,0.15)] text-[#eaa152] px-1.5 py-0.5 rounded font-bold">
            {contact.open_actions_count} action{contact.open_actions_count !== 1 ? 's' : ''}
          </span>
        )}
        {contact.tags?.slice(0, 2).map((tag) => (
          <span key={tag} className="text-[10px] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)] px-1.5 py-0.5 rounded">{tag}</span>
        ))}
      </div>
      <p className="text-[11px] text-[rgba(255,255,255,0.3)] mt-2">Last contact: {relativeTime(contact.last_interaction_at)}</p>
    </div>
  );
}
