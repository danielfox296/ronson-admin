// ── Kraftwerk V1 — Toggle Panel (left sidebar) ──

import { FLOW_FACTOR_SCHEMA, OUTPUT_METRICS } from './kraftwerk-data.js';
import type { Confounder } from './kraftwerk-data.js';

interface TogglePanelProps {
  expandedSections: { sonic: boolean; confounders: boolean; outputs: boolean };
  onToggleSection: (section: 'sonic' | 'confounders' | 'outputs') => void;
  selectedFlowFactors: string[];
  onToggleFlowFactor: (name: string) => void;
  atLimit: boolean;
  selectedOutputMetrics: string[];
  onToggleOutputMetric: (key: string) => void;
  showBaseline: boolean;
  onToggleBaseline: () => void;
  confounders: Confounder[];
  onAddConfounder: () => void;
}

// Only show numeric factors (exclude string-typed ones)
const NUMERIC_FACTORS = FLOW_FACTOR_SCHEMA.filter((f) => f.type === 'numeric');

const CATEGORIES: Array<{ label: string; category: string }> = [
  { label: 'Compositional', category: 'Compositional' },
  { label: 'Performance', category: 'Performance / Expression' },
  { label: 'Production', category: 'Production / Signal' },
];

function Caret({ collapsed }: { collapsed: boolean }) {
  return <span className={`kw-caret ${collapsed ? 'collapsed' : ''}`}>▾</span>;
}

export default function TogglePanel({
  expandedSections,
  onToggleSection,
  selectedFlowFactors,
  onToggleFlowFactor,
  atLimit,
  selectedOutputMetrics,
  onToggleOutputMetric,
  showBaseline,
  onToggleBaseline,
  confounders,
  onAddConfounder,
}: TogglePanelProps) {
  return (
    <div className="kw-toggle-panel">
      {/* ── Sonic Inputs ── */}
      <div
        className="kw-section-header"
        onClick={() => onToggleSection('sonic')}
      >
        <Caret collapsed={!expandedSections.sonic} />
        Sonic Inputs
      </div>

      {expandedSections.sonic && (
        <div className="kw-section-content">
          {/* Always-visible track segments indicator */}
          <div className="kw-track-indicator">
            <div className="kw-track-indicator-bar" />
            <label>Track Segments</label>
          </div>

          {/* Flow factor checkboxes by category */}
          {CATEGORIES.map(({ label, category }) => {
            const factors = NUMERIC_FACTORS.filter((f) => f.category === category);
            return (
              <div key={category}>
                <div className="kw-subsection-label">{label}</div>
                {factors.map((factor) => {
                  const isSelected = selectedFlowFactors.includes(factor.name);
                  const isDisabled = !isSelected && atLimit;
                  return (
                    <div
                      key={factor.name}
                      className="kw-factor-row"
                      onClick={() => {
                        if (!isDisabled) onToggleFlowFactor(factor.name);
                      }}
                    >
                      <div
                        className={`kw-factor-cb ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}`}
                      />
                      <label>{factor.name}</label>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {atLimit && (
            <div className="kw-factor-limit-note">5 factor limit</div>
          )}
        </div>
      )}

      <div className="kw-separator" />

      {/* ── Confounders ── */}
      <div
        className="kw-section-header"
        onClick={() => onToggleSection('confounders')}
      >
        <Caret collapsed={!expandedSections.confounders} />
        Confounders
      </div>

      {expandedSections.confounders && (
        <div className="kw-section-content">
          {confounders.length === 0 ? (
            <>
              <div className="kw-empty-text">No confounders logged</div>
              <button className="kw-add-link" onClick={onAddConfounder}>
                + Add
              </button>
            </>
          ) : (
            <>
              {confounders.map((c) => (
                <div key={c.id} className="kw-confounder-item">
                  <div className={`kw-confounder-dot ${c.impact}`} />
                  <div>
                    <div className="kw-confounder-text">{c.description}</div>
                    <div className="kw-confounder-time">
                      {c.startTime}{c.endTime ? ` – ${c.endTime}` : '+'}
                    </div>
                  </div>
                </div>
              ))}
              <button className="kw-add-link" onClick={onAddConfounder}>
                + Add
              </button>
            </>
          )}
        </div>
      )}

      <div className="kw-separator" />

      {/* ── Outputs ── */}
      <div
        className="kw-section-header"
        onClick={() => onToggleSection('outputs')}
      >
        <Caret collapsed={!expandedSections.outputs} />
        Outputs
      </div>

      {expandedSections.outputs && (
        <div className="kw-section-content">
          {OUTPUT_METRICS.map((m) => {
            const isActive = selectedOutputMetrics.includes(m.key);
            return (
              <div
                key={m.key}
                className={`kw-metric-row ${isActive ? 'active' : ''}`}
                onClick={() => onToggleOutputMetric(m.key)}
              >
                <div
                  className="kw-metric-swatch"
                  style={{ background: isActive ? m.color : '#2a2a2a' }}
                />
                <div
                  className={`kw-factor-cb ${isActive ? 'checked' : ''}`}
                  style={isActive ? { background: m.color, borderColor: m.color } : {}}
                />
                <label>{m.label}</label>
              </div>
            );
          })}

          <div className="kw-baseline-toggle">
            <div
              className={`kw-factor-cb ${showBaseline ? 'checked' : ''}`}
              onClick={onToggleBaseline}
              style={showBaseline ? { background: '#737373', borderColor: '#737373' } : {}}
            />
            <label onClick={onToggleBaseline}>Show baseline</label>
          </div>
        </div>
      )}
    </div>
  );
}
