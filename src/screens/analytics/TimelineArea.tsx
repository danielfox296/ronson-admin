// ── Kraftwerk V2 — Timeline Area ──
// Now supports a `mode` prop to render only the relevant lane(s) per section.

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
  /** Which lanes to render: schedule, factors, confounders, outputs, or all */
  mode?: 'schedule' | 'factors' | 'confounders' | 'outputs' | 'all';
}

const TOTAL_MINUTES = 720; // 9AM – 9PM
const DAY_START_HOUR = 9;

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
  mode = 'all',
}: TimelineAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

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

  const playbackEvents = useMemo(
    () => generatePlaybackSchedule(new Date(selectedDate)),
    [selectedDate],
  );

  const outcomeBins = useMemo(() => generateOutcomeData(), []);

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

  const showSchedule = mode === 'all' || mode === 'schedule';
  const showFactors = mode === 'all' || mode === 'factors';
  const showConfounders = mode === 'all' || mode === 'confounders';
  const showOutputs = mode === 'all' || mode === 'outputs';

  return (
    <div>
      {/* Shared time axis */}
      <div style={{ position: 'relative', height: 20, marginBottom: 4 }}>
        {TIME_TICKS.map((label, i) => {
          const left = (i / 12) * 100;
          return (
            <span
              key={label}
              className="kw-time-tick"
              style={{ position: 'absolute', left: `${left}%` }}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Lanes container */}
      <div
        ref={containerRef}
        style={{ position: 'relative' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {crosshairLeft !== null && (
          <div className="kw-crosshair" style={{ left: crosshairLeft }} />
        )}

        {showSchedule && (
          <>
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
          </>
        )}

        {showFactors && (
          <FlowFactorLane
            playbackEvents={playbackEvents}
            selectedFactors={selectedFlowFactors}
            hoverTime={hoverTime}
            containerWidth={containerWidth}
          />
        )}

        {showConfounders && (
          <ConfounderLane
            confounders={MOCK_CONFOUNDERS}
            hoverTime={hoverTime}
            containerWidth={containerWidth}
          />
        )}

        {showOutputs && (
          <OutputLane
            outcomeBins={outcomeBins}
            baselineBins={baselineBins}
            selectedMetrics={selectedOutputMetrics}
            showBaseline={showBaseline}
            hoverTime={hoverTime}
          />
        )}
      </div>
    </div>
  );
}
