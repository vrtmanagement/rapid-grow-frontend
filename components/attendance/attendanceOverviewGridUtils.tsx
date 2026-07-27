import React from 'react';
import { Check, Coffee, LogIn, LogOut, Play, X } from 'lucide-react';
import { AttendanceDay, getBadgeColorsByMinutes } from './attendanceUtils';
import { TeamAttendanceActivityType, TeamAttendanceLogEntry } from './attendanceViewUtils';

export const BREAK_STATUS_COLORS = { bg: '#fef3c7', text: '#b45309', solid: '#fbbf24' };
export const DURATION_PROGRESS_MAX_HOURS = 10;

export type TodayActivityIcon =
  | 'login'
  | 'break'
  | 'resume'
  | 'logout'
  | 'leave-approved'
  | 'leave-pending'
  | 'leave-rejected';

export interface TodayActivityEvent {
  id: string;
  title: string;
  detail: string;
  occurredAt: number;
  breakDurationSeconds?: number;
  icon: TodayActivityIcon;
}

export function getAttendanceTimezoneDate(value?: string | Date) {
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
}

export function formatSessionTime(value?: string | Date | null) {
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

export function getHalfDayActivityLabel(value?: string | null) {
  return value === 'SECOND_HALF' ? 'Second Half' : value === 'FIRST_HALF' ? 'First Half' : 'Half-day';
}

export function formatTeamSnapshotTime(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export function getTeamActivityStatusMeta(
  activityType: TeamAttendanceActivityType,
  status: TeamAttendanceLogEntry['status'],
) {
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
}

export function getCurrentViewerActivityMeta(
  empId: string | undefined,
  currentViewerEmpId: string,
  isManagerPortal: boolean,
) {
  if (!isManagerPortal || !currentViewerEmpId || !empId || currentViewerEmpId !== empId) {
    return null;
  }

  return {
    label: 'You',
    className: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100',
  };
}

export function formatTeamActivityDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export function getDurationProgressWidth(minutes: number) {
  const hours = minutes / 60;
  return Math.max(0, Math.min(100, (hours / DURATION_PROGRESS_MAX_HOURS) * 100));
}

export function formatAttendanceLogDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatDayLabel(date: Date, options?: Intl.DateTimeFormatOptions) {
  return date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    ...options,
  });
}

export function resolveRowMeta(day: AttendanceDay) {
  const sortedSessions = [...(day.sessions || [])].sort((a, b) => (
    new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime()
  ));
  const firstSession = sortedSessions[0];
  const lastSession = sortedSessions[sortedSessions.length - 1];
  const isOpenSession = !!lastSession && !lastSession.logoutTime;
  const isBreakSession = isOpenSession && !!lastSession?.isOnBreak;
  const badge = isBreakSession ? BREAK_STATUS_COLORS : getBadgeColorsByMinutes(day.minutes);
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
}

export function getTodayActivityIcon(icon: TodayActivityIcon) {
  if (icon === 'login') return <LogIn size={14} className="text-emerald-600" />;
  if (icon === 'break') return <Coffee size={14} className="text-amber-500" />;
  if (icon === 'resume') return <Play size={14} className="text-sky-600" />;
  if (icon === 'leave-approved') return <Check size={14} className="text-emerald-600" />;
  if (icon === 'leave-pending') return <Coffee size={14} className="text-amber-500" />;
  if (icon === 'leave-rejected') return <X size={14} className="text-rose-500" />;
  return <LogOut size={14} className="text-rose-500" />;
}
