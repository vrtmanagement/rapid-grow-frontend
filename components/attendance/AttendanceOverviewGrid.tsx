import React from 'react';
import {
  AttendanceSession,
  AttendanceSummaryResponse,
  Range,
} from './attendanceUtils';
import AttendanceSummaryCards from './AttendanceSummaryCards';
import AttendancePresenceChart from './AttendancePresenceChart';
import AttendanceLiveSession from './AttendanceLiveSession';
import type { TeamAttendanceSummary } from './attendanceViewUtils';

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
  onLogout: () => void;
  loginLoading: boolean;
  logoutLoading: boolean;
  sessionError: string | null;
  canReviewTeamAttendance: boolean;
  teamAttendanceSummaryLoading: boolean;
  teamAttendanceSummary: TeamAttendanceSummary | null;
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
  onLogout,
  loginLoading,
  logoutLoading,
  sessionError,
  canReviewTeamAttendance,
  teamAttendanceSummaryLoading,
  teamAttendanceSummary,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        <AttendanceSummaryCards
          summary={summary}
          range={range}
          todayMinutes={todayMinutes}
          todayColor={todayColor}
          leaveDaysInRange={leaveDaysInRange}
          loading={attendancePageLoading}
        />
        <AttendancePresenceChart summary={summary} loading={attendancePageLoading} selectedMonth={selectedMonth} />
      </div>

      <div className="lg:col-span-4 space-y-6">
        <AttendanceLiveSession
          activeSession={activeSession}
          locationInput={locationInput}
          onLocationChange={onLocationChange}
          onLogin={onLogin}
          onLogout={onLogout}
          loginLoading={loginLoading}
          logoutLoading={logoutLoading}
          errorMessage={sessionError}
          loading={attendancePageLoading}
        />
        {canReviewTeamAttendance && (
          <div className="rounded-[30px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy p-6 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
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
