import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

interface OutcomeScore {
  outcome_id: string;
  outcome_slug: string;
  outcome_name: string;
  score: number;
  is_override: boolean;
  exists: boolean;
}

function barColor(score: number): string {
  if (score >= 70) return '#5ea2b6';
  if (score >= 40) return 'rgba(255,255,255,0.25)';
  return 'rgba(255,255,255,0.1)';
}

function textColor(score: number): string {
  if (score >= 70) return '#70b4c8';
  if (score >= 40) return 'rgba(255,255,255,0.5)';
  return 'rgba(255,255,255,0.25)';
}

export default function OutcomeScores({ songId }: { songId: string }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data } = useQuery({
    queryKey: ['outcome-scores', songId],
    queryFn: () => api<{ data: OutcomeScore[] }>(`/api/songs/${songId}/outcome-scores`),
  });

  const saveMutation = useMutation({
    mutationFn: ({ outcome_id, score }: { outcome_id: string; score: number }) =>
      api(`/api/songs/${songId}/outcome-scores`, { method: 'PUT', body: { scores: [{ outcome_id, score }] } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outcome-scores', songId] });
      setEditingId(null);
    },
  });

  const scores = data?.data || [];

  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-3">Outcome Affinity</h2>
      <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl divide-y divide-[rgba(255,255,255,0.04)]">
        {scores.map((s) => (
          <div key={s.outcome_id} className="flex items-center gap-3 px-4 py-2.5 group">
            <span className="text-xs text-[rgba(255,255,255,0.5)] w-44 shrink-0">{s.outcome_name}</span>

            {editingId === s.outcome_id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                  className="w-20 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-right"
                />
                <button
                  type="button"
                  onClick={() => saveMutation.mutate({ outcome_id: s.outcome_id, score: parseInt(editValue) || 0 })}
                  className="bg-[#5ea2b6] text-white px-2 py-1 rounded text-[10px] hover:bg-[#70b4c8]"
                >
                  Save
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="text-[rgba(255,255,255,0.3)] text-[10px]">Cancel</button>
              </div>
            ) : (
              <>
                <div className="flex-1 h-2 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${s.score}%`, backgroundColor: barColor(s.score) }}
                  />
                </div>
                <span className="text-xs font-mono w-8 text-right" style={{ color: textColor(s.score) }}>
                  {s.score}
                </span>
                {s.is_override && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(230,126,34,0.15)] text-[#e98f38]">manual</span>
                )}
                <button
                  type="button"
                  onClick={() => { setEditingId(s.outcome_id); setEditValue(String(s.score)); }}
                  className="opacity-0 group-hover:opacity-100 text-[#5ea2b6] text-[10px] transition-opacity"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        ))}
        {scores.length === 0 && (
          <p className="px-4 py-6 text-center text-[rgba(255,255,255,0.3)] text-sm">Loading outcome scores...</p>
        )}
      </div>
    </div>
  );
}
