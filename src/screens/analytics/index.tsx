// ── Kraftwerk V1 — Main Shell ──

import { useState, useCallback } from 'react';
import './kraftwerk-styles.css';
import TopBar from './TopBar.js';
import TogglePanel from './TogglePanel.js';
import TimelineArea from './TimelineArea.js';
import DetailDrawer from './DetailDrawer.js';
import AddConfounderModal from './AddConfounderModal.js';
import BottomBar from './BottomBar.js';
import { MOCK_CONFOUNDERS, TRACKS } from './kraftwerk-data.js';

const STORE_ID = 'pilot';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  const [expandedSections, setExpandedSections] = useState({
    sonic: true,
    confounders: true,
    outputs: true,
  });
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [showAddConfounder, setShowAddConfounder] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // ── Handlers ──
  const handleToggleSection = useCallback(
    (section: 'sonic' | 'confounders' | 'outputs') => {
      setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    },
    [],
  );

  const handleToggleFlowFactor = useCallback(
    (name: string) => {
      setSelectedFlowFactors((prev) => {
        if (prev.includes(name)) return prev.filter((f) => f !== name);
        if (prev.length >= 5) return prev; // max-5 rule
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

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <TogglePanel
          expandedSections={expandedSections}
          onToggleSection={handleToggleSection}
          selectedFlowFactors={selectedFlowFactors}
          onToggleFlowFactor={handleToggleFlowFactor}
          atLimit={atLimit}
          selectedOutputMetrics={selectedOutputMetrics}
          onToggleOutputMetric={handleToggleOutputMetric}
          showBaseline={showBaseline}
          onToggleBaseline={() => setShowBaseline((p) => !p)}
          confounders={MOCK_CONFOUNDERS}
          onAddConfounder={() => setShowAddConfounder(true)}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 32px' }}>
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
          />

          {selectedTrack && (
            <DetailDrawer
              track={selectedTrack}
              onClose={() => setSelectedTrackId(null)}
            />
          )}
        </div>
      </div>

      <BottomBar onAddConfounder={() => setShowAddConfounder(true)} />

      {showAddConfounder && (
        <AddConfounderModal onClose={() => setShowAddConfounder(false)} />
      )}
    </div>
  );
}
