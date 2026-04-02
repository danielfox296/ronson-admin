// ── Kraftwerk V1 — Bottom Bar ──

interface BottomBarProps {
  onAddConfounder: () => void;
}

export default function BottomBar({ onAddConfounder }: BottomBarProps) {
  return (
    <div className="kw-bottom-bar">
      <span className="kw-caveat">
        n = 1 store · 12 days data · pre-statistical significance · indicative only
      </span>

      <div className="kw-bottom-actions">
        <button className="kw-btn-ghost" onClick={onAddConfounder}>
          + Add Confounder
        </button>
        <button
          className="kw-btn-ghost"
          onClick={() => alert('Export — coming soon')}
        >
          Export Day ↓
        </button>
      </div>
    </div>
  );
}
