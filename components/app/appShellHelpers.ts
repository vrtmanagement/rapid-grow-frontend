import type { AppShellNotification } from '../layout/authenticatedShellTypes';
import { getPublicPath } from '../../utils/appNavigation';
import { getStoredAuthSession } from '../../config/api';
import { PlanningState } from '../../types';
import { normalizeGoalHierarchy } from '../../appNormalizeGoalHierarchy';
import { getDefaultDailyReviewReminderSettings, type DailyReviewReminderSettings } from '../../services/dailyReviewReminderSettings';

export interface GlobalLeaveToast {
  key: string;
  title: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
}

export interface GlobalTaskToast {
  key: string;
  title: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
  route: string;
}

export interface GlobalReminderToast {
  key: string;
  notificationId: string;
  title: string;
  message: string;
  route: string;
  autoHideMs?: number;
}


export function shouldAutoClearNotification(notification?: Partial<AppShellNotification> | null): boolean {
  return String(notification?.type || '').trim().toLowerCase() === 'leave_request_review';
}

export function isLeaveNotification(notification?: Partial<AppShellNotification> | null): boolean {
  const type = String(notification?.type || '').trim().toLowerCase();
  return type === 'leave_request_submitted' || type === 'leave_request_review' || type === 'leave_request_status';
}

export const REMINDER_TOAST_TIME_ZONE = 'Asia/Kolkata';
export const DAILY_REVIEW_REMINDER_TYPE = 'daily_review_reminder';
export const DISMISSED_DAILY_REVIEW_REMINDER_STORAGE_KEY = 'rapidgrow-dismissed-daily-review-reminder-date-keys';
export const CLEARED_APP_NOTIFICATIONS_STORAGE_KEY_PREFIX = 'rapidgrow-cleared-app-notifications';

export function readClearedAppNotificationState(storageKey: string): Record<string, boolean> {
  if (!storageKey || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce<Record<string, boolean>>((acc, [key, value]) => {
      if (value) acc[key] = true;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function getDatePartMap(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
}

export function getDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = getDatePartMap(date, timeZone);
  return `${parts.year || ''}-${parts.month || ''}-${parts.day || ''}`;
}

export function getHourMinuteInTimeZone(date: Date, timeZone: string) {
  const parts = getDatePartMap(date, timeZone);
  return {
    hour: Number(parts.hour || '0'),
    minute: Number(parts.minute || '0'),
  };
}

export function isDailyReviewReminderNotification(notification?: Partial<AppShellNotification> | null): boolean {
  return String(notification?.type || '').trim().toLowerCase() === DAILY_REVIEW_REMINDER_TYPE;
}

export function isInviteAcceptPath(path = getPublicPath()) {
  return path === 'invite' || path === 'invite/accept' || path.startsWith('invite/');
}

export function getDismissedDailyReviewReminderDateKeys(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_DAILY_REVIEW_REMINDER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function markDailyReviewReminderToastDismissed(dateKey: string) {
  const normalizedDateKey = String(dateKey || '').trim();
  if (!normalizedDateKey) return;
  try {
    const nextKeys = Array.from(new Set([...getDismissedDailyReviewReminderDateKeys(), normalizedDateKey]));
    localStorage.setItem(DISMISSED_DAILY_REVIEW_REMINDER_STORAGE_KEY, JSON.stringify(nextKeys));
  } catch {
    // Ignore storage failures and keep in-memory toast behavior intact.
  }
}

export function isDailyReviewReminderToastDismissed(notification?: Partial<AppShellNotification> | null): boolean {
  if (!isDailyReviewReminderNotification(notification)) return false;
  const notificationDateKey = String(notification?.dateKey || '').trim();
  if (!notificationDateKey) return false;
  return getDismissedDailyReviewReminderDateKeys().includes(notificationDateKey);
}

export function canShowDailyReviewReminderToast(
  notification?: Partial<AppShellNotification> | null,
  settings: DailyReviewReminderSettings = getDefaultDailyReviewReminderSettings(),
): boolean {
  if (!isDailyReviewReminderNotification(notification)) return true;
  if (!settings.enabled) return false;

  const reminderTimeZone = String(settings.timezone || REMINDER_TOAST_TIME_ZONE).trim() || REMINDER_TOAST_TIME_ZONE;
  const todayDateKey = getDateKeyInTimeZone(new Date(), reminderTimeZone);
  if (String(notification?.dateKey || '').trim() !== todayDateKey) {
    return false;
  }

  const { hour, minute } = getHourMinuteInTimeZone(new Date(), reminderTimeZone);
  if (hour > settings.hour) return true;
  if (hour === settings.hour) {
    return minute >= settings.minute;
  }
  return false;
}

export function getStoredEmployeeIdentifiers() {
  try {
    const parsed = getStoredAuthSession();
    if (!parsed) return { userId: '', empId: '' };
    const employee = parsed?.employee || {};
    return {
      userId: String(employee._id || ''),
      empId: String(employee.empId || ''),
    };
  } catch {
    return { userId: '', empId: '' };
  }
}

export function clearPlanningGoals(prev: PlanningState): PlanningState {
  return normalizeGoalHierarchy({
    ...prev,
    yearlyGoals: [],
    quarterlyGoals: [],
    monthlyGoals: [],
    weeklyGoals: [],
    dailyGoals: [],
  });
}

export const GOAL_ROUTE_PATTERN =
  /^(yearly|quarterly|monthly|weekly|daily|workspaces|review|reflection)(\/|$)/;
export const VISION_PERMISSION_KEYS = [
  'YEARLY_VIEW',
  'QUARTERLY_VIEW',
  'MONTHLY_VIEW',
  'WEEKLY_VIEW',
  'DAILY_VIEW',
] as const;

