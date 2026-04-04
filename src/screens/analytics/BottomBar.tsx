// ── Kraftwerk V2 — Bottom Bar ──

interface BottomBarProps {
  onAddConfounder: () => void;
}

export default function BottomBar({ onAddConfounder }: BottomBarProps) {
  return (
    <div className="kw-bottom-bar">
      <span className="kw-caveat">
        Pilot store · 12 days data · pre-statistical significance · indicative only
      </span>

      <div className="kw-bottom-actions">
        <button className="kw-btn-ghost" onClick={onAddConfounder}>
          + Log Event
        </button>
        <button
          className="kw-btn-ghost"
          onClick={() => alert('Export — coming soon')}
        >
          Export Day
        </button>
      </div>
    </div>
  );
}
