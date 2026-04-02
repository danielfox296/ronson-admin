// ── Kraftwerk V1 — Confounder Lane ──

import { useMemo } from 'react';
import type { Confounder } from './kraftwerk-data.js';

interface ConfounderLaneProps {
  confounders: Confounder[];
  hoverTime: number | null;
  containerWidth: number;
}

const TOTAL_MINUTES = 720;
const DAY_START_HOUR = 9;
const BAND_HEIGHT = 22;
const BASE_HEIGHT = 40;
const STACK_GAP = 24;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h - DAY_START_HOUR) * 60 + m;
}

const impactBg: Record<string, string> = {
  positive: 'rgba(34,197,94,0.15)',
  negative: 'rgba(239,68,68,0.15)',
  neutral: 'rgba(82,82,82,0.15)',
};

const impactBorder: Record<string, string> = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#525252',
};

export default function ConfounderLane({
  confounders,
  hoverTime: _hoverTime,
  containerWidth,
}: ConfounderLaneProps) {
  // Stack overlapping confounders into rows
  const { rows, laneHeight } = useMemo(() => {
    if (confounders.length === 0) return { rows: [] as { conf: Confounder; row: number }[], laneHeight: BASE_HEIGHT };

    const placed: { conf: Confounder; row: number; startMin: number; endMin: number }[] = [];

    for (const conf of confounders) {
      const startMin = timeToMinutes(conf.startTime);
      const endMin = conf.endTime ? timeToMinutes(conf.endTime) : TOTAL_MINUTES;

      // Find first row where this doesn't overlap
      let row = 0;
      while (true) {
        const conflict = placed.some(
          (p) => p.row === row && p.startMin < endMin && p.endMin > startMin,
        );
        if (!conflict) break;
        row++;
      }
      placed.push({ conf, row, startMin, endMin });
    }

    const maxRow = placed.reduce((m, p) => Math.max(m, p.row), 0);
    return {
      rows: placed,
      laneHeight: BASE_HEIGHT + maxRow * STACK_GAP,
    };
  }, [confounders]);

  if (confounders.length === 0) {
    return (
      <div className="kw-lane" style={{ height: BASE_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="kw-empty-text">No confounders logged today</span>
      </div>
    );
  }

  return (
    <div className="kw-lane" style={{ height: laneHeight, position: 'relative' }}>
      <span className="kw-lane-label">Confounders</span>
      {rows.map(({ conf, row }) => {
        const startMin = timeToMinutes(conf.startTime);
        const endMin = conf.endTime ? timeToMinutes(conf.endTime) : TOTAL_MINUTES;
        const left = (startMin / TOTAL_MINUTES) * containerWidth;
        const width = ((endMin - startMin) / TOTAL_MINUTES) * containerWidth;
        const hasOpenEnd = conf.endTime === null;

        return (
          <div
            key={conf.id}
            style={{
              position: 'absolute',
              top: 12 + row * STACK_GAP,
              left,
              width: Math.max(width, 2),
              height: BAND_HEIGHT,
              background: hasOpenEnd
                ? `linear-gradient(to right, ${impactBg[conf.impact]}, transparent)`
                : impactBg[conf.impact],
              borderLeft: `2px solid ${impactBorder[conf.impact]}`,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 6,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: impactBorder[conf.impact],
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {conf.description}
            </span>
          </div>
        );
      })}
    </div>
  );
}
