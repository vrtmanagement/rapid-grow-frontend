import React, { useEffect, useMemo, useState } from 'react';
import { Coffee, LogIn, LogOut, Play } from 'lucide-react';
import { AttendanceSession, LateLoginPolicy } from './attendanceUtils';
import { resolveAttendanceLocationLabel } from './attendanceViewUtils';
import { Skeleton, SkeletonBlock } from '../ui/Skeleton';

interface Props {
  activeSession: AttendanceSession | null;
  locationInput: string;
  onLocationChange: (value: string) => void;
  onLogin: () => void;
  onStartBreak: () => void;
  onResumeBreak: () => void;
  onLogout: () => void;
  loginLoading?: boolean;
  breakLoading?: boolean;
  logoutLoading?: boolean;
  errorMessage?: string | null;
  todayMinutes?: number;
  variant?: 'employee' | 'manager';
  loading?: boolean;
  hideLocationDetails?: boolean;
  lateLoginPolicy?: LateLoginPolicy | null;
}

const STATUS_CARD_THEMES = {
  idle: {
    shell: 'border-white/10 shadow-none',
    glow: 'from-slate-400/15 via-transparent to-transparent',
    badge: 'bg-white/10 text-slate-200',
    dot: 'bg-slate-500',
  },
  active: {
    shell: 'border-emerald-400/55 shadow-none',
    glow: 'from-emerald-400/18 via-transparent to-transparent',
    badge: 'bg-emerald-500/12 text-emerald-200 ring-1 ring-emerald-400/20',
    dot: 'bg-emerald-400',
  },
  break: {
    shell: 'border-amber-400/65 shadow-none',
    glow: 'from-amber-300/18 via-transparent to-transparent',
    badge: 'bg-amber-500/12 text-amber-200 ring-1 ring-amber-400/25',
    dot: 'bg-amber-400',
  },
} as const;

