import React from 'react';
import { Coffee, LogIn, LogOut, MapPin, Play, RefreshCw } from 'lucide-react';
import AttendanceSummaryCards from './AttendanceSummaryCards';
import AttendancePresenceChart from './AttendancePresenceChart';
import { AttendanceSummaryResponse } from './attendanceUtils';
import { AttendanceEmployeeOption, TeamAttendanceActivityType, TeamAttendanceLogEntry, TeamAttendanceSummary } from './attendanceViewUtils';

interface TeamAttendanceSectionProps {
  canReviewTeamAttendance: boolean;
  employeePickerOpen: boolean;
  monthPickerOpen: boolean;
  employeePickerRef: React.RefObject<HTMLDivElement | null>;
  monthPickerRef: React.RefObject<HTMLDivElement | null>;
  setEmployeePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setMonthPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  employeeOptions: AttendanceEmployeeOption[];
  selectedEmployeeEmpId: string;
  selectedEmployeeMonth: string;
  selectedEmployeeLabel: string;
  selectedEmployeeMonthLabel: string;
  selectedEmployee: AttendanceEmployeeOption | null;
  employeeMonthOptions: { value: string; label: string }[];
  employeeSummary: AttendanceSummaryResponse | null;
  employeeAttendanceLoading: boolean;
  teamAttendanceSummaryLoading: boolean;
  teamAttendanceSummary: TeamAttendanceSummary | null;
  currentViewerEmpId?: string;
  onRefreshTeamActivity: () => void;
  selectedEmployeeTodayInfo: { minutes: number; color: string };
  selectedEmployeeMonthlyAttendance: { present: number; absent: number; total: number };
  setSelectedEmployeeEmpId: (value: string) => void;
  setSelectedEmployeeMonth: (value: string) => void;
}

