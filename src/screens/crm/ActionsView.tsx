import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb.js';
import { useGlobalActions, useUpdateAction, useDeleteAction, type ActionFilters } from '../../lib/crm/useNextActions.js';
import { CATEGORIES, humanizeEnum } from '../../lib/crm/types.js';
import CategoryBadge from './components/CategoryBadge.js';
import PriorityIndicator from './components/PriorityIndicator.js';

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function isOverdue(dueDate: string | null | undefined): boolean {
  return !!dueDate && new Date(dueDate) < new Date();
}

export default function ActionsView() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ActionFilters>({ completed: false });

  const { data, isLoading } = useGlobalActions(filters);
  const updateAction = useUpdateAction();
  const deleteAction = useDeleteAction();

  const actions = data?.data ?? [];

  function setFilter(k: keyof ActionFilters, v: any) {
    setFilters((f) => ({ ...f, [k]: v || undefined }));
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'CRM', href: '/crm' }, { label: 'Actions' }]} />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={filters.contact_category ?? ''}
          onChange={(e) => setFilter('contact_category', e.target.value)}
          className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 text-sm text-[rgba(255,255,255,0.87)]"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{humanizeEnum(c)}</option>)}
        </select>

        <select
          value={filters.priority ?? ''}
          onChange={(e) => setFilter('priority', e.target.value ? Number(e.target.value) : undefined)}
          className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 text-sm text-[rgba(255,255,255,0.87)]"
        >
          <option value="">All priorities</option>
          {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>P{p}</option>)}
        </select>

        <label className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.5)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.completed === undefined}
            onChange={(e) => setFilters((f) => ({ ...f, completed: e.target.checked ? undefined : false }))}
            className="accent-[#5ea2b6]"
          />
          Show completed
        </label>

        <span className="text-xs text-[rgba(255,255,255,0.3)] ml-auto">{actions.length} action{actions.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        <p className="text-[rgba(255,255,255,0.45)]">Loading...</p>
      ) : (
        <table className="w-full bg-[#1b1b24] rounded-xl text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.09)]">
              <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs w-8" />
              <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs w-24">Due</th>
              <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs">Action</th>
              <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs">Contact</th>
              <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs">Category</th>
              <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs w-12">Pri</th>
              <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs w-16" />
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => {
              const overdue = isOverdue(a.due_date);
              return (
                <tr key={a.id} className={`border-b border-[rgba(255,255,255,0.04)] ${a.completed ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={a.completed}
                      onChange={() => updateAction.mutate({ id: a.id, completed: !a.completed })}
                      className="accent-[#5ea2b6]"
                    />
                  </td>
                  <td className={`px-3 py-2.5 text-xs ${overdue ? 'text-[#ea6152]' : 'text-[rgba(255,255,255,0.5)]'}`}>
                    {formatDate(a.due_date)}
                  </td>
                  <td className={`px-3 py-2.5 text-sm ${a.completed ? 'line-through text-[rgba(255,255,255,0.35)]' : 'text-[rgba(255,255,255,0.87)]'}`}>
                    {a.action}
                  </td>
                  <td className="px-3 py-2.5">
                    {a.contact && (
                      <button
                        type="button"
                        onClick={() => navigate(`/crm/contacts/${a.contact!.id}`)}
                        className="text-sm text-[#5ea2b6] hover:text-[#70b4c8] transition-colors"
                      >
                        {a.contact.full_name}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {a.contact && <CategoryBadge category={a.contact.category} />}
                  </td>
                  <td className="px-3 py-2.5">
                    <PriorityIndicator priority={a.priority} showLabel />
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => deleteAction.mutate(a.id)}
                      className="text-xs text-[rgba(255,255,255,0.3)] hover:text-[#ea6152] transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {actions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[rgba(255,255,255,0.35)]">
                  No actions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
