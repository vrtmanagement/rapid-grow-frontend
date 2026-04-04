import React, { useMemo, useState } from 'react';
import { LeaveRequest } from './attendanceUtils';
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
  isApproverPortal: boolean;
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
  isApproverPortal,
  loading = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GENERAL' | 'SICK' | 'VACATION' | 'EMERGENCY'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const baseLeaves = isApproverPortal || isAdmin ? approverLeaves : myLeaves;
  const visibleMyLeaves = canApplyLeave
    ? baseLeaves
    : baseLeaves.filter((l) => l.status === 'APPROVED' || l.status === 'REJECTED');

  const filteredLeaves = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return visibleMyLeaves.filter((leave) => {
      if (statusFilter !== 'ALL' && leave.status !== statusFilter) {
        return false;
      }

      if (typeFilter !== 'ALL' && leave.type !== typeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        leave.reason,
        leave.type,
        leave.status,
        leave.empName,
        leave.empId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [searchTerm, statusFilter, typeFilter, visibleMyLeaves]);

  const getEmployeeRecordLabel = (leave: LeaveRequest) => {
    const trimmedName = leave.empName?.trim();
    const trimmedEmpId = leave.empId?.trim();

    if (trimmedName && trimmedEmpId) return `${trimmedName} (${trimmedEmpId})`;
    if (trimmedName) return trimmedName;
    if (trimmedEmpId) return `Emp ID: ${trimmedEmpId}`;
    return '';
  };

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
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/10"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'GENERAL' | 'SICK' | 'VACATION' | 'EMERGENCY')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/10"
              >
                <option value="ALL">All types</option>
                <option value="GENERAL">General</option>
                <option value="SICK">Sick</option>
                <option value="VACATION">Vacation</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isApproverPortal
                  ? 'Search by name, emp id, reason, type, or status'
                  : 'Search by reason, type, or status'
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/10"
            />
          </label>
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {leaveLoading ? (
            <AttendanceLeaveOverviewSkeleton count={3} />
          ) : filteredLeaves.length === 0 ? (
            <p className="text-[12px] text-slate-500">
              No leave records match the current filters.
            </p>
          ) : (
            filteredLeaves.map((l) => (
              <div
                key={l._id}
                className="rounded-[22px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 px-4 py-4 text-[11px] shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                    {new Date(l.startDate).toLocaleDateString()} –{' '}
                    {new Date(l.endDate).toLocaleDateString()}
                  </p>
                    {isApproverPortal && getEmployeeRecordLabel(l) ? (
                      <p className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold tracking-[0.04em] text-slate-700">
                        {getEmployeeRecordLabel(l)}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-red/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-red">
                        {l.type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Applied {new Date(l.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-500 line-clamp-2">
                      {l.reason || l.type}
                    </p>
                  </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
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

