import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { API_BASE, AUTH_STORAGE_KEY } from '../config/api';
import { getReadableError, parseApiResponse } from '../services/apiClient';
import ErrorAlert from '../components/ui/ErrorAlert';

interface LoginViewProps {
  onLoginSuccess: (token: string, employee: any) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [requiresTwoFactorSetup, setRequiresTwoFactorSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const completeLogin = (token: string, employee: any) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, employee }));
    onLoginSuccess(token, employee);
  };

  const startSetupOnLogin = async (token: string) => {
    const res = await fetch(`${API_BASE}/employees/2fa/setup-on-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupToken: token }),
    });
    const data = await parseApiResponse<any>(res);
    setSetupSecret(data.secret || '');
    setOtpauthUrl(data.otpauthUrl || '');
    setMessage('Add the secret to Google Authenticator, Microsoft Authenticator, or Authy, then enter the 6-digit code.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (requiresTwoFactorSetup && setupToken && setupSecret) {
        const res = await fetch(`${API_BASE}/employees/2fa/verify-setup-on-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setupToken, token: twoFactorCode.trim() }),
        });
        const data = await parseApiResponse<any>(res);
        if (data.success && data.token && data.employee) {
          completeLogin(data.token, data.employee);
        } else {
          throw new Error('Invalid verification code');
        }
        return;
      }

      if (requiresTwoFactor && pendingToken) {
        const res = await fetch(`${API_BASE}/employees/2fa/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pendingToken, token: twoFactorCode.trim() }),
        });
        const data = await parseApiResponse<any>(res);
        if (data.success && data.token && data.employee) {
          completeLogin(data.token, data.employee);
        } else {
          throw new Error('Invalid verification code');
        }
        return;
      }

      const res = await fetch(`${API_BASE}/employees/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: empId.trim(), password }),
      });
      const data = await parseApiResponse<any>(res);

      if (data.requiresTwoFactorSetup && data.setupToken) {
        setRequiresTwoFactorSetup(true);
        setSetupToken(data.setupToken);
        setMessage(data.message || 'Set up two-factor authentication to continue.');
        await startSetupOnLogin(data.setupToken);
        return;
      }

      if (data.requiresTwoFactor && data.pendingToken) {
        setRequiresTwoFactor(true);
        setPendingToken(data.pendingToken);
        return;
      }

      if (data.success && data.token && data.employee) {
        completeLogin(data.token, data.employee);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setError(getReadableError(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const lockedFields = requiresTwoFactor || requiresTwoFactorSetup;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
      <section className="w-full max-w-md p-8">
        <section className="bg-white rounded-3xl shadow-xl border border-slate-200 p-10">
          <LoginHeader />
          <form onSubmit={handleSubmit} className="space-y-6">
            <ErrorAlert message={error} />
            {message && <p className="text-sm text-emerald-700">{message}</p>}
            {!lockedFields && (
              <section>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email or Employee ID</label>
                <input
                  type="text"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                  placeholder="owner@company.com or SUPER_ADMIN_1"
                />
              </section>
            )}
            {requiresTwoFactorSetup && setupSecret && (
              <section className="rounded-xl bg-slate-50 p-4 text-sm space-y-3">
                <p className="font-medium text-slate-800">Authenticator secret (manual entry)</p>
                <code className="block break-all text-xs bg-white border rounded p-2">{setupSecret}</code>
                {otpauthUrl ? <p className="text-xs text-slate-600 break-all">{otpauthUrl}</p> : null}
                <label className="block text-sm font-semibold text-slate-700 mb-2">6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  placeholder="Code from app"
                />
              </section>
            )}
            {requiresTwoFactor && !requiresTwoFactorSetup && (
              <section>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Authenticator code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  placeholder="6-digit code"
                />
              </section>
            )}
            {!lockedFields && (
              <section>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <section className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-[15px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </section>
                <p className="mt-2 text-right text-sm">
                  <a href="#/password/forgot" className="text-brand-red font-medium hover:underline">
                    Forgot password?
                  </a>
                </p>
              </section>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-brand-red text-white font-bold text-[15px] hover:bg-brand-navy transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Please wait...'
                : requiresTwoFactorSetup
                  ? 'Verify and sign in'
                  : requiresTwoFactor
                    ? 'Verify code'
                    : 'Sign In'}
            </button>
            {!lockedFields && (
              <p className="text-center text-sm text-slate-500">
                New company?{' '}
                <a href="#/signup" className="text-brand-red font-medium hover:underline">
                  Create workspace
                </a>
                {' · '}
                <a href="#/" className="text-brand-red font-medium hover:underline">
                  Back to home
                </a>
              </p>
            )}
          </form>
        </section>
      </section>
    </div>
  );
};

function LoginHeader() {
  return (
    <section className="text-center mb-10">
      <section className="w-16 h-16 bg-brand-red flex items-center justify-center rounded-2xl mx-auto mb-4">
        <span className="text-white text-2xl font-bold">RG</span>
      </section>
      <h1 className="text-2xl font-bold text-slate-900">Rapid Grow Admin Portal</h1>
      <p className="text-slate-500 mt-2">Sign in with your credentials</p>
    </section>
  );
}

export default LoginView;