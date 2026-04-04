// ── Kraftwerk V2 — Confounder Lane ──

import { useMemo } from 'react';
import type { Confounder } from './kraftwerk-data.js';

interface ConfounderLaneProps {
  confounders: Confounder[];
  hoverTime: number | null;
  containerWidth: number;
}

const TOTAL_MINUTES = 720;
const DAY_START_HOUR = 9;
const BAND_HEIGHT = 24;
const BASE_HEIGHT = 44;
const STACK_GAP = 28;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h - DAY_START_HOUR) * 60 + m;
}

const impactBg: Record<string, string> = {
  positive: 'rgba(51, 190, 106, 0.08)',
  negative: 'rgba(229, 72, 77, 0.08)',
  neutral: 'rgba(255, 255, 255, 0.03)',
};

const impactBorder: Record<string, string> = {
  positive: '#33be6a',
  negative: '#e5484d',
  neutral: 'rgba(255, 255, 255, 0.2)',
};

const impactText: Record<string, string> = {
  positive: '#33be6a',
  negative: '#e5484d',
  neutral: 'rgba(255, 255, 255, 0.4)',
};

export default function ConfounderLane({
  confounders,
  hoverTime: _hoverTime,
  containerWidth,
}: ConfounderLaneProps) {
  const { rows, laneHeight } = useMemo(() => {
    if (confounders.length === 0) return { rows: [] as { conf: Confounder; row: number }[], laneHeight: BASE_HEIGHT };

    const placed: { conf: Confounder; row: number; startMin: number; endMin: number }[] = [];

    for (const conf of confounders) {
      const startMin = timeToMinutes(conf.startTime);
      const endMin = conf.endTime ? timeToMinutes(conf.endTime) : TOTAL_MINUTES;

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
    return { rows: placed, laneHeight: BASE_HEIGHT + maxRow * STACK_GAP };
  }, [confounders]);

  if (confounders.length === 0) {
    return (
      <div className="kw-lane" style={{ height: BASE_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="kw-empty-text">No external factors logged</span>
      </div>
    );
  }

  return (
    <div className="kw-lane" style={{ height: laneHeight, position: 'relative' }}>
      <span className="kw-lane-label">Events</span>
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
              top: 14 + row * STACK_GAP,
              left,
              width: Math.max(width, 2),
              height: BAND_HEIGHT,
              background: hasOpenEnd
                ? `linear-gradient(to right, ${impactBg[conf.impact]}, transparent)`
                : impactBg[conf.impact],
              borderLeft: `2px solid ${impactBorder[conf.impact]}`,
              borderRadius: '0 4px 4px 0',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 8,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: impactText[conf.impact],
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
