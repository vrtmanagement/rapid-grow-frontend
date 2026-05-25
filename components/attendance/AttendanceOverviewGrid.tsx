import React from 'react';
import {
  AttendanceDay,
  AttendanceSession,
  AttendanceSummaryResponse,
  LeaveRequest,
  Range,
  formatMinutes,
  getBadgeColorsByMinutes,
  getHoursColor,
} from './attendanceUtils';
import AttendanceSummaryCards from './AttendanceSummaryCards';
import AttendancePresenceChart from './AttendancePresenceChart';
import AttendanceLiveSession from './AttendanceLiveSession';
import AttendanceQuickRequestCard from './AttendanceQuickRequestCard';
import {
  resolveAttendanceLocationLabel,
  type TeamAttendanceActivityType,
  type TeamAttendanceLogEntry,
  type TeamAttendanceMemberActivity,
  type TeamAttendanceSummary,
} from './attendanceViewUtils';
import { Check, Coffee, LogIn, LogOut, Play, RefreshCw, X } from 'lucide-react';

interface AttendanceOverviewGridProps {
  summary: AttendanceSummaryResponse | null;
  range: Range;
  todayMinutes: number;
  todayColor: string;
  leaveDaysInRange: number;
  attendancePageLoading: boolean;
  selectedMonth: string;
  activeSession: AttendanceSession | null;
  locationInput: string;
  onLocationChange: (value: string) => void;
  onLogin: () => void;
  onStartBreak: () => void;
  onResumeBreak: () => void;
  onLogout: () => void;
  loginLoading: boolean;
  breakLoading: boolean;
  logoutLoading: boolean;
  onQuickHalfDayRequest: (
    dayPortion: 'FIRST_HALF' | 'SECOND_HALF',
    reason: string,
  ) => Promise<{ ok: boolean; message: string }>;
  onRevertHalfDayRequest: (request: LeaveRequest) => Promise<{ ok: boolean; message: string }>;
  halfDayRequestLoading: boolean;
  todaysHalfDayRequest: LeaveRequest | null;
  todayHalfDayActivityRequest: LeaveRequest | null;
  sessionError: string | null;
  canReviewTeamAttendance: boolean;
  teamAttendanceSummaryLoading: boolean;
  teamAttendanceSummary: TeamAttendanceSummary | null;
  currentViewerEmpId: string;
  onRefreshTeamActivity: () => void;
  portalMode: 'employee' | 'manager';
  onOpenHistory: () => void;
  onOpenTeamAttendance: () => void;
}

