import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';
import {
  AttendanceDay,
  AttendanceSummaryResponse,
  LeaveRequest,
  Range,
  getHoursColor,
} from './attendanceUtils';
import { Skeleton, SkeletonBlock } from '../ui/Skeleton';
import { fetchHolidays, CompanyHoliday } from './attendanceOpsApi';
import { getUserTimeZone } from '../../utils/timezone';

interface Props {
  summary: AttendanceSummaryResponse | null;
  loading: boolean;
  selectedMonth?: string;
  range?: Range;
  variant?: 'employee' | 'manager';
  todayMinutes?: number;
  leaves?: LeaveRequest[];
  monthlyPaidLeaves?: number;
}

const SUNDAY_BAR_COLOR = '#a5b4fc';
const HOLIDAY_BAR_COLOR = '#c4b5fd';
const LEAVE_BAR_COLOR = '#7dd3fc';
const SPECIAL_BAR_HOURS = 9;

function leaveCoversDateKey(leave: LeaveRequest, dateKey: string) {
  if (String(leave.status || '').toUpperCase() !== 'APPROVED') return false;
  const startKey = String(leave.startDate || '').slice(0, 10);
  const endKey = String(leave.endDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startKey) || !/^\d{4}-\d{2}-\d{2}$/.test(endKey)) {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    const day = new Date(`${dateKey}T12:00:00`);
    return day >= new Date(start.toDateString()) && day <= new Date(end.toDateString());
  }
  return dateKey >= startKey && dateKey <= endKey;
}

