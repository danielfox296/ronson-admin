// ── Kraftwerk V1 — Add Confounder Modal ──

import { useState } from 'react';
import type { Confounder } from './kraftwerk-data.js';

interface AddConfounderModalProps {
  onClose: () => void;
  onSave?: (confounder: Omit<Confounder, 'id'>) => void;
}

const TYPES: Confounder['type'][] = ['promotion', 'weather', 'staffing', 'local_event', 'other'];
const IMPACTS: Confounder['impact'][] = ['positive', 'negative', 'neutral'];

export default function AddConfounderModal({ onClose, onSave }: AddConfounderModalProps) {
  const [type, setType] = useState<Confounder['type']>('promotion');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [impact, setImpact] = useState<Confounder['impact']>('neutral');

  const handleSave = () => {
    if (!description.trim() || !startTime) return;
    onSave?.({
      type,
      description: description.trim(),
      startTime,
      endTime: endTime || null,
      impact,
    });
    onClose();
  };

  return (
    <div className="kw-modal-backdrop" onClick={onClose}>
      <div className="kw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kw-modal-title">Add Confounder</div>

        <div className="kw-modal-field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as Confounder['type'])}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="kw-modal-field">
          <label>Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened?"
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="kw-modal-field" style={{ flex: 1 }}>
            <label>Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="kw-modal-field" style={{ flex: 1 }}>
            <label>End Time (optional)</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="kw-modal-field">
          <label>Impact</label>
          <select value={impact} onChange={(e) => setImpact(e.target.value as Confounder['impact'])}>
            {IMPACTS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>

        <div className="kw-modal-actions">
          <button className="kw-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="kw-btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
