import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Account() {
  const navigate = useNavigate();
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [pwMsg, setPwMsg] = useState('');

  const changePwMutation = useMutation({
    mutationFn: (body: typeof pwForm) => api('/api/auth/change-password', { method: 'POST', body }),
    onSuccess: () => {
      setPwForm({ current_password: '', new_password: '' });
      setPwMsg('Password changed successfully');
    },
    onError: (e: any) => setPwMsg(e.message || 'Failed to change password'),
  });

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl tracking-tight leading-none text-white">Account</h1>
      </div>

      <div className="max-w-md space-y-6">
        {/* Change Password */}
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-medium text-[rgba(255,255,255,0.87)] mb-1">Change Password</h2>
          <input
            type="password"
            placeholder="Current password"
            value={pwForm.current_password}
            onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
            className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="New password"
            value={pwForm.new_password}
            onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
            className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => { setPwMsg(''); changePwMutation.mutate(pwForm); }}
            disabled={!pwForm.current_password || !pwForm.new_password || changePwMutation.isPending}
            className="bg-[#5ea2b6] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#70b4c8] transition-colors"
          >
            {changePwMutation.isPending ? 'Changing...' : 'Change Password'}
          </button>
          {pwMsg && (
            <p className={`text-sm ${changePwMutation.isError ? 'text-[#ea6152]' : 'text-[#33be6a]'}`}>{pwMsg}</p>
          )}
        </div>

        {/* Log Out */}
        <div className="bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl p-5">
          <h2 className="text-sm font-medium text-[rgba(255,255,255,0.87)] mb-1">Session</h2>
          <p className="text-xs text-[rgba(255,255,255,0.4)] mb-4">Sign out of the Entuned admin dashboard.</p>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.87)] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
