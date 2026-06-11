import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Shield, Sparkles } from 'lucide-react';
import { API_BASE, AUTH_STORAGE_KEY } from '../config/api';
import { LANDING_HERO_IMAGE, LANDING_TAGLINE } from '../config/landingPageConstants';
import { getReadableError, parseApiResponse } from '../services/apiClient';
import ErrorAlert from '../components/ui/ErrorAlert';

interface LoginViewProps {
  onLoginSuccess: (token: string, employee: any) => void;
}

const inputClassName =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/40 focus:border-brand-red/60 focus:ring-2 focus:ring-brand-red/20';

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
    localStorage.removeItem('rapidgrow-permissions-cache-v3');
    localStorage.removeItem('rapidgrow-permissions-cache-v2');
    localStorage.removeItem('rapidgrow-permissions-cache-v1');
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
    <div className="fixed inset-0 overflow-y-auto bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-red/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-brand-navy/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-brand-cyan/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="#/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient shadow-lg shadow-brand-red/20">
              <span className="text-lg font-bold">RG</span>
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">Rapid Grow</p>
              <p className="text-xs text-white/60">Performance Hub</p>
            </div>
          </a>
          <a
            href="#/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to home
          </a>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-16">
        <section className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
            <Sparkles size={16} className="text-brand-cyan" />
            Enterprise Mission Control & Execution Hub
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Welcome back to
            <span className="mt-1 block bg-brand-gradient bg-clip-text text-transparent">
              your performance workspace
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/70">{LANDING_TAGLINE}</p>

          <div className="relative mt-10">
            <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient opacity-20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
              <img
                src={LANDING_HERO_IMAGE}
                alt="Team collaborating on performance dashboards"
                className="h-56 w-full object-cover xl:h-64"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/20 text-brand-red">
                      <Shield size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Secure sign-in</p>
                      <p className="text-xs text-white/60">Private workspace per organization</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md lg:max-w-none">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl sm:p-10">
            <div className="mb-8 lg:hidden">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient shadow-lg shadow-brand-red/20">
                <span className="text-lg font-bold">RG</span>
              </div>
              <h2 className="text-2xl font-bold">Sign in</h2>
              <p className="mt-2 text-sm text-white/60">Access your Rapid Grow workspace</p>
            </div>

            <div className="mb-8 hidden lg:block">
              <h2 className="text-2xl font-bold">Sign in to your account</h2>
              <p className="mt-2 text-sm text-white/60">Use your employee ID or company email</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <ErrorAlert message={error} />
              {message && (
                <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {message}
                </p>
              )}

              {!lockedFields && (
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-white/80">Email or Employee ID</span>
                  <input
                    type="text"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    required
                    className={inputClassName}
                    placeholder="owner@company.com or SUPER_ADMIN_1"
                  />
                </label>
              )}

              {requiresTwoFactorSetup && setupSecret && (
                <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                  <p className="font-medium text-white/90">Authenticator secret (manual entry)</p>
                  <code className="block break-all rounded-lg border border-white/10 bg-slate-950/60 p-2 text-xs text-white/80">
                    {setupSecret}
                  </code>
                  {otpauthUrl ? <p className="break-all text-xs text-white/50">{otpauthUrl}</p> : null}
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-white/80">6-digit code</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      required
                      className={inputClassName}
                      placeholder="Code from app"
                    />
                  </label>
                </div>
              )}

              {requiresTwoFactor && !requiresTwoFactorSetup && (
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-white/80">Authenticator code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    required
                    className={inputClassName}
                    placeholder="6-digit code"
                  />
                </label>
              )}

              {!lockedFields && (
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-white/80">Password</span>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`${inputClassName} pr-11`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-white/40 transition hover:text-white/70"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-right text-sm">
                    <a href="#/password/forgot" className="font-medium text-brand-red transition hover:text-white">
                      Forgot password?
                    </a>
                  </p>
                </label>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-brand-red py-4 text-[15px] font-bold text-white shadow-xl shadow-brand-red/25 transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? 'Please wait...'
                  : requiresTwoFactorSetup
                    ? 'Verify and sign in'
                    : requiresTwoFactor
                      ? 'Verify code'
                      : 'Sign in'}
              </button>

              {!lockedFields && (
                <p className="text-center text-sm text-white/50">
                  New company?{' '}
                  <a href="#/signup" className="font-semibold text-brand-red transition hover:text-white">
                    Create workspace
                  </a>
                </p>
              )}
            </form>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 py-6 text-center sm:px-6">
        <p className="text-sm text-white/40">
          © {new Date().getFullYear()} Rapid Grow. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LoginView;
