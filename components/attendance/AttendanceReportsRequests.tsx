import React from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { AttendanceRegularization } from './attendanceOpsApi';
import { formatClock, LateRecord } from './attendanceReportsPanelUtils';

export interface RegularizationFormState {
  dateKey: string;
  reason: string;
  requestType: string;
  proposedLoginTime: string;
  proposedLogoutTime: string;
}

interface Props {
  canReviewTeam: boolean;
  canManageOps: boolean;
  pendingLateRecords: LateRecord[];
  pendingRegularizations: AttendanceRegularization[];
  lateRecords: LateRecord[];
  myRegularizations: AttendanceRegularization[];
  regForm: RegularizationFormState;
  setRegForm: React.Dispatch<React.SetStateAction<RegularizationFormState>>;
  regSaving: boolean;
  onCreateRegularization: () => void;
  onDecide: (id: string, status: 'APPROVED' | 'REJECTED') => void;
  onClearLateLoginRecords: () => void;
  onClearRegularizations: () => void;
  onDeleteLateLoginRecord: (id: string) => void;
  onDeleteRegularization: (id: string) => void;
}

const AttendanceReportsRequests: React.FC<Props> = ({
  canReviewTeam,
  canManageOps,
  pendingLateRecords,
  pendingRegularizations,
  lateRecords,
  myRegularizations,
  regForm,
  setRegForm,
  regSaving,
  onCreateRegularization,
  onDecide,
  onClearLateLoginRecords,
  onClearRegularizations,
  onDeleteLateLoginRecord,
  onDeleteRegularization,
}) => {
  return (
    <div className="space-y-6">
      {canReviewTeam || canManageOps ? (
      <section className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Admin request inbox</h3>
            <p className="mt-1 text-sm text-slate-500">
              Late-login and forgot-login requests notify admins here. Approve, reject, or delete records.
            </p>
          </div>
          {canManageOps ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClearLateLoginRecords}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <Trash2 size={14} />
                Clear late today
              </button>
              <button
                type="button"
                onClick={onClearRegularizations}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
              >
                <Trash2 size={14} />
                Clear all corrections
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Late login requests ({pendingLateRecords.length})
          </h4>
          {pendingLateRecords.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium text-slate-900">
                  {row.empName} ({row.empId})
                </div>
                <div className="text-sm text-slate-500">
                  {row.approvalReason || 'Late login approval requested'}
                </div>
              </div>
              {canManageOps ? (
                <button
                  type="button"
                  onClick={() => onDeleteLateLoginRecord(row.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              ) : null}
            </div>
          ))}
          {!pendingLateRecords.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
              No pending late-login requests.
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Forgot-login / regularization ({pendingRegularizations.length})
          </h4>
          {pendingRegularizations.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium text-slate-900">
                  {row.empName || row.empId} · {row.dateKey}
                </div>
                <div className="text-sm text-slate-500">
                  {row.reason} · Login {formatClock(row.proposedLoginTime)} · Logout{' '}
                  {formatClock(row.proposedLogoutTime)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManageOps || canReviewTeam ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onDecide(row.id, 'APPROVED')}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecide(row.id, 'REJECTED')}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                {(canManageOps || canReviewTeam) ? (
                  <button
                    type="button"
                    onClick={() => onDeleteRegularization(row.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {!pendingRegularizations.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
              No pending forgot-login requests.
            </div>
          ) : null}
        </div>

        {(canManageOps || canReviewTeam) && lateRecords.some((row) => row.status !== 'REQUESTED') ? (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Other late-login records
            </h4>
            {lateRecords
              .filter((row) => row.status !== 'REQUESTED')
              .map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {row.empName} · {row.status}
                    </div>
                    <div className="text-sm text-slate-500">{row.approvalReason || '—'}</div>
                  </div>
                  {canManageOps ? (
                    <button
                      type="button"
                      onClick={() => onDeleteLateLoginRecord(row.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                      aria-label="Delete record"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </div>
              ))}
          </div>
        ) : null}
      </section>
      ) : null}

      <section className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 md:p-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Submit forgot-login request</h3>
          <p className="mt-1 text-sm text-slate-500">
            If you forgot to clock in, send a correction. Admins get a notification in the portal.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Date
            <input
              type="date"
              value={regForm.dateKey}
              onChange={(event) => setRegForm((prev) => ({ ...prev, dateKey: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Type
            <select
              value={regForm.requestType}
              onChange={(event) =>
                setRegForm((prev) => ({ ...prev, requestType: event.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              <option value="MISSED_PUNCH">Missed punch</option>
              <option value="WRONG_TIME">Wrong time</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Login
            <input
              type="time"
              value={regForm.proposedLoginTime}
              onChange={(event) =>
                setRegForm((prev) => ({ ...prev, proposedLoginTime: event.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Logout
            <input
              type="time"
              value={regForm.proposedLogoutTime}
              onChange={(event) =>
                setRegForm((prev) => ({ ...prev, proposedLogoutTime: event.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Reason
            <input
              type="text"
              value={regForm.reason}
              onChange={(event) => setRegForm((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="Forgot to clock in"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={onCreateRegularization}
          disabled={regSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-red-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
        >
          {regSaving ? (
            <Loader2 size={14} className="animate-spin" aria-hidden />
          ) : (
            <Plus size={14} aria-hidden />
          )}
          {regSaving ? 'Submitting…' : 'Send to admin'}
        </button>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">My requests</h4>
          {myRegularizations.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{row.dateKey} · {row.status}</div>
                <div className="text-sm text-slate-500">{row.reason}</div>
              </div>
              <button
                type="button"
                onClick={() => onDeleteRegularization(row.id)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Delete my request"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {!myRegularizations.length ? (
            <div className="text-sm text-slate-500">No personal requests yet.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default AttendanceReportsRequests;
