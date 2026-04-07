import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb.js';
import { useCRMStats } from '../../lib/crm/useCRMStats.js';
import { useGlobalActions } from '../../lib/crm/useNextActions.js';
import { useContacts } from '../../lib/crm/useContacts.js';
import StatsCard from './components/StatsCard.js';
import CategoryBadge from './components/CategoryBadge.js';
import { humanizeEnum } from '../../lib/crm/types.js';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1d ago';
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function CRMDashboard() {
  const navigate = useNavigate();
  const { data: statsRes, isLoading: statsLoading } = useCRMStats();
  const { data: actionsRes } = useGlobalActions({ completed: false });
  const { data: recentRes } = useContacts({ sort_by: 'updated_at', sort_dir: 'desc', limit: 10 });

  const stats = statsRes?.data;
  const overdueActions = (actionsRes?.data ?? [])
    .filter((a) => a.due_date && new Date(a.due_date) < new Date())
    .sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3));
  const recentContacts = recentRes?.data ?? [];

  return (
    <div>
      <Breadcrumb items={[{ label: 'CRM' }]} />

      {statsLoading ? (
        <p className="text-[rgba(255,255,255,0.45)]">Loading...</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatsCard
              label="Total Active"
              value={stats?.total_contacts ?? 0}
              sub={`${stats?.added_this_week ?? 0} added this week`}
              accent
            />
            <StatsCard
              label="Open Actions"
              value={stats?.open_actions ?? 0}
              sub={stats?.overdue_actions ? `${stats.overdue_actions} overdue` : 'None overdue'}
              warn={(stats?.overdue_actions ?? 0) > 0}
            />
            <StatsCard
              label="Interactions This Week"
              value={stats?.interactions_this_week ?? 0}
            />
            <StatsCard
              label="Stale 30+ Days"
              value={stats?.stale_contacts_30d ?? 0}
              warn={(stats?.stale_contacts_30d ?? 0) > 0}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Today's Focus */}
            <div className="col-span-1 bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">Today's Focus</h2>
                <button type="button" onClick={() => navigate('/crm/actions')} className="text-xs text-[#5ea2b6] hover:text-[#70b4c8] transition-colors">View all</button>
              </div>
              {overdueActions.length === 0 ? (
                <p className="text-sm text-[rgba(255,255,255,0.35)]">No overdue actions</p>
              ) : (
                <div className="space-y-2">
                  {overdueActions.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <span className="text-[#ea6152] text-xs mt-0.5 shrink-0">!</span>
                      <div className="min-w-0">
                        <p className="text-sm text-[rgba(255,255,255,0.8)] truncate">{a.action}</p>
                        {a.contact && (
                          <button
                            type="button"
                            onClick={() => navigate(`/crm/contacts/${a.contact!.id}`)}
                            className="text-xs text-[#5ea2b6] hover:text-[#70b4c8] transition-colors"
                          >
                            {a.contact.full_name}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recently Active */}
            <div className="col-span-2 bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">Recently Active</h2>
                <button type="button" onClick={() => navigate('/crm/contacts')} className="text-xs text-[#5ea2b6] hover:text-[#70b4c8] transition-colors">All contacts</button>
              </div>
              {recentContacts.length === 0 ? (
                <p className="text-sm text-[rgba(255,255,255,0.35)]">No contacts yet</p>
              ) : (
                <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {recentContacts.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/crm/contacts/${c.id}`)}
                      className="flex items-center justify-between py-2 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] -mx-2 px-2 rounded transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm text-[rgba(255,255,255,0.87)] truncate">{c.full_name}</p>
                          {c.organization_name && <p className="text-xs text-[rgba(255,255,255,0.4)] truncate">{c.organization_name}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <CategoryBadge category={c.category} />
                        <span className="text-xs text-[rgba(255,255,255,0.35)]">{relativeTime(c.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pipeline by Category */}
          {stats && Object.keys(stats.by_category).length > 0 && (
            <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4 mb-4">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-4">By Category</h2>
              <div className="space-y-2">
                {Object.entries(stats.by_category)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, count]) => {
                    const pct = stats.total_contacts > 0 ? (count / stats.total_contacts) * 100 : 0;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span
                          className="text-xs text-[rgba(255,255,255,0.5)] w-32 shrink-0 cursor-pointer hover:text-[#5ea2b6] transition-colors"
                          onClick={() => navigate(`/crm/contacts?category=${cat}`)}
                        >
                          {humanizeEnum(cat)}
                        </span>
                        <div className="flex-1 bg-[rgba(255,255,255,0.06)] rounded-full h-1.5">
                          <div className="bg-[#5ea2b6] h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-[rgba(255,255,255,0.4)] w-6 text-right shrink-0">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Status Funnel */}
          {stats && Object.keys(stats.by_status).length > 0 && (
            <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-4">Status Funnel</h2>
              <div className="flex items-end gap-2 h-24">
                {['not_started', 'outreach_sent', 'in_conversation', 'meeting_scheduled', 'proposal_sent', 'negotiating', 'committed', 'closed_won'].map((s) => {
                  const count = stats.by_status[s] ?? 0;
                  const max = Math.max(...Object.values(stats.by_status), 1);
                  const h = Math.max((count / max) * 100, count > 0 ? 8 : 0);
                  return (
                    <div key={s} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-[rgba(255,255,255,0.4)]">{count}</span>
                      <div
                        className="w-full bg-[#5ea2b6] rounded-t transition-all cursor-pointer hover:bg-[#70b4c8]"
                        style={{ height: `${h}%` }}
                        onClick={() => navigate(`/crm/contacts?status=${s}`)}
                        title={humanizeEnum(s)}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                {['not_started', 'outreach_sent', 'in_conversation', 'meeting_scheduled', 'proposal_sent', 'negotiating', 'committed', 'closed_won'].map((s) => (
                  <div key={s} className="flex-1 text-center">
                    <span className="text-[9px] text-[rgba(255,255,255,0.3)]">{s.split('_')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
