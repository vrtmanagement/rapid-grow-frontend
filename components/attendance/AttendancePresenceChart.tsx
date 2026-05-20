import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { AttendanceSummaryResponse, getHoursColor } from './attendanceUtils';
import { Skeleton, SkeletonBlock } from '../ui/Skeleton';

interface Props {
  summary: AttendanceSummaryResponse | null;
  loading: boolean;
  selectedMonth?: string;
}

const AttendancePresenceChart: React.FC<Props> = ({ summary, loading, selectedMonth }) => {
  const getMonthWorkingDates = () => {
    const monthSource = selectedMonth || summary?.start?.slice(0, 7);
    if (!monthSource) return [];

    const [yearText, monthText] = monthSource.split('-');
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0) return [];

    const now = new Date();
    const isCurrentMonth =
      now.getFullYear() === year && now.getMonth() === monthIndex;
    const lastDay = isCurrentMonth ? now.getDate() : new Date(year, monthIndex + 1, 0).getDate();
    const dates: string[] = [];

    for (let day = 1; day <= lastDay; day += 1) {
      const current = new Date(year, monthIndex, day);
      if (current.getDay() !== 0) {
        dates.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
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
      timeZone: 'Asia/Kolkata',
    });
  };

  const formatFullDate = (isoDate: string) => {
    const parsed = new Date(`${isoDate}T00:00:00`);
    return parsed.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  };
  const getShownMonthLabel = () => {
    if (selectedMonth) {
      const selectedDate = new Date(`${selectedMonth}-01T00:00:00`);
      return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    }
    if (summary?.start) {
      const startDate = new Date(summary.start);
      return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    }
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  };

  const recordedDays = new Map(
    (summary?.days ?? []).map((day) => [day.date, day]),
  );

  const workingDates = getMonthWorkingDates();
  const datesToShow = workingDates.length > 0 ? workingDates : (summary?.days ?? []).map((day) => day.date);

  const chartData =
    datesToShow.map((dateKey) => {
      const d = recordedDays.get(dateKey);
      if (!d) {
        return {
          date: formatFullDate(dateKey),
          hours: 9,
          color: '#cbd5e1',
          loginTime: 'Absent',
          logoutTime: 'Absent',
          statusLabel: 'Attendance',
          attendanceState: 'Absent',
        };
      }

      const hours = d.minutes / 60;
      const sortedSessions = [...(d.sessions || [])].sort((a, b) => (
        new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime()
      ));
      const firstSession = sortedSessions[0];
      const lastSession = sortedSessions[sortedSessions.length - 1];
      const isOpenSession = !!lastSession && !lastSession.logoutTime;
      return {
        date: formatFullDate(d.date),
        hours: parseFloat(hours.toFixed(2)),
        color: getHoursColor(hours),
        loginTime: formatTime(firstSession?.loginTime),
        logoutTime: isOpenSession
          ? 'Active now'
          : formatTime(lastSession?.effectiveLogoutTime || lastSession?.logoutTime),
        statusLabel: isOpenSession ? 'Status' : 'Logout time',
        attendanceState: 'Present',
      };
    }) ?? [];

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-7 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Presence graph</h3>
          <p className="text-xs text-slate-500 mt-1">
            Daily logged-in hours with smart color coding.
          </p>
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
                      <p className="text-sm font-semibold text-slate-900">{label}</p>
                      <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center justify-between gap-4">
                          <span>Attendance</span>
                          <span className="font-semibold text-slate-900">{entry?.attendanceState || 'Present'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Hours</span>
                          <span className="font-semibold text-slate-900">{entry?.hours?.toFixed?.(2) ?? '0.00'}h</span>
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
              <Bar dataKey="hours" radius={[8, 8, 0, 0]} barSize={32} minPointSize={8}>
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

