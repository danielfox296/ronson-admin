// ── Kraftwerk V1 — Timeline Area ──

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import {
  generatePlaybackSchedule,
  generateOutcomeData,
  TRACKS,
  MOCK_CONFOUNDERS,
} from './kraftwerk-data.js';
import HealthStrip from './HealthStrip.js';
import TrackLane from './TrackLane.js';
import FlowFactorLane from './FlowFactorLane.js';
import ConfounderLane from './ConfounderLane.js';
import OutputLane from './OutputLane.js';

interface TimelineAreaProps {
  storeId: string;
  selectedDate: string;
  selectedFlowFactors: string[];
  selectedOutputMetrics: string[];
  showBaseline: boolean;
  baselineMode: string;
  hoverTime: number | null;
  onHoverTimeChange: (time: number | null) => void;
  onSelectTrack: (trackId: string | null) => void;
  selectedTrackId: string | null;
}

const TOTAL_MINUTES = 720; // 9AM – 9PM
const DAY_START_HOUR = 9;

/** Build the tick labels for the shared X-axis: 9a, 10a, ... 12p, 1p, ... 9p */
const TIME_TICKS = Array.from({ length: 13 }, (_, i) => {
  const hour24 = DAY_START_HOUR + i;
  if (hour24 === 12) return '12p';
  if (hour24 > 12) return `${hour24 - 12}p`;
  return `${hour24}a`;
});

export default function TimelineArea({
  storeId,
  selectedDate,
  selectedFlowFactors,
  selectedOutputMetrics,
  showBaseline,
  baselineMode: _baselineMode,
  hoverTime,
  onHoverTimeChange,
  onSelectTrack,
  selectedTrackId,
}: TimelineAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Generate data
  const playbackEvents = useMemo(
    () => generatePlaybackSchedule(new Date(selectedDate)),
    [selectedDate],
  );

  const outcomeBins = useMemo(() => generateOutcomeData(), []);

  // No real baseline data yet — generate a shifted copy for demo
  const baselineBins = useMemo(() => {
    if (!showBaseline) return null;
    return generateOutcomeData().map((bin) => ({
      ...bin,
      traffic: Math.round(bin.traffic * (0.85 + Math.random() * 0.15)),
      conversionRate: +(bin.conversionRate * (0.9 + Math.random() * 0.1)).toFixed(4),
      aov: +(bin.aov * (0.88 + Math.random() * 0.12)).toFixed(2),
      upt: +(bin.upt * (0.9 + Math.random() * 0.1)).toFixed(2),
      dwellMinutes: +(bin.dwellMinutes * (0.85 + Math.random() * 0.15)).toFixed(1),
    }));
  }, [showBaseline]);

  // Mouse tracking for crosshair
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const minutes = (x / rect.width) * TOTAL_MINUTES;
      onHoverTimeChange(Math.max(0, Math.min(TOTAL_MINUTES, minutes)));
    },
    [onHoverTimeChange],
  );

  const handleMouseLeave = useCallback(() => {
    onHoverTimeChange(null);
  }, [onHoverTimeChange]);

  const crosshairLeft =
    hoverTime !== null ? (hoverTime / TOTAL_MINUTES) * containerWidth : null;

  return (
    <div>
      {/* Shared time axis */}
      <div style={{ position: 'relative', height: 20, marginBottom: 2 }}>
        {TIME_TICKS.map((label, i) => {
          const left = (i / 12) * 100;
          return (
            <span
              key={label}
              style={{
                position: 'absolute',
                left: `${left}%`,
                transform: 'translateX(-50%)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: '#3a3a3a',
                userSelect: 'none',
              }}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Lanes container — crosshair scope */}
      <div
        ref={containerRef}
        style={{ position: 'relative' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Crosshair */}
        {crosshairLeft !== null && (
          <div className="kw-crosshair" style={{ left: crosshairLeft }} />
        )}

        <HealthStrip
          storeId={storeId}
          selectedDate={selectedDate}
          playbackEvents={playbackEvents}
        />

        <TrackLane
          playbackEvents={playbackEvents}
          tracks={TRACKS}
          selectedTrackId={selectedTrackId}
          onSelectTrack={onSelectTrack}
          hoverTime={hoverTime}
          containerWidth={containerWidth}
        />

        <FlowFactorLane
          playbackEvents={playbackEvents}
          selectedFactors={selectedFlowFactors}
          hoverTime={hoverTime}
          containerWidth={containerWidth}
        />

        <ConfounderLane
          confounders={MOCK_CONFOUNDERS}
          hoverTime={hoverTime}
          containerWidth={containerWidth}
        />

        <OutputLane
          outcomeBins={outcomeBins}
          baselineBins={baselineBins}
          selectedMetrics={selectedOutputMetrics}
          showBaseline={showBaseline}
          hoverTime={hoverTime}
        />
      </div>
    </div>
  );
}
