import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
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
}


function shouldAutoClearNotification(notification?: Partial<AppShellNotification> | null): boolean {
  return String(notification?.type || '').trim().toLowerCase() === 'leave_request_review';
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
  const [appStateHydrated, setAppStateHydrated] = useState(false);
  const [goalsHydrated, setGoalsHydrated] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [isVisionsOpen, setIsVisionsOpen] = useState(true);
  const [communicationUnreadCount, setCommunicationUnreadCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [notifications, setNotifications] = useState<AppShellNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [globalLeaveToast, setGlobalLeaveToast] = useState<GlobalLeaveToast | null>(null);
  const [globalTaskToast, setGlobalTaskToast] = useState<GlobalTaskToast | null>(null);
  const [globalReminderToast, setGlobalReminderToast] = useState<GlobalReminderToast | null>(null);
  const shownLeaveToastKeysRef = useRef<Record<string, true>>({});
  const shownTaskToastKeysRef = useRef<Record<string, true>>({});
  const shownReminderToastKeysRef = useRef<Record<string, true>>({});
  const lastCommunicationUnreadRef = useRef<number | null>(null);

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
              avatar:
                employee.avatar && typeof employee.avatar === 'string' && employee.avatar.trim()
                  ? employee.avatar
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${(employee.empName || 'Admin').replace(/\s/g, '')}`,
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
              avatar:
                employee.avatar && typeof employee.avatar === 'string' && employee.avatar.trim()
                  ? employee.avatar
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${(employee.empName || 'Admin').replace(/\s/g, '')}`,
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
            yearlyGoals: goals.filter((g: any) => g.level === 'year').map((g: any) => ({ id: g.goalId, text: g.text || '', completed: !!g.completed, level: 'year' as const })),
            quarterlyGoals: goals
              .filter((g: any) => g.level === 'quarter')
              .map((g: any) => ({ id: g.goalId, text: g.text || '', completed: !!g.completed, level: 'quarter' as const, parentId: g.parentId || '', timeline: g.timeline || '' })),
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
    const timer = window.setTimeout(() => setGlobalReminderToast(null), 8000);
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

    const showGlobalLeaveToast = (toast: GlobalLeaveToast) => {
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

    const showGlobalTaskToast = (toast: GlobalTaskToast) => {
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
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      lastCommunicationUnreadRef.current = null;
      return;
    }
    if (lastCommunicationUnreadRef.current === null) {
      lastCommunicationUnreadRef.current = communicationUnreadCount;
      return;
    }
    if (communicationUnreadCount > lastCommunicationUnreadRef.current) {
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

    loadNotifications();
    const notificationsPoller = window.setInterval(() => {
      loadNotifications();
    }, 30000);
    socket.on('notification:created', onNotificationCreated);
    socket.on('notification:read', onNotificationRead);

    return () => {
      active = false;
      window.clearInterval(notificationsPoller);
      socket.off('notification:created', onNotificationCreated);
      socket.off('notification:read', onNotificationRead);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const unreadNotification = notifications.find((notification) => !notification.isRead);
    if (!unreadNotification) return;

    const toastKey = `notification:${unreadNotification._id}:${unreadNotification.updatedAt || unreadNotification.createdAt}`;
    if (shownReminderToastKeysRef.current[toastKey]) return;

    const reminderToast: GlobalReminderToast = {
      key: toastKey,
      notificationId: unreadNotification._id,
      title: unreadNotification.title || 'Notification',
      message: unreadNotification.message || 'You have a new notification.',
      route: unreadNotification.route || '/review',
    };
    shownReminderToastKeysRef.current[toastKey] = true;
    setGlobalReminderToast(reminderToast);
  }, [notifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      lastCommunicationUnreadRef.current = null;
      return;
    }
    if (lastCommunicationUnreadRef.current === null) {
      lastCommunicationUnreadRef.current = communicationUnreadCount;
      return;
    }

    if (communicationUnreadCount > lastCommunicationUnreadRef.current) {
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
  }, [communicationUnreadCount, isAuthenticated]);

  const planningViewsLoading = !appStateHydrated || !goalsHydrated;
  const unreadNotificationCount = notifications.filter((notification) => !notification.isRead).length;
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
      notifications={notifications}
      notificationToastTopClass={notificationToastTopClass}
      openNotification={openNotification}
      setGlobalTaskToast={setGlobalTaskToast}
      setGlobalReminderToast={setGlobalReminderToast}
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

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  if (permissionsLoading && state.currentUser?.id) {
    return null;
  }

  if (state.currentUser.role === 'Employee') {
    return (
      <HashRouter>
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
            notifications={notifications}
            openNotification={openNotification}
            markNotificationRead={markNotificationRead}
            handleLogout={handleLogout}
          />
        </CommunicationProvider>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
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
          notifications={notifications}
          openNotification={openNotification}
          markNotificationRead={markNotificationRead}
          handleLogout={handleLogout}
        />
      </CommunicationProvider>
    </HashRouter>
  );
};

export default App;
