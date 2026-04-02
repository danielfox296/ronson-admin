import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  HOURS, TOTAL_MINS, TIMELINE, TRACKS, WEATHER, INIT_LOGS,
  CORR_DATA, BASELINE_CURVES,
  type Track, type ConfoundEntry,
} from "./analytics-data.js";

// ─── Scoped Styles ──────────────────────────────────────────────────────────
// All selectors scoped under .ronson-analytics to prevent bleed into admin app.
// Font sizes pre-scaled 120%; text colors pre-brightened per v1 feedback.

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Instrument+Serif:ital@0;1&display=swap');

.ronson-analytics {
  --ra-bg:      #060608;
  --ra-s1:      #0a0a0e;
  --ra-s2:      #0f0f14;
  --ra-border:  rgba(255,255,255,0.055);
  --ra-border2: rgba(255,255,255,0.03);
  --ra-text:    #d8d8e0;
  --ra-muted:   #7a7a8e;
  --ra-dim:     #505068;
  --ra-gold:    #c8a96e;
  --ra-goldfad: rgba(200,169,110,0.12);
  --ra-teal:    #4ecdc4;
  --ra-tealfad: rgba(78,205,196,0.1);
  --ra-rose:    #e07070;
  --ra-rosefad: rgba(224,112,112,0.1);
  --ra-slate:   #7c8db5;
  --ra-mono:    'DM Mono', monospace;
  --ra-serif:   'Instrument Serif', serif;
  color: var(--ra-text);
  font-family: var(--ra-mono);
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

/* ── Header / Tabs */
.ra-header {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 16px; flex-wrap: wrap;
}
.ra-title {
  font-family: var(--ra-serif); font-style: italic;
  font-size: 20px; color: var(--ra-gold); letter-spacing: 0.01em;
  margin-right: 8px;
}
.ra-ver {
  font-size: 10px; color: var(--ra-dim); letter-spacing: 0.18em;
  text-transform: uppercase; align-self: flex-end; margin-bottom: 2px;
}
.ra-tabs { display: flex; gap: 0; flex: 1; }
.ra-tab {
  font-family: var(--ra-mono); font-size: 12px; letter-spacing: 0.1em;
  text-transform: uppercase; padding: 7px 14px;
  color: var(--ra-muted); cursor: pointer;
  border: 1px solid transparent; border-bottom: 1.5px solid transparent;
  background: transparent; transition: all 0.1s; user-select: none;
}
.ra-tab:hover { color: #999; }
.ra-tab.active {
  color: var(--ra-text); border-bottom-color: var(--ra-gold);
  background: var(--ra-goldfad);
}
.ra-meta {
  display: flex; align-items: center; gap: 10px; margin-left: auto;
}
.ra-store {
  background: transparent; border: 1px solid var(--ra-border);
  color: #999; font-family: var(--ra-mono); font-size: 12px;
  padding: 4px 10px; outline: none; cursor: pointer; appearance: none;
}
.ra-date {
  font-size: 12px; color: var(--ra-muted); letter-spacing: 0.05em;
}
.ra-live {
  display: flex; align-items: center; gap: 5px;
  font-size: 10px; color: var(--ra-teal); letter-spacing: 0.18em;
  text-transform: uppercase;
}
.ra-live-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--ra-teal);
  animation: ra-pulse 2.5s ease-in-out infinite;
}
@keyframes ra-pulse { 0%,100%{opacity:1} 50%{opacity:.2} }

/* ── Section headers */
.ronson-analytics .sh {
  font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--ra-muted); margin-bottom: 10px;
  display: flex; align-items: center; gap: 10px;
}
.ronson-analytics .sh::after {
  content: ''; flex: 1; height: 1px; background: var(--ra-border);
}

/* ── Cards / gaps */
.ronson-analytics .card { background: var(--ra-s1); border: 1px solid var(--ra-border); }
.ronson-analytics .gap { height: 14px; }
.ronson-analytics .gap-sm { height: 8px; }

