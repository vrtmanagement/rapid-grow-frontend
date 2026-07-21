import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Mail } from 'lucide-react';
import { API_BASE, AUTH_STORAGE_KEY, getStoredAuthSession } from '../config/api';
import ErrorAlert from '../components/ui/ErrorAlert';
import { getReadableError, parseApiResponse } from '../services/apiClient';

interface InviteAcceptViewProps {
  onAcceptSuccess: (token: string, employee: any) => void;
}

type InvitePreview = {
  email: string;
  role: string;
  empId?: string;
  designation?: string;
  department?: string;
  expiresAt?: string;
  company?: {
    name?: string;
    industry?: string;
    size?: string;
  };
};

function getInviteTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('token');
  if (fromQuery) return fromQuery;
  const segments = window.location.pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
}

const readOnlyFieldClassName =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-600 outline-none';

const editableFieldClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20';

const InviteAcceptView: React.FC<InviteAcceptViewProps> = ({ onAcceptSuccess }) => {
  const token = useMemo(() => getInviteTokenFromUrl().trim(), []);
  const existingSession = useMemo(() => getStoredAuthSession(), []);
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [empName, setEmpName] = useState('');
  const [empId, setEmpId] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInvite() {
      if (!token) {
        setError('Invite token is missing.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/employees/invites/${encodeURIComponent(token)}`);
        const data = await parseApiResponse<{ invite: InvitePreview }>(response);
        if (!active) return;
        setInvite(data.invite);
        setEmpId(data.invite.empId || '');
        setDesignation(data.invite.designation || '');
        setDepartment(data.invite.department || '');
      } catch (err) {
        if (active) setError(getReadableError(err, 'Invite could not be loaded.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInvite();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/employees/invites/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empName: empName.trim(),
          empId: empId.trim(),
          designation: designation.trim(),
          department: department.trim(),
          password,
        }),
      });
      const data = await parseApiResponse<any>(response);
      if (!data.success || !data.token || !data.employee) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          token: data.token,
          employee: data.employee,
        }),
      );
      onAcceptSuccess(data.token, data.employee);
    } catch (err) {
      setError(getReadableError(err, 'Invite could not be accepted.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-red text-white">
              <Mail size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Accept invitation</h1>
              <p className="mt-1 text-sm text-slate-500">
                {invite?.company?.name ? `Join ${invite.company.name}` : 'Join your Rapid Grow workspace'}
              </p>
            </div>
          </div>

          {existingSession?.employee ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You are signed in as{' '}
              <strong>{existingSession.employee.empName || existingSession.employee.email || 'another user'}</strong>.
              Accepting this invite will sign you in as the invited employee instead. For testing, use a private/incognito
              window if you want to keep your admin session open.
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Loading invitation...
            </div>
          ) : (
            <>
              <ErrorAlert message={error} className="mb-5" />

              {invite ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 size={17} />
                      Invitation found
                    </div>
                    <p className="mt-1 text-emerald-700/80">
                      Your invite details are pre-filled below. Enter your full name and password to join.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">Email</span>
                      <input
                        value={invite.email}
                        readOnly
                        tabIndex={-1}
                        className={readOnlyFieldClassName}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Employee ID</span>
                      <input
                        value={empId}
                        readOnly
                        tabIndex={-1}
                        className={readOnlyFieldClassName}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Role</span>
                      <input
                        value={invite.role.replace(/_/g, ' ')}
                        readOnly
                        tabIndex={-1}
                        className={readOnlyFieldClassName}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Designation</span>
                      <input
                        value={designation || '—'}
                        readOnly
                        tabIndex={-1}
                        className={readOnlyFieldClassName}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Department</span>
                      <input
                        value={department || '—'}
                        readOnly
                        tabIndex={-1}
                        className={readOnlyFieldClassName}
                      />
                    </label>

                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">Full name *</span>
                      <input
                        value={empName}
                        onChange={(event) => setEmpName(event.target.value)}
                        required
                        autoFocus
                        placeholder="Enter your full name"
                        className={editableFieldClassName}
                      />
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Password *</span>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        placeholder="Create your password"
                        className={`${editableFieldClassName} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-brand-red px-4 py-4 text-[15px] font-bold text-white transition-colors hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Joining workspace...' : 'Accept invite'}
                  </button>
                </form>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteAcceptView;
