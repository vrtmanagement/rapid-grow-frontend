import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE, getAuthHeaders } from '../config/api';
import AttendanceHeader from '../components/attendance/AttendanceHeader';
import LeaveManagementPanel from '../components/attendance/LeaveManagementPanel';
import AttendanceHistoryPage from '../components/attendance/AttendanceHistoryPage';
import TeamAttendanceSection from '../components/attendance/TeamAttendanceSection';
import {
  AttendanceEmployeeOption,
  TeamAttendanceSummary,
  LeaveActorProfile,
  readStoredLeaveNotificationState,
  getDefaultMonthValue,
  getLocalDateKey,
  parseAttendanceBackendContext,
  getBrowserGeolocationDescription,
} from '../components/attendance/attendanceViewUtils';
import AttendanceOverviewGrid from '../components/attendance/AttendanceOverviewGrid';
import { getSocket } from '../realtime/socket';
import { usePermissions } from '../context/usePermissions';
import {
  AttendanceSession,
  AttendanceSummaryResponse,
  LeaveNotificationItem,
  LeaveRequest,
  Range,
  getHoursColor,
  countLeaveDaysInRange,
  getSessionWorkingMinutes,
} from '../components/attendance/attendanceUtils';

interface Props {
  mode?: 'manager' | 'employee';
}

