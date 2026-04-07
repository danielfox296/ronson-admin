import type { ContactCategory } from '../../../lib/crm/types.js';
import { humanizeEnum } from '../../../lib/crm/types.js';

const COLOR_MAP: Record<ContactCategory, string> = {
  investor:        'bg-[rgba(94,162,182,0.15)] text-[#5ea2b6]',
  advisor:         'bg-[rgba(138,107,184,0.15)] text-[#8a6bb8]',
  mentor:          'bg-[rgba(107,163,138,0.15)] text-[#6ba38a]',
  retail_prospect: 'bg-[rgba(234,161,82,0.15)] text-[#eaa152]',
  retail_partner:  'bg-[rgba(234,161,82,0.2)] text-[#f0b46a]',
  attorney:        'bg-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.5)]',
  tech_partner:    'bg-[rgba(94,162,182,0.1)] text-[#70b4c8]',
  acquirer:        'bg-[rgba(234,97,82,0.12)] text-[#ea6152]',
  media:           'bg-[rgba(184,138,107,0.15)] text-[#b88a6b]',
  vendor:          'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)]',
  other:           'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)]',
};

export default function CategoryBadge({ category }: { category: ContactCategory }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${COLOR_MAP[category] ?? COLOR_MAP.other}`}>
      {humanizeEnum(category)}
    </span>
  );
}
