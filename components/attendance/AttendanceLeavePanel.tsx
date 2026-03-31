import React from 'react';
import { LeaveRequest, formatMinutes } from './attendanceUtils';
import { AttendanceLeaveOverviewSkeleton, Skeleton, SkeletonBlock } from '../ui/Skeleton';

interface Props {
  leaveStart: string;
  leaveEnd: string;
  leaveReason: string;
  leaveType: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onChangeReason: (value: string) => void;
  onChangeType: (value: string) => void;
  onApply: () => void;
  myLeaves: LeaveRequest[];
  pendingLeaves: LeaveRequest[];
  leaveLoading: boolean;
  onLeaveAction: (id: string, action: 'APPROVE' | 'REJECT') => void;
  canApplyLeave: boolean;
  approverLeaves: LeaveRequest[];
  isAdmin: boolean;
  loading?: boolean;
}

const AttendanceLeavePanel: React.FC<Props> = ({
  leaveStart,
  leaveEnd,
  leaveReason,
  leaveType,
  onChangeStart,
  onChangeEnd,
  onChangeReason,
  onChangeType,
  onApply,
  myLeaves,
  pendingLeaves,
  leaveLoading,
  onLeaveAction,
  canApplyLeave,
  approverLeaves,
  isAdmin,
  loading = false,
}) => {
  const baseLeaves = isAdmin ? approverLeaves : myLeaves;
  const visibleMyLeaves = canApplyLeave
    ? baseLeaves
    : baseLeaves.filter((l) => l.status === 'APPROVED' || l.status === 'REJECTED');

  return (
    <>
      {canApplyLeave && (loading ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-xl animate-pulse">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-10" />
                <SkeletonBlock className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-8" />
                <SkeletonBlock className="h-10 w-full rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-12" />
              <SkeletonBlock className="h-20 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-10" />
              <SkeletonBlock className="h-10 w-full rounded-xl" />
            </div>
            <SkeletonBlock className="h-10 w-full rounded-xl bg-slate-100" />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Apply for leave</h3>
              {/* <p className="text-[11px] text-slate-500">
                Employees ask Team Lead, Team Leads ask Admin.
              </p> */}
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-slate-500">
                From
                <input
                  type="date"
                  value={leaveStart}
                  onChange={(e) => onChangeStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red/40"
                />
              </label>
              <label className="text-[11px] text-slate-500">
                To
                <input
                  type="date"
                  value={leaveEnd}
                  onChange={(e) => onChangeEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red/40"
                />
              </label>
            </div>
            <label className="text-[11px] text-slate-500 block">
              Reason
              <textarea
                value={leaveReason}
                onChange={(e) => onChangeReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-brand-red/40"
                placeholder="Short context for your approver"
              />
            </label>
            <label className="text-[11px] text-slate-500 block">
              Type
              <select
                value={leaveType}
                onChange={(e) => onChangeType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red/40"
              >
                <option value="GENERAL">General</option>
                <option value="SICK">Sick</option>
                <option value="VACATION">Vacation</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </label>
            <button
              type="button"
              onClick={onApply}
              className="w-full mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-red text-white text-xs font-semibold px-3 py-2 shadow-md hover:bg-brand-navy transition-colors"
            >
              Apply for leave
            </button>
          </div>
        </div>
      ))}

      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Leave overview</h3>
          {leaveLoading && (
            <span className="text-[11px] text-slate-400">Refreshing…</span>
          )}
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {leaveLoading ? (
            <AttendanceLeaveOverviewSkeleton count={3} />
          ) : visibleMyLeaves.length === 0 ? (
            canApplyLeave ? (
              <p className="text-[12px] text-slate-500">
                No leave requests yet. Your history will show here once you apply.
              </p>
            ) : null
          ) : (
            visibleMyLeaves.map((l) => (
              <div
                key={l._id}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-[11px]"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {new Date(l.startDate).toLocaleDateString()} –{' '}
                    {new Date(l.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-slate-500 line-clamp-1">
                    {l.reason || l.type}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                    l.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : l.status === 'REJECTED'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {l.status.toLowerCase()}
                </span>
              </div>
            ))
          )}
        </div>

        {pendingLeaves.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-semibold text-slate-700">
              Approvals waiting on you
            </p>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {pendingLeaves.map((l) => (
                <div
                  key={l._id}
                  className="rounded-xl border border-slate-100 px-3 py-2 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{l.empName || l.empId}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(l.startDate).toLocaleDateString()} –{' '}
                      {new Date(l.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-500 line-clamp-1">
                    {l.reason || l.type}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onLeaveAction(l._id, 'APPROVE')}
                      className="flex-1 rounded-lg bg-emerald-500 text-white text-[10px] py-1 hover:bg-emerald-400"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onLeaveAction(l._id, 'REJECT')}
                      className="flex-1 rounded-lg bg-rose-500 text-white text-[10px] py-1 hover:bg-rose-400"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AttendanceLeavePanel;

