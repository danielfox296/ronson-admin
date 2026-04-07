const COLORS = ['', '#ea6152', '#e87a30', '#eaa152', '#5ea2b6', '#6ba38a'];
const LABELS = ['', 'P1', 'P2', 'P3', 'P4', 'P5'];

export default function PriorityIndicator({ priority, showLabel = false }: { priority: number; showLabel?: boolean }) {
  const color = COLORS[priority] ?? COLORS[3];
  const label = LABELS[priority] ?? 'P?';
  return (
    <span className="flex items-center gap-1" title={`Priority ${priority}`}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {showLabel && <span className="text-[10px] font-bold" style={{ color }}>{label}</span>}
    </span>
  );
}