const AttendanceView: React.FC<Props> = ({ mode = 'manager' }) => {
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'attendance' | 'leave'>(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('view') === 'leave' ? 'leave' : 'attendance';
  });
  const [range, setRange] = useState<Range>(() => {
    const params = new URLSearchParams(location.search || '');
    const routeRange = params.get('range');
    return routeRange === 'day' || routeRange === 'week' || routeRange === 'month'
      ? routeRange
      : mode === 'employee'
        ? 'month'
        : 'day';
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('month') || '';
  });
  const [summary, setSummary] = useState<AttendanceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveType, setLeaveType] = useState('GENERAL');
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [approverLeaves, setApproverLeaves] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveInitialLoaded, setLeaveInitialLoaded] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [halfDayRequestLoading, setHalfDayRequestLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [employeeOptions, setEmployeeOptions] = useState<AttendanceEmployeeOption[]>([]);
  const [employeeSummary, setEmployeeSummary] = useState<AttendanceSummaryResponse | null>(null);
  const [selectedEmployeeEmpId, setSelectedEmployeeEmpId] = useState('');
  const [selectedEmployeeMonth, setSelectedEmployeeMonth] = useState('');
  const [employeeAttendanceLoading, setEmployeeAttendanceLoading] = useState(false);
  const [teamAttendanceSummary, setTeamAttendanceSummary] = useState<TeamAttendanceSummary | null>(null);
  const [teamAttendanceSummaryLoading, setTeamAttendanceSummaryLoading] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const employeePickerRef = useRef<HTMLDivElement | null>(null);
  const monthPickerRef = useRef<HTMLDivElement | null>(null);
  const leaveInitialLoadedRef = useRef(false);

  const isEmployeePortal = mode === 'employee';
  const isHistoryRoute = location.pathname === '/attendance/history';

  const { backendEmpId, isBackendAdminRole, isBackendApproverRole, leaveViewerRole } = useMemo(
    () => parseAttendanceBackendContext(),
    [],
  );
  const leaveNotificationStorageKey = `rapidgrow-leave-notifications:${leaveViewerRole}:${backendEmpId || 'anonymous'}:${mode}`;
  const clearedLeaveNotificationStorageKey = `rapidgrow-leave-notifications-cleared:${leaveViewerRole}:${backendEmpId || 'anonymous'}:${mode}`;
  const [readLeaveNotificationIds, setReadLeaveNotificationIds] = useState<Record<string, boolean>>(() =>
    readStoredLeaveNotificationState(leaveNotificationStorageKey),
  );
  const [clearedLeaveNotificationIds, setClearedLeaveNotificationIds] = useState<Record<string, boolean>>(() =>
    readStoredLeaveNotificationState(clearedLeaveNotificationStorageKey),
  );
  const canReviewTeamAttendance =
    isBackendAdminRole || hasPermission('EMPLOYEE_ATTENDANCE_VIEW');

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    setActiveView(params.get('view') === 'leave' ? 'leave' : 'attendance');

    const routeRange = params.get('range');
    if (routeRange === 'day' || routeRange === 'week' || routeRange === 'month') {
      setRange(routeRange);
    }
    if (params.has('month')) {
      setSelectedMonth(params.get('month') || '');
    }
  }, [location.search]);

  const buildAttendanceRoute = useCallback((pathname: '/attendance' | '/attendance/history') => {
    const params = new URLSearchParams();
    if (pathname === '/attendance' && activeView === 'leave') {
      params.set('view', 'leave');
    }
    params.set('range', range);
    if (selectedMonth) {
      params.set('month', selectedMonth);
    }

    const search = params.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [activeView, range, selectedMonth]);

  const handleHistoryOpen = useCallback(() => {
    navigate(buildAttendanceRoute('/attendance/history'));
  }, [buildAttendanceRoute, navigate]);

  const handleHistoryClose = useCallback(() => {
    navigate(buildAttendanceRoute('/attendance'));
  }, [buildAttendanceRoute, navigate]);

  const handleActiveViewChange = useCallback((nextView: 'attendance' | 'leave') => {
    setActiveView(nextView);
    const params = new URLSearchParams();
    if (nextView === 'leave') {
      params.set('view', 'leave');
    }
    params.set('range', range);
    if (selectedMonth) {
      params.set('month', selectedMonth);
    }

    const search = params.toString();
    navigate(search ? `/attendance?${search}` : '/attendance');
  }, [navigate, range, selectedMonth]);

  useEffect(() => {
    if (!isHistoryRoute) return;

    const nextRoute = buildAttendanceRoute('/attendance/history');
    const currentRoute = `${location.pathname}${location.search || ''}`;
    if (currentRoute !== nextRoute) {
      navigate(nextRoute, { replace: true });
    }
  }, [buildAttendanceRoute, isHistoryRoute, location.pathname, location.search, navigate]);

  const employeeProfileByEmpId = useMemo(() => {
    const map = new Map<string, AttendanceEmployeeOption>();
    employeeOptions.forEach((employee) => {
      if (employee.empId) {
        map.set(employee.empId, employee);
      }
    });
    return map;
  }, [employeeOptions]);

  const getLeaveActorProfile = useCallback((source: {
    empId?: string;
    empName?: string;
    designation?: string;
    department?: string;
  }): LeaveActorProfile => {
    const empId = String(source.empId || '').trim();
    const directoryProfile = empId ? employeeProfileByEmpId.get(empId) : undefined;
    const empName =
      String(source.empName || directoryProfile?.empName || empId || 'An employee').trim();
    const designation = String(source.designation || directoryProfile?.designation || '').trim();
    const department = String(source.department || directoryProfile?.department || '').trim();

    return {
      empName,
      empId,
      designation,
      department,
    };
  }, [employeeProfileByEmpId]);

  const formatLeaveActorHeading = useCallback((profile: LeaveActorProfile) => {
    return profile.empId ? `${profile.empName} (${profile.empId})` : profile.empName;
  }, []);

  const formatLeaveActorMeta = useCallback((profile: LeaveActorProfile) => {
    return [profile.designation, profile.department].filter(Boolean).join(' | ');
  }, []);

  const attachEmployeeNames = useCallback(async (leaves: LeaveRequest[]): Promise<LeaveRequest[]> => {
    if (!leaves.length) return leaves;
    if (leaves.every((leave) => leave.empName && leave.empName.trim())) return leaves;

    try {
      const res = await fetch(`${API_BASE}/employees`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return leaves;

      const data = await res.json();
      const employees = Array.isArray(data) ? data : [];
      const nameByEmpId = new Map<string, string>();

      employees.forEach((employee: any) => {
        const empId = typeof employee?.empId === 'string' ? employee.empId.trim() : '';
        const empName = typeof employee?.empName === 'string' ? employee.empName.trim() : '';
        if (empId && empName) {
          nameByEmpId.set(empId, empName);
        }
      });

      return leaves.map((leave) => ({
        ...leave,
        empName: leave.empName || nameByEmpId.get(leave.empId) || leave.empId,
      }));
    } catch (error) {
      console.error('Failed to load employee names for leave approvals', error);
      return leaves;
    }
  }, []);

  useEffect(() => {
    leaveInitialLoadedRef.current = leaveInitialLoaded;
  }, [leaveInitialLoaded]);

  useEffect(() => {
    setReadLeaveNotificationIds(readStoredLeaveNotificationState(leaveNotificationStorageKey));
  }, [leaveNotificationStorageKey]);

  useEffect(() => {
    setClearedLeaveNotificationIds(readStoredLeaveNotificationState(clearedLeaveNotificationStorageKey));
  }, [clearedLeaveNotificationStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(
        leaveNotificationStorageKey,
        JSON.stringify(readLeaveNotificationIds),
      );
    } catch {
      // Ignore storage write failures and keep UI state working.
    }
  }, [leaveNotificationStorageKey, readLeaveNotificationIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(
        clearedLeaveNotificationStorageKey,
        JSON.stringify(clearedLeaveNotificationIds),
      );
    } catch {
      // Ignore storage write failures and keep UI state working.
    }
  }, [clearedLeaveNotificationIds, clearedLeaveNotificationStorageKey]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!employeePickerRef.current?.contains(target)) {
        setEmployeePickerOpen(false);
      }
      if (!monthPickerRef.current?.contains(target)) {
        setMonthPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEmployeePickerOpen(false);
        setMonthPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!canReviewTeamAttendance) return;

    let mounted = true;
    const loadEmployees = async () => {
      try {
        const res = await fetch(`${API_BASE}/attendance/members`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!mounted) return;

        const options = (Array.isArray(data) ? data : [])
          .filter((employee: any) => employee?.status === 'active')
          .filter((employee: any) => ['EMPLOYEE', 'TEAM_LEAD'].includes(String(employee?.role || '').toUpperCase()))
          .map((employee: any) => ({
            empId: String(employee.empId || '').trim(),
            empName: String(employee.empName || employee.empId || '').trim(),
            role: String(employee.role || '').trim(),
            designation: String(employee.designation || '').trim(),
            department: String(employee.department || '').trim(),
          }))
          .filter((employee: AttendanceEmployeeOption) => employee.empId);

        setEmployeeOptions(options);
        setSelectedEmployeeEmpId((prev) => {
          if (prev && options.some((employee: AttendanceEmployeeOption) => employee.empId === prev)) {
            return prev;
          }
          return options[0]?.empId || '';
        });
        setSelectedEmployeeMonth((prev) => prev || getDefaultMonthValue());
      } catch (error) {
        console.error('Failed to load employees for attendance view', error);
      }
    };

    loadEmployees();
    return () => {
      mounted = false;
    };
  }, [canReviewTeamAttendance]);

  const loadSummary = async (selectedRange: Range, monthValue?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('range', selectedRange);
      if (selectedRange === 'month' && monthValue) {
        params.set('date', `${monthValue}-01`);
      }
      const res = await fetch(`${API_BASE}/attendance/me?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSummary({
          ...data,
          start: data.start,
          end: data.end,
        });
        const allSessions = (data.days || []).flatMap((d: any) => d.sessions || []);
        const open = allSessions.find((s: AttendanceSession) => !s.logoutTime);
        setActiveSession(open || null);
      }
    } catch (e) {
      console.error('Failed to load attendance summary', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedEmployeeAttendance = async (empId: string, monthValue: string) => {
    setEmployeeAttendanceLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('range', 'month');
      params.set('date', `${monthValue}-01`);

      const res = await fetch(
        `${API_BASE}/attendance/employee/${encodeURIComponent(empId)}?${params.toString()}`,
        { headers: getAuthHeaders() },
      );

      if (!res.ok) {
        setEmployeeSummary(null);
        return;
      }

      const data = await res.json();
      setEmployeeSummary({
        range: 'month',
        start: data.start,
        end: data.end,
        totalMinutes: data.totalMinutes,
        days: Array.isArray(data.days) ? data.days : [],
      });
    } catch (error) {
      console.error('Failed to load selected employee attendance', error);
      setEmployeeSummary(null);
    } finally {
      setEmployeeAttendanceLoading(false);
    }
  };

  const loadTeamAttendanceSummary = async () => {
    setTeamAttendanceSummaryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/team-summary`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        setTeamAttendanceSummary(null);
        return;
      }

      const data = await res.json();
      setTeamAttendanceSummary({
        total: Number(data.total || 0),
        present: Number(data.present || 0),
        absent: Number(data.absent || 0),
      });
    } catch (error) {
      console.error('Failed to load team attendance summary', error);
      setTeamAttendanceSummary(null);
    } finally {
      setTeamAttendanceSummaryLoading(false);
    }
  };

  const loadLeaves = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const shouldShowSkeleton = !silent && !leaveInitialLoadedRef.current;

    if (shouldShowSkeleton) {
      setLeaveLoading(true);
    }

    try {
      const headers = getAuthHeaders();
      const myRes = await fetch(`${API_BASE}/leaves/me`, { headers });
      if (myRes.ok) {
        const data = await myRes.json();
        setMyLeaves(Array.isArray(data) ? data : []);
      }

      // Approver-only endpoints (avoid 403 spam in employee portal)
      if (isBackendApproverRole) {
        const pendingRes = await fetch(`${API_BASE}/leaves/pending`, { headers });
        if (pendingRes.ok) {
          const data = await pendingRes.json();
          const leaves = Array.isArray(data) ? data : [];
          setPendingLeaves(await attachEmployeeNames(leaves));
        }
        const approverRes = await fetch(`${API_BASE}/leaves/for-approver`, {
          headers,
        });
        if (approverRes.ok) {
          const data = await approverRes.json();
          const leaves = Array.isArray(data) ? data : [];
          setApproverLeaves(await attachEmployeeNames(leaves));
        }
      } else {
        setPendingLeaves([]);
        setApproverLeaves([]);
      }
    } catch (e) {
      console.error('Failed to load leaves', e);
    } finally {
      if (shouldShowSkeleton) {
        setLeaveLoading(false);
      }
      setLeaveInitialLoaded(true);
    }
  }, [attachEmployeeNames, isBackendApproverRole]);

  useEffect(() => {
    loadSummary(range, selectedMonth);
  }, [range, selectedMonth]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  useEffect(() => {
    if (!canReviewTeamAttendance || !selectedEmployeeEmpId || !selectedEmployeeMonth) {
      setEmployeeSummary(null);
      return;
    }

    let mounted = true;
    loadSelectedEmployeeAttendance(selectedEmployeeEmpId, selectedEmployeeMonth);
    return () => {
      mounted = false;
    };
  }, [canReviewTeamAttendance, selectedEmployeeEmpId, selectedEmployeeMonth]);

  useEffect(() => {
    if (!canReviewTeamAttendance) {
      setTeamAttendanceSummary(null);
      return;
    }

    let mounted = true;
    loadTeamAttendanceSummary();
    return () => {
      mounted = false;
    };
  }, [canReviewTeamAttendance]);

  useEffect(() => {
    const socket = getSocket();
    const handleAttendanceChanged = () => {
      loadSummary(range, selectedMonth);
      if (canReviewTeamAttendance) {
        loadTeamAttendanceSummary();
        if (selectedEmployeeEmpId && selectedEmployeeMonth) {
          loadSelectedEmployeeAttendance(selectedEmployeeEmpId, selectedEmployeeMonth);
        }
      }
    };

    socket.on('attendance:changed', handleAttendanceChanged);
    return () => {
      socket.off('attendance:changed', handleAttendanceChanged);
    };
  }, [canReviewTeamAttendance, range, selectedMonth, selectedEmployeeEmpId, selectedEmployeeMonth]);

  useEffect(() => {
    const socket = getSocket();
    const onLeaveChanged = () => {
      loadLeaves({ silent: true });
    };
    socket.on('leave:created', onLeaveChanged);
    socket.on('leave:updated', onLeaveChanged);
    return () => {
      socket.off('leave:created', onLeaveChanged);
      socket.off('leave:updated', onLeaveChanged);
    };
  }, [loadLeaves]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadLeaves({ silent: true });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadLeaves]);

  const handleLogin = async () => {
    setLoginLoading(true);
    setSessionError(null);
    try {
      let resolvedLocation = locationInput;
      try {
        const geoLocation = await getBrowserGeolocationDescription();
        if (geoLocation) {
          resolvedLocation = geoLocation;
          setLocationInput(geoLocation);
        }
      } catch {
        // ignore geolocation errors and fall back to manual location
      }

      const res = await fetch(`${API_BASE}/attendance/login`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ location: resolvedLocation }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSessionError(data.message || 'Failed to start attendance session');
        return;
      }
      const session = await res.json();
      setActiveSession(session);
      loadSummary(range);
    } catch (e) {
      console.error('Failed to start attendance session', e);
      setSessionError('Failed to start attendance session');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setSessionError(null);
    try {
      const res = await fetch(`${API_BASE}/attendance/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSessionError(data.message || 'Failed to stop attendance session');
        return;
      }
      const session = await res.json();
      setActiveSession(null);
      setSummary((prev) => {
        if (!prev) return prev;
        const updatedDays = prev.days.map((d) => ({
          ...d,
          sessions: d.sessions.map((s) => (s._id === session._id ? session : s)),
        }));
        return { ...prev, days: updatedDays };
      });
      loadSummary(range);
    } catch (e) {
      console.error('Failed to stop attendance session', e);
      setSessionError('Failed to stop attendance session');
    } finally {
      setLogoutLoading(false);
    }
  };

  const postAttendanceActionWithFallback = async (
    endpoints: string[],
    defaultErrorMessage: string,
  ) => {
    let lastMessage = defaultErrorMessage;

    for (let index = 0; index < endpoints.length; index += 1) {
      const endpoint = endpoints[index];

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: getAuthHeaders(),
        });

        if (res.ok) {
          return {
            ok: true as const,
            session: await res.json(),
            message: '',
          };
        }

        const data = await res.json().catch(() => ({}));
        const responseMessage = typeof data?.message === 'string' ? data.message : '';
        lastMessage = responseMessage || defaultErrorMessage;

        const routeMissing = res.status === 404 || /route not found/i.test(responseMessage);
        if (!routeMissing || index === endpoints.length - 1) {
          return {
            ok: false as const,
            session: null,
            message: lastMessage,
          };
        }
      } catch (error) {
        if (index === endpoints.length - 1) {
          console.error(defaultErrorMessage, error);
          return {
            ok: false as const,
            session: null,
            message: defaultErrorMessage,
          };
        }
      }
    }

    return {
      ok: false as const,
      session: null,
      message: lastMessage,
    };
  };

  const handleStartBreak = async () => {
    setBreakLoading(true);
    setSessionError(null);
    try {
      const result = await postAttendanceActionWithFallback(
        [
          `${API_BASE}/attendance/break/start`,
          `${API_BASE}/attendance/start-break`,
        ],
        'Failed to start break',
      );
      if (!result.ok || !result.session) {
        setSessionError(result.message || 'Failed to start break');
        return;
      }

      setActiveSession(result.session);
      void loadSummary(range, selectedMonth);
    } catch (error) {
      console.error('Failed to start break', error);
      setSessionError('Failed to start break');
    } finally {
      setBreakLoading(false);
    }
  };

  const handleResumeBreak = async () => {
    setBreakLoading(true);
    setSessionError(null);
    try {
      const result = await postAttendanceActionWithFallback(
        [
          `${API_BASE}/attendance/break/resume`,
          `${API_BASE}/attendance/resume-break`,
        ],
        'Failed to resume work',
      );
      if (!result.ok || !result.session) {
        setSessionError(result.message || 'Failed to resume work');
        return;
      }

      setActiveSession(result.session);
      void loadSummary(range, selectedMonth);
    } catch (error) {
      console.error('Failed to resume break', error);
      setSessionError('Failed to resume work');
    } finally {
      setBreakLoading(false);
    }
  };

  useEffect(() => {
    if (!activeSession?.loginTime) return;

    let cancelled = false;
    const autoLogoutForCompletedDay = async () => {
      try {
        await fetch(`${API_BASE}/attendance/logout`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
      } catch (e) {
        console.error('Failed to auto logout attendance session', e);
      } finally {
        if (cancelled) return;
        setActiveSession(null);
        setSessionError(null);
        void loadSummary(range);
      }
    };

    const loginDay = getLocalDateKey(activeSession.loginTime);
    const today = getLocalDateKey(new Date());
    if (loginDay !== today) {
      void autoLogoutForCompletedDay();
      return;
    }

    const now = new Date();
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0);
    const timeoutMs = Math.max(1000, nextMidnight.getTime() - now.getTime() + 1000);

    const timer = window.setTimeout(() => {
      void autoLogoutForCompletedDay();
    }, timeoutMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeSession?.loginTime, range]);

  useEffect(() => {
    if (!activeSession?.loginTime) return undefined;

    setLiveNow(Date.now());
    const timer = window.setInterval(() => {
      setLiveNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeSession?.loginTime]);

  const handleApplyLeave = async () => {
    if (!leaveStart || !leaveEnd) return false;
    try {
      const res = await fetch(`${API_BASE}/leaves`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          startDate: leaveStart,
          endDate: leaveEnd,
          reason: leaveReason,
          type: leaveType,
        }),
      });
      if (res.ok) {
        setLeaveStart('');
        setLeaveEnd('');
        setLeaveReason('');
        setLeaveType('GENERAL');
        loadLeaves({ silent: true });
        return true;
      }
    } catch (e) {
      console.error('Failed to apply for leave', e);
    }
    return false;
  };

  const handleQuickHalfDayRequest = async (
    dayPortion: 'FIRST_HALF' | 'SECOND_HALF',
    reason: string,
  ) => {
    setHalfDayRequestLoading(true);
    try {
      const todayDate = getLocalDateKey(new Date());
      const response = await fetch(`${API_BASE}/leaves`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          startDate: todayDate,
          endDate: todayDate,
          reason,
          type: 'HALF_DAY',
          dayPortion,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          ok: false,
          message: data.message || 'Failed to submit half-day request',
        };
      }

      await loadLeaves({ silent: true });
      return {
        ok: true,
        message: 'Half-day request submitted successfully',
      };
    } catch (error) {
      console.error('Failed to submit half-day request', error);
      return {
        ok: false,
        message: 'Failed to submit half-day request',
      };
    } finally {
      setHalfDayRequestLoading(false);
    }
  };

  const handleRevertQuickHalfDayRequest = async (leave: LeaveRequest) => {
    setHalfDayRequestLoading(true);
    try {
      const success = await handleDeleteLeave(leave);
      return {
        ok: success,
        message: success ? 'Half-day request reverted successfully' : 'Failed to revert half-day request',
      };
    } finally {
      setHalfDayRequestLoading(false);
    }
  };

  const handleDeleteLeave = async (leave: LeaveRequest) => {
    try {
      const res = await fetch(`${API_BASE}/leaves/${leave._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        return false;
      }

      await loadLeaves({ silent: true });
      return true;
    } catch (error) {
      console.error('Failed to delete leave request', error);
      return false;
    }
  };

  const handleLeaveAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch(`${API_BASE}/leaves/${id}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        loadLeaves({ silent: true });
      }
    } catch (e) {
      console.error('Failed to update leave status', e);
    }
  };

  const todayInfo = useMemo(() => {
    const todayKey = getLocalDateKey(new Date(liveNow));
    const openSessionIsToday =
      !!activeSession?.loginTime && getLocalDateKey(activeSession.loginTime) === todayKey;

    if (!summary) {
      const liveOnlyMinutes = openSessionIsToday && activeSession?.loginTime
        ? getSessionWorkingMinutes(activeSession, new Date(liveNow))
        : 0;
      return { minutes: liveOnlyMinutes, color: getHoursColor(liveOnlyMinutes / 60) };
    }

    const day = summary.days.find((d) => d.date === todayKey);
    if (!day && !openSessionIsToday) return { minutes: 0, color: getHoursColor(0) };

    const summaryMinutes = day?.minutes || 0;
    if (!openSessionIsToday || !activeSession?.loginTime) {
      return { minutes: summaryMinutes, color: getHoursColor(summaryMinutes / 60) };
    }

    const summaryOpenMinutes = day?.sessions.find((session) => session._id === activeSession._id)?.durationMinutes || 0;
    const elapsedMinutes = getSessionWorkingMinutes(activeSession, new Date(liveNow));
    const completedMinutes = Math.max(0, summaryMinutes - summaryOpenMinutes);
    const liveMinutes = Math.max(summaryMinutes, completedMinutes + elapsedMinutes);

    return { minutes: liveMinutes, color: getHoursColor(liveMinutes / 60) };
  }, [activeSession?._id, activeSession?.loginTime, liveNow, summary]);

  const leaveDaysInRange = useMemo(
    () => countLeaveDaysInRange(myLeaves, summary?.start, summary?.end),
    [myLeaves, summary?.start, summary?.end],
  );
  const todaysHalfDayRequest = useMemo(() => {
    const todayKey = getLocalDateKey(new Date(liveNow));
    return myLeaves.find((leave) => (
      String(leave.type || '').toUpperCase() === 'HALF_DAY'
      && leave.status !== 'REJECTED'
      && getLocalDateKey(leave.startDate) === todayKey
    )) || null;
  }, [liveNow, myLeaves]);
  const todayHalfDayActivityRequest = useMemo(() => {
    const todayKey = getLocalDateKey(new Date(liveNow));
    return myLeaves
      .filter((leave) => (
        String(leave.type || '').toUpperCase() === 'HALF_DAY'
        && getLocalDateKey(leave.startDate) === todayKey
      ))
      .sort((a, b) => new Date((b.decidedAt || b.createdAt)).getTime() - new Date((a.decidedAt || a.createdAt)).getTime())[0] || null;
  }, [liveNow, myLeaves]);
  const leaveNotifications = useMemo<LeaveNotificationItem[]>(() => {
    const items: LeaveNotificationItem[] = [];

    if (isBackendApproverRole) {
      pendingLeaves.slice(0, 6).forEach((leave) => {
        const actorProfile = getLeaveActorProfile(leave);
        const actorHeading = formatLeaveActorHeading(actorProfile);
        const actorMeta = formatLeaveActorMeta(actorProfile);
        const leaveWindow = `${leave.type} leave from ${new Date(leave.startDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })} to ${new Date(leave.endDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })} is waiting for review.`;
        items.push({
          id: `pending-${leave._id}`,
          title: `${actorHeading} submitted a leave request`,
          description: actorMeta ? `${actorMeta}. ${leaveWindow}` : leaveWindow,
          createdAt: leave.createdAt,
          read: !!readLeaveNotificationIds[`pending-${leave._id}`],
          tone: 'info',
        });
      });
    }

    if (!isBackendAdminRole) {
      myLeaves.slice(0, 8).forEach((leave) => {
        const notificationId = `self-${leave._id}-${leave.status}`;
        const title =
          leave.status === 'APPROVED'
            ? 'Your leave has been approved'
            : leave.status === 'REJECTED'
              ? 'Your leave has been rejected'
              : 'Leave request pending approval';
        const description =
          leave.status === 'PENDING'
            ? `${leave.type} leave from ${new Date(leave.startDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })} to ${new Date(leave.endDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })} is waiting for review.`
            : `${leave.type} leave from ${new Date(leave.startDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })} to ${new Date(leave.endDate).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })} was ${leave.status.toLowerCase()}.`;

        items.push({
          id: notificationId,
          title,
          description,
          createdAt: leave.decidedAt || leave.createdAt,
          read: !!readLeaveNotificationIds[notificationId],
          tone: leave.status === 'REJECTED' ? 'warning' : leave.status === 'APPROVED' ? 'success' : 'info',
        });
      });
    }

    return items
      .filter((notification) => !clearedLeaveNotificationIds[notification.id])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [clearedLeaveNotificationIds, formatLeaveActorHeading, formatLeaveActorMeta, getLeaveActorProfile, isBackendAdminRole, isBackendApproverRole, myLeaves, pendingLeaves, readLeaveNotificationIds]);
  const unreadLeaveNotificationCount = useMemo(
    () => leaveNotifications.filter((notification) => !notification.read).length,
    [leaveNotifications],
  );
  useEffect(() => {
    if (leaveLoading || !leaveInitialLoaded) return;

    setReadLeaveNotificationIds((prev) => {
      if (!Object.keys(prev).length) {
        return prev;
      }

      const validIds = new Set(leaveNotifications.map((notification) => notification.id));
      const next = Object.fromEntries(
        Object.entries(prev).filter(([id, read]) => read && validIds.has(id)),
      );

      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [leaveInitialLoaded, leaveLoading, leaveNotifications]);
  const markLeaveNotificationsRead = useCallback((notificationIds: string[]) => {
    if (!notificationIds.length) return;

    setReadLeaveNotificationIds((prev) => {
      const next = { ...prev };
      notificationIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, []);
  const handleOpenLeaveNotifications = useCallback(() => {
    markLeaveNotificationsRead(leaveNotifications.map((notification) => notification.id));
  }, [leaveNotifications, markLeaveNotificationsRead]);
  const handleNotificationClick = useCallback((notificationId: string) => {
    markLeaveNotificationsRead([notificationId]);
  }, [markLeaveNotificationsRead]);
  const handleClearLeaveNotifications = useCallback(() => {
    if (!leaveNotifications.length) return;

    setClearedLeaveNotificationIds((prev) => {
      const next = { ...prev };
      leaveNotifications.forEach((notification) => {
        next[notification.id] = true;
      });
      return next;
    });

    markLeaveNotificationsRead(leaveNotifications.map((notification) => notification.id));
  }, [leaveNotifications, markLeaveNotificationsRead]);
  const attendancePageLoading = loading && !summary;
  const selectedEmployee = useMemo(
    () => employeeOptions.find((employee) => employee.empId === selectedEmployeeEmpId) || null,
    [employeeOptions, selectedEmployeeEmpId],
  );
  const employeeMonthOptions = useMemo(() => {
    const baseDate = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - index, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
      return { value, label };
    });
  }, []);
  const selectedEmployeeTodayInfo = useMemo(() => {
    if (!employeeSummary) return { minutes: 0, color: getHoursColor(0) };
    const todayKey = getLocalDateKey(new Date());
    const day = employeeSummary.days.find((entry) => entry.date === todayKey);
    if (!day) return { minutes: 0, color: getHoursColor(0) };
    return { minutes: day.minutes, color: getHoursColor(day.minutes / 60) };
  }, [employeeSummary]);
  const selectedEmployeeMonthlyAttendance = useMemo(() => {
    if (!selectedEmployeeMonth) {
      return { present: 0, absent: 0, total: 0 };
    }

    const [yearText, monthText] = selectedEmployeeMonth.split('-');
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0) {
      return { present: 0, absent: 0, total: 0 };
    }

    const now = new Date();
    const isCurrentMonth =
      now.getFullYear() === year && now.getMonth() === monthIndex;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const lastCountedDay = isCurrentMonth ? now.getDate() : daysInMonth;
    let totalWorkingDays = 0;
    for (let day = 1; day <= lastCountedDay; day += 1) {
      const current = new Date(year, monthIndex, day);
      if (current.getDay() !== 0) {
        totalWorkingDays += 1;
      }
    }

    const presentDays = employeeSummary?.days.length ?? 0;
    return {
      present: presentDays,
      absent: Math.max(0, totalWorkingDays - presentDays),
      total: totalWorkingDays,
    };
  }, [employeeSummary?.days.length, selectedEmployeeMonth]);
  const selectedEmployeeLabel = selectedEmployee
    ? `${selectedEmployee.empName} (${selectedEmployee.empId})`
    : 'Select employee';
  const selectedEmployeeMonthLabel =
    employeeMonthOptions.find((month) => month.value === selectedEmployeeMonth)?.label || 'Select month';

  return (
    <div className={`${isEmployeePortal ? 'max-w-[1760px]' : 'max-w-6xl'} mx-auto space-y-10 animate-in fade-in duration-700`}>
      <AttendanceHeader
        range={range}
        onRangeChange={(r) => setRange(r)}
        selectedMonth={selectedMonth}
        onSelectMonth={(month) => {
          setSelectedMonth(month);
          setRange('month');
        }}
        activeView={isHistoryRoute ? 'attendance' : activeView}
        onActiveViewChange={handleActiveViewChange}
        subtitle={isEmployeePortal ? 'Your Presence Radar' : 'Team Attendance Console'}
        leaveNotifications={leaveNotifications}
        unreadNotificationCount={unreadLeaveNotificationCount}
        onOpenNotifications={handleOpenLeaveNotifications}
        onNotificationClick={handleNotificationClick}
        onClearNotifications={handleClearLeaveNotifications}
        loading={attendancePageLoading}
      />

      {isHistoryRoute ? (
        <AttendanceHistoryPage
          summary={summary}
          range={range}
          selectedMonth={selectedMonth}
          loading={attendancePageLoading}
          portalMode={mode}
          onBack={handleHistoryClose}
        />
      ) : activeView === 'attendance' ? (
        <AttendanceOverviewGrid
          summary={summary}
          range={range}
          todayMinutes={todayInfo.minutes}
          todayColor={todayInfo.color}
          leaveDaysInRange={leaveDaysInRange}
          attendancePageLoading={attendancePageLoading}
          selectedMonth={selectedMonth}
          activeSession={activeSession}
          locationInput={locationInput}
          onLocationChange={setLocationInput}
          onLogin={handleLogin}
          onStartBreak={handleStartBreak}
          onResumeBreak={handleResumeBreak}
          onLogout={handleLogout}
          loginLoading={loginLoading}
          breakLoading={breakLoading}
          logoutLoading={logoutLoading}
          onQuickHalfDayRequest={handleQuickHalfDayRequest}
          onRevertHalfDayRequest={handleRevertQuickHalfDayRequest}
          halfDayRequestLoading={halfDayRequestLoading}
          todaysHalfDayRequest={todaysHalfDayRequest}
          todayHalfDayActivityRequest={todayHalfDayActivityRequest}
          sessionError={sessionError}
          canReviewTeamAttendance={canReviewTeamAttendance}
          teamAttendanceSummaryLoading={teamAttendanceSummaryLoading}
          teamAttendanceSummary={teamAttendanceSummary}
          portalMode={mode}
          onOpenHistory={handleHistoryOpen}
        />
      ) : (
        <div className="space-y-6">
          <LeaveManagementPanel
            leaveStart={leaveStart}
            leaveEnd={leaveEnd}
            leaveReason={leaveReason}
            leaveType={leaveType}
            onChangeStart={setLeaveStart}
            onChangeEnd={setLeaveEnd}
            onChangeReason={setLeaveReason}
            onChangeType={setLeaveType}
            onApply={handleApplyLeave}
            onDeleteLeave={handleDeleteLeave}
            myLeaves={myLeaves}
            pendingLeaves={pendingLeaves}
            leaveLoading={leaveLoading}
            onLeaveAction={handleLeaveAction}
            canApplyLeave={!isBackendAdminRole}
            approverLeaves={approverLeaves}
            isAdmin={!!isBackendAdminRole}
            isApproverPortal={isBackendApproverRole}
            viewerRole={leaveViewerRole}
            currentEmployeeId={backendEmpId}
            employeeDirectory={employeeOptions.map((employee) => `${employee.empName} (${employee.empId})`)}
            loading={leaveLoading && myLeaves.length === 0 && pendingLeaves.length === 0 && approverLeaves.length === 0}
          />
        </div>
      )}

      {!isHistoryRoute && activeView === 'attendance' ? (
        <TeamAttendanceSection
          canReviewTeamAttendance={canReviewTeamAttendance}
          employeePickerOpen={employeePickerOpen}
          monthPickerOpen={monthPickerOpen}
          employeePickerRef={employeePickerRef}
          monthPickerRef={monthPickerRef}
          setEmployeePickerOpen={setEmployeePickerOpen}
          setMonthPickerOpen={setMonthPickerOpen}
          employeeOptions={employeeOptions}
          selectedEmployeeEmpId={selectedEmployeeEmpId}
          selectedEmployeeMonth={selectedEmployeeMonth}
          selectedEmployeeLabel={selectedEmployeeLabel}
          selectedEmployeeMonthLabel={selectedEmployeeMonthLabel}
          selectedEmployee={selectedEmployee}
          employeeMonthOptions={employeeMonthOptions}
          employeeSummary={employeeSummary}
          employeeAttendanceLoading={employeeAttendanceLoading}
          selectedEmployeeTodayInfo={selectedEmployeeTodayInfo}
          selectedEmployeeMonthlyAttendance={selectedEmployeeMonthlyAttendance}
          setSelectedEmployeeEmpId={setSelectedEmployeeEmpId}
          setSelectedEmployeeMonth={setSelectedEmployeeMonth}
        />
      ) : null}
    </div>
  );
};

export default AttendanceView;
