import type { ContactFilters } from '../../../lib/crm/useContacts.js';
import { CATEGORIES, STATUSES, humanizeEnum } from '../../../lib/crm/types.js';

interface Props {
  filters: ContactFilters;
  onChange: (filters: ContactFilters) => void;
  tagOptions?: string[];
  onClearAll: () => void;
}

export default function FilterSidebar({ filters, onChange, tagOptions = [], onClearAll }: Props) {
  function set(key: keyof ContactFilters, value: any) {
    onChange({ ...filters, [key]: value || undefined, offset: 0 });
  }

  const activeCount = [
    filters.category, filters.status, filters.priority, filters.tag,
    filters.has_open_actions, filters.include_archived,
  ].filter(Boolean).length;

  return (
    <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">Filters {activeCount > 0 && `(${activeCount})`}</span>
        {activeCount > 0 && (
          <button type="button" onClick={onClearAll} className="text-xs text-[#5ea2b6] hover:text-[#70b4c8] transition-colors">Clear all</button>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1.5">Category</label>
        <select
          value={filters.category ?? ''}
          onChange={(e) => set('category', e.target.value)}
          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-[rgba(255,255,255,0.87)]"
        >
          <option value="">All</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{humanizeEnum(c)}</option>)}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1.5">Status</label>
        <select
          value={filters.status ?? ''}
          onChange={(e) => set('status', e.target.value)}
          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-[rgba(255,255,255,0.87)]"
        >
          <option value="">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{humanizeEnum(s)}</option>)}
        </select>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1.5">Priority</label>
        <select
          value={filters.priority ?? ''}
          onChange={(e) => set('priority', e.target.value ? Number(e.target.value) : undefined)}
          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-[rgba(255,255,255,0.87)]"
        >
          <option value="">All</option>
          {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>P{p}</option>)}
        </select>
      </div>

      {/* Tags */}
      {tagOptions.length > 0 && (
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1.5">Tag</label>
          <select
            value={filters.tag ?? ''}
            onChange={(e) => set('tag', e.target.value)}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-[rgba(255,255,255,0.87)]"
          >
            <option value="">All</option>
            {tagOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      {/* Toggles */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!filters.has_open_actions}
            onChange={(e) => set('has_open_actions', e.target.checked || undefined)}
            className="accent-[#5ea2b6]"
          />
          <span className="text-[rgba(255,255,255,0.6)] text-xs">Has open actions</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!filters.include_archived}
            onChange={(e) => set('include_archived', e.target.checked || undefined)}
            className="accent-[#5ea2b6]"
          />
          <span className="text-[rgba(255,255,255,0.6)] text-xs">Include archived</span>
        </label>
      </div>
    </div>
  );
}