const AttendanceLiveSession: React.FC<Props> = ({
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
  errorMessage,
  variant = 'manager',
  loading = false,
  hideLocationDetails = false,
  lateLoginPolicy = null,
}) => {
  const isEmployeeVariant = variant === 'employee';
  const [now, setNow] = useState(() => Date.now());
  const [resolvedLocationLabel, setResolvedLocationLabel] = useState('Not set');

  useEffect(() => {
    if (!activeSession) return undefined;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeSession]);

  useEffect(() => {
    let cancelled = false;
    const rawLocation = activeSession?.location || locationInput || '';

    if (!rawLocation) {
      setResolvedLocationLabel('Not set');
      return undefined;
    }

    void resolveAttendanceLocationLabel(rawLocation).then((label) => {
      if (!cancelled) {
        setResolvedLocationLabel(label);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeSession?.location, locationInput]);

  const formatStopwatchParts = (elapsedSeconds: number) => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };

  const isOnBreak = !!activeSession?.isOnBreak;
  const statusTone = isOnBreak ? 'break' : activeSession ? 'active' : 'idle';
  const statusTheme = STATUS_CARD_THEMES[statusTone];
  const statusLabel = isOnBreak ? 'On break' : activeSession ? 'Active' : 'Idle';
  const employeeShellToneClass = {
    idle: 'border-slate-200',
    active: 'border-emerald-200',
    break: 'border-amber-200',
  } as const;
  const employeeBadgeToneClass = {
    idle: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    break: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  } as const;

  const currentDateLabel = useMemo(
    () =>
      new Date(now).toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      }),
    [now],
  );

  const loggedInTimeLabel = useMemo(() => {
    if (!activeSession?.loginTime) return '--';
    return new Date(activeSession.loginTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  }, [activeSession?.loginTime]);

  const currentTimeParts = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).formatToParts(new Date(now));

    const timeText = parts
      .filter((part) => part.type !== 'dayPeriod')
      .map((part) => part.value)
      .join('')
      .trim();
    const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value || '';

    return { timeText, dayPeriod };
  }, [now]);

  const breakStopwatchText = useMemo(() => {
    if (!isOnBreak || !activeSession?.currentBreakStartedAt) return null;

    const breakStartedAt = new Date(activeSession.currentBreakStartedAt);
    if (Number.isNaN(breakStartedAt.getTime())) return null;

    const elapsedMs = Math.max(0, now - breakStartedAt.getTime());
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    return formatStopwatchParts(elapsedSeconds);
  }, [activeSession?.currentBreakStartedAt, isOnBreak, now]);

  const sessionStopwatchText = useMemo(() => {
    if (!activeSession?.loginTime) return null;

    const loginStartedAt = new Date(activeSession.loginTime);
    if (Number.isNaN(loginStartedAt.getTime())) return null;

    const elapsedMs = Math.max(0, now - loginStartedAt.getTime());
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    return formatStopwatchParts(elapsedSeconds);
  }, [activeSession?.loginTime, now]);

  const attendanceActionDisabled = !!logoutLoading || !!loginLoading || !!breakLoading;
  const showLateLoginWarning =
    !activeSession &&
    !!lateLoginPolicy?.restrictionApplies &&
    !!lateLoginPolicy?.restrictionActive &&
    !lateLoginPolicy?.hasApproval;
  const showApprovedLateLogin =
    (!!activeSession?.isLateLogin || (!activeSession && !!lateLoginPolicy?.hasApproval)) &&
    !!lateLoginPolicy?.restrictionApplies;

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-7 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 bg-white/10" />
            <Skeleton className="h-8 w-48 bg-white/10" />
          </div>
          <SkeletonBlock className="h-8 w-20 rounded-full bg-slate-800" />
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-3 w-28 bg-white/10" />
          <SkeletonBlock className="h-10 w-full rounded-xl bg-slate-800" />
        </div>
        <div className="mt-5 flex gap-3">
          <SkeletonBlock className="h-10 flex-1 rounded-xl bg-slate-800" />
          <SkeletonBlock className="h-10 flex-1 rounded-xl bg-slate-800" />
        </div>
        <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 bg-white/10" />
              <Skeleton className="h-3 w-16 bg-white/10" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16 bg-white/10" />
              <Skeleton className="h-3 w-20 bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const shellClassName = isEmployeeVariant
    ? `relative overflow-hidden rounded-[32px] border bg-white p-5 text-slate-900 ${employeeShellToneClass[statusTone]}`
    : `relative overflow-hidden rounded-[2rem] border bg-slate-900 p-7 text-white ${statusTheme.shell}`;

  const titleClassName = isEmployeeVariant
    ? 'mt-1.5 text-[1.3rem] font-medium leading-[1.1] text-slate-950'
    : 'text-lg font-semibold text-white';

  const statusBadgeClassName = isEmployeeVariant
    ? `inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.92rem] ${employeeBadgeToneClass[statusTone]}`
    : `inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] ${statusTheme.badge}`;

  const inputClassName = isEmployeeVariant
    ? 'mt-2.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[0.95rem] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red/50'
    : 'mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red/60';

  return (
    <div className={shellClassName}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${isEmployeeVariant ? 'from-transparent via-transparent to-transparent' : statusTheme.glow}`} />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={isEmployeeVariant ? 'text-[0.88rem] text-slate-500' : 'mb-1 text-xs text-slate-400'}>
              Live session
            </p>
            <h3 className={titleClassName}>Attendance control</h3>
            {showLateLoginWarning ? (
              <div className="mt-2 inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                Late Login
              </div>
            ) : showApprovedLateLogin ? (
              <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                Approved Late Login
              </div>
            ) : null}
          </div>
          <div className={statusBadgeClassName}>
            <span className={`h-2.5 w-2.5 rounded-full ${statusTheme.dot}`} />
            {statusLabel}
          </div>
        </div>

        <div className="mt-3 flex justify-center">
          <div className={isEmployeeVariant ? 'rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-2.5' : 'rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3'}>
            <div className="flex items-center justify-center gap-2 text-center">
              <span className={`font-mono text-[1.55rem] font-semibold leading-none tabular-nums ${isEmployeeVariant ? 'text-slate-950' : 'text-white'}`}>
                {sessionStopwatchText || breakStopwatchText || currentTimeParts.timeText}
              </span>
              {!sessionStopwatchText && !breakStopwatchText ? (
                <span className={`font-mono text-[0.92rem] font-semibold leading-none tabular-nums ${isEmployeeVariant ? 'text-slate-700' : 'text-white'}`}>
                  {currentTimeParts.dayPeriod}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <label className={isEmployeeVariant ? 'mt-5 block text-[0.92rem] text-slate-600' : 'mt-5 block text-[11px] text-slate-400'}>
          Location / workspace
          <input
            type="text"
            value={locationInput}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="Remote - Home Office"
            className={inputClassName}
          />
        </label>

        <div className={isEmployeeVariant ? 'mt-4 grid grid-cols-2 gap-4' : 'mt-5 grid grid-cols-2 gap-3'}>
          {activeSession ? (
            <button
              type="button"
              onClick={isOnBreak ? onResumeBreak : onStartBreak}
              disabled={attendanceActionDisabled}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-medium transition-colors ${
                attendanceActionDisabled
                  ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                  : isOnBreak
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                    : isEmployeeVariant
                      ? 'bg-amber-400 text-slate-950 hover:bg-amber-500'
                      : 'bg-amber-400 text-slate-950 hover:bg-amber-500'
              } ${isEmployeeVariant ? 'text-[0.95rem]' : 'text-xs font-semibold'}`}
            >
              {breakLoading ? (
                <span className={`rounded-full border-2 border-white border-t-transparent animate-spin ${isEmployeeVariant ? 'h-4 w-4' : 'h-3 w-3'}`} />
              ) : isOnBreak ? (
                <Play size={isEmployeeVariant ? 16 : 14} />
              ) : (
                <Coffee size={isEmployeeVariant ? 16 : 14} />
              )}
              {breakLoading ? 'Updating...' : isOnBreak ? 'Resume work' : 'Start break'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              disabled={attendanceActionDisabled}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-medium transition-colors ${
                loginLoading
                  ? 'cursor-wait bg-slate-200 text-slate-400'
                  : isEmployeeVariant
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
              } ${isEmployeeVariant ? 'text-[0.95rem]' : 'text-xs font-semibold'}`}
            >
              {loginLoading ? (
                <span className={`rounded-full border-2 border-white border-t-transparent animate-spin ${isEmployeeVariant ? 'h-4 w-4' : 'h-3 w-3'}`} />
              ) : (
                <LogIn size={isEmployeeVariant ? 16 : 14} />
              )}
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            disabled={!activeSession || attendanceActionDisabled}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-medium transition-colors ${
              activeSession && !attendanceActionDisabled
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : isEmployeeVariant
                  ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                  : 'cursor-not-allowed bg-slate-800 text-slate-500'
            } ${isEmployeeVariant ? 'text-[0.95rem]' : 'text-xs font-semibold'}`}
          >
            {logoutLoading ? (
              <span className={`rounded-full border-2 border-white border-t-transparent animate-spin ${isEmployeeVariant ? 'h-4 w-4' : 'h-3 w-3'}`} />
            ) : (
              <LogOut size={isEmployeeVariant ? 16 : 14} />
            )}
            {logoutLoading ? 'Logging out...' : 'Logout'}
          </button>
        </div>

        {errorMessage ? (
          <p className={`mt-4 rounded-2xl border px-4 py-3 ${isEmployeeVariant ? 'border-rose-200 bg-rose-50 text-sm text-rose-600' : 'border-rose-400/20 bg-rose-400/10 text-[11px] text-rose-200'}`}>
            {errorMessage}
          </p>
        ) : null}
        {showLateLoginWarning ? (
          <div className={`mt-4 rounded-2xl border px-4 py-3 ${isEmployeeVariant ? 'border-amber-200 bg-amber-50 text-sm text-amber-700' : 'border-amber-400/20 bg-amber-400/10 text-[11px] text-amber-100'}`}>
            Login window closed at {lateLoginPolicy?.cutoffTimeLabel}. Please contact your TL or Admin for approval.
          </div>
        ) : null}
        {!showLateLoginWarning && !activeSession && lateLoginPolicy?.hasApproval ? (
          <div className={`mt-4 rounded-2xl border px-4 py-3 ${isEmployeeVariant ? 'border-emerald-200 bg-emerald-50 text-sm text-emerald-700' : 'border-emerald-400/20 bg-emerald-400/10 text-[11px] text-emerald-100'}`}>
            Late login is approved for today{lateLoginPolicy.approval?.approvedByName ? ` by ${lateLoginPolicy.approval.approvedByName}` : ''}.
          </div>
        ) : null}

        <div className={`mt-4 rounded-[22px] border ${isEmployeeVariant ? 'border-slate-200 bg-slate-50 px-2.5 py-2 text-[0.84rem] text-slate-600' : 'border-white/10 bg-white/5 px-4 py-3 text-[11px] text-slate-300'}`}>
          <div className={isEmployeeVariant ? 'divide-y divide-slate-200' : 'space-y-2'}>
            <div className={`flex items-center justify-between gap-4 py-2 ${isEmployeeVariant ? '' : 'border-t border-white/10 pt-2'}`}>
              <span>Logged in at</span>
              <span className={`text-[0.95em] font-medium ${isEmployeeVariant ? 'text-slate-900' : 'text-white'}`}>{loggedInTimeLabel}</span>
            </div>
            <div className={`flex items-center justify-between gap-4 py-2 ${isEmployeeVariant ? '' : 'border-t border-white/10 pt-2'}`}>
              <span>Today</span>
              <span className={`text-[0.95em] font-medium ${isEmployeeVariant ? 'text-slate-900' : 'text-white'}`}>{currentDateLabel}</span>
            </div>
            {!hideLocationDetails ? (
              <div className={`flex items-start justify-between gap-4 py-2 ${isEmployeeVariant ? '' : 'border-t border-white/10 pt-2'}`}>
                <span>Location</span>
                <span className={`max-w-[220px] text-right text-[0.95em] font-medium ${isEmployeeVariant ? 'text-slate-900' : 'text-white'}`}>
                  {resolvedLocationLabel}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceLiveSession;
