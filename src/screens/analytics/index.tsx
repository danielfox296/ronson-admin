// ── Kraftwerk V2 — Main Shell ──
// Clean, human-readable analytics dashboard with progressive disclosure.
// All data stays the same — just restructured for casual exploration.

import { useState, useCallback, useMemo } from 'react';
import './kraftwerk-styles.css';
import TopBar from './TopBar.js';
import TimelineArea from './TimelineArea.js';
import DetailDrawer from './DetailDrawer.js';
import AddConfounderModal from './AddConfounderModal.js';
import BottomBar from './BottomBar.js';
import {
  MOCK_CONFOUNDERS,
  TRACKS,
  FLOW_FACTOR_SCHEMA,
  FLOW_FACTOR_COLORS,
  OUTPUT_METRICS,
  generateOutcomeData,
} from './kraftwerk-data.js';
import type { Confounder } from './kraftwerk-data.js';

const STORE_ID = 'pilot';
const NUMERIC_FACTORS = FLOW_FACTOR_SCHEMA.filter((f) => f.type === 'numeric');

const CATEGORIES: Array<{ label: string; category: string }> = [
  { label: 'Compositional', category: 'Compositional' },
  { label: 'Performance', category: 'Performance / Expression' },
  { label: 'Production', category: 'Production / Signal' },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Collapsible Section wrapper ──
function Section({
  title,
  subtitle,
  open,
  onToggle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="kw-section">
      <div className="kw-section-header" onClick={onToggle}>
        <div className="kw-section-header-left">
          <span className={`kw-section-caret ${open ? '' : 'collapsed'}`}>▾</span>
          <span className="kw-section-title">{title}</span>
          {subtitle && <span className="kw-section-subtitle">{subtitle}</span>}
        </div>
        {actions && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
      </div>
      {open && <div className="kw-section-body">{children}</div>}
    </div>
  );
}

// ── Summary Cards ──
function SummaryCards() {
  // Pull aggregate numbers from the mock outcome data
  const summary = useMemo(() => {
    const bins = generateOutcomeData();
    const totalTraffic = bins.reduce((s, b) => s + b.traffic, 0);
    const totalTxn = bins.reduce((s, b) => s + b.transactions, 0);
    const totalRevenue = bins.reduce((s, b) => s + b.revenue, 0);
    const avgConversion = totalTxn / totalTraffic;
    const avgAOV = totalTxn > 0 ? totalRevenue / totalTxn : 0;
    return {
      traffic: totalTraffic.toLocaleString(),
      conversion: (avgConversion * 100).toFixed(1) + '%',
      aov: '$' + avgAOV.toFixed(0),
      revenue: '$' + totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    };
  }, []);

  return (
    <div className="kw-summary-row">
      <div className="kw-summary-card">
        <div className="kw-summary-label">Traffic</div>
        <div className="kw-summary-value">{summary.traffic}</div>
        <div className="kw-summary-delta up">+8% vs last week</div>
      </div>
      <div className="kw-summary-card">
        <div className="kw-summary-label">Conversion</div>
        <div className="kw-summary-value">{summary.conversion}</div>
        <div className="kw-summary-delta up">+0.3pp</div>
      </div>
      <div className="kw-summary-card">
        <div className="kw-summary-label">Avg Order</div>
        <div className="kw-summary-value">{summary.aov}</div>
        <div className="kw-summary-delta flat">—</div>
      </div>
      <div className="kw-summary-card">
        <div className="kw-summary-label">Revenue</div>
        <div className="kw-summary-value">{summary.revenue}</div>
        <div className="kw-summary-delta up">+12%</div>
      </div>
    </div>
  );
}

// ── Flow Factor Chips (inline controls) ──
function FlowFactorControls({
  selectedFactors,
  onToggle,
  atLimit,
}: {
  selectedFactors: string[];
  onToggle: (name: string) => void;
  atLimit: boolean;
}) {
  return (
    <div>
      {CATEGORIES.map(({ label, category }) => {
        const factors = NUMERIC_FACTORS.filter((f) => f.category === category);
        return (
          <div key={category} className="kw-factor-category">
            <div className="kw-factor-category-label">{label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {factors.map((f) => {
                const isActive = selectedFactors.includes(f.name);
                const colorIdx = selectedFactors.indexOf(f.name);
                const color = colorIdx >= 0 ? FLOW_FACTOR_COLORS[colorIdx] : undefined;
                const isDisabled = !isActive && atLimit;
                return (
                  <button
                    key={f.name}
                    className={`kw-control-chip ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => !isDisabled && onToggle(f.name)}
                    style={
                      isActive && color
                        ? { background: color, borderColor: color, color: '#fff' }
                        : undefined
                    }
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {atLimit && (
        <div className="kw-controls-limit" style={{ marginTop: 8 }}>
          5 factor limit reached — deselect one to choose another
        </div>
      )}
    </div>
  );
}

// ── Output Metric Chips ──
function OutputControls({
  selectedMetrics,
  onToggle,
  showBaseline,
  onToggleBaseline,
}: {
  selectedMetrics: string[];
  onToggle: (key: string) => void;
  showBaseline: boolean;
  onToggleBaseline: () => void;
}) {
  return (
    <div className="kw-controls-row">
      <span className="kw-controls-label">Metrics</span>
      {OUTPUT_METRICS.map((m) => {
        const isActive = selectedMetrics.includes(m.key);
        return (
          <button
            key={m.key}
            className={`kw-control-chip ${isActive ? 'active' : ''}`}
            onClick={() => onToggle(m.key)}
            style={
              isActive
                ? { background: m.color, borderColor: m.color, color: '#fff' }
                : undefined
            }
          >
            {m.label}
          </button>
        );
      })}

      <div className="kw-controls-sep" />

      <div className="kw-baseline-row" style={{ padding: 0 }}>
        <div
          className={`kw-toggle ${showBaseline ? 'on' : ''}`}
          onClick={onToggleBaseline}
        />
        <label onClick={onToggleBaseline} style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
          Baseline
        </label>
      </div>
    </div>
  );
}

// ── Confounder List (inline) ──
function ConfounderList({
  confounders,
  onAdd,
}: {
  confounders: Confounder[];
  onAdd: () => void;
}) {
  if (confounders.length === 0) {
    return (
      <>
        <div className="kw-empty-text">No external factors logged for this day.</div>
        <button className="kw-add-link" onClick={onAdd}>+ Add one</button>
      </>
    );
  }
  return (
    <>
      {confounders.map((c) => (
        <div key={c.id} className="kw-confounder-item">
          <div className={`kw-confounder-dot ${c.impact}`} />
          <div>
            <div className="kw-confounder-text">{c.description}</div>
            <div className="kw-confounder-time">
              {c.startTime}{c.endTime ? ` – ${c.endTime}` : ' onwards'}
            </div>
          </div>
        </div>
      ))}
      <button className="kw-add-link" onClick={onAdd}>+ Add another</button>
    </>
  );
}

// ── Main Dashboard ──
export default function KraftwerkDashboard() {
  // ── State ──
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [baselineMode, setBaselineMode] = useState<'last-week' | 'last-year' | '30-day-avg' | 'none'>('last-week');
  const [selectedFlowFactors, setSelectedFlowFactors] = useState<string[]>([
    'Tempo',
    'Emotional Intensity',
    'Reverb Depth',
  ]);
  const [selectedOutputMetrics, setSelectedOutputMetrics] = useState<string[]>([
    'conversionRate',
    'aov',
  ]);
  const [showBaseline, setShowBaseline] = useState(true);

  // Sections: schedule + performance open by default, sonic + confounders collapsed
  const [openSections, setOpenSections] = useState({
    schedule: true,
    sonic: false,
    confounders: false,
    performance: true,
  });

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [showAddConfounder, setShowAddConfounder] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // ── Handlers ──
  const toggleSection = useCallback(
    (key: keyof typeof openSections) => {
      setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [],
  );

  const handleToggleFlowFactor = useCallback(
    (name: string) => {
      setSelectedFlowFactors((prev) => {
        if (prev.includes(name)) return prev.filter((f) => f !== name);
        if (prev.length >= 5) return prev;
        return [...prev, name];
      });
    },
    [],
  );

  const handleToggleOutputMetric = useCallback(
    (key: string) => {
      setSelectedOutputMetrics((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      );
    },
    [],
  );

  const atLimit = selectedFlowFactors.length >= 5;

  const selectedTrack = selectedTrackId
    ? TRACKS.find((t) => t.id === selectedTrackId) ?? null
    : null;

  const factorCountLabel = `${selectedFlowFactors.length} of ${NUMERIC_FACTORS.length} factors selected`;
  const confounderCountLabel = `${MOCK_CONFOUNDERS.length} logged`;

  return (
    <div
      className="kraftwerk"
      style={{
        margin: '-24px',
        height: 'calc(100vh - 0px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TopBar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        baselineMode={baselineMode}
        onBaselineModeChange={(m) => setBaselineMode(m as typeof baselineMode)}
      />

      <div className="kw-main">
        <SummaryCards />

        {/* ── Schedule ── */}
        <Section
          title="Today's Schedule"
          subtitle="6 tracks across 4 states"
          open={openSections.schedule}
          onToggle={() => toggleSection('schedule')}
        >
          <TimelineArea
            storeId={STORE_ID}
            selectedDate={selectedDate}
            selectedFlowFactors={selectedFlowFactors}
            selectedOutputMetrics={selectedOutputMetrics}
            showBaseline={showBaseline}
            baselineMode={baselineMode}
            hoverTime={hoverTime}
            onHoverTimeChange={setHoverTime}
            onSelectTrack={setSelectedTrackId}
            selectedTrackId={selectedTrackId}
            mode="schedule"
          />

          {selectedTrack && (
            <DetailDrawer
              track={selectedTrack}
              onClose={() => setSelectedTrackId(null)}
            />
          )}
        </Section>

        {/* ── Sonic Factors ── */}
        <Section
          title="Sonic Factors"
          subtitle={factorCountLabel}
          open={openSections.sonic}
          onToggle={() => toggleSection('sonic')}
        >
          <FlowFactorControls
            selectedFactors={selectedFlowFactors}
            onToggle={handleToggleFlowFactor}
            atLimit={atLimit}
          />
          <div style={{ marginTop: 16 }}>
            <TimelineArea
              storeId={STORE_ID}
              selectedDate={selectedDate}
              selectedFlowFactors={selectedFlowFactors}
              selectedOutputMetrics={selectedOutputMetrics}
              showBaseline={showBaseline}
              baselineMode={baselineMode}
              hoverTime={hoverTime}
              onHoverTimeChange={setHoverTime}
              onSelectTrack={setSelectedTrackId}
              selectedTrackId={selectedTrackId}
              mode="factors"
            />
          </div>
        </Section>

        {/* ── External Factors ── */}
        <Section
          title="External Factors"
          subtitle={confounderCountLabel}
          open={openSections.confounders}
          onToggle={() => toggleSection('confounders')}
        >
          <TimelineArea
            storeId={STORE_ID}
            selectedDate={selectedDate}
            selectedFlowFactors={selectedFlowFactors}
            selectedOutputMetrics={selectedOutputMetrics}
            showBaseline={showBaseline}
            baselineMode={baselineMode}
            hoverTime={hoverTime}
            onHoverTimeChange={setHoverTime}
            onSelectTrack={setSelectedTrackId}
            selectedTrackId={selectedTrackId}
            mode="confounders"
          />
          <div style={{ marginTop: 12 }}>
            <ConfounderList
              confounders={MOCK_CONFOUNDERS}
              onAdd={() => setShowAddConfounder(true)}
            />
          </div>
        </Section>

        {/* ── Performance ── */}
        <Section
          title="Retail Performance"
          subtitle="15-min interval data"
          open={openSections.performance}
          onToggle={() => toggleSection('performance')}
        >
          <OutputControls
            selectedMetrics={selectedOutputMetrics}
            onToggle={handleToggleOutputMetric}
            showBaseline={showBaseline}
            onToggleBaseline={() => setShowBaseline((p) => !p)}
          />
          <TimelineArea
            storeId={STORE_ID}
            selectedDate={selectedDate}
            selectedFlowFactors={selectedFlowFactors}
            selectedOutputMetrics={selectedOutputMetrics}
            showBaseline={showBaseline}
            baselineMode={baselineMode}
            hoverTime={hoverTime}
            onHoverTimeChange={setHoverTime}
            onSelectTrack={setSelectedTrackId}
            selectedTrackId={selectedTrackId}
            mode="outputs"
          />
        </Section>
      </div>

      <BottomBar onAddConfounder={() => setShowAddConfounder(true)} />

      {showAddConfounder && (
        <AddConfounderModal onClose={() => setShowAddConfounder(false)} />
      )}
    </div>
  );
}