/* ── Timeline */
.ronson-analytics .tl-lane {
  display: grid; grid-template-columns: 100px 1fr;
  border-bottom: 1px solid var(--ra-border2);
}
.ronson-analytics .tl-lane:last-child { border-bottom: none; }
.ronson-analytics .tl-label {
  padding: 0 10px; display: flex; align-items: center;
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ra-muted); border-right: 1px solid var(--ra-border2);
  background: var(--ra-s1); position: sticky; left: 0;
}
.ronson-analytics .tl-chart { padding: 4px 0; }

/* Track lane */
.ronson-analytics .track-lane {
  display: flex; align-items: center; height: 28px;
  position: relative; gap: 1px;
}
.ronson-analytics .track-seg {
  height: 20px; display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: rgba(0,0,0,0.7); letter-spacing: 0.06em;
  cursor: pointer; transition: filter 0.1s; position: relative; overflow: hidden;
  flex-shrink: 0;
}
.ronson-analytics .track-seg:hover { filter: brightness(1.15); }
.ronson-analytics .track-seg.selected { outline: 1px solid var(--ra-gold); outline-offset: 1px; }

/* Promo band */
.ronson-analytics .promo-band {
  position: absolute; height: 4px; bottom: 0;
  background: var(--ra-rose); opacity: 0.6;
}

/* Time axis */
.ronson-analytics .time-axis {
  display: grid; grid-template-columns: 100px 1fr;
  border-bottom: 1px solid var(--ra-border);
}
.ronson-analytics .time-ticks {
  display: flex; justify-content: space-between;
  padding: 4px 0 4px 4px;
  font-size: 10px; color: var(--ra-dim); letter-spacing: 0.05em;
}

/* ── Detail panel */
.ronson-analytics .detail-panel {
  background: var(--ra-s2); border: 1px solid var(--ra-border);
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0;
}
.ronson-analytics .dp-cell {
  padding: 12px 14px; border-right: 1px solid var(--ra-border);
}
.ronson-analytics .dp-cell:last-child { border-right: none; }
.ronson-analytics .dp-label {
  font-size: 10px; color: var(--ra-muted); letter-spacing: 0.14em;
  text-transform: uppercase; margin-bottom: 6px;
}
.ronson-analytics .dp-value {
  font-family: var(--ra-serif); font-style: italic;
  font-size: 24px; color: var(--ra-text); line-height: 1;
}
.ronson-analytics .dp-sub {
  font-size: 11px; color: var(--ra-teal); margin-top: 4px; letter-spacing: 0.05em;
}
.ronson-analytics .dp-sub.neg { color: var(--ra-rose); }
.ronson-analytics .dp-sub.neu { color: var(--ra-muted); }

/* ── Flow factor chips */
.ronson-analytics .ff-strip {
  display: flex; gap: 2px; flex-wrap: wrap; padding: 10px 14px;
}
.ronson-analytics .ff-chip {
  display: flex; flex-direction: column; align-items: center;
  gap: 3px; padding: 5px 8px; background: var(--ra-s1);
  border: 1px solid var(--ra-border2); min-width: 54px;
}
.ronson-analytics .ff-chip-name {
  font-size: 8px; color: var(--ra-dim); letter-spacing: 0.1em;
  text-transform: uppercase;
}
.ronson-analytics .ff-chip-val { font-size: 12px; color: var(--ra-gold); }
.ronson-analytics .ff-chip-bar {
  width: 100%; height: 1px; background: var(--ra-dim); position: relative;
}
.ronson-analytics .ff-chip-fill {
  position: absolute; left: 0; top: 0; height: 100%; background: var(--ra-gold);
}

/* ── Correlation */
.ronson-analytics .corr-table {
  width: 100%; border-collapse: collapse;
}
.ronson-analytics .corr-table th {
  text-align: left; padding: 8px 10px; font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ra-muted); border-bottom: 1px solid var(--ra-border);
  font-weight: 400;
}
.ronson-analytics .corr-table td {
  padding: 9px 10px; border-bottom: 1px solid var(--ra-border2);
  font-size: 13px; color: var(--ra-muted); vertical-align: middle;
}
.ronson-analytics .corr-table tr:last-child td { border-bottom: none; }

