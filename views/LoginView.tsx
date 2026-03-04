import React, { useState } from 'react';
import { API_BASE } from '../config/api';

interface LoginViewProps {
  onLoginSuccess: (token: string, employee: any) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/employees/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: empId.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }
      if (data.success && data.token && data.employee) {
        localStorage.setItem('rapidgrow-admin', JSON.stringify({
          token: data.token,
          employee: data.employee,
        }));
        onLoginSuccess(data.token, data.employee);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-10">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-brand-red flex items-center justify-center rounded-2xl mx-auto mb-4">
              <span className="text-white text-2xl font-bold">RG</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Rapid Grow Admin Portal</h1>
            <p className="text-slate-500 mt-2">Sign in with your credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Employee ID</label>
              <input
                type="text"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                placeholder="e.g. SUPER_ADMIN_1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-brand-red text-white font-bold text-[15px] hover:bg-brand-navy transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
