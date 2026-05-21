import { API_BASE, getAuthHeaders } from '../config/api';
import type { AppShellNotification } from '../components/layout/authenticatedShellTypes';

export interface NotificationPreferences {
  dailyReviewReminders: boolean;
  leaveUpdates: boolean;
  aiTaskAlerts: boolean;
  communicationMessages: boolean;
  toastPreviews: boolean;
}

export const NOTIFICATION_PREFERENCES_STORAGE_KEY = 'rapidgrow-notification-preferences';
export const NOTIFICATION_PREFERENCES_UPDATED_EVENT = 'rapidgrow:notification-preferences-updated';

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = Object.freeze({
  dailyReviewReminders: true,
  leaveUpdates: true,
  aiTaskAlerts: true,
  communicationMessages: true,
  toastPreviews: true,
});

const TYPE_TO_PREFERENCE_KEY: Record<string, keyof NotificationPreferences> = Object.freeze({
  daily_review_reminder: 'dailyReviewReminders',
  leave_request_submitted: 'leaveUpdates',
  leave_request_review: 'leaveUpdates',
  leave_request_status: 'leaveUpdates',
  ai_task_assignment: 'aiTaskAlerts',
  ai_approval_required: 'aiTaskAlerts',
  ai_task_followup: 'aiTaskAlerts',
});

export function getDefaultNotificationPreferences(): NotificationPreferences {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES };
}

export function normalizeNotificationPreferences(
  input?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  const fallback = DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    dailyReviewReminders:
      typeof input?.dailyReviewReminders === 'boolean'
        ? input.dailyReviewReminders
        : fallback.dailyReviewReminders,
    leaveUpdates:
      typeof input?.leaveUpdates === 'boolean'
        ? input.leaveUpdates
        : fallback.leaveUpdates,
    aiTaskAlerts:
      typeof input?.aiTaskAlerts === 'boolean'
        ? input.aiTaskAlerts
        : fallback.aiTaskAlerts,
    communicationMessages:
      typeof input?.communicationMessages === 'boolean'
        ? input.communicationMessages
        : fallback.communicationMessages,
    toastPreviews:
      typeof input?.toastPreviews === 'boolean'
        ? input.toastPreviews
        : fallback.toastPreviews,
  };
}

export function persistNotificationPreferences(preferences: NotificationPreferences) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      NOTIFICATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizeNotificationPreferences(preferences)),
    );
  } catch {
    // Ignore storage failures so UI controls still work in-memory.
  }
}

export function readStoredNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return getDefaultNotificationPreferences();
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);
    return normalizeNotificationPreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return getDefaultNotificationPreferences();
  }
}

export function broadcastNotificationPreferences(preferences: NotificationPreferences) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeNotificationPreferences(preferences);
  persistNotificationPreferences(normalized);
  window.dispatchEvent(
    new CustomEvent<NotificationPreferences>(NOTIFICATION_PREFERENCES_UPDATED_EVENT, {
      detail: normalized,
    }),
  );
}

export function getNotificationPreferenceKeyForType(
  type?: string | null,
): keyof NotificationPreferences | null {
  const normalizedType = String(type || '').trim().toLowerCase();
  return TYPE_TO_PREFERENCE_KEY[normalizedType] || null;
}

export function isNotificationEnabledForType(
  preferences: NotificationPreferences,
  type?: string | null,
): boolean {
  const key = getNotificationPreferenceKeyForType(type);
  if (!key) return true;
  return preferences[key] !== false;
}

export function filterNotificationsByPreferences(
  notifications: AppShellNotification[],
  preferences: NotificationPreferences,
): AppShellNotification[] {
  return notifications.filter((notification) =>
    isNotificationEnabledForType(preferences, notification?.type),
  );
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await fetch(`${API_BASE}/notifications/settings/preferences`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to load notification preferences');
  }

  const normalized = normalizeNotificationPreferences(data);
  persistNotificationPreferences(normalized);
  return normalized;
}

export async function saveNotificationPreferences(
  input: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const res = await fetch(`${API_BASE}/notifications/settings/preferences`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Failed to update notification preferences');
  }

  const normalized = normalizeNotificationPreferences(data);
  broadcastNotificationPreferences(normalized);
  return normalized;
}
