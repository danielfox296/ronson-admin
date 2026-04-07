import { useState } from 'react';
import type { NextAction } from '../../../lib/crm/types.js';
import PriorityIndicator from './PriorityIndicator.js';

interface Props {
  actions: NextAction[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (action: NextAction) => void;
}

function isOverdue(action: NextAction): boolean {
  return !action.completed && !!action.due_date && new Date(action.due_date) < new Date();
}

function formatDate(d: string): string {
  const date = new Date(d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NextActionList({ actions, onToggleComplete, onDelete, onEdit }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (actions.length === 0) {
    return <p className="text-sm text-[rgba(255,255,255,0.35)] py-2">No actions</p>;
  }

  return (
    <div className="space-y-1">
      {actions.map((a) => {
        const overdue = isOverdue(a);
        return (
          <div
            key={a.id}
            className={`flex items-start gap-2 px-2 py-2 rounded-lg group transition-colors ${a.completed ? 'opacity-50' : overdue ? 'bg-[rgba(234,97,82,0.06)]' : 'hover:bg-[rgba(255,255,255,0.03)]'}`}
            onMouseEnter={() => setHoveredId(a.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <input
              type="checkbox"
              checked={a.completed}
              onChange={() => onToggleComplete(a.id, !a.completed)}
              className="mt-0.5 accent-[#5ea2b6] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${a.completed ? 'line-through text-[rgba(255,255,255,0.35)]' : 'text-[rgba(255,255,255,0.87)]'}`}>
                {a.action}
              </p>
              {a.due_date && (
                <p className={`text-xs mt-0.5 ${overdue ? 'text-[#ea6152]' : 'text-[rgba(255,255,255,0.4)]'}`}>
                  {overdue ? 'Overdue · ' : ''}{formatDate(a.due_date)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PriorityIndicator priority={a.priority} />
              {hoveredId === a.id && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onEdit(a)} className="text-xs text-[rgba(255,255,255,0.4)] hover:text-[#5ea2b6] transition-colors">Edit</button>
                  <button type="button" onClick={() => onDelete(a.id)} className="text-xs text-[rgba(255,255,255,0.3)] hover:text-[#ea6152] transition-colors">✕</button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
