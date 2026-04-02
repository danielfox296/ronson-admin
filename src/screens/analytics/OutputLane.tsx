// ── Kraftwerk V1 — Output Lane (Recharts) ──

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { OutcomeBin } from './kraftwerk-data.js';
import { OUTPUT_METRICS } from './kraftwerk-data.js';

interface OutputLaneProps {
  outcomeBins: OutcomeBin[];
  baselineBins: OutcomeBin[] | null;
  selectedMetrics: string[];
  showBaseline: boolean;
  hoverTime: number | null;
}

const LANE_HEIGHT = 220;

// Map metric keys to OutcomeBin field names — they're the same in our schema
// selectedMetrics already uses keys like "conversionRate", "aov", etc.

export default function OutputLane({
  outcomeBins,
  baselineBins,
  selectedMetrics,
  showBaseline,
  hoverTime: _hoverTime,
}: OutputLaneProps) {
  // Merge baseline data into the chart data if needed
  const chartData = useMemo(() => {
    return outcomeBins.map((bin, i) => {
      const row: Record<string, string | number> = { time: bin.time };
      for (const key of selectedMetrics) {
        row[key] = (bin as unknown as Record<string, number>)[key];
      }
      if (showBaseline && baselineBins && baselineBins[i]) {
        for (const key of selectedMetrics) {
          row[`${key}_baseline`] = (baselineBins[i] as unknown as Record<string, number>)[key];
        }
      }
      return row;
    });
  }, [outcomeBins, baselineBins, selectedMetrics, showBaseline]);

  const metricDefs = useMemo(() => {
    return selectedMetrics
      .map((key) => OUTPUT_METRICS.find((m) => m.key === key))
      .filter(Boolean) as typeof OUTPUT_METRICS;
  }, [selectedMetrics]);

  if (selectedMetrics.length === 0) {
    return (
      <div className="kw-lane" style={{ height: LANE_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="kw-empty-text">Select output metrics from the panel</span>
      </div>
    );
  }

  return (
    <div className="kw-lane" style={{ height: LANE_HEIGHT, position: 'relative' }}>
      <span className="kw-lane-label">Outputs</span>
      <ResponsiveContainer width="100%" height={LANE_HEIGHT}>
        <AreaChart data={chartData} margin={{ top: 16, right: 12, bottom: 4, left: 4 }}>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: '#3a3a3a' }}
            axisLine={{ stroke: '#1e1e1e' }}
            tickLine={false}
            interval={3}
          />

          {/* First metric gets left Y-axis */}
          {metricDefs[0] && (
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: metricDefs[0].color }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
          )}

          {/* Second metric gets right Y-axis */}
          {metricDefs.length >= 2 && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: metricDefs[1].color }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
          )}

          <Tooltip
            contentStyle={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              color: '#737373',
            }}
            labelStyle={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: '#525252',
            }}
          />

          {/* Primary metric areas */}
          {metricDefs.map((md, idx) => (
            <Area
              key={md.key}
              type="monotone"
              dataKey={md.key}
              stroke={md.color}
              strokeWidth={1.5}
              fill={md.color}
              fillOpacity={0.08}
              yAxisId={idx <= 1 ? (idx === 0 ? 'left' : 'right') : 'left'}
              name={md.label}
              dot={false}
              activeDot={{ r: 2, strokeWidth: 0 }}
            />
          ))}

          {/* Baseline dashed overlays */}
          {showBaseline &&
            baselineBins &&
            metricDefs.map((md, idx) => (
              <Area
                key={`${md.key}_baseline`}
                type="monotone"
                dataKey={`${md.key}_baseline`}
                stroke={md.color}
                strokeWidth={1}
                strokeOpacity={0.4}
                strokeDasharray="4 4"
                fill="none"
                yAxisId={idx <= 1 ? (idx === 0 ? 'left' : 'right') : 'left'}
                name={`${md.label} (baseline)`}
                dot={false}
                activeDot={false}
              />
            ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