.ronson-analytics .r-bar-wrap { display: flex; align-items: center; gap: 6px; }
.ronson-analytics .r-bar-track {
  width: 80px; height: 2px; background: var(--ra-dim); position: relative;
}
.ronson-analytics .r-bar-pos {
  position: absolute; left: 50%; top: 0; height: 100%; background: var(--ra-teal);
}
.ronson-analytics .r-bar-neg {
  position: absolute; right: 50%; top: 0; height: 100%; background: var(--ra-rose);
}
.ronson-analytics .r-val-pos { color: var(--ra-teal); }
.ronson-analytics .r-val-neg { color: var(--ra-rose); }
.ronson-analytics .r-val-neu { color: var(--ra-dim); }

.ronson-analytics .lag-toggle { display: flex; gap: 0; margin-left: auto; }
.ronson-analytics .lag-btn {
  font-family: var(--ra-mono); font-size: 10px; letter-spacing: 0.1em;
  padding: 4px 9px; border: 1px solid var(--ra-border); background: transparent;
  color: var(--ra-muted); cursor: pointer; transition: all 0.1s; margin-left: -1px;
}
.ronson-analytics .lag-btn.active {
  background: var(--ra-goldfad); color: var(--ra-gold);
  border-color: rgba(200,169,110,0.3); z-index: 1;
}

/* ── Baseline */
.ronson-analytics .bl-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
}
.ronson-analytics .bl-card {
  background: var(--ra-s1); border: 1px solid var(--ra-border); padding: 14px;
}
.ronson-analytics .bl-label {
  font-size: 10px; color: var(--ra-muted); letter-spacing: 0.14em;
  text-transform: uppercase; margin-bottom: 10px;
}
.ronson-analytics .bl-stat {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 6px 0; border-bottom: 1px solid var(--ra-border2);
}
.ronson-analytics .bl-stat:last-child { border-bottom: none; }
.ronson-analytics .bl-stat-label { font-size: 11px; color: var(--ra-dim); }
.ronson-analytics .bl-stat-val { font-size: 13px; color: var(--ra-text); }

.ronson-analytics .bl-range-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; font-size: 12px; color: var(--ra-muted);
}
.ronson-analytics .bl-range-input {
  background: var(--ra-dim); border: none; color: var(--ra-text);
  font-family: var(--ra-mono); font-size: 12px; padding: 4px 8px;
  outline: none; width: 100px;
}

/* ── Confound log */
.ronson-analytics .log-form {
  display: flex; gap: 8px; padding: 12px 14px;
  border-bottom: 1px solid var(--ra-border); align-items: center;
}
.ronson-analytics .log-select,
.ronson-analytics .log-input {
  background: var(--ra-s2); border: 1px solid var(--ra-border);
  color: var(--ra-text); font-family: var(--ra-mono); font-size: 12px;
  padding: 5px 8px; outline: none; flex: 1;
}
.ronson-analytics .log-btn {
  background: var(--ra-goldfad); border: 1px solid rgba(200,169,110,0.25);
  color: var(--ra-gold); font-family: var(--ra-mono); font-size: 11px;
  letter-spacing: 0.12em; text-transform: uppercase; padding: 5px 12px;
  cursor: pointer; transition: background 0.1s; flex-shrink: 0;
}
.ronson-analytics .log-btn:hover { background: rgba(200,169,110,0.2); }

.ronson-analytics .log-entry {
  display: grid; grid-template-columns: 72px 80px 1fr 72px;
  padding: 8px 14px; border-bottom: 1px solid var(--ra-border2);
  font-size: 12px; gap: 10px; align-items: center;
}
.ronson-analytics .log-entry:last-child { border-bottom: none; }
.ronson-analytics .log-type {
  font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
}
.ronson-analytics .log-type.promo    { color: var(--ra-rose); }
.ronson-analytics .log-type.staffing { color: var(--ra-slate); }
.ronson-analytics .log-type.weather  { color: var(--ra-teal); }
.ronson-analytics .log-badge { font-size: 10px; color: var(--ra-muted); }
.ronson-analytics .log-del {
  font-size: 11px; color: var(--ra-dim); cursor: pointer;
  text-align: right; transition: color 0.1s;
}
.ronson-analytics .log-del:hover { color: var(--ra-rose); }

