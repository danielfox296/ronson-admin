// ─── Ronson Analytics — Mock Data ─────────────────────────────────────────────
// All data here will be replaced with React Query hooks once API endpoints exist.

export interface FlowFactor {
  name: string;
  value: number | null;
  unit?: string;
  display?: string;
  max?: number;
}

export interface PsyCoord {
  axis: string;
  value: number;
}

export interface PsyOverlayPoint {
  axis: string;
  target: number;
  actual: number;
}

export interface Track {
  id: number;
  name: string;
  state: string;
  duration: string;
  plays: number;
  lastPlayed: string;
  status: "active" | "queued" | "completed";
}

export interface TimelinePoint {
  time: string;
  footTraffic: number;
  dwell: number;
  pos: number;
}

export interface CorrelationRow {
  factor: string;
  footTraffic: number;
  dwell: number;
  pos: number;
}

export interface RegressionRow {
  factor: string;
  r2: number;
  p: number;
  ciLow: number;
  ciHigh: number;
}

export interface LiftEvent {
  date: string;
  time: string;
  label: string;
  impact: "positive" | "negative";
}

export interface HeatmapRow {
  track: string;
  days: number[];
}

export interface StateBlock {
  start: number;
  end: number;
  state: string;
  color: string;
}

export interface StateTransition {
  time: string;
  state: string;
}

export interface BumpDatum {
  cohort: string;
  weight: number;
}

export interface CapitalDatum {
  axis: string;
  value: number;
}

export interface ConstraintRule {
  era?: string;
  genre?: string;
  avoid?: string;
  constraint: string;
}

// ─── MVP Data ───────────────────────────────────────────────────────────────

export const FLOW_FACTORS: Record<string, FlowFactor[]> = {
  "Compositional": [
    { name: "Tempo", value: 72, unit: " BPM", max: 180 },
    { name: "Key / Mode", value: null, display: "D Dorian" },
    { name: "Harmonic Density", value: 6, unit: "", max: 10 },
    { name: "Melodic Contour", value: 5, unit: "", max: 10 },
    { name: "Rhythmic Complexity", value: 4, unit: "", max: 10 },
    { name: "Structural Length", value: 180, unit: " sec", max: 360 },
    { name: "Section Count", value: 4, unit: "", max: 8 },
    { name: "Motif Repetition", value: 7, unit: "", max: 10 },
    { name: "Dissonance Index", value: 3, unit: "", max: 10 },
    { name: "Harmonic Rhythm", value: 5, unit: "", max: 10 },
  ],
  "Performance / Expression": [
    { name: "Dynamic Range", value: 6, unit: "", max: 10 },
    { name: "Articulation", value: null, display: "Legato" },
    { name: "Vibrato Depth", value: 2, unit: "", max: 10 },
    { name: "Attack Character", value: null, display: "Soft" },
    { name: "Ensemble Density", value: 5, unit: "", max: 10 },
    { name: "Human Feel", value: 8, unit: "", max: 10 },
    { name: "Emotional Intensity", value: 6, unit: "", max: 10 },
    { name: "Timbral Brightness", value: 5, unit: "", max: 10 },
    { name: "Phrase Breathing", value: 7, unit: "", max: 10 },
    { name: "Gestural Density", value: 4, unit: "", max: 10 },
    { name: "Timing Variance", value: 4, unit: "", max: 10 },
  ],
  "Production / Signal": [
    { name: "Mix Density", value: 5, unit: "", max: 10 },
    { name: "Stereo Width", value: 7, unit: "", max: 10 },
    { name: "Reverb Depth", value: 6, unit: "", max: 10 },
    { name: "Low-End Weight", value: 4, unit: "", max: 10 },
    { name: "High-Freq Presence", value: 6, unit: "", max: 10 },
    { name: "Dynamic LUFS", value: null, display: "\u2212\u0031\u0036 LUFS" },
    { name: "Compression Ratio", value: null, display: "4:1" },
    { name: "Transient Sharpness", value: 5, unit: "", max: 10 },
    { name: "Spatial Complexity", value: 6, unit: "", max: 10 },
    { name: "Noise Floor", value: null, display: "\u2212\u0036\u0030 dB" },
  ],
};

export const PSY_COORDS: PsyCoord[] = [
  { axis: "Arousal", value: 55 },
  { axis: "Valence", value: 65 },
  { axis: "Temporal", value: 45 },
  { axis: "Social Dist.", value: 60 },
  { axis: "Self-Focus", value: 40 },
];

export const TRACKS: Track[] = [
  { id: 1, name: "Drift-001", state: "Ambient Anchor", duration: "3:12", plays: 4, lastPlayed: "14:22", status: "active" },
  { id: 2, name: "Drift-002", state: "Ambient Anchor", duration: "3:45", plays: 3, lastPlayed: "13:15", status: "queued" },
  { id: 3, name: "Lift-001",  state: "Social Warm",    duration: "2:58", plays: 2, lastPlayed: "11:40", status: "queued" },
  { id: 4, name: "Focus-001", state: "Focused Browse", duration: "4:01", plays: 1, lastPlayed: "10:10", status: "queued" },
  { id: 5, name: "Drift-003", state: "Ambient Anchor", duration: "3:30", plays: 5, lastPlayed: "09:05", status: "queued" },
];

export const ROTATION_DATA = [
  { track: "Drift-001", plays: 4 },
  { track: "Drift-002", plays: 3 },
  { track: "Lift-001",  plays: 2 },
  { track: "Focus-001", plays: 1 },
  { track: "Drift-003", plays: 5 },
];

