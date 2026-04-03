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

function barGradient(score: number): string {
  // Grey on left, red on right — more score reveals more of the gradient
  return `linear-gradient(to right, rgba(160,160,170,0.5), rgba(200,60,50,0.8))`;
}

export default function OutcomeScores({ songId }: { songId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, number>>({});

  const { data } = useQuery({
    queryKey: ['outcome-scores', songId],
    queryFn: () => api<{ data: OutcomeScore[] }>(`/api/songs/${songId}/outcome-scores`),
  });

  const saveMutation = useMutation({
    mutationFn: (scores: { outcome_id: string; score: number }[]) =>
      api(`/api/songs/${songId}/outcome-scores`, { method: 'PUT', body: { scores } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outcome-scores', songId] });
      setEditing(false);
    },
  });

  const scores = data?.data || [];

  const startEdit = () => {
    const form: Record<string, number> = {};
    scores.forEach((s) => { form[s.outcome_id] = s.score; });
    setEditForm(form);
    setEditing(true);
  };

  const handleSave = () => {
    const batch = Object.entries(editForm).map(([outcome_id, score]) => ({ outcome_id, score }));
    saveMutation.mutate(batch);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)]">Outcome Strength</h2>
        {!editing ? (
          <button type="button" onClick={startEdit} className="text-[#5ea2b6] text-[10px] font-bold uppercase tracking-widest hover:text-[#70b4c8]">Edit</button>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={handleSave} className="bg-[#5ea2b6] text-white px-3 py-1 rounded-lg text-xs">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="text-[rgba(255,255,255,0.4)] text-xs">Cancel</button>
          </div>
        )}
      </div>
      <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl divide-y divide-[rgba(255,255,255,0.04)]">
        {scores.map((s) => (
          <div key={s.outcome_id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-xs text-[rgba(255,255,255,0.5)] w-44 shrink-0 truncate">{s.outcome_name}</span>

            {editing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={editForm[s.outcome_id] ?? s.score}
                  onChange={(e) => setEditForm({ ...editForm, [s.outcome_id]: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 appearance-none rounded-full bg-[rgba(255,255,255,0.08)] accent-[#5ea2b6] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5ea2b6]"
                />
                <span className="text-xs font-mono w-8 text-right text-[rgba(255,255,255,0.5)]">
                  {editForm[s.outcome_id] ?? s.score}
                </span>
              </div>
            ) : (
              <>
                <div className="flex-1 h-2 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${s.score}%`,
                      background: barGradient(s.score),
                    }}
                  />
                </div>
                <span className="text-xs font-mono w-8 text-right text-[rgba(255,255,255,0.5)]">
                  {s.score}
                </span>
                {s.is_override && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(230,126,34,0.15)] text-[#e98f38]">manual</span>
                )}
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
