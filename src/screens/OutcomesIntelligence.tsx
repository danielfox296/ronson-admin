import { useState, useMemo, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

interface FlowFactor {
  id: string;
  name: string;
  category: string;
  sub: string;
  unit: string;
}

interface Outcome {
  id: string;
  name: string;
  symbol: string;
  unit: string;
}

interface Correlation {
  r: number;
  n: number;
  p: number;
}

interface Song {
  id: string;
  name: string;
  playCount: number;
  factors: Record<string, number>;
  outcomes: Record<string, number>;
  variance: Record<string, number>;
}

const FLOW_FACTORS: FlowFactor[] = [
  { id: 'tempo', name: 'Tempo', category: 'Universal', sub: 'Physiological', unit: 'BPM' },
  { id: 'energy', name: 'Energy', category: 'Universal', sub: 'Physiological', unit: '0-1' },
  { id: 'rhythmic_density', name: 'Rhythmic Density', category: 'Universal', sub: 'Physiological', unit: '0-1' },
  { id: 'harmonic_complexity', name: 'Harmonic Complexity', category: 'Universal', sub: 'Physiological', unit: '0-1' },
  { id: 'valence', name: 'Valence', category: 'Universal', sub: 'Emotive', unit: '0-1' },
  { id: 'tension', name: 'Tension', category: 'Universal', sub: 'Emotive', unit: '0-1' },
  { id: 'warmth', name: 'Warmth', category: 'Universal', sub: 'Emotive', unit: '0-1' },
  { id: 'nostalgia', name: 'Nostalgia Index', category: 'Cultural', sub: 'Associative', unit: '0-1' },
  { id: 'genre_distance', name: 'Genre Distance', category: 'Cultural', sub: 'Associative', unit: '0-1' },
  { id: 'lyrical_sentiment', name: 'Lyrical Sentiment', category: 'Cultural', sub: 'Semantic', unit: '-1 to 1' },
  { id: 'vocal_presence', name: 'Vocal Presence', category: 'Cultural', sub: 'Semantic', unit: '0-1' },
];

const OUTCOMES: Outcome[] = [
  { id: 'foot_traffic', name: 'Foot Traffic', symbol: 'FT', unit: 'Δ%' },
  { id: 'dwell_time', name: 'Dwell Time', symbol: 'DT', unit: 'Δ%' },
  { id: 'pos', name: 'POS', symbol: 'POS', unit: 'Δ%' },
];

const LAG_OPTIONS = [0, 5, 10, 15];

const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

const generateCorrelations = () => {
  const rng = seededRandom(42);
  const data: Record<string, Record<string, Correlation>> = {};
  FLOW_FACTORS.forEach((f) => {
    data[f.id] = {};
    OUTCOMES.forEach((o) => {
      const r = (rng() * 2 - 1) * 0.6;
      const n = Math.floor(rng() * 400) + 30;
      data[f.id][o.id] = {
        r: Math.round(r * 1000) / 1000,
        n,
        p: r === 0 ? 1 : Math.max(0.001, Math.round((1 - Math.abs(r)) * rng() * 0.1 * 1000) / 1000),
      };
    });
  });
  return data;
};

const generateSongs = (): Song[] => {
  const rng = seededRandom(99);
  const names = [
    'Meridian Drift', 'Copper Light', 'Glass Pavilion', 'Slow Cascade',
    'Felt Surface', 'Warm Circuit', 'Still Archive', 'Bright Contour',
    'Soft Mechanism', 'Open Grain', 'Pearl Distance', 'Quiet Voltage',
    'Moss Layer', 'Silk Tension', 'Cloud Terrace', 'Ember Frequency',
  ];
  return names.map((name, i) => {
    const playCount = Math.floor(rng() * 180) + 5;
    const factors: Record<string, number> = {};
    FLOW_FACTORS.forEach((f) => {
      factors[f.id] = Math.round(rng() * 100) / 100;
    });
    factors.tempo = Math.floor(rng() * 80) + 70;
    return {
      id: `song_${i}`,
      name,
      playCount,
      factors,
      outcomes: {
        foot_traffic: Math.round((rng() * 30 - 10) * 10) / 10,
        dwell_time: Math.round((rng() * 40 - 12) * 10) / 10,
        pos: Math.round((rng() * 20 - 8) * 10) / 10,
      },
      variance: {
        foot_traffic: Math.round(rng() * 15 * 10) / 10,
        dwell_time: Math.round(rng() * 20 * 10) / 10,
        pos: Math.round(rng() * 12 * 10) / 10,
      },
    };
  });
};

const generateScatterData = (factorId: string, outcomeId: string) => {
  const rng = seededRandom(factorId.length * 100 + outcomeId.length);
  const points = [];
  const corr = CORRELATIONS[factorId]?.[outcomeId]?.r || 0;
  for (let i = 0; i < 80; i++) {
    const x = rng();
    const noise = (rng() - 0.5) * 0.8;
    const y = corr * x + noise;
    points.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  }
  return points;
};

const CORRELATIONS = generateCorrelations();
const SONGS = generateSongs();
const CONFOUNDS = [
  { type: 'Weather', detail: 'Rain >0.5in', pct: 18 },
  { type: 'Promotion', detail: 'Spring Sale active', pct: 34 },
];

/* ------------------------------------------------------------------ */
/*  COLOUR HELPERS (data-driven, kept dynamic)                         */
/* ------------------------------------------------------------------ */

const rToColor = (r: number, alpha = 1) => {
  const absR = Math.abs(r);
  if (absR < 0.05) return `rgba(100, 110, 120, ${alpha * 0.3})`;
  if (r > 0) {
    const i = Math.min(absR / 0.5, 1);
    return `rgba(${Math.floor(60 + i * 34)}, ${Math.floor(140 + i * 62)}, ${Math.floor(160 + i * 22)}, ${alpha * (0.25 + i * 0.75)})`;
  }
  const i = Math.min(absR / 0.5, 1);
  return `rgba(${Math.floor(220 + i * 35)}, ${Math.floor(140 - i * 40)}, ${Math.floor(50 + i * 20)}, ${alpha * (0.25 + i * 0.75)})`;
};

const deltaColor = (val: number, confidence = 1) => {
  if (val > 2) return `rgba(94, 162, 182, ${0.3 + confidence * 0.6})`;
  if (val > 0) return `rgba(94, 162, 182, ${0.2 + confidence * 0.4})`;
  if (val > -2) return `rgba(200, 150, 80, ${0.2 + confidence * 0.4})`;
  return `rgba(230, 110, 70, ${0.3 + confidence * 0.6})`;
};

/* ------------------------------------------------------------------ */
/*  SMALL UI PIECES                                                    */
/* ------------------------------------------------------------------ */

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex gap-0 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-0.5 mb-5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-md text-xs tracking-wide transition-colors cursor-pointer ${
            value === opt.value
              ? 'bg-[rgba(94,162,182,0.15)] text-[var(--accent)]'
              : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
  className = '',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-[11px] border cursor-pointer transition-colors ${
        active
          ? 'bg-[rgba(94,162,182,0.12)] border-[rgba(94,162,182,0.3)] text-[var(--accent)]'
          : 'bg-[rgba(255,255,255,0.03)] border-[var(--border-subtle)] text-[var(--text-faint)] hover:text-[var(--text-muted)]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function LagSelector({
  lags,
  value,
  onChange,
  label,
}: {
  lags: number[];
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex gap-0.5">
        {lags.map((l) => (
          <Pill key={l} active={value === l} onClick={() => onChange(l)}>
            {l === 0 ? '0' : `+${l}`}m
          </Pill>
        ))}
      </div>
    </div>
  );
}

function ConfoundBanner({ confounds }: { confounds: typeof CONFOUNDS }) {
  const flagged = confounds.filter((c) => c.pct >= 30);
  if (flagged.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3.5 py-2 mb-4 rounded-md border bg-[rgba(232,146,74,0.08)] border-[rgba(232,146,74,0.2)]">
      <span className="text-sm text-[#e8924a]">&#x26A0;</span>
      {flagged.map((c, i) => (
        <span key={i} className="text-[11px] text-[rgba(232,146,74,0.8)]">
          {c.type}: {c.detail} ({c.pct}% of obs.)
          {i < flagged.length - 1 ? ' · ' : ''}
        </span>
      ))}
    </div>
  );
}

function MinObsSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest whitespace-nowrap">
        Min observations
      </span>
      <input
        type="range"
        min={5}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 slider-active"
      />
      <span className="text-[11px] text-[var(--text-muted)] tabular-nums min-w-6 text-right">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VIEW: INFLUENCE MATRIX                                             */
/* ------------------------------------------------------------------ */

function InfluenceMatrix({ onDrillDown }: { onDrillDown: (outcomeId: string, factorId: string) => void }) {
  const [lag, setLag] = useState(0);
  const [minObs, setMinObs] = useState(20);

  const grouped = useMemo(() => {
    const groups: Record<string, FlowFactor[]> = {};
    FLOW_FACTORS.forEach((f) => {
      const key = `${f.category} \u203A ${f.sub}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    return groups;
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-6 mb-4">
        <LagSelector lags={LAG_OPTIONS} value={lag} onChange={setLag} label="Lag offset" />
        <MinObsSlider value={minObs} onChange={setMinObs} />
      </div>
      <ConfoundBanner confounds={CONFOUNDS} />

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[500px] border-collapse">
          <thead>
            <tr>
              <th className="p-2.5 text-[10px] uppercase tracking-widest text-[var(--text-faint)] font-normal text-left border-b border-[var(--border)] w-[200px]">
                Flow Factor
              </th>
              {OUTCOMES.map((o) => (
                <th key={o.id} className="p-2.5 text-center border-b border-[var(--border)] font-normal">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[13px] text-[var(--text-muted)] font-medium">{o.symbol}</span>
                    <span className="text-[9px] text-[var(--text-faint)]">{o.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([groupLabel, factors]) => (
              <Fragment key={groupLabel}>
                <tr>
                  <td
                    colSpan={4}
                    className="pt-2.5 px-3 pb-1 text-[11px] italic text-[var(--text-faint)] border-t border-[var(--border-subtle)]"
                  >
                    {groupLabel}
                  </td>
                </tr>
                {factors.map((f) => (
                  <tr key={f.id} className="transition-colors hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-3 py-1.5 border-b border-[var(--border-subtle)]">
                      <span className="text-xs text-[var(--text-muted)]">{f.name}</span>
                    </td>
                    {OUTCOMES.map((o) => {
                      const d = CORRELATIONS[f.id]?.[o.id];
                      if (!d || d.n < minObs) {
                        return (
                          <td key={o.id} className="px-1.5 py-1 border-b border-[var(--border-subtle)] text-center">
                            <div className="flex flex-col items-center justify-center min-h-9 rounded px-2.5 py-2">
                              <span className="text-xs text-[rgba(255,255,255,0.15)]">&mdash;</span>
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={o.id} className="px-1.5 py-1 border-b border-[var(--border-subtle)] text-center">
                          <div
                            className="flex flex-col items-center justify-center min-h-9 rounded px-2.5 py-2 cursor-pointer transition-all"
                            style={{ backgroundColor: rToColor(d.r, 0.85) }}
                            onClick={() => onDrillDown(o.id, f.id)}
                            title={`r=${d.r}, n=${d.n}, p=${d.p}\nClick to drill down`}
                          >
                            <span
                              className="text-[13px] font-medium tabular-nums"
                              style={{ color: Math.abs(d.r) > 0.25 ? '#fff' : 'rgba(255,255,255,0.5)' }}
                            >
                              {d.r > 0 ? '+' : ''}
                              {d.r.toFixed(3)}
                            </span>
                            <span className="text-[9px] text-[rgba(255,255,255,0.2)]">n={d.n}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-wider">&larr; Negative</span>
        <div className="flex gap-0.5">
          {[-0.5, -0.35, -0.2, -0.05, 0.05, 0.2, 0.35, 0.5].map((r) => (
            <div key={r} className="w-7 h-2.5 rounded-sm" style={{ backgroundColor: rToColor(r, 0.9) }} />
          ))}
        </div>
        <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-wider">Positive &rarr;</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SVG SCATTER PLOT                                                   */
/* ------------------------------------------------------------------ */

function ScatterPlot({
  data,
  xLabel,
  yLabel,
  r,
}: {
  data: { x: number; y: number }[];
  xLabel: string;
  yLabel: string;
  r: number;
}) {
  const W = 500,
    H = 200,
    PAD = 40;
  const xMin = Math.min(...data.map((d) => d.x));
  const xMax = Math.max(...data.map((d) => d.x));
  const yMin = Math.min(...data.map((d) => d.y));
  const yMax = Math.max(...data.map((d) => d.y));
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const toX = (v: number) => PAD + ((v - xMin) / xRange) * (W - PAD * 2);
  const toY = (v: number) => H - PAD - ((v - yMin) / yRange) * (H - PAD * 2);

  const meanX = data.reduce((s, d) => s + d.x, 0) / data.length;
  const meanY = data.reduce((s, d) => s + d.y, 0) / data.length;
  const num = data.reduce((s, d) => s + (d.x - meanX) * (d.y - meanY), 0);
  const den = data.reduce((s, d) => s + (d.x - meanX) ** 2, 0);
  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;

  const posCol = 'rgba(94,162,182,';
  const negCol = 'rgba(232,146,74,';

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: 500 }}>
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={`gx${t}`}
          x1={toX(xMin + t * xRange)}
          y1={PAD}
          x2={toX(xMin + t * xRange)}
          y2={H - PAD}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      ))}
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={`gy${t}`}
          x1={PAD}
          y1={toY(yMin + t * yRange)}
          x2={W - PAD}
          y2={toY(yMin + t * yRange)}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      ))}
      <line
        x1={toX(xMin)}
        y1={toY(slope * xMin + intercept)}
        x2={toX(xMax)}
        y2={toY(slope * xMax + intercept)}
        stroke={r > 0 ? '#5ea2b6' : '#e8924a'}
        strokeWidth={1.5}
        strokeDasharray="6,4"
        opacity={0.7}
      />
      {data.map((d, i) => (
        <circle
          key={i}
          cx={toX(d.x)}
          cy={toY(d.y)}
          r={3.5}
          fill={r > 0 ? `${posCol}0.45)` : `${negCol}0.45)`}
          stroke={r > 0 ? `${posCol}0.7)` : `${negCol}0.7)`}
          strokeWidth={0.5}
        />
      ))}
      <text
        x={W / 2}
        y={H - 6}
        fill="rgba(255,255,255,0.35)"
        fontSize={10}
        textAnchor="middle"
      >
        {xLabel}
      </text>
      <text
        x={10}
        y={H / 2}
        fill="rgba(255,255,255,0.35)"
        fontSize={10}
        textAnchor="middle"
        transform={`rotate(-90, 10, ${H / 2})`}
      >
        {yLabel}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  VIEW: OUTCOME DRILL-DOWN                                           */
/* ------------------------------------------------------------------ */

function OutcomeDrillDown({
  initialOutcome,
  initialFactor,
}: {
  initialOutcome?: string;
  initialFactor?: string;
}) {
  const [selectedOutcome, setSelectedOutcome] = useState(initialOutcome || 'foot_traffic');
  const [expandedFactor, setExpandedFactor] = useState<string | null>(initialFactor || null);
  const [lag, setLag] = useState(0);
  const [minObs, setMinObs] = useState(20);

  const ranked = useMemo(() => {
    return FLOW_FACTORS.map((f) => ({
      ...f,
      ...CORRELATIONS[f.id]?.[selectedOutcome],
    }))
      .filter((f) => (f as any).n >= minObs)
      .sort((a, b) => Math.abs((b as any).r) - Math.abs((a as any).r)) as (FlowFactor & Correlation)[];
  }, [selectedOutcome, minObs]);

  const maxAbsR = useMemo(() => Math.max(...ranked.map((f) => Math.abs(f.r)), 0.1), [ranked]);

  const scatterData = useMemo(() => {
    if (!expandedFactor) return [];
    return generateScatterData(expandedFactor, selectedOutcome);
  }, [expandedFactor, selectedOutcome]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest">Outcome</span>
          <div className="flex gap-0.5">
            {OUTCOMES.map((o) => (
              <Pill
                key={o.id}
                active={selectedOutcome === o.id}
                onClick={() => {
                  setSelectedOutcome(o.id);
                  setExpandedFactor(null);
                }}
                className="min-w-[90px]"
              >
                {o.symbol}
              </Pill>
            ))}
          </div>
        </div>
        <LagSelector lags={LAG_OPTIONS} value={lag} onChange={setLag} label="Lag" />
        <MinObsSlider value={minObs} onChange={setMinObs} />
      </div>
      <ConfoundBanner confounds={CONFOUNDS} />

      {/* Top 3 */}
      {ranked.length >= 3 && (
        <div className="flex gap-3 mb-5">
          {ranked.slice(0, 3).map((f, i) => (
            <div
              key={f.id}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 flex flex-col gap-1"
            >
              <div className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest">#{i + 1}</div>
              <div className="text-[17px] text-[var(--text)]">{f.name}</div>
              <div
                className="text-base font-medium tabular-nums"
                style={{ color: f.r > 0 ? 'var(--accent)' : '#e8924a' }}
              >
                r = {f.r > 0 ? '+' : ''}
                {f.r.toFixed(3)}
              </div>
              <div className="text-[10px] text-[var(--text-faint)]">n={f.n}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bar chart */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        {ranked.map((f) => {
          const barWidth = (Math.abs(f.r) / maxAbsR) * 100;
          const isExpanded = expandedFactor === f.id;
          return (
            <div key={f.id}>
              <div
                className={`flex items-center gap-3 px-3.5 py-2 cursor-pointer border-b border-[var(--border-subtle)] transition-colors hover:bg-[rgba(255,255,255,0.02)] ${
                  isExpanded ? 'bg-[rgba(255,255,255,0.04)]' : ''
                }`}
                onClick={() => setExpandedFactor(isExpanded ? null : f.id)}
              >
                <div className="w-[140px] shrink-0 text-xs text-[var(--text-muted)]">{f.name}</div>
                <div className="flex-1 h-4 bg-[rgba(255,255,255,0.03)] rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-[width] duration-300"
                    style={{ width: `${barWidth}%`, backgroundColor: rToColor(f.r, 0.9) }}
                  />
                </div>
                <div className="w-[100px] shrink-0 flex items-center justify-end gap-2">
                  <span
                    className="text-xs tabular-nums"
                    style={{ color: f.r > 0 ? 'var(--accent)' : '#e8924a' }}
                  >
                    {f.r > 0 ? '+' : ''}
                    {f.r.toFixed(3)}
                  </span>
                  <span className="text-[10px] text-[var(--text-faint)] tabular-nums">n={f.n}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="flex justify-center px-3.5 py-2 pb-4 border-b border-[var(--border)]">
                  <ScatterPlot
                    data={scatterData}
                    xLabel={f.name}
                    yLabel={(OUTCOMES.find((o) => o.id === selectedOutcome)?.name ?? '') + ' Δ%'}
                    r={f.r}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VIEW: SONG PERFORMANCE                                             */
/* ------------------------------------------------------------------ */

function SongPerformance() {
  const [sortKey, setSortKey] = useState('playCount');
  const [sortDir, setSortDir] = useState(-1);
  const [expandedSong, setExpandedSong] = useState<string | null>(null);
  const [minPlays, setMinPlays] = useState(10);
  const weights = { foot_traffic: 0.33, dwell_time: 0.34, pos: 0.33 };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => d * -1);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const songsWithScore = useMemo(() => {
    return SONGS.filter((s) => s.playCount >= minPlays)
      .map((s) => ({
        ...s,
        composite: Object.entries(weights).reduce((sum, [k, w]) => sum + (s.outcomes[k] ?? 0) * w, 0),
      }))
      .sort((a, b) => {
        let aVal: any, bVal: any;
        if (sortKey === 'composite') {
          aVal = a.composite;
          bVal = b.composite;
        } else if (sortKey === 'playCount') {
          aVal = a.playCount;
          bVal = b.playCount;
        } else if (OUTCOMES.find((o) => o.id === sortKey)) {
          aVal = a.outcomes[sortKey];
          bVal = b.outcomes[sortKey];
        } else {
          aVal = a.name;
          bVal = b.name;
        }
        if (typeof aVal === 'string') return sortDir * aVal.localeCompare(bVal);
        return sortDir * (aVal - bVal);
      });
  }, [sortKey, sortDir, minPlays]);

  const getTopFactors = (song: Song) => {
    const avgFactors: Record<string, number> = {};
    FLOW_FACTORS.forEach((f) => {
      avgFactors[f.id] = SONGS.reduce((s, sng) => s + (sng.factors[f.id] || 0), 0) / SONGS.length;
    });
    return FLOW_FACTORS.map((f) => ({ ...f, diff: Math.abs((song.factors[f.id] || 0) - avgFactors[f.id]) }))
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);
  };

  const SortHeader = ({
    label,
    keyName,
    align = 'right',
  }: {
    label: string;
    keyName: string;
    align?: string;
  }) => (
    <th
      className="px-2.5 py-2.5 text-[10px] uppercase tracking-widest text-[var(--text-faint)] font-normal border-b border-[var(--border)] cursor-pointer select-none"
      style={{ textAlign: align as any }}
      onClick={() => handleSort(keyName)}
    >
      {label}
      {sortKey === keyName && <span className="ml-1 opacity-50">{sortDir > 0 ? '\u2191' : '\u2193'}</span>}
    </th>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest">Min plays</span>
          <input
            type="range"
            min={1}
            max={80}
            value={minPlays}
            onChange={(e) => setMinPlays(Number(e.target.value))}
            className="w-24 slider-active"
          />
          <span className="text-[11px] text-[var(--text-muted)] tabular-nums min-w-6 text-right">{minPlays}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              <SortHeader label="Song" keyName="name" align="left" />
              <SortHeader label="Plays" keyName="playCount" />
              <th className="px-2.5 py-2.5 text-[10px] uppercase tracking-widest text-[var(--text-faint)] font-normal border-b border-[var(--border)] text-left pl-4 w-[200px]">
                Distinguishing Factors
              </th>
              <SortHeader label="FT Δ%" keyName="foot_traffic" />
              <SortHeader label="DT Δ%" keyName="dwell_time" />
              <SortHeader label="POS Δ%" keyName="pos" />
              <SortHeader label="Score" keyName="composite" />
            </tr>
          </thead>
          <tbody>
            {songsWithScore.map((song) => {
              const isExpanded = expandedSong === song.id;
              const conf = Math.min(song.playCount / 100, 1);
              const topFactors = getTopFactors(song);
              return (
                <Fragment key={song.id}>
                  <tr
                    className={`cursor-pointer transition-colors border-b border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.02)] ${
                      isExpanded ? 'bg-[rgba(255,255,255,0.03)]' : ''
                    }`}
                    onClick={() => setExpandedSong(isExpanded ? null : song.id)}
                  >
                    <td className="px-2.5 py-2.5 text-[15px] text-[var(--text)]">{song.name}</td>
                    <td className="px-2.5 py-2.5 text-right text-xs text-[var(--text-muted)] tabular-nums">
                      <span style={{ opacity: conf * 0.7 + 0.3 }}>{song.playCount}</span>
                    </td>
                    <td className="px-2.5 py-2.5 text-left pl-4">
                      <div className="flex gap-1 flex-wrap">
                        {topFactors.map((f) => (
                          <span
                            key={f.id}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] border border-[var(--border)] text-[var(--text-faint)] whitespace-nowrap tracking-wide"
                          >
                            {f.name.slice(0, 8)}:{' '}
                            {typeof song.factors[f.id] === 'number' && song.factors[f.id] < 10
                              ? song.factors[f.id].toFixed(2)
                              : song.factors[f.id]}
                          </span>
                        ))}
                      </div>
                    </td>
                    {OUTCOMES.map((o) => (
                      <td key={o.id} className="px-2.5 py-2.5 text-right text-xs tabular-nums">
                        <span style={{ color: deltaColor(song.outcomes[o.id], conf) }}>
                          {song.outcomes[o.id] > 0 ? '+' : ''}
                          {song.outcomes[o.id].toFixed(1)}
                        </span>
                      </td>
                    ))}
                    <td className="px-2.5 py-2.5 text-right text-[13px] font-semibold tabular-nums">
                      <span style={{ color: song.composite > 0 ? 'var(--accent)' : '#e8924a' }}>
                        {song.composite > 0 ? '+' : ''}
                        {song.composite.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="p-0 border-b border-[var(--border)] bg-[rgba(94,162,182,0.02)]">
                        <div className="flex flex-wrap gap-8 p-4 px-5">
                          {/* Factor profile */}
                          <div className="flex-[2] min-w-[280px]">
                            <div className="text-[10px] uppercase tracking-widest text-[var(--text-faint)] mb-3">
                              Flow Factor Profile
                            </div>
                            <div className="flex flex-col gap-1">
                              {FLOW_FACTORS.filter((f) => f.id !== 'tempo').map((f) => (
                                <div key={f.id} className="flex items-center gap-2">
                                  <span className="w-[120px] shrink-0 text-[10px] text-[var(--text-faint)] text-right">
                                    {f.name}
                                  </span>
                                  <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.04)] rounded-sm overflow-hidden">
                                    <div
                                      className="h-full rounded-sm"
                                      style={{
                                        width: `${(song.factors[f.id] || 0) * 100}%`,
                                        background: 'linear-gradient(90deg, rgba(94,162,182,0.3), rgba(94,162,182,0.6))',
                                      }}
                                    />
                                  </div>
                                  <span className="w-[50px] shrink-0 text-[10px] text-[var(--text-faint)] text-right tabular-nums">
                                    {(song.factors[f.id] || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                              <div className="flex items-center gap-2">
                                <span className="w-[120px] shrink-0 text-[10px] text-[var(--text-faint)] text-right">
                                  Tempo
                                </span>
                                <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.04)] rounded-sm overflow-hidden">
                                  <div
                                    className="h-full rounded-sm"
                                    style={{
                                      width: `${((song.factors.tempo - 70) / 80) * 100}%`,
                                      background: 'linear-gradient(90deg, rgba(94,162,182,0.3), rgba(94,162,182,0.6))',
                                    }}
                                  />
                                </div>
                                <span className="w-[50px] shrink-0 text-[10px] text-[var(--text-faint)] text-right tabular-nums">
                                  {song.factors.tempo} BPM
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Variance */}
                          <div className="flex-1 min-w-[180px]">
                            <div className="text-[10px] uppercase tracking-widest text-[var(--text-faint)] mb-3">
                              Outcome Variance (&sigma;)
                            </div>
                            {OUTCOMES.map((o) => (
                              <div
                                key={o.id}
                                className="flex items-center gap-2.5 py-1.5 border-b border-[var(--border-subtle)]"
                              >
                                <span className="text-xs text-[var(--text-muted)] font-medium w-[30px]">
                                  {o.symbol}
                                </span>
                                <span className="text-xs text-[var(--text-faint)] tabular-nums">
                                  &plusmn;{song.variance[o.id].toFixed(1)}%
                                </span>
                                <span
                                  className="text-[9px] px-2 py-0.5 rounded tracking-wide"
                                  style={{
                                    backgroundColor:
                                      song.variance[o.id] < 8 ? 'rgba(94,162,182,0.15)' : 'rgba(232,146,74,0.15)',
                                    color: song.variance[o.id] < 8 ? 'var(--accent)' : '#e8924a',
                                  }}
                                >
                                  {song.variance[o.id] < 8 ? 'consistent' : 'high variance'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Need Fragment import                                               */
/* ------------------------------------------------------------------ */

import { Fragment } from 'react';

/* ------------------------------------------------------------------ */
/*  MAIN EXPORT                                                        */
/* ------------------------------------------------------------------ */

export default function OutcomesIntelligence() {
  const [view, setView] = useState('matrix');
  const [drillDownState, setDrillDownState] = useState<{ outcome?: string; factor?: string }>({});
  const [timeRange, setTimeRange] = useState('30d');

  const handleDrillDown = useCallback((outcomeId: string, factorId: string) => {
    setDrillDownState({ outcome: outcomeId, factor: factorId });
    setView('drilldown');
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-5 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl text-[var(--text)] m-0 uppercase">Outcomes Intelligence</h1>
          <p className="text-[11px] text-[var(--text-faint)] mt-1 uppercase tracking-widest">
            Flow Factor &times; Commercial Outcome Correlation Analysis
          </p>
        </div>
        <div className="flex gap-0.5">
          {['7d', '30d', '90d', 'All'].map((t) => (
            <Pill key={t} active={timeRange === t} onClick={() => setTimeRange(t)}>
              {t}
            </Pill>
          ))}
        </div>
      </div>

      {/* View Tabs */}
      <SegmentedControl
        value={view}
        onChange={(v) => {
          setView(v);
          if (v !== 'drilldown') setDrillDownState({});
        }}
        options={[
          { value: 'matrix', label: 'Influence Matrix' },
          { value: 'drilldown', label: 'Outcome Drill-Down' },
          { value: 'songs', label: 'Song Performance' },
        ]}
      />

      {/* Views */}
      <div className="min-h-[400px]">
        {view === 'matrix' && <InfluenceMatrix onDrillDown={handleDrillDown} />}
        {view === 'drilldown' && (
          <OutcomeDrillDown initialOutcome={drillDownState.outcome} initialFactor={drillDownState.factor} />
        )}
        {view === 'songs' && <SongPerformance />}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-3 border-t border-[var(--border)] flex justify-between text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
        <span>Correlation &#x2260; causation &middot; Bivariate Pearson r &middot; Confound-flagged</span>
        <span className="text-[rgba(94,162,182,0.3)]">RONSON v2 &middot; Outcomes Intelligence</span>
      </div>
    </div>
  );
}