export const TIMELINE_DATA: TimelinePoint[] = [
  { time: "09:00", footTraffic: 12, dwell: 4.2, pos: 0  },
  { time: "10:00", footTraffic: 24, dwell: 5.1, pos: 2  },
  { time: "11:00", footTraffic: 31, dwell: 6.3, pos: 5  },
  { time: "12:00", footTraffic: 45, dwell: 7.8, pos: 8  },
  { time: "13:00", footTraffic: 38, dwell: 6.9, pos: 6  },
  { time: "14:00", footTraffic: 29, dwell: 8.1, pos: 9  },
  { time: "15:00", footTraffic: 35, dwell: 7.5, pos: 7  },
  { time: "16:00", footTraffic: 42, dwell: 6.8, pos: 8  },
];

export const CORRELATION_TABLE: CorrelationRow[] = [
  { factor: "Tempo",           footTraffic:  0.42, dwell: -0.18, pos:  0.31 },
  { factor: "Arousal",         footTraffic:  0.61, dwell: -0.33, pos:  0.55 },
  { factor: "Valence",         footTraffic:  0.28, dwell:  0.72, pos:  0.44 },
  { factor: "Social Distance", footTraffic:  0.15, dwell:  0.68, pos:  0.39 },
  { factor: "Low-End Weight",  footTraffic: -0.22, dwell:  0.19, pos: -0.11 },
  { factor: "Reverb Depth",    footTraffic: -0.35, dwell:  0.54, pos:  0.12 },
];

export const BUMP_DATA: BumpDatum[] = [
  { cohort: "18\u201324", weight: 0.3 },
  { cohort: "25\u201334", weight: 0.5 },
  { cohort: "35\u201344", weight: 0.9 },
  { cohort: "45\u201354", weight: 0.6 },
  { cohort: "55\u201364", weight: 0.3 },
  { cohort: "65+",   weight: 0.2 },
];

export const CAPITAL_DATA: CapitalDatum[] = [
  { axis: "Embodied",      value: 60 },
  { axis: "Objectified",   value: 70 },
  { axis: "Institutional", value: 80 },
];

// ─── Phase 2 Data ───────────────────────────────────────────────────────────

export const HEATMAP_DATA: HeatmapRow[] = [
  { track: "Drift-001", days: [4, 3, 5, 2, 4, 3, 4] },
  { track: "Drift-002", days: [3, 4, 2, 3, 3, 2, 3] },
  { track: "Lift-001",  days: [2, 1, 3, 2, 2, 1, 2] },
  { track: "Focus-001", days: [1, 2, 1, 1, 1, 2, 1] },
  { track: "Drift-003", days: [5, 4, 3, 5, 4, 5, 5] },
];
export const HEATMAP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const STATE_BLOCKS: StateBlock[] = [
  { start: 9, end: 12, state: "Ambient Anchor", color: "#c9a84c" },
  { start: 12, end: 14, state: "Social Warm", color: "#2dd4bf" },
  { start: 14, end: 17, state: "Focused Browse", color: "#a78bfa" },
  { start: 17, end: 19, state: "Social Warm", color: "#2dd4bf" },
  { start: 19, end: 21, state: "Closing Drift", color: "#555" },
];

export const STATE_TRANSITIONS: StateTransition[] = [
  { time: "12:00", state: "Social Warm" },
  { time: "14:00", state: "Focused Browse" },
  { time: "17:00", state: "Social Warm" },
];

export const PSY_OVERLAY: PsyOverlayPoint[] = [
  { axis: "Arousal",      target: 55, actual: 52 },
  { axis: "Valence",      target: 65, actual: 60 },
  { axis: "Temporal",     target: 45, actual: 48 },
  { axis: "Social Dist.", target: 60, actual: 55 },
  { axis: "Self-Focus",   target: 40, actual: 43 },
];

export const REGRESSION_DATA: RegressionRow[] = [
  { factor: "Tempo",           r2: 0.18, p: 0.12, ciLow: -0.05, ciHigh: 0.89 },
  { factor: "Arousal",         r2: 0.37, p: 0.04, ciLow:  0.22, ciHigh: 1.00 },
  { factor: "Valence",         r2: 0.08, p: 0.31, ciLow: -0.18, ciHigh: 0.74 },
  { factor: "Social Distance", r2: 0.02, p: 0.58, ciLow: -0.34, ciHigh: 0.38 },
  { factor: "Low-End Weight",  r2: 0.05, p: 0.42, ciLow: -0.49, ciHigh: 0.05 },
  { factor: "Reverb Depth",    r2: 0.12, p: 0.19, ciLow: -0.10, ciHigh: 0.58 },
];

export const LIFT_EVENTS: LiftEvent[] = [
  { date: "Mar 28", time: "12:00", label: "Farmer\u2019s market nearby", impact: "positive" },
  { date: "Mar 29", time: "15:00", label: "Heavy rain \u2014 low foot traffic", impact: "negative" },
  { date: "Mar 30", time: "11:00", label: "Weekend sale event", impact: "positive" },
];

export const CONSTRAINT_PIPELINE: ConstraintRule[] = [
  { era: "1985\u20131994", constraint: "Tempo 90\u2013120 BPM, synth-pad textures, gated reverb OK" },
  { era: "1995\u20132004", constraint: "Lo-fi warmth, trip-hop adjacency, no nu-metal" },
  { genre: "Indie \u00b7 Alt", constraint: "Guitar-forward arrangements, analog feel, avoid overproduction" },
  { avoid: "Pre-1970", constraint: "Suppress all pre-1970 harmonic language and instrumentation" },
];
