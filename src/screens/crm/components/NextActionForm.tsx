import { useState } from 'react';
import type { NextAction } from '../../../lib/crm/types.js';

interface Props {
  initial?: Partial<NextAction>;
  onSubmit: (data: { action: string; due_date?: string; priority: number }) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export default function NextActionForm({ initial, onSubmit, onCancel, isPending }: Props) {
  const [action, setAction] = useState(initial?.action ?? '');
  const [due_date, setDueDate] = useState(initial?.due_date ? initial.due_date.slice(0, 10) : '');
  const [priority, setPriority] = useState(initial?.priority ?? 3);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action.trim()) return;
    onSubmit({ action: action.trim(), due_date: due_date || undefined, priority });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <input
        autoFocus
        value={action}
        onChange={(e) => setAction(e.target.value)}
        placeholder="Next action..."
        className="flex-1 min-w-[200px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 text-sm text-[rgba(255,255,255,0.87)] placeholder-[rgba(255,255,255,0.25)]"
      />
      <input
        type="date"
        value={due_date}
        onChange={(e) => setDueDate(e.target.value)}
        className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-sm text-[rgba(255,255,255,0.87)]"
      />
      <select
        value={priority}
        onChange={(e) => setPriority(Number(e.target.value))}
        className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-sm text-[rgba(255,255,255,0.87)]"
      >
        {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>P{p}</option>)}
      </select>
      <button type="submit" disabled={isPending || !action.trim()} className="bg-[#5ea2b6] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#70b4c8] disabled:opacity-50 transition-colors">
        {isPending ? '...' : initial?.id ? 'Save' : 'Add'}
      </button>
      <button type="button" onClick={onCancel} className="text-sm text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors">Cancel</button>
    </form>
  );
}
