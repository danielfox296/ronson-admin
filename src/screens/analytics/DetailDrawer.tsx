// ── Kraftwerk V2 — Detail Drawer ──

import { useState } from 'react';
import type { TrackDef } from './kraftwerk-data.js';
import { FLOW_FACTOR_SCHEMA, STATES } from './kraftwerk-data.js';

interface DetailDrawerProps {
  track: TrackDef;
  onClose: () => void;
}

const CATEGORIES = [
  { label: 'Compositional', category: 'Compositional' },
  { label: 'Performance / Expression', category: 'Performance / Expression' },
  { label: 'Production / Signal', category: 'Production / Signal' },
];

export default function DetailDrawer({ track, onClose }: DetailDrawerProps) {
  const state = STATES.find((s) => s.id === track.stateId);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <div className="kw-detail-drawer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="kw-detail-title">{track.title}</div>
          {state && (
            <div className="kw-detail-state">
              {state.name} — {state.description}
            </div>
          )}
        </div>
        <button className="kw-btn-ghost" onClick={onClose} style={{ padding: '2px 10px', fontSize: 16 }}>
          ×
        </button>
      </div>

      {/* Show key factors at a glance, rest behind expand */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
          Key Factors
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {['Tempo', 'Emotional Intensity', 'Reverb Depth', 'Dynamic Range', 'Mix Density'].map((name) => {
            const val = track.flowFactors[name];
            if (val === undefined) return null;
            const schema = FLOW_FACTOR_SCHEMA.find((f) => f.name === name);
            return (
              <div key={name} style={{ minWidth: 100 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{name}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.87)' }}>
                  {val}{schema?.unit ? ` ${schema.unit}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandable full factor breakdown by category */}
      {CATEGORIES.map(({ label, category }) => {
        const factors = FLOW_FACTOR_SCHEMA.filter((f) => f.category === category);
        const isOpen = expandedCategory === category;
        return (
          <div key={category} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setExpandedCategory(isOpen ? null : category)}
            >
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', transition: 'transform 200ms', transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)' }}>▾</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>
                {label}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
                {factors.length} factors
              </span>
            </div>
            {isOpen && (
              <div className="kw-detail-grid" style={{ paddingBottom: 8 }}>
                {factors.map((factor) => {
                  const val = track.flowFactors[factor.name];
                  if (val === undefined) return null;
                  return (
                    <div key={factor.name} className="kw-detail-item">
                      <span className="kw-detail-item-label">{factor.name}</span>
                      <span className="kw-detail-item-value">
                        {val}{factor.unit ? ` ${factor.unit}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
