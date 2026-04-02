// ── Kraftwerk V1 — data layer, schemas, mock generators ──

// ── Interfaces ──

export interface FlowFactorDef {
  name: string;
  type: "numeric" | "string";
  unit?: string;
  max?: number;
  category: "Compositional" | "Performance / Expression" | "Production / Signal";
}

export interface PsyCoords {
  arousal: number;
  valence: number;
  temporal: number;
  social: number;
  selfFocus: number;
}

export interface TrackDef {
  id: string;
  title: string;
  stateId: string;
  durationSeconds: number;
  flowFactors: Record<string, number | string>;
  psyCoords: PsyCoords;
}

export interface PlaybackEvent {
  trackId: string;
  startedAt: Date;
  endedAt: Date;
}

export interface StateDef {
  id: string;
  name: string;
  description: string;
}

export interface OutcomeBin {
  time: string;
  traffic: number;
  transactions: number;
  revenue: number;
  units: number;
  dwellMinutes: number;
  conversionRate: number;
  aov: number;
  upt: number;
}

export interface Confounder {
  id: string;
  type: "promotion" | "weather" | "staffing" | "local_event" | "other";
  description: string;
  startTime: string;
  endTime: string | null;
  impact: "positive" | "negative" | "neutral";
}

export interface HealthBin {
  time: string;
  hasSonic: boolean;
  hasOutput: boolean;
}

// ── Flow Factor Schema (31 factors) ──

export const FLOW_FACTOR_SCHEMA: FlowFactorDef[] = [
  // Compositional (10)
  { name: "Tempo", type: "numeric", unit: "BPM", max: 180, category: "Compositional" },
  { name: "Key / Mode", type: "string", category: "Compositional" },
  { name: "Harmonic Density", type: "numeric", max: 10, category: "Compositional" },
  { name: "Melodic Contour", type: "numeric", max: 10, category: "Compositional" },
  { name: "Rhythmic Complexity", type: "numeric", max: 10, category: "Compositional" },
  { name: "Structural Length", type: "numeric", unit: "sec", max: 360, category: "Compositional" },
  { name: "Section Count", type: "numeric", max: 8, category: "Compositional" },
  { name: "Motif Repetition", type: "numeric", max: 10, category: "Compositional" },
  { name: "Dissonance Index", type: "numeric", max: 10, category: "Compositional" },
  { name: "Harmonic Rhythm", type: "numeric", max: 10, category: "Compositional" },

  // Performance / Expression (11)
  { name: "Dynamic Range", type: "numeric", max: 10, category: "Performance / Expression" },
  { name: "Articulation", type: "string", category: "Performance / Expression" },
  { name: "Vibrato Depth", type: "numeric", max: 10, category: "Performance / Expression" },
  { name: "Attack Character", type: "string", category: "Performance / Expression" },
  { name: "Ensemble Density", type: "numeric", max: 10, category: "Performance / Expression" },
  { name: "Human Feel", type: "numeric", max: 10, category: "Performance / Expression" },
  { name: "Emotional Intensity", type: "numeric", max: 10, category: "Performance / Expression" },
  { name: "Timbral Brightness", type: "numeric", max: 10, category: "Performance / Expression" },
  { name: "Phrase Breathing", type: "numeric", max: 10, category: "Performance / Expression" },
  { name: "Gestural Density", type: "numeric", max: 10, category: "Performance / Expression" },
  { name: "Timing Variance", type: "numeric", max: 10, category: "Performance / Expression" },

  // Production / Signal (10)
  { name: "Mix Density", type: "numeric", max: 10, category: "Production / Signal" },
  { name: "Stereo Width", type: "numeric", max: 10, category: "Production / Signal" },
  { name: "Reverb Depth", type: "numeric", max: 10, category: "Production / Signal" },
  { name: "Low-End Weight", type: "numeric", max: 10, category: "Production / Signal" },
  { name: "High-Freq Presence", type: "numeric", max: 10, category: "Production / Signal" },
  { name: "Dynamic LUFS", type: "string", category: "Production / Signal" },
  { name: "Compression Ratio", type: "string", category: "Production / Signal" },
  { name: "Transient Sharpness", type: "numeric", max: 10, category: "Production / Signal" },
  { name: "Spatial Complexity", type: "numeric", max: 10, category: "Production / Signal" },
  { name: "Noise Floor", type: "string", category: "Production / Signal" },
];

// ── Psychological States ──

