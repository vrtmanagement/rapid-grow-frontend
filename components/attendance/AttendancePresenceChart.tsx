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
  const formatFullDate = (isoDate: string) => {
    const parsed = new Date(`${isoDate}T00:00:00`);
    return parsed.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  const getShownMonthLabel = () => {
    if (selectedMonth) {
      const selectedDate = new Date(`${selectedMonth}-01T00:00:00`);
      return selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    if (summary?.start) {
      const startDate = new Date(summary.start);
      return startDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    const now = new Date();
    return now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  const chartData =
    summary?.days.map((d) => {
      const hours = d.minutes / 60;
      return {
        date: formatFullDate(d.date),
        hours: parseFloat(hours.toFixed(2)),
        color: getHoursColor(hours),
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
                contentStyle={{
                  borderRadius: '14px',
                  border: 'none',
                  boxShadow: '0 20px 40px rgba(15,23,42,0.15)',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="hours" radius={[8, 8, 0, 0]} barSize={32}>
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

