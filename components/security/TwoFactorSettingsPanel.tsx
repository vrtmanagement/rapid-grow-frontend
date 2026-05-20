import React, { useEffect, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import ErrorAlert from '../ui/ErrorAlert';
import { getReadableError, parseApiResponse } from '../../services/apiClient';

const TwoFactorSettingsPanel: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [requiredForRole, setRequiredForRole] = useState(false);
  const [globallyDisabled, setGloballyDisabled] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    const res = await fetch(`${API_BASE}/employees/2fa/status`, { headers: getAuthHeaders() });
    const data = await parseApiResponse<any>(res);
    setEnabled(Boolean(data.twoFactorEnabled));
    setRequiredForRole(Boolean(data.requiredForRole));
    setGloballyDisabled(Boolean(data.globallyDisabled));
  };

  useEffect(() => {
    loadStatus().catch((err) => setError(getReadableError(err, 'Failed to load 2FA status')));
  }, []);

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/employees/2fa/setup`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await parseApiResponse<any>(res);
      setSetupSecret(data.secret || '');
      setOtpauthUrl(data.otpauthUrl || '');
      setMessage('Add this secret to your authenticator app, then enter the 6-digit code.');
    } catch (err: any) {
      setError(getReadableError(err, 'Failed to start 2FA setup'));
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
        body: JSON.stringify({ token: verifyCode }),
      });
      await parseApiResponse(res);
      setSetupSecret('');
      setOtpauthUrl('');
      setVerifyCode('');
      setMessage('Two-factor authentication is now enabled.');
      await loadStatus();
    } catch (err: any) {
      setError(getReadableError(err, 'Invalid verification code'));
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/employees/2fa/disable`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ token: disableCode }),
      });
      await parseApiResponse(res);
      setDisableCode('');
      setMessage('Two-factor authentication disabled.');
      await loadStatus();
    } catch (err: any) {
      setError(getReadableError(err, 'Could not disable 2FA'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Two-factor authentication</h2>
        <p className="text-sm text-slate-600 mt-1">
          {globallyDisabled
            ? 'Authenticator login is turned off for this environment.'
            : enabled
            ? 'Your account is protected with an authenticator app.'
            : requiredForRole
              ? 'Required for your role — enable 2FA to stay signed in.'
              : 'Optional extra protection for your account.'}
        </p>
      </div>
      <ErrorAlert message={error} />
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      {globallyDisabled && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          2FA is disabled in development mode. Existing authenticator settings are kept for later, but login will not ask for a code.
        </p>
      )}

      {!globallyDisabled && !enabled && !setupSecret && (
        <button
          type="button"
          onClick={startSetup}
          disabled={loading}
          className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Set up authenticator
        </button>
      )}

      {!globallyDisabled && setupSecret && (
        <SetupBlock
          setupSecret={setupSecret}
          otpauthUrl={otpauthUrl}
          verifyCode={verifyCode}
          onVerifyCodeChange={setVerifyCode}
          onConfirm={confirmSetup}
          loading={loading}
        />
      )}

      {!globallyDisabled && enabled && (
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Code to disable</label>
            <input
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="6-digit code"
            />
          </div>
          <button
            type="button"
            onClick={disable}
            disabled={loading || !disableCode}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Disable 2FA
          </button>
        </div>
      )}
    </section>
  );
};

type SetupBlockProps = {
  setupSecret: string;
  otpauthUrl: string;
  verifyCode: string;
  onVerifyCodeChange: (value: string) => void;
  onConfirm: () => void;
  loading: boolean;
};

const SetupBlock: React.FC<SetupBlockProps> = ({
  setupSecret,
  otpauthUrl,
  verifyCode,
  onVerifyCodeChange,
  onConfirm,
  loading,
}) => (
  <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-3">
    <p className="font-medium text-slate-800">Manual secret</p>
    <code className="block break-all text-xs bg-white border rounded p-2">{setupSecret}</code>
    {otpauthUrl ? <p className="text-xs text-slate-600 break-all">URI: {otpauthUrl}</p> : null}
    <div className="flex gap-2">
      <input
        value={verifyCode}
        onChange={(e) => onVerifyCodeChange(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2"
        placeholder="6-digit code"
      />
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading || !verifyCode}
        className="rounded-lg bg-brand-red px-4 py-2 text-white text-sm font-semibold disabled:opacity-60"
      >
        Verify & enable
      </button>
    </div>
  </div>
);

export default TwoFactorSettingsPanel;
