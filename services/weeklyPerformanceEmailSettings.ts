import { API_BASE, getAuthHeaders } from '../config/api';

export interface WeeklyPerformanceTargetEmployee {
  empId: string;
  empName: string;
  email?: string;
}

export interface WeeklyPerformanceEmailSettings {
  enabled: boolean;
  dayOfWeek: number;
  dayOfWeekLabel: string;
  hour: number;
  minute: number;
  time: string;
  timezone: string;
  cronExpression: string;
  scheduleLabel: string;
  targetEmpIds: string[];
  targetEmployees: WeeklyPerformanceTargetEmployee[];
  recipientsMode: 'all' | 'selected';
  recipientsLabel: string;
  lastSentWeekId?: string;
  updatedAt?: string | null;
  updatedByEmpId?: string;
}

export const WEEKLY_PERFORMANCE_EMAIL_SETTINGS_UPDATED_EVENT =
  'rapidgrow:weekly-performance-email-settings-updated';

export const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

function padTimePart(value: number) {
  return String(value).padStart(2, '0');
}

export function getDefaultWeeklyPerformanceEmailSettings(): WeeklyPerformanceEmailSettings {
  return {
    enabled: false,
    dayOfWeek: 1,
    dayOfWeekLabel: 'Monday',
    hour: 9,
    minute: 0,
    time: '09:00',
    timezone: 'Asia/Kolkata',
    cronExpression: '0 9 * * 1',
    scheduleLabel: 'Monday at 09:00 AM',
    targetEmpIds: [],
    targetEmployees: [],
    recipientsMode: 'all',
    recipientsLabel: 'Everyone on execution matrix',
    lastSentWeekId: '',
    updatedAt: null,
    updatedByEmpId: '',
  };
}

export function normalizeWeeklyPerformanceEmailSettings(
  input?: Partial<WeeklyPerformanceEmailSettings> | null,
): WeeklyPerformanceEmailSettings {
  const fallback = getDefaultWeeklyPerformanceEmailSettings();
  const hour =
    Number.isInteger(input?.hour) && Number(input?.hour) >= 0 && Number(input?.hour) <= 23
      ? Number(input?.hour)
      : fallback.hour;
  const minute =
    Number.isInteger(input?.minute) && Number(input?.minute) >= 0 && Number(input?.minute) <= 59
      ? Number(input?.minute)
      : fallback.minute;
  const dayOfWeek =
    Number.isInteger(input?.dayOfWeek) && Number(input?.dayOfWeek) >= 0 && Number(input?.dayOfWeek) <= 6
      ? Number(input?.dayOfWeek)
      : fallback.dayOfWeek;

  return {
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : fallback.enabled,
    dayOfWeek,
    dayOfWeekLabel:
      typeof input?.dayOfWeekLabel === 'string' && input.dayOfWeekLabel.trim()
        ? input.dayOfWeekLabel.trim()
        : WEEKDAY_OPTIONS.find((option) => option.value === dayOfWeek)?.label || fallback.dayOfWeekLabel,
    hour,
    minute,
    time:
      typeof input?.time === 'string' && /^\d{2}:\d{2}$/.test(input.time.trim())
        ? input.time.trim()
        : `${padTimePart(hour)}:${padTimePart(minute)}`,
    timezone:
      typeof input?.timezone === 'string' && input.timezone.trim()
        ? input.timezone.trim()
        : fallback.timezone,
    cronExpression:
      typeof input?.cronExpression === 'string' && input.cronExpression.trim()
        ? input.cronExpression.trim()
        : fallback.cronExpression,
    scheduleLabel:
      typeof input?.scheduleLabel === 'string' && input.scheduleLabel.trim()
        ? input.scheduleLabel.trim()
        : fallback.scheduleLabel,
    targetEmpIds: Array.isArray(input?.targetEmpIds)
      ? input.targetEmpIds.map((id) => String(id).trim()).filter(Boolean)
      : fallback.targetEmpIds,
    targetEmployees: Array.isArray(input?.targetEmployees)
      ? input.targetEmployees
          .map((row) => ({
            empId: String(row?.empId || '').trim(),
            empName: String(row?.empName || row?.empId || '').trim(),
            email: String(row?.email || '').trim(),
          }))
          .filter((row) => row.empId)
      : fallback.targetEmployees,
    recipientsMode:
      input?.recipientsMode === 'selected' ||
      (Array.isArray(input?.targetEmpIds) && input.targetEmpIds.length > 0)
        ? 'selected'
        : 'all',
    recipientsLabel:
      typeof input?.recipientsLabel === 'string' && input.recipientsLabel.trim()
        ? input.recipientsLabel.trim()
        : fallback.recipientsLabel,
    lastSentWeekId: typeof input?.lastSentWeekId === 'string' ? input.lastSentWeekId : '',
    updatedAt: input?.updatedAt || null,
    updatedByEmpId: typeof input?.updatedByEmpId === 'string' ? input.updatedByEmpId : '',
  };
}

export function broadcastWeeklyPerformanceEmailSettings(settings: WeeklyPerformanceEmailSettings) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(WEEKLY_PERFORMANCE_EMAIL_SETTINGS_UPDATED_EVENT, {
      detail: settings,
    }),
  );
}

export async function fetchWeeklyPerformanceEmailSettings(): Promise<WeeklyPerformanceEmailSettings> {
  const res = await fetch(`${API_BASE}/performance/settings/weekly-email`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to load weekly performance email settings');
  }

  return normalizeWeeklyPerformanceEmailSettings(data);
}

export async function saveWeeklyPerformanceEmailSettings(input: {
  enabled: boolean;
  time: string;
  dayOfWeek: number;
}): Promise<WeeklyPerformanceEmailSettings> {
  const res = await fetch(`${API_BASE}/performance/settings/weekly-email`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to update weekly performance email settings');
  }

  const normalized = normalizeWeeklyPerformanceEmailSettings(data);
  broadcastWeeklyPerformanceEmailSettings(normalized);
  return normalized;
}

export async function sendWeeklyPerformanceEmailsNow(options?: {
  weekId?: string;
  empIds?: string[];
}): Promise<{
  sent: number;
  skipped: number;
  employees: number;
  weekId: string;
  message: string;
}> {
  const body: { weekId?: string; empIds?: string[] } = {};
  if (options?.weekId) body.weekId = options.weekId;
  if (options?.empIds?.length) body.empIds = options.empIds;

  const res = await fetch(`${API_BASE}/performance/weekly-email/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to send weekly performance emails');
  }

  return data;
}
