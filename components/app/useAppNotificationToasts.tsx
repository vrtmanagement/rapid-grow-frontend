import { useState, useEffect, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import { navigateApp } from '../../utils/appNavigation';
import { getSocket } from '../../realtime/socket';
import GlobalAppToasts from '../layout/GlobalAppToasts';
import type { AppShellNotification } from '../layout/authenticatedShellTypes';
import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../../config/api';
import {
  DAILY_REVIEW_REMINDER_SETTINGS_UPDATED_EVENT,
  fetchDailyReviewReminderSettings,
  getDefaultDailyReviewReminderSettings,
  normalizeDailyReviewReminderSettings,
  type DailyReviewReminderSettings,
} from '../../services/dailyReviewReminderSettings';
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
} from '../../services/notificationPreferences';
import {
  CLEARED_APP_NOTIFICATIONS_STORAGE_KEY_PREFIX,
  canShowDailyReviewReminderToast,
  isDailyReviewReminderNotification,
  isDailyReviewReminderToastDismissed,
  isLeaveNotification,
  markDailyReviewReminderToastDismissed,
  readClearedAppNotificationState,
  shouldAutoClearNotification,
} from './appShellHelpers';

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

export function useAppNotificationToasts(
  isAuthenticated: boolean | null,
  notifications: AppShellNotification[],
  setNotifications: Dispatch<SetStateAction<AppShellNotification[]>>,
  communicationUnreadCount: number,
) {
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [clearedNotificationIds, setClearedNotificationIds] = useState<Record<string, boolean>>({});
  const clearedNotificationsHydratedRef = useRef(false);
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
    clearedNotificationsHydratedRef.current = false;
    setClearedNotificationIds(readClearedAppNotificationState(notificationClearStorageKey));
  }, [notificationClearStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Skip the first write after hydrate so we never persist an empty {} over saved clears.
    if (!clearedNotificationsHydratedRef.current) {
      clearedNotificationsHydratedRef.current = true;
      return;
    }
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
  }, [setNotifications]);

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
    navigateApp(nextRoute);
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

    socket.on('notification:created', onNotificationCreated);
    socket.on('notification:read', onNotificationRead);
    socket.on('notification:deleted', onNotificationDeleted);

    return () => {
      socket.off('notification:created', onNotificationCreated);
      socket.off('notification:read', onNotificationRead);
      socket.off('notification:deleted', onNotificationDeleted);
    };
  }, [isAuthenticated, notificationPreferences, setNotifications]);

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
    const idsToClear = visibleNotifications.map((notification) => String(notification._id || '')).filter(Boolean);
    if (!idsToClear.length) return;

    setClearedNotificationIds((prev) => {
      const next = { ...prev };
      idsToClear.forEach((id) => {
        next[id] = true;
      });
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(notificationClearStorageKey, JSON.stringify(next));
        }
      } catch {
        // Keep in-memory clear even if storage write fails.
      }
      return next;
    });

    // Mark as read on the server so the same items stay dismissed after refresh.
    void Promise.all(
      idsToClear.map(async (notificationId) => {
        try {
          await markNotificationRead(notificationId);
        } catch {
          // Cleared locally even if a single read mark fails.
        }
      }),
    );
  }, [markNotificationRead, notificationClearStorageKey, visibleNotifications]);

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

  return {
    notificationMenuOpen,
    setNotificationMenuOpen,
    notificationsLoading,
    unreadNotificationCount,
    notifications: visibleNotifications,
    openNotification,
    markNotificationRead,
    clearNotificationsFromPopup,
    globalToastsElement,
  };
}
