import { useState } from 'react';
import type { InteractionType, InteractionOutcome } from '../../../lib/crm/types.js';
import { INTERACTION_TYPES, INTERACTION_OUTCOMES, humanizeEnum } from '../../../lib/crm/types.js';

interface Props {
  onSubmit: (data: {
    type: InteractionType;
    direction: string;
    occurred_at: string;
    subject?: string;
    summary?: string;
    outcome?: string;
    sentiment?: string;
  }) => void;
  onCancel: () => void;
  isPending?: boolean;
}

const now = () => new Date().toISOString().slice(0, 16);

export default function InteractionForm({ onSubmit, onCancel, isPending }: Props) {
  const [form, setForm] = useState({
    type: 'email_sent' as InteractionType,
    direction: 'outbound',
    occurred_at: now(),
    subject: '',
    summary: '',
    outcome: '' as InteractionOutcome | '',
    sentiment: '',
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { outcome, ...rest } = form;
    onSubmit({ ...rest, occurred_at: new Date(form.occurred_at).toISOString(), ...(outcome ? { outcome } : {}) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Type</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]">
            {INTERACTION_TYPES.map((t) => <option key={t} value={t}>{humanizeEnum(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Direction</label>
          <select value={form.direction} onChange={(e) => set('direction', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]">
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
            <option value="internal">Internal</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Date & Time</label>
        <input type="datetime-local" value={form.occurred_at} onChange={(e) => set('occurred_at', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]" />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Subject</label>
        <input value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Subject / thread title" className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)] placeholder-[rgba(255,255,255,0.2)]" />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Summary</label>
        <textarea value={form.summary} onChange={(e) => set('summary', e.target.value)} rows={3} placeholder="What happened?" className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)] placeholder-[rgba(255,255,255,0.2)] resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Outcome</label>
          <select value={form.outcome} onChange={(e) => set('outcome', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]">
            <option value="">— none —</option>
            {INTERACTION_OUTCOMES.map((o) => <option key={o} value={o}>{humanizeEnum(o)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">Sentiment</label>
          <select value={form.sentiment} onChange={(e) => set('sentiment', e.target.value)} className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[rgba(255,255,255,0.87)]">
            <option value="">— none —</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isPending} className="bg-[#5ea2b6] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#70b4c8] disabled:opacity-50 transition-colors">
          {isPending ? 'Saving...' : 'Log Interaction'}
        </button>
        <button type="button" onClick={onCancel} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Cancel</button>
      </div>
    </form>
  );
}
