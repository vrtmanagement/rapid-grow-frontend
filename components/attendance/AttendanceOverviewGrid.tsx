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
import { resolveAttendanceLocationLabel, type TeamAttendanceSummary } from './attendanceViewUtils';
import { Check, Coffee, LogIn, LogOut, Play, X } from 'lucide-react';

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
  portalMode: 'employee' | 'manager';
  onOpenHistory: () => void;
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
  portalMode,
  onOpenHistory,
}) => {
  const isEmployeePortal = portalMode === 'employee';
  const DURATION_PROGRESS_MAX_HOURS = 10;
  const breakStatusColors = React.useMemo(
    () => ({ bg: '#fef3c7', text: '#b45309', solid: '#fbbf24' }),
    [],
  );
  const recordsByDate = React.useMemo(
    () => new Map((summary?.days ?? []).map((day) => [day.date, day])),
    [summary?.days],
  );

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
          if (pauseStart && !Number.isNaN(pauseStart.getTime())) {
            sessionEvents.push({
              id: `${session._id}-break-${index}-start`,
              title: 'Break started',
              detail: `Break started at ${formatSessionTime(pause.startTime)}`,
              occurredAt: pauseStart.getTime(),
              icon: 'break',
            });
          }

          const pauseEnd = pause?.endTime ? new Date(pause.endTime) : null;
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

  React.useEffect(() => {
    if (!isEmployeePortal || displayRows.length === 0) return undefined;

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
  }, [displayRows, isEmployeePortal, resolveRowMeta]);

  if (isEmployeePortal) {
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
            />

            <AttendanceQuickRequestCard
              onQuickHalfDayRequest={onQuickHalfDayRequest}
              onRevertHalfDayRequest={onRevertHalfDayRequest}
              halfDayRequestLoading={halfDayRequestLoading}
              todaysHalfDayRequest={todaysHalfDayRequest}
            />

            {canReviewTeamAttendance ? (
              <div className="rounded-[30px] border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">Today attendance</h4>
                    <p className="mt-1 text-sm text-slate-500">Live team count for the current day.</p>
                  </div>
                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                    Snapshot
                  </div>
                </div>

                {teamAttendanceSummaryLoading ? (
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">...</div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">...</div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">...</div>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-emerald-50 px-3 py-4 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">Present</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{teamAttendanceSummary?.present ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 px-3 py-4 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-500">Absent</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{teamAttendanceSummary?.absent ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-4 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Total</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{teamAttendanceSummary?.total ?? 0}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            <div className="mt-8 rounded-[30px] border border-slate-200 bg-white py-4">
              <div className="flex items-start justify-between gap-4 px-5">
                <div>
                  <h4 className="text-[1.15rem] font-semibold leading-none text-slate-950">Today activity</h4>
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
                    {todayActivityEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between gap-4 px-5 py-3 first:pt-0 last:pb-0"
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[34px] border border-slate-200 bg-white p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-[1.15rem] font-semibold leading-none text-slate-950">Attendance log</h4>
              <p className="mt-2 text-sm text-slate-500">Detailed daily records from the current selection.</p>
            </div>
            <button
              type="button"
              onClick={onOpenHistory}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Open full history
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  <th className="pb-4 pr-4">Date</th>
                  <th className="pb-4 pr-4">Check in</th>
                  <th className="pb-4 pr-4">Check out</th>
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
                      <tr key={day.date} className="text-sm text-slate-600">
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
                              {(day.minutes / 60).toFixed(1)}
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
