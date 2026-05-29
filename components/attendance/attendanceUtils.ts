export type Range = 'day' | 'week' | 'month';

export interface AttendanceBreak {
  startTime: string;
  endTime?: string | null;
}

export interface LateLoginApprovalInfo {
  overrideId: string;
  approvedAt?: string | null;
  reason?: string;
  approvedByEmpId?: string;
  approvedByName?: string;
  approvedByRole?: string;
  consumedAt?: string | null;
}

export interface LateLoginPolicy {
  timeZone: string;
  cutoffTimeLabel: string;
  cutoffTimeValue?: string;
  restrictionApplies: boolean;
  restrictionActive: boolean;
  hasApproval: boolean;
  latestOutcome?: 'APPROVED' | 'REQUESTED' | 'REJECTED' | null;
  latestRejectedAt?: string | null;
  approval?: LateLoginApprovalInfo | null;
}

export interface LateLoginSettings {
  key: string;
  hour: number;
  minute: number;
  time: string;
  timezone: string;
  cutoffTimeLabel: string;
  updatedAt?: string | null;
  updatedByEmpId?: string;
}

export interface AttendanceSession {
  _id: string;
  loginTime: string;
  isLateLogin?: boolean;
  lateLoginApproval?: LateLoginApprovalInfo | null;
  logoutTime?: string | null;
  effectiveLogoutTime?: string;
  location?: string;
  breaks?: AttendanceBreak[];
  breakMinutes?: number;
  durationMinutes?: number;
  workingDurationMinutes?: number;
  isOnBreak?: boolean;
  currentBreakStartedAt?: string | null;
}

export interface AttendanceDay {
  date: string;
  minutes: number;
  sessions: AttendanceSession[];
}

export interface AttendanceSummaryResponse {
  range: Range;
  start: string;
  end: string;
  totalMinutes: number;
  days: AttendanceDay[];
  lateLoginPolicy?: LateLoginPolicy | null;
  lateLoginRecords?: Array<{
    id: string;
    empId: string;
    empName: string;
    role?: string;
    designation?: string;
    department?: string;
    status: 'APPROVED' | 'REQUESTED' | 'REJECTED';
    attemptedAt: string;
    loginTime?: string | null;
    approvedByEmpId?: string;
    approvedByName?: string;
    approvedByRole?: string;
    approvalReason?: string;
    approvalTimestamp?: string | null;
  }>;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  _id: string;
  empId: string;
  empName?: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: string;
  dayPortion?: 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';
  status: LeaveStatus;
  approverRole: string;
  createdAt: string;
  decidedAt?: string;
  decidedByRole?: string;
}

export interface LeaveBalanceTypeMetric {
  type: string;
  label: string;
  paid: boolean;
  color?: string;
  allocated: number;
  used: number;
  remaining: number;
  paidUsed: number;
  unpaidUsed: number;
  pending: number;
}

export interface LeavePolicyConfig {
  id: string;
  name: string;
  scopeType: 'company' | 'role' | 'team';
  role?: string;
  teamId?: string;
  active: boolean;
  monthlyPaidLeaves: number;
  maxCarryForward: number;
  carryForwardEnabled: boolean;
  carryForwardExpiryMonth: number;
  halfDayDeduction: number;
  autoLopWhenBalanceExhausted: boolean;
  lowBalanceThreshold: number;
  leaveTypes: Array<{
    type: string;
    label: string;
    paid: boolean;
    yearlyAllocation: number;
    monthlyAllocation: number;
    allowNegative?: boolean;
    color?: string;
  }>;
  notes?: string;
  updatedByEmpId?: string;
  updatedByName?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface LeaveAdminActivityItem {
  id: string;
  action: string;
  actorEmpId: string;
  actorName: string;
  actorRole: string;
  targetType: string;
  targetEmpId?: string;
  summary: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface LeaveBalanceOverviewResponse {
  employee: {
    empId: string;
    empName: string;
    role: string;
    designation?: string;
    department?: string;
    teamId?: string;
  };
  period: {
    mode: 'month' | 'year';
    year: number;
    month: number;
    label: string;
  };
  policy: LeavePolicyConfig;
  summary: {
    totalLeaves: number;
    usedLeaves: number;
    remainingLeaves: number;
    paidLeaves: number;
    unpaidLeaves: number;
    pendingLeaveRequests: number;
    approvedLeaveRequests: number;
    carryForward: number;
    lopDays: number;
    bonusLeaves: number;
    deductedLeaves: number;
    expiredCarryForward: number;
    yearlyAllocated: number;
    yearlyRemaining: number;
  };
  dashboardCard: {
    totalAvailable: number;
    usedLeaves: number;
    remainingLeaves: number;
    progressPercent: number;
    badges: string[];
  };
  byType: LeaveBalanceTypeMetric[];
  trend: Array<{
    month: string;
    allocated: number;
    used: number;
    pending: number;
    approved: number;
    lop: number;
  }>;
  badges: string[];
  warningState: 'healthy' | 'warning' | 'critical';
  progressPercent: number;
}

export interface LeaveNotificationItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  tone: 'info' | 'success' | 'warning';
}

export const MINUTES_PER_DAY_TARGET = 8 * 60;

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function formatLeaveDayCount(total: number): string {
  return Number.isInteger(total) ? `${total} ${total === 1 ? 'day' : 'days'}` : `${total.toFixed(1)} day`;
}

export function getSessionBreakMinutes(session?: AttendanceSession | null, referenceTime: Date = new Date()): number {
  if (!session?.breaks?.length) return 0;

  const sessionEnd = session.logoutTime ? new Date(session.logoutTime) : referenceTime;
  if (Number.isNaN(sessionEnd.getTime())) return 0;

  return session.breaks.reduce((total, pause) => {
    const start = pause?.startTime ? new Date(pause.startTime) : null;
    if (!start || Number.isNaN(start.getTime())) return total;

    const rawEnd = pause?.endTime ? new Date(pause.endTime) : sessionEnd;
    const effectiveEnd = rawEnd.getTime() > sessionEnd.getTime() ? sessionEnd : rawEnd;
    if (Number.isNaN(effectiveEnd.getTime()) || effectiveEnd.getTime() <= start.getTime()) return total;

    return total + Math.max(0, Math.floor((effectiveEnd.getTime() - start.getTime()) / 60000));
  }, 0);
}

export function getSessionWorkingMinutes(session?: AttendanceSession | null, referenceTime: Date = new Date()): number {
  if (!session?.loginTime) return 0;

  const start = new Date(session.loginTime);
  const end = session.logoutTime ? new Date(session.logoutTime) : referenceTime;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) return 0;

