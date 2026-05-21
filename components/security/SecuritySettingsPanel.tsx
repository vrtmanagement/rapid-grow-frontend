import React, { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, Shield } from 'lucide-react';
import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../../config/api';
import { getReadableError, parseApiResponse } from '../../services/apiClient';
import ErrorAlert from '../ui/ErrorAlert';
import Toast from '../ui/Toast';
import TwoFactorSettingsPanel from './TwoFactorSettingsPanel';

const MIN_PASSWORD_LENGTH = 6;

const SecuritySettingsPanel: React.FC = () => {
  const employee = useMemo(() => getStoredAuthSession()?.employee || null, []);
  const employeeId = employee?._id || employee?.empId || '';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError(null);
  };

  const handleUpdatePassword = async () => {
    if (!employeeId) {
      const nextError = 'Could not identify the current employee.';
      setError(nextError);
      setToast({ type: 'error', message: nextError });
      return;
    }
    if (!currentPassword.trim()) {
      const nextError = 'Enter your current password to continue.';
      setError(nextError);
      setToast({ type: 'error', message: nextError });
      return;
    }
    if (!newPassword.trim()) {
      const nextError = 'Enter a new password.';
      setError(nextError);
      setToast({ type: 'error', message: nextError });
      return;
    }
    if (newPassword.trim().length < MIN_PASSWORD_LENGTH) {
      const nextError = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
      setError(nextError);
      setToast({ type: 'error', message: nextError });
      return;
    }
    if (newPassword !== confirmPassword) {
      const nextError = 'New password and confirm password must match.';
      setError(nextError);
      setToast({ type: 'error', message: nextError });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/employees/${employeeId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password: newPassword.trim() }),
      });
      await parseApiResponse(res);
      resetForm();
      setToast({ type: 'success', message: 'Security settings updated successfully.' });
    } catch (err: unknown) {
      const nextError = getReadableError(err, 'Failed to update security settings');
      setError(nextError);
      setToast({ type: 'error', message: nextError });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}

      <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Security Settings</h2>
            <p className="mt-2 text-sm text-slate-500">
              Change your password and keep your account protection settings up to date.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          <PasswordField
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrentPassword}
            onToggle={() => setShowCurrentPassword((value) => !value)}
          />
          <PasswordField
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNewPassword}
            onToggle={() => setShowNewPassword((value) => !value)}
          />
          <PasswordField
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((value) => !value)}
          />
        </div>

        <div className="mt-5">
          <ErrorAlert message={error} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpdatePassword}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Shield size={16} />}
            Update Security
          </button>
        </div>
      </section>

      <TwoFactorSettingsPanel />
    </div>
  );
};

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
}

const PasswordField: React.FC<PasswordFieldProps> = ({ label, value, onChange, show, onToggle }) => (
  <label className="block space-y-2">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
        aria-label={show ? `Hide ${label}` : `Show ${label}`}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </label>
);

export default SecuritySettingsPanel;
