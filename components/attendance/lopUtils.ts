import { LeaveLopBadge, LeaveRequest } from './attendanceUtils';

export type LopHistoryFilter =
  | 'ALL'
  | 'LOP_LEAVES'
  | 'DOUBLE_DEDUCTION'
  | 'EXCEPTION_CASES';

export function getLeaveDisplayStatusLabel(leave: LeaveRequest) {
  const status = leave.displayStatus || leave.status;
  switch (status) {
    case 'LOP_APPLIED':
      return 'LOP Applied';
    case 'EXCEPTION_APPROVED':
      return 'Exception Approved';
    case 'PENDING':
      return 'Pending';
    case 'REJECTED':
      return 'Rejected';
    case 'APPROVED':
    default:
      return 'Approved';
  }
}

export function getLeaveDisplayStatusTone(leave: LeaveRequest) {
  const status = leave.displayStatus || leave.status;
  switch (status) {
    case 'LOP_APPLIED':
      return 'bg-amber-50 text-amber-800 ring-amber-100';
    case 'EXCEPTION_APPROVED':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-100';
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 ring-amber-100';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 ring-rose-100';
    case 'APPROVED':
    default:
      return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  }
}

export function matchesLopHistoryFilter(leave: LeaveRequest, filter: LopHistoryFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'LOP_LEAVES') {
    return Boolean(
      leave.lopApplied ||
        (leave.balanceImpact?.lopDays || 0) > 0 ||
        leave.lopEvaluation?.appliesPolicyLop,
    );
  }
  if (filter === 'DOUBLE_DEDUCTION') {
    return (leave.balanceImpact?.deductionMultiplier || 1) > 1;
  }
  if (filter === 'EXCEPTION_CASES') {
    return Boolean(leave.exceptionType);
  }
  return true;
}

const badgeToneClasses: Record<LeaveLopBadge['tone'], string> = {
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

export function getLopBadgeClass(tone: LeaveLopBadge['tone']) {
  return badgeToneClasses[tone] || badgeToneClasses.info;
}

export const LOP_HISTORY_FILTER_OPTIONS: Array<{ value: LopHistoryFilter; label: string }> = [
  { value: 'ALL', label: 'All leaves' },
  { value: 'LOP_LEAVES', label: 'LOP leaves' },
  { value: 'DOUBLE_DEDUCTION', label: 'Double deduction' },
  { value: 'EXCEPTION_CASES', label: 'Exception cases' },
];

export const LOP_QUICK_ACTIONS = [
  { action: 'APPROVE_NORMALLY', label: 'Approve normally' },
  { action: 'APPLY_LOP', label: 'Apply LOP' },
  { action: 'REMOVE_LOP', label: 'Remove LOP' },
  { action: 'IGNORE_LOP', label: 'Ignore LOP' },
  { action: 'PAID_EXCEPTION', label: 'Paid exception' },
  { action: 'EMERGENCY_APPROVAL', label: 'Emergency approval' },
  { action: 'OVERRIDE_POLICY', label: 'Override policy' },
] as const;
