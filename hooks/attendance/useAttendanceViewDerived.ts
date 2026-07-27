import { useCallback, useEffect, useMemo } from 'react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import {
  getHoursColor,
  countLeaveDaysInRange,
  LeaveNotificationItem,
  LeaveRequest,
  projectAttendanceSummary,
  getSessionWorkingMinutes,
} from '../../components/attendance/attendanceUtils';
import {
  getLocalDateKey,
  projectTeamAttendanceSummary,
} from '../../components/attendance/attendanceViewUtils';
import type { LeaveSection } from './attendanceViewTypes';
import type { AttendanceViewState } from './useAttendanceViewState';
import type { AttendanceViewLoaders } from './useAttendanceViewLoaders';
import type { AttendanceViewActions } from './useAttendanceViewActions';

export function useAttendanceViewDerived(
  state: AttendanceViewState,
  loaders: AttendanceViewLoaders,
  _actions: AttendanceViewActions,
) {
  const {
    summary, liveNow, employeeSummary, teamAttendanceSummary, teamAttendanceSummarySnapshotAt,
    leaveStart, leaveEnd, leaveReason, leaveType, setLeaveStart, setLeaveEnd, setLeaveReason, setLeaveType,
    setHalfDayRequestLoading, myLeaves, pendingLeaves, getLeaveActorProfile, formatLeaveActorHeading,
    formatLeaveActorMeta, clearedLeaveNotificationIds, readLeaveNotificationIds, setReadLeaveNotificationIds,
    setClearedLeaveNotificationIds, leaveInitialLoaded, leaveLoading, loading, employeeOptions,
    selectedEmployeeEmpId, selectedEmployeeMonth, isEmployeePortal, isHistoryRoute, activeView,
    isTeamAttendanceRoute, leaveSection, handleLeaveSectionChange, lateLoginSettings,
    activeSession, isBackendAdminRole, isBackendApproverRole,
  } = state;
  const { loadLeaves } = loaders;

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
    return sections;
  }, []);
  const effectiveLeaveSection = useMemo<LeaveSection>(() => {
    if (leaveSection === 'policy') {
      return 'workspace';
    }
    return leaveSection;
  }, [leaveSection]);
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

  return {
    liveSummary,
    liveEmployeeSummary,
    liveTeamAttendanceSummary,
    handleApplyLeave,
    handleQuickHalfDayRequest,
    handleRevertQuickHalfDayRequest,
    handleDeleteLeave,
    handleLeaveAction,
    handleLeaveLopAction,
    todayInfo,
    leaveDaysInRange,
    todaysHalfDayRequest,
    todayHalfDayActivityRequest,
    leaveNotifications,
    unreadLeaveNotificationCount,
    markLeaveNotificationsRead,
    handleOpenLeaveNotifications,
    handleNotificationClick,
    handleClearLeaveNotifications,
    attendancePageLoading,
    selectedEmployee,
    employeeMonthOptions,
    selectedEmployeeTodayInfo,
    selectedEmployeeMonthlyAttendance,
    selectedEmployeeLabel,
    selectedEmployeeMonthLabel,
    attendanceContentWidthClassName,
    showAttendanceSubnavControls,
    showLeaveSubnavControls,
    availableLeaveSections,
    effectiveLeaveSection,
    currentLateLoginCutoffLabel,
  };
}

export type AttendanceViewDerived = ReturnType<typeof useAttendanceViewDerived>;
