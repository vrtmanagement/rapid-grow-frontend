import React from 'react';
import {
  AttendanceDay,
  AttendanceSession,
  AttendanceSummaryResponse,
  LeaveBalanceOverviewResponse,
  LateLoginPolicy,
  LeaveRequest,
  Range,
} from './attendanceUtils';
import AttendanceSummaryCards from './AttendanceSummaryCards';
import AttendancePresenceChart from './AttendancePresenceChart';
import AttendanceLiveSession from './AttendanceLiveSession';
import AttendanceQuickRequestCard from './AttendanceQuickRequestCard';
import {
  resolveAttendanceLocationLabel,
  type TeamAttendanceSummary,
} from './attendanceViewUtils';
import { PROFILE_AVATAR_UPDATED_EVENT } from '../../utils/avatar';
import AttendanceWeekGlanceCard from './AttendanceWeekGlanceCard';
import AttendanceTeamActivityCard from './AttendanceTeamActivityCard';
import AttendanceTodayActivityCard from './AttendanceTodayActivityCard';
import AttendanceLogTable from './AttendanceLogTable';
import {
  formatSessionTime,
  getAttendanceTimezoneDate,
  getHalfDayActivityLabel,
  resolveRowMeta,
  TodayActivityEvent,
} from './attendanceOverviewGridUtils';
import { getUserTimeZone } from '../../utils/timezone';

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
  lateLoginPolicy: LateLoginPolicy | null;
  leaveBalanceOverview?: LeaveBalanceOverviewResponse | null;
  myLeaves?: LeaveRequest[];
  onOpenLateRequests?: () => void;
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
  lateLoginPolicy,
  leaveBalanceOverview = null,
  myLeaves = [],
  onOpenLateRequests,
}) => {
  const isEmployeePortal = portalMode === 'employee';
  const isManagerPortal = portalMode === 'manager';
  const [teamActivityNow, setTeamActivityNow] = React.useState(() => Date.now());
  const teamActivityMembers = React.useMemo(() => teamAttendanceSummary?.members ?? [], [teamAttendanceSummary?.members]);
  const teamActivityEntries = React.useMemo(() => teamAttendanceSummary?.activityLog ?? [], [teamAttendanceSummary?.activityLog]);
  const [teamAvatarByEmpId, setTeamAvatarByEmpId] = React.useState<Record<string, string>>({});
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

  React.useEffect(() => {
    const nextAvatarByEmpId: Record<string, string> = {};
    teamActivityMembers.forEach((member) => {
      if (member.empId) {
        nextAvatarByEmpId[member.empId] = String(member.avatar || '').trim();
      }
    });
    teamActivityEntries.forEach((entry) => {
      if (entry.empId) {
        nextAvatarByEmpId[entry.empId] = String(entry.avatar || nextAvatarByEmpId[entry.empId] || '').trim();
      }
    });

    setTeamAvatarByEmpId((prev) => {
      let changed = false;
      const merged = { ...prev };
      Object.entries(nextAvatarByEmpId).forEach(([empId, avatar]) => {
        if (merged[empId] !== avatar) {
          merged[empId] = avatar;
          changed = true;
        }
      });
      return changed ? merged : prev;
    });
  }, [teamActivityEntries, teamActivityMembers]);

  React.useEffect(() => {
    const handleProfileAvatarUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ avatar?: string; empId?: string }>).detail || {};
      const empId = String(detail.empId || '').trim();
      if (!empId) return;
      const nextAvatar = String(detail.avatar || '').trim();
      setTeamAvatarByEmpId((prev) => (
        prev[empId] === nextAvatar ? prev : { ...prev, [empId]: nextAvatar }
      ));
    };

    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    return () => {
      window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    };
  }, []);
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

  const todayActivityEvents = React.useMemo(() => {
    const sourceSessions = todayActivitySessions;
    const leaveEvents: TodayActivityEvent[] = [];

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
        const sessionEvents: TodayActivityEvent[] = [];

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
              selectedMonthLabel={selectedMonth ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: getUserTimeZone() }) : ''}
              onOpenHistory={onOpenHistory}
              variant="employee"
              loading={attendancePageLoading}
              leaveBalanceOverview={leaveBalanceOverview}
            />
            <AttendancePresenceChart
              summary={summary}
              loading={attendancePageLoading}
              selectedMonth={selectedMonth}
              range={range}
              variant="employee"
              todayMinutes={todayMinutes}
              leaves={myLeaves}
              monthlyPaidLeaves={leaveBalanceOverview?.policy?.monthlyPaidLeaves ?? 1}
            />

            <AttendanceWeekGlanceCard lastSevenDays={lastSevenDays} weeklyTotals={weeklyTotals} />
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
              lateLoginPolicy={lateLoginPolicy}
              onOpenLateRequests={onOpenLateRequests}
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
              <AttendanceTeamActivityCard
                onOpenTeamAttendance={onOpenTeamAttendance}
                onRefreshTeamActivity={onRefreshTeamActivity}
                teamAttendanceSummaryLoading={teamAttendanceSummaryLoading}
                teamClockedInCount={teamClockedInCount}
                teamOnBreakCount={teamOnBreakCount}
                teamInactiveCount={teamInactiveCount}
                teamActivityEntries={teamActivityEntries}
                teamActivityMemberByEmpId={teamActivityMemberByEmpId}
                teamAvatarByEmpId={teamAvatarByEmpId}
                teamActivityNow={teamActivityNow}
                teamPresenceRate={teamPresenceRate}
                currentViewerEmpId={currentViewerEmpId}
                isManagerPortal={isManagerPortal}
              />
            ) : (
              <AttendanceTodayActivityCard
                todayActivityEvents={todayActivityEvents}
                activeSession={activeSession}
                teamActivityNow={teamActivityNow}
              />
            )}
          </div>
        </div>

        <AttendanceLogTable
          onOpenHistory={onOpenHistory}
          displayRows={displayRows}
          resolvedRowLocations={resolvedRowLocations}
        />
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
          leaveBalanceOverview={leaveBalanceOverview}
        />
        <AttendancePresenceChart
          summary={summary}
          loading={attendancePageLoading}
          selectedMonth={selectedMonth}
          range={range}
          todayMinutes={todayMinutes}
          leaves={myLeaves}
          monthlyPaidLeaves={leaveBalanceOverview?.policy?.monthlyPaidLeaves ?? 1}
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
          lateLoginPolicy={lateLoginPolicy}
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
