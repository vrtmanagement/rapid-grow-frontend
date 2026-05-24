import React from 'react';
import { ArrowLeft, ChevronDown, Clock3, History, MapPin } from 'lucide-react';
import {
  AttendanceDay,
  AttendanceBreak,
  AttendanceSession,
  AttendanceSummaryResponse,
  Range,
  formatMinutes,
  getBadgeColorsByMinutes,
  getSessionBreakMinutes,
} from './attendanceUtils';
import { resolveAttendanceLocationLabel } from './attendanceViewUtils';
import { Skeleton } from '../ui/Skeleton';

interface AttendanceHistoryPageProps {
  summary: AttendanceSummaryResponse | null;
  range: Range;
  selectedMonth: string;
  loading: boolean;
  portalMode: 'employee' | 'manager';
  onBack: () => void;
}

const INITIAL_VISIBLE_DAYS = 6;

function getMinutesInKolkata(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  }).formatToParts(parsed);

  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

function formatClockStat(totalMinutes: number | null) {
  if (totalMinutes == null) return '--:--';
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const labelHour = hour % 12 || 12;
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  return `${String(labelHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${meridiem}`;
}

function formatCompactDuration(minutes: number) {
  const normalized = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} h`;
}

function getDayMeta(day: AttendanceDay) {
  const sortedSessions = [...(day.sessions || [])].sort(
    (a, b) => new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime(),
  );
  const firstSession = sortedSessions[0];
  const lastSession = sortedSessions[sortedSessions.length - 1];
  const isOpenSession = !!lastSession && !lastSession.logoutTime;
  const isBreakSession = isOpenSession && !!lastSession?.isOnBreak;
  const badge = getBadgeColorsByMinutes(day.minutes);
  const hours = day.minutes / 60;
  const location = firstSession?.location || lastSession?.location || 'Location not captured';
  const statusLabel = isBreakSession ? 'On break' : isOpenSession ? 'Active now' : hours >= 8 ? 'Completed' : 'Logged';

  return {
    badge,
    firstSession,
    hours,
    isBreakSession,
    isOpenSession,
    lastSession,
    location,
    sessionCount: sortedSessions.length,
    sessions: sortedSessions,
    statusLabel,
  };
}

function formatSessionTime(value?: string | Date | null) {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function getBreakDurationMinutes(
  pause: AttendanceBreak,
  sessionEnd?: string | null,
  referenceTime: Date = new Date(),
) {
  const start = pause?.startTime ? new Date(pause.startTime) : null;
  if (!start || Number.isNaN(start.getTime())) return 0;

  const fallbackEnd = pause?.endTime
    ? new Date(pause.endTime)
    : sessionEnd
      ? new Date(sessionEnd)
      : referenceTime;

  if (Number.isNaN(fallbackEnd.getTime()) || fallbackEnd.getTime() <= start.getTime()) return 0;
  return Math.max(0, Math.floor((fallbackEnd.getTime() - start.getTime()) / 60000));
}

function getDayChip(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  return {
    month: parsed.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Kolkata' }).toUpperCase(),
    day: parsed.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Kolkata' }),
    heading: parsed.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }),
  };
}

function getTotalBreakMinutes(sessions: AttendanceSession[]) {
  return sessions.reduce((total, session) => {
    if (typeof session.breakMinutes === 'number') {
      return total + Math.max(0, session.breakMinutes);
    }
    return total + getSessionBreakMinutes(session);
  }, 0);
}

const AttendanceHistoryPage: React.FC<AttendanceHistoryPageProps> = ({
  summary,
  loading,
  portalMode,
  onBack,
}) => {
  const sortedDays = React.useMemo(
    () => [...(summary?.days ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [summary?.days],
  );
  const recentDays = React.useMemo(() => sortedDays.slice(0, INITIAL_VISIBLE_DAYS), [sortedDays]);
  const olderDays = React.useMemo(() => sortedDays.slice(INITIAL_VISIBLE_DAYS), [sortedDays]);
  const [expandedDays, setExpandedDays] = React.useState<Record<string, boolean>>({});
  const [resolvedLocations, setResolvedLocations] = React.useState<Record<string, string>>({});
  const [showOlderHistory, setShowOlderHistory] = React.useState(false);

  React.useEffect(() => {
    setExpandedDays((prev) => {
      const validDayKeys = new Set(sortedDays.map((day) => day.date));
      const next = Object.fromEntries(
        Object.entries(prev).filter(([dateKey, isOpen]) => isOpen && validDayKeys.has(dateKey)),
      );

      if (Object.keys(next).length > 0) {
        return next;
      }

      if (sortedDays[0]?.date) {
        return { [sortedDays[0].date]: true };
      }

      return {};
    });
  }, [sortedDays]);

  React.useEffect(() => {
    if (!sortedDays.length) {
      setResolvedLocations({});
      return undefined;
    }

    let cancelled = false;
    const run = async () => {
      const entries = await Promise.all(
        sortedDays.map(async (day) => {
          const label = await resolveAttendanceLocationLabel(getDayMeta(day).location);
          return [day.date, label] as const;
        }),
      );

      if (!cancelled) {
        setResolvedLocations(Object.fromEntries(entries));
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [sortedDays]);

  React.useEffect(() => {
    setShowOlderHistory(false);
  }, [sortedDays]);

  const sessionMetrics = React.useMemo(() => {
    const allSessions = sortedDays.flatMap((day) => day.sessions || []);
    const firstLogins = sortedDays
      .map((day) => getDayMeta(day).firstSession?.loginTime)
      .filter(Boolean) as string[];
    const totalBreakMinutes = getTotalBreakMinutes(allSessions);
    const averageLoginMinutes = firstLogins.length
      ? Math.round(
          firstLogins.reduce((total, loginTime) => total + (getMinutesInKolkata(loginTime) || 0), 0) / firstLogins.length,
        )
      : null;

    return {
      averageLoginMinutes,
      totalBreakMinutes,
      totalHours: summary ? (summary.totalMinutes / 60).toFixed(2) : '0.00',
      trackedDays: sortedDays.length,
    };
  }, [sortedDays, summary]);

  const shellClassName = portalMode === 'employee'
    ? 'space-y-4'
    : 'space-y-4';
  const panelClassName = 'rounded-[22px] border border-slate-200/80 bg-[#f3f5f7] p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)] dark:border-[#1a2438] dark:bg-[#182235] dark:shadow-none';

  const renderDayCard = (day: AttendanceDay) => {
    const meta = getDayMeta(day);
    const dayLocation = resolvedLocations[day.date] || meta.location;
    const dayChip = getDayChip(day.date);
    const isExpanded = !!expandedDays[day.date];

    return (
      <article
        key={day.date}
        className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-[#f3f6f8] dark:border-[#1a2438] dark:bg-[#18253a]"
      >
        <button
          type="button"
          onClick={() =>
            setExpandedDays((prev) => ({
              ...prev,
              [day.date]: !prev[day.date],
            }))
          }
          className="flex w-full flex-col gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015]"
          aria-expanded={isExpanded}
          aria-label={`Toggle ${dayChip.heading} attendance details`}
        >
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex min-w-[56px] flex-col items-center rounded-[20px] bg-white px-2.5 py-1 text-center shadow-[0_8px_18px_rgba(15,23,42,0.04)] dark:bg-[#202942] dark:shadow-none">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                  {dayChip.month}
                </span>
                <span className="mt-0.5 text-[1.05rem] font-semibold leading-none text-slate-950 dark:text-white">
                  {dayChip.day}
                </span>
              </div>

              <div className="min-w-0">
                <h4 className="text-base font-semibold text-slate-950 dark:text-white">
                  {dayChip.heading}
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {meta.sessionCount} session{meta.sessionCount === 1 ? '' : 's'} • First in: {formatSessionTime(meta.firstSession?.loginTime)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start lg:self-center">
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                  {formatMinutes(day.minutes)}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  {meta.statusLabel}
                </p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-[0_6px_14px_rgba(15,23,42,0.04)] transition-transform dark:bg-white/5 dark:text-slate-300 dark:shadow-none">
                <ChevronDown size={15} className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </span>
            </div>
          </div>
        </button>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-slate-200/80 pb-0 pt-0 dark:border-white/6">
              <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                <MapPin size={15} className="shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="truncate">{dayLocation}</span>
              </div>

              <div className="overflow-hidden bg-white dark:bg-[#11192c]">
                <div className="hidden grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 md:grid">
                  <span>Session</span>
                  <span>Check in</span>
                  <span>Check out</span>
                  <span className="text-right">Duration</span>
                </div>

                <div className="divide-y divide-slate-100/80 dark:divide-white/6">
                  {meta.sessions.map((session, sessionIndex) => {
                    const rowIsActive = !session.logoutTime;
                    const rowIsOnBreak = rowIsActive && !!session.isOnBreak;
                    const sessionEndTime = session.effectiveLogoutTime || session.logoutTime || null;
                    const breaks = session.breaks || [];
                    const totalBreakMinutes = breaks.reduce(
                      (total, pause) => total + getBreakDurationMinutes(pause, sessionEndTime),
                      0,
                    );

                    return (
                      <div
                        key={session._id}
                        className={`grid gap-2 px-4 py-2 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] md:items-center ${
                          rowIsActive
                            ? rowIsOnBreak
                              ? 'border-l-[3px] border-amber-400 bg-amber-50/90 dark:border-amber-400/80 dark:bg-amber-500/16'
                              : 'border-l-[3px] border-emerald-400 bg-emerald-50/90 dark:border-emerald-400/80 dark:bg-emerald-500/16'
                            : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${
                            rowIsOnBreak
                              ? 'text-amber-700 dark:text-amber-300'
                              : rowIsActive
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            Session {sessionIndex + 1}
                          </p>
                          {breaks.length ? (
                            <div className="mt-2 space-y-1">
                              {breaks.map((pause, pauseIndex) => {
                                const breakDurationMinutes = getBreakDurationMinutes(pause, sessionEndTime);
                                return (
                                  <p
                                    key={`${session._id}-break-${pauseIndex}`}
                                    className="text-xs leading-5 text-slate-500 dark:text-slate-400"
                                  >
                                    Break {pauseIndex + 1} • {formatSessionTime(pause.startTime)} - {pause.endTime ? formatSessionTime(pause.endTime) : 'On break'} • {formatMinutes(breakDurationMinutes)}
                                  </p>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 md:hidden">
                            Check in
                          </span>
                          <p className="mt-1 md:mt-0">{formatSessionTime(session.loginTime)}</p>
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 md:hidden">
                            Check out
                          </span>
                          <p className={`mt-1 md:mt-0 ${
                            rowIsOnBreak
                              ? 'font-semibold text-amber-600 dark:text-amber-300'
                              : rowIsActive
                                ? 'font-semibold text-emerald-600 dark:text-emerald-300'
                                : ''
                          }`}>
                            {session.logoutTime
                              ? formatSessionTime(session.effectiveLogoutTime || session.logoutTime)
                              : session.isOnBreak
                                ? 'On break'
                                : 'Active'}
                          </p>
                        </div>

                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 md:text-right">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 md:hidden">
                            Duration
                          </span>
                          <p className="mt-1 md:mt-0">{formatMinutes(session.durationMinutes || 0)}</p>
                          {breaks.length ? (
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                              Breaks {formatMinutes(totalBreakMinutes)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  };

  if (loading && !summary) {
    return (
      <div className={shellClassName}>
        <div className="space-y-5">
          <div>
            <Skeleton className="h-10 w-48 bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="mt-4 h-4 w-72 bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`attendance-history-skeleton-${index}`} className={panelClassName}>
                <Skeleton className="h-4 w-20 bg-slate-100 dark:bg-slate-800" />
                <Skeleton className="mt-4 h-8 w-24 bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
          <div>
            <Skeleton className="h-5 w-44 bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="mt-5 h-28 w-full bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClassName}>
      <div className="space-y-5">
        <section className="py-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to attendance
          </button>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={panelClassName}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-300">
                <History size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Tracked days
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                  {sessionMetrics.trackedDays}
                </p>
              </div>
            </div>
          </div>

          <div className={panelClassName}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-300">
                <Clock3 size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Productive hours
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                  {sessionMetrics.totalHours}
                  <span className="ml-1 text-base text-slate-400 dark:text-slate-500">h</span>
                </p>
              </div>
            </div>
          </div>

          <div className={panelClassName}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/12 dark:text-amber-300">
                <ArrowLeft size={18} className="rotate-180" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Avg. login
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                  {formatClockStat(sessionMetrics.averageLoginMinutes)}
                </p>
              </div>
            </div>
          </div>

          <div className={panelClassName}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/12 dark:text-rose-300">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Break duration
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                  {formatCompactDuration(sessionMetrics.totalBreakMinutes)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">
                Daily session breakdown
              </h3>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Showing latest logs first
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {sortedDays.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                No attendance records were found for this window.
              </div>
            ) : (
              <>
                {recentDays.map(renderDayCard)}

                {olderDays.length > 0 ? (
                  <div>
                    {!showOlderHistory ? (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setShowOlderHistory(true)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
                          aria-expanded={showOlderHistory}
                        >
                          Show older history
                          <ChevronDown size={14} className="transition-transform" />
                        </button>
                      </div>
                    ) : null}

                    <div
                      className={`grid transition-[grid-template-rows,opacity,transform] duration-500 ease-out ${
                        showOlderHistory ? 'grid-rows-[1fr] opacity-100 translate-y-0' : 'grid-rows-[0fr] opacity-0 -translate-y-1'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className={`space-y-3 ${showOlderHistory ? '' : 'pt-3'}`}>
                          {olderDays.map(renderDayCard)}

                          <div className="flex justify-center pt-2">
                            <button
                              type="button"
                              onClick={() => setShowOlderHistory(false)}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
                              aria-expanded={showOlderHistory}
                            >
                              Hide older history
                              <ChevronDown size={14} className="rotate-180 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AttendanceHistoryPage;