export const STATES: StateDef[] = [
  {
    id: "ambient-anchor",
    name: "Ambient Anchor",
    description: "Low-arousal grounding state for arrival and orientation",
  },
  {
    id: "social-warm",
    name: "Social Warm",
    description: "Elevated energy for social engagement and browsing momentum",
  },
  {
    id: "focused-browse",
    name: "Focused Browse",
    description: "Mid-arousal state supporting deliberate product evaluation",
  },
  {
    id: "closing-drift",
    name: "Closing Drift",
    description: "Gradual wind-down signaling store close without abruptness",
  },
];

// ── Tracks (6 tracks, full 31 factors each) ──

export const TRACKS: TrackDef[] = [
  {
    id: "drift-001",
    title: "Drift I — Glass Plateau",
    stateId: "ambient-anchor",
    durationSeconds: 312,
    flowFactors: {
      "Tempo": 72, "Key / Mode": "Db Lydian", "Harmonic Density": 3, "Melodic Contour": 2,
      "Rhythmic Complexity": 2, "Structural Length": 312, "Section Count": 2, "Motif Repetition": 7,
      "Dissonance Index": 2, "Harmonic Rhythm": 2,
      "Dynamic Range": 3, "Articulation": "legato", "Vibrato Depth": 1, "Attack Character": "soft pad",
      "Ensemble Density": 2, "Human Feel": 4, "Emotional Intensity": 2, "Timbral Brightness": 3,
      "Phrase Breathing": 7, "Gestural Density": 2, "Timing Variance": 3,
      "Mix Density": 3, "Stereo Width": 8, "Reverb Depth": 9, "Low-End Weight": 4,
      "High-Freq Presence": 3, "Dynamic LUFS": "-18 LUFS", "Compression Ratio": "1.5:1",
      "Transient Sharpness": 2, "Spatial Complexity": 7, "Noise Floor": "-60 dBFS",
    },
    psyCoords: { arousal: 0.15, valence: 0.55, temporal: 0.8, social: 0.1, selfFocus: 0.3 },
  },
  {
    id: "drift-002",
    title: "Drift II — Tidal Memory",
    stateId: "ambient-anchor",
    durationSeconds: 288,
    flowFactors: {
      "Tempo": 70, "Key / Mode": "Ab Dorian", "Harmonic Density": 4, "Melodic Contour": 3,
      "Rhythmic Complexity": 2, "Structural Length": 288, "Section Count": 3, "Motif Repetition": 8,
      "Dissonance Index": 3, "Harmonic Rhythm": 2,
      "Dynamic Range": 2, "Articulation": "sustained", "Vibrato Depth": 2, "Attack Character": "evolving pad",
      "Ensemble Density": 3, "Human Feel": 3, "Emotional Intensity": 2, "Timbral Brightness": 2,
      "Phrase Breathing": 8, "Gestural Density": 2, "Timing Variance": 2,
      "Mix Density": 3, "Stereo Width": 9, "Reverb Depth": 8, "Low-End Weight": 5,
      "High-Freq Presence": 2, "Dynamic LUFS": "-19 LUFS", "Compression Ratio": "1.3:1",
      "Transient Sharpness": 1, "Spatial Complexity": 8, "Noise Floor": "-58 dBFS",
    },
    psyCoords: { arousal: 0.12, valence: 0.50, temporal: 0.85, social: 0.08, selfFocus: 0.35 },
  },
  {
    id: "lift-001",
    title: "Lift I — Copper Thread",
    stateId: "social-warm",
    durationSeconds: 246,
    flowFactors: {
      "Tempo": 108, "Key / Mode": "G Mixolydian", "Harmonic Density": 6, "Melodic Contour": 7,
      "Rhythmic Complexity": 5, "Structural Length": 246, "Section Count": 5, "Motif Repetition": 5,
      "Dissonance Index": 3, "Harmonic Rhythm": 6,
      "Dynamic Range": 6, "Articulation": "staccato-legato mix", "Vibrato Depth": 4, "Attack Character": "plucked",
      "Ensemble Density": 6, "Human Feel": 7, "Emotional Intensity": 6, "Timbral Brightness": 7,
      "Phrase Breathing": 4, "Gestural Density": 6, "Timing Variance": 5,
      "Mix Density": 6, "Stereo Width": 6, "Reverb Depth": 4, "Low-End Weight": 5,
      "High-Freq Presence": 7, "Dynamic LUFS": "-14 LUFS", "Compression Ratio": "3:1",
      "Transient Sharpness": 6, "Spatial Complexity": 5, "Noise Floor": "-54 dBFS",
    },
    psyCoords: { arousal: 0.72, valence: 0.78, temporal: 0.4, social: 0.75, selfFocus: 0.15 },
  },
  {
    id: "pulse-001",
    title: "Pulse I — Warm Circuit",
    stateId: "social-warm",
    durationSeconds: 264,
    flowFactors: {
      "Tempo": 96, "Key / Mode": "Eb Major", "Harmonic Density": 5, "Melodic Contour": 6,
      "Rhythmic Complexity": 6, "Structural Length": 264, "Section Count": 4, "Motif Repetition": 6,
      "Dissonance Index": 2, "Harmonic Rhythm": 5,
      "Dynamic Range": 5, "Articulation": "percussive-smooth", "Vibrato Depth": 3, "Attack Character": "mallet",
      "Ensemble Density": 5, "Human Feel": 8, "Emotional Intensity": 5, "Timbral Brightness": 6,
      "Phrase Breathing": 5, "Gestural Density": 5, "Timing Variance": 6,
      "Mix Density": 5, "Stereo Width": 5, "Reverb Depth": 5, "Low-End Weight": 6,
      "High-Freq Presence": 6, "Dynamic LUFS": "-15 LUFS", "Compression Ratio": "2.5:1",
      "Transient Sharpness": 5, "Spatial Complexity": 4, "Noise Floor": "-52 dBFS",
    },
    psyCoords: { arousal: 0.65, valence: 0.72, temporal: 0.45, social: 0.70, selfFocus: 0.2 },
  },
  {
    id: "focus-001",
    title: "Focus I — Quiet Engine",
    stateId: "focused-browse",
    durationSeconds: 276,
    flowFactors: {
      "Tempo": 82, "Key / Mode": "F# Minor", "Harmonic Density": 4, "Melodic Contour": 4,
      "Rhythmic Complexity": 3, "Structural Length": 276, "Section Count": 3, "Motif Repetition": 7,
      "Dissonance Index": 3, "Harmonic Rhythm": 3,
      "Dynamic Range": 4, "Articulation": "legato", "Vibrato Depth": 2, "Attack Character": "bowed",
      "Ensemble Density": 4, "Human Feel": 6, "Emotional Intensity": 4, "Timbral Brightness": 4,
      "Phrase Breathing": 6, "Gestural Density": 3, "Timing Variance": 3,
      "Mix Density": 4, "Stereo Width": 7, "Reverb Depth": 6, "Low-End Weight": 4,
      "High-Freq Presence": 4, "Dynamic LUFS": "-16 LUFS", "Compression Ratio": "2:1",
      "Transient Sharpness": 3, "Spatial Complexity": 6, "Noise Floor": "-56 dBFS",
    },
    psyCoords: { arousal: 0.40, valence: 0.60, temporal: 0.55, social: 0.30, selfFocus: 0.55 },
  },
  {
    id: "settle-001",
    title: "Settle I — Last Light",
    stateId: "closing-drift",
    durationSeconds: 330,
    flowFactors: {
      "Tempo": 66, "Key / Mode": "Bb Aeolian", "Harmonic Density": 2, "Melodic Contour": 2,
      "Rhythmic Complexity": 1, "Structural Length": 330, "Section Count": 2, "Motif Repetition": 9,
      "Dissonance Index": 1, "Harmonic Rhythm": 1,
      "Dynamic Range": 2, "Articulation": "sustained", "Vibrato Depth": 1, "Attack Character": "breath",
      "Ensemble Density": 2, "Human Feel": 3, "Emotional Intensity": 2, "Timbral Brightness": 2,
      "Phrase Breathing": 9, "Gestural Density": 1, "Timing Variance": 2,
      "Mix Density": 2, "Stereo Width": 8, "Reverb Depth": 9, "Low-End Weight": 3,
      "High-Freq Presence": 2, "Dynamic LUFS": "-20 LUFS", "Compression Ratio": "1.2:1",
      "Transient Sharpness": 1, "Spatial Complexity": 7, "Noise Floor": "-62 dBFS",
    },
    psyCoords: { arousal: 0.08, valence: 0.45, temporal: 0.9, social: 0.05, selfFocus: 0.4 },
  },
];

