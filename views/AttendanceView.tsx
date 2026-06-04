import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { API_BASE, apiGetJson, getAuthHeaders } from '../config/api';
import { invalidateApiCache, peekApiCache } from '../services/apiCache';
import AttendanceHeader from '../components/attendance/AttendanceHeader';
import LeaveManagementPanel from '../components/attendance/LeaveManagementPanel';
import AttendanceHistoryPage from '../components/attendance/AttendanceHistoryPage';
import TeamAttendanceSection from '../components/attendance/TeamAttendanceSection';
import LateAttendanceSection from '../components/attendance/LateAttendanceSection';
import EmployeeLateAttendanceSection from '../components/attendance/EmployeeLateAttendanceSection';
import { fetchLeaveBalanceOverview } from '../components/attendance/leaveBalanceApi';
import {
  AttendanceEmployeeOption,
  TeamAttendanceSummary,
  LeaveActorProfile,
  readStoredLeaveNotificationState,
  getDefaultMonthValue,
  getLocalDateKey,
  parseAttendanceBackendContext,
  projectTeamAttendanceSummary,
  getBrowserGeolocationDescription,
} from '../components/attendance/attendanceViewUtils';
import AttendanceOverviewGrid from '../components/attendance/AttendanceOverviewGrid';
import PageSectionSubnav from '../components/layout/PageSectionSubnav';
import { getSocket } from '../realtime/socket';
import { usePermissions } from '../context/usePermissions';
import {
  AttendanceSession,
  LateLoginSettings,
  AttendanceSummaryResponse,
  LeaveBalanceOverviewResponse,
  LeaveNotificationItem,
  LeaveRequest,
  Range,
  getHoursColor,
  countLeaveDaysInRange,
  projectAttendanceSummary,
  getSessionWorkingMinutes,
} from '../components/attendance/attendanceUtils';

interface Props {
  mode?: 'manager' | 'employee';
}

type LeaveSection = 'workspace' | 'insights' | 'policy';

