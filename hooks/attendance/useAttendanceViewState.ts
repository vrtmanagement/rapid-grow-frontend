import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiGetJson } from '../../config/api';
import {
  AttendanceEmployeeOption,
  LeaveActorProfile,
  TeamAttendanceSummary,
  readStoredLeaveNotificationState,
  parseAttendanceBackendContext,
} from '../../components/attendance/attendanceViewUtils';
import { usePermissions } from '../../context/usePermissions';
import {
  AttendanceSession,
  LateLoginSettings,
  AttendanceSummaryResponse,
  LeaveBalanceOverviewResponse,
  LeaveRequest,
  Range,
} from '../../components/attendance/attendanceUtils';
import type { AttendancePortalMode, LeaveSection } from './attendanceViewTypes';

export function useAttendanceViewState(mode: AttendancePortalMode = 'manager') {
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'attendance' | 'leave' | 'late' | 'reports'>(() => {
    const params = new URLSearchParams(location.search || '');
    const routeView = params.get('view');
    return routeView === 'leave' || routeView === 'late' || routeView === 'reports'
      ? routeView
      : 'attendance';
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
    setActiveView(
      routeView === 'leave' || routeView === 'late' || routeView === 'reports'
        ? routeView
        : 'attendance',
    );
  
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
  
  const handleActiveViewChange = useCallback((nextView: 'attendance' | 'leave' | 'late' | 'reports') => {
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
  

  return {
    mode,
    hasPermission,
    location,
    navigate,
    activeView,
    setActiveView,
    range,
    setRange,
    selectedMonth,
    setSelectedMonth,
    leaveSection,
    setLeaveSection,
    summary,
    setSummary,
    loading,
    setLoading,
    locationInput,
    setLocationInput,
    activeSession,
    setActiveSession,
    leaveStart,
    setLeaveStart,
    leaveEnd,
    setLeaveEnd,
    leaveReason,
    setLeaveReason,
    leaveType,
    setLeaveType,
    myLeaves,
    setMyLeaves,
    pendingLeaves,
    setPendingLeaves,
    approverLeaves,
    setApproverLeaves,
    leaveLoading,
    setLeaveLoading,
    leaveBalanceOverview,
    setLeaveBalanceOverview,
    leaveBalanceLoading,
    setLeaveBalanceLoading,
    leaveInitialLoaded,
    setLeaveInitialLoaded,
    loginLoading,
    setLoginLoading,
    breakLoading,
    setBreakLoading,
    logoutLoading,
    setLogoutLoading,
    halfDayRequestLoading,
    setHalfDayRequestLoading,
    sessionError,
    setSessionError,
    employeeOptions,
    setEmployeeOptions,
    employeeSummary,
    setEmployeeSummary,
    selectedEmployeeEmpId,
    setSelectedEmployeeEmpId,
    selectedEmployeeMonth,
    setSelectedEmployeeMonth,
    employeeAttendanceLoading,
    setEmployeeAttendanceLoading,
    teamAttendanceSummary,
    setTeamAttendanceSummary,
    teamAttendanceSummarySnapshotAt,
    setTeamAttendanceSummarySnapshotAt,
    teamAttendanceSummaryLoading,
    setTeamAttendanceSummaryLoading,
    lateLoginApprovalLoading,
    setLateLoginApprovalLoading,
    lateLoginRejectLoading,
    setLateLoginRejectLoading,
    lateLoginRequestLoading,
    setLateLoginRequestLoading,
    lateLoginSettings,
    setLateLoginSettings,
    lateLoginSettingsLoading,
    setLateLoginSettingsLoading,
    lateLoginSettingsSaving,
    setLateLoginSettingsSaving,
    lateLoginSettingsModalOpen,
    setLateLoginSettingsModalOpen,
    lateLoginCutoffDraft,
    setLateLoginCutoffDraft,
    lateLoginSettingsMessage,
    setLateLoginSettingsMessage,
    employeePickerOpen,
    setEmployeePickerOpen,
    monthPickerOpen,
    setMonthPickerOpen,
    headerMonthPickerOpen,
    setHeaderMonthPickerOpen,
    liveNow,
    setLiveNow,
    employeePickerRef,
    monthPickerRef,
    headerMonthPickerRef,
    leaveInitialLoadedRef,
    isEmployeePortal,
    isHistoryRoute,
    isTeamAttendanceRoute,
    backendEmpId,
    isBackendAdminRole,
    isBackendApproverRole,
    leaveViewerRole,
    leaveNotificationStorageKey,
    clearedLeaveNotificationStorageKey,
    readLeaveNotificationIds,
    setReadLeaveNotificationIds,
    clearedLeaveNotificationIds,
    setClearedLeaveNotificationIds,
    canReviewTeamAttendance,
    canManageLateLogins,
    headerCurrentDate,
    parsedHeaderSelectedMonth,
    headerVisibleYear,
    setHeaderVisibleYear,
    headerMonthItems,
    headerSelectedMonthLabel,
    buildAttendanceRoute,
    handleHeaderMonthSelect,
    handleHistoryOpen,
    handleHistoryClose,
    handleTeamAttendanceOpen,
    handleTeamAttendanceClose,
    handleActiveViewChange,
    handleLeaveSectionChange,
    employeeProfileByEmpId,
    getLeaveActorProfile,
    formatLeaveActorHeading,
    formatLeaveActorMeta,
    attachEmployeeNames,
  };
}

export type AttendanceViewState = ReturnType<typeof useAttendanceViewState>;
