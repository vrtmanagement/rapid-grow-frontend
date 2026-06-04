import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './context/I18nContext';
import ClientPortalView from './views/ClientPortalView';
import { PlanningState } from './types';
import { normalizeGoalHierarchy } from './appNormalizeGoalHierarchy';
import {
  SUPER_ADMIN_EMAIL,
  DEFAULT_POWERS,
  DEFAULT_UI_CONFIG,
  INITIAL_TEAM,
  EMPTY_PROFILE,
  createDefaultPlanningStateInput,
} from './appSeedConstants';
import LoginView from './views/LoginView';
import InviteAcceptView from './views/InviteAcceptView';
import WorkspaceSignupView from './views/WorkspaceSignupView';
import ForgotPasswordView from './views/ForgotPasswordView';
import ResetPasswordView from './views/ResetPasswordView';
import OnboardingTour from './components/onboarding/OnboardingTour';
import { CommunicationProvider } from './communication/context/CommunicationContext';
import { apiListConversations } from './communication/api';
import { getUnreadDirectMessageSourceCount } from './communication/unread';
import { getSocket } from './realtime/socket';
import { mapBackendRoleToUiRole } from './config/permissions';
import { usePermissions } from './context/usePermissions';
import GlobalAppToasts from './components/layout/GlobalAppToasts';
import AppEmployeePortalLayout from './components/layout/AppEmployeePortalLayout';
import AppManagerPortalLayout from './components/layout/AppManagerPortalLayout';
import type { AppShellNotification } from './components/layout/authenticatedShellTypes';
import {
  API_BASE,
  AUTH_EXPIRED_EVENT,
  clearStoredSession,
  getAuthHeaders,
  getStoredAuthSession,
} from './config/api';
import {
  DAILY_REVIEW_REMINDER_SETTINGS_UPDATED_EVENT,
  fetchDailyReviewReminderSettings,
  getDefaultDailyReviewReminderSettings,
  normalizeDailyReviewReminderSettings,
  type DailyReviewReminderSettings,
} from './services/dailyReviewReminderSettings';
import {
  fetchNotificationPreferences,
  filterNotificationsByPreferences,
  getDefaultNotificationPreferences,
  isNotificationEnabledForType,
  normalizeNotificationPreferences,
  NOTIFICATION_PREFERENCES_STORAGE_KEY,
  NOTIFICATION_PREFERENCES_UPDATED_EVENT,
  readStoredNotificationPreferences,
  type NotificationPreferences,
} from './services/notificationPreferences';
import { getDisplayAvatarUrl, persistSessionEmployeeAvatar, PROFILE_AVATAR_UPDATED_EVENT } from './utils/avatar';

interface GlobalLeaveToast {
  key: string;
  title: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
}

interface GlobalTaskToast {
  key: string;
  title: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
  route: string;
}

interface GlobalReminderToast {
  key: string;
  notificationId: string;
  title: string;
  message: string;
  route: string;
  autoHideMs?: number;
}


function shouldAutoClearNotification(notification?: Partial<AppShellNotification> | null): boolean {
  return String(notification?.type || '').trim().toLowerCase() === 'leave_request_review';
}

function isLeaveNotification(notification?: Partial<AppShellNotification> | null): boolean {
  const type = String(notification?.type || '').trim().toLowerCase();
  return type === 'leave_request_submitted' || type === 'leave_request_review' || type === 'leave_request_status';
}

const REMINDER_TOAST_TIME_ZONE = 'Asia/Kolkata';
const DAILY_REVIEW_REMINDER_TYPE = 'daily_review_reminder';
const DISMISSED_DAILY_REVIEW_REMINDER_STORAGE_KEY = 'rapidgrow-dismissed-daily-review-reminder-date-keys';
const CLEARED_APP_NOTIFICATIONS_STORAGE_KEY_PREFIX = 'rapidgrow-cleared-app-notifications';

