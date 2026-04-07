import type { ContactStatus } from '../../../lib/crm/types.js';
import { humanizeEnum } from '../../../lib/crm/types.js';

const COLOR_MAP: Record<ContactStatus, string> = {
  not_started:       'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]',
  outreach_sent:     'bg-[rgba(94,162,182,0.12)] text-[#5ea2b6]',
  in_conversation:   'bg-[rgba(94,162,182,0.18)] text-[#70b4c8]',
  meeting_scheduled: 'bg-[rgba(234,161,82,0.15)] text-[#eaa152]',
  proposal_sent:     'bg-[rgba(138,107,184,0.15)] text-[#8a6bb8]',
  negotiating:       'bg-[rgba(138,107,184,0.2)] text-[#9d7fcc]',
  committed:         'bg-[rgba(107,163,138,0.2)] text-[#6ba38a]',
  closed_won:        'bg-[rgba(107,193,138,0.2)] text-[#6bc18a]',
  closed_lost:       'bg-[rgba(234,97,82,0.15)] text-[#ea6152]',
  passive:           'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.35)]',
  archived:          'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.25)]',
};

export default function CRMStatusBadge({ status }: { status: ContactStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${COLOR_MAP[status] ?? COLOR_MAP.not_started}`}>
      {humanizeEnum(status)}
    </span>
  );
}
