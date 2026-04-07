import { useState } from 'react';
import type { Interaction } from '../../../lib/crm/types.js';
import { humanizeEnum } from '../../../lib/crm/types.js';

const TYPE_ICONS: Record<string, string> = {
  email_sent: '→✉',
  email_received: '←✉',
  linkedin_message: '💬',
  linkedin_connection: '🔗',
  call: '📞',
  meeting_in_person: '🤝',
  meeting_video: '🎥',
  text_message: '💬',
  note: '📝',
  referral_made: '→👥',
  referral_received: '←👥',
};

const SENTIMENT_COLOR: Record<string, string> = {
  positive: 'text-[#6ba38a]',
  neutral: 'text-[rgba(255,255,255,0.4)]',
  negative: 'text-[#ea6152]',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

interface Props {
  interactions: Interaction[];
  onDelete?: (id: string) => void;
}

export default function InteractionTimeline({ interactions, onDelete }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (interactions.length === 0) {
    return <p className="text-sm text-[rgba(255,255,255,0.35)] py-4 text-center">No interactions logged yet</p>;
  }

  return (
    <div className="space-y-1">
      {interactions.map((i) => (
        <div key={i.id} className="border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden">
          <div
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors"
            onClick={() => toggle(i.id)}
          >
            <span className="text-base w-6 text-center shrink-0">{TYPE_ICONS[i.type] ?? '•'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-[rgba(255,255,255,0.7)]">{humanizeEnum(i.type)}</span>
                {i.direction === 'inbound' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(94,162,182,0.12)] text-[#5ea2b6]">inbound</span>}
                {i.subject && <span className="text-xs text-[rgba(255,255,255,0.5)] truncate">{i.subject}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {i.outcome && <span className="text-[10px] text-[rgba(255,255,255,0.4)]">{humanizeEnum(i.outcome)}</span>}
              {i.sentiment && <span className={`text-[10px] ${SENTIMENT_COLOR[i.sentiment] ?? ''}`}>●</span>}
              <span className="text-[11px] text-[rgba(255,255,255,0.35)]">{relativeTime(i.occurred_at)}</span>
            </div>
          </div>
          {expanded.has(i.id) && (
            <div className="px-4 pb-3 pt-0 border-t border-[rgba(255,255,255,0.05)]">
              <p className="text-[11px] text-[rgba(255,255,255,0.35)] mb-1">
                {new Date(i.occurred_at).toLocaleString()}
              </p>
              {i.summary && <p className="text-sm text-[rgba(255,255,255,0.7)] whitespace-pre-wrap">{i.summary}</p>}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(i.id)}
                  className="mt-2 text-xs text-[#ea6152] hover:text-[#c0392b] transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
