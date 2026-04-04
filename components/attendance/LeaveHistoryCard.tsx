import React from 'react';
import { CalendarRange, Eye, PencilLine, Trash2 } from 'lucide-react';
import { LeaveRequest } from './attendanceUtils';

interface Props {
  leave: LeaveRequest;
  showEmployee: boolean;
  employeeLabel?: string;
  totalDays: number;
  canManagePending?: boolean;
  decisionLabel?: string;
  onViewDetails: (leave: LeaveRequest) => void;
  onEdit: (leave: LeaveRequest) => void;
  onDelete: (leave: LeaveRequest) => void;
}

const statusClasses: Record<LeaveRequest['status'], string> = {
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  REJECTED: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
};

const cardStatusClasses: Record<LeaveRequest['status'], string> = {
  APPROVED:
    'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-white shadow-[0_16px_36px_rgba(16,185,129,0.10)]',
  PENDING:
    'border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-white shadow-[0_16px_36px_rgba(245,158,11,0.10)]',
  REJECTED:
    'border-rose-200/80 bg-gradient-to-br from-rose-50/75 via-white to-white shadow-[0_16px_36px_rgba(244,63,94,0.10)]',
};

const reasonBoxStatusClasses: Record<LeaveRequest['status'], string> = {
  APPROVED: 'border-emerald-100 bg-white/90',
  PENDING: 'border-amber-100 bg-white/90',
  REJECTED: 'border-rose-100 bg-white/90',
};

const typeToneClasses: Record<string, string> = {
  GENERAL: 'bg-slate-100 text-slate-700',
  SICK: 'bg-red-50 text-red-700',
  VACATION: 'bg-sky-50 text-sky-700',
  EMERGENCY: 'bg-violet-50 text-violet-700',
};

const LeaveHistoryCard: React.FC<Props> = ({
  leave,
  showEmployee,
  employeeLabel,
  totalDays,
  canManagePending = true,
  decisionLabel,
  onViewDetails,
  onEdit,
  onDelete,
}) => {
  const canShowPendingActions = leave.status === 'PENDING' && canManagePending;

  return (
    <article className={`group h-full rounded-[28px] border p-5 transition-all duration-300 hover:-translate-y-0.5 ${cardStatusClasses[leave.status]}`}>
      <div className="flex h-full flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${typeToneClasses[leave.type] || typeToneClasses.GENERAL}`}>
                {leave.type}
              </span>
              <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClasses[leave.status]}`}>
                {leave.status}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-slate-900">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3.5 py-1.5 shadow-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">From</span>
                <span className="text-[1.02rem] font-semibold tracking-[-0.02em] text-slate-900">
                  {new Date(leave.startDate).toLocaleDateString()}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">To</span>
                <span className="text-[1.02rem] font-semibold tracking-[-0.02em] text-slate-900">
                  {new Date(leave.endDate).toLocaleDateString()}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-red/8 px-3 py-1 text-[11px] font-semibold text-brand-red">
                <CalendarRange size={13} />
                {totalDays} {totalDays === 1 ? 'day' : 'days'}
              </span>
            </div>

            {showEmployee && employeeLabel ? (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Employee</p>
                <p className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                  {employeeLabel}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-start sm:justify-end">
            <button
              type="button"
              onClick={() => onViewDetails(leave)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Eye size={14} />
              View details
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between">
          <div>
            <div className={`rounded-2xl border px-4 py-3 ${reasonBoxStatusClasses[leave.status]}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Reason</p>
              <p className="mt-2 text-[15px] font-medium leading-7 tracking-[-0.01em] text-slate-700">
                {leave.reason || 'No reason added'}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center rounded-full bg-white/75 px-2.5 py-1 font-medium text-slate-500 shadow-sm">
                Applied {new Date(leave.createdAt).toLocaleDateString()}
              </span>
              {leave.decidedAt ? (
                <span className="inline-flex items-center rounded-full bg-white/75 px-2.5 py-1 font-medium text-slate-500 shadow-sm">
                  Updated {new Date(leave.decidedAt).toLocaleDateString()}
                </span>
              ) : null}
              {decisionLabel ? (
                <span className="inline-flex items-center rounded-full bg-white/75 px-2.5 py-1 font-medium text-slate-600 shadow-sm">
                  {decisionLabel}
                </span>
              ) : null}
            </div>
          </div>

          {canShowPendingActions ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => onEdit(leave)}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                <PencilLine size={14} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(leave)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default LeaveHistoryCard;
