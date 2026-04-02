// ── Kraftwerk V1 — Top Bar ──

interface TopBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  baselineMode: string;
  onBaselineModeChange: (mode: string) => void;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function shiftDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

export default function TopBar({
  selectedDate,
  onDateChange,
  baselineMode,
  onBaselineModeChange,
}: TopBarProps) {
  return (
    <div className="kw-topbar">
      {/* Brand */}
      <span className="kw-label">
        KRAFTWERK<span className="kw-label-version">v1</span>
      </span>

      {/* Store selector (disabled, single) */}
      <select className="kw-chip" disabled>
        <option>Pilot — Denver, CO</option>
      </select>

      {/* Date navigation */}
      <div className="kw-date-nav">
        <button
          className="kw-date-btn"
          onClick={() => onDateChange(shiftDate(selectedDate, -1))}
          aria-label="Previous day"
        >
          ‹
        </button>
        <span className="kw-date-text">{formatDateDisplay(selectedDate)}</span>
        <button
          className="kw-date-btn"
          onClick={() => onDateChange(shiftDate(selectedDate, 1))}
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {/* Baseline selector */}
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a3a3a' }}>
        vs
      </span>
      <select
        className="kw-chip"
        value={baselineMode}
        onChange={(e) => onBaselineModeChange(e.target.value)}
      >
        <option value="last-week">Last Week</option>
        <option value="last-year">Last Year</option>
        <option value="30-day-avg">30-Day Avg</option>
        <option value="none">None</option>
      </select>

      {/* Status */}
      <div className="kw-status">
        <div className={`kw-status-dot ${isToday(selectedDate) ? '' : 'historical'}`} />
        <span className="kw-status-text">
          {isToday(selectedDate) ? 'Receiving' : 'Historical'}
        </span>
      </div>
    </div>
  );
}
