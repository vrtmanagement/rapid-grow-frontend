import React from 'react';
import { CalendarDays } from 'lucide-react';
import { LeaveRequest, formatLeaveDayCount } from './attendanceUtils';
import { getLeaveTypeLabel } from './leaveManagementPanelUtils';

interface PendingApprovalsPanelProps {
  pendingLeaves: LeaveRequest[];
  onLeaveAction: (id: string, action: 'APPROVE' | 'REJECT') => void;
  formatApprovalDate: (value: string) => string;
  calculateLeaveDays: (
    start?: string,
    end?: string,
    excludeWeekends?: boolean,
    options?: { type?: string; dayPortion?: string },
  ) => { total: number; invalid: boolean };
  sectionClassName?: string;
  gridClassName?: string;
  showEmployeeLabelHeading?: boolean;
  compactTitleLine?: boolean;
}

const PendingApprovalsPanel: React.FC<PendingApprovalsPanelProps> = ({
  pendingLeaves,
  onLeaveAction,
  formatApprovalDate,
  calculateLeaveDays,
  sectionClassName = 'rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]',
  gridClassName = 'mt-5 grid gap-4',
  showEmployeeLabelHeading = true,
  compactTitleLine = false,
}) => {
  if (!pendingLeaves.length) return null;

  return (
    <section className={sectionClassName}>
      <h3 className="text-lg font-semibold text-slate-900">Approvals waiting on you</h3>
      <p className="mt-1 text-sm text-slate-500">Take quick action on pending leave requests that need your decision.</p>
      <div className={gridClassName}>
        {pendingLeaves.map((leave) => {
          const totalDays = calculateLeaveDays(
            leave.startDate.slice(0, 10),
            leave.endDate.slice(0, 10),
            false,
            { type: leave.type, dayPortion: leave.dayPortion }
          ).total;
          return (
            <div key={leave._id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  {showEmployeeLabelHeading ? (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Employee</p>
                  ) : null}
                  <p className={`mt-1 font-semibold tracking-[-0.02em] text-slate-900 ${compactTitleLine ? 'text-base' : 'text-[1.05rem]'}`}>
                    {leave.empName || leave.empId}
                  </p>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                  pending
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">From</span>
                  <span className="text-sm font-semibold tracking-[-0.01em] text-slate-800">{formatApprovalDate(leave.startDate)}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">To</span>
                  <span className="text-sm font-semibold tracking-[-0.01em] text-slate-800">{formatApprovalDate(leave.endDate)}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/5 px-3 py-1.5 text-sm font-semibold text-brand-red">
                  <CalendarDays size={14} />
                  {formatLeaveDayCount(totalDays)}
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reason</p>
                <p className={`mt-2 font-medium leading-7 tracking-[-0.01em] text-slate-800 ${compactTitleLine ? 'text-sm' : 'text-[15px]'}`}>
                  {leave.reason || getLeaveTypeLabel(leave.type)}
                </p>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => onLeaveAction(leave._id, 'APPROVE')}
                  className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onLeaveAction(leave._id, 'REJECT')}
                  className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PendingApprovalsPanel;
