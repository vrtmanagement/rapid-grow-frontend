import React, { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { API_BASE, AUTH_STORAGE_KEY } from '../config/api';
import ErrorAlert from '../components/ui/ErrorAlert';
import { getReadableError, parseApiResponse } from '../services/apiClient';

interface ResetPasswordViewProps {
  onResetSuccess: (token: string, employee: any) => void;
}

function getResetTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('token') || '';
}

const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onResetSuccess }) => {
  const token = useMemo(() => getResetTokenFromUrl().trim(), []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Reset token is missing from the link.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/employees/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await parseApiResponse<any>(res);
      if (data.token && data.employee) {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ token: data.token, employee: data.employee })
        );
        onResetSuccess(data.token, data.employee);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setError(getReadableError(err, 'Password reset failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9] p-4">
      <AuthCard>
        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorAlert message={error} />
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">New password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-slate-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-red text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </AuthCard>
    </div>
  );
};

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
        <p className="text-slate-500 mt-2">Use at least 8 characters with upper, lower, number, and symbol</p>
      </div>
      {children}
    </div>
  );
}

export default ResetPasswordView;
