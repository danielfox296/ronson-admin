export default function StatsCard({
  label,
  value,
  sub,
  accent,
  warn,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  const valueColor = warn
    ? 'text-[#ea6152]'
    : accent
    ? 'text-[#5ea2b6]'
    : 'text-[rgba(255,255,255,0.87)]';

  return (
    <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">{sub}</p>}
    </div>
  );
}
