import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck, ShieldOff } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { getReadableError, parseApiResponse } from '../../services/apiClient';
import ErrorAlert from '../ui/ErrorAlert';
import Toast from '../ui/Toast';

interface TwoFactorSetupResponse {
  secret?: string;
  otpauthUrl?: string;
  qrCodeDataUrl?: string;
}

const TwoFactorSettingsPanel: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [requiredForRole, setRequiredForRole] = useState(false);
  const [globallyDisabled, setGloballyDisabled] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (type: 'success' | 'error', nextMessage: string) => {
    setToast({ type, message: nextMessage });
  };

  const loadStatus = async () => {
    const res = await fetch(`${API_BASE}/employees/2fa/status`, { headers: getAuthHeaders() });
    const data = await parseApiResponse<any>(res);
    setEnabled(Boolean(data.twoFactorEnabled));
    setRequiredForRole(Boolean(data.requiredForRole));
    setGloballyDisabled(Boolean(data.globallyDisabled));
  };

  useEffect(() => {
    loadStatus().catch((err) => {
      const nextError = getReadableError(err, 'Failed to load 2FA status');
      setError(nextError);
      showToast('error', nextError);
    });
  }, []);

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/employees/2fa/setup`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await parseApiResponse<TwoFactorSetupResponse>(res);
      setSetupSecret(data.secret || '');
      setOtpauthUrl(data.otpauthUrl || '');
      setQrCodeDataUrl(data.qrCodeDataUrl || '');
      setMessage('Add this secret to your authenticator app, then enter the 6-digit code.');
      showToast('success', 'Two-factor setup started.');
    } catch (err: unknown) {
      const nextError = getReadableError(err, 'Failed to start 2FA setup');
      setError(nextError);
      showToast('error', nextError);
    } finally {
      setLoading(false);
    }
  };

  const confirmSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/employees/2fa/verify-setup`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ token: verifyCode.trim() }),
      });
      await parseApiResponse(res);
      setSetupSecret('');
      setOtpauthUrl('');
      setQrCodeDataUrl('');
      setVerifyCode('');
      setMessage('Two-factor authentication is now enabled.');
      showToast('success', 'Two-factor authentication enabled.');
      await loadStatus();
    } catch (err: unknown) {
      const nextError = getReadableError(err, 'Invalid verification code');
      setError(nextError);
      showToast('error', nextError);
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload =
        disablePassword.trim().length > 0
          ? { password: disablePassword }
          : { token: disableCode.trim() };

      const res = await fetch(`${API_BASE}/employees/2fa/disable`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      await parseApiResponse(res);
      setDisableCode('');
      setDisablePassword('');
      setMessage('Two-factor authentication disabled.');
      showToast('success', 'Two-factor authentication disabled.');
      await loadStatus();
    } catch (err: unknown) {
      const nextError = getReadableError(err, 'Could not disable 2FA');
      setError(nextError);
      showToast('error', nextError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-5 rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Two-factor authentication</h2>
          <p className="mt-2 text-sm text-slate-500">
            {globallyDisabled
              ? 'Authenticator login is turned off for this environment.'
              : enabled
                ? 'Your account is protected with an authenticator app.'
                : requiredForRole
                  ? 'Required for your role. Enable 2FA to stay signed in.'
                  : 'Optional extra protection for your account.'}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            enabled
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {enabled ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <ErrorAlert message={error} />

      {message ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {globallyDisabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          2FA is disabled in development mode. Existing authenticator settings are kept for later, but login will not
          ask for a code.
        </div>
      ) : null}

      {!globallyDisabled && !enabled && !setupSecret ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-slate-900">Enable 2FA</p>
            <p className="mt-1 text-sm text-slate-500">Add an extra layer of security to your account.</p>
          </div>
          <button
            type="button"
            onClick={startSetup}
            disabled={loading}
            className="inline-flex min-w-[132px] items-center justify-center rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : 'Enable'}
          </button>
        </div>
      ) : null}

      {!globallyDisabled && setupSecret ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
          <p className="text-lg font-semibold text-slate-900">Set up your authenticator</p>
          {qrCodeDataUrl ? (
            <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-4">
              <img src={qrCodeDataUrl} alt="Two-factor QR code" className="h-44 w-44 object-contain" />
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-800">Manual secret</span>
            <input
              value={setupSecret}
              readOnly
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
            />
          </label>

          {otpauthUrl ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">OTPAUTH URI</p>
              <p className="break-all rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                {otpauthUrl}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
              placeholder="6-digit code"
              inputMode="numeric"
              maxLength={6}
            />
            <button
              type="button"
              onClick={confirmSetup}
              disabled={loading || verifyCode.trim().length !== 6}
              className="inline-flex items-center justify-center rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <LoaderCircle size={16} className="animate-spin" /> : 'Verify & enable'}
            </button>
          </div>
        </div>
      ) : null}

      {!globallyDisabled && enabled ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">2FA is enabled</p>
              <p className="mt-1 text-sm text-slate-500">
                Use your authenticator code to disable protection, or confirm with your current password.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Authenticator code</span>
              <input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                placeholder="6-digit code"
                inputMode="numeric"
                maxLength={6}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Current password</span>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                placeholder="Use password instead of code"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={disable}
            disabled={loading || (!disableCode.trim() && !disablePassword.trim())}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Disable 2FA
          </button>
        </div>
      ) : null}
    </section>
  );
};

export default TwoFactorSettingsPanel;
