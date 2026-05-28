import React from 'react';
import { AlertTriangle, Send, ShieldCheck } from 'lucide-react';
import { LateLoginPolicy } from './attendanceUtils';
import { TeamLateLoginRecord } from './attendanceViewUtils';

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
      timeZone: 'Asia/Kolkata',
    });
  }, []);

  const handleRequest = React.useCallback(async () => {
    const result = await onRequestLateLogin(requestNote);
    setRequestMessage(result.message);
    if (result.ok) {
      setRequestNote('');
    }
  }, [onRequestLateLogin, requestNote]);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertTriangle size={20} />
            </div>
            <div>
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
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Approved</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Send size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Requests today</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.requested}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-[30px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy p-6 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-brand-red" />
              <span className="text-[15px] text-slate-300">My Late Login</span>
            </div>
            <h3 className="text-2xl font-semibold text-white">Request approval</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              If your login is blocked after {lateLoginPolicy?.cutoffTimeLabel || '1:05 PM'}, send a direct approval request to your TL/Admin.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                {lateLoginPolicy?.restrictionActive && !lateLoginPolicy?.hasApproval ? (
                  <span className="rounded-full bg-amber-400/12 px-3 py-1 text-[11px] font-semibold text-amber-100">
                    Late Login
                  </span>
                ) : null}
                {lateLoginPolicy?.latestOutcome === 'REQUESTED' ? (
                  <span className="rounded-full bg-sky-500/12 px-3 py-1 text-[11px] font-semibold text-sky-100">
                    Awaiting approval
                  </span>
                ) : null}
                {lateLoginPolicy?.hasApproval ? (
                  <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-[11px] font-semibold text-emerald-100">
                    Approved Late Login
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p>Cutoff time: {lateLoginPolicy?.cutoffTimeLabel || '1:05 PM'}</p>
                {lateLoginPolicy?.latestRejectedAt ? (
                  <p>Last rejected at: {formatDateTime(lateLoginPolicy.latestRejectedAt)}</p>
                ) : null}
                {lateLoginPolicy?.approval?.approvedAt ? (
                  <p>Approved at: {formatDateTime(lateLoginPolicy.approval.approvedAt)}</p>
                ) : null}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-[13px] font-semibold text-slate-200">Request note (optional)</span>
              <textarea
                value={requestNote}
                onChange={(event) => setRequestNote(event.target.value)}
                rows={4}
                placeholder="Add a short note for your TL/Admin."
                className="w-full rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-white/25 focus:ring-2 focus:ring-white/10"
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
              className={`mt-4 inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                !canRequestApproval || requestLoading
                  ? 'cursor-not-allowed bg-white/10 text-slate-400'
                  : 'bg-white text-slate-950 hover:bg-slate-100'
              }`}
            >
              {requestLoading ? 'Sending request...' : lateLoginPolicy?.latestOutcome === 'REQUESTED' ? 'Request already sent' : 'Request Late Login Approval'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-100 px-6 py-5 md:px-8">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-1.5 w-8 rounded-full bg-brand-red" />
                <span className="text-[15px] text-slate-500">My late login records</span>
              </div>
              <h3 className="text-2xl font-semibold text-slate-950">Today status history</h3>
              <p className="mt-2 text-[15px] text-slate-500">
                Track your request, approval, and rejection activity for the current day.
              </p>
            </div>

            {lateLoginRecords.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400 md:px-8">
                No late login records are available for today.
              </div>
            ) : (
              <div className="max-h-[28.5rem] divide-y divide-slate-100 overflow-y-auto">
                {lateLoginRecords.map((record) => {
                  const badgeClassName = record.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100'
                    : record.status === 'REQUESTED'
                      ? 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100'
                      : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100';

                  return (
                    <div key={record.id} className="grid gap-4 px-6 py-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.9fr)] md:px-8">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[15px] font-semibold text-slate-900">{record.empName}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${badgeClassName}`}>
                            {record.status === 'APPROVED'
                              ? 'Approved Late Login'
                              : record.status === 'REQUESTED'
                                ? 'Approval Requested'
                                : 'Late Login'}
                          </span>
                        </div>
                        {record.approvalReason ? (
                          <p className="mt-2 text-[12px] leading-5 text-slate-500">{record.approvalReason}</p>
                        ) : null}
                      </div>

                      <div className="space-y-2 text-[12px] text-slate-500">
                        <div>
                          <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Login time</p>
                          <p className="mt-1 text-[13px] font-medium text-slate-800">{formatDateTime(record.loginTime || null)}</p>
                        </div>
                        <div>
                          <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Recorded at</p>
                          <p className="mt-1 text-[13px] font-medium text-slate-800">
                            {formatDateTime(record.approvalTimestamp || record.attemptedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 md:text-right">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                          {record.status === 'APPROVED'
                            ? (record.loginTime ? 'Login completed' : 'Approval active')
                            : record.status === 'REQUESTED'
                              ? 'Awaiting manager review'
                              : 'Access blocked'}
                        </span>
                        {record.approvedByName ? (
                          <p className="text-[12px] text-slate-500">
                            {record.approvedByName}{record.approvedByRole ? ` • ${record.approvedByRole}` : ''}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EmployeeLateAttendanceSection;
