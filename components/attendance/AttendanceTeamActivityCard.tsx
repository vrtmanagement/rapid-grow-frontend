import React from 'react';
import { RefreshCw } from 'lucide-react';
import { getDisplayAvatarUrl } from '../../utils/avatar';
import {
  TeamAttendanceLogEntry,
  TeamAttendanceMemberActivity,
} from './attendanceViewUtils';
import {
  formatTeamActivityDuration,
  formatTeamSnapshotTime,
  getCurrentViewerActivityMeta,
  getTeamActivityStatusMeta,
} from './attendanceOverviewGridUtils';

interface Props {
  onOpenTeamAttendance: () => void;
  onRefreshTeamActivity: () => void;
  teamAttendanceSummaryLoading: boolean;
  teamClockedInCount: number;
  teamOnBreakCount: number;
  teamInactiveCount: number;
  teamActivityEntries: TeamAttendanceLogEntry[];
  teamActivityMemberByEmpId: Map<string, TeamAttendanceMemberActivity>;
  teamAvatarByEmpId: Record<string, string>;
  teamActivityNow: number;
  teamPresenceRate: number;
  currentViewerEmpId: string;
  isManagerPortal: boolean;
}

const AttendanceTeamActivityCard: React.FC<Props> = ({
  onOpenTeamAttendance,
  onRefreshTeamActivity,
  teamAttendanceSummaryLoading,
  teamClockedInCount,
  teamOnBreakCount,
  teamInactiveCount,
  teamActivityEntries,
  teamActivityMemberByEmpId,
  teamAvatarByEmpId,
  teamActivityNow,
  teamPresenceRate,
  currentViewerEmpId,
  isManagerPortal,
}) => {
  return (
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
                const viewerMeta = getCurrentViewerActivityMeta(member.empId, currentViewerEmpId, isManagerPortal);
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
                const avatarSrc = getDisplayAvatarUrl(teamAvatarByEmpId[member.empId] || member.avatar, member.empName);

                return (
                  <div
                    key={member.id || `${member.empId}-${activityTime || 'activity'}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors duration-200 hover:bg-slate-200/80"
                  >
                    <div className="relative shrink-0">
                      <div className="h-10 w-10 overflow-hidden rounded-2xl bg-slate-100">
                        <img src={avatarSrc} alt={member.empName} className="h-full w-full object-cover" />
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
  );
};

export default AttendanceTeamActivityCard;