function readClearedAppNotificationState(storageKey: string): Record<string, boolean> {
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

function getDatePartMap(date: Date, timeZone: string) {
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

function getDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = getDatePartMap(date, timeZone);
  return `${parts.year || ''}-${parts.month || ''}-${parts.day || ''}`;
}

function getHourMinuteInTimeZone(date: Date, timeZone: string) {
  const parts = getDatePartMap(date, timeZone);
  return {
    hour: Number(parts.hour || '0'),
    minute: Number(parts.minute || '0'),
  };
}

function isDailyReviewReminderNotification(notification?: Partial<AppShellNotification> | null): boolean {
  return String(notification?.type || '').trim().toLowerCase() === DAILY_REVIEW_REMINDER_TYPE;
}

function getPublicHashPath() {
  return window.location.hash.replace(/^#\/?/, '').split('?')[0];
}

function isInviteAcceptPath(path = getPublicHashPath()) {
  return path === 'invite' || path === 'invite/accept' || path.startsWith('invite/');
}

function getDismissedDailyReviewReminderDateKeys(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_DAILY_REVIEW_REMINDER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function markDailyReviewReminderToastDismissed(dateKey: string) {
  const normalizedDateKey = String(dateKey || '').trim();
  if (!normalizedDateKey) return;
  try {
    const nextKeys = Array.from(new Set([...getDismissedDailyReviewReminderDateKeys(), normalizedDateKey]));
    localStorage.setItem(DISMISSED_DAILY_REVIEW_REMINDER_STORAGE_KEY, JSON.stringify(nextKeys));
  } catch {
    // Ignore storage failures and keep in-memory toast behavior intact.
  }
}

function isDailyReviewReminderToastDismissed(notification?: Partial<AppShellNotification> | null): boolean {
  if (!isDailyReviewReminderNotification(notification)) return false;
  const notificationDateKey = String(notification?.dateKey || '').trim();
  if (!notificationDateKey) return false;
  return getDismissedDailyReviewReminderDateKeys().includes(notificationDateKey);
}

function canShowDailyReviewReminderToast(
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

function getStoredEmployeeIdentifiers() {
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

function clearPlanningGoals(prev: PlanningState): PlanningState {
  return normalizeGoalHierarchy({
    ...prev,
    yearlyGoals: [],
    quarterlyGoals: [],
    monthlyGoals: [],
    weeklyGoals: [],
    dailyGoals: [],
  });
}

const App: React.FC = () => {
  const { permissions, hasPermission, loading: permissionsLoading } = usePermissions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [publicHashPath, setPublicHashPath] = useState(getPublicHashPath);
  const [appStateHydrated, setAppStateHydrated] = useState(false);
  const [goalsHydrated, setGoalsHydrated] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [isVisionsOpen, setIsVisionsOpen] = useState(true);
  const [communicationUnreadCount, setCommunicationUnreadCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [notifications, setNotifications] = useState<AppShellNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [clearedNotificationIds, setClearedNotificationIds] = useState<Record<string, boolean>>({});
  const [globalLeaveToast, setGlobalLeaveToast] = useState<GlobalLeaveToast | null>(null);
  const [globalTaskToast, setGlobalTaskToast] = useState<GlobalTaskToast | null>(null);
  const [globalReminderToast, setGlobalReminderToast] = useState<GlobalReminderToast | null>(null);
  const [dailyReviewReminderSettings, setDailyReviewReminderSettings] = useState<DailyReviewReminderSettings>(
    getDefaultDailyReviewReminderSettings(),
  );
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    readStoredNotificationPreferences,
  );
  const shownLeaveToastKeysRef = useRef<Record<string, true>>({});
  const shownTaskToastKeysRef = useRef<Record<string, true>>({});
  const shownReminderToastKeysRef = useRef<Record<string, true>>({});
  const lastCommunicationUnreadRef = useRef<number | null>(null);
  const notificationClearStorageKey = useMemo(() => {
    const session = getStoredAuthSession();
    const scopedUserId = String(session?.employee?.empId || session?.employee?._id || 'anonymous').trim() || 'anonymous';
    return `${CLEARED_APP_NOTIFICATIONS_STORAGE_KEY_PREFIX}:${scopedUserId}`;
  }, [isAuthenticated]);

  const dismissGlobalReminderToast = useCallback((toast: GlobalReminderToast | null) => {
    if (toast?.notificationId) {
      const notification = notifications.find((item) => item._id === toast.notificationId);
      if (isDailyReviewReminderNotification(notification)) {
        markDailyReviewReminderToastDismissed(String(notification?.dateKey || ''));
      }
    }
    setGlobalReminderToast(null);
  }, [notifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      setDailyReviewReminderSettings(getDefaultDailyReviewReminderSettings());
      return;
    }

    let active = true;

    async function loadDailyReviewReminderSettings() {
      try {
        const settings = await fetchDailyReviewReminderSettings();
        if (active) {
          setDailyReviewReminderSettings(settings);
        }
      } catch (err) {
        console.warn('Failed to load daily reminder settings', err);
        if (active) {
          setDailyReviewReminderSettings(getDefaultDailyReviewReminderSettings());
        }
      }
    }

    loadDailyReviewReminderSettings();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<DailyReviewReminderSettings>).detail;
      setDailyReviewReminderSettings(normalizeDailyReviewReminderSettings(detail));
    };

    window.addEventListener(DAILY_REVIEW_REMINDER_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);

    return () => {
      window.removeEventListener(DAILY_REVIEW_REMINDER_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotificationPreferences(getDefaultNotificationPreferences());
      return;
    }

    let active = true;

    async function loadNotificationPreferences() {
      try {
        const preferences = await fetchNotificationPreferences();
        if (active) {
          setNotificationPreferences(preferences);
        }
      } catch (err) {
        console.warn('Failed to load notification preferences', err);
        if (active) {
          setNotificationPreferences(readStoredNotificationPreferences());
        }
      }
    }

    loadNotificationPreferences();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleNotificationPreferencesUpdated = (event: Event) => {
      const detail = (event as CustomEvent<NotificationPreferences>).detail;
      setNotificationPreferences(normalizeNotificationPreferences(detail));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== NOTIFICATION_PREFERENCES_STORAGE_KEY) return;
      setNotificationPreferences(readStoredNotificationPreferences());
    };

    window.addEventListener(NOTIFICATION_PREFERENCES_UPDATED_EVENT, handleNotificationPreferencesUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(NOTIFICATION_PREFERENCES_UPDATED_EVENT, handleNotificationPreferencesUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    setClearedNotificationIds(readClearedAppNotificationState(notificationClearStorageKey));
  }, [notificationClearStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        notificationClearStorageKey,
        JSON.stringify(clearedNotificationIds),
      );
    } catch {
      // Ignore storage failures so notifications keep working normally.
    }
  }, [clearedNotificationIds, notificationClearStorageKey]);

  useEffect(() => {
    const syncStoredSession = () => {
      const session = getStoredAuthSession();
      setIsAuthenticated(!!session);
      if (session?.employee) {
        const { employee } = session;
        setState(prev => ({
          ...prev,
            currentUser: {
              id: employee._id || employee.empId,
              name: employee.empName || 'Admin',
              role: mapBackendRoleToUiRole(employee.role),
              email: employee.email || '',
              avatar: getDisplayAvatarUrl(employee.avatar, employee.empName || 'Admin'),
              status: 'Active',
              isVerified: true,
              powers: DEFAULT_POWERS[employee.role as keyof typeof DEFAULT_POWERS] || [],
            },
        }));
      }
    };

    const handleAuthExpired = () => {
      clearStoredSession();
      setIsAuthenticated(false);
    };

    syncStoredSession();
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  useEffect(() => {
    const syncHashPath = () => setPublicHashPath(getPublicHashPath());
    window.addEventListener('hashchange', syncHashPath);
    return () => window.removeEventListener('hashchange', syncHashPath);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    window.location.hash = '#/';
    window.location.reload();
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredSession();
    setIsAuthenticated(false);
  }, []);

  const [state, setState] = useState<PlanningState>(normalizeGoalHierarchy(createDefaultPlanningStateInput()));

  useEffect(() => {
    if (!isAuthenticated || !state.currentUser?.id) return;

    let active = true;
    const currentUserId = state.currentUser.id;
    const currentUserName = state.currentUser.name;
    const currentUserEmail = state.currentUser.email;

    async function syncCurrentEmployeeProfile() {
      try {
        const res = await fetch(`${API_BASE}/employees/${encodeURIComponent(currentUserId)}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const employee = await res.json();
        if (!active || !employee) return;

        const nextUser = {
          id: employee._id || employee.empId || currentUserId,
          name: employee.empName || currentUserName,
          role: mapBackendRoleToUiRole(employee.role),
          email: employee.email || currentUserEmail,
          avatar: getDisplayAvatarUrl(employee.avatar, employee.empName || currentUserName),
          status: 'Active',
          isVerified: true,
        };

        persistSessionEmployeeAvatar(employee.avatar, employee);
        setState((prev) => ({
          ...prev,
          currentUser: {
            ...prev.currentUser,
            ...nextUser,
            powers: prev.currentUser.powers,
          },
          team: prev.team.map((member) =>
            String(member.id) === String(prev.currentUser.id) || String(member.id) === String(employee.empId)
              ? { ...member, ...nextUser, powers: member.powers }
              : member,
          ),
        }));
      } catch (err) {
        console.warn('Failed to sync current employee profile', err);
      }
    }

    syncCurrentEmployeeProfile();

    return () => {
      active = false;
    };
  }, [isAuthenticated, state.currentUser?.id]);

  useEffect(() => {
    const saved = localStorage.getItem('rapidgrow-os-v1');
    const adminStored = localStorage.getItem('rapidgrow-admin');
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migration: remove legacy default \"Rapid Grow execution framework\" project if present
        if (Array.isArray(parsed.workspaces)) {
          parsed.workspaces = parsed.workspaces.map((ws: any) => ({
            ...ws,
            projects: Array.isArray(ws.projects)
              ? ws.projects.filter(
                  (p: any) =>
                    !(
                      p?.id === 'p-1' &&
                      p?.name === 'Rapid Grow execution framework'
                    ),
                )
              : [],
          }));
        }
        // Always use logged-in user from rapidgrow-admin for header, not saved/static name
        let currentUser = parsed.currentUser;
        if (adminStored) {
          try {
            const { employee } = JSON.parse(adminStored);
            currentUser = {
              id: employee._id || employee.empId,
              name: employee.empName || 'Admin',
              role: mapBackendRoleToUiRole(employee.role),
              email: employee.email || '',
              avatar: getDisplayAvatarUrl(employee.avatar, employee.empName || 'Admin'),
              status: 'Active',
              isVerified: true,
              powers: DEFAULT_POWERS[employee.role as keyof typeof DEFAULT_POWERS] || [],
            };
          } catch (_e) { /* ignore */ }
        }
        // Goals are API-sourced; avoid hydrating stale local goal trees.
        setState((prev) =>
          normalizeGoalHierarchy({
            ...prev,
            ...parsed,
            yearlyGoals: prev.yearlyGoals,
            quarterlyGoals: prev.quarterlyGoals,
            monthlyGoals: prev.monthlyGoals,
            weeklyGoals: prev.weeklyGoals,
            dailyGoals: prev.dailyGoals,
            currentUser,
          }),
        );
      }
    } catch (e) {
      console.error("Restore failed", e);
    } finally {
      setAppStateHydrated(true);
    }
  }, []);

  useEffect(() => {
    const handleProfileAvatarUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ avatar?: string; empId?: string; userId?: string }>).detail || {};
      const nextAvatar = getDisplayAvatarUrl(detail.avatar, state.currentUser.name);
      setState(prev => {
        const matchesCurrentUser =
          (!!detail.userId && String(detail.userId) === String(prev.currentUser.id)) ||
          (!!detail.empId && prev.team.some((member) => String(member.id) === String(detail.empId)));
        const updatedTeam = prev.team.map((member) => {
          const isMatch =
            (!!detail.userId && String(member.id) === String(detail.userId)) ||
            (!!detail.empId && String(member.id) === String(detail.empId)) ||
            String(member.id) === String(prev.currentUser.id);
          return isMatch ? { ...member, avatar: nextAvatar } : member;
        });
        return {
          ...prev,
          currentUser: matchesCurrentUser || !detail.userId && !detail.empId
            ? { ...prev.currentUser, avatar: nextAvatar }
            : prev.currentUser,
          team: updatedTeam,
        };
      });
    };

    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    return () => {
      window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    };
  }, [state.currentUser.name]);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      currentUser: {
        ...prev.currentUser,
        powers: Array.isArray(permissions) ? permissions : [],
      },
    }));
  }, [permissions]);

  useEffect(() => {
    try {
      // Persist UI/session conveniences only. Goals are persisted via API endpoints.
      const serialized = JSON.stringify({
        ...state,
        yearlyGoals: [],
        quarterlyGoals: [],
        monthlyGoals: [],
        weeklyGoals: [],
        dailyGoals: [],
      });
      localStorage.setItem('rapidgrow-os-v1', serialized);
    } catch (e) {
      console.error('Failed to persist rapidgrow-os state', e);
    }
  }, [state]);

  useEffect(() => {
    if (!isAuthenticated || !state.currentUser?.id) return;

    let active = true;

    async function syncCommunicationUnreadCount() {
      try {
        const data = await apiListConversations();
        if (active) {
          setCommunicationUnreadCount(getUnreadDirectMessageSourceCount(data.conversations || []));
        }
      } catch (err) {
        console.warn('Failed to load communication unread count', err);
      }
    }

    syncCommunicationUnreadCount();

    const socket = getSocket();
    const handleUnreadCount = (payload: any) => {
      if (!payload || String(payload.userId) !== String(state.currentUser.id)) return;
      syncCommunicationUnreadCount();
    };
    const handleCommunicationSync = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadSourceCount?: number }>).detail;
      if (!detail || typeof detail.unreadSourceCount !== 'number') return;
      setCommunicationUnreadCount(detail.unreadSourceCount);
    };

    socket.on('unreadCount', handleUnreadCount);
    window.addEventListener('rapidgrow:communication-unread-sync', handleCommunicationSync as EventListener);

    return () => {
      active = false;
      socket.off('unreadCount', handleUnreadCount);
      window.removeEventListener('rapidgrow:communication-unread-sync', handleCommunicationSync as EventListener);
    };
  }, [isAuthenticated, state.currentUser?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const { empId } = getStoredEmployeeIdentifiers();
    if (!empId) return;

    let active = true;

    async function fetchTaskCount() {
      try {
        const res = await fetch(`${API_BASE}/tasks/unread-count/${encodeURIComponent(empId)}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          throw new Error('Failed to load task count');
        }
        const data = await res.json();
        if (active) {
          setTaskCount(typeof data?.unreadCount === 'number' ? data.unreadCount : 0);
        }
      } catch (err) {
        console.warn('Failed to load task count', err);
      }
    }

    fetchTaskCount();

    const socket = getSocket();
    const handleTaskCount = (payload: any) => {
      if (!payload || String(payload.userId) !== empId) return;
      setTaskCount(typeof payload.unreadCount === 'number' ? payload.unreadCount : 0);
    };

    socket.on('taskCount', handleTaskCount);

    return () => {
      active = false;
      socket.off('taskCount', handleTaskCount);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleImmediateTaskCount = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; unreadCount?: number }>).detail;
      const { empId } = getStoredEmployeeIdentifiers();
      if (!empId || !detail || String(detail.userId || '') !== empId) return;
      setTaskCount(typeof detail.unreadCount === 'number' ? detail.unreadCount : 0);
    };

    window.addEventListener('rapidgrow:task-count-sync', handleImmediateTaskCount as EventListener);
    return () => {
      window.removeEventListener('rapidgrow:task-count-sync', handleImmediateTaskCount as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setGoalsHydrated(true);
      return;
    }
    setGoalsHydrated(false);
    const loadGoals = async () => {
      try {
        const res = await fetch(`${API_BASE}/goals`, { headers: getAuthHeaders() });
        if (!res.ok) {
          setState(clearPlanningGoals);
          return;
        }
        const goals = await res.json();
        if (!Array.isArray(goals)) {
          setState(clearPlanningGoals);
          return;
        }
        setState((prev) =>
          normalizeGoalHierarchy({
            ...prev,
            yearlyGoals: goals
              .filter((g: any) => g.level === 'year')
              .map((g: any) => ({
                id: g.goalId,
                text: g.text || '',
                details: g.details || '',
                completed: !!g.completed,
                level: 'year' as const,
              })),
            quarterlyGoals: goals
              .filter((g: any) => g.level === 'quarter')
              .map((g: any) => ({
                id: g.goalId,
                text: g.text || '',
                details: g.details || '',
                completed: !!g.completed,
                level: 'quarter' as const,
                parentId: g.parentId || '',
                timeline: g.timeline || '',
              })),
            monthlyGoals: goals
              .filter((g: any) => g.level === 'month')
              .map((g: any) => ({ id: g.goalId, text: g.text || '', completed: !!g.completed, level: 'month' as const, parentId: g.parentId || '', details: g.details || '' })),
            weeklyGoals: goals
              .filter((g: any) => g.level === 'week')
              .map((g: any) => ({ id: g.goalId, text: g.text || '', completed: !!g.completed, level: 'week' as const, parentId: g.parentId || '', details: g.details || '', timeline: g.timeline || '' })),
            dailyGoals: goals
              .filter((g: any) => g.level === 'day')
              .map((g: any) => ({ id: g.goalId, text: g.text || '', completed: !!g.completed, level: 'day' as const, parentId: g.parentId || '' })),
          }),
        );
      } catch (err) {
        console.warn('Failed to load goals', err);
        setState(clearPlanningGoals);
      } finally {
        setGoalsHydrated(true);
      }
    };
    loadGoals();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!globalLeaveToast) return undefined;
    const timer = window.setTimeout(() => setGlobalLeaveToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [globalLeaveToast]);

  useEffect(() => {
    if (!globalTaskToast) return undefined;
    const timer = window.setTimeout(() => setGlobalTaskToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [globalTaskToast]);

  useEffect(() => {
    if (!globalReminderToast) return undefined;
    const timer = window.setTimeout(
      () => setGlobalReminderToast(null),
      globalReminderToast.autoHideMs ?? 8000,
    );
    return () => window.clearTimeout(timer);
  }, [globalReminderToast]);


  useEffect(() => {
    if (!isAuthenticated) return;

    const session = getStoredAuthSession();
    const backendEmployee = session?.employee || {};
    const backendRole = String(backendEmployee.role || '').toUpperCase();
    const backendEmpId = String(backendEmployee.empId || '').trim();
    const isBackendAdminRole = backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN';
    const isTeamLeadRole = backendRole === 'TEAM_LEAD';
    const socket = getSocket();

    const formatActorHeading = (payload: any) => {
      const empName = String(payload?.empName || payload?.empId || 'An employee').trim();
      const empId = String(payload?.empId || '').trim();
      return empId ? `${empName} (${empId})` : empName;
    };

    const formatActorMeta = (payload: any) => {
      const designation = String(payload?.designation || '').trim();
      const department = String(payload?.department || '').trim();
      return [designation, department].filter(Boolean).join(' | ');
    };

    const canShowLeaveToasts = true;

    const showGlobalLeaveToast = (toast: GlobalLeaveToast) => {
      if (!canShowLeaveToasts) return;
      if (shownLeaveToastKeysRef.current[toast.key]) return;
      shownLeaveToastKeysRef.current[toast.key] = true;
      setGlobalLeaveToast(toast);
    };

    const onLeaveCreated = (payload: any) => {
      const approverRole = String(payload?.approverRole || '').toUpperCase();
      const actorHeading = formatActorHeading(payload);
      const actorMeta = formatActorMeta(payload);
      const actorSummary = actorMeta ? `${actorHeading} | ${actorMeta}` : actorHeading;
      const eventKey = `leave-created:${String(payload?.leaveId || '')}:${String(payload?.createdAt || '')}`;

      if (isBackendAdminRole) {
        showGlobalLeaveToast({
          key: eventKey,
          title: 'New leave request',
          message: `${actorSummary} submitted a leave request.`,
          tone: 'info',
        });
        return;
      }

      if (isTeamLeadRole && approverRole === 'TEAM_LEAD') {
        showGlobalLeaveToast({
          key: eventKey,
          title: 'New leave request',
          message: `${actorSummary} submitted a leave request for your review.`,
          tone: 'info',
        });
      }
    };

    const onLeaveUpdated = (payload: any) => {
      const status = String(payload?.status || '').toUpperCase();
      const decidedByRole = String(payload?.decidedByRole || '').toUpperCase();
      const matchesCurrentUser = String(payload?.empId || '').trim() === backendEmpId;
      const eventKey = `leave-updated:${String(payload?.leaveId || '')}:${status}:${String(payload?.decidedAt || '')}`;

      if (!matchesCurrentUser || isBackendAdminRole || !['APPROVED', 'REJECTED'].includes(status)) {
        return;
      }

      const actorLabel =
        decidedByRole === 'TEAM_LEAD'
          ? 'Team Lead'
          : decidedByRole === 'ADMIN' || decidedByRole === 'SUPER_ADMIN'
            ? 'Admin'
            : 'Approver';

      showGlobalLeaveToast({
        key: eventKey,
        title: status === 'APPROVED' ? 'Leave approved' : 'Leave rejected',
        message: `Your leave request was ${status === 'APPROVED' ? 'approved' : 'rejected'} by ${actorLabel}.`,
        tone: status === 'APPROVED' ? 'success' : 'warning',
      });
    };

    socket.on('leave:created', onLeaveCreated);
    socket.on('leave:updated', onLeaveUpdated);

    return () => {
      socket.off('leave:created', onLeaveCreated);
      socket.off('leave:updated', onLeaveUpdated);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const session = getStoredAuthSession();
    const backendEmployee = session?.employee || {};
    const backendEmpId = String(backendEmployee.empId || '').trim();
    const socket = getSocket();
    const canShowTaskToasts =
      notificationPreferences.aiTaskAlerts && notificationPreferences.toastPreviews;

    const showGlobalTaskToast = (toast: GlobalTaskToast) => {
      if (!canShowTaskToasts) return;
      if (shownTaskToastKeysRef.current[toast.key]) return;
      shownTaskToastKeysRef.current[toast.key] = true;
      setGlobalTaskToast(toast);
    };

    const onTaskValidation = (payload: any) => {
      const action = String(payload?.action || '').toLowerCase();
      const audience = String(payload?.audience || '').toLowerCase();
      const taskTitle = String(payload?.taskTitle || 'Task').trim();
      const actorName = String(payload?.actorName || payload?.actorEmpId || '').trim();
      const actorLabel = String(payload?.actorLabel || 'Reviewer').trim();
      const route = String(payload?.route || '/spaces').trim() || '/spaces';
      const key = String(payload?.key || `${action}:${payload?.taskId || ''}:${payload?.eventAt || ''}:${audience}`).trim();
      const isCurrentEmployee = String(payload?.assigneeId || '').trim() === backendEmpId;

      if (!action || !key) return;

      const isEmployeeAudience = audience === 'assignee' || audience === 'employee';

      if (isEmployeeAudience && !isCurrentEmployee) return;

      let title = '';
      let message = '';
      let tone: GlobalTaskToast['tone'] = 'info';

      if (action === 'submitted') {
        if (isEmployeeAudience) {
          title = 'Task submitted';
          message = `Your task "${taskTitle}" was sent for validation.`;
          tone = 'info';
        } else {
          title = 'Task submitted for validation';
          message = `${actorName || 'An employee'} submitted "${taskTitle}" for review.`;
          tone = 'info';
        }
      } else if (action === 'approved') {
        if (isEmployeeAudience) {
          title = 'Task approved';
          message = `Your task "${taskTitle}" was approved by ${actorLabel}.`;
          tone = 'success';
        } else {
          title = 'Task approved';
          message = `"${taskTitle}" was approved by ${actorName || actorLabel}.`;
          tone = 'success';
        }
      } else if (action === 'rejected') {
        if (isEmployeeAudience) {
          title = 'Task sent back';
          message = `Your task "${taskTitle}" was returned by ${actorLabel}. Open TaskHub to review the feedback.`;
          tone = 'warning';
        } else {
          title = 'Task sent back';
          message = `"${taskTitle}" was returned by ${actorName || actorLabel}.`;
          tone = 'warning';
        }
      } else {
        return;
      }

      showGlobalTaskToast({
        key,
        title,
        message,
        tone,
        route,
      });
    };

    socket.on('task:validation', onTaskValidation);

    return () => {
      socket.off('task:validation', onTaskValidation);
    };
  }, [isAuthenticated, notificationPreferences.aiTaskAlerts, notificationPreferences.toastPreviews]);

  useEffect(() => {
    if (!isAuthenticated) {
      lastCommunicationUnreadRef.current = null;
      return;
    }
    if (lastCommunicationUnreadRef.current === null) {
      lastCommunicationUnreadRef.current = communicationUnreadCount;
      return;
    }
    lastCommunicationUnreadRef.current = communicationUnreadCount;
  }, [communicationUnreadCount, isAuthenticated]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    if (!notificationId) return null;

    let previousNotification: AppShellNotification | null = null;

    setNotifications((prev) =>
      prev.map((notification) => {
        if (notification._id !== notificationId) return notification;
        previousNotification = notification;
        return {
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date().toISOString(),
        };
      }),
    );

    try {
      const res = await fetch(`${API_BASE}/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to mark notification as read');
      }

      const updated = await res.json();
      setNotifications((prev) => {
        if (shouldAutoClearNotification(updated)) {
          return prev.filter((notification) => notification._id !== notificationId);
        }

        return prev.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                ...updated,
                isRead: true,
              }
            : notification,
        );
      });
      return updated as AppShellNotification;
    } catch (err) {
      if (previousNotification) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === notificationId ? previousNotification as AppShellNotification : notification,
          ),
        );
      }
      console.warn('Failed to mark notification as read', err);
      return null;
    }
  }, []);

  const openNotification = useCallback(async (notification: AppShellNotification) => {
    if (!notification) return;

    if (!notification.isRead) {
      await markNotificationRead(notification._id);
    }

    setNotificationMenuOpen(false);
    if (globalReminderToast?.notificationId === notification._id) {
      setGlobalReminderToast(null);
    }

    const nextRoute = notification.route?.startsWith('/') ? notification.route : `/${notification.route || 'review'}`;
    window.location.hash = `#${nextRoute}`;
  }, [globalReminderToast, markNotificationRead]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    let active = true;
    const session = getStoredAuthSession();
    const backendEmpId = String(session?.employee?.empId || '').trim();
    const socket = getSocket();

    async function loadNotifications() {
      try {
        setNotificationsLoading(true);
        const res = await fetch(`${API_BASE}/notifications`, {
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to fetch notifications');
        }

        const data = await res.json();
        if (active) {
          setNotifications(
            (Array.isArray(data) ? data : []).filter(
              (notification: AppShellNotification) =>
                !(shouldAutoClearNotification(notification) && notification.isRead),
            ),
          );
        }
      } catch (err) {
        console.warn('Failed to load notifications', err);
      } finally {
        if (active) {
          setNotificationsLoading(false);
        }
      }
    }

    const onNotificationCreated = (payload: any) => {
      if (!payload || String(payload.empId || '').trim() !== backendEmpId) return;
      if (!isNotificationEnabledForType(notificationPreferences, payload?.type)) return;

      if (isLeaveNotification(payload)) {
        const leaveStatus = String(payload?.metadata?.status || '').trim().toUpperCase();
        const toastKey = `leave-notification:${String(payload?._id || '')}:${String(payload?.updatedAt || payload?.createdAt || '')}`;

        if (!shownLeaveToastKeysRef.current[toastKey]) {
          shownLeaveToastKeysRef.current[toastKey] = true;
          setGlobalLeaveToast({
            key: toastKey,
            title: String(payload?.title || 'Leave update'),
            message: String(payload?.message || 'A leave update is available.'),
            tone:
              leaveStatus === 'APPROVED'
                ? 'success'
                : leaveStatus === 'REJECTED'
                  ? 'warning'
                  : 'info',
          });
        }
      }

      setNotifications((prev) => {
        const next = [payload as AppShellNotification, ...prev.filter((item) => item._id !== payload._id)];
        return next.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
        );
      });
    };

    const onNotificationRead = (payload: any) => {
      const notificationId = String(payload?.notificationId || '').trim();
      if (!notificationId) return;

      setNotifications((prev) => {
        const matched = prev.find((notification) => notification._id === notificationId);
        if (matched && shouldAutoClearNotification(matched)) {
          return prev.filter((notification) => notification._id !== notificationId);
        }

        return prev.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                isRead: true,
                readAt: payload?.readAt || notification.readAt || new Date().toISOString(),
              }
            : notification,
        );
      });
    };

    const onNotificationDeleted = (payload: any) => {
      const notificationId = String(payload?.notificationId || '').trim();
      if (!notificationId) return;

      setNotifications((prev) => prev.filter((notification) => notification._id !== notificationId));
      setClearedNotificationIds((prev) => {
        if (!prev[notificationId]) return prev;
        const next = { ...prev };
        delete next[notificationId];
        return next;
      });
    };

    loadNotifications();
    socket.on('notification:created', onNotificationCreated);
    socket.on('notification:read', onNotificationRead);
    socket.on('notification:deleted', onNotificationDeleted);

    return () => {
      active = false;
      socket.off('notification:created', onNotificationCreated);
      socket.off('notification:read', onNotificationRead);
      socket.off('notification:deleted', onNotificationDeleted);
    };
  }, [isAuthenticated, notificationPreferences]);

  const visibleNotifications = useMemo(
    () =>
      filterNotificationsByPreferences(notifications, notificationPreferences).filter(
        (notification) => !clearedNotificationIds[notification._id],
      ),
    [clearedNotificationIds, notificationPreferences, notifications],
  );

  useEffect(() => {
    const unreadLeaveNotification = visibleNotifications.find(
      (notification) => isLeaveNotification(notification) && !notification.isRead,
    );
    if (!unreadLeaveNotification) return;

    const leaveStatus = String(unreadLeaveNotification?.metadata?.status || '').trim().toUpperCase();
    const toastKey = `leave-notification:${unreadLeaveNotification._id}:${String(
      unreadLeaveNotification.updatedAt || unreadLeaveNotification.createdAt || '',
    )}`;

    if (shownLeaveToastKeysRef.current[toastKey]) return;

    shownLeaveToastKeysRef.current[toastKey] = true;
    setGlobalLeaveToast({
      key: toastKey,
      title: String(unreadLeaveNotification.title || 'Leave update'),
      message: String(unreadLeaveNotification.message || 'A leave update is available.'),
      tone:
        leaveStatus === 'APPROVED'
          ? 'success'
          : leaveStatus === 'REJECTED'
            ? 'warning'
            : 'info',
    });
  }, [visibleNotifications]);

  const clearNotificationsFromPopup = useCallback(() => {
    if (!visibleNotifications.length) return;
    setClearedNotificationIds((prev) => {
      const next = { ...prev };
      visibleNotifications.forEach((notification) => {
        next[notification._id] = true;
      });
      return next;
    });
  }, [visibleNotifications]);

  useEffect(() => {
    if (!notificationPreferences.toastPreviews) return;

    const unreadNotification = visibleNotifications.find((notification) => {
      if (notification.isRead) return false;
      if (isLeaveNotification(notification)) return false;
      if (isDailyReviewReminderNotification(notification)) {
        if (isDailyReviewReminderToastDismissed(notification)) return false;
      }
      return canShowDailyReviewReminderToast(notification, dailyReviewReminderSettings);
    });
    if (!unreadNotification) return;

    const toastKey = `notification:${unreadNotification._id}:${unreadNotification.updatedAt || unreadNotification.createdAt}`;
    if (shownReminderToastKeysRef.current[toastKey]) return;

    const reminderToast: GlobalReminderToast = {
      key: toastKey,
      notificationId: unreadNotification._id,
      title: unreadNotification.title || 'Notification',
      message: unreadNotification.message || 'You have a new notification.',
      route: unreadNotification.route || '/review',
      autoHideMs: isDailyReviewReminderNotification(unreadNotification) ? 2000 : undefined,
    };
    shownReminderToastKeysRef.current[toastKey] = true;
    setGlobalReminderToast(reminderToast);
  }, [dailyReviewReminderSettings, notificationPreferences.toastPreviews, visibleNotifications]);

  useEffect(() => {
    if (!globalReminderToast?.notificationId) return;
    const matchedNotification = notifications.find((notification) => notification._id === globalReminderToast.notificationId);
    if (isLeaveNotification(matchedNotification)) {
      setGlobalReminderToast(null);
    }
  }, [globalReminderToast?.notificationId, notifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      lastCommunicationUnreadRef.current = null;
      return;
    }
    if (lastCommunicationUnreadRef.current === null) {
      lastCommunicationUnreadRef.current = communicationUnreadCount;
      return;
    }

    const canShowCommunicationToasts =
      notificationPreferences.communicationMessages && notificationPreferences.toastPreviews;

    if (canShowCommunicationToasts && communicationUnreadCount > lastCommunicationUnreadRef.current) {
      const toastKey = `communication:${communicationUnreadCount}:${Date.now()}`;
      if (!shownReminderToastKeysRef.current[toastKey]) {
        const communicationToast: GlobalReminderToast = {
          key: toastKey,
          notificationId: '',
          title: 'New communication message',
          message: 'You received a new message in Communication.',
          route: '/communication',
        };
        shownReminderToastKeysRef.current[toastKey] = true;
        setGlobalReminderToast(communicationToast);
      }
    }
    lastCommunicationUnreadRef.current = communicationUnreadCount;
  }, [
    communicationUnreadCount,
    isAuthenticated,
    notificationPreferences.communicationMessages,
    notificationPreferences.toastPreviews,
  ]);

  useEffect(() => {
    if (!notificationPreferences.toastPreviews) {
      setGlobalTaskToast(null);
      setGlobalReminderToast(null);
      return;
    }

    if (!notificationPreferences.aiTaskAlerts) {
      setGlobalTaskToast(null);
    }
    if (!notificationPreferences.communicationMessages && globalReminderToast?.route === '/communication') {
      setGlobalReminderToast(null);
    }
  }, [
    globalReminderToast?.route,
    notificationPreferences.aiTaskAlerts,
    notificationPreferences.communicationMessages,
    notificationPreferences.toastPreviews,
  ]);

  const planningViewsLoading = !appStateHydrated || !goalsHydrated;
  const unreadNotificationCount = visibleNotifications.filter((notification) => !notification.isRead).length;
  const notificationToastTopClass = globalLeaveToast && globalTaskToast
    ? 'top-[14.5rem]'
    : globalLeaveToast || globalTaskToast
      ? 'top-32'
      : 'top-6';

  const globalToastsElement = (
      <GlobalAppToasts
        globalLeaveToast={globalLeaveToast}
        globalTaskToast={globalTaskToast}
        globalReminderToast={globalReminderToast}
        notifications={visibleNotifications}
        notificationToastTopClass={notificationToastTopClass}
        openNotification={openNotification}
        setGlobalLeaveToast={setGlobalLeaveToast}
        setGlobalTaskToast={setGlobalTaskToast}
        setGlobalReminderToast={setGlobalReminderToast}
        dismissGlobalReminderToast={dismissGlobalReminderToast}
      />
  );

  const updateState = useCallback((updater: (prev: PlanningState) => PlanningState) => {
    setState(prev => {
      const next = normalizeGoalHierarchy(updater(prev));
      const tIdx = next.team.findIndex(m => m.id === next.currentUser.id);
      if (tIdx !== -1) next.team[tIdx] = { ...next.currentUser };
      return next;
    });
  }, []);

  const hasPower = (power: string) => hasPermission(power);
  const isSuperAdmin = state.currentUser.email === SUPER_ADMIN_EMAIL;
  const isAdmin = state.currentUser.role === 'Admin';

  if (isAuthenticated === null) {
    return null;
  }

  if (isInviteAcceptPath(publicHashPath)) {
    return <InviteAcceptView onAcceptSuccess={handleLoginSuccess} />;
  }

  if (!isAuthenticated) {
    if (publicHashPath === 'signup' || publicHashPath === 'workspaces/signup') {
      return <WorkspaceSignupView onSignupSuccess={handleLoginSuccess} />;
    }
    if (publicHashPath === 'password/forgot' || publicHashPath === 'password/reset') {
      if (publicHashPath === 'password/reset') {
        return <ResetPasswordView onResetSuccess={handleLoginSuccess} />;
      }
      return <ForgotPasswordView />;
    }
    if (publicHashPath.startsWith('client-portal/')) {
      return <ClientPortalView />;
    }
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  if (permissionsLoading && state.currentUser?.id) {
    return null;
  }

  if (state.currentUser.role === 'Employee') {
    return (
      <ThemeProvider>
        <I18nProvider>
      <HashRouter>
        <OnboardingTour role={state.currentUser.role} />
        <CommunicationProvider>
          <AppEmployeePortalLayout
            globalToastsElement={globalToastsElement}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            hasPower={hasPower}
            state={state}
            updateState={updateState}
            planningViewsLoading={planningViewsLoading}
            taskCount={taskCount}
            communicationUnreadCount={communicationUnreadCount}
            notificationMenuOpen={notificationMenuOpen}
            setNotificationMenuOpen={setNotificationMenuOpen}
            userMenuOpen={userMenuOpen}
            setUserMenuOpen={setUserMenuOpen}
            unreadNotificationCount={unreadNotificationCount}
            notificationsLoading={notificationsLoading}
            notifications={visibleNotifications}
            openNotification={openNotification}
            markNotificationRead={markNotificationRead}
            clearNotificationsFromPopup={clearNotificationsFromPopup}
            handleLogout={handleLogout}
          />
        </CommunicationProvider>
      </HashRouter>
        </I18nProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <I18nProvider>
    <HashRouter>
      <OnboardingTour role={state.currentUser.role} />
      <CommunicationProvider>
        <AppManagerPortalLayout
          globalToastsElement={globalToastsElement}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          hasPower={hasPower}
          state={state}
          updateState={updateState}
          planningViewsLoading={planningViewsLoading}
          taskCount={taskCount}
          communicationUnreadCount={communicationUnreadCount}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          notificationMenuOpen={notificationMenuOpen}
          setNotificationMenuOpen={setNotificationMenuOpen}
          userMenuOpen={userMenuOpen}
          setUserMenuOpen={setUserMenuOpen}
          unreadNotificationCount={unreadNotificationCount}
          notificationsLoading={notificationsLoading}
          notifications={visibleNotifications}
          openNotification={openNotification}
          markNotificationRead={markNotificationRead}
          clearNotificationsFromPopup={clearNotificationsFromPopup}
          handleLogout={handleLogout}
        />
      </CommunicationProvider>
    </HashRouter>
      </I18nProvider>
    </ThemeProvider>
  );
};

export default App;