// ── Playback Schedule Generator ──

export function generatePlaybackSchedule(date: Date): PlaybackEvent[] {
  const events: PlaybackEvent[] = [];
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  const timeSlots: { startHour: number; startMin: number; endHour: number; endMin: number; trackIds: string[] }[] = [
    { startHour: 9, startMin: 0, endHour: 11, endMin: 30, trackIds: ["drift-001", "drift-002"] },
    { startHour: 11, startMin: 30, endHour: 14, endMin: 0, trackIds: ["lift-001", "pulse-001"] },
    { startHour: 14, startMin: 0, endHour: 16, endMin: 30, trackIds: ["focus-001"] },
    { startHour: 16, startMin: 30, endHour: 19, endMin: 0, trackIds: ["lift-001", "pulse-001"] },
    { startHour: 19, startMin: 0, endHour: 21, endMin: 0, trackIds: ["settle-001"] },
  ];

  const trackDuration = (id: string) => TRACKS.find(t => t.id === id)?.durationSeconds ?? 270;

  for (const slot of timeSlots) {
    const slotStart = new Date(day);
    slotStart.setHours(slot.startHour, slot.startMin, 0, 0);
    const slotEnd = new Date(day);
    slotEnd.setHours(slot.endHour, slot.endMin, 0, 0);

    let cursor = slotStart.getTime();
    let idx = 0;

    while (cursor < slotEnd.getTime()) {
      const trackId = slot.trackIds[idx % slot.trackIds.length];
      const dur = trackDuration(trackId) * 1000;
      const end = Math.min(cursor + dur, slotEnd.getTime());
      events.push({
        trackId,
        startedAt: new Date(cursor),
        endedAt: new Date(end),
      });
      cursor = end;
      idx++;
    }
  }

  return events;
}

