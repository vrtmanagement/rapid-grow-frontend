import { useState, useEffect, useCallback, useRef } from 'react';
import { getPublicPath, navigateApp } from '../../utils/appNavigation';
import { PlanningState } from '../../types';
import { normalizeGoalHierarchy } from '../../appNormalizeGoalHierarchy';
import {
  SUPER_ADMIN_EMAIL,
  DEFAULT_POWERS,
  createDefaultPlanningStateInput,
} from '../../appSeedConstants';
import { mapBackendRoleToUiRole } from '../../config/permissions';
import { usePermissions } from '../../context/usePermissions';
import type { AppShellNotification } from '../layout/authenticatedShellTypes';
import {
  AUTH_EXPIRED_EVENT,
  clearStoredSession,
  getStoredAuthSession,
  startSessionRefreshScheduler,
} from '../../config/api';
import { getDisplayAvatarUrl, persistSessionEmployeeAvatar, PROFILE_AVATAR_UPDATED_EVENT } from '../../utils/avatar';
import { fetchAppBootstrap } from '../../services/bootstrapApi';
import { fetchAllGoalLevels, mapGoalsToPlanningState } from '../../services/goalApi';
import { hasTabEndpointCache } from '../../services/tabSessionCache';
import { apiListConversations, apiListUsers } from '../../communication/api';
import { getUnreadDirectMessageSourceCount } from '../../communication/unread';
import { mapListConversationsApiRowToSummary } from '../../communication/context/communicationContextHelpers';
import { getSocket } from '../../realtime/socket';
import {
  GOAL_ROUTE_PATTERN,
  VISION_PERMISSION_KEYS,
  clearPlanningGoals,
  getStoredEmployeeIdentifiers,
  shouldAutoClearNotification,
} from './appShellHelpers';

