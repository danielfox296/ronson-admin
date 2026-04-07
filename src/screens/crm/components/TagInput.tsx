import { useState, useRef } from 'react';

interface Props {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  suggestions?: string[];
}

export default function TagInput({ tags, onAdd, onRemove, suggestions = [] }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = suggestions.filter((s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s));

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const tag = input.trim().toLowerCase().replace(/,/g, '');
      if (tag && !tags.includes(tag)) onAdd(tag);
      setInput('');
      setShowSuggestions(false);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemove(tags[tags.length - 1]);
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[38px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 bg-[rgba(94,162,182,0.15)] text-[#5ea2b6] text-xs px-2 py-0.5 rounded"
        >
          {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(tag); }} className="text-[#5ea2b6] hover:text-[#ea6152] leading-none">×</button>
        </span>
      ))}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tags.length === 0 ? 'Add tags...' : ''}
          className="bg-transparent text-sm text-[rgba(255,255,255,0.87)] placeholder-[rgba(255,255,255,0.25)] outline-none w-full min-w-[80px]"
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute top-full left-0 mt-1 bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-lg shadow-lg z-20 w-48 max-h-40 overflow-y-auto">
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onAdd(s); setInput(''); setShowSuggestions(false); }}
                className="w-full text-left px-3 py-1.5 text-sm text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.87)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
