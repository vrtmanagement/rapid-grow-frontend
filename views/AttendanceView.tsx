import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import AttendanceHeader from '../components/attendance/AttendanceHeader';
import AttendanceSummaryCards from '../components/attendance/AttendanceSummaryCards';
import AttendancePresenceChart from '../components/attendance/AttendancePresenceChart';
import AttendanceLiveSession from '../components/attendance/AttendanceLiveSession';
import AttendanceLeavePanel from '../components/attendance/AttendanceLeavePanel';
import AttendanceHistoryModal from '../components/attendance/AttendanceHistoryModal';
import { getSocket } from '../realtime/socket';
import {
  AttendanceSession,
  AttendanceSummaryResponse,
  LeaveRequest,
  Range,
  getHoursColor,
  countLeaveDaysInRange,
} from '../components/attendance/attendanceUtils';

interface Props {
  mode?: 'manager' | 'employee';
}

const AttendanceView: React.FC<Props> = ({ mode = 'manager' }) => {
  const [range, setRange] = useState<Range>('day');
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const isEmployeePortal = mode === 'employee';

  const rawAdmin = typeof window !== 'undefined' ? localStorage.getItem('rapidgrow-admin') : null;
  let backendRole: string | null = null;
  if (rawAdmin) {
    try {
      const parsed = JSON.parse(rawAdmin);
      backendRole = parsed?.employee?.role || null;
    } catch {
      backendRole = null;
    }
  }

  const isBackendAdminRole = backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const loadSummary = async (selectedRange: Range) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('range', selectedRange);
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

  const loadLeaves = async () => {
    setLeaveLoading(true);
    try {
      const headers = getAuthHeaders();
      const myRes = await fetch(`${API_BASE}/leaves/me`, { headers });
      if (myRes.ok) {
        const data = await myRes.json();
        setMyLeaves(Array.isArray(data) ? data : []);
      }
      const pendingRes = await fetch(`${API_BASE}/leaves/pending`, { headers });
      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingLeaves(Array.isArray(data) ? data : []);
      }
      const approverRes = await fetch(`${API_BASE}/leaves/for-approver`, {
        headers,
      });
      if (approverRes.ok) {
        const data = await approverRes.json();
        setApproverLeaves(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to load leaves', e);
    } finally {
      setLeaveLoading(false);
    }
  };

  useEffect(() => {
    loadSummary(range);
    loadLeaves();
  }, [range]);

  useEffect(() => {
    const socket = getSocket();
    const onLeaveChanged = () => {
      loadLeaves();
    };
    socket.on('leave:created', onLeaveChanged);
    socket.on('leave:updated', onLeaveChanged);
    return () => {
      socket.off('leave:created', onLeaveChanged);
      socket.off('leave:updated', onLeaveChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleApplyLeave = async () => {
    if (!leaveStart || !leaveEnd) return;
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
        loadLeaves();
      }
    } catch (e) {
      console.error('Failed to apply for leave', e);
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
        loadLeaves();
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

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <AttendanceHeader
        range={range}
        onRangeChange={(r) => setRange(r)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        subtitle={isEmployeePortal ? 'Your Presence Radar' : 'Team Attendance Console'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <AttendanceSummaryCards
            summary={summary}
            range={range}
            todayMinutes={todayInfo.minutes}
            todayColor={todayInfo.color}
            leaveDaysInRange={leaveDaysInRange}
          />
          <AttendancePresenceChart summary={summary} loading={loading} />
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
          />
          <AttendanceLeavePanel
            leaveStart={leaveStart}
            leaveEnd={leaveEnd}
            leaveReason={leaveReason}
            leaveType={leaveType}
            onChangeStart={setLeaveStart}
            onChangeEnd={setLeaveEnd}
            onChangeReason={setLeaveReason}
            onChangeType={setLeaveType}
            onApply={handleApplyLeave}
            myLeaves={myLeaves}
            pendingLeaves={pendingLeaves}
            leaveLoading={leaveLoading}
            onLeaveAction={handleLeaveAction}
            canApplyLeave={!isBackendAdminRole}
            approverLeaves={approverLeaves}
            isAdmin={!!isBackendAdminRole}
          />
        </div>
      </div>

      <AttendanceHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        summary={summary}
      />
    </div>
  );
};

export default AttendanceView;

