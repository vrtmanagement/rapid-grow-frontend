import { useCallback, useEffect } from 'react';
import { API_BASE, apiGetJson, getAuthHeaders } from '../../config/api';
import { fetchAttendanceBootstrap } from '../../services/bootstrapApi';
import { hasTabEndpointCache } from '../../services/tabSessionCache';
import { fetchLeaveBalanceOverview } from '../../components/attendance/leaveBalanceApi';
import {
  AttendanceEmployeeOption,
  TeamAttendanceSummary,
  getDefaultMonthValue,
} from '../../components/attendance/attendanceViewUtils';
import { getSocket } from '../../realtime/socket';
import {
  AttendanceSession,
  AttendanceSummaryResponse,
  LeaveBalanceOverviewResponse,
  LeaveRequest,
  Range,
} from '../../components/attendance/attendanceUtils';
import type { AttendanceViewState } from './useAttendanceViewState';

export function useAttendanceViewLoaders(state: AttendanceViewState) {
  const {
    range, selectedMonth, setLoading, setSummary, setActiveSession, setMyLeaves, setPendingLeaves,
    setApproverLeaves, setLeaveBalanceOverview, setLeaveInitialLoaded, setTeamAttendanceSummary,
    setTeamAttendanceSummarySnapshotAt, setTeamAttendanceSummaryLoading, setLeaveLoading, setLeaveBalanceLoading,
    setEmployeeOptions, setSelectedEmployeeEmpId, setSelectedEmployeeMonth, setEmployeeSummary,
    setEmployeeAttendanceLoading, isBackendAdminRole, setLateLoginSettings, setLateLoginCutoffDraft,
    setLateLoginSettingsLoading, setLateLoginSettingsModalOpen, setLateLoginSettingsMessage,
    activeView, canReviewTeamAttendance, selectedEmployeeEmpId, selectedEmployeeMonth, backendEmpId,
    isBackendApproverRole, attachEmployeeNames, leaveInitialLoadedRef, summary, setSessionError,
  } = state;

  const applyAttendanceBootstrap = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      const silent = options?.silent === true;
      const force = options?.force === true;
      const bootstrapParams = new URLSearchParams();
      if (range) bootstrapParams.set('range', range);
      if (range === 'month' && selectedMonth) {
        bootstrapParams.set('date', `${selectedMonth}-01`);
      }
      const bootstrapPath = `/attendance/bootstrap${
        bootstrapParams.toString() ? `?${bootstrapParams.toString()}` : ''
      }`;
      const hasCache = !force && hasTabEndpointCache('attendance', bootstrapPath);
      if (!silent && !hasCache) {
        setLoading(true);
      }
  
      try {
        const bootstrap = await fetchAttendanceBootstrap(
          {
            range,
            date: range === 'month' && selectedMonth ? `${selectedMonth}-01` : undefined,
          },
          { force },
        );
  
        const data = bootstrap.summary as AttendanceSummaryResponse;
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
  
        setMyLeaves(Array.isArray(bootstrap.leaves?.myLeaves) ? (bootstrap.leaves.myLeaves as LeaveRequest[]) : []);
        setPendingLeaves(
          Array.isArray(bootstrap.leaves?.pendingLeaves)
            ? (bootstrap.leaves.pendingLeaves as LeaveRequest[])
            : [],
        );
        setApproverLeaves(
          Array.isArray(bootstrap.leaves?.approverLeaves)
            ? (bootstrap.leaves.approverLeaves as LeaveRequest[])
            : [],
        );
        setLeaveBalanceOverview(
          (bootstrap.leaveBalanceOverview as LeaveBalanceOverviewResponse | null) || null,
        );
        setLeaveInitialLoaded(true);
  
        if (bootstrap.canReviewTeamAttendance && bootstrap.teamSummary) {
          const teamData = bootstrap.teamSummary as TeamAttendanceSummary;
          setTeamAttendanceSummary({
            total: Number(teamData.total || 0),
            present: Number(teamData.present || 0),
            absent: Number(teamData.absent || 0),
            clockedIn: Number(teamData.clockedIn || 0),
            onBreak: Number(teamData.onBreak || 0),
            members: Array.isArray(teamData.members) ? teamData.members : [],
            activityLog: Array.isArray(teamData.activityLog) ? teamData.activityLog : [],
            lateLoginRecords: Array.isArray(teamData.lateLoginRecords) ? teamData.lateLoginRecords : [],
          });
          setTeamAttendanceSummarySnapshotAt(Date.now());
        }
  
        if (bootstrap.canReviewTeamAttendance && Array.isArray(bootstrap.members)) {
          const options = bootstrap.members
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
        }
      } catch (error) {
        console.error('Failed to load attendance bootstrap', error);
      } finally {
        if (!silent) {
          setLoading(false);
          setLeaveLoading(false);
          setLeaveBalanceLoading(false);
          setTeamAttendanceSummaryLoading(false);
        }
      }
    },
    [range, selectedMonth],
  );
  
  useEffect(() => {
    void applyAttendanceBootstrap();
  }, [applyAttendanceBootstrap]);
  
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
    const hasCache = !force && hasTabEndpointCache('attendance', summaryPath);
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
    const hasCache = hasTabEndpointCache('attendance', '/attendance/team-summary');
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
  
    loadSelectedEmployeeAttendance(selectedEmployeeEmpId, selectedEmployeeMonth);
  }, [canReviewTeamAttendance, selectedEmployeeEmpId, selectedEmployeeMonth]);
  
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
  

  return {
    applyAttendanceBootstrap,
    loadSummary,
    loadSelectedEmployeeAttendance,
    loadTeamAttendanceSummary,
    loadLateLoginSettings,
    loadCurrentLeaveBalanceOverview,
    loadLeaves,
  };
}

export type AttendanceViewLoaders = ReturnType<typeof useAttendanceViewLoaders>;
