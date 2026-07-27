import React from 'react';
import { AttendanceDay, formatMinutes, getBadgeColorsByMinutes } from './attendanceUtils';
import { BREAK_STATUS_COLORS, formatDayLabel } from './attendanceOverviewGridUtils';

interface WeekDayItem {
  key: string;
  date: Date;
  record?: AttendanceDay;
  weekend: boolean;
}

interface WeeklyTotals {
  totalMinutes: number;
  targetMinutes: number;
  progress: number;
  remainingMinutes: number;
}

interface Props {
  lastSevenDays: WeekDayItem[];
  weeklyTotals: WeeklyTotals;
}

const AttendanceWeekGlanceCard: React.FC<Props> = ({ lastSevenDays, weeklyTotals }) => {
  return (
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
            ? BREAK_STATUS_COLORS
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
  );
};

export default AttendanceWeekGlanceCard;
