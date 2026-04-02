// ── Kraftwerk V1 — Health Strip Lane ──

import { useMemo } from 'react';
import type { PlaybackEvent } from './kraftwerk-data.js';

interface HealthStripProps {
  storeId: string;
  selectedDate: string;
  playbackEvents: PlaybackEvent[];
}

const TOTAL_BINS = 48; // 15-min intervals over 12 hours (9AM–9PM)
const BIN_MINUTES = 15;
const DAY_START_HOUR = 9;

export default function HealthStrip({ storeId: _storeId, selectedDate, playbackEvents }: HealthStripProps) {
  const bins = useMemo(() => {
    const today = new Date();
    const isToday = selectedDate === today.toISOString().slice(0, 10);
    const nowMinutes = isToday ? today.getHours() * 60 + today.getMinutes() - DAY_START_HOUR * 60 : Infinity;

    return Array.from({ length: TOTAL_BINS }, (_, i) => {
      const binStartMin = i * BIN_MINUTES;
      const binEndMin = binStartMin + BIN_MINUTES;

      if (isToday && binStartMin > nowMinutes) {
        return 'future';
      }

      const hasCoverage = playbackEvents.some((ev) => {
        const evStartMin =
          (ev.startedAt.getHours() - DAY_START_HOUR) * 60 + ev.startedAt.getMinutes();
        const evEndMin =
          (ev.endedAt.getHours() - DAY_START_HOUR) * 60 + ev.endedAt.getMinutes();
        return evStartMin < binEndMin && evEndMin > binStartMin;
      });

      return hasCoverage ? 'complete' : 'missing';
    });
  }, [playbackEvents, selectedDate]);

  const classMap: Record<string, string> = {
    complete: 'kw-health-complete',
    missing: 'kw-health-missing',
    future: 'kw-health-future',
  };

  return (
    <div className="kw-lane" style={{ height: 20, display: 'flex' }}>
      <span className="kw-lane-label">Health</span>
      {bins.map((status, i) => (
        <div
          key={i}
          className={classMap[status]}
          style={{
            flex: 1,
            height: '100%',
            borderRight: i < TOTAL_BINS - 1 ? '1px solid #0a0a0a' : undefined,
          }}
        />
      ))}
    </div>
  );
}
