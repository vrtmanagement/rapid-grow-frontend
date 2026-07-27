import React from 'react';
import { AttendanceSession } from './attendanceUtils';
import { formatTeamActivityDuration, getTodayActivityIcon, TodayActivityEvent } from './attendanceOverviewGridUtils';

interface Props {
  todayActivityEvents: TodayActivityEvent[];
  activeSession: AttendanceSession | null;
  teamActivityNow: number;
}

const AttendanceTodayActivityCard: React.FC<Props> = ({ todayActivityEvents, activeSession, teamActivityNow }) => {
  return (
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
  );
};

export default AttendanceTodayActivityCard;
