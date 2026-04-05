import { humanize } from '../lib/utils.js';

const colors: Record<string, string> = {
  active: 'bg-[rgba(39,174,96,0.15)] text-[#33be6a]',
  online: 'bg-[rgba(39,174,96,0.15)] text-[#33be6a]',
  generated: 'bg-[rgba(94,162,182,0.15)] text-[#5ea2b6]',
  onboarding: 'bg-[rgba(230,126,34,0.15)] text-[#e98f38]',
  draft: 'bg-[rgba(230,126,34,0.15)] text-[#e98f38]',
  inactive: 'bg-[rgba(231,76,60,0.15)] text-[#ea6152]',
  flagged: 'bg-[rgba(231,76,60,0.15)] text-[#ea6152]',
  removed: 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]',
  archived: 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-[rgba(255,255,255,0.09)] text-[rgba(255,255,255,0.4)]'}`}>
      {humanize(status)}
    </span>
  );
}
