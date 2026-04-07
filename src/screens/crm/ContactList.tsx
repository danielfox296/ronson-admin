import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb.js';
import { useContacts, type ContactFilters } from '../../lib/crm/useContacts.js';
import { useCRMTags } from '../../lib/crm/useTags.js';
import ContactRow from './components/ContactRow.js';
import FilterSidebar from './components/FilterSidebar.js';

const EMPTY_FILTERS: ContactFilters = {};

export default function ContactList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ContactFilters>(() => ({
    category: searchParams.get('category') ?? undefined,
    status: searchParams.get('status') ?? undefined,
  }));

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const activeFilters: ContactFilters = { ...filters, search: debounced || undefined, limit: 100 };
  const { data, isLoading } = useContacts(activeFilters);
  const { data: tagsData } = useCRMTags();

  const contacts = data?.data ?? [];
  const meta = data?.meta;
  const tagOptions = (tagsData?.data ?? []).map((t) => t.tag);

  const activeFilterCount = [
    filters.category, filters.status, filters.priority, filters.tag,
    filters.has_open_actions, filters.include_archived,
  ].filter(Boolean).length;

  return (
    <div>
      <Breadcrumb items={[{ label: 'CRM', href: '/crm' }, { label: 'Contacts' }]} />

      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.87)] placeholder-[rgba(255,255,255,0.2)]"
        />
        <button
          type="button"
          onClick={() => setShowFilters((f) => !f)}
          className={`border px-3 py-2 rounded-lg text-sm transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'border-[#5ea2b6] text-[#5ea2b6]'
              : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.2)]'
          }`}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => navigate('/crm/contacts/new')}
          className="bg-[#5ea2b6] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#70b4c8] transition-colors shrink-0"
        >
          + New Contact
        </button>
        <button
          type="button"
          onClick={() => navigate('/crm/import')}
          className="border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] px-3 py-2 rounded-lg text-sm hover:border-[rgba(255,255,255,0.2)] transition-colors"
        >
          Bulk Import
        </button>
        <button
          type="button"
          onClick={() => navigate('/crm/pipeline')}
          className="border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] px-3 py-2 rounded-lg text-sm hover:border-[rgba(255,255,255,0.2)] transition-colors"
        >
          Pipeline
        </button>
      </div>

      <div className="flex gap-4">
        {showFilters && (
          <div className="w-52 shrink-0">
            <FilterSidebar
              filters={filters}
              onChange={(f) => setFilters(f)}
              tagOptions={tagOptions}
              onClearAll={() => setFilters(EMPTY_FILTERS)}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {meta && (
            <p className="text-xs text-[rgba(255,255,255,0.35)] mb-2">
              {meta.total} contact{meta.total !== 1 ? 's' : ''}
            </p>
          )}

          {isLoading ? (
            <p className="text-[rgba(255,255,255,0.45)]">Loading...</p>
          ) : (
            <table className="w-full bg-[#1b1b24] rounded-xl text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.09)]">
                  <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs w-12">Pri</th>
                  <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs">Name</th>
                  <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs">Org / Title</th>
                  <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs">Category</th>
                  <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs">Status</th>
                  <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs">Last Contact</th>
                  <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs">Actions</th>
                  <th className="text-left px-3 py-2.5 font-medium text-[rgba(255,255,255,0.4)] text-xs">Tags</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => <ContactRow key={c.id} contact={c} />)}
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[rgba(255,255,255,0.35)]">
                      {search || activeFilterCount > 0 ? 'No contacts match your filters' : 'No contacts yet — add one or bulk import'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
