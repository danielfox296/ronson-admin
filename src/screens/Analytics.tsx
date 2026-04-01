import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import {
  FLOW_FACTORS, PSY_OVERLAY, TRACKS, ROTATION_DATA, TIMELINE_DATA,
  CORRELATION_TABLE, BUMP_DATA, CAPITAL_DATA, HEATMAP_DATA, HEATMAP_DAYS,
  STATE_BLOCKS, STATE_TRANSITIONS, REGRESSION_DATA, LIFT_EVENTS,
  CONSTRAINT_PIPELINE,
  type FlowFactor,
} from "./analytics-data.js";

// ─── Scoped Styles ──────────────────────────────────────────────────────────
// All selectors scoped under .ronson-analytics to prevent bleed into admin app.

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=Syne+Mono&display=swap');

  .ronson-analytics {
    --ra-bg:       #080808;
    --ra-surface:  #0d0d0d;
    --ra-border:   #1a1a1a;
    --ra-border2:  #141414;
    --ra-text:     #e0e0e0;
    --ra-muted:    #555;
    --ra-dim:      #333;
    --ra-gold:     #c9a84c;
    --ra-teal:     #2dd4bf;
    --ra-violet:   #a78bfa;
    --ra-red:      #f87171;
    --ra-font:     'Syne', sans-serif;
    --ra-mono:     'Syne Mono', monospace;

    font-family: var(--ra-font);
    font-size: 13px;
    -webkit-font-smoothing: antialiased;
    color: var(--ra-text);
  }

  /* Tab strip (replaces sidebar) */
  .ra-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }
  .ra-title {
    font-family: var(--ra-mono);
    font-size: 10px;
    letter-spacing: 0.18em;
    color: var(--ra-gold);
    text-transform: uppercase;
    margin-right: 8px;
  }
  .ra-tabs {
    display: flex;
    gap: 2px;
    flex: 1;
  }
  .ra-tab {
    font-family: var(--ra-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 6px 12px;
    color: var(--ra-dim);
    cursor: pointer;
    border: 1px solid transparent;
    background: transparent;
    transition: color 0.12s, border-color 0.12s;
    user-select: none;
  }
  .ra-tab:hover { color: #666; }
  .ra-tab.active {
    color: var(--ra-text);
    border-color: var(--ra-border);
    background: var(--ra-surface);
  }
  .ra-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
  }
  .ra-store {
    font-family: var(--ra-mono);
    font-size: 11px;
    color: #888;
    background: transparent;
    border: 1px solid #222;
    padding: 4px 10px;
    outline: none;
    cursor: pointer;
    appearance: none;
  }
  .ra-live {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--ra-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    color: var(--ra-teal);
    text-transform: uppercase;
  }
  .ra-live-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--ra-teal);
    animation: ra-blink 2.5s ease-in-out infinite;
  }
  @keyframes ra-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.25; }
  }

  /* Layout helpers */
  .ronson-analytics .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ronson-analytics .g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .ronson-analytics .g4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .ronson-analytics .g-6-4 { display: grid; grid-template-columns: 3fr 2fr; gap: 14px; }
  .ronson-analytics .gap { height: 16px; }
  .ronson-analytics .gap-sm { height: 10px; }

  /* Cards */
  .ronson-analytics .card {
    background: var(--ra-surface);
    border: 1px solid var(--ra-border);
    padding: 14px 16px;
  }
  .ronson-analytics .card-label {
    font-family: var(--ra-mono);
    font-size: 8px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ra-dim);
    margin-bottom: 8px;
  }
  .ronson-analytics .card-value {
    font-family: var(--ra-mono);
    font-size: 20px;
    color: var(--ra-text);
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .ronson-analytics .card-sub {
    font-family: var(--ra-mono);
    font-size: 9px;
    color: var(--ra-teal);
    margin-top: 6px;
    letter-spacing: 0.05em;
  }
  .ronson-analytics .card-sub.neg { color: var(--ra-red); }

  /* Section header */
  .ronson-analytics .sh {
    font-family: var(--ra-mono);
    font-size: 8px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--ra-dim);
    margin-bottom: 10px;
  }

  /* Now playing */
  .ronson-analytics .now-playing {
    background: var(--ra-surface);
    border: 1px solid var(--ra-border);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .ronson-analytics .disc {
    width: 38px; height: 38px; border-radius: 50%;
    background: conic-gradient(var(--ra-gold) 0deg 140deg, #1a1a1a 140deg 360deg);
    flex-shrink: 0;
    animation: ra-spin 10s linear infinite;
    position: relative;
  }
  .ronson-analytics .disc::after {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--ra-surface);
  }
  @keyframes ra-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .ronson-analytics .track-name { font-size: 14px; font-weight: 600; color: var(--ra-text); margin-bottom: 4px; }
  .ronson-analytics .track-meta { font-family: var(--ra-mono); font-size: 9px; color: var(--ra-muted); letter-spacing: 0.05em; }
  .ronson-analytics .state-pill {
    font-family: var(--ra-mono);
    font-size: 9px;
    color: var(--ra-gold);
    border: 1px solid rgba(201,168,76,0.28);
    padding: 4px 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-left: auto;
    flex-shrink: 0;
  }

  /* Table */
  .ronson-analytics .tbl { width: 100%; border-collapse: collapse; font-family: var(--ra-mono); font-size: 11px; }
  .ronson-analytics .tbl th {
    text-align: left;
    padding: 8px 10px;
    font-size: 8px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ra-dim);
    border-bottom: 1px solid var(--ra-border);
    font-weight: 400;
  }
  .ronson-analytics .tbl td {
    padding: 9px 10px;
    border-bottom: 1px solid var(--ra-border2);
    color: var(--ra-muted);
  }
  .ronson-analytics .tbl tr.active-row td { color: var(--ra-text); background: rgba(201,168,76,0.035); }

  /* Flow factor rows */
  .ronson-analytics .ff-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    border-bottom: 1px solid #0f0f0f;
  }
  .ronson-analytics .ff-name {
    font-family: var(--ra-mono);
    font-size: 10px;
    color: var(--ra-muted);
    width: 148px;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }
  .ronson-analytics .ff-track { flex: 1; height: 1px; background: #1c1c1c; position: relative; }
  .ronson-analytics .ff-bar {
    position: absolute;
    left: 0; top: 0;
    height: 100%;
    background: var(--ra-gold);
    opacity: 0.65;
  }
  .ronson-analytics .ff-val {
    font-family: var(--ra-mono);
    font-size: 9px;
    color: var(--ra-dim);
    width: 64px;
    text-align: right;
    flex-shrink: 0;
  }
  .ronson-analytics .cat-head {
    font-family: var(--ra-mono);
    font-size: 8px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #2a2a2a;
    padding: 10px 0 5px;
    border-top: 1px solid #111;
    margin-top: 2px;
  }
  .ronson-analytics .cat-head:first-child { border-top: none; padding-top: 0; }

  /* Correlation */
  .ronson-analytics .corr { font-family: var(--ra-mono); font-size: 11px; }
  .ronson-analytics .corr-pos { color: var(--ra-teal); }
  .ronson-analytics .corr-neg { color: var(--ra-red); }
  .ronson-analytics .corr-neutral { color: #3a3a3a; }

  /* Legend */
  .ronson-analytics .legend {
    display: flex;
    gap: 16px;
    margin-top: 10px;
    font-family: var(--ra-mono);
    font-size: 9px;
    color: var(--ra-dim);
    letter-spacing: 0.1em;
  }
  .ronson-analytics .legend-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 5px; }

  /* Era grid */
  .ronson-analytics .era-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .ronson-analytics .era-row { font-family: var(--ra-mono); font-size: 10px; color: var(--ra-muted); line-height: 1.6; }
  .ronson-analytics .era-row span { color: var(--ra-gold); }
  .ronson-analytics .era-row span.avoid { color: var(--ra-red); }
  .ronson-analytics .era-row span.secondary { color: #666; }

  /* ── Phase 2 ── */

  .ronson-analytics .phase-tag {
    display: inline-block;
    font-family: var(--ra-mono);
    font-size: 7px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #2a2a2a;
    border: 1px solid #1a1a1a;
    padding: 2px 6px;
    margin-left: 8px;
    vertical-align: middle;
  }

  .ronson-analytics .heatmap {
    display: grid;
    gap: 2px;
    grid-template-columns: 90px repeat(7, 1fr);
  }
  .ronson-analytics .heatmap-header {
    font-family: var(--ra-mono);
    font-size: 8px;
    color: var(--ra-dim);
    text-align: center;
    padding: 4px 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .ronson-analytics .heatmap-track {
    font-family: var(--ra-mono);
    font-size: 9px;
    color: var(--ra-muted);
    display: flex;
    align-items: center;
    padding: 0 4px;
  }
  .ronson-analytics .heatmap-cell {
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--ra-mono);
    font-size: 8px;
    color: rgba(255,255,255,0.4);
  }

  .ronson-analytics .state-timeline {
    display: flex;
    height: 34px;
    border: 1px solid var(--ra-border);
    overflow: hidden;
  }
  .ronson-analytics .state-block {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--ra-mono);
    font-size: 7px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
    position: relative;
    overflow: hidden;
    white-space: nowrap;
  }
  .ronson-analytics .state-block-time {
    position: absolute;
    bottom: 2px;
    left: 4px;
    font-size: 6px;
    color: rgba(255,255,255,0.2);
  }

  .ronson-analytics .upload-stub {
    border: 1px dashed #222;
    padding: 20px;
    text-align: center;
    font-family: var(--ra-mono);
    font-size: 10px;
    color: #2a2a2a;
    letter-spacing: 0.08em;
  }
  .ronson-analytics .upload-stub-btn {
    display: inline-block;
    margin-top: 10px;
    padding: 6px 14px;
    font-family: var(--ra-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #333;
    border: 1px solid #222;
    background: transparent;
    cursor: not-allowed;
    opacity: 0.5;
  }

  .ronson-analytics .window-sel { display: flex; gap: 4px; margin-bottom: 12px; }
  .ronson-analytics .window-pill {
    font-family: var(--ra-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 4px 10px;
    border: 1px solid #1a1a1a;
    background: transparent;
    color: #333;
    cursor: pointer;
    transition: all 0.12s;
  }
  .ronson-analytics .window-pill.active {
    color: var(--ra-gold);
    border-color: rgba(201,168,76,0.3);
    background: rgba(201,168,76,0.05);
  }

  .ronson-analytics .reg-sig { color: var(--ra-teal); }
  .ronson-analytics .reg-ns { color: #2a2a2a; }

  .ronson-analytics .lift-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    border-bottom: 1px solid #111;
    font-family: var(--ra-mono);
    font-size: 10px;
  }
  .ronson-analytics .lift-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .ronson-analytics .lift-pos { background: var(--ra-teal); }
  .ronson-analytics .lift-neg { background: var(--ra-red); }
  .ronson-analytics .lift-label { color: var(--ra-muted); flex: 1; }
  .ronson-analytics .lift-meta { color: var(--ra-dim); font-size: 9px; width: 90px; text-align: right; }

  .ronson-analytics .weight-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid #111;
  }
  .ronson-analytics .weight-label {
    font-family: var(--ra-mono);
    font-size: 10px;
    color: var(--ra-muted);
    width: 56px;
    flex-shrink: 0;
  }
  .ronson-analytics .weight-track {
    flex: 1;
    height: 1px;
    background: #1c1c1c;
    position: relative;
  }
  .ronson-analytics .weight-fill {
    position: absolute;
    left: 0; top: 0;
    height: 100%;
    background: var(--ra-gold);
    opacity: 0.5;
  }
  .ronson-analytics .weight-handle {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--ra-gold);
    opacity: 0.7;
    cursor: not-allowed;
  }
  .ronson-analytics .weight-val {
    font-family: var(--ra-mono);
    font-size: 9px;
    color: var(--ra-dim);
    width: 32px;
    text-align: right;
  }

  .ronson-analytics .constraint-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 7px 0;
    border-bottom: 1px solid #111;
    font-family: var(--ra-mono);
    font-size: 9px;
    line-height: 1.5;
  }
  .ronson-analytics .constraint-source { color: var(--ra-gold); width: 90px; flex-shrink: 0; }
  .ronson-analytics .constraint-arrow { color: #222; flex-shrink: 0; }
  .ronson-analytics .constraint-rule { color: var(--ra-muted); flex: 1; }

  .ronson-analytics .edit-stub-btn {
    display: inline-block;
    padding: 5px 12px;
    font-family: var(--ra-mono);
    font-size: 8px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #2a2a2a;
    border: 1px solid #1a1a1a;
    background: transparent;
    cursor: not-allowed;
    opacity: 0.5;
    margin-top: 8px;
  }

  .ronson-analytics .cohort-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid #111;
  }
  .ronson-analytics .cohort-name {
    font-family: var(--ra-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    width: 72px;
    flex-shrink: 0;
  }
  .ronson-analytics .cohort-primary { color: var(--ra-gold); }
  .ronson-analytics .cohort-secondary { color: #555; }
  .ronson-analytics .cohort-detail {
    font-family: var(--ra-mono);
    font-size: 10px;
    color: var(--ra-muted);
    flex: 1;
  }
  .ronson-analytics .cohort-era {
    font-family: var(--ra-mono);
    font-size: 9px;
    color: var(--ra-dim);
    width: 90px;
    text-align: right;
  }
`;

// ─── Primitives ─────────────────────────────────────────────────────────────

function KPI({ label, value, sub, neg }: { label: string; value: string; sub?: string; neg?: boolean }) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value">{value}</div>
      {sub && <div className={`card-sub${neg ? " neg" : ""}`}>{sub}</div>}
    </div>
  );
}

function FactorRow({ name, value, unit, display, max = 10 }: FlowFactor) {
  const pct = value != null ? Math.min((value / max!) * 100, 100) : null;
  return (
    <div className="ff-row">
      <div className="ff-name">{name}</div>
      <div className="ff-track">
        {pct != null && <div className="ff-bar" style={{ width: `${pct}%` }} />}
      </div>
      <div className="ff-val">
        {display || (value != null ? `${value}${unit || ""}` : "\u2014")}
      </div>
    </div>
  );
}

function CorrCell({ v }: { v: number }) {
  const cls = v > 0.3 ? "corr-pos" : v < -0.15 ? "corr-neg" : "corr-neutral";
  return <span className={`corr ${cls}`}>{v > 0 ? "+" : ""}{v.toFixed(2)}</span>;
}

const TT_STYLE = { background: "#111", border: "1px solid #222", color: "#888", fontSize: 10, fontFamily: "'Syne Mono', monospace" };
const TICK = { fill: "#333", fontSize: 9, fontFamily: "'Syne Mono', monospace" };

// ─── Sections ───────────────────────────────────────────────────────────────

function Overview() {
  return (
    <div>
      <div className="sh">Command Center</div>
      <div className="g4">
        <KPI label="Active State" value="Ambient Anchor" sub={"\u2192 Social Warm at 17:00"} />
        <KPI label="Tracks Today" value="15" sub="5 unique titles" />
        <KPI label={"Avg Dwell \u0394"} value="+6.4 min" sub="vs. 30-day baseline" />
        <KPI label="POS Lift" value="+23%" sub="vs. 30-day avg" />
      </div>

      <div className="gap" />
      <div className="sh">Now Playing</div>
      <div className="now-playing">
        <div className="disc" />
        <div style={{ flex: 1 }}>
          <div className="track-name">Drift-001</div>
          <div className="track-meta">3:12 &middot; Play 4 of 6 today &middot; Started 14:22</div>
        </div>
        <div className="state-pill">Ambient Anchor</div>
      </div>

      <div className="gap" />
      <div className="sh">Today's Outcome Timeline</div>
      <div className="card">
        <ResponsiveContainer width="100%" height={158}>
          <AreaChart data={TIMELINE_DATA} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="raGFT" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="raGPOS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={TICK} axisLine={false} tickLine={false} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TT_STYLE} />
            <Area type="monotone" dataKey="footTraffic" stroke="#c9a84c" fill="url(#raGFT)" strokeWidth={1.5} dot={false} name="Foot Traffic" />
            <Area type="monotone" dataKey="pos" stroke="#2dd4bf" fill="url(#raGPOS)" strokeWidth={1.5} dot={false} name="POS Transactions" />
            {STATE_TRANSITIONS.map(t => (
              <ReferenceLine key={t.time} x={t.time} stroke="#c9a84c" strokeDasharray="3 3" strokeOpacity={0.25} label={{ value: t.state, position: "top", fill: "#333", fontSize: 7, fontFamily: "'Syne Mono', monospace" }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <div className="legend">
          <span><span className="legend-dot" style={{ background: "#c9a84c" }} />Foot Traffic</span>
          <span><span className="legend-dot" style={{ background: "#2dd4bf" }} />POS Transactions</span>
          <span style={{ color: "#333" }}>{"\u2506"} State Transitions</span>
        </div>
      </div>
    </div>
  );
}

function Playback() {
  return (
    <div>
      <div className="sh">Track Queue &amp; History</div>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th><th>Track ID</th><th>Psychological State</th>
              <th>Duration</th><th>Plays Today</th><th>Last Played</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {TRACKS.map(t => (
              <tr key={t.id} className={t.status === "active" ? "active-row" : ""}>
                <td>{t.id}</td>
                <td>{t.name}</td>
                <td>{t.state}</td>
                <td>{t.duration}</td>
                <td>{t.plays}</td>
                <td>{t.lastPlayed}</td>
                <td>
                  <span style={{ color: t.status === "active" ? "#c9a84c" : "#2a2a2a", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--ra-mono)" }}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="gap" />
      <div className="sh">Rotation Frequency &mdash; Today</div>
      <div className="card">
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={ROTATION_DATA} margin={{ top: 4, right: 6, bottom: 0, left: -22 }}>
            <XAxis dataKey="track" tick={TICK} axisLine={false} tickLine={false} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TT_STYLE} />
            <Bar dataKey="plays" fill="#c9a84c" fillOpacity={0.65} radius={[2, 2, 0, 0]} name="Plays" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="gap" />
      <div className="sh">7-Day Rotation Calendar<span className="phase-tag">Phase 2</span></div>
      <div className="card">
        <div className="heatmap">
          <div />
          {HEATMAP_DAYS.map(d => <div key={d} className="heatmap-header">{d}</div>)}
          {HEATMAP_DATA.map(row => (
            <React.Fragment key={row.track}>
              <div className="heatmap-track">{row.track}</div>
              {row.days.map((v, i) => (
                <div key={i} className="heatmap-cell" style={{ background: `rgba(201,168,76,${Math.min(v / 6, 1) * 0.45})` }}>
                  {v}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="gap" />
      <div className="sh">Scheduled State Blocks &mdash; Today<span className="phase-tag">Phase 2</span></div>
      <div className="card" style={{ padding: "10px 0" }}>
        <div className="state-timeline">
          {STATE_BLOCKS.map((b, i) => {
            const totalHours = 21 - 9;
            const width = ((b.end - b.start) / totalHours) * 100;
            return (
              <div key={i} className="state-block" style={{ width: `${width}%`, background: `${b.color}22`, borderRight: "1px solid #111" }}>
                {b.state}
                <span className="state-block-time">{b.start}:00</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="gap" />
      <div className="sh">Track Upload &mdash; Eno Integration<span className="phase-tag">Phase 2</span></div>
      <div className="upload-stub">
        Generate from state specification or upload directly to R2
        <br />
        <span className="upload-stub-btn">Upload Track</span>
        <span className="upload-stub-btn" style={{ marginLeft: 6 }}>Generate via Eno</span>
      </div>
    </div>
  );
}

function Parameters() {
  return (
    <div className="g-6-4">
      <div>
        <div className="sh">Flow Factors &mdash; Current Track (31 Variables)</div>
        <div className="card">
          {Object.entries(FLOW_FACTORS).map(([cat, factors]) => (
            <div key={cat}>
              <div className="cat-head">{cat}</div>
              {factors.map(f => <FactorRow key={f.name} {...f} />)}
            </div>
          ))}
          <div className="edit-stub-btn" title="Available in Phase 2">Edit Factors</div>
        </div>
      </div>

      <div>
        <div className="sh">Psychological Coordinates<span className="phase-tag">Target vs Actual</span></div>
        <div className="card">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={PSY_OVERLAY} margin={{ top: 10, right: 18, bottom: 10, left: 18 }}>
              <PolarGrid stroke="#1e1e1e" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "#444", fontSize: 9, fontFamily: "'Syne Mono', monospace" }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar dataKey="target" stroke="#c9a84c" fill="#c9a84c" fillOpacity={0.12} strokeWidth={1.5} dot={false} name="Target" />
              <Radar dataKey="actual" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Actual (est.)" />
            </RadarChart>
          </ResponsiveContainer>
          <div className="legend">
            <span><span className="legend-dot" style={{ background: "#c9a84c" }} />Target</span>
            <span><span className="legend-dot" style={{ background: "#2dd4bf" }} />Actual (Miles est.)</span>
          </div>
        </div>

        <div className="gap-sm" />
        <div className="sh">Active Named State</div>
        <div className="card">
          <div className="card-label">Recipe</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#c9a84c", marginBottom: 6, letterSpacing: "0.01em" }}>Ambient Anchor</div>
          <div style={{ fontFamily: "var(--ra-mono)", fontSize: 9, color: "#333", lineHeight: 1.6, letterSpacing: "0.03em", marginBottom: 10 }}>
            Low-arousal, positive-valence hold state for extended dwell. Optimised for mid-afternoon browsing windows.
          </div>
          <div style={{ fontFamily: "var(--ra-mono)", fontSize: 9, color: "#444", lineHeight: 2, letterSpacing: "0.05em" }}>
            <div>Arousal <span style={{ color: "#666" }}>55</span> &nbsp;&middot;&nbsp; Valence <span style={{ color: "#666" }}>65</span></div>
            <div>Temporal <span style={{ color: "#666" }}>45</span> &nbsp;&middot;&nbsp; Social Dist. <span style={{ color: "#666" }}>60</span></div>
            <div>Self-Focus <span style={{ color: "#666" }}>40</span></div>
          </div>
        </div>

        <div className="gap-sm" />
        <div className="sh">Scheduled State Transitions</div>
        <div className="card">
          {[
            { time: "17:00", state: "Social Warm" },
            { time: "18:30", state: "Ambient Anchor" },
            { time: "20:00", state: "Closing Drift" },
          ].map(s => (
            <div key={s.time} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #111" }}>
              <span style={{ fontFamily: "var(--ra-mono)", fontSize: 10, color: "#444" }}>{s.time}</span>
              <span style={{ fontFamily: "var(--ra-mono)", fontSize: 9, color: "#555", letterSpacing: "0.05em" }}>{s.state}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Correlation() {
  const [timeWindow, setTimeWindow] = useState("7d");
  return (
    <div>
      <div className="window-sel">
        {["7d", "30d", "all"].map(w => (
          <button key={w} className={`window-pill${timeWindow === w ? " active" : ""}`} onClick={() => setTimeWindow(w)}>
            {w === "all" ? "All Time" : w}
          </button>
        ))}
        <span className="phase-tag" style={{ alignSelf: "center" }}>Phase 2</span>
      </div>

      <div className="sh">Retail Outcome Timeline &mdash; All Metrics</div>
      <div className="card">
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={TIMELINE_DATA} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="raGFT2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="raGDW" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="raGPOS2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={TICK} axisLine={false} tickLine={false} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TT_STYLE} />
            <Area type="monotone" dataKey="footTraffic" stroke="#c9a84c" fill="url(#raGFT2)" strokeWidth={1.5} dot={false} name="Foot Traffic" />
            <Area type="monotone" dataKey="dwell"       stroke="#a78bfa" fill="url(#raGDW)"  strokeWidth={1.5} dot={false} name="Dwell (min)" />
            <Area type="monotone" dataKey="pos"         stroke="#2dd4bf" fill="url(#raGPOS2)" strokeWidth={1.5} dot={false} name="POS Transactions" />
            {STATE_TRANSITIONS.map(t => (
              <ReferenceLine key={t.time} x={t.time} stroke="#c9a84c" strokeDasharray="3 3" strokeOpacity={0.2} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <div className="legend">
          <span><span className="legend-dot" style={{ background: "#c9a84c" }} />Foot Traffic</span>
          <span><span className="legend-dot" style={{ background: "#a78bfa" }} />Dwell Time (min)</span>
          <span><span className="legend-dot" style={{ background: "#2dd4bf" }} />POS Transactions</span>
        </div>
      </div>

      <div className="gap" />
      <div className="sh">Parameter &times; Outcome Correlation &mdash; Pearson r</div>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Foot Traffic r</th>
              <th>Dwell Time r</th>
              <th>POS r</th>
            </tr>
          </thead>
          <tbody>
            {CORRELATION_TABLE.map(row => (
              <tr key={row.factor}>
                <td style={{ color: "#777" }}>{row.factor}</td>
                <td><CorrCell v={row.footTraffic} /></td>
                <td><CorrCell v={row.dwell} /></td>
                <td><CorrCell v={row.pos} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "10px 10px", fontFamily: "var(--ra-mono)", fontSize: 8, color: "#2a2a2a", letterSpacing: "0.08em", borderTop: "1px solid var(--ra-border)" }}>
          n = 1 store &middot; 1 pilot week &middot; below significance threshold &middot; indicative only &middot; confidence bands not yet computable
        </div>
      </div>

      <div className="gap" />
      <div className="sh">Regression Output<span className="phase-tag">Phase 2</span></div>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>R&sup2;</th>
              <th>p-value</th>
              <th>95% CI</th>
            </tr>
          </thead>
          <tbody>
            {REGRESSION_DATA.map(row => (
              <tr key={row.factor}>
                <td style={{ color: "#777" }}>{row.factor}</td>
                <td><span className={`corr ${row.r2 > 0.2 ? "corr-pos" : "corr-neutral"}`}>{row.r2.toFixed(2)}</span></td>
                <td><span className={row.p < 0.05 ? "reg-sig" : "reg-ns"}>{row.p < 0.05 ? `${row.p.toFixed(3)} *` : row.p.toFixed(3)}</span></td>
                <td style={{ fontFamily: "var(--ra-mono)", fontSize: 10, color: "#444" }}>[{row.ciLow.toFixed(2)}, {row.ciHigh.toFixed(2)}]</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="gap" />
      <div className="sh">Lift Event Annotations<span className="phase-tag">Phase 2</span></div>
      <div className="card">
        {LIFT_EVENTS.map((ev, i) => (
          <div key={i} className="lift-row">
            <div className={`lift-dot ${ev.impact === "positive" ? "lift-pos" : "lift-neg"}`} />
            <div className="lift-label">{ev.label}</div>
            <div className="lift-meta">{ev.date} &middot; {ev.time}</div>
          </div>
        ))}
        <div style={{ paddingTop: 8, fontFamily: "var(--ra-mono)", fontSize: 8, color: "#222", letterSpacing: "0.08em" }}>
          Manual annotations for known external events affecting retail metrics
        </div>
      </div>
    </div>
  );
}

function Modifiers() {
  return (
    <div>
      <div className="sh">Store Listener Profile</div>
      <div className="g3" style={{ marginBottom: 14 }}>
        <KPI label="Primary Cohort" value={"35\u201344"} sub={"Bump Era: 1985\u20131994"} />
        <KPI label="Cultural Capital" value="High" sub="Institutional dominant" />
        <KPI label="Lifestyle Tag" value="Urban Pro" sub="Experience-oriented" />
      </div>

      <div className="g2">
        <div>
          <div className="sh">Reminiscence Bump Weight by Age Cohort</div>
          <div className="card">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={BUMP_DATA} margin={{ top: 4, right: 6, bottom: 0, left: -22 }}>
                <XAxis dataKey="cohort" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} domain={[0, 1]} />
                <Tooltip contentStyle={TT_STYLE} />
                <Bar dataKey="weight" fill="#c9a84c" fillOpacity={0.65} radius={[2, 2, 0, 0]} name="Modifier Weight" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="sh">Bourdieu Capital Axes</div>
          <div className="card">
            <ResponsiveContainer width="100%" height={170}>
              <RadarChart data={CAPITAL_DATA} margin={{ top: 10, right: 18, bottom: 10, left: 18 }}>
                <PolarGrid stroke="#1e1e1e" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: "#444", fontSize: 9, fontFamily: "'Syne Mono', monospace" }} />
                <Radar dataKey="value" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.12} strokeWidth={1.5} dot={false} name="Cultural Capital" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="gap" />
      <div className="sh">Era Affinity Mapping</div>
      <div className="card">
        <div className="era-grid">
          <div className="era-row">Primary Bump Era<br /><span>1985 &ndash; 1994</span></div>
          <div className="era-row">Secondary Affinity<br /><span className="secondary">1995 &ndash; 2004</span></div>
          <div className="era-row">Genre Alignment<br /><span>Indie &middot; Alt &middot; Contemporary</span></div>
          <div className="era-row">Avoid Zones<br /><span className="avoid">Pre-1970 &middot; Novelty &middot; Aggressive</span></div>
        </div>
      </div>

      <div className="gap" />
      <div className="sh">Multi-Cohort Profiles<span className="phase-tag">Phase 2</span></div>
      <div className="card">
        <div className="cohort-row">
          <div className="cohort-name cohort-primary">Primary</div>
          <div className="cohort-detail">35&ndash;44 &middot; Weight 0.9</div>
          <div className="cohort-era">1985&ndash;1994</div>
        </div>
        <div className="cohort-row">
          <div className="cohort-name cohort-secondary">Secondary</div>
          <div className="cohort-detail">25&ndash;34 &middot; Weight 0.5</div>
          <div className="cohort-era">1995&ndash;2004</div>
        </div>
        <div style={{ fontFamily: "var(--ra-mono)", fontSize: 8, color: "#222", letterSpacing: "0.08em", paddingTop: 8 }}>
          Stores with bimodal age distributions receive blended modifier weights
        </div>
      </div>

      <div className="gap" />
      <div className="sh">Modifier Weight Editor<span className="phase-tag">Phase 2</span></div>
      <div className="card">
        {BUMP_DATA.map(b => (
          <div key={b.cohort} className="weight-row">
            <div className="weight-label">{b.cohort}</div>
            <div className="weight-track">
              <div className="weight-fill" style={{ width: `${b.weight * 100}%` }} />
              <div className="weight-handle" style={{ left: `${b.weight * 100}%` }} />
            </div>
            <div className="weight-val">{b.weight.toFixed(1)}</div>
          </div>
        ))}
        <div className="edit-stub-btn" title="Available in Phase 2">Save Weights</div>
      </div>

      <div className="gap" />
      <div className="sh">Affinity &rarr; Constraint Pipeline<span className="phase-tag">Phase 2</span></div>
      <div className="card">
        {CONSTRAINT_PIPELINE.map((c, i) => (
          <div key={i} className="constraint-row">
            <div className="constraint-source">{c.era || c.genre || c.avoid}</div>
            <div className="constraint-arrow">&rarr;</div>
            <div className="constraint-rule">{c.constraint}</div>
          </div>
        ))}
        <div style={{ fontFamily: "var(--ra-mono)", fontSize: 8, color: "#222", letterSpacing: "0.08em", paddingTop: 8 }}>
          Era and genre affinities map to Suno/ACE-Step prompt constraints via Eno
        </div>
      </div>
    </div>
  );
}

// ─── Tab Configuration ──────────────────────────────────────────────────────

const SECTIONS = [
  { id: "overview",    label: "Overview" },
  { id: "playback",    label: "Playback" },
  { id: "parameters",  label: "Parameters" },
  { id: "correlation", label: "Correlation" },
  { id: "modifiers",   label: "Modifiers" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

const VIEWS: Record<SectionId, React.FC> = {
  overview:    Overview,
  playback:    Playback,
  parameters:  Parameters,
  correlation: Correlation,
  modifiers:   Modifiers,
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Analytics() {
  const [active, setActive] = useState<SectionId>("overview");

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  const View = VIEWS[active];

  return (
    <div className="ronson-analytics">
      {/* Tab strip (replaces standalone sidebar) */}
      <div className="ra-header">
        <div className="ra-title">Ronson Analytics</div>
        <div className="ra-tabs">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`ra-tab${active === s.id ? " active" : ""}`}
              onClick={() => setActive(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="ra-meta">
          <select className="ra-store">
            <option>Pilot — Denver, CO</option>
          </select>
          <div className="ra-live">
            <div className="ra-live-dot" />
            Live
          </div>
        </div>
      </div>

      {/* Active section */}
      <View />
    </div>
  );
}
