// ── Kraftwerk V2 — Flow Factor Lane ──

import { useMemo } from 'react';
import type { PlaybackEvent } from './kraftwerk-data.js';
import { TRACKS, FLOW_FACTOR_SCHEMA, FLOW_FACTOR_COLORS } from './kraftwerk-data.js';

interface FlowFactorLaneProps {
  playbackEvents: PlaybackEvent[];
  selectedFactors: string[];
  hoverTime: number | null;
  containerWidth: number;
}

const TOTAL_MINUTES = 720;
const DAY_START_HOUR = 9;
const LANE_HEIGHT = 200;
const Y_AXIS_WIDTH = 100;

function minutesFrom9AM(d: Date): number {
  return (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export default function FlowFactorLane({
  playbackEvents,
  selectedFactors,
  hoverTime: _hoverTime,
  containerWidth,
}: FlowFactorLaneProps) {
  const chartWidth = containerWidth - Y_AXIS_WIDTH;

  const factorPaths = useMemo(() => {
    if (selectedFactors.length === 0 || playbackEvents.length === 0) return [];

    return selectedFactors.map((factorName, colorIdx) => {
      const schema = FLOW_FACTOR_SCHEMA.find((f) => f.name === factorName);
      const maxVal = schema?.max ?? 10;
      const color = FLOW_FACTOR_COLORS[colorIdx % FLOW_FACTOR_COLORS.length];
      const points: { x: number; y: number }[] = [];

      for (const ev of playbackEvents) {
        const track = TRACKS.find((t) => t.id === ev.trackId);
        if (!track) continue;
        const raw = track.flowFactors[factorName];
        if (typeof raw !== 'number') continue;

        const startMin = minutesFrom9AM(ev.startedAt);
        const endMin = minutesFrom9AM(ev.endedAt);
        const x1 = (startMin / TOTAL_MINUTES) * chartWidth;
        const x2 = (endMin / TOTAL_MINUTES) * chartWidth;
        const y = LANE_HEIGHT - 24 - ((raw / maxVal) * (LANE_HEIGHT - 40));

        points.push({ x: x1, y });
        points.push({ x: x2, y });
      }

      if (points.length === 0) return null;

      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` H ${points[i].x} V ${points[i].y}`;
      }

      return { factorName, color, d, maxVal };
    }).filter(Boolean) as { factorName: string; color: string; d: string; maxVal: number }[];
  }, [selectedFactors, playbackEvents, chartWidth]);

  if (selectedFactors.length === 0) {
    return (
      <div className="kw-lane" style={{ height: LANE_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="kw-empty-text">
          Select factors above to visualize them over the day
        </span>
      </div>
    );
  }

  return (
    <div className="kw-lane" style={{ height: LANE_HEIGHT, position: 'relative', display: 'flex' }}>
      {/* Y-axis labels */}
      <div style={{ width: Y_AXIS_WIDTH, flexShrink: 0, position: 'relative', paddingTop: 8 }}>
        {selectedFactors.map((name, i) => {
          const schema = FLOW_FACTOR_SCHEMA.find((f) => f.name === name);
          const maxVal = schema?.max ?? 10;
          const color = FLOW_FACTOR_COLORS[i % FLOW_FACTOR_COLORS.length];
          return (
            <div
              key={name}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color,
                padding: '2px 6px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, opacity: 0.4, marginRight: 4 }}>
                0–{maxVal}
              </span>
              {name}
            </div>
          );
        })}
      </div>

      {/* SVG chart */}
      <svg
        width={chartWidth > 0 ? chartWidth : 0}
        height={LANE_HEIGHT}
        style={{ flexShrink: 0 }}
      >
        {factorPaths.map((fp) => (
          <path
            key={fp.factorName}
            d={fp.d}
            fill="none"
            stroke={fp.color}
            strokeWidth={2}
            opacity={0.85}
          />
        ))}
      </svg>
    </div>
  );
}
