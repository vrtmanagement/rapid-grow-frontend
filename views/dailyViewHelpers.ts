import { getStoredAuthSession } from '../config/api';

export interface SpacesTaskSummary {
  taskId: string;
  title: string;
  assigneeId: string;
  dueDate: string;
  priority: string;
  status: string;
  customFields?: Record<string, string>;
}

export interface EmployeeOption {
  empId: string;
  empName: string;
  role?: string;
}

export type NormalizedRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | 'UNKNOWN';

export const normalizeRole = (role?: string): NormalizedRole => {
  const value = String(role || '').toUpperCase();
  if (value === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (value === 'ADMIN') return 'ADMIN';
  if (value === 'TEAM_LEAD') return 'TEAM_LEAD';
  if (value === 'EMPLOYEE') return 'EMPLOYEE';
  return 'UNKNOWN';
};

export function getLoggedInEmpId(): string {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed?.employee?.empId || '';
  } catch {
    return '';
  }
}

export function getLoggedInEmployeeMeta() {
  const session = getStoredAuthSession();
  const emp = session?.employee || {};
  return {
    empId: String(emp.empId || emp._id || ''),
    empName: String(emp.empName || ''),
    role: String(emp.role || '').toUpperCase(),
  };
}

export const parseDateKey = (raw: string): Date | null => {
  const value = String(raw || '').trim();
  if (!value) return null;
  const isoDateMatch = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = isoDateMatch ? new Date(`${value}T00:00:00`) : new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSundayStart = (date: Date): Date => {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  normalized.setDate(normalized.getDate() - normalized.getDay());
  return normalized;
};

export const getAssignmentStatusBadge = (status?: string): string => {
  switch (String(status || '').toLowerCase()) {
    case 'doing':
      return 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-navy';
    case 'review':
      return 'border-brand-orange/30 bg-brand-orange/10 text-brand-brown';
    case 'blocked':
      return 'border-brand-red/25 bg-brand-red/10 text-brand-red';
    case 'done':
      return 'border-brand-green/30 bg-brand-green/10 text-brand-green';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
};

export const getAssignmentPriorityBadge = (priority?: string): string => {
  switch (String(priority || '').toLowerCase()) {
    case 'high':
      return 'border-brand-red/25 bg-brand-red/10 text-brand-red';
    case 'low':
      return 'border-brand-green/25 bg-brand-green/10 text-brand-green';
    default:
      return 'border-brand-orange/25 bg-brand-orange/10 text-brand-brown';
  }
};

export const formatAssignmentStatusLabel = (status?: string): string => {
  switch (String(status || '').toLowerCase()) {
    case 'doing':
      return 'In Progress';
    case 'review':
      return 'In Review';
    case 'blocked':
      return 'Blocked';
    case 'done':
      return 'Done';
    default:
      return 'To Do';
  }
};

export const formatAssignmentPriorityLabel = (priority?: string): string => {
  switch (String(priority || '').toLowerCase()) {
    case 'high':
      return 'High Priority';
    case 'low':
      return 'Low Priority';
    default:
      return 'Medium Priority';
  }
};
