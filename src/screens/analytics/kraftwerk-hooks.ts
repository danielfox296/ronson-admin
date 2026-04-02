// ── Kraftwerk V1 — TanStack Query hooks ──

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import type { PlaybackEvent, OutcomeBin, Confounder, HealthBin } from './kraftwerk-data.js';

// ── Timeline (playback events for a day) ──

export function useTimeline(storeId: string, date: string) {
  return useQuery({
    queryKey: ['analytics', 'timeline', storeId, date],
    queryFn: () => api<{ data: PlaybackEvent[] }>(`/api/analytics/${storeId}/timeline?date=${date}`),
    enabled: !!storeId && !!date,
    select: (res) => res.data,
  });
}

// ── Outcomes (15-min bins) ──

export function useOutcomes(storeId: string, date: string) {
  return useQuery({
    queryKey: ['analytics', 'outcomes', storeId, date],
    queryFn: () => api<{ data: OutcomeBin[] }>(`/api/analytics/${storeId}/outcomes?date=${date}`),
    enabled: !!storeId && !!date,
    select: (res) => res.data,
  });
}

// ── Baseline comparison data ──

export function useBaseline(storeId: string, date: string, mode: string) {
  return useQuery({
    queryKey: ['analytics', 'baseline', storeId, date, mode],
    queryFn: () => api<{ data: OutcomeBin[] }>(`/api/analytics/${storeId}/baseline?date=${date}&mode=${mode}`),
    enabled: !!storeId && !!date && mode !== 'none',
    select: (res) => res.data,
  });
}

// ── Confounders ──

export function useConfounders(storeId: string, date: string) {
  return useQuery({
    queryKey: ['analytics', 'confounders', storeId, date],
    queryFn: () => api<{ data: Confounder[] }>(`/api/analytics/${storeId}/confounders?date=${date}`),
    enabled: !!storeId && !!date,
    select: (res) => res.data,
  });
}

export function useAddConfounder(storeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Confounder, 'id'>) =>
      api<{ data: Confounder }>(`/api/analytics/${storeId}/confounders`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics', 'confounders', storeId] });
    },
  });
}

export function useDeleteConfounder(storeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (confounderId: string) =>
      api<void>(`/api/analytics/${storeId}/confounders/${confounderId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics', 'confounders', storeId] });
    },
  });
}

// ── Data health (per-bin completeness) ──

export function useDataHealth(storeId: string, date: string) {
  return useQuery({
    queryKey: ['analytics', 'data-health', storeId, date],
    queryFn: () => api<{ data: HealthBin[] }>(`/api/analytics/${storeId}/data-health?date=${date}`),
    enabled: !!storeId && !!date,
    select: (res) => res.data,
  });
}