const AttendanceOverviewGrid: React.FC<AttendanceOverviewGridProps> = ({
  summary,
  range,
  todayMinutes,
  todayColor,
  leaveDaysInRange,
  attendancePageLoading,
  selectedMonth,
  activeSession,
  locationInput,
  onLocationChange,
  onLogin,
  onStartBreak,
  onResumeBreak,
  onLogout,
  loginLoading,
  breakLoading,
  logoutLoading,
  onQuickHalfDayRequest,
  onRevertHalfDayRequest,
  halfDayRequestLoading,
  todaysHalfDayRequest,
  todayHalfDayActivityRequest,
  sessionError,
  canReviewTeamAttendance,
  teamAttendanceSummaryLoading,
  teamAttendanceSummary,
  currentViewerEmpId,
  onRefreshTeamActivity,
  portalMode,
  onOpenHistory,
  onOpenTeamAttendance,
}) => {
  const isEmployeePortal = portalMode === 'employee';
  const isManagerPortal = portalMode === 'manager';
  const DURATION_PROGRESS_MAX_HOURS = 10;
  const breakStatusColors = React.useMemo(
    () => ({ bg: '#fef3c7', text: '#b45309', solid: '#fbbf24' }),
    [],
  );
  const [teamActivityNow, setTeamActivityNow] = React.useState(() => Date.now());
  const teamActivityMembers = React.useMemo(() => teamAttendanceSummary?.members ?? [], [teamAttendanceSummary?.members]);
  const teamActivityEntries = React.useMemo(() => teamAttendanceSummary?.activityLog ?? [], [teamAttendanceSummary?.activityLog]);
  const teamClockedInCount = React.useMemo(
    () => teamAttendanceSummary?.clockedIn ?? teamActivityMembers.filter((member) => member.status === 'clocked_in').length,
    [teamActivityMembers, teamAttendanceSummary?.clockedIn],
  );
  const teamOnBreakCount = React.useMemo(
    () => teamAttendanceSummary?.onBreak ?? teamActivityMembers.filter((member) => member.status === 'on_break').length,
    [teamActivityMembers, teamAttendanceSummary?.onBreak],
  );
  const teamInactiveCount = React.useMemo(
    () => Math.max(0, (teamAttendanceSummary?.total ?? teamActivityMembers.length) - teamClockedInCount - teamOnBreakCount),
    [teamActivityMembers.length, teamAttendanceSummary?.total, teamClockedInCount, teamOnBreakCount],
  );
  const teamPresenceRate = React.useMemo(() => {
    const total = teamAttendanceSummary?.total ?? teamActivityMembers.length;
    if (!total) return 0;
    return Math.round(((teamClockedInCount + teamOnBreakCount) / total) * 100);
  }, [teamActivityMembers.length, teamAttendanceSummary?.total, teamClockedInCount, teamOnBreakCount]);
  const teamActivityMemberByEmpId = React.useMemo(
    () => new Map(teamActivityMembers.map((member) => [member.empId, member])),
    [teamActivityMembers],
  );
  const recordsByDate = React.useMemo(
    () => new Map((summary?.days ?? []).map((day) => [day.date, day])),
    [summary?.days],
  );

  React.useEffect(() => {
    const hasManagerBreakTimer = isManagerPortal && canReviewTeamAttendance && teamOnBreakCount > 0;
    const hasEmployeeBreakTimer = isEmployeePortal && !!activeSession?.isOnBreak && !!activeSession?.currentBreakStartedAt;
    if (!hasManagerBreakTimer && !hasEmployeeBreakTimer) return undefined;

    const timer = window.setInterval(() => {
      setTeamActivityNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeSession?.currentBreakStartedAt, activeSession?.isOnBreak, canReviewTeamAttendance, isEmployeePortal, isManagerPortal, teamOnBreakCount]);

  const sortedDaysDesc = React.useMemo(
    () => [...(summary?.days ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [summary?.days],
  );

  const displayRows = React.useMemo(() => sortedDaysDesc.slice(0, 6), [sortedDaysDesc]);
  const [resolvedRowLocations, setResolvedRowLocations] = React.useState<Record<string, string>>({});

  const getAttendanceTimezoneDate = React.useCallback((value?: string | Date) => {
    const parsed = value ? new Date(value) : new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
    const parts = formatter.formatToParts(parsed);
    const year = Number(parts.find((part) => part.type === 'year')?.value || 0);
    const month = Number(parts.find((part) => part.type === 'month')?.value || 0);
    const day = Number(parts.find((part) => part.type === 'day')?.value || 0);
    return new Date(year, month - 1, day);
  }, []);

  const lastSevenDays = React.useMemo(() => {
    const today = getAttendanceTimezoneDate();
    const dayOfWeek = today.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diffToMonday);
    const items: Array<{ key: string; date: Date; record?: AttendanceDay; weekend: boolean }> = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + offset);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      items.push({
        key,
        date,
        record: recordsByDate.get(key),
        weekend: date.getDay() === 0,
      });
    }
    return items;
  }, [getAttendanceTimezoneDate, recordsByDate]);

  const formatSessionTime = React.useCallback((value?: string | Date | null) => {
    if (!value) return '--';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';
    return parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  }, []);

  const todayActivityKey = React.useMemo(() => {
    const today = getAttendanceTimezoneDate();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, [getAttendanceTimezoneDate]);

  const todayActivitySessions = React.useMemo(() => {
    const sourceSessions = [...(recordsByDate.get(todayActivityKey)?.sessions || [])];
    if (!activeSession?._id) {
      return sourceSessions;
    }

    const sessionIndex = sourceSessions.findIndex((session) => session._id === activeSession._id);
    if (sessionIndex >= 0) {
      sourceSessions[sessionIndex] = activeSession;
      return sourceSessions;
    }

    return [...sourceSessions, activeSession];
  }, [activeSession, recordsByDate, todayActivityKey]);

  const getHalfDayActivityLabel = React.useCallback((value?: string | null) => {
    return value === 'SECOND_HALF' ? 'Second Half' : value === 'FIRST_HALF' ? 'First Half' : 'Half-day';
  }, []);

  const todayActivityEvents = React.useMemo(() => {
    const sourceSessions = todayActivitySessions;
    const leaveEvents: Array<{
      id: string;
      title: string;
      detail: string;
      occurredAt: number;
      breakDurationSeconds?: number;
      icon: 'login' | 'break' | 'resume' | 'logout' | 'leave-approved' | 'leave-pending' | 'leave-rejected';
    }> = [];

    if (todayHalfDayActivityRequest) {
      const activityTimestamp = todayHalfDayActivityRequest.status === 'PENDING'
        ? todayHalfDayActivityRequest.createdAt
        : todayHalfDayActivityRequest.decidedAt || todayHalfDayActivityRequest.createdAt;
      const activityDate = new Date(activityTimestamp);

      if (!Number.isNaN(activityDate.getTime())) {
        const slotLabel = getHalfDayActivityLabel(todayHalfDayActivityRequest.dayPortion);
        const requestStatus = todayHalfDayActivityRequest.status.toLowerCase();

        leaveEvents.push({
          id: `${todayHalfDayActivityRequest._id}-${todayHalfDayActivityRequest.status}`,
          title:
            todayHalfDayActivityRequest.status === 'APPROVED'
              ? 'Half-day approved'
              : todayHalfDayActivityRequest.status === 'REJECTED'
                ? 'Half-day rejected'
                : 'Half-day pending',
          detail:
            todayHalfDayActivityRequest.status === 'PENDING'
              ? `${slotLabel} request is pending approval`
              : `${slotLabel} request was ${requestStatus}`,
          occurredAt: activityDate.getTime(),
          icon:
            todayHalfDayActivityRequest.status === 'APPROVED'
              ? 'leave-approved'
              : todayHalfDayActivityRequest.status === 'REJECTED'
                ? 'leave-rejected'
                : 'leave-pending',
        });
      }
    }

    return [...leaveEvents, ...sourceSessions
      .flatMap((session) => {
        const sessionEvents: Array<{
          id: string;
          title: string;
          detail: string;
          occurredAt: number;
          breakDurationSeconds?: number;
          icon: 'login' | 'break' | 'resume' | 'logout' | 'leave-approved' | 'leave-pending' | 'leave-rejected';
        }> = [];

        const loginDate = new Date(session.loginTime);
        if (!Number.isNaN(loginDate.getTime())) {
          sessionEvents.push({
            id: `${session._id}-login`,
            title: 'Checked in',
            detail: `Logged in at ${formatSessionTime(session.loginTime)}`,
            occurredAt: loginDate.getTime(),
            icon: 'login',
          });
        }

        (session.breaks || []).forEach((pause, index) => {
          const pauseStart = pause?.startTime ? new Date(pause.startTime) : null;
          const pauseEnd = pause?.endTime ? new Date(pause.endTime) : null;
          if (pauseStart && !Number.isNaN(pauseStart.getTime())) {
            const breakDurationSeconds =
              pauseEnd && !Number.isNaN(pauseEnd.getTime()) && pauseEnd.getTime() > pauseStart.getTime()
                ? Math.max(0, Math.floor((pauseEnd.getTime() - pauseStart.getTime()) / 1000))
                : undefined;
            sessionEvents.push({
              id: `${session._id}-break-${index}-start`,
              title: 'Break started',
              detail: `Break started at ${formatSessionTime(pause.startTime)}`,
              occurredAt: pauseStart.getTime(),
              breakDurationSeconds,
              icon: 'break',
            });
          }

          if (pauseEnd && !Number.isNaN(pauseEnd.getTime())) {
            sessionEvents.push({
              id: `${session._id}-break-${index}-resume`,
              title: 'Work resumed',
              detail: `Resumed at ${formatSessionTime(pause.endTime)}`,
              occurredAt: pauseEnd.getTime(),
              icon: 'resume',
            });
          }
        });

        const sessionEnd = session.effectiveLogoutTime || session.logoutTime;
        if (session.logoutTime && sessionEnd) {
          const logoutDate = new Date(sessionEnd);
          if (!Number.isNaN(logoutDate.getTime())) {
            sessionEvents.push({
              id: `${session._id}-logout`,
              title: 'Checked out',
              detail: `Logged out at ${formatSessionTime(sessionEnd)}`,
              occurredAt: logoutDate.getTime(),
              icon: 'logout',
            });
          }
        }

        return sessionEvents;
      })]
      .sort((a, b) => b.occurredAt - a.occurredAt);
  }, [formatSessionTime, getHalfDayActivityLabel, todayActivitySessions, todayHalfDayActivityRequest]);

  const getTodayActivityIcon = React.useCallback((icon: 'login' | 'break' | 'resume' | 'logout' | 'leave-approved' | 'leave-pending' | 'leave-rejected') => {
    if (icon === 'login') return <LogIn size={14} className="text-emerald-600" />;
    if (icon === 'break') return <Coffee size={14} className="text-amber-500" />;
    if (icon === 'resume') return <Play size={14} className="text-sky-600" />;
    if (icon === 'leave-approved') return <Check size={14} className="text-emerald-600" />;
    if (icon === 'leave-pending') return <Coffee size={14} className="text-amber-500" />;
    if (icon === 'leave-rejected') return <X size={14} className="text-rose-500" />;
    return <LogOut size={14} className="text-rose-500" />;
  }, []);

  const formatTeamSnapshotTime = React.useCallback((value?: string | null) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  }, []);

  const getTeamMemberInitials = React.useCallback((name: string) => {
    const tokens = String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (!tokens.length) return 'NA';
    return tokens.map((token) => token[0]?.toUpperCase() || '').join('');
  }, []);

  const getTeamActivityStatusMeta = React.useCallback((activityType: TeamAttendanceActivityType, status: TeamAttendanceLogEntry['status']) => {
    if (activityType === 'checked_in') {
      return {
        label: 'Logged in',
        chipClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
        dotClass: 'bg-emerald-500',
      };
    }
    if (activityType === 'break_started') {
      return {
        label: 'Break started',
        chipClass: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100',
        dotClass: 'bg-amber-500',
      };
    }
    if (activityType === 'work_resumed') {
      return {
        label: 'Work resumed',
        chipClass: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100',
        dotClass: 'bg-sky-500',
      };
    }
    if (activityType === 'checked_out' || status === 'checked_out') {
      return {
        label: 'Logged out',
        chipClass: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
        dotClass: 'bg-slate-400',
      };
    }
    return {
      label: 'Logged out',
      chipClass: 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200',
      dotClass: 'bg-slate-300',
    };
  }, []);

  const getCurrentViewerActivityMeta = React.useCallback((empId?: string) => {
    if (!isManagerPortal || !currentViewerEmpId || !empId || currentViewerEmpId !== empId) {
      return null;
    }

    return {
      label: 'You',
      className: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100',
    };
  }, [currentViewerEmpId, isManagerPortal]);

  const formatTeamActivityDuration = React.useCallback((totalSeconds: number) => {
    const safeSeconds = Math.max(0, totalSeconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    }
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }, []);

  const weeklyTotals = React.useMemo(() => {
    const totalMinutes = lastSevenDays.reduce((total, item) => total + (item.record?.minutes || 0), 0);
    const workDays = lastSevenDays.filter((item) => !item.weekend).length;
    const targetMinutes = workDays * 9 * 60;
    const progress = targetMinutes ? Math.min(100, Math.round((totalMinutes / targetMinutes) * 100)) : 0;

    return {
      totalMinutes,
      targetMinutes,
      progress,
      remainingMinutes: Math.max(0, targetMinutes - totalMinutes),
    };
  }, [lastSevenDays]);

  const formatDayLabel = React.useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions) =>
      date.toLocaleDateString('en-US', {
        timeZone: 'Asia/Kolkata',
        ...options,
      }),
    [],
  );

  const resolveRowMeta = React.useCallback((day: AttendanceDay) => {
    const sortedSessions = [...(day.sessions || [])].sort((a, b) => (
      new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime()
    ));
    const firstSession = sortedSessions[0];
    const lastSession = sortedSessions[sortedSessions.length - 1];
    const isOpenSession = !!lastSession && !lastSession.logoutTime;
    const isBreakSession = isOpenSession && !!lastSession?.isOnBreak;
    const badge = isBreakSession ? breakStatusColors : getBadgeColorsByMinutes(day.minutes);
    const hours = day.minutes / 60;
    const status = isBreakSession
      ? 'On break'
      : isOpenSession
        ? 'In progress'
      : hours >= 8
        ? 'Present'
        : hours >= 7.5
          ? 'Half day'
          : 'Under target';

    return {
      firstSession,
      lastSession,
      isBreakSession,
      isOpenSession,
      badge,
      status,
      location: firstSession?.location || lastSession?.location || 'Not set',
    };
  }, [breakStatusColors]);

  const getDurationProgressWidth = React.useCallback((minutes: number) => {
    const hours = minutes / 60;
    return Math.max(0, Math.min(100, (hours / DURATION_PROGRESS_MAX_HOURS) * 100));
  }, []);

  const formatAttendanceLogDuration = React.useCallback((minutes: number) => {
    const safeMinutes = Math.max(0, Math.round(minutes));
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    if (hours === 0) return `${remainingMinutes}m`;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  }, []);

  React.useEffect(() => {
    if (displayRows.length === 0) return undefined;

    let cancelled = false;
    const run = async () => {
      const entries = await Promise.all(
        displayRows.map(async (day) => {
          const meta = resolveRowMeta(day);
          const label = await resolveAttendanceLocationLabel(meta.location);
          return [day.date, label] as const;
        }),
      );

      if (!cancelled) {
        setResolvedRowLocations(Object.fromEntries(entries));
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [displayRows, resolveRowMeta]);

  if (isEmployeePortal || isManagerPortal) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <AttendanceSummaryCards
              summary={summary}
              range={range}
              todayMinutes={todayMinutes}
              todayColor={todayColor}
              leaveDaysInRange={leaveDaysInRange}
              selectedMonthLabel={selectedMonth ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : ''}
              onOpenHistory={onOpenHistory}
              variant="employee"
              loading={attendancePageLoading}
            />
            <AttendancePresenceChart
              summary={summary}
              loading={attendancePageLoading}
              selectedMonth={selectedMonth}
              range={range}
              variant="employee"
              todayMinutes={todayMinutes}
            />

            <div className="rounded-[34px] border border-slate-200 bg-white p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-[1.15rem] font-semibold leading-none text-slate-950">Week at a glance</h4>
                  <p className="mt-2 text-sm text-slate-500">
                    {lastSevenDays.length
                      ? `${formatDayLabel(lastSevenDays[0].date, { month: 'short', day: 'numeric' })} - ${formatDayLabel(lastSevenDays[lastSevenDays.length - 1].date, { month: 'short', day: 'numeric' })}`
                      : 'Current week snapshot'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(#10b981 ${weeklyTotals.progress}%, #e2e8f0 ${weeklyTotals.progress}% 100%)`,
                      }}
                    />
                    <div className="absolute inset-[5px] rounded-full bg-white" />
                    <span className="relative text-xs font-semibold text-slate-700">{weeklyTotals.progress}%</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-slate-900">{(weeklyTotals.totalMinutes / 60).toFixed(1)}h</p>
                    <p className="text-sm text-slate-500">of {(weeklyTotals.targetMinutes / 60).toFixed(0)}h</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                {lastSevenDays.map((item) => {
                  const minutes = item.record?.minutes || 0;
                  const hours = minutes / 60;
                  const openSession = (item.record?.sessions || []).find((session) => !session.logoutTime);
                  const isOpenSession = !!openSession;
                  const isBreakSession = !!openSession?.isOnBreak;
                  const hasAttendance = minutes > 0 || isOpenSession;
                  const badgeColors = isBreakSession
                    ? breakStatusColors
                    : hasAttendance
                    ? getBadgeColorsByMinutes(minutes)
                    : item.weekend
                      ? { bg: '#eef2f7', text: '#64748b' }
                      : { bg: '#e2e8f0', text: '#64748b' };
                  const label = hasAttendance
                    ? `${hours.toFixed(1)}h`
                    : item.weekend
                      ? 'Off'
                      : 'Absent';
                  const stateLabel = hasAttendance
                    ? isBreakSession
                      ? 'On break'
                      : isOpenSession
                        ? 'Active'
                      : hours >= 8
                        ? 'Full day'
                        : 'Short'
                    : item.weekend
                      ? 'Weekend'
                      : 'Absent';

                  return (
                    <div key={item.key} className="text-center">
                      <p className="text-xs font-semibold text-slate-400">
                        {formatDayLabel(item.date, { weekday: 'short' })}
                      </p>
                      <div
                        className="mt-3 rounded-[18px] px-2 py-4"
                        style={{ backgroundColor: badgeColors.bg, color: badgeColors.text }}
                      >
                        <p className="text-[0.95rem] font-semibold">{label}</p>
                        <p className="mt-1 text-[11px] font-medium opacity-85">{stateLabel}</p>
                        <p className="mt-1 text-xs">
                          {formatDayLabel(item.date, { day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold uppercase tracking-[0.12em] text-slate-500">Weekly progress</span>
                  <span className="font-semibold text-emerald-600">{weeklyTotals.progress}% complete</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                    style={{ width: `${weeklyTotals.progress}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                  <span>{formatMinutes(weeklyTotals.totalMinutes)} logged</span>
                  <span>{formatMinutes(weeklyTotals.remainingMinutes)} remaining</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-4">
            <AttendanceLiveSession
              activeSession={activeSession}
              locationInput={locationInput}
              onLocationChange={onLocationChange}
              onLogin={onLogin}
              onStartBreak={onStartBreak}
              onResumeBreak={onResumeBreak}
              onLogout={onLogout}
              loginLoading={loginLoading}
              breakLoading={breakLoading}
              logoutLoading={logoutLoading}
              errorMessage={sessionError}
              todayMinutes={todayMinutes}
              variant="employee"
              loading={attendancePageLoading}
              hideLocationDetails={!isEmployeePortal}
            />

            {isEmployeePortal ? (
              <AttendanceQuickRequestCard
                onQuickHalfDayRequest={onQuickHalfDayRequest}
                onRevertHalfDayRequest={onRevertHalfDayRequest}
                halfDayRequestLoading={halfDayRequestLoading}
                todaysHalfDayRequest={todaysHalfDayRequest}
              />
            ) : null}

            {canReviewTeamAttendance && !isManagerPortal ? (
              <div className="rounded-[24px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy p-[15px] text-white">
                {teamAttendanceSummaryLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-[16px] bg-white/5 px-2.5 py-[9px] text-center text-xs text-slate-400">...</div>
                    <div className="rounded-[16px] bg-white/5 px-2.5 py-[9px] text-center text-xs text-slate-400">...</div>
                    <div className="rounded-[16px] bg-white/5 px-2.5 py-[9px] text-center text-xs text-slate-400">...</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-[16px] bg-emerald-500/10 px-2.5 py-[9px] text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Present</p>
                      <p className="mt-1.5 text-[1.65rem] font-semibold leading-none text-white">{teamAttendanceSummary?.present ?? 0}</p>
                    </div>
                    <div className="rounded-[16px] bg-rose-500/10 px-2.5 py-[9px] text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200">Absent</p>
                      <p className="mt-1.5 text-[1.65rem] font-semibold leading-none text-white">{teamAttendanceSummary?.absent ?? 0}</p>
                    </div>
                    <div className="rounded-[16px] bg-white/5 px-2.5 py-[9px] text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Total</p>
                      <p className="mt-1.5 text-[1.65rem] font-semibold leading-none text-white">{teamAttendanceSummary?.total ?? 0}</p>
                    </div>
                  </div>
                )}

              </div>
            ) : null}
            {isManagerPortal && canReviewTeamAttendance ? (
              <div className="mt-8 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
                <div className="flex items-center justify-between gap-3 bg-slate-200 px-5 py-4">
                  <div className="min-w-0">
                    <h4 className="truncate text-[1.15rem] font-semibold leading-none text-slate-950">Team Activity</h4>
                  </div>
                  <div className="flex shrink-0 flex-nowrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onOpenTeamAttendance}
                      className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={onRefreshTeamActivity}
                      disabled={teamAttendanceSummaryLoading}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw size={13} className={teamAttendanceSummaryLoading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:text-sm">
                    {teamClockedInCount} logged in
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 sm:text-sm">
                    {teamOnBreakCount} on break
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 sm:ml-auto sm:text-sm">
                    {teamInactiveCount} absent
                  </span>
                </div>

                {teamAttendanceSummaryLoading ? (
                  <div className="space-y-0">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-3 px-4 py-3">
                        <div className="h-10 w-10 rounded-2xl bg-slate-100" />
                        <div className="min-w-0 flex-1">
                          <div className="h-3.5 w-36 rounded bg-slate-100" />
                          <div className="mt-2 h-2.5 w-32 rounded bg-slate-100" />
                          <div className="mt-2.5 h-1.5 w-16 rounded-full bg-slate-100" />
                        </div>
                        <div className="w-16">
                          <div className="h-3.5 w-12 rounded bg-slate-100" />
                          <div className="mt-2 h-2.5 w-14 rounded bg-slate-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : teamActivityEntries.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-slate-400">
                    No team attendance activity is available right now.
                  </div>
                ) : (
                  <>
                    <div
                      className={`min-h-0 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 ${
                        teamActivityEntries.length > 5 ? 'max-h-[322px]' : ''
                      }`}
                    >
                      <div className="divide-y divide-slate-100">
                        {teamActivityEntries.map((member) => {
                          const currentMemberState = teamActivityMemberByEmpId.get(member.empId);
                          const statusMeta = getTeamActivityStatusMeta(member.activityType, member.status);
                          const viewerMeta = getCurrentViewerActivityMeta(member.empId);
                          const workingMinutes = Math.max(0, member.workingMinutes || 0);
                          const workingHours = (workingMinutes / 60).toFixed(1);
                          const progressWidth = member.status === 'absent'
                            ? '0%'
                            : `${Math.max(18, Math.min(100, (workingMinutes / (8 * 60)) * 100))}%`;
                          const progressColor = member.status === 'absent'
                            ? '#cbd5e1'
                            : workingMinutes >= 270
                              ? '#f59e0b'
                              : '#ef4444';
                          const activityTime = member.activityAt || null;
                          const subLabel = [member.designation || member.department, member.location]
                            .filter(Boolean)
                            .join(' · ');
                          const memberMetaLabel = member.designation || member.department || member.empId;
                          const isCurrentLiveBreakRow =
                            member.activityType === 'break_started' &&
                            !!activityTime &&
                            currentMemberState?.status === 'on_break' &&
                            currentMemberState?.lastActivityType === 'break_started' &&
                            currentMemberState?.lastActivityAt === activityTime;
                          const activeBreakDuration = member.activityType === 'break_started' && !!activityTime
                            ? isCurrentLiveBreakRow
                              ? formatTeamActivityDuration(Math.max(0, Math.floor((teamActivityNow - new Date(activityTime).getTime()) / 1000)))
                              : typeof member.breakDurationSeconds === 'number'
                                ? formatTeamActivityDuration(member.breakDurationSeconds)
                                : null
                            : null;
                          const isActiveBreakRow = !!activeBreakDuration;

                          return (
                            <div
                              key={member.id || `${member.empId}-${activityTime || 'activity'}`}
                              className="flex items-start gap-3 px-4 py-3 transition-colors duration-200 hover:bg-slate-200/80"
                            >
                              <div className="relative shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-[0.95rem] font-semibold text-white">
                                  {getTeamMemberInitials(member.empName)}
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${statusMeta.dotClass}`} />
                              </div>

                              <div className="min-w-0 flex-1 pt-px">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className="truncate text-[12px] font-semibold text-slate-900 sm:text-[14px]">{member.empName}</p>
                                  {viewerMeta ? (
                                    <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold leading-none whitespace-nowrap ${viewerMeta.className}`}>
                                      {viewerMeta.label}
                                    </span>
                                  ) : null}
                                  <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold leading-none whitespace-nowrap ${statusMeta.chipClass}`}>
                                    {statusMeta.label}
                                  </span>
                                </div>

                                <p className="mt-1 truncate text-[10px] font-medium text-slate-400 sm:text-[11px]">
                                  {member.designation || member.department || member.empId}
                                </p>

                                <div className="mt-2 h-1.5 w-[108px] overflow-hidden rounded-full bg-slate-100 sm:w-[92px]">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: progressWidth, backgroundColor: progressColor }}
                                  />
                                </div>
                              </div>

                              <div className="min-w-[72px] shrink-0 pl-2 pt-px text-right">
                                <p className="text-[13px] font-semibold text-slate-800 sm:text-[15px]">{formatTeamSnapshotTime(activityTime)}</p>
                                <p className={`mt-1 text-[11px] text-slate-400 sm:text-[12px] ${isActiveBreakRow ? 'hidden' : ''}`}>
                                  {member.status === 'absent' ? '—' : `${workingHours}h today`}
                                </p>
                                {isActiveBreakRow && activeBreakDuration ? (
                                  <p className="mt-1 font-mono text-[11px] font-semibold text-amber-600 sm:text-[12px]">
                                    {activeBreakDuration}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 px-5 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-[13px] font-semibold text-slate-400 sm:text-sm">Team presence rate</p>
                        <p className="text-[13px] font-semibold text-slate-700 sm:text-sm">{teamPresenceRate}%</p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${teamPresenceRate}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-8 rounded-[30px] border border-slate-200 bg-white py-4">
                <div className="flex items-start justify-between gap-4 px-5">
                  <div>
                    <h4 className="text-[1.15rem] font-semibold leading-none text-slate-800">Today activity</h4>
                  </div>
                  <div className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                    Live
                  </div>
                </div>

                <div
                  className={`mt-3 min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 ${
                    todayActivityEvents.length > 4 ? 'max-h-[286px]' : ''
                  }`}
                >
                  {todayActivityEvents.length === 0 ? (
                    <div className="mx-5 rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                      No attendance activity recorded for today yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {todayActivityEvents.map((event) => {
                        const activeBreakStartedAt = activeSession?.currentBreakStartedAt
                          ? new Date(activeSession.currentBreakStartedAt).getTime()
                          : null;
                        const isActiveBreakEvent =
                          event.icon === 'break' &&
                          !!activeSession?.isOnBreak &&
                          activeBreakStartedAt !== null &&
                          activeBreakStartedAt === event.occurredAt;
                        const liveBreakDuration = event.icon === 'break'
                          ? isActiveBreakEvent
                            ? formatTeamActivityDuration(Math.max(0, Math.floor((teamActivityNow - event.occurredAt) / 1000)))
                            : typeof event.breakDurationSeconds === 'number'
                              ? formatTeamActivityDuration(event.breakDurationSeconds)
                              : null
                          : null;

                        return (
                          <div
                            key={event.id}
                            className="flex items-center justify-between gap-4 px-5 py-3 transition-colors duration-200 hover:bg-slate-200/80 first:pt-0 last:pb-0"
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
                                {getTodayActivityIcon(event.icon)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[0.88rem] font-medium text-slate-900">{event.title}</p>
                                <p className="mt-0.5 text-[11px] text-slate-500">{event.detail}</p>
                              </div>
                            </div>
                            <div className="shrink-0 pl-4 text-right">
                              <p className="text-[0.88rem] font-medium text-slate-900">
                                {new Date(event.occurredAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZone: 'Asia/Kolkata',
                                })}
                              </p>
                              {liveBreakDuration ? (
                                <p className="mt-1 text-[0.82rem] font-semibold tabular-nums text-amber-600">
                                  {liveBreakDuration}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 bg-slate-200 px-5 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-[1.15rem] font-semibold leading-none text-slate-950">Attendance log</h4>
              <p className="mt-2 text-sm text-slate-500">Detailed daily records from the current selection.</p>
            </div>
            <button
              type="button"
              onClick={onOpenHistory}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Open full history
            </button>
          </div>

          <div className="overflow-x-auto px-5 pb-7 pt-6">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  <th className="pb-4 pr-4">Date</th>
                  <th className="pb-4 pr-4">Login</th>
                  <th className="pb-4 pr-4">Logout</th>
                  <th className="pb-4 pr-4">Duration</th>
                  <th className="pb-4 pr-4">Status</th>
                  <th className="pb-4">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                      No attendance records available.
                    </td>
                  </tr>
                ) : (
                  displayRows.map((day) => {
                    const meta = resolveRowMeta(day);
                    return (
                      <tr key={day.date} className="text-sm text-slate-600 transition-colors duration-200 hover:bg-slate-200/80">
                        <td className="py-4 pr-4 font-semibold text-slate-900">
                          {formatDayLabel(new Date(`${day.date}T00:00:00`), { weekday: 'short', day: 'numeric', month: 'short' })}
                        </td>
                        <td className="py-4 pr-4">{formatSessionTime(meta.firstSession?.loginTime)}</td>
                        <td className="py-4 pr-4">
                          {meta.isBreakSession
                            ? 'On break'
                            : meta.isOpenSession
                              ? 'Active now'
                              : formatSessionTime(meta.lastSession?.effectiveLogoutTime || meta.lastSession?.logoutTime)}
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex min-w-[156px] items-center gap-3">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${getDurationProgressWidth(day.minutes)}%`,
                                  backgroundColor: meta.isBreakSession ? breakStatusColors.solid : getHoursColor(day.minutes / 60),
                                }}
                              />
                            </div>
                            <span className="min-w-[42px] text-right font-semibold text-slate-900">
                              {formatAttendanceLogDuration(day.minutes)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{ backgroundColor: meta.badge.bg, color: meta.badge.text }}
                          >
                            {meta.status}
                          </span>
                        </td>
                        <td className="py-4 text-slate-500">{resolvedRowLocations[day.date] || meta.location}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <AttendanceSummaryCards
          summary={summary}
          range={range}
          todayMinutes={todayMinutes}
          todayColor={todayColor}
          leaveDaysInRange={leaveDaysInRange}
          onOpenHistory={onOpenHistory}
          loading={attendancePageLoading}
        />
        <AttendancePresenceChart
          summary={summary}
          loading={attendancePageLoading}
          selectedMonth={selectedMonth}
          range={range}
          todayMinutes={todayMinutes}
        />
      </div>

      <div className="space-y-6 lg:col-span-4">
        <AttendanceLiveSession
          activeSession={activeSession}
          locationInput={locationInput}
          onLocationChange={onLocationChange}
          onLogin={onLogin}
          onStartBreak={onStartBreak}
          onResumeBreak={onResumeBreak}
          onLogout={onLogout}
          loginLoading={loginLoading}
          breakLoading={breakLoading}
          logoutLoading={logoutLoading}
          errorMessage={sessionError}
          todayMinutes={todayMinutes}
          loading={attendancePageLoading}
        />
        {canReviewTeamAttendance && (
          <div className="rounded-[30px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy p-6 text-white">
            <h4 className="text-lg font-semibold text-white">Today attendance</h4>
            <p className="mt-2 text-sm leading-6 text-slate-300">Shows how many team members logged in today.</p>
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
  );
};

export default AttendanceOverviewGrid;
