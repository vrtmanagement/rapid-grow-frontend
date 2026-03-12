export type Range = 'day' | 'week' | 'month';

export interface AttendanceSession {
  _id: string;
  loginTime: string;
  logoutTime?: string | null;
  location?: string;
  durationMinutes?: number;
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
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  _id: string;
  empId: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: string;
  status: LeaveStatus;
  approverRole: string;
  createdAt: string;
  decidedAt?: string;
  decidedByRole?: string;
}

export const MINUTES_PER_DAY_TARGET = 8 * 60;

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
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
        total += days;
      }
    });

  return total;
}

