import React from 'react';
import { AttendanceDay, getHoursColor } from './attendanceUtils';
import {
  BREAK_STATUS_COLORS,
  formatAttendanceLogDuration,
  formatDayLabel,
  formatSessionTime,
  getDurationProgressWidth,
  resolveRowMeta,
} from './attendanceOverviewGridUtils';

interface Props {
  onOpenHistory: () => void;
  displayRows: AttendanceDay[];
  resolvedRowLocations: Record<string, string>;
}

const AttendanceLogTable: React.FC<Props> = ({ onOpenHistory, displayRows, resolvedRowLocations }) => {
  return (
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
                              backgroundColor: meta.isBreakSession ? BREAK_STATUS_COLORS.solid : getHoursColor(day.minutes / 60),
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
  );
};

export default AttendanceLogTable;