const AttendancePresenceChart: React.FC<Props> = ({
  summary,
  loading,
  selectedMonth,
  range = 'month',
  variant = 'manager',
  todayMinutes = 0,
  leaves = [],
  monthlyPaidLeaves = 1,
}) => {
  const isEmployeeVariant = variant === 'employee';
  const breakBarColor = '#fbbf24';
  const [holidays, setHolidays] = React.useState<CompanyHoliday[]>([]);

  const getDatePartsInAttendanceTimezone = (value: Date | string) => {
    const parsed = value instanceof Date ? value : new Date(value);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: getUserTimeZone(),
    });
    const parts = formatter.formatToParts(parsed);

    return {
      year: Number(parts.find((part) => part.type === 'year')?.value || 0),
      month: Number(parts.find((part) => part.type === 'month')?.value || 0),
      day: Number(parts.find((part) => part.type === 'day')?.value || 0),
    };
  };

  const getDateKeyInAttendanceTimezone = (value: Date | string) => {
    const { year, month, day } = getDatePartsInAttendanceTimezone(value);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getWeekdayShort = (dateKey: string) =>
    new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: getUserTimeZone(),
    }).format(new Date(`${dateKey}T12:00:00+05:30`));

  const isSundayDateKey = (dateKey: string) => getWeekdayShort(dateKey) === 'Sun';

  React.useEffect(() => {
    let cancelled = false;
    const yearSource =
      selectedMonth ||
      (summary?.days?.length ? String(summary.days[0]?.date || '').slice(0, 7) : '') ||
      getDateKeyInAttendanceTimezone(new Date()).slice(0, 7);
    const year = Number(String(yearSource).slice(0, 4));
    if (!Number.isFinite(year)) return;

    fetchHolidays(year)
      .then((rows) => {
        if (!cancelled) setHolidays(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setHolidays([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, summary?.days, summary?.start]);

  const holidayByDate = React.useMemo(() => {
    const map = new Map<string, CompanyHoliday>();
    holidays.forEach((holiday) => {
      if (holiday?.dateKey) map.set(holiday.dateKey, holiday);
    });
    return map;
  }, [holidays]);

  const resolveSpecialDay = (
    dateKey: string,
    options?: { treatLeaveAsPaid?: boolean },
  ) => {
    if (isSundayDateKey(dateKey)) {
      return {
        kind: 'sunday' as const,
        label: '-- sunday --',
        color: SUNDAY_BAR_COLOR,
      };
    }

    const holiday = holidayByDate.get(dateKey);
    if (holiday) {
      return {
        kind: 'holiday' as const,
        label: '-- holiday --',
        color: HOLIDAY_BAR_COLOR,
      };
    }

    if (options?.treatLeaveAsPaid) {
      const leave = leaves.find((item) => leaveCoversDateKey(item, dateKey));
      if (leave) {
        return {
          kind: 'leave' as const,
          label: '-- Leave --',
          color: LEAVE_BAR_COLOR,
        };
      }
    }

    return null;
  };

  const renderVerticalBarLabel = React.useCallback((props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    value?: string | number;
  }) => {
    const label = String(props.value || '').trim();
    if (!label) return <g />;

    const x = Number(props.x || 0);
    const y = Number(props.y || 0);
    const width = Math.max(Number(props.width || 0), 1);
    const height = Math.max(Number(props.height || 0), 1);
    const cx = x + width / 2;
    const cy = y + height / 2;
    const fontSize = label.length > 18 ? 8 : label.length > 12 ? 9 : 10;

    return (
      <text
        x={cx}
        y={cy}
        fill="#312e81"
        fontSize={fontSize}
        fontWeight={700}
        letterSpacing="0.02em"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    );
  }, []);

  const getMonthValueFromDate = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';

    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      timeZone: getUserTimeZone(),
    });

    const parts = formatter.formatToParts(parsed);
    const year = parts.find((part) => part.type === 'year')?.value || '';
    const month = parts.find((part) => part.type === 'month')?.value || '';
    return year && month ? `${year}-${month}` : '';
  };

  const getMonthElapsedDates = () => {
    const monthSource =
      selectedMonth ||
      (summary?.days?.length ? String(summary.days[0]?.date || '').slice(0, 7) : '') ||
      getMonthValueFromDate(summary?.start);
    if (!monthSource) return [];

    const [yearText, monthText] = monthSource.split('-');
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0) return [];

    const now = getDatePartsInAttendanceTimezone(new Date());
    const isCurrentMonth =
      now.year === year && now.month === monthIndex + 1;
    const lastDay = isCurrentMonth ? now.day : new Date(year, monthIndex + 1, 0).getDate();
    const dates: string[] = [];

    for (let day = 1; day <= lastDay; day += 1) {
      const current = new Date(year, monthIndex, day);
      dates.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }

    return dates;
  };

  const getDatesBetween = (startValue?: string, endValue?: string) => {
    if (!startValue || !endValue) return [];

    const startKey = getDateKeyInAttendanceTimezone(startValue);
    const endKey = getDateKeyInAttendanceTimezone(endValue);
    if (!startKey || !endKey) return [];

    const start = new Date(`${startKey}T00:00:00`);
    const end = new Date(`${endKey}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

    const dates: string[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      dates.push(getDateKeyInAttendanceTimezone(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  };

  const formatTime = (value?: string | null) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: getUserTimeZone(),
    });
  };

  const formatFullDate = (isoDate: string) => {
    const parsed = new Date(`${isoDate}T00:00:00`);
    const formatter = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: getUserTimeZone(),
    });
    const parts = formatter.formatToParts(parsed);
    const day = parts.find((part) => part.type === 'day')?.value || '';
    const month = parts.find((part) => part.type === 'month')?.value || '';
    const year = parts.find((part) => part.type === 'year')?.value || '';

    return `${day} ${month}, ${year}`;
  };
  const showWeekdayOnAxis = range === 'day' || range === 'week' || range === 'month';
  const formatChartDayLabel = (isoDate: string) => {
    const parsed = new Date(`${isoDate}T00:00:00`);
    if (showWeekdayOnAxis) {
      const weekdayLabel = parsed.toLocaleDateString('en-US', {
        weekday: range === 'month' ? 'narrow' : 'short',
        timeZone: getUserTimeZone(),
      });
      const dayLabel = parsed.toLocaleDateString('en-US', {
        day: 'numeric',
        timeZone: getUserTimeZone(),
      });
      return `${weekdayLabel}|${dayLabel}`;
    }

    return String(parsed.getDate());
  };
  const renderEmployeeXAxisTick = React.useCallback(({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) => {
    const rawValue = String(payload?.value || '');
    const [weekdayLabel, dayLabel] = rawValue.split('|');

    if (!rawValue.includes('|')) {
      return (
        <text x={x} y={y} dy={14} textAnchor="middle" fill="#94a3b8" fontSize={10}>
          {rawValue}
        </text>
      );
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <text textAnchor="middle" fill="#94a3b8" fontSize={range === 'month' ? 9 : 10}>
          <tspan x="0" dy="9">{weekdayLabel}</tspan>
          <tspan x="0" dy="12">{dayLabel}</tspan>
        </text>
      </g>
    );
  }, [range]);
  const getShownMonthLabel = () => {
    if (range === 'day' && summary?.start) {
      return new Date(summary.start).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: getUserTimeZone(),
      });
    }
    if (range === 'week' && summary?.start && summary?.end) {
      const startDate = new Date(summary.start);
      const endDate = new Date(summary.end);
      return `${startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: getUserTimeZone(),
      })} - ${endDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: getUserTimeZone(),
      })}`;
    }
    if (selectedMonth) {
      const selectedDate = new Date(`${selectedMonth}-01T00:00:00`);
      return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: getUserTimeZone() });
    }
    if (summary?.start) {
      const startDate = new Date(summary.start);
      return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: getUserTimeZone() });
    }
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: getUserTimeZone() });
  };

  const getShownMonthValue = () => (
    selectedMonth ||
    (summary?.days?.length ? String(summary.days[0]?.date || '').slice(0, 7) : '') ||
    getMonthValueFromDate(summary?.start)
  );

  const recordedDays = new Map<string, AttendanceDay>(
    (summary?.days ?? []).map((day) => [day.date, day] as const),
  );

  const todayDateKey = getDateKeyInAttendanceTimezone(new Date());
  const elapsedDates = range === 'month' ? getMonthElapsedDates() : getDatesBetween(summary?.start, summary?.end);
  const shownMonthValue = getShownMonthValue();
  const datesToShowBase = elapsedDates.length > 0 ? elapsedDates : (summary?.days ?? []).map((day) => day.date);
  const shouldForceTodayIntoChart =
    !!shownMonthValue &&
    todayDateKey.startsWith(`${shownMonthValue}-`) &&
    (todayMinutes > 0 || recordedDays.has(todayDateKey));
  const datesToShow = shouldForceTodayIntoChart
    ? Array.from(new Set([...datesToShowBase, todayDateKey])).sort()
    : datesToShowBase;

  const paidLeaveDateKeys = React.useMemo(() => {
    const allowance = Math.max(0, Math.min(31, Number(monthlyPaidLeaves) || 0));
    const candidateLeaveDays = datesToShow.filter((dateKey) => {
      if (isSundayDateKey(dateKey)) return false;
      if (holidayByDate.has(dateKey)) return false;
      const day = recordedDays.get(dateKey);
      const liveMinutes = dateKey === todayDateKey ? Math.max(day?.minutes || 0, todayMinutes) : day?.minutes || 0;
      if (liveMinutes > 0) return false;
      return leaves.some((item) => leaveCoversDateKey(item, dateKey));
    });
    return new Set([...candidateLeaveDays].sort().slice(0, allowance));
  }, [
    datesToShow,
    holidayByDate,
    leaves,
    monthlyPaidLeaves,
    recordedDays,
    todayDateKey,
    todayMinutes,
  ]);

  const chartData =
    datesToShow.map((dateKey) => {
      const dayLabel = formatChartDayLabel(dateKey);
      const d = recordedDays.get(dateKey);
      const liveMinutes = dateKey === todayDateKey ? Math.max(d?.minutes || 0, todayMinutes) : d?.minutes || 0;
      const special = resolveSpecialDay(dateKey, {
        treatLeaveAsPaid: paidLeaveDateKeys.has(dateKey),
      });
      const sundayWorked = special?.kind === 'sunday' && liveMinutes > 0;

      // Non-worked special days keep fixed color + label. Worked Sundays use hours color + sunday label.
      if (special && !sundayWorked) {
        return {
          date: formatFullDate(dateKey),
          dayLabel,
          hours: SPECIAL_BAR_HOURS,
          actualHours: 0,
          color: special.color,
          loginTime: special.label,
          logoutTime: special.label,
          statusLabel: 'Status',
          attendanceState: special.label,
          barLabel: special.label,
          isSpecialDay: true,
        };
      }

      if (!d) {
        if (dateKey === todayDateKey && liveMinutes > 0) {
          const liveHours = liveMinutes / 60;
          return {
            date: formatFullDate(dateKey),
            dayLabel,
            hours: parseFloat(liveHours.toFixed(2)),
            actualHours: parseFloat(liveHours.toFixed(2)),
            color: getHoursColor(liveHours),
            loginTime: 'N/A',
            logoutTime: 'Active now',
            statusLabel: 'Status',
            attendanceState: sundayWorked ? '-- sunday --' : 'Present',
            barLabel: sundayWorked ? '-- sunday --' : '',
            isSpecialDay: false,
          };
        }

        return {
          date: formatFullDate(dateKey),
          dayLabel,
          hours: SPECIAL_BAR_HOURS,
          actualHours: 0,
          color: '#94a3b8',
          loginTime: 'Absent',
          logoutTime: 'Absent',
          statusLabel: 'Status',
          attendanceState: 'Absent',
          barLabel: '-- absent --',
          isSpecialDay: true,
        };
      }

      const hours = liveMinutes / 60;
      if (liveMinutes <= 0) {
        return {
          date: formatFullDate(d.date),
          dayLabel,
          hours: SPECIAL_BAR_HOURS,
          actualHours: 0,
          color: '#94a3b8',
          loginTime: 'Absent',
          logoutTime: 'Absent',
          statusLabel: 'Status',
          attendanceState: 'Absent',
          barLabel: '-- absent --',
          isSpecialDay: true,
        };
      }

      const sortedSessions = [...(d.sessions || [])].sort((a, b) => (
        new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime()
      ));
      const firstSession = sortedSessions[0];
      const lastSession = sortedSessions[sortedSessions.length - 1];
      const isOpenSession = !!lastSession && !lastSession.logoutTime;
      const isBreakSession = isOpenSession && !!lastSession?.isOnBreak;
      return {
        date: formatFullDate(d.date),
        dayLabel,
        hours: parseFloat(hours.toFixed(2)),
        actualHours: parseFloat(hours.toFixed(2)),
        color: isBreakSession ? breakBarColor : getHoursColor(hours),
        loginTime: formatTime(firstSession?.loginTime),
        logoutTime: isBreakSession
          ? 'On break'
          : isOpenSession
            ? 'Active now'
          : formatTime(lastSession?.effectiveLogoutTime || lastSession?.logoutTime),
        statusLabel: isOpenSession ? 'Status' : 'Logout time',
        attendanceState: sundayWorked
          ? '-- sunday --'
          : isBreakSession
            ? 'On break'
            : 'Present',
        barLabel: sundayWorked ? '-- sunday --' : '',
        isSpecialDay: false,
      };
    }) ?? [];

  const recordedEntries = chartData.filter((entry) => (entry.actualHours ?? 0) > 0 && !entry.isSpecialDay);
  const fullDays = recordedEntries.filter((entry) => (entry.actualHours ?? 0) >= 8).length;
  const shortDays = recordedEntries.filter((entry) => (entry.actualHours ?? 0) > 0 && (entry.actualHours ?? 0) < 8).length;
  const absentDays = chartData.filter((entry) => entry.attendanceState === 'Absent').length;
  const totalHours = recordedEntries.reduce((total, entry) => total + (entry.actualHours ?? 0), 0);
  const averageHours = recordedEntries.length ? totalHours / recordedEntries.length : 0;
  const chartHoursCeiling = React.useMemo(() => {
    const maxActualHours = chartData.reduce((max, entry) => (
      Math.max(max, Number(entry.actualHours || 0), Number(entry.hours || 0))
    ), 0);
    return Math.max(9, Math.ceil(maxActualHours));
  }, [chartData]);

  if (isEmployeeVariant) {
    return (
      <div className="rounded-[34px] border border-slate-200 bg-white px-7 pt-7 pb-4">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-[1.15rem] font-semibold leading-none text-slate-950">Presence graph</h3>
            <p className="mt-3 text-sm text-slate-700">{getShownMonthLabel()}</p>
          </div>

          <div className="flex flex-col gap-4 xl:items-end">
            <div className="flex flex-wrap items-center gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Avg / day</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{averageHours.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Full days</p>
                <p className="mt-1 text-lg font-semibold text-emerald-600">{fullDays}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Short days</p>
                <p className="mt-1 text-lg font-semibold text-rose-500">{shortDays}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 h-[300px] w-full">
          {loading ? (
            <div className="h-full animate-pulse">
              <div className="flex h-full items-end gap-4 px-4">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={`attendance-bar-skeleton-${index}`} className="flex flex-1 flex-col justify-end gap-3">
                    <SkeletonBlock className={`w-full rounded-t-2xl ${index % 3 === 0 ? 'h-40' : index % 3 === 1 ? 'h-28' : 'h-20'}`} />
                    <Skeleton className="h-3 w-8 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              No attendance records in this range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 6, bottom: 10, left: -18 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#dbe4f0" />
                <XAxis
                  dataKey="dayLabel"
                  tick={renderEmployeeXAxisTick}
                  axisLine={false}
                  tickLine={false}
                  height={showWeekdayOnAxis ? 34 : undefined}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                  domain={[0, chartHoursCeiling]}
                  tickCount={6}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => [`${Number(value).toFixed(2)}h`, 'Hours']}
                  labelFormatter={(label) => `${label}`}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const entry = payload[0]?.payload;
                    return (
                      <div className="min-w-[190px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                        <p className="text-sm font-semibold text-slate-900">{entry?.date || label}</p>
                        <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center justify-between gap-4">
                            <span>Attendance</span>
                            <span className="font-semibold text-slate-900">{entry?.attendanceState || 'Present'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span>Hours</span>
                            <span className="font-semibold text-slate-900">
                              {entry?.isSpecialDay
                                ? entry?.attendanceState || 'Off'
                                : `${entry?.actualHours?.toFixed?.(2) ?? entry?.hours?.toFixed?.(2) ?? '0.00'}h`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span>Login time</span>
                            <span className="font-semibold text-slate-900">{entry?.loginTime || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span>{entry?.statusLabel || 'Logout time'}</span>
                            <span className="font-semibold text-slate-900">{entry?.logoutTime || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                  contentStyle={{
                    borderRadius: '14px',
                    border: 'none',
                    boxShadow: '0 20px 40px rgba(15,23,42,0.15)',
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="hours"
                  radius={[10, 10, 0, 0]}
                  barSize={range === 'day' ? 48 : 24}
                  minPointSize={8}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="barLabel" content={renderVerticalBarLabel} position="center" />
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SUNDAY_BAR_COLOR }} /> Sunday
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: HOLIDAY_BAR_COLOR }} /> Holiday
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LEAVE_BAR_COLOR }} /> Leave
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Absent
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> &ge; 8h
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> 7.5-8h
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &lt; 7.5h
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Presence graph</h3>
          <p className="text-xs text-slate-600 mt-1">
            {getShownMonthLabel()}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> ≥ 8h
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> 7.5–&lt;8h
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> &lt; 7.5h
          </span>
        </div>
      </div>
      <div className="h-72 w-full">
        {loading ? (
          <div className="h-full animate-pulse">
            <div className="flex h-full items-end gap-4 px-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={`attendance-bar-skeleton-${index}`} className="flex flex-1 flex-col justify-end gap-3">
                  <SkeletonBlock className={`w-full rounded-t-2xl ${index % 3 === 0 ? 'h-40' : index % 3 === 1 ? 'h-28' : 'h-20'}`} />
                  <Skeleton className="h-3 w-8 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            No attendance records in this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={false}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                domain={[0, chartHoursCeiling]}
                tickCount={6}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                formatter={(value: number) => [`${Number(value).toFixed(2)}h`, 'Hours']}
                labelFormatter={(label) => `${label}`}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0]?.payload;
                  return (
                    <div className="min-w-[180px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                      <p className="text-sm font-semibold text-slate-900">{entry?.date || label}</p>
                      <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center justify-between gap-4">
                          <span>Attendance</span>
                          <span className="font-semibold text-slate-900">{entry?.attendanceState || 'Present'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Hours</span>
                          <span className="font-semibold text-slate-900">
                            {entry?.isSpecialDay
                              ? entry?.attendanceState || 'Off'
                              : `${entry?.actualHours?.toFixed?.(2) ?? entry?.hours?.toFixed?.(2) ?? '0.00'}h`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Login time</span>
                          <span className="font-semibold text-slate-900">{entry?.loginTime || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>{entry?.statusLabel || 'Logout time'}</span>
                          <span className="font-semibold text-slate-900">{entry?.logoutTime || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
                contentStyle={{
                  borderRadius: '14px',
                  border: 'none',
                  boxShadow: '0 20px 40px rgba(15,23,42,0.15)',
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="hours"
                radius={[8, 8, 0, 0]}
                barSize={32}
                minPointSize={8}
                isAnimationActive={false}
              >
                <LabelList dataKey="barLabel" content={renderVerticalBarLabel} position="center" />
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default AttendancePresenceChart;

