import { useEffect } from 'react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { invalidateApiCache } from '../../services/apiCache';
import {
  getLocalDateKey,
  getBrowserGeolocationDescription,
} from '../../components/attendance/attendanceViewUtils';
import type { AttendanceViewState } from './useAttendanceViewState';
import type { AttendanceViewLoaders } from './useAttendanceViewLoaders';

export function useAttendanceViewActions(state: AttendanceViewState, loaders: AttendanceViewLoaders) {
  const {
    locationInput, setLocationInput, setLoginLoading, setSessionError, setActiveSession, setSummary,
    range, selectedMonth, setLogoutLoading, setBreakLoading, setLateLoginApprovalLoading,
    selectedEmployeeEmpId, selectedEmployeeMonth, setLateLoginRejectLoading, setLateLoginRequestLoading,
    setLateLoginSettingsSaving, setLateLoginSettingsMessage, lateLoginCutoffDraft, setLateLoginSettings,
    setLateLoginCutoffDraft, setLateLoginSettingsModalOpen, canReviewTeamAttendance, activeSession,
    setLiveNow, summary, employeeSummary, teamAttendanceSummary,
  } = state;
  const {
    loadSummary, loadSelectedEmployeeAttendance, loadTeamAttendanceSummary, loadLateLoginSettings,
  } = loaders;

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
  

  return {
    handleLogin,
    handleLogout,
    postAttendanceActionWithFallback,
    handleStartBreak,
    handleResumeBreak,
    handleApproveLateLogin,
    handleRejectLateLogin,
    handleRequestLateLogin,
    handleUpdateLateLoginCutoff,
  };
}

export type AttendanceViewActions = ReturnType<typeof useAttendanceViewActions>;
