import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb.js';
import { useBulkImport } from '../../lib/crm/useBulkImport.js';
import { CATEGORIES, STATUSES, humanizeEnum } from '../../lib/crm/types.js';

// Column name normalisation map — tolerant of variations
const COLUMN_MAP: Record<string, string> = {
  first_name: 'first_name', firstname: 'first_name', 'first name': 'first_name',
  last_name: 'last_name', lastname: 'last_name', 'last name': 'last_name',
  email: 'email', 'email address': 'email',
  email_alt: 'email_alt', 'alt email': 'email_alt', 'alternate email': 'email_alt',
  phone: 'phone', 'phone number': 'phone',
  linkedin_url: 'linkedin_url', linkedin: 'linkedin_url', 'linkedin url': 'linkedin_url',
  twitter_handle: 'twitter_handle', twitter: 'twitter_handle',
  website_url: 'website_url', website: 'website_url',
  organization_name: 'organization_name', organization: 'organization_name', company: 'organization_name',
  title: 'title', 'job title': 'title', position: 'title',
  category: 'category',
  sub_category: 'sub_category', subcategory: 'sub_category',
  status: 'status',
  priority: 'priority',
  city: 'city', state: 'state', country: 'country',
  source: 'source', source_detail: 'source_detail',
  notes: 'notes', note: 'notes',
  tags: 'tags', tag: 'tags',
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const rawHeaders = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
  const headers = rawHeaders.map((h) => COLUMN_MAP[h.toLowerCase()] ?? h.toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').replace(/^["']|["']$/g, '').trim();
    });
    return row;
  }).filter((r) => r.first_name || r.last_name || r.email);
}

export default function ImportView() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [editRows, setEditRows] = useState<Record<string, any>[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [result, setResult] = useState<{ success: number; errors: { index: number; error: string }[] } | null>(null);
  const importMutation = useBulkImport();

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setEditRows(parsed.map((r) => ({ ...r, priority: r.priority ? Number(r.priority) : 3 })));
      setStep('preview');
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function setCell(rowIdx: number, key: string, value: any) {
    setEditRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r));
  }

  async function handleImport() {
    const res = await importMutation.mutateAsync(editRows);
    setResult((res as any).data);
    setStep('done');
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'CRM', href: '/crm' }, { label: 'Contacts', href: '/crm/contacts' }, { label: 'Bulk Import' }]} />

      {step === 'upload' && (
        <div
          className="bg-[#1b1b24] border-2 border-dashed border-[rgba(255,255,255,0.15)] rounded-xl p-12 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <p className="text-[rgba(255,255,255,0.87)] font-medium mb-2">Drop a CSV file here</p>
          <p className="text-sm text-[rgba(255,255,255,0.4)] mb-4">
            Required columns: <code className="text-[#5ea2b6]">first_name</code>, <code className="text-[#5ea2b6]">last_name</code>, <code className="text-[#5ea2b6]">category</code>
          </p>
          <p className="text-xs text-[rgba(255,255,255,0.3)] mb-6">
            Optional: email, phone, linkedin_url, organization_name, title, status, priority, city, state, country, source, source_detail, notes, tags
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="bg-[#5ea2b6] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#70b4c8] transition-colors"
          >
            Browse File
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      )}

      {step === 'preview' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[rgba(255,255,255,0.6)]">{editRows.length} contacts to import — review and edit before confirming</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep('upload')} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">← Back</button>
              <button type="button" onClick={handleImport} disabled={importMutation.isPending || editRows.length === 0} className="bg-[#5ea2b6] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#70b4c8] disabled:opacity-50 transition-colors">
                {importMutation.isPending ? 'Importing...' : `Import ${editRows.length} contacts`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full bg-[#1b1b24] rounded-xl text-xs">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.09)]">
                  <th className="text-left px-2 py-2 font-medium text-[rgba(255,255,255,0.4)] w-6">#</th>
                  <th className="text-left px-2 py-2 font-medium text-[rgba(255,255,255,0.4)]">First</th>
                  <th className="text-left px-2 py-2 font-medium text-[rgba(255,255,255,0.4)]">Last</th>
                  <th className="text-left px-2 py-2 font-medium text-[rgba(255,255,255,0.4)]">Email</th>
                  <th className="text-left px-2 py-2 font-medium text-[rgba(255,255,255,0.4)]">Org</th>
                  <th className="text-left px-2 py-2 font-medium text-[rgba(255,255,255,0.4)]">Category *</th>
                  <th className="text-left px-2 py-2 font-medium text-[rgba(255,255,255,0.4)]">Status</th>
                  <th className="text-left px-2 py-2 font-medium text-[rgba(255,255,255,0.4)]">P</th>
                </tr>
              </thead>
              <tbody>
                {editRows.map((row, i) => (
                  <tr key={i} className="border-b border-[rgba(255,255,255,0.04)]">
                    <td className="px-2 py-1.5 text-[rgba(255,255,255,0.35)]">{i + 1}</td>
                    <td className="px-2 py-1.5">
                      <input value={row.first_name ?? ''} onChange={(e) => setCell(i, 'first_name', e.target.value)} className="w-20 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded px-1.5 py-0.5 text-[rgba(255,255,255,0.87)]" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={row.last_name ?? ''} onChange={(e) => setCell(i, 'last_name', e.target.value)} className="w-20 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded px-1.5 py-0.5 text-[rgba(255,255,255,0.87)]" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={row.email ?? ''} onChange={(e) => setCell(i, 'email', e.target.value)} className="w-36 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded px-1.5 py-0.5 text-[rgba(255,255,255,0.87)]" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={row.organization_name ?? ''} onChange={(e) => setCell(i, 'organization_name', e.target.value)} className="w-28 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded px-1.5 py-0.5 text-[rgba(255,255,255,0.87)]" />
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={row.category ?? 'other'} onChange={(e) => setCell(i, 'category', e.target.value)} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded px-1 py-0.5 text-[rgba(255,255,255,0.87)]">
                        {CATEGORIES.map((c) => <option key={c} value={c}>{humanizeEnum(c)}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={row.status ?? 'not_started'} onChange={(e) => setCell(i, 'status', e.target.value)} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded px-1 py-0.5 text-[rgba(255,255,255,0.87)]">
                        {STATUSES.map((s) => <option key={s} value={s}>{humanizeEnum(s)}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={row.priority ?? 3} onChange={(e) => setCell(i, 'priority', Number(e.target.value))} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded px-1 py-0.5 text-[rgba(255,255,255,0.87)]">
                        {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>P{p}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-6">
          <h2 className="font-medium text-[rgba(255,255,255,0.87)] mb-4">Import Complete</h2>
          <div className="flex gap-6 mb-4">
            <div>
              <p className="text-3xl font-semibold text-[#6ba38a]">{result.success}</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Imported successfully</p>
            </div>
            {result.errors.length > 0 && (
              <div>
                <p className="text-3xl font-semibold text-[#ea6152]">{result.errors.length}</p>
                <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Failed</p>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-2">Errors</p>
              {result.errors.map((e) => (
                <p key={e.index} className="text-xs text-[#ea6152]">Row {e.index + 1}: {e.error}</p>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate('/crm/contacts')} className="bg-[#5ea2b6] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#70b4c8] transition-colors">View Contacts</button>
            <button type="button" onClick={() => { setStep('upload'); setRows([]); setEditRows([]); setResult(null); }} className="border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">Import More</button>
          </div>
        </div>
      )}
    </div>
  );
}