const AttendanceView: React.FC<Props> = ({ mode = 'manager' }) => {
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'attendance' | 'leave' | 'late'>(() => {
    const params = new URLSearchParams(location.search || '');
    const routeView = params.get('view');
    return routeView === 'leave' || routeView === 'late' ? routeView : 'attendance';
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
  const [leaveSection, setLeaveSection] = useState<LeaveSection>(() => {
    const params = new URLSearchParams(location.search || '');
    const routeSection = params.get('leaveSection');
    return routeSection === 'insights' || routeSection === 'policy' ? routeSection : 'workspace';
  });
  const [summary, setSummary] = useState<AttendanceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [approverLeaves, setApproverLeaves] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveBalanceOverview, setLeaveBalanceOverview] = useState<LeaveBalanceOverviewResponse | null>(null);
  const [leaveBalanceLoading, setLeaveBalanceLoading] = useState(false);
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
  const [teamAttendanceSummarySnapshotAt, setTeamAttendanceSummarySnapshotAt] = useState<number | null>(null);
  const [teamAttendanceSummaryLoading, setTeamAttendanceSummaryLoading] = useState(false);
  const [lateLoginApprovalLoading, setLateLoginApprovalLoading] = useState(false);
  const [lateLoginRejectLoading, setLateLoginRejectLoading] = useState(false);
  const [lateLoginRequestLoading, setLateLoginRequestLoading] = useState(false);
  const [lateLoginSettings, setLateLoginSettings] = useState<LateLoginSettings | null>(null);
  const [lateLoginSettingsLoading, setLateLoginSettingsLoading] = useState(false);
  const [lateLoginSettingsSaving, setLateLoginSettingsSaving] = useState(false);
  const [lateLoginSettingsModalOpen, setLateLoginSettingsModalOpen] = useState(false);
  const [lateLoginCutoffDraft, setLateLoginCutoffDraft] = useState('');
  const [lateLoginSettingsMessage, setLateLoginSettingsMessage] = useState<string | null>(null);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [headerMonthPickerOpen, setHeaderMonthPickerOpen] = useState(false);
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const employeePickerRef = useRef<HTMLDivElement | null>(null);
  const monthPickerRef = useRef<HTMLDivElement | null>(null);
  const headerMonthPickerRef = useRef<HTMLDivElement | null>(null);
  const leaveInitialLoadedRef = useRef(false);

  const isEmployeePortal = mode === 'employee';
  const isHistoryRoute = location.pathname === '/attendance/history';
  const isTeamAttendanceRoute = location.pathname === '/attendance/team';

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
  const canManageLateLogins =
    isBackendAdminRole || hasPermission('ATTENDANCE_LATE_LOGIN_OVERRIDE');
  const headerCurrentDate = useMemo(() => new Date(), []);
  const parsedHeaderSelectedMonth = useMemo(() => {
    if (!selectedMonth) return null;
    const parsed = new Date(`${selectedMonth}-01T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [selectedMonth]);
  const [headerVisibleYear, setHeaderVisibleYear] = useState(
    parsedHeaderSelectedMonth?.getFullYear() ?? headerCurrentDate.getFullYear(),
  );
  const headerMonthItems = useMemo(
    () => [
      { label: 'Jan', value: '01' },
      { label: 'Feb', value: '02' },
      { label: 'Mar', value: '03' },
      { label: 'Apr', value: '04' },
      { label: 'May', value: '05' },
      { label: 'Jun', value: '06' },
      { label: 'Jul', value: '07' },
      { label: 'Aug', value: '08' },
      { label: 'Sep', value: '09' },
      { label: 'Oct', value: '10' },
      { label: 'Nov', value: '11' },
      { label: 'Dec', value: '12' },
    ],
    [],
  );
  const headerSelectedMonthLabel = parsedHeaderSelectedMonth
    ? parsedHeaderSelectedMonth.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Select Month';

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const routeView = params.get('view');
    setActiveView(routeView === 'leave' || routeView === 'late' ? routeView : 'attendance');

    const routeRange = params.get('range');
    if (routeRange === 'day' || routeRange === 'week' || routeRange === 'month') {
      setRange(routeRange);
    }
    if (params.has('month')) {
      setSelectedMonth(params.get('month') || '');
    }
    if (params.has('leaveSection')) {
      const routeSection = params.get('leaveSection');
      setLeaveSection(routeSection === 'insights' || routeSection === 'policy' ? routeSection : 'workspace');
    } else {
      setLeaveSection('workspace');
    }
  }, [location.search]);

  useEffect(() => {
    if (headerMonthPickerOpen) {
      setHeaderVisibleYear(parsedHeaderSelectedMonth?.getFullYear() ?? headerCurrentDate.getFullYear());
    }
  }, [headerCurrentDate, headerMonthPickerOpen, parsedHeaderSelectedMonth]);

  const buildAttendanceRoute = useCallback((pathname: '/attendance' | '/attendance/history' | '/attendance/team') => {
    const params = new URLSearchParams();
    if (pathname === '/attendance' && activeView !== 'attendance') {
      params.set('view', activeView);
    }
    if (pathname === '/attendance' && activeView === 'leave' && leaveSection !== 'workspace') {
      params.set('leaveSection', leaveSection);
    }
    params.set('range', range);
    if (selectedMonth) {
      params.set('month', selectedMonth);
    }

    const search = params.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [activeView, leaveSection, range, selectedMonth]);

  const handleHeaderMonthSelect = useCallback((monthValue: string) => {
    setSelectedMonth(`${headerVisibleYear}-${monthValue}`);
    setRange('month');
    setHeaderMonthPickerOpen(false);
  }, [headerVisibleYear]);

  const handleHistoryOpen = useCallback(() => {
    navigate(buildAttendanceRoute('/attendance/history'));
  }, [buildAttendanceRoute, navigate]);

  const handleHistoryClose = useCallback(() => {
    navigate(buildAttendanceRoute('/attendance'));
  }, [buildAttendanceRoute, navigate]);

  const handleTeamAttendanceOpen = useCallback(() => {
    navigate(buildAttendanceRoute('/attendance/team'));
  }, [buildAttendanceRoute, navigate]);

  const handleTeamAttendanceClose = useCallback(() => {
    navigate(buildAttendanceRoute('/attendance'));
  }, [buildAttendanceRoute, navigate]);

  const handleActiveViewChange = useCallback((nextView: 'attendance' | 'leave' | 'late') => {
    setActiveView(nextView);
    const params = new URLSearchParams();
    if (nextView !== 'attendance') {
      params.set('view', nextView);
    }
    if (nextView === 'leave' && leaveSection !== 'workspace') {
      params.set('leaveSection', leaveSection);
    }
    params.set('range', range);
    if (selectedMonth) {
      params.set('month', selectedMonth);
    }

    const search = params.toString();
    navigate(search ? `/attendance?${search}` : '/attendance');
  }, [leaveSection, navigate, range, selectedMonth]);

  const handleLeaveSectionChange = useCallback((nextSection: LeaveSection) => {
    setLeaveSection(nextSection);
    const params = new URLSearchParams();
    params.set('view', 'leave');
    if (nextSection !== 'workspace') {
      params.set('leaveSection', nextSection);
    }
    params.set('range', range);
    if (selectedMonth) {
      params.set('month', selectedMonth);
    }

    const search = params.toString();
    navigate(search ? `/attendance?${search}` : '/attendance');
  }, [navigate, range, selectedMonth]);

  useEffect(() => {
    if (!isHistoryRoute && !isTeamAttendanceRoute) return;

    const nextRoute = isHistoryRoute
      ? buildAttendanceRoute('/attendance/history')
      : buildAttendanceRoute('/attendance/team');
    const currentRoute = `${location.pathname}${location.search || ''}`;
    if (currentRoute !== nextRoute) {
      navigate(nextRoute, { replace: true });
    }
  }, [buildAttendanceRoute, isHistoryRoute, isTeamAttendanceRoute, location.pathname, location.search, navigate]);

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
      const data = await apiGetJson<unknown[]>('/employees').catch(() => null);
      if (!data) return leaves;

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
      if (!headerMonthPickerRef.current?.contains(target)) {
        setHeaderMonthPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEmployeePickerOpen(false);
        setMonthPickerOpen(false);
        setHeaderMonthPickerOpen(false);
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
        const data = await apiGetJson<unknown[]>('/attendance/members');
        if (!mounted) return;

        const options = (Array.isArray(data) ? data : [])
          .filter((employee: any) => employee?.status === 'active')
          .filter((employee: any) => ['EMPLOYEE', 'TEAM_LEAD'].includes(String(employee?.role || '').toUpperCase()))
          .map((employee: any) => ({
            empId: String(employee.empId || '').trim(),
            empName: String(employee.empName || employee.empId || '').trim(),
            role: String(employee.role || '').trim(),
            avatar: String(employee.avatar || '').trim(),
            designation: String(employee.designation || '').trim(),
            department: String(employee.department || '').trim(),
            teamId: String(employee.teamId || '').trim(),
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

  const loadSummary = async (
    selectedRange: Range,
    monthValue?: string,
    options?: { silent?: boolean; force?: boolean },
  ) => {
    const silent = options?.silent === true;
    const force = options?.force === true;
    const params = new URLSearchParams();
    params.set('range', selectedRange);
    if (selectedRange === 'month' && monthValue) {
      params.set('date', `${monthValue}-01`);
    }
    const summaryPath = `/attendance/me?${params.toString()}`;
    const hasCache = !force && !!peekApiCache(`${API_BASE}${summaryPath}`);
    if (!silent && !hasCache) {
      setLoading(true);
    }
    try {
      const data = await apiGetJson<any>(summaryPath, {}, { force });
      setSummary({
        ...data,
        start: data.start,
        end: data.end,
        lateLoginPolicy: data.lateLoginPolicy || null,
        lateLoginRecords: Array.isArray(data.lateLoginRecords) ? data.lateLoginRecords : [],
      });
      const allSessions = (data.days || []).flatMap((d: any) => d.sessions || []);
      const open = allSessions.find((s: AttendanceSession) => !s.logoutTime);
      setActiveSession(open || null);
    } catch (e) {
      console.error('Failed to load attendance summary', e);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadSelectedEmployeeAttendance = async (
    empId: string,
    monthValue: string,
    options?: { silent?: boolean },
  ) => {
    const silent = options?.silent === true;
    if (!silent) {
      setEmployeeAttendanceLoading(true);
    }
    try {
      const params = new URLSearchParams();
      params.set('range', 'month');
      params.set('date', `${monthValue}-01`);

      const res = await fetch(
        `${API_BASE}/attendance/employee/${encodeURIComponent(empId)}?${params.toString()}`,
        { headers: getAuthHeaders() },
      );

      if (!res.ok) {
        if (silent) {
          return;
        }
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
        lateLoginPolicy: data.lateLoginPolicy || null,
        lateLoginRecords: Array.isArray(data.lateLoginRecords) ? data.lateLoginRecords : [],
      });
    } catch (error) {
      console.error('Failed to load selected employee attendance', error);
      if (!silent) {
        setEmployeeSummary(null);
      }
    } finally {
      if (!silent) {
        setEmployeeAttendanceLoading(false);
      }
    }
  };

  const loadTeamAttendanceSummary = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const hasCache = !!peekApiCache(`${API_BASE}/attendance/team-summary`);
    if (!silent && !hasCache) {
      setTeamAttendanceSummaryLoading(true);
    }
    try {
      const data = await apiGetJson<any>('/attendance/team-summary');
      setTeamAttendanceSummary({
        total: Number(data.total || 0),
        present: Number(data.present || 0),
        absent: Number(data.absent || 0),
        clockedIn: Number(data.clockedIn || 0),
        onBreak: Number(data.onBreak || 0),
        members: Array.isArray(data.members) ? data.members : [],
        activityLog: Array.isArray(data.activityLog) ? data.activityLog : [],
        lateLoginRecords: Array.isArray(data.lateLoginRecords) ? data.lateLoginRecords : [],
      });
      setTeamAttendanceSummarySnapshotAt(Date.now());
    } catch (error) {
      console.error('Failed to load team attendance summary', error);
      if (!silent) {
        setTeamAttendanceSummary(null);
      }
      setTeamAttendanceSummarySnapshotAt(null);
    } finally {
      if (!silent) {
        setTeamAttendanceSummaryLoading(false);
      }
    }
  };

  const loadLateLoginSettings = useCallback(async (options?: { silent?: boolean }) => {
    if (!isBackendAdminRole) {
      setLateLoginSettings(null);
      return;
    }

    const silent = options?.silent === true;
    if (!silent) {
      setLateLoginSettingsLoading(true);
    }

    try {
      const res = await fetch(`${API_BASE}/attendance/late-login/settings`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (!silent) {
          setLateLoginSettings(null);
        }
        return;
      }

      const data = await res.json();
      setLateLoginSettings(data || null);
      setLateLoginCutoffDraft(String(data?.time || ''));
    } catch (error) {
      console.error('Failed to load late login settings', error);
      if (!silent) {
        setLateLoginSettings(null);
      }
    } finally {
      if (!silent) {
        setLateLoginSettingsLoading(false);
      }
    }
  }, [isBackendAdminRole]);

  const loadCurrentLeaveBalanceOverview = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setLeaveBalanceLoading(true);
    }

    try {
      const data = await fetchLeaveBalanceOverview({
        period: 'year',
        year: new Date().getFullYear(),
      });
      setLeaveBalanceOverview(data);
    } catch (error) {
      console.error('Failed to load current leave balance overview', error);
      if (!silent) {
        setLeaveBalanceOverview(null);
      }
    } finally {
      if (!silent) {
        setLeaveBalanceLoading(false);
      }
    }
  }, []);

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
    void loadCurrentLeaveBalanceOverview();
  }, [loadCurrentLeaveBalanceOverview]);

  useEffect(() => {
    if (activeView !== 'late' || !isBackendAdminRole) {
      if (activeView !== 'late') {
        setLateLoginSettingsModalOpen(false);
        setLateLoginSettingsMessage(null);
      }
      return;
    }

    void loadLateLoginSettings();
  }, [activeView, isBackendAdminRole, loadLateLoginSettings]);

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
      setTeamAttendanceSummarySnapshotAt(null);
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
    const handleAttendanceChanged = (payload?: { empId?: string }) => {
      const changedEmpId = String(payload?.empId || '').trim();
      const shouldRefreshOwnSummary = !changedEmpId || (!!backendEmpId && changedEmpId === backendEmpId);

      if (shouldRefreshOwnSummary) {
        loadSummary(range, selectedMonth, { silent: true });
      }

      if (canReviewTeamAttendance) {
        loadTeamAttendanceSummary({ silent: true });
        const shouldRefreshSelectedEmployee =
          !changedEmpId || changedEmpId === selectedEmployeeEmpId;
        if (selectedEmployeeEmpId && selectedEmployeeMonth && shouldRefreshSelectedEmployee) {
          loadSelectedEmployeeAttendance(selectedEmployeeEmpId, selectedEmployeeMonth, { silent: true });
        }
      }
    };

    socket.on('attendance:changed', handleAttendanceChanged);
    return () => {
      socket.off('attendance:changed', handleAttendanceChanged);
    };
  }, [backendEmpId, canReviewTeamAttendance, range, selectedMonth, selectedEmployeeEmpId, selectedEmployeeMonth]);

  useEffect(() => {
    const socket = getSocket();
    const onLeaveChanged = () => {
      loadLeaves({ silent: true });
      loadCurrentLeaveBalanceOverview({ silent: true });
    };
    const onLeaveMetaChanged = () => {
      loadCurrentLeaveBalanceOverview({ silent: true });
    };
    socket.on('leave:created', onLeaveChanged);
    socket.on('leave:updated', onLeaveChanged);
    socket.on('leave:balance_changed', onLeaveMetaChanged);
    socket.on('leave:policy_changed', onLeaveMetaChanged);
    return () => {
      socket.off('leave:created', onLeaveChanged);
      socket.off('leave:updated', onLeaveChanged);
      socket.off('leave:balance_changed', onLeaveMetaChanged);
      socket.off('leave:policy_changed', onLeaveMetaChanged);
    };
  }, [loadCurrentLeaveBalanceOverview, loadLeaves]);

  useEffect(() => {
    if (!summary?.lateLoginPolicy?.hasApproval) return;

    setSessionError((currentError) => {
      if (!currentError) return null;
      if (/late login|login time exceeded|contact your tl|contact your admin/i.test(currentError)) {
        return null;
      }
      return currentError;
    });
  }, [summary?.lateLoginPolicy?.hasApproval]);

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
        if (data?.lateLoginPolicy) {
          setSummary((prev) => (prev ? { ...prev, lateLoginPolicy: data.lateLoginPolicy } : prev));
        }
        return;
      }
      const session = await res.json();
      setActiveSession(session);
      invalidateApiCache('/attendance');
      loadSummary(range, selectedMonth, { force: true });
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
      invalidateApiCache('/attendance');
      loadSummary(range, selectedMonth, { force: true });
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

  const handleApproveLateLogin = async (empId: string, reason: string) => {
    setLateLoginApprovalLoading(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/late-login/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          empId,
          reason,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          message: data.message || 'Failed to approve late login',
        };
      }

      await Promise.all([
        loadTeamAttendanceSummary({ silent: true }),
        selectedEmployeeEmpId && selectedEmployeeMonth
          ? loadSelectedEmployeeAttendance(selectedEmployeeEmpId, selectedEmployeeMonth, { silent: true })
          : Promise.resolve(),
      ]);

      return {
        ok: true,
        message: data.message || 'Late login access approved for today',
      };
    } catch (error) {
      console.error('Failed to approve late login', error);
      return {
        ok: false,
        message: 'Failed to approve late login',
      };
    } finally {
      setLateLoginApprovalLoading(false);
    }
  };

  const handleRejectLateLogin = async (empId: string, reason: string) => {
    setLateLoginRejectLoading(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/late-login/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          empId,
          reason,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          message: data.message || 'Failed to reject late login',
        };
      }

      await Promise.all([
        loadTeamAttendanceSummary({ silent: true }),
        loadSummary(range, selectedMonth, { silent: true }),
        selectedEmployeeEmpId && selectedEmployeeMonth
          ? loadSelectedEmployeeAttendance(selectedEmployeeEmpId, selectedEmployeeMonth, { silent: true })
          : Promise.resolve(),
      ]);

      return {
        ok: true,
        message: data.message || 'Late login request rejected',
      };
    } catch (error) {
      console.error('Failed to reject late login', error);
      return {
        ok: false,
        message: 'Failed to reject late login',
      };
    } finally {
      setLateLoginRejectLoading(false);
    }
  };

  const handleRequestLateLogin = async (reason: string) => {
    setLateLoginRequestLoading(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/late-login/request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          message: data.message || 'Failed to request late login approval',
        };
      }

      await loadSummary(range, selectedMonth, { silent: true });

      return {
        ok: true,
        message: data.message || 'Late login approval request sent',
      };
    } catch (error) {
      console.error('Failed to request late login approval', error);
      return {
        ok: false,
        message: 'Failed to request late login approval',
      };
    } finally {
      setLateLoginRequestLoading(false);
    }
  };

  const handleUpdateLateLoginCutoff = async () => {
    setLateLoginSettingsSaving(true);
    setLateLoginSettingsMessage(null);

    try {
      const res = await fetch(`${API_BASE}/attendance/late-login/settings`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ time: lateLoginCutoffDraft }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLateLoginSettingsMessage(data.message || 'Failed to update late login cutoff');
        return;
      }

      setLateLoginSettings(data || null);
      setLateLoginCutoffDraft(String(data?.time || lateLoginCutoffDraft));
      setLateLoginSettingsMessage(`Late login cutoff updated to ${data?.cutoffTimeLabel || 'the selected time'}.`);
      setLateLoginSettingsModalOpen(false);

      await Promise.all([
        loadLateLoginSettings({ silent: true }),
        loadSummary(range, selectedMonth, { silent: true }),
        canReviewTeamAttendance ? loadTeamAttendanceSummary({ silent: true }) : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Failed to update late login cutoff', error);
      setLateLoginSettingsMessage('Failed to update late login cutoff');
    } finally {
      setLateLoginSettingsSaving(false);
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
    const hasOwnOpenSession = !!activeSession?.loginTime || !!summary?.days.some((day) => day.sessions.some((session) => !session.logoutTime));
    const hasSelectedEmployeeOpenSession = !!employeeSummary?.days.some((day) => day.sessions.some((session) => !session.logoutTime));
    const hasLiveTeamActivity = !!teamAttendanceSummary?.members?.some(
      (member) => member.status === 'clocked_in' || member.status === 'on_break',
    );
    if (!hasOwnOpenSession && !hasSelectedEmployeeOpenSession && !hasLiveTeamActivity) return undefined;

    setLiveNow(Date.now());
    const timer = window.setInterval(() => {
      setLiveNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeSession?.loginTime, employeeSummary, summary, teamAttendanceSummary]);

  const liveSummary = useMemo(
    () => projectAttendanceSummary(summary, new Date(liveNow)),
    [liveNow, summary],
  );
  const liveEmployeeSummary = useMemo(
    () => projectAttendanceSummary(employeeSummary, new Date(liveNow)),
    [employeeSummary, liveNow],
  );
  const liveTeamAttendanceSummary = useMemo(
    () => projectTeamAttendanceSummary(teamAttendanceSummary, new Date(liveNow), teamAttendanceSummarySnapshotAt),
    [liveNow, teamAttendanceSummary, teamAttendanceSummarySnapshotAt],
  );

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

  const handleLeaveLopAction = async (id: string, action: string, reason?: string) => {
    try {
      const res = await fetch(`${API_BASE}/leaves/${id}/lop-action`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, reason }),
      });
      if (res.ok) {
        await loadLeaves({ silent: true });
      }
    } catch (e) {
      console.error('Failed to apply LOP action', e);
    }
  };

  const todayInfo = useMemo(() => {
    const todayKey = getLocalDateKey(new Date(liveNow));
    const openSessionIsToday =
      !!activeSession?.loginTime && getLocalDateKey(activeSession.loginTime) === todayKey;

    if (!liveSummary) {
      const liveOnlyMinutes = openSessionIsToday && activeSession?.loginTime
        ? getSessionWorkingMinutes(activeSession, new Date(liveNow))
        : 0;
      return { minutes: liveOnlyMinutes, color: getHoursColor(liveOnlyMinutes / 60) };
    }

    const day = liveSummary.days.find((d) => d.date === todayKey);
    if (!day && !openSessionIsToday) return { minutes: 0, color: getHoursColor(0) };

    const summaryMinutes = day?.minutes || 0;
    if (!openSessionIsToday || !activeSession?.loginTime || !summary) {
      return { minutes: summaryMinutes, color: getHoursColor(summaryMinutes / 60) };
    }

    const summaryOpenMinutes = day?.sessions.find((session) => session._id === activeSession._id)?.durationMinutes || 0;
    const elapsedMinutes = getSessionWorkingMinutes(activeSession, new Date(liveNow));
    const completedMinutes = Math.max(0, summaryMinutes - summaryOpenMinutes);
    const liveMinutes = Math.max(summaryMinutes, completedMinutes + elapsedMinutes);

    return { minutes: liveMinutes, color: getHoursColor(liveMinutes / 60) };
  }, [activeSession?._id, activeSession?.loginTime, liveNow, liveSummary, summary]);

  const leaveDaysInRange = useMemo(
    () => countLeaveDaysInRange(myLeaves, liveSummary?.start, liveSummary?.end),
    [liveSummary?.end, liveSummary?.start, myLeaves],
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
    if (!liveEmployeeSummary) return { minutes: 0, color: getHoursColor(0) };
    const todayKey = getLocalDateKey(new Date(liveNow));
    const day = liveEmployeeSummary.days.find((entry) => entry.date === todayKey);
    if (!day) return { minutes: 0, color: getHoursColor(0) };
    return { minutes: day.minutes, color: getHoursColor(day.minutes / 60) };
  }, [liveEmployeeSummary, liveNow]);
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

    const presentDays = liveEmployeeSummary?.days.length ?? 0;
    return {
      present: presentDays,
      absent: Math.max(0, totalWorkingDays - presentDays),
      total: totalWorkingDays,
    };
  }, [liveEmployeeSummary?.days.length, selectedEmployeeMonth]);
  const selectedEmployeeLabel = selectedEmployee
    ? `${selectedEmployee.empName} (${selectedEmployee.empId})`
    : 'Select employee';
  const selectedEmployeeMonthLabel =
    employeeMonthOptions.find((month) => month.value === selectedEmployeeMonth)?.label || 'Select month';
  const attendanceContentWidthClassName = isEmployeePortal ? 'max-w-[1760px]' : 'max-w-6xl';
  const showAttendanceSubnavControls = (isHistoryRoute ? 'attendance' : activeView) === 'attendance';
  const showLeaveSubnavControls = activeView === 'leave' && !isHistoryRoute && !isTeamAttendanceRoute;
  const availableLeaveSections = useMemo<Array<{ id: LeaveSection; label: string }>>(() => {
    const sections: Array<{ id: LeaveSection; label: string }> = [
      { id: 'workspace', label: 'Workspace' },
      { id: 'insights', label: 'Leave Insights' },
    ];
    if (isBackendApproverRole) {
      sections.push({ id: 'policy', label: 'Policy & Balance' });
    }
    return sections;
  }, [isBackendApproverRole]);
  const effectiveLeaveSection = useMemo<LeaveSection>(() => {
    if (leaveSection === 'policy' && !isBackendApproverRole) {
      return 'workspace';
    }
    return leaveSection;
  }, [isBackendApproverRole, leaveSection]);
  useEffect(() => {
    if (activeView !== 'leave') return;
    if (leaveSection !== effectiveLeaveSection) {
      handleLeaveSectionChange(effectiveLeaveSection);
    }
  }, [activeView, effectiveLeaveSection, handleLeaveSectionChange, leaveSection]);
  const currentLateLoginCutoffLabel =
    lateLoginSettings?.cutoffTimeLabel
    || summary?.lateLoginPolicy?.cutoffTimeLabel
    || '1:05 PM';
  const lateHeaderActions =
    activeView === 'late' && isBackendAdminRole ? (
      <div className="flex flex-col items-start gap-2 md:items-end">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Late cutoff
        </span>
        <button
          type="button"
          onClick={() => {
            setLateLoginCutoffDraft(lateLoginSettings?.time || summary?.lateLoginPolicy?.cutoffTimeValue || '13:05');
            setLateLoginSettingsMessage(null);
            setLateLoginSettingsModalOpen(true);
          }}
          disabled={lateLoginSettingsLoading}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-colors hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Clock size={16} />
          <span>{currentLateLoginCutoffLabel}</span>
          <span className="text-slate-400">Edit</span>
        </button>
      </div>
    ) : null;

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-700">
      <PageSectionSubnav
        leading={
          <>
            <span className="h-1.5 w-8 rounded-full bg-brand-red" />
            <span className="truncate text-sm font-medium text-slate-600 sm:text-[15px]">
              {isEmployeePortal ? 'Your Presence Radar' : 'Team Attendance Console'}
            </span>
          </>
        }
        center={
          <>
            <button
              type="button"
              onClick={() => handleActiveViewChange('attendance')}
              className={`border-b-2 px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors sm:text-[12px] ${
                (isHistoryRoute ? 'attendance' : activeView) === 'attendance'
                  ? 'border-brand-red text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Attendance
            </button>
            <button
              type="button"
              onClick={() => handleActiveViewChange('late')}
              className={`border-b-2 px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors sm:text-[12px] ${
                activeView === 'late'
                  ? 'border-brand-red text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Late
            </button>
            <button
              type="button"
              onClick={() => handleActiveViewChange('leave')}
              className={`border-b-2 px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors sm:text-[12px] ${
                (isHistoryRoute ? 'attendance' : activeView) === 'leave'
                  ? 'border-brand-red text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Leave
            </button>
            {hasPermission('EXPENSE_VIEW') && (
              <button
                type="button"
                onClick={() => navigate('/expense-travel')}
                className="border-b-2 border-transparent px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 transition-colors hover:text-slate-900 sm:text-[12px]"
              >
                Expense & Travel
              </button>
            )}
          </>
        }
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <div
              aria-hidden={!showAttendanceSubnavControls}
              className={`flex flex-wrap items-center gap-2 ${
                showAttendanceSubnavControls ? '' : 'invisible pointer-events-none hidden'
              }`}
            >
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setRange('day')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] md:text-[13px] ${
                      range === 'day' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Clock size={13} /> Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setRange('week')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] md:text-[13px] ${
                      range === 'week' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar size={13} /> Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setRange('month')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] md:text-[13px] ${
                      range === 'month' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 size={13} /> Month
                  </button>
                </div>

                <div className="relative" ref={headerMonthPickerRef}>
                  <button
                    type="button"
                    onClick={() => setHeaderMonthPickerOpen((prev) => !prev)}
                    aria-expanded={headerMonthPickerOpen}
                    aria-haspopup="dialog"
                    className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] md:text-[13px] shadow-sm transition-all ${
                      headerMonthPickerOpen || selectedMonth
                        ? 'border-brand-red/20 bg-gradient-to-br from-white via-rose-50 to-slate-50 text-slate-900 shadow-[0_16px_40px_rgba(230,28,33,0.12)]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                      headerMonthPickerOpen || selectedMonth
                        ? 'bg-brand-red text-white shadow-md shadow-brand-red/25'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                    }`}>
                      <Calendar size={13} />
                    </span>
                    <span className="flex flex-col items-start leading-tight">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Timeline
                      </span>
                      <span className="font-semibold text-slate-800">{headerSelectedMonthLabel}</span>
                    </span>
                  </button>

                  {headerMonthPickerOpen && (
                    <div
                      role="dialog"
                      aria-label="Select attendance month"
                      className="absolute right-0 top-[calc(100%+12px)] z-30 w-[320px] overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.2)] ring-1 ring-slate-200/70 backdrop-blur-xl"
                    >
                      <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy px-5 py-4 text-white">
                        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-red/30 blur-2xl" />
                        <div className="absolute -left-6 bottom-0 h-16 w-16 rounded-full bg-white/10 blur-xl" />
                        <div className="relative flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold">{headerVisibleYear}</h3>
                            <p className="text-xs text-white/70">
                              Pick a month to review attendance insights.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setHeaderVisibleYear((year) => year - 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/90 transition hover:bg-white/15"
                              aria-label="Previous year"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setHeaderVisibleYear((year) => year + 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/90 transition hover:bg-white/15"
                              aria-label="Next year"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[radial-gradient(circle_at_top_right,_rgba(230,28,33,0.08),_transparent_40%)] px-4 py-4">
                        <div className="grid grid-cols-4 gap-2">
                          {headerMonthItems.map((month) => {
                            const monthKey = `${headerVisibleYear}-${month.value}`;
                            const isSelected = selectedMonth === monthKey;
                            const isCurrentMonth =
                              headerCurrentDate.getFullYear() === headerVisibleYear &&
                              headerCurrentDate.getMonth() + 1 === Number(month.value);

                            return (
                              <button
                                key={month.value}
                                type="button"
                                onClick={() => handleHeaderMonthSelect(month.value)}
                                className={`relative overflow-hidden rounded-2xl border px-3 py-2 text-center transition-all ${
                                  isSelected
                                    ? 'border-brand-red bg-gradient-to-br from-brand-red to-red-500 text-white shadow-[0_14px_34px_rgba(230,28,33,0.28)]'
                                    : isCurrentMonth
                                      ? 'border-brand-red/25 bg-rose-50 text-slate-900 shadow-sm hover:border-brand-red/35 hover:bg-rose-100'
                                      : 'border-slate-200 bg-white/90 text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <span className="block text-sm font-semibold">{month.label}</span>
                                <span className={`mt-1 block text-[10px] ${
                                  isSelected ? 'text-white/75' : 'text-slate-400'
                                }`}>
                                  {isCurrentMonth ? '' : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMonth('');
                              setHeaderMonthPickerOpen(false);
                            }}
                            className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const thisMonth = `${headerCurrentDate.getFullYear()}-${String(
                                headerCurrentDate.getMonth() + 1,
                              ).padStart(2, '0')}`;
                              setSelectedMonth(thisMonth);
                              setRange('month');
                              setHeaderMonthPickerOpen(false);
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Calendar size={14} />
                            This month
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </div>

            <div
              aria-hidden={!showLeaveSubnavControls}
              className={`flex flex-wrap items-center gap-2 ${
                showLeaveSubnavControls ? '' : 'invisible pointer-events-none hidden'
              }`}
            >
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                {availableLeaveSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => handleLeaveSectionChange(section.id)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold md:px-4 md:text-[13px] ${
                      effectiveLeaveSection === section.id
                        ? 'bg-brand-red text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      />

      <div className={`${attendanceContentWidthClassName} mx-auto space-y-10`}>
      <AttendanceHeader
        activeView={isHistoryRoute ? 'attendance' : activeView}
        subtitle={isEmployeePortal ? 'Your Presence Radar' : 'Team Attendance Console'}
        loading={attendancePageLoading}
        actions={lateHeaderActions}
      />

      {isHistoryRoute ? (
        <AttendanceHistoryPage
          summary={liveSummary}
          range={range}
          selectedMonth={selectedMonth}
          loading={attendancePageLoading}
          portalMode={mode}
          onBack={handleHistoryClose}
        />
      ) : isTeamAttendanceRoute ? (
        <div className="space-y-5">
          <section className="py-1">
            <button
              type="button"
              onClick={handleTeamAttendanceClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Back to attendance
            </button>
          </section>

          <TeamAttendanceSection
            canReviewTeamAttendance={canReviewTeamAttendance}
            canManageLateLogins={canManageLateLogins}
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
            employeeSummary={liveEmployeeSummary}
            employeeAttendanceLoading={employeeAttendanceLoading}
            teamAttendanceSummaryLoading={teamAttendanceSummaryLoading}
            teamAttendanceSummary={liveTeamAttendanceSummary}
            currentViewerEmpId={backendEmpId}
            onRefreshTeamActivity={loadTeamAttendanceSummary}
            selectedEmployeeTodayInfo={selectedEmployeeTodayInfo}
            selectedEmployeeMonthlyAttendance={selectedEmployeeMonthlyAttendance}
            setSelectedEmployeeEmpId={setSelectedEmployeeEmpId}
            setSelectedEmployeeMonth={setSelectedEmployeeMonth}
            onApproveLateLogin={handleApproveLateLogin}
            lateLoginApprovalLoading={lateLoginApprovalLoading}
          />
        </div>
      ) : activeView === 'attendance' ? (
        <AttendanceOverviewGrid
          summary={liveSummary}
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
          teamAttendanceSummary={liveTeamAttendanceSummary}
          currentViewerEmpId={backendEmpId}
          onRefreshTeamActivity={loadTeamAttendanceSummary}
          portalMode={mode}
          onOpenHistory={handleHistoryOpen}
          onOpenTeamAttendance={handleTeamAttendanceOpen}
          lateLoginPolicy={summary?.lateLoginPolicy || null}
          leaveBalanceOverview={leaveBalanceOverview}
        />
      ) : activeView === 'late' ? (
        canReviewTeamAttendance ? (
          <LateAttendanceSection
            canManageLateLogins={canManageLateLogins}
            employeePickerOpen={employeePickerOpen}
            employeePickerRef={employeePickerRef}
            setEmployeePickerOpen={setEmployeePickerOpen}
            employeeOptions={employeeOptions}
            selectedEmployeeEmpId={selectedEmployeeEmpId}
            selectedEmployeeLabel={selectedEmployeeLabel}
            selectedEmployee={selectedEmployee}
            teamAttendanceSummaryLoading={teamAttendanceSummaryLoading}
            teamAttendanceSummary={liveTeamAttendanceSummary}
            setSelectedEmployeeEmpId={setSelectedEmployeeEmpId}
            onRefreshLateActivity={loadTeamAttendanceSummary}
            onApproveLateLogin={handleApproveLateLogin}
            onRejectLateLogin={handleRejectLateLogin}
            lateLoginApprovalLoading={lateLoginApprovalLoading}
            lateLoginRejectLoading={lateLoginRejectLoading}
          />
        ) : (
          <EmployeeLateAttendanceSection
            lateLoginPolicy={summary?.lateLoginPolicy || null}
            lateLoginRecords={summary?.lateLoginRecords || []}
            requestLoading={lateLoginRequestLoading}
            onRequestLateLogin={handleRequestLateLogin}
          />
        )
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
            onLeaveLopAction={handleLeaveLopAction}
            canApplyLeave={!isBackendAdminRole}
            approverLeaves={approverLeaves}
            isAdmin={!!isBackendAdminRole}
            isApproverPortal={isBackendApproverRole}
            viewerRole={leaveViewerRole}
            currentEmployeeId={backendEmpId}
            employeeDirectory={employeeOptions.map((employee) => `${employee.empName} (${employee.empId})`)}
            employeeOptions={employeeOptions}
            currentOverview={leaveBalanceOverview}
            currentOverviewLoading={leaveBalanceLoading}
            activeSection={effectiveLeaveSection}
            loading={leaveLoading && myLeaves.length === 0 && pendingLeaves.length === 0 && approverLeaves.length === 0}
          />
        </div>
      )}

      {lateLoginSettingsModalOpen && isBackendAdminRole ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Late login cutoff
                </p>
                <h4 className="mt-2 text-xl font-semibold text-slate-950">
                  Update login restriction time
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Only admins can change the daily cutoff time for late-login approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLateLoginSettingsModalOpen(false);
                  setLateLoginSettingsMessage(null);
                }}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-[13px] font-semibold text-slate-700">
                Cutoff time
              </span>
              <input
                type="time"
                value={lateLoginCutoffDraft}
                onChange={(event) => setLateLoginCutoffDraft(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/10"
              />
            </label>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Current cutoff: {currentLateLoginCutoffLabel}
            </div>

            {lateLoginSettingsMessage ? (
              <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {lateLoginSettingsMessage}
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setLateLoginSettingsModalOpen(false);
                  setLateLoginSettingsMessage(null);
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleUpdateLateLoginCutoff();
                }}
                disabled={lateLoginSettingsSaving || !lateLoginCutoffDraft}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  lateLoginSettingsSaving || !lateLoginCutoffDraft
                    ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {lateLoginSettingsSaving ? 'Saving...' : 'Update cutoff time'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
};

export default AttendanceView;
