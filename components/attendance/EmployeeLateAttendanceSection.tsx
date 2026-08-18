import React from 'react';
import { AlertTriangle, Clock3, Loader2, Send, ShieldCheck } from 'lucide-react';
import { LateLoginPolicy } from './attendanceUtils';
import { TeamLateLoginRecord } from './attendanceViewUtils';
import {
  AttendanceRegularization,
  createRegularization,
  deleteRegularization,
  fetchRegularizations,
} from './attendanceOpsApi';
import { getUserTimeZone } from '../../utils/timezone';

interface EmployeeLateAttendanceSectionProps {
  lateLoginPolicy: LateLoginPolicy | null;
  lateLoginRecords: TeamLateLoginRecord[];
  requestLoading: boolean;
  onRequestLateLogin: (reason: string) => Promise<{ ok: boolean; message: string }>;
}

const EmployeeLateAttendanceSection: React.FC<EmployeeLateAttendanceSectionProps> = ({
  lateLoginPolicy,
  lateLoginRecords,
  requestLoading,
  onRequestLateLogin,
}) => {
  const [requestNote, setRequestNote] = React.useState('');
  const [requestMessage, setRequestMessage] = React.useState<string | null>(null);
  const [myRegularizations, setMyRegularizations] = React.useState<AttendanceRegularization[]>([]);
  const [regSaving, setRegSaving] = React.useState(false);
  const [regMessage, setRegMessage] = React.useState<string | null>(null);
  const [regForm, setRegForm] = React.useState({
    dateKey: '',
    reason: '',
    requestType: 'MISSED_PUNCH',
    proposedLoginTime: '09:30',
    proposedLogoutTime: '18:30',
  });

  const stats = React.useMemo(() => {
    const approved = lateLoginRecords.filter((record) => record.status === 'APPROVED').length;
    const requested = lateLoginRecords.filter((record) => record.status === 'REQUESTED').length;
    const rejected = lateLoginRecords.filter((record) => record.status === 'REJECTED').length;
    return { approved, requested, rejected };
  }, [lateLoginRecords]);

  const canRequestApproval =
    !!lateLoginPolicy?.restrictionApplies &&
    !!lateLoginPolicy?.restrictionActive &&
    !lateLoginPolicy?.hasApproval &&
    lateLoginPolicy?.latestOutcome !== 'REQUESTED';

  const formatDateTime = React.useCallback((value?: string | null) => {
    if (!value) return 'Awaiting login';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Awaiting login';
    return parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: getUserTimeZone(),
    });
  }, []);

  const loadMyRegularizations = React.useCallback(async () => {
    try {
      const rows = await fetchRegularizations({ scope: 'me' });
      setMyRegularizations(rows);
    } catch (error) {
      console.error(error);
    }
  }, []);

  React.useEffect(() => {
    void loadMyRegularizations();
  }, [loadMyRegularizations]);

  const handleRequest = React.useCallback(async () => {
    const result = await onRequestLateLogin(requestNote);
    setRequestMessage(result.message);
    if (result.ok) setRequestNote('');
  }, [onRequestLateLogin, requestNote]);

  const handleCreateRegularization = React.useCallback(async () => {
    if (!regForm.dateKey || !regForm.reason.trim()) {
      setRegMessage('Date and reason are required');
      return;
    }
    setRegSaving(true);
    setRegMessage(null);
    try {
      await createRegularization({
        dateKey: regForm.dateKey,
        reason: regForm.reason.trim(),
        requestType: regForm.requestType,
        proposedLoginTime: regForm.proposedLoginTime || undefined,
        proposedLogoutTime: regForm.proposedLogoutTime || undefined,
      });
      setRegForm((prev) => ({ ...prev, reason: '' }));
      await loadMyRegularizations();
      setRegMessage('Correction request sent to your admin/TL');
    } catch (error) {
      setRegMessage(error instanceof Error ? error.message : 'Unable to submit request');
    } finally {
      setRegSaving(false);
    }
  }, [loadMyRegularizations, regForm]);

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="text-3xl text-slate-900 leading-none">Request help</h2>
        <p className="mt-3 max-w-3xl text-[15px] text-slate-500 md:text-base">
          Scroll this page for both options: <strong>attendance correction</strong> (forgot / wrong time) and{' '}
          <strong>late login approval</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Current status</p>
          <p className="mt-2 text-base font-semibold text-slate-950">
            {lateLoginPolicy?.hasApproval
              ? 'Approved Late Login'
              : lateLoginPolicy?.latestOutcome === 'REQUESTED'
                ? 'Approval Requested'
                : lateLoginPolicy?.restrictionActive
                  ? 'Late Login Blocked'
                  : 'No restriction active'}
          </p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Late requests today</p>
          <p className="mt-2 text-base font-semibold text-slate-950">{stats.requested} pending</p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Approved / rejected</p>
          <p className="mt-2 text-base font-semibold text-slate-950">
            {stats.approved} approved · {stats.rejected} rejected
          </p>
        </div>
      </div>

      {/* 1. Correction first so it is always visible */}
      <div className="rounded-[30px] border-2 border-brand-red/30 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle size={18} className="text-brand-red" />
          <span className="text-[15px] font-semibold text-brand-red">1. Wrong / missed punch</span>
        </div>
        <h3 className="text-2xl font-semibold text-slate-950">Request attendance correction</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Forgot to login, wrong login/logout time, or missed punch? Fill this form and send it to admin.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Date
            <input
              type="date"
              value={regForm.dateKey}
              onChange={(event) => setRegForm((prev) => ({ ...prev, dateKey: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Type
            <select
              value={regForm.requestType}
              onChange={(event) => setRegForm((prev) => ({ ...prev, requestType: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
            >
              <option value="MISSED_PUNCH">Missed punch / forgot login</option>
              <option value="WRONG_TIME">Wrong time</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Correct login
            <input
              type="time"
              value={regForm.proposedLoginTime}
              onChange={(event) => setRegForm((prev) => ({ ...prev, proposedLoginTime: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Correct logout
            <input
              type="time"
              value={regForm.proposedLogoutTime}
              onChange={(event) => setRegForm((prev) => ({ ...prev, proposedLogoutTime: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Reason
            <input
              type="text"
              value={regForm.reason}
              onChange={(event) => setRegForm((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="Forgot to clock in"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
            />
          </label>
        </div>

        {regMessage ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {regMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => {
            void handleCreateRegularization();
          }}
          disabled={regSaving}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-red px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-red-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
        >
          {regSaving ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <Clock3 size={15} aria-hidden />
          )}
          {regSaving ? 'Submitting…' : 'Send correction request'}
        </button>

        <div className="mt-6 space-y-2 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">My correction requests</h4>
          {myRegularizations.slice(0, 5).map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-3 py-2.5"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {row.dateKey} · {row.status}
                </div>
                <div className="text-xs text-slate-500">{row.reason}</div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteRegularization(row.id);
                    await loadMyRegularizations();
                  } catch (error) {
                    setRegMessage(error instanceof Error ? error.message : 'Unable to delete');
                  }
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Delete
              </button>
            </div>
          ))}
          {!myRegularizations.length ? (
            <p className="text-sm text-slate-500">No correction requests yet.</p>
          ) : null}
        </div>
      </div>

      {/* 2. Late login */}
      <div className="rounded-[30px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy p-6 text-white">
        <div className="mb-3 flex items-center gap-2">
          <Send size={16} className="text-slate-300" />
          <span className="text-[15px] text-slate-300">2. Late login</span>
        </div>
        <h3 className="text-2xl font-semibold text-white">Request late login approval</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          After {lateLoginPolicy?.cutoffTimeLabel || '1:05 PM'}, if login is blocked, send approval here.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
          <p>Cutoff time: {lateLoginPolicy?.cutoffTimeLabel || '1:05 PM'}</p>
          {!lateLoginPolicy?.restrictionActive ? (
            <p className="mt-2 text-amber-100">
              This button unlocks only after the cutoff time.
            </p>
          ) : null}
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-[13px] font-semibold text-slate-200">Request note (optional)</span>
          <textarea
            value={requestNote}
            onChange={(event) => setRequestNote(event.target.value)}
            rows={3}
            placeholder="Add a short note for your TL/Admin."
            className="w-full rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400"
          />
        </label>

        {requestMessage ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {requestMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => {
            void handleRequest();
          }}
          disabled={!canRequestApproval || requestLoading}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
            !canRequestApproval || requestLoading
              ? 'cursor-not-allowed bg-white/10 text-slate-400'
              : 'bg-white text-slate-950 shadow-sm hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md active:translate-y-0'
          }`}
        >
          {requestLoading ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <ShieldCheck size={15} aria-hidden />
          )}
          {requestLoading
            ? 'Sending request…'
            : lateLoginPolicy?.latestOutcome === 'REQUESTED'
              ? 'Request already sent'
              : 'Request Late Login Approval'}
        </button>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="text-xl font-semibold text-slate-950">Today late-login history</h3>
        </div>
        {lateLoginRecords.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            No late login records for today.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lateLoginRecords.map((record) => (
              <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{record.status}</p>
                  <p className="text-sm text-slate-500">Requested: {formatDateTime(record.attemptedAt)}</p>
                </div>
                <p className="text-sm text-slate-500">Login: {formatDateTime(record.loginTime)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default EmployeeLateAttendanceSection;
