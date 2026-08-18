import type { AttendanceSummaryResponse } from '../components/attendance/attendanceUtils';
import { getUserTimeZone } from '../utils/timezone';

export type SettingsTab =
  | 'profile'
  | 'notifications'
  | 'security'
  | 'appearance'
  | 'timezone'
  | 'analysis'
  | 'privacy'
  | 'permissions'
  | 'audit-log';

export const SETTINGS_TABS: SettingsTab[] = [
  'profile',
  'notifications',
  'security',
  'appearance',
  'timezone',
  'analysis',
  'privacy',
  'permissions',
  'audit-log',
];

export const isSettingsTab = (value: string | null): value is SettingsTab => (
  !!value && SETTINGS_TABS.includes(value as SettingsTab)
);

export const formatDateLabel = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: getUserTimeZone(),
  });
};

export const titleCase = (value?: string | null) => {
  if (!value) return '-';
  return value
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getStatusBadgeClasses = (status?: string | null) => {
  const normalized = String(status || 'active').trim().toLowerCase();
  if (normalized === 'inactive') return 'bg-slate-100 text-slate-600';
  if (normalized === 'on leave') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
};

export const getCurrentMonthDateValue = () => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-01`;
};

export const getWorkingDaysForCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const lastCountedDay = now.getDate();
  let totalWorkingDays = 0;

  for (let day = 1; day <= lastCountedDay; day += 1) {
    const current = new Date(year, monthIndex, day);
    if (current.getDay() !== 0) {
      totalWorkingDays += 1;
    }
  }

  return totalWorkingDays;
};

export const buildAttendanceStats = (summary?: AttendanceSummaryResponse | null, employee?: any) => {
  const present = summary?.days?.length ?? Number(employee?.attendanceStats?.present ?? employee?.presentDays ?? 0);
  const totalWorkingDays = getWorkingDaysForCurrentMonth();
  const absent = Math.max(
    0,
    totalWorkingDays - present,
  );
  const late = Number(employee?.attendanceStats?.late ?? employee?.lateDays ?? 0);
  const rate = totalWorkingDays > 0 ? Math.round((present / totalWorkingDays) * 100) : 0;

  return {
    present,
    absent,
    late,
    rate,
  };
};

