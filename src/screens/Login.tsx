import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{ data: { token: string; user: any } }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        noAuth: true,
      });
      localStorage.setItem('token', res.data.token);
      navigate('/clients');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <form onSubmit={handleSubmit} className="bg-[#1a1a25] border border-[rgba(255,255,255,0.09)] p-8 rounded-xl shadow-2xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-light text-center text-[rgba(255,255,255,0.87)]">Entune Admin</h1>
        {error && <div className="text-[#e74c3c] text-sm bg-[rgba(231,76,60,0.1)] border border-[rgba(231,76,60,0.2)] p-2 rounded-lg">{error}</div>}
        <div>
          <label className="block text-sm font-medium mb-1 text-[rgba(255,255,255,0.5)]">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-[rgba(255,255,255,0.5)]">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm bg-[rgba(255,255,255,0.03)]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#4a90a4] text-white py-2 rounded-lg font-medium hover:bg-[#5ba3b8] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