export function useAppSessionState() {
  const { permissions, hasPermission, loading: permissionsLoading, role: permissionRole } = usePermissions();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [publicPath, setPublicPath] = useState(getPublicPath);
  const [appStateHydrated, setAppStateHydrated] = useState(false);
  const [goalsHydrated, setGoalsHydrated] = useState(true);
  const [taskCount, setTaskCount] = useState(0);
  const [notifications, setNotifications] = useState<AppShellNotification[]>([]);
  const [communicationUnreadCount, setCommunicationUnreadCount] = useState(0);

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
    const stopSessionRefresh = startSessionRefreshScheduler();

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
      stopSessionRefresh();
    };
  }, []);

  useEffect(() => {
    const syncPublicPath = () => setPublicPath(getPublicPath());
    window.addEventListener('popstate', syncPublicPath);
    return () => window.removeEventListener('popstate', syncPublicPath);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    window.location.assign('/');
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredSession();
    setIsAuthenticated(false);
    navigateApp('/');
  }, []);

  const [state, setState] = useState<PlanningState>(normalizeGoalHierarchy(createDefaultPlanningStateInput()));

  useEffect(() => {
    if (!isAuthenticated) {
      setGoalsHydrated(true);
      return;
    }

    let active = true;

    const applyBootstrap = async () => {
      try {
        const bootstrap = await fetchAppBootstrap();
        if (!active) return;

        const session = getStoredAuthSession();
        const sessionEmployee = session?.employee || {};
        const employee = bootstrap.employee as Record<string, unknown> | null;
        if (employee) {
          const currentUserId = String(
            sessionEmployee._id || sessionEmployee.empId || employee._id || employee.empId || '',
          );
          const currentUserName = String(sessionEmployee.empName || employee.empName || 'User');
          const currentUserEmail = String(sessionEmployee.email || employee.email || '');
          const nextUser = {
            id: String(employee._id || employee.empId || currentUserId),
            name: String(employee.empName || currentUserName),
            role: mapBackendRoleToUiRole(String(employee.role || '')),
            email: String(employee.email || currentUserEmail),
            avatar: getDisplayAvatarUrl(String(employee.avatar || ''), String(employee.empName || currentUserName)),
            status: 'Active',
            isVerified: true,
          };

          persistSessionEmployeeAvatar(String(employee.avatar || ''), employee);
          setState((prev) => ({
            ...prev,
            currentUser: {
              ...prev.currentUser,
              ...nextUser,
              powers: prev.currentUser.powers,
            },
            team: prev.team.map((member) =>
              String(member.id) === String(prev.currentUser.id) ||
              String(member.id) === String(employee.empId || '')
                ? { ...member, ...nextUser, powers: member.powers }
                : member,
            ),
          }));
        }

        const unreadCount = bootstrap.taskUnreadCount?.unreadCount;
        if (typeof unreadCount === 'number') {
          setTaskCount(unreadCount);
        }

        setNotifications(
          (Array.isArray(bootstrap.notifications) ? bootstrap.notifications : []).filter(
            (notification: AppShellNotification) =>
              !(shouldAutoClearNotification(notification) && notification.isRead),
          ),
        );

        window.dispatchEvent(
          new CustomEvent('rapidgrow:app-bootstrap', {
            detail: bootstrap,
          }),
        );
      } catch (err) {
        console.warn('Failed to load app bootstrap', err);
        if (active) {
          setState(clearPlanningGoals);
        }
      }
    };

    void applyBootstrap();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || permissionsLoading) return;

    const routeSegment = String(publicPath || '').split('/')[0] || '';
    const needsGoals = GOAL_ROUTE_PATTERN.test(`${routeSegment}/`);
    if (!needsGoals) return;

    const canLoadGoals = VISION_PERMISSION_KEYS.some((key) => hasPermission(key));
    if (!canLoadGoals) return;

    const allGoalsCached = ['year', 'quarter', 'month', 'week', 'day'].every((level) =>
      hasTabEndpointCache('planning', `/goals?level=${level}`),
    );

    let active = true;
    if (!allGoalsCached) {
      setGoalsHydrated(false);
    }

    const loadGoals = async () => {
      try {
        const goals = await fetchAllGoalLevels();
        if (!active) return;
        setState((prev) => mapGoalsToPlanningState(goals, prev));
      } catch (err) {
        console.warn('Failed to load planning goals', err);
        if (active) {
          setState(clearPlanningGoals);
        }
      } finally {
        if (active) {
          setGoalsHydrated(true);
        }
      }
    };

    void loadGoals();
    return () => {
      active = false;
    };
  }, [isAuthenticated, permissionsLoading, publicPath, hasPermission]);

  useEffect(() => {
    const saved = localStorage.getItem('rapidgrow-os-v1');
    const adminStored = localStorage.getItem('rapidgrow-admin');
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.uiConfig?.reflectionTitle === 'Review Matrix') {
          parsed.uiConfig.reflectionTitle = 'Daily Reflection';
        }
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
        const userId = String(state.currentUser?.id || '');
        const [data, usersData] = await Promise.all([
          apiListConversations(),
          apiListUsers().catch(() => ({ users: [] as { id?: string }[] })),
        ]);
        if (active) {
          const mappedConversations = (data.conversations || []).map(mapListConversationsApiRowToSummary);
          const visibleUserIds = new Set(
            (usersData.users || [])
              .map((user) => String(user?.id || '').trim())
              .filter(Boolean),
          );
          setCommunicationUnreadCount(
            getUnreadDirectMessageSourceCount(mappedConversations, {
              currentUserId: userId,
              visibleUserIds,
            }),
          );
        }
      } catch (err) {
        console.warn('Failed to load communication unread count', err);
      }
    }

    syncCommunicationUnreadCount();

    const handleCommunicationSync = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadSourceCount?: number }>).detail;
      if (!detail) return;
      if (typeof detail.unreadSourceCount === 'number') {
        setCommunicationUnreadCount(detail.unreadSourceCount);
      }
    };

    window.addEventListener('rapidgrow:communication-unread-sync', handleCommunicationSync as EventListener);

    return () => {
      active = false;
      window.removeEventListener('rapidgrow:communication-unread-sync', handleCommunicationSync as EventListener);
    };
  }, [isAuthenticated, state.currentUser?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const { empId } = getStoredEmployeeIdentifiers();
    if (!empId) return;

    const socket = getSocket();
    const handleTaskCount = (payload: any) => {
      if (!payload || String(payload.userId) !== empId) return;
      setTaskCount(typeof payload.unreadCount === 'number' ? payload.unreadCount : 0);
    };

    socket.on('taskCount', handleTaskCount);

    return () => {
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

  const updateState = useCallback((updater: (prev: PlanningState) => PlanningState) => {
    setState(prev => {
      const next = normalizeGoalHierarchy(updater(prev));
      const tIdx = next.team.findIndex(m => m.id === next.currentUser.id);
      if (tIdx !== -1) next.team[tIdx] = { ...next.currentUser };
      return next;
    });
  }, []);

  const hasPower = useCallback(
    (power: string) => {
      if (hasPermission(power)) return true;
      const backendRole =
        permissionRole || String(getStoredAuthSession()?.employee?.role || '').trim();
      if (!backendRole) return false;
      return (DEFAULT_POWERS[backendRole] || []).includes(power);
    },
    [hasPermission, permissionRole]
  );
  const isSuperAdmin = state.currentUser.email === SUPER_ADMIN_EMAIL;
  const isAdmin = state.currentUser.role === 'Admin';

  const isPlanningRoute = GOAL_ROUTE_PATTERN.test(
    `${String(publicPath || '').split('/')[0] || ''}/`,
  );
  const planningViewsLoading = !appStateHydrated || (isPlanningRoute && !goalsHydrated);

  return {
    permissions,
    permissionsLoading,
    isAuthenticated,
    publicPath,
    handleLoginSuccess,
    handleLogout,
    state,
    updateState,
    hasPower,
    isSuperAdmin,
    isAdmin,
    planningViewsLoading,
    taskCount,
    notifications,
    setNotifications,
    communicationUnreadCount,
  };
}
