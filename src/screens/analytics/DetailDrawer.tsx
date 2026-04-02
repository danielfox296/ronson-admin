// ── Kraftwerk V1 — Detail Drawer ──

import type { TrackDef } from './kraftwerk-data.js';
import { FLOW_FACTOR_SCHEMA, STATES } from './kraftwerk-data.js';

interface DetailDrawerProps {
  track: TrackDef;
  onClose: () => void;
}

export default function DetailDrawer({ track, onClose }: DetailDrawerProps) {
  const state = STATES.find((s) => s.id === track.stateId);

  return (
    <div className="kw-detail-drawer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="kw-detail-title">{track.title}</div>
        <button className="kw-btn-ghost" onClick={onClose} style={{ padding: '2px 8px' }}>
          ×
        </button>
      </div>

      {state && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#525252', marginBottom: 8 }}>
          {state.name} — {state.description}
        </div>
      )}

      <div className="kw-detail-grid">
        {FLOW_FACTOR_SCHEMA.map((factor) => {
          const val = track.flowFactors[factor.name];
          if (val === undefined) return null;
          return (
            <div key={factor.name} className="kw-detail-item">
              <span className="kw-detail-item-label">{factor.name}</span>
              <span className="kw-detail-item-value">
                {typeof val === 'number' ? val : val}
                {factor.unit ? ` ${factor.unit}` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
