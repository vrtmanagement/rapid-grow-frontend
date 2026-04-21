import { LeaveRequest } from './attendanceUtils';

export const REASON_SUGGESTIONS = [
  'Medical leave due to fever',
  'Family function',
  'Personal work',
  'Emergency leave',
  'Travel planned in advance',
];

export const LEAVE_TYPE_OPTIONS = [
  {
    value: 'GENERAL',
    label: 'General',
    description: 'Personal work, appointments, or planned time away.',
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
  },
  {
    value: 'SICK',
    label: 'Sick',
    description: 'Health recovery, rest, or medical observation.',
    tone: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  {
    value: 'VACATION',
    label: 'Vacation',
    description: 'Planned holiday or recharge time booked in advance.',
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  {
    value: 'EMERGENCY',
    label: 'Emergency',
    description: 'Urgent personal or family situations that need attention.',
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
  },
] as const;

export type ActivePopup = 'start' | 'end' | 'reason' | 'type' | null;

export function normalizeDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateLeaveDays(start?: string, end?: string, excludeWeekends = true) {
  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);

  if (!startDate || !endDate) return { total: 0, invalid: false };
  if (endDate < startDate) return { total: 0, invalid: true };

  const cursor = new Date(startDate);
  let total = 0;

  while (cursor <= endDate) {
    const day = cursor.getDay();
    if (!excludeWeekends || day !== 0) {
      total += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { total, invalid: false };
}

export function formatDisplayDate(value?: string) {
  const parsed = normalizeDate(value);
  if (!parsed) return 'Select date';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getMonthInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function leaveMatchesMonth(leave: LeaveRequest, monthValue: string) {
  if (!monthValue) return true;

  const [yearText, monthText] = monthValue.split('-');
  const year = Number(yearText);
  const month = Number(monthText) - 1;

  if (Number.isNaN(year) || Number.isNaN(month)) return true;

  const rangeStart = new Date(year, month, 1);
  const rangeEnd = new Date(year, month + 1, 0);
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(23, 59, 59, 999);

  const leaveStart = new Date(leave.startDate);
  const leaveEnd = new Date(leave.endDate);

  return leaveStart <= rangeEnd && leaveEnd >= rangeStart;
}

export function getEmployeeRecordLabel(leave: LeaveRequest) {
  const trimmedName = leave.empName?.trim();
  const trimmedEmpId = leave.empId?.trim();

  if (trimmedName && trimmedEmpId) return `${trimmedName} (${trimmedEmpId})`;
  if (trimmedName) return trimmedName;
  if (trimmedEmpId) return `Emp ID: ${trimmedEmpId}`;
  return '';
}

export function getEmployeeIdFromLabel(value: string) {
  const match = value.match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : '';
}

export function getEmployeeNameFromLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(.*)\s+\(([^)]+)\)\s*$/);
  if (match) return match[1].trim();
  if (/^Emp ID:/i.test(trimmed)) return '';
  return trimmed;
}

export function formatApprovalDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function shiftMonthValue(monthValue: string, offset: number) {
  const [yearText, monthText] = monthValue.split('-');
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const shifted = new Date(year, month + offset, 1);
  return getMonthInputValue(shifted);
}

export function formatDecisionRole(role?: string | null) {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'SUPER_ADMIN') return 'Admin';
  if (normalized === 'TEAM_LEAD') return 'Team Lead';
  return '';
}

export const leaveDetailStatusThemes: Record<
  LeaveRequest['status'],
  { shell: string; panel: string; badge: string }
> = {
  APPROVED: {
    shell: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-white',
    panel: 'border-emerald-100/80 bg-white',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  },
  PENDING: {
    shell: 'border-amber-200/80 bg-gradient-to-br from-amber-50/75 via-white to-white',
    panel: 'border-amber-100/80 bg-white',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  },
  REJECTED: {
    shell: 'border-rose-200/80 bg-gradient-to-br from-rose-50/75 via-white to-white',
    panel: 'border-rose-100/80 bg-white',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  },
};
