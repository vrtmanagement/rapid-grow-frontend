import { getDefaultDailyReviewReminderSettings } from '../../services/dailyReviewReminderSettings';

export type StaffPanel = 'directory' | 'org-chart';

export type BackendRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | string;

export interface EmployeeRow {
  _id: string;
  empId: string;
  empName: string;
  avatar?: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  role?: BackendRole;
  status?: string;
  createdBy?: string;
}

export interface StaffViewProps {
  mode?: 'manager' | 'employee';
  state?: import('../../types').PlanningState;
}

export function getBackendInfo() {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return { role: 'EMPLOYEE' as BackendRole, empId: '', userId: '' };
    const parsed = JSON.parse(raw);
    return {
      role: (parsed?.employee?.role || 'EMPLOYEE') as BackendRole,
      empId: parsed?.employee?.empId || '',
      userId: parsed?.employee?._id || '',
    };
  } catch {
    return { role: 'EMPLOYEE' as BackendRole, empId: '', userId: '' };
  }
}

export function formatRoleLabel(role?: BackendRole) {
  const normalized = String(role || 'EMPLOYEE').toUpperCase();
  return normalized.replace(/_/g, ' ');
}

export function getRoleBadgeClass(role?: BackendRole) {
  switch (String(role || '').toUpperCase()) {
    case 'SUPER_ADMIN':
      return 'border border-brand-red/15 bg-brand-red/8 text-brand-red';
    case 'ADMIN':
      return 'border border-amber-100 bg-amber-50 text-amber-700';
    case 'TEAM_LEAD':
      return 'border border-blue-100 bg-blue-50 text-blue-700';
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-700';
  }
}

export function getStatusBadgeClass(status?: string) {
  return String(status || '').toLowerCase() === 'active'
    ? 'bg-emerald-500 text-white'
    : 'bg-red-500 text-white';
}

export const REMINDER_HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, '0'),
);
export const REMINDER_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0'),
);
export const REMINDER_MERIDIEM_OPTIONS = ['AM', 'PM'] as const;

export function parseReminderTimeValue(timeValue?: string) {
  const [hourRaw = '21', minuteRaw = '40'] = String(timeValue || '21:40').split(':');
  const hour24 = Math.min(23, Math.max(0, Number(hourRaw) || 0));
  const minute = Math.min(59, Math.max(0, Number(minuteRaw) || 0));
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return {
    hour: String(hour12).padStart(2, '0'),
    minute: String(minute).padStart(2, '0'),
    meridiem,
  } as { hour: string; minute: string; meridiem: 'AM' | 'PM' };
}

export function buildReminderTimeValue(hour: string, minute: string, meridiem: 'AM' | 'PM') {
  const hourNumber = Math.min(12, Math.max(1, Number(hour) || 12));
  const minuteNumber = Math.min(59, Math.max(0, Number(minute) || 0));
  let hour24 = hourNumber % 12;
  if (meridiem === 'PM') {
    hour24 += 12;
  }

  return `${String(hour24).padStart(2, '0')}:${String(minuteNumber).padStart(2, '0')}`;
}

export function formatReminderTimeLabel(timeValue?: string) {
  const parsed = parseReminderTimeValue(timeValue);
  return `${parsed.hour}:${parsed.minute} ${parsed.meridiem}`;
}

export const DEFAULT_REMINDER_SETTINGS = getDefaultDailyReviewReminderSettings();
