// ─── Ronson Analytics v2 — Mock Data ────────────────────────────────────────
// All data here will be replaced with React Query hooks once API endpoints exist.

export interface Track {
  id: string;
  start: number;
  end: number;
  color: string;
  ff: Record<string, number>;
}

export interface TimelinePoint {
  i: number;
  h: number;
  m: number;
  label: string;
  traffic: number;
  dwell: number;
  pos: number;
}

export interface WeatherPoint {
  h: string;
  temp: string;
  cond: string;
}

export interface ConfoundEntry {
  id: number;
  type: "staffing" | "weather" | "promo";
  date: string;
  value: string;
  note: string;
}

export interface CorrRow {
  factor: string;
  ft: number;
  dw: number;
  pos: number;
}

export interface BaselineCurvePoint {
  h: string;
  v: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const HOURS = ["09","10","11","12","13","14","15","16","17","18","19","20"];
export const TOTAL_MINS = 660;

// 1-min timeline data (11 hours * 60 minutes)
export const TIMELINE: TimelinePoint[] = Array.from({ length: 11 * 60 }, (_, i) => {
  const h = 9 + Math.floor(i / 60);
  const m = i % 60;
  const t = i / 660;
  const base = Math.sin(t * Math.PI) * 40 + 20;
  return {
    i, h, m,
    label: m === 0 ? `${String(h).padStart(2, "0")}:00` : "",
    traffic: Math.max(0, Math.round(base + (Math.random() - 0.5) * 8)),
    dwell: Math.max(0, parseFloat((3 + Math.sin(t * Math.PI * 2) * 2 + Math.random()).toFixed(1))),
    pos: Math.random() < 0.06 ? 1 : 0,
  };
});

export const TRACKS: Track[] = [
  { id: "D-001", start: 0,   end: 14,  color: "#3a5a4a", ff: { Tempo: 68, Arousal: 42, Valence: 61, "Rev. Depth": 7, "Low End": 3 } },
  { id: "D-002", start: 15,  end: 29,  color: "#2d4a5a", ff: { Tempo: 71, Arousal: 45, Valence: 58, "Rev. Depth": 8, "Low End": 4 } },
  { id: "D-003", start: 30,  end: 43,  color: "#3a4a2d", ff: { Tempo: 74, Arousal: 48, Valence: 64, "Rev. Depth": 6, "Low End": 3 } },
  { id: "L-001", start: 44,  end: 57,  color: "#5a4a2d", ff: { Tempo: 92, Arousal: 68, Valence: 72, "Rev. Depth": 4, "Low End": 5 } },
  { id: "L-002", start: 58,  end: 71,  color: "#5a3a2d", ff: { Tempo: 96, Arousal: 72, Valence: 70, "Rev. Depth": 3, "Low End": 6 } },
  { id: "F-001", start: 72,  end: 86,  color: "#2d3a5a", ff: { Tempo: 78, Arousal: 55, Valence: 50, "Rev. Depth": 5, "Low End": 4 } },
  { id: "D-001", start: 87,  end: 101, color: "#3a5a4a", ff: { Tempo: 68, Arousal: 42, Valence: 61, "Rev. Depth": 7, "Low End": 3 } },
  { id: "L-001", start: 102, end: 116, color: "#5a4a2d", ff: { Tempo: 92, Arousal: 68, Valence: 72, "Rev. Depth": 4, "Low End": 5 } },
  { id: "D-002", start: 117, end: 130, color: "#2d4a5a", ff: { Tempo: 71, Arousal: 45, Valence: 58, "Rev. Depth": 8, "Low End": 4 } },
  { id: "F-001", start: 131, end: 145, color: "#2d3a5a", ff: { Tempo: 78, Arousal: 55, Valence: 50, "Rev. Depth": 5, "Low End": 4 } },
  { id: "L-002", start: 146, end: 159, color: "#5a3a2d", ff: { Tempo: 96, Arousal: 72, Valence: 70, "Rev. Depth": 3, "Low End": 6 } },
  { id: "D-003", start: 160, end: 173, color: "#3a4a2d", ff: { Tempo: 74, Arousal: 48, Valence: 64, "Rev. Depth": 6, "Low End": 3 } },
  { id: "L-001", start: 174, end: 188, color: "#5a4a2d", ff: { Tempo: 92, Arousal: 68, Valence: 72, "Rev. Depth": 4, "Low End": 5 } },
  { id: "D-001", start: 189, end: 203, color: "#3a5a4a", ff: { Tempo: 68, Arousal: 42, Valence: 61, "Rev. Depth": 7, "Low End": 3 } },
  { id: "F-001", start: 204, end: 218, color: "#2d3a5a", ff: { Tempo: 78, Arousal: 55, Valence: 50, "Rev. Depth": 5, "Low End": 4 } },
];

export const WEATHER: WeatherPoint[] = [
  { h: "09:00", temp: "54\u00b0", cond: "Overcast" },
  { h: "10:00", temp: "56\u00b0", cond: "Overcast" },
  { h: "11:00", temp: "59\u00b0", cond: "Partly Cloudy" },
  { h: "12:00", temp: "63\u00b0", cond: "Clear" },
  { h: "13:00", temp: "65\u00b0", cond: "Clear" },
  { h: "14:00", temp: "66\u00b0", cond: "Clear" },
  { h: "15:00", temp: "65\u00b0", cond: "Clear" },
  { h: "16:00", temp: "62\u00b0", cond: "Partly Cloudy" },
  { h: "17:00", temp: "58\u00b0", cond: "Partly Cloudy" },
  { h: "18:00", temp: "55\u00b0", cond: "Overcast" },
];

export const INIT_LOGS: ConfoundEntry[] = [
  { id: 1, type: "staffing", date: "Apr 01", value: "3 staff on floor", note: "Normal weekday" },
  { id: 2, type: "weather",  date: "Apr 01", value: "Auto \u00b7 Open-Meteo", note: "Synced 09:01" },
  { id: 3, type: "promo",    date: "Apr 01", value: "15% \u2014 Friends & Family", note: "All day" },
];

export const CORR_DATA: CorrRow[] = [
  { factor: "Valence",       ft:  0.28, dw:  0.74, pos:  0.61 },
  { factor: "Arousal",       ft:  0.52, dw: -0.31, pos:  0.38 },
  { factor: "Tempo",         ft:  0.44, dw: -0.22, pos:  0.29 },
  { factor: "Rev. Depth",    ft: -0.18, dw:  0.58, pos:  0.22 },
  { factor: "Low End",       ft: -0.24, dw:  0.19, pos: -0.14 },
  { factor: "Dyn. Range",    ft:  0.11, dw:  0.33, pos:  0.26 },
  { factor: "Harmonic Dens", ft:  0.08, dw:  0.41, pos:  0.31 },
  { factor: "Stereo Width",  ft: -0.06, dw:  0.27, pos:  0.18 },
];

export const BASELINE_CURVES = {
  traffic: HOURS.slice(0, 11).map((h, i) => ({
    h: `${h}:00`,
    v: Math.round(18 + Math.sin(i / 10 * Math.PI) * 30),
  })),
  dwell: HOURS.slice(0, 11).map((h, i) => ({
    h: `${h}:00`,
    v: parseFloat((3.2 + Math.sin(i / 10 * Math.PI) * 1.8).toFixed(1)),
  })),
};