.ronson-analytics .data-note {
  font-size: 10px; color: var(--ra-dim); letter-spacing: 0.1em;
  text-align: center; padding: 10px; border-top: 1px solid var(--ra-border2);
}
`;

// ─── Helpers ────────────────────────────────────────────────────────────────

const TT = {
  contentStyle: { background: "#0d0d12", border: "1px solid rgba(255,255,255,0.05)", fontSize: 11, fontFamily: "'DM Mono',monospace", color: "#aaa" },
  itemStyle: { color: "#aaa" },
  labelStyle: { color: "#888" },
};
const TICK_STYLE = { fill: "#666", fontSize: 10, fontFamily: "'DM Mono',monospace" };

function RBar({ v }: { v: number }) {
  const pct = Math.abs(v) * 50;
  const cls = v > 0.2 ? "r-val-pos" : v < -0.1 ? "r-val-neg" : "r-val-neu";
  return (
    <div className="r-bar-wrap">
      <div className="r-bar-track">
        {v >= 0
          ? <div className="r-bar-pos" style={{ width: `${pct}%` }} />
          : <div className="r-bar-neg" style={{ width: `${pct}%` }} />}
      </div>
      <span className={cls}>{v > 0 ? "+" : ""}{v.toFixed(2)}</span>
    </div>
  );
}

// ─── Timeline Section ───────────────────────────────────────────────────────

function TrackLane({ tracks, selectedIdx, onSelect }: { tracks: Track[]; selectedIdx: number | null; onSelect: (i: number) => void }) {
  return (
    <div className="track-lane">
      {tracks.map((t, i) => {
        const w = ((t.end - t.start + 1) / TOTAL_MINS) * 100;
        const l = (t.start / TOTAL_MINS) * 100;
        return (
          <div
            key={i}
            className={`track-seg${selectedIdx === i ? " selected" : ""}`}
            style={{ width: `${w}%`, background: t.color, position: "absolute", left: `${l}%` }}
            onClick={() => onSelect(i)}
            title={t.id}
          >
            {w > 2.5 ? t.id : ""}
          </div>
        );
      })}
    </div>
  );
}

function MiniChart({ data, dataKey, color, height = 38 }: { data: object[]; dataKey: string; color: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`ra_g_${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="10%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#ra_g_${dataKey})`} strokeWidth={1} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function WeatherLane() {
  return (
    <div style={{ display: "flex", height: 28, alignItems: "center", paddingLeft: 4, gap: 0, overflow: "hidden" }}>
      {WEATHER.map((w, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, borderRight: "1px solid var(--ra-border2)", padding: "2px 0" }}>
          <div style={{ fontSize: 10, color: "var(--ra-gold)" }}>{w.temp}</div>
          <div style={{ fontSize: 8, color: "var(--ra-dim)" }}>{w.cond.split(" ")[0]}</div>
        </div>
      ))}
    </div>
  );
}