const TeamAttendanceSection: React.FC<TeamAttendanceSectionProps> = ({
  canReviewTeamAttendance,
  employeePickerOpen,
  monthPickerOpen,
  employeePickerRef,
  monthPickerRef,
  setEmployeePickerOpen,
  setMonthPickerOpen,
  employeeOptions,
  selectedEmployeeEmpId,
  selectedEmployeeMonth,
  selectedEmployeeLabel,
  selectedEmployeeMonthLabel,
  selectedEmployee,
  employeeMonthOptions,
  employeeSummary,
  employeeAttendanceLoading,
  teamAttendanceSummaryLoading,
  teamAttendanceSummary,
  currentViewerEmpId,
  onRefreshTeamActivity,
  selectedEmployeeTodayInfo,
  selectedEmployeeMonthlyAttendance,
  setSelectedEmployeeEmpId,
  setSelectedEmployeeMonth,
}) => {
  if (!canReviewTeamAttendance) return null;

  const [now, setNow] = React.useState(() => Date.now());
  const teamMembers = React.useMemo(() => teamAttendanceSummary?.members ?? [], [teamAttendanceSummary?.members]);
  const teamActivityEntries = React.useMemo(() => teamAttendanceSummary?.activityLog ?? [], [teamAttendanceSummary?.activityLog]);
  const teamMemberByEmpId = React.useMemo(
    () => new Map(teamMembers.map((member) => [member.empId, member])),
    [teamMembers],
  );
  const clockedInCount = React.useMemo(
    () => teamAttendanceSummary?.clockedIn ?? teamMembers.filter((member) => member.status === 'clocked_in').length,
    [teamAttendanceSummary?.clockedIn, teamMembers],
  );
  const onBreakCount = React.useMemo(
    () => teamAttendanceSummary?.onBreak ?? teamMembers.filter((member) => member.status === 'on_break').length,
    [teamAttendanceSummary?.onBreak, teamMembers],
  );
  const absentCount = React.useMemo(
    () => Math.max(0, (teamAttendanceSummary?.total ?? teamMembers.length) - clockedInCount - onBreakCount),
    [clockedInCount, onBreakCount, teamAttendanceSummary?.total, teamMembers.length],
  );

  React.useEffect(() => {
    const hasLiveBreak = teamActivityEntries.some((entry) => {
      if (entry.activityType !== 'break_started') return false;
      const member = teamMemberByEmpId.get(entry.empId);
      return member?.status === 'on_break' && member?.lastActivityType === 'break_started' && member?.lastActivityAt === entry.activityAt;
    });

    if (!hasLiveBreak) return undefined;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [teamActivityEntries, teamMemberByEmpId]);

  const formatActivityTime = React.useCallback((value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  }, []);

  const formatDuration = React.useCallback((totalSeconds: number) => {
    const safeSeconds = Math.max(0, totalSeconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    }

    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }, []);

  const getActivityMeta = React.useCallback((activityType: TeamAttendanceActivityType, status: string) => {
    if (activityType === 'checked_in') {
      return {
        label: 'Logged in',
        chipClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
        dotClass: 'bg-emerald-500',
        icon: <LogIn size={14} className="text-emerald-600" />,
      };
    }

    if (activityType === 'break_started') {
      return {
        label: 'Break started',
        chipClass: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100',
        dotClass: 'bg-amber-500',
        icon: <Coffee size={14} className="text-amber-500" />,
      };
    }

    if (activityType === 'work_resumed') {
      return {
        label: 'Work resumed',
        chipClass: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100',
        dotClass: 'bg-sky-500',
        icon: <Play size={14} className="text-sky-600" />,
      };
    }

    if (activityType === 'checked_out' || status === 'checked_out') {
      return {
        label: 'Logged out',
        chipClass: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
        dotClass: 'bg-slate-400',
        icon: <LogOut size={14} className="text-slate-500" />,
      };
    }

    return {
      label: 'Logged out',
      chipClass: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
      dotClass: 'bg-slate-400',
      icon: <LogOut size={14} className="text-slate-500" />,
    };
  }, []);

  const renderActivityRow = React.useCallback((entry: TeamAttendanceLogEntry) => {
    const memberState = teamMemberByEmpId.get(entry.empId);
    const activityMeta = getActivityMeta(entry.activityType, entry.status);
    const isViewerEntry = !!currentViewerEmpId && currentViewerEmpId === entry.empId;
    const workingMinutes = Math.max(0, entry.workingMinutes || 0);
    const workingHours = (workingMinutes / 60).toFixed(1);
    const progressWidth = entry.status === 'absent'
      ? '0%'
      : `${Math.max(18, Math.min(100, (workingMinutes / (8 * 60)) * 100))}%`;
    const progressColor = entry.status === 'absent'
      ? '#cbd5e1'
      : workingMinutes >= 270
        ? '#f59e0b'
        : '#ef4444';
    const isLiveBreak =
      entry.activityType === 'break_started' &&
      memberState?.status === 'on_break' &&
      memberState?.lastActivityType === 'break_started' &&
      memberState?.lastActivityAt === entry.activityAt;
    const breakDurationLabel = entry.activityType === 'break_started'
      ? isLiveBreak
        ? formatDuration(Math.max(0, Math.floor((now - new Date(entry.activityAt).getTime()) / 1000)))
        : typeof entry.breakDurationSeconds === 'number'
          ? formatDuration(entry.breakDurationSeconds)
          : null
      : null;
    const profileText = entry.designation || entry.department || entry.empId;
    const locationText = entry.location || 'Location not set';

    return (
      <div
        key={entry.id}
        className="flex items-start gap-4 px-6 py-4 transition-colors duration-200 hover:bg-slate-200/80 md:px-8"
      >
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-base font-semibold text-white">
            {entry.empName
              .split(' ')
              .map((part) => part[0] || '')
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${activityMeta.dotClass}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-slate-900">{entry.empName}</p>
            {isViewerEntry ? (
              <span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold leading-none text-violet-700 ring-1 ring-inset ring-violet-100">
                You
              </span>
            ) : null}
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none ${activityMeta.chipClass}`}>
              {activityMeta.label}
            </span>
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-[12px] text-slate-500">
            {profileText ? (
              <>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-50">
                  {activityMeta.icon}
                </span>
                <span className="truncate">{profileText}</span>
                <span className="text-slate-300">·</span>
              </>
            ) : null}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-50">
              <MapPin size={14} className="text-slate-500" />
            </span>
            <span className="min-w-0 flex-1 truncate">{locationText}</span>
          </div>

          <div className="mt-3 h-1.5 w-[116px] overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: progressWidth, backgroundColor: progressColor }}
            />
          </div>
        </div>

        <div className="min-w-[84px] shrink-0 text-right">
          <p className="text-[15px] font-semibold text-slate-900">{formatActivityTime(entry.activityAt)}</p>
          <p className={`mt-1 text-[12px] ${breakDurationLabel ? 'font-mono font-semibold text-amber-600' : 'text-slate-400'}`}>
            {breakDurationLabel || (entry.status === 'absent' ? '-' : `${workingHours}h today`)}
          </p>
        </div>
      </div>
    );
  }, [currentViewerEmpId, formatActivityTime, formatDuration, getActivityMeta, now, teamMemberByEmpId]);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 bg-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-brand-red" />
              <span className="text-[15px] text-slate-500">Today team activity</span>
            </div>
            <h3 className="text-2xl font-semibold text-slate-950">Today activity history</h3>
            <p className="mt-2 text-[15px] text-slate-500">
              Complete live history for today&apos;s team attendance events, ordered from latest to earliest.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefreshTeamActivity}
            disabled={teamAttendanceSummaryLoading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 md:self-auto"
          >
            <RefreshCw size={14} className={teamAttendanceSummaryLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-5 md:px-8">
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
            {clockedInCount} logged in
          </span>
          <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
            {onBreakCount} on break
          </span>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
            {absentCount} absent
          </span>
        </div>

        {teamAttendanceSummaryLoading ? (
          <div className="divide-y divide-slate-100 px-6 py-3 md:px-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`team-history-skeleton-${index}`} className="flex items-start gap-4 py-4">
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-100" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-48 rounded bg-slate-100" />
                  <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
                  <div className="mt-3 h-2 w-24 rounded bg-slate-100" />
                </div>
                <div className="w-20 shrink-0">
                  <div className="ml-auto h-4 w-16 rounded bg-slate-100" />
                  <div className="ml-auto mt-3 h-3 w-14 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : teamActivityEntries.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400 md:px-8">
            No team attendance activity is available for today yet.
          </div>
        ) : (
          <div className="max-h-[620px] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0">
            <div className="divide-y divide-slate-100">
              {teamActivityEntries.map((entry) => renderActivityRow(entry))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[32px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy px-6 py-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.18)] md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-brand-red" />
              <span className="text-[15px] text-slate-300">Employee Attendance</span>
            </div>
            <h3 className="text-2xl font-semibold text-white">Team member attendance</h3>
            <p className="mt-2 text-[15px] text-slate-300">
              Review any employee&apos;s monthly attendance without changing the current dashboard flow.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:min-w-[520px]">
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-slate-200">Select employee</span>
              <div className="relative" ref={employeePickerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setEmployeePickerOpen((prev) => !prev);
                    setMonthPickerOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/12 bg-white/12 px-4 py-3 text-left text-[15px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-all hover:bg-white/16 focus:border-white/25 focus:bg-white/16 focus:ring-2 focus:ring-white/10"
                >
                  <span className="truncate pr-4">{selectedEmployeeLabel}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-300 transition-transform ${employeePickerOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {employeePickerOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                    <div className="max-h-64 overflow-y-auto py-2">
                      {employeeOptions.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">No employees found</div>
                      ) : (
                        employeeOptions.map((employee) => {
                          const isSelected = employee.empId === selectedEmployeeEmpId;
                          return (
                            <button
                              key={employee.empId}
                              type="button"
                              onClick={() => {
                                setSelectedEmployeeEmpId(employee.empId);
                                setEmployeePickerOpen(false);
                              }}
                              className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                                isSelected
                                  ? 'bg-rose-50 text-slate-900'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate pr-4">{employee.empName} ({employee.empId})</span>
                              {isSelected && <span className="text-xs font-semibold text-brand-red">Selected</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-slate-200">Select month</span>
              <div className="relative" ref={monthPickerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setMonthPickerOpen((prev) => !prev);
                    setEmployeePickerOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/12 bg-white/12 px-4 py-3 text-left text-[15px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-all hover:bg-white/16 focus:border-white/25 focus:bg-white/16 focus:ring-2 focus:ring-white/10"
                >
                  <span className="truncate pr-4">{selectedEmployeeMonthLabel}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-300 transition-transform ${monthPickerOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {monthPickerOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                    <div className="max-h-64 overflow-y-auto py-2">
                      {employeeMonthOptions.map((month) => {
                        const isSelected = month.value === selectedEmployeeMonth;
                        return (
                          <button
                            key={month.value}
                            type="button"
                            onClick={() => {
                              setSelectedEmployeeMonth(month.value);
                              setMonthPickerOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                              isSelected
                                ? 'bg-rose-50 text-slate-900'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{month.label}</span>
                            {isSelected && <span className="text-xs font-semibold text-brand-red">Selected</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {selectedEmployee ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
            <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
              {selectedEmployee.empName}
            </div>
            <div className="inline-flex items-center rounded-full bg-amber-400/12 px-4 py-2 text-sm font-medium text-amber-100">
              {selectedEmployee.designation || 'Employee'}
            </div>
            <div className="inline-flex items-center rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-slate-300">
              {selectedEmployee.department || selectedEmployee.role}
            </div>
          </div>
        ) : null}
      </div>

      {selectedEmployeeEmpId ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <AttendanceSummaryCards
              summary={employeeSummary}
              range="month"
              todayMinutes={selectedEmployeeTodayInfo.minutes}
              todayColor={selectedEmployeeTodayInfo.color}
              leaveDaysInRange={0}
              loading={employeeAttendanceLoading}
            />
            <AttendancePresenceChart
              summary={employeeSummary}
              loading={employeeAttendanceLoading}
              selectedMonth={selectedEmployeeMonth}
            />
          </div>

          <div className="lg:col-span-4">
            <div className="space-y-6">
              <div className="rounded-[30px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy p-6 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
                <h4 className="text-lg font-semibold text-white">Attendance selection</h4>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Use the employee and month selectors above to review monthly attendance in a focused way.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Employee</p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {selectedEmployee?.empName || 'Select an employee'}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {selectedEmployee?.empId || 'No employee selected'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Month</p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {employeeMonthOptions.find((month) => month.value === selectedEmployeeMonth)?.label || 'Select month'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <h5 className="text-lg font-semibold text-white">Monthly attendance</h5>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Shows the selected employee&apos;s monthly attendance with Sundays excluded from total working days.
                    </p>
                    {employeeAttendanceLoading ? (
                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white/5 px-3 py-4 text-center text-sm text-slate-400">...</div>
                        <div className="rounded-xl bg-white/5 px-3 py-4 text-center text-sm text-slate-400">...</div>
                        <div className="rounded-xl bg-white/5 px-3 py-4 text-center text-sm text-slate-400">...</div>
                      </div>
                    ) : (
                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-emerald-500/10 px-3 py-4 text-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Present</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{selectedEmployeeMonthlyAttendance.present}</p>
                        </div>
                        <div className="rounded-xl bg-rose-500/10 px-3 py-4 text-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-200">Absent</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{selectedEmployeeMonthlyAttendance.absent}</p>
                        </div>
                        <div className="rounded-xl bg-white/5 px-3 py-4 text-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Total</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{selectedEmployeeMonthlyAttendance.total}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center text-slate-500 shadow-sm">
          No employee is available for attendance review.
        </div>
      )}
    </section>
  );
};

export default TeamAttendanceSection;