// ── Outcome Data Generator ──

export function generateOutcomeData(): OutcomeBin[] {
  const bins: OutcomeBin[] = [];

  // Retail curve: peaks at lunch (12-13) and late afternoon (16-18)
  const trafficCurve = [
    12, 15, 20, 28, 35, 40, 45, 48, 52, 50, // 9:00–11:30
    55, 60, 65, 62, 58, 50, 45, 42,          // 11:30–16:00 (lunch peak then dip)
    48, 52, 58, 62, 65, 60, 55, 50,          // 16:00–19:00 (afternoon peak)
    45, 40, 35, 30, 25, 20, 18, 15,          // 19:00–21:00 (wind down)
    12, 10, 8, 6, 5, 4, 3, 3, 2, 2, 2, 2, 2, 2,
  ];

  for (let i = 0; i < 48; i++) {
    const hour = 9 + Math.floor(i / 4);
    const min = (i % 4) * 15;
    const time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

    const traffic = trafficCurve[i] ?? 5;
    const convBase = 0.08 + Math.sin((i / 48) * Math.PI) * 0.06;
    const convRate = Math.round(convBase * 1000) / 1000;
    const transactions = Math.round(traffic * convRate);
    const aov = 42 + Math.random() * 18;
    const upt = 1.4 + Math.random() * 0.8;
    const revenue = Math.round(transactions * aov * 100) / 100;
    const units = Math.round(transactions * upt);
    const dwellMinutes = 4 + Math.random() * 8;

    bins.push({
      time,
      traffic,
      transactions,
      revenue: Math.round(revenue * 100) / 100,
      units,
      dwellMinutes: Math.round(dwellMinutes * 10) / 10,
      conversionRate: Math.round(convRate * 10000) / 10000,
      aov: Math.round(aov * 100) / 100,
      upt: Math.round(upt * 100) / 100,
    });
  }

  return bins;
}

// ── Mock Confounders ──

export const MOCK_CONFOUNDERS: Confounder[] = [
  {
    id: "conf-001",
    type: "promotion",
    description: "20% off spring collection — in-store signage",
    startTime: "11:00",
    endTime: "14:00",
    impact: "positive",
  },
  {
    id: "conf-002",
    type: "weather",
    description: "Unexpected rain from 15:00 — foot traffic suppressed",
    startTime: "15:00",
    endTime: "17:30",
    impact: "negative",
  },
  {
    id: "conf-003",
    type: "staffing",
    description: "One associate called out — reduced floor coverage PM",
    startTime: "13:00",
    endTime: null,
    impact: "neutral",
  },
];

// ── Colors & Metrics ──

export const FLOW_FACTOR_COLORS = ["#d4a843", "#22c55e", "#3b82f6", "#8b5cf6", "#ef4444"];

export const OUTPUT_METRICS: { key: string; label: string; color: string; defaultOn: boolean }[] = [
  { key: "conversionRate", label: "Conversion Rate", color: "#22c55e", defaultOn: true },
  { key: "aov", label: "Avg Order Value", color: "#3b82f6", defaultOn: true },
  { key: "traffic", label: "Traffic", color: "#8b5cf6", defaultOn: false },
  { key: "dwellMinutes", label: "Dwell Time", color: "#ef4444", defaultOn: false },
  { key: "upt", label: "Units per Txn", color: "#d4a843", defaultOn: false },
];
