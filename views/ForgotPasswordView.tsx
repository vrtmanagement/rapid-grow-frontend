import React, { useState } from 'react';
import { API_BASE } from '../config/api';
import ErrorAlert from '../components/ui/ErrorAlert';
import { getReadableError, parseApiResponse } from '../services/apiClient';

const ForgotPasswordView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [empId, setEmpId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevResetUrl(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/employees/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim() || undefined,
          empId: empId.trim() || undefined,
        }),
      });
      const data = await parseApiResponse<any>(res);
      setMessage(
        data.message ||
          'If an account exists with that email, we sent a password reset link. Check your inbox and spam folder.'
      );
      if (data.resetUrl) {
        setDevResetUrl(data.resetUrl);
      }
    } catch (err: any) {
      setError(getReadableError(err, 'Could not request password reset'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPage>
      <form onSubmit={handleSubmit} className="space-y-5">
        <ErrorAlert message={error} />
        {message && (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">{message}</p>
        )}
        {devResetUrl && (
          <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 break-all">
            Dev only (email not configured):{' '}
            <a href={devResetUrl} className="underline font-medium">
              Open reset link
            </a>
          </p>
        )}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Work email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Email saved on your employee profile"
            autoComplete="email"
          />
          <p className="text-xs text-slate-500 mt-1">
            We send the reset link to the email stored in your account (from Staff / profile).
          </p>
        </section>
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Employee ID <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="e.g. 000 — use if you have multiple accounts"
          />
        </section>
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full py-3 rounded-xl bg-brand-red text-white font-semibold disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Email reset link'}
        </button>
      </form>
    </AuthPage>
  );
};

function AuthPage({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen flex items-center justify-center bg-[#f1f5f9] p-4">
      <section className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-10">
        <AuthPageHeader />
        {children}
        <p className="text-center text-sm text-slate-500 mt-6">
          <a href="#/" className="text-brand-red font-medium hover:underline">
            Back to login
          </a>
        </p>
      </section>
    </section>
  );
}

function AuthPageHeader() {
  return (
    <header className="text-center mb-8">
      <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
      <p className="text-slate-500 mt-2">We will email you a secure link to choose a new password</p>
    </header>
  );
}

export default ForgotPasswordView;
