import { useNavigate } from 'react-router-dom';
import type { Contact } from '../../../lib/crm/types.js';
import CategoryBadge from './CategoryBadge.js';
import CRMStatusBadge from './StatusBadge.js';
import PriorityIndicator from './PriorityIndicator.js';

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1d ago';
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

export default function ContactRow({ contact }: { contact: Contact }) {
  const navigate = useNavigate();
  return (
    <tr
      onClick={() => navigate(`/crm/contacts/${contact.id}`)}
      className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
    >
      <td className="px-3 py-2.5">
        <PriorityIndicator priority={contact.priority} showLabel />
      </td>
      <td className="px-3 py-2.5">
        <p className="text-sm text-[rgba(255,255,255,0.87)] font-medium">{contact.full_name}</p>
        {contact.email && <p className="text-xs text-[rgba(255,255,255,0.4)]">{contact.email}</p>}
      </td>
      <td className="px-3 py-2.5 text-sm text-[rgba(255,255,255,0.5)]">
        <p>{contact.organization_name ?? '—'}</p>
        {contact.title && <p className="text-xs text-[rgba(255,255,255,0.35)]">{contact.title}</p>}
      </td>
      <td className="px-3 py-2.5"><CategoryBadge category={contact.category} /></td>
      <td className="px-3 py-2.5"><CRMStatusBadge status={contact.status} /></td>
      <td className="px-3 py-2.5 text-xs text-[rgba(255,255,255,0.4)]">{relativeTime(contact.last_interaction_at)}</td>
      <td className="px-3 py-2.5">
        {contact.open_actions_count != null && contact.open_actions_count > 0 && (
          <span className="text-[10px] bg-[rgba(234,161,82,0.15)] text-[#eaa152] px-1.5 py-0.5 rounded font-bold">
            {contact.open_actions_count}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1 flex-wrap">
          {contact.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)] px-1.5 py-0.5 rounded">{tag}</span>
          ))}
        </div>
      </td>
    </tr>
  );
}
