// ── Kraftwerk V2 — Output Lane (Recharts) ──

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

const LANE_HEIGHT = 240;

export default function OutputLane({
  outcomeBins,
  baselineBins,
  selectedMetrics,
  showBaseline,
  hoverTime: _hoverTime,
}: OutputLaneProps) {
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
        <span className="kw-empty-text">Select metrics above to chart them</span>
      </div>
    );
  }

  return (
    <div className="kw-lane" style={{ height: LANE_HEIGHT, position: 'relative' }}>
      <ResponsiveContainer width="100%" height={LANE_HEIGHT}>
        <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fill: 'rgba(255,255,255,0.2)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
            tickLine={false}
            interval={3}
          />

          {metricDefs[0] && (
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fill: 'rgba(255,255,255,0.35)' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
          )}

          {metricDefs.length >= 2 && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fill: 'rgba(255,255,255,0.35)' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
          )}

          <Tooltip
            contentStyle={{
              background: '#1b1b24',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              color: 'rgba(255,255,255,0.87)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
            labelStyle={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
            }}
          />

          {metricDefs.map((md, idx) => (
            <Area
              key={md.key}
              type="monotone"
              dataKey={md.key}
              stroke={md.color}
              strokeWidth={2}
              fill={md.color}
              fillOpacity={0.06}
              yAxisId={idx <= 1 ? (idx === 0 ? 'left' : 'right') : 'left'}
              name={md.label}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: md.color }}
            />
          ))}

          {showBaseline &&
            baselineBins &&
            metricDefs.map((md, idx) => (
              <Area
                key={`${md.key}_baseline`}
                type="monotone"
                dataKey={`${md.key}_baseline`}
                stroke={md.color}
                strokeWidth={1}
                strokeOpacity={0.3}
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