  const totalMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
  return Math.max(0, totalMinutes - getSessionBreakMinutes(session, referenceTime));
}

export function projectAttendanceSummary(
  summary?: AttendanceSummaryResponse | null,
  referenceTime: Date = new Date(),
): AttendanceSummaryResponse | null {
  if (!summary?.days?.length) return summary || null;

  let openDayIndex = -1;
  let openSessionIndex = -1;

  for (let dayIndex = 0; dayIndex < summary.days.length; dayIndex += 1) {
    const sessionIndex = summary.days[dayIndex]?.sessions?.findIndex((session) => !session.logoutTime) ?? -1;
    if (sessionIndex >= 0) {
      openDayIndex = dayIndex;
      openSessionIndex = sessionIndex;
      break;
    }
  }

  if (openDayIndex < 0 || openSessionIndex < 0) {
    return summary;
  }

  const sourceDay = summary.days[openDayIndex];
  const sourceSession = sourceDay.sessions[openSessionIndex];
  const storedWorkingMinutes = Math.max(
    0,
    sourceSession.workingDurationMinutes ?? sourceSession.durationMinutes ?? 0,
  );
  const projectedWorkingMinutes = getSessionWorkingMinutes(sourceSession, referenceTime);
  const projectedBreakMinutes = getSessionBreakMinutes(sourceSession, referenceTime);
  const currentBreakMinutes = Math.max(0, sourceSession.breakMinutes ?? 0);

  if (
    projectedWorkingMinutes === storedWorkingMinutes &&
    projectedBreakMinutes === currentBreakMinutes
  ) {
    return summary;
  }

  const nextSession: AttendanceSession = {
    ...sourceSession,
    breakMinutes: projectedBreakMinutes,
    durationMinutes: projectedWorkingMinutes,
    workingDurationMinutes: projectedWorkingMinutes,
  };
  const nextSessions = [...sourceDay.sessions];
  nextSessions[openSessionIndex] = nextSession;

  const nextDayMinutes = Math.max(0, sourceDay.minutes - storedWorkingMinutes) + projectedWorkingMinutes;
  const nextDay: AttendanceDay = {
    ...sourceDay,
    minutes: nextDayMinutes,
    sessions: nextSessions,
  };
  const nextDays = [...summary.days];
  nextDays[openDayIndex] = nextDay;

  return {
    ...summary,
    totalMinutes: Math.max(0, summary.totalMinutes - storedWorkingMinutes) + projectedWorkingMinutes,
    days: nextDays,
  };
}

export function getHoursColor(hours: number): string {
  // ≥ 8h → green, 7.5–<8 → orange, <7.5 → red
  if (hours >= 8) return '#22c55e';
  if (hours >= 7.5) return '#f97316';
  return '#ef4444';
}

export function getBadgeColorsByMinutes(minutes: number): { bg: string; text: string } {
  const hours = minutes / 60;
  if (hours >= 8) {
    return { bg: '#dcfce7', text: '#166534' };
  }
  if (hours >= 7.5) {
    return { bg: '#ffedd5', text: '#9a3412' };
  }
  return { bg: '#fee2e2', text: '#b91c1c' };
}

export function countLeaveDaysInRange(leaves: LeaveRequest[], rangeStart?: string, rangeEnd?: string): number {
  if (!rangeStart || !rangeEnd) return 0;
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  let total = 0;

  leaves
    .filter((l) => l.status === 'APPROVED')
    .forEach((l) => {
      const leaveStart = new Date(l.startDate);
      const leaveEnd = new Date(l.endDate);

      const overlapStart = leaveStart > start ? leaveStart : start;
      const overlapEnd = leaveEnd < end ? leaveEnd : end;

      if (overlapEnd >= overlapStart) {
        const diffMs = overlapEnd.getTime() - overlapStart.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
        total += days * (String(l.type || '').toUpperCase() === 'HALF_DAY' ? 0.5 : 1);
      }
    });

  return total;
}

