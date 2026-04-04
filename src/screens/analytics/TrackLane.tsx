// ── Kraftwerk V2 — Track Lane ──

import { useCallback } from 'react';
import type { PlaybackEvent, TrackDef } from './kraftwerk-data.js';

interface TrackLaneProps {
  playbackEvents: PlaybackEvent[];
  tracks: TrackDef[];
  selectedTrackId: string | null;
  onSelectTrack: (id: string | null) => void;
  hoverTime: number | null;
  containerWidth: number;
}

const TOTAL_MINUTES = 720;
const DAY_START_HOUR = 9;

function minutesFrom9AM(d: Date): number {
  return (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export default function TrackLane({
  playbackEvents,
  tracks,
  selectedTrackId,
  onSelectTrack,
  hoverTime: _hoverTime,
  containerWidth,
}: TrackLaneProps) {
  const handleClick = useCallback(
    (trackId: string) => {
      onSelectTrack(selectedTrackId === trackId ? null : trackId);
    },
    [selectedTrackId, onSelectTrack],
  );

  return (
    <div className="kw-lane" style={{ height: 48, position: 'relative' }}>
      <span className="kw-lane-label">Tracks</span>
      {playbackEvents.map((ev, i) => {
        const startMin = minutesFrom9AM(ev.startedAt);
        const endMin = minutesFrom9AM(ev.endedAt);
        const left = (startMin / TOTAL_MINUTES) * containerWidth;
        const width = ((endMin - startMin) / TOTAL_MINUTES) * containerWidth;
        const track = tracks.find((t) => t.id === ev.trackId);
        const title = track?.title ?? ev.trackId;
        const isActive = ev.trackId === selectedTrackId;

        return (
          <div
            key={`${ev.trackId}-${i}`}
            className={`kw-track-seg${isActive ? ' active' : ''}`}
            style={{ left, width: Math.max(width, 1) }}
            onClick={() => handleClick(ev.trackId)}
            title={title}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: '#5ea2b6',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
                padding: '0 6px',
                lineHeight: '44px',
              }}
            >
              {title}
            </span>
          </div>
        );
      })}
    </div>
  );
}