function POSLane() {
  const events = TIMELINE.filter(d => d.pos > 0);
  return (
    <div style={{ position: "relative", height: 28, width: "100%" }}>
      {events.map((e, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${(e.i / TOTAL_MINS) * 100}%`,
          top: "50%", transform: "translateY(-50%)",
          width: 3, height: 8, background: "var(--ra-teal)", opacity: 0.8,
        }} title={`${String(e.h).padStart(2, "0")}:${String(e.m).padStart(2, "0")}`} />
      ))}
    </div>
  );
}

function TimelineSection({ selectedTrack, onSelectTrack }: { selectedTrack: number | null; onSelectTrack: (i: number) => void }) {
  return (
    <div>
      <div className="time-axis">
        <div style={{ borderRight: "1px solid var(--ra-border2)" }} />
        <div className="time-ticks">
          {HOURS.map(h => <span key={h}>{h}:00</span>)}
        </div>
      </div>

      <div className="card" style={{ position: "relative" }}>
        <div className="tl-lane">
          <div className="tl-label">Tracks</div>
          <div className="tl-chart" style={{ position: "relative" }}>
            <TrackLane tracks={TRACKS} selectedIdx={selectedTrack} onSelect={onSelectTrack} />
            <div className="promo-band" style={{ left: "15%", width: "70%" }} title="Friends & Family 15% off" />
          </div>
        </div>

        <div className="tl-lane">
          <div className="tl-label">Foot Traffic</div>
          <div className="tl-chart">
            <MiniChart data={TIMELINE} dataKey="traffic" color="#c8a96e" />
          </div>
        </div>

        <div className="tl-lane">
          <div className="tl-label">Dwell (min)</div>
          <div className="tl-chart">
            <MiniChart data={TIMELINE} dataKey="dwell" color="#4ecdc4" />
          </div>
        </div>

        <div className="tl-lane">
          <div className="tl-label">POS Events</div>
          <div className="tl-chart" style={{ padding: "0 0" }}>
            <POSLane />
          </div>
        </div>

        <div className="tl-lane">
          <div className="tl-label">Weather</div>
          <div className="tl-chart">
            <WeatherLane />
          </div>
        </div>

        <div className="tl-lane" style={{ borderBottom: "none" }}>
          <div className="tl-label">Staffing</div>
          <div className="tl-chart" style={{ display: "flex", alignItems: "center", paddingLeft: 8 }}>
            <span style={{ fontSize: 11, color: "var(--ra-slate)", letterSpacing: "0.05em" }}>3 floor staff &middot; all day</span>
          </div>
        </div>
      </div>

      {selectedTrack !== null && (
        <>
          <div className="gap-sm" />
          <div className="sh">Track Detail &mdash; {TRACKS[selectedTrack].id}</div>
          <div className="detail-panel">
            <div className="dp-cell">
              <div className="dp-label">Playing Window</div>
              <div className="dp-value" style={{ fontSize: 19 }}>
                {String(9 + Math.floor(TRACKS[selectedTrack].start / 60)).padStart(2, "0")}:{String(TRACKS[selectedTrack].start % 60).padStart(2, "0")} &mdash; {String(9 + Math.floor(TRACKS[selectedTrack].end / 60)).padStart(2, "0")}:{String(TRACKS[selectedTrack].end % 60).padStart(2, "0")}
              </div>
              <div className="dp-sub neu">{TRACKS[selectedTrack].end - TRACKS[selectedTrack].start + 1} min</div>
            </div>
            <div className="dp-cell">
              <div className="dp-label">Dwell &Delta; vs Baseline</div>
              <div className="dp-value">+1.4 min</div>
              <div className="dp-sub">+28% &middot; lag +8 min</div>
            </div>
            <div className="dp-cell">
              <div className="dp-label">POS &Delta; vs Baseline</div>
              <div className="dp-value">+2 txn</div>
              <div className="dp-sub">+18% &middot; lag +12 min</div>
            </div>
          </div>
          <div style={{ background: "var(--ra-s2)", border: "1px solid var(--ra-border)", borderTop: "none" }}>
            <div style={{ padding: "8px 14px 2px", fontSize: 10, color: "var(--ra-muted)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Flow Factors</div>
            <div className="ff-strip">
              {Object.entries(TRACKS[selectedTrack].ff).map(([k, v]) => (
                <div key={k} className="ff-chip">
                  <div className="ff-chip-name">{k}</div>
                  <div className="ff-chip-val">{v}</div>
                  <div className="ff-chip-bar"><div className="ff-chip-fill" style={{ width: `${(v / 100) * 100}%` }} /></div>
                </div>
              ))}
              <div style={{ fontSize: 10, color: "var(--ra-dim)", alignSelf: "center", paddingLeft: 4, letterSpacing: "0.08em" }}>+ 26 more</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Correlation Section ────────────────────────────────────────────────────

function Correlation() {
  const [lag, setLag] = useState("+10");
  const lags = ["0", "+5", "+10", "+15"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <div className="sh" style={{ flex: 1, marginBottom: 0 }}>Parameter &times; Outcome</div>
        <div className="lag-toggle">
          {lags.map(l => (
            <button key={l} className={`lag-btn${lag === l ? " active" : ""}`} onClick={() => setLag(l)}>
              {l === "0" ? "No lag" : `${l} min`}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="corr-table">
          <thead>
            <tr>
              <th>Flow Factor</th>
              <th>Foot Traffic r</th>
              <th>Dwell Time r</th>
              <th>POS r</th>
            </tr>
          </thead>
          <tbody>
            {[...CORR_DATA].sort((a, b) => Math.abs(b.dw) - Math.abs(a.dw)).map(row => (
              <tr key={row.factor}>
                <td style={{ color: "var(--ra-text)", fontWeight: 500 }}>{row.factor}</td>
                <td><RBar v={row.ft} /></td>
                <td><RBar v={row.dw} /></td>
                <td><RBar v={row.pos} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="data-note">
          n = 1 store &middot; 1 pilot week &middot; Pearson r &middot; indicative only &middot; p-values not yet computable &middot; sorted by |dwell r|
        </div>
      </div>

      <div className="gap" />
      <div className="sh">Dwell Time &mdash; Observed vs. Baseline (7-day avg)</div>
      <div className="card" style={{ padding: "12px 0 4px" }}>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ra_gObs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#4ecdc4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4ecdc4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ra_gBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#484858" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#484858" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="h" tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} domain={[0, 8]} unit=" min" width={38} />
            <Tooltip {...TT} />
            <Area data={BASELINE_CURVES.dwell} type="monotone" dataKey="v" stroke="#484858" strokeWidth={1} fill="url(#ra_gBase)" dot={false} name="Baseline" strokeDasharray="3 3" />
            <Area data={BASELINE_CURVES.dwell.map((d, i) => ({ ...d, v: parseFloat((d.v * 1.28 + (i % 3) * 0.1).toFixed(1)) }))} type="monotone" dataKey="v" stroke="#4ecdc4" strokeWidth={1.5} fill="url(#ra_gObs)" dot={false} name="Pilot week" />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, padding: "4px 16px 8px", fontSize: 10, color: "var(--ra-muted)", letterSpacing: "0.1em" }}>
          <span><span style={{ display: "inline-block", width: 16, height: 1, background: "#484858", marginRight: 5, verticalAlign: "middle", borderTop: "1px dashed #484858" }} />30-day pre-Entuned baseline</span>
          <span><span style={{ display: "inline-block", width: 16, height: 1, background: "#4ecdc4", marginRight: 5, verticalAlign: "middle" }} />Pilot week observed</span>
        </div>
      </div>
    </div>
  );
}

// ─── Baseline Section ───────────────────────────────────────────────────────

function Baseline() {
  return (
    <div>
      <div className="sh">Baseline Configuration</div>
      <div className="card" style={{ padding: 14 }}>
        <div className="bl-label">Reference Period</div>
        <div className="bl-range-row">
          <span>From</span>
          <input className="bl-range-input" defaultValue="2025-10-01" />
          <span>To</span>
          <input className="bl-range-input" defaultValue="2026-01-15" />
          <button className="log-btn" style={{ marginLeft: "auto" }}>Recompute</button>
        </div>
        <div style={{ fontSize: 10, color: "var(--ra-dim)", letterSpacing: "0.1em", marginTop: 6 }}>
          Entuned deployment: Jan 16, 2026 &middot; All data before this date used as baseline
        </div>
      </div>

      <div className="gap" />
      <div className="bl-grid">
        <div>
          <div className="sh">Baseline Foot Traffic by Hour</div>
          <div className="card" style={{ padding: "12px 0 4px" }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={BASELINE_CURVES.traffic} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="h" tick={TICK_STYLE} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={28} />
                <Tooltip {...TT} />
                <Bar dataKey="v" fill="#c8a96e" fillOpacity={0.4} radius={[1, 1, 0, 0]} name="Avg traffic" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <div className="sh">Baseline Dwell by Hour</div>
          <div className="card" style={{ padding: "12px 0 4px" }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={BASELINE_CURVES.dwell} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="h" tick={TICK_STYLE} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={32} unit="m" />
                <Tooltip {...TT} />
                <Bar dataKey="v" fill="#4ecdc4" fillOpacity={0.4} radius={[1, 1, 0, 0]} name="Avg dwell" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="gap" />
      <div className="sh">Baseline Statistics</div>
      <div className="card" style={{ padding: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
        {[
          { label: "Days in baseline", value: "107" },
          { label: "Avg daily traffic", value: "312 ppl" },
          { label: "Avg dwell", value: "4.1 min" },
          { label: "Avg daily POS", value: "48 txn" },
          { label: "Avg basket value", value: "$142" },
          { label: "Weather-adj variance", value: "\u00b16.2%" },
        ].map((s, i) => (
          <div key={i} className="bl-stat" style={{ padding: "12px 14px", borderRight: i % 3 < 2 ? "1px solid var(--ra-border2)" : "none", borderBottom: i < 3 ? "1px solid var(--ra-border2)" : "none" }}>
            <div style={{ fontSize: 10, color: "var(--ra-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--ra-serif)", fontStyle: "italic", fontSize: 22, color: "var(--ra-text)" }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Confound Log Section ───────────────────────────────────────────────────

function ConfoundLog() {
  const [logs, setLogs] = useState<ConfoundEntry[]>(INIT_LOGS);
  const [type, setType] = useState<ConfoundEntry["type"]>("staffing");
  const [val, setVal] = useState("");
  const [note, setNote] = useState("");

  const add = () => {
    if (!val.trim()) return;
    setLogs(l => [...l, { id: Date.now(), type, date: "Apr 01", value: val, note }]);
    setVal("");
    setNote("");
  };

  return (
    <div>
      <div className="sh">Confound Log</div>
      <div className="card" style={{ padding: 0 }}>
        <div className="log-form">
          <select className="log-select" value={type} onChange={e => setType(e.target.value as ConfoundEntry["type"])} style={{ flex: "0 0 90px" }}>
            <option value="staffing">Staffing</option>
            <option value="promo">Promo</option>
          </select>
          <input className="log-input" placeholder="Value (e.g. 4 staff / 20% off)" value={val} onChange={e => setVal(e.target.value)} />
          <input className="log-input" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <button className="log-btn" onClick={add}>Log</button>
        </div>
        {logs.map(l => (
          <div key={l.id} className="log-entry">
            <span className={`log-type ${l.type}`}>{l.type}</span>
            <span style={{ fontSize: 11, color: "var(--ra-dim)" }}>{l.date}</span>
            <span style={{ fontSize: 12, color: "var(--ra-text)" }}>{l.value}{l.note ? <span style={{ color: "var(--ra-muted)" }}> &middot; {l.note}</span> : null}</span>
            <span className="log-del" onClick={() => setLogs(ls => ls.filter(x => x.id !== l.id))}>remove</span>
          </div>
        ))}
        <div className="data-note">Weather pulled automatically via Open-Meteo &middot; updated hourly</div>
      </div>

      <div className="gap" />
      <div className="sh">Weather &mdash; Today</div>
      <div className="card" style={{ padding: 0, display: "flex" }}>
        {WEATHER.map((w, i) => (
          <div key={i} style={{ flex: 1, borderRight: "1px solid var(--ra-border2)", padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--ra-dim)", letterSpacing: "0.1em", marginBottom: 5 }}>{w.h}</div>
            <div style={{ fontSize: 16, color: "var(--ra-gold)", fontFamily: "var(--ra-serif)", fontStyle: "italic" }}>{w.temp}</div>
            <div style={{ fontSize: 8, color: "var(--ra-muted)", marginTop: 3 }}>{w.cond}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab Configuration ──────────────────────────────────────────────────────

const SECTIONS = [
  { id: "timeline",    label: "Timeline" },
  { id: "correlation", label: "Correlation" },
  { id: "baseline",    label: "Baseline" },
  { id: "confounds",   label: "Confounds" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Analytics() {
  const [section, setSection] = useState<SectionId>("timeline");
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  return (
    <div className="ronson-analytics">
      <div className="ra-header">
        <div className="ra-title">Ronson</div>
        <div className="ra-ver">v0.2</div>
        <div className="ra-tabs">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`ra-tab${section === s.id ? " active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="ra-meta">
          <select className="ra-store">
            <option>Pilot &mdash; Denver, CO</option>
          </select>
          <span className="ra-date">Tuesday, Apr 01, 2026</span>
          <div className="ra-live">
            <div className="ra-live-dot" />
            Live
          </div>
        </div>
      </div>

      {section === "timeline" && (
        <TimelineSection
          selectedTrack={selectedTrack}
          onSelectTrack={i => setSelectedTrack(selectedTrack === i ? null : i)}
        />
      )}
      {section === "correlation" && <Correlation />}
      {section === "baseline" && <Baseline />}
      {section === "confounds" && <ConfoundLog />}
    </div>
  );
}
