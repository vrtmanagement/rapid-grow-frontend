import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { ChevronDown } from 'lucide-react';
import AttendanceHeader from '../components/attendance/AttendanceHeader';
import AttendanceSummaryCards from '../components/attendance/AttendanceSummaryCards';
import AttendancePresenceChart from '../components/attendance/AttendancePresenceChart';
import AttendanceLiveSession from '../components/attendance/AttendanceLiveSession';
import LeaveManagementPanel from '../components/attendance/LeaveManagementPanel';
import AttendanceHistoryModal from '../components/attendance/AttendanceHistoryModal';
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
} from '../components/attendance/attendanceUtils';

interface Props {
  mode?: 'manager' | 'employee';
}

interface AttendanceEmployeeOption {
  empId: string;
  empName: string;
  role: string;
  designation?: string;
  department?: string;
}

interface TeamAttendanceSummary {
  total: number;
  present: number;
  absent: number;
}

interface LeaveActorProfile {
  empName: string;
  empId: string;
  designation?: string;
  department?: string;
}

function readStoredLeaveNotificationState(storageKey: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const AttendanceView: React.FC<Props> = ({ mode = 'manager' }) => {
  const { hasPermission } = usePermissions();
  const [activeView, setActiveView] = useState<'attendance' | 'leave'>('attendance');
  const [range, setRange] = useState<Range>(() => (mode === 'employee' ? 'month' : 'day'));
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [summary, setSummary] = useState<AttendanceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
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
  const employeePickerRef = useRef<HTMLDivElement | null>(null);
  const monthPickerRef = useRef<HTMLDivElement | null>(null);
  const leaveInitialLoadedRef = useRef(false);

  const isEmployeePortal = mode === 'employee';

  const rawAdmin = typeof window !== 'undefined' ? localStorage.getItem('rapidgrow-admin') : null;
  let backendRole: string | null = null;
  let backendEmpId = '';
  if (rawAdmin) {
    try {
      const parsed = JSON.parse(rawAdmin);
      backendRole = parsed?.employee?.role || null;
      backendEmpId = String(parsed?.employee?.empId || '').trim();
    } catch {
      backendRole = null;
      backendEmpId = '';
    }
  }

  const isBackendAdminRole = backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN';
  const isBackendApproverRole = isBackendAdminRole || backendRole === 'TEAM_LEAD';
  const leaveViewerRole: 'employee' | 'team_lead' | 'admin' = isBackendAdminRole
    ? 'admin'
    : backendRole === 'TEAM_LEAD'
      ? 'team_lead'
      : 'employee';
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

  const getDefaultMonthValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const getLocalDateKey = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

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

  const getBrowserLocation = async (): Promise<string | null> => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const desc = `Lat:${latitude.toFixed(6)}, Lng:${longitude.toFixed(6)}, ±${Math.round(
            accuracy || 0,
          )}m`;
          resolve(desc);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    setSessionError(null);
    try {
      let resolvedLocation = locationInput;
      try {
        const geoLocation = await getBrowserLocation();
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
    if (!summary) return { minutes: 0, color: getHoursColor(0) };
    const todayKey = new Date().toISOString().slice(0, 10);
    const day = summary.days.find((d) => d.date === todayKey);
    if (!day) return { minutes: 0, color: getHoursColor(0) };
    const hours = day.minutes / 60;
    return { minutes: day.minutes, color: getHoursColor(hours) };
  }, [summary]);

  const leaveDaysInRange = useMemo(
    () => countLeaveDaysInRange(myLeaves, summary?.start, summary?.end),
    [myLeaves, summary?.start, summary?.end],
  );
  const leaveNotifications = useMemo<LeaveNotificationItem[]>(() => {
    const items: LeaveNotificationItem[] = [];

    if (isBackendApproverRole) {
      pendingLeaves.slice(0, 6).forEach((leave) => {
        const actorProfile = getLeaveActorProfile(leave);
        const actorHeading = formatLeaveActorHeading(actorProfile);
        const actorMeta = formatLeaveActorMeta(actorProfile);
        const leaveWindow = `${leave.type} leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} is waiting for review.`;
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
            ? `${leave.type} leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} is waiting for review.`
            : `${leave.type} leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} was ${leave.status.toLowerCase()}.`;

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
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return { value, label };
    });
  }, []);
  const selectedEmployeeTodayInfo = useMemo(() => {
    if (!employeeSummary) return { minutes: 0, color: getHoursColor(0) };
    const todayKey = new Date().toISOString().slice(0, 10);
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
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <AttendanceHeader
        range={range}
        onRangeChange={(r) => setRange(r)}
        selectedMonth={selectedMonth}
        onSelectMonth={(month) => {
          setSelectedMonth(month);
          setRange('month');
        }}
        activeView={activeView}
        onActiveViewChange={setActiveView}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        subtitle={isEmployeePortal ? 'Your Presence Radar' : 'Team Attendance Console'}
        leaveNotifications={leaveNotifications}
        unreadNotificationCount={unreadLeaveNotificationCount}
        onOpenNotifications={handleOpenLeaveNotifications}
        onNotificationClick={handleNotificationClick}
        onClearNotifications={handleClearLeaveNotifications}
        loading={attendancePageLoading}
      />

      {activeView === 'attendance' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <AttendanceSummaryCards
              summary={summary}
              range={range}
              todayMinutes={todayInfo.minutes}
              todayColor={todayInfo.color}
              leaveDaysInRange={leaveDaysInRange}
              loading={attendancePageLoading}
            />
            <AttendancePresenceChart
              summary={summary}
              loading={attendancePageLoading}
              selectedMonth={selectedMonth}
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <AttendanceLiveSession
              activeSession={activeSession}
              locationInput={locationInput}
              onLocationChange={setLocationInput}
              onLogin={handleLogin}
              onLogout={handleLogout}
              loginLoading={loginLoading}
              logoutLoading={logoutLoading}
              errorMessage={sessionError}
              loading={attendancePageLoading}
            />
            {canReviewTeamAttendance && (
              <div className="rounded-[30px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy p-6 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
                <h4 className="text-lg font-semibold text-white">Today attendance</h4>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Shows how many team members logged in today.
                </p>
                {teamAttendanceSummaryLoading ? (
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-white/5 px-3 py-4 text-center text-sm text-slate-400">...</div>
                    <div className="rounded-xl bg-white/5 px-3 py-4 text-center text-sm text-slate-400">...</div>
                    <div className="rounded-xl bg-white/5 px-3 py-4 text-center text-sm text-slate-400">...</div>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-emerald-500/10 px-3 py-4 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Present</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{teamAttendanceSummary?.present ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-rose-500/10 px-3 py-4 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-200">Absent</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{teamAttendanceSummary?.absent ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-4 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Total</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{teamAttendanceSummary?.total ?? 0}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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

      {activeView === 'attendance' && (
        <AttendanceHistoryModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          summary={summary}
        />
      )}

      {activeView === 'attendance' && canReviewTeamAttendance && (
        <section className="space-y-6">
          <div className="rounded-[32px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy px-6 py-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.18)] md:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-1.5 w-8 rounded-full bg-brand-red" />
                  <span className="text-[15px] text-slate-300">Employee Attendance</span>
                </div>
                <h3 className="text-2xl font-semibold text-white">Team member attendance</h3>
                <p className="mt-2 text-[15px] text-slate-300">
                  Review any employee&apos;s monthly attendance without changing the current dashboard flow.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:min-w-[520px]">
                <label className="block">
                  <span className="mb-2 block text-[13px] font-semibold text-slate-200">Select employee</span>
                  <div className="relative" ref={employeePickerRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmployeePickerOpen((prev) => !prev);
                        setMonthPickerOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/12 bg-white/12 px-4 py-3 text-left text-[15px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-all hover:bg-white/16 focus:border-white/25 focus:bg-white/16 focus:ring-2 focus:ring-white/10"
                    >
                      <span className="truncate pr-4">{selectedEmployeeLabel}</span>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-slate-300 transition-transform ${employeePickerOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {employeePickerOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                        <div className="max-h-64 overflow-y-auto py-2">
                          {employeeOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-500">No employees found</div>
                          ) : (
                            employeeOptions.map((employee) => {
                              const isSelected = employee.empId === selectedEmployeeEmpId;
                              return (
                                <button
                                  key={employee.empId}
                                  type="button"
                                  onClick={() => {
                                    setSelectedEmployeeEmpId(employee.empId);
                                    setEmployeePickerOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                                    isSelected
                                      ? 'bg-rose-50 text-slate-900'
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="truncate pr-4">{employee.empName} ({employee.empId})</span>
                                  {isSelected && <span className="text-xs font-semibold text-brand-red">Selected</span>}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[13px] font-semibold text-slate-200">Select month</span>
                  <div className="relative" ref={monthPickerRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setMonthPickerOpen((prev) => !prev);
                        setEmployeePickerOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/12 bg-white/12 px-4 py-3 text-left text-[15px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-all hover:bg-white/16 focus:border-white/25 focus:bg-white/16 focus:ring-2 focus:ring-white/10"
                    >
                      <span className="truncate pr-4">{selectedEmployeeMonthLabel}</span>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-slate-300 transition-transform ${monthPickerOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {monthPickerOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                        <div className="max-h-64 overflow-y-auto py-2">
                          {employeeMonthOptions.map((month) => {
                            const isSelected = month.value === selectedEmployeeMonth;
                            return (
                              <button
                                key={month.value}
                                type="button"
                                onClick={() => {
                                  setSelectedEmployeeMonth(month.value);
                                  setMonthPickerOpen(false);
                                }}
                                className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                                  isSelected
                                    ? 'bg-rose-50 text-slate-900'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span>{month.label}</span>
                                {isSelected && <span className="text-xs font-semibold text-brand-red">Selected</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {selectedEmployee ? (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                  {selectedEmployee.empName}
                </div>
                <div className="inline-flex items-center rounded-full bg-amber-400/12 px-4 py-2 text-sm font-medium text-amber-100">
                  {selectedEmployee.designation || 'Employee'}
                </div>
                <div className="inline-flex items-center rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-slate-300">
                  {selectedEmployee.department || selectedEmployee.role}
                </div>
              </div>
            ) : null}
          </div>

          {selectedEmployeeEmpId ? (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-8">
                <AttendanceSummaryCards
                  summary={employeeSummary}
                  range="month"
                  todayMinutes={selectedEmployeeTodayInfo.minutes}
                  todayColor={selectedEmployeeTodayInfo.color}
                  leaveDaysInRange={0}
                  loading={employeeAttendanceLoading}
                />
                <AttendancePresenceChart
                  summary={employeeSummary}
                  loading={employeeAttendanceLoading}
                  selectedMonth={selectedEmployeeMonth}
                />
              </div>

              <div className="lg:col-span-4">
                <div className="space-y-6">
                  <div className="rounded-[30px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy p-6 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
                    <h4 className="text-lg font-semibold text-white">Attendance selection</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Use the employee and month selectors above to review monthly attendance in a focused way.
                    </p>
                    <div className="mt-6 space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Employee</p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {selectedEmployee?.empName || 'Select an employee'}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {selectedEmployee?.empId || 'No employee selected'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Month</p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {employeeMonthOptions.find((month) => month.value === selectedEmployeeMonth)?.label || 'Select month'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                        <h5 className="text-lg font-semibold text-white">Monthly attendance</h5>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          Shows the selected employee&apos;s monthly attendance with Sundays excluded from total working days.
                        </p>
                        {employeeAttendanceLoading ? (
                          <div className="mt-5 grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-white/5 px-3 py-4 text-center text-sm text-slate-400">...</div>
                            <div className="rounded-xl bg-white/5 px-3 py-4 text-center text-sm text-slate-400">...</div>
                            <div className="rounded-xl bg-white/5 px-3 py-4 text-center text-sm text-slate-400">...</div>
                          </div>
                        ) : (
                          <div className="mt-5 grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-emerald-500/10 px-3 py-4 text-center">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Present</p>
                              <p className="mt-2 text-2xl font-semibold text-white">{selectedEmployeeMonthlyAttendance.present}</p>
                            </div>
                            <div className="rounded-xl bg-rose-500/10 px-3 py-4 text-center">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-200">Absent</p>
                              <p className="mt-2 text-2xl font-semibold text-white">{selectedEmployeeMonthlyAttendance.absent}</p>
                            </div>
                            <div className="rounded-xl bg-white/5 px-3 py-4 text-center">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Total</p>
                              <p className="mt-2 text-2xl font-semibold text-white">{selectedEmployeeMonthlyAttendance.total}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center text-slate-500 shadow-sm">
              No employee is available for attendance review.
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default AttendanceView;
