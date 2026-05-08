import { API_BASE, getAuthHeaders } from '../config/api';

export interface DailyReviewReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  time: string;
  timezone: string;
  cronExpression: string;
  scheduleLabel: string;
  updatedAt?: string | null;
  updatedByEmpId?: string;
}

export const DAILY_REVIEW_REMINDER_SETTINGS_UPDATED_EVENT =
  'rapidgrow:daily-review-reminder-settings-updated';

function padTimePart(value: number) {
  return String(value).padStart(2, '0');
}

export function getDefaultDailyReviewReminderSettings(): DailyReviewReminderSettings {
  return {
    enabled: true,
    hour: 21,
    minute: 40,
    time: '21:40',
    timezone: 'Asia/Kolkata',
    cronExpression: '40 21 * * *',
    scheduleLabel: '09:40 PM',
    updatedAt: null,
    updatedByEmpId: '',
  };
}

export function normalizeDailyReviewReminderSettings(
  input?: Partial<DailyReviewReminderSettings> | null,
): DailyReviewReminderSettings {
  const fallback = getDefaultDailyReviewReminderSettings();
  const hour =
    Number.isInteger(input?.hour) && Number(input?.hour) >= 0 && Number(input?.hour) <= 23
      ? Number(input?.hour)
      : fallback.hour;
  const minute =
    Number.isInteger(input?.minute) && Number(input?.minute) >= 0 && Number(input?.minute) <= 59
      ? Number(input?.minute)
      : fallback.minute;

  return {
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : fallback.enabled,
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
        : `${minute} ${hour} * * *`,
    scheduleLabel:
      typeof input?.scheduleLabel === 'string' && input.scheduleLabel.trim()
        ? input.scheduleLabel.trim()
        : fallback.scheduleLabel,
    updatedAt: input?.updatedAt || null,
    updatedByEmpId: typeof input?.updatedByEmpId === 'string' ? input.updatedByEmpId : '',
  };
}

export function broadcastDailyReviewReminderSettings(settings: DailyReviewReminderSettings) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(DAILY_REVIEW_REMINDER_SETTINGS_UPDATED_EVENT, {
      detail: settings,
    }),
  );
}

export async function fetchDailyReviewReminderSettings(): Promise<DailyReviewReminderSettings> {
  const res = await fetch(`${API_BASE}/notifications/settings/daily-review-reminder`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to load daily reminder settings');
  }

  return normalizeDailyReviewReminderSettings(data);
}

export async function saveDailyReviewReminderSettings(input: {
  enabled: boolean;
  time: string;
}): Promise<DailyReviewReminderSettings> {
  const res = await fetch(`${API_BASE}/notifications/settings/daily-review-reminder`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to update daily reminder settings');
  }

  const normalized = normalizeDailyReviewReminderSettings(data);
  broadcastDailyReviewReminderSettings(normalized);
  return normalized;
}
