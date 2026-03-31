import React from 'react';
import { Activity, Clock, History } from 'lucide-react';
import { AttendanceSummaryResponse, Range, formatMinutes } from './attendanceUtils';
import { Skeleton, SkeletonBlock } from '../ui/Skeleton';

interface Props {
  summary: AttendanceSummaryResponse | null;
  range: Range;
  todayMinutes: number;
  todayColor: string;
  leaveDaysInRange: number;
  loading?: boolean;
}

const AttendanceSummaryCards: React.FC<Props> = ({
  summary,
  range,
  todayMinutes,
  todayColor,
  leaveDaysInRange,
  loading = false,
}) => {
  const totalHours = summary ? parseFloat((summary.totalMinutes / 60).toFixed(2)) : 0;
  const totalDays = summary?.days.length ?? 0;
  const workingDays = Math.max(0, totalDays - leaveDaysInRange);

  if (loading) {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`attendance-card-${index}`} className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm animate-pulse">
              <SkeletonBlock className={`w-11 h-11 rounded-2xl ${index === 0 ? 'bg-brand-red/10' : index === 1 ? 'bg-emerald-50' : 'bg-slate-100'}`} />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 animate-pulse">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-brand-red/10 flex items-center justify-center">
            <Activity className="text-brand-red" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Total hours ({range})</p>
            <p className="text-2xl font-semibold text-slate-900">
              {totalHours.toFixed(2)}h
            </p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Clock className="text-emerald-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Today status</p>
            <p className="text-sm font-semibold" style={{ color: todayColor || '#64748b' }}>
              {formatMinutes(todayMinutes)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center">
            <History className="text-white" size={20} />
          </div>
          <div className="flex-1 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500 mb-1">Attendance history</p>
              <p className="text-sm font-semibold text-slate-900">
                {(summary?.days.length || 0).toString().padStart(2, '0')} days
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
        <span className="font-semibold">
          This {range === 'day' ? 'day' : range} overview:
        </span>
        <span>Working days: <span className="font-semibold text-slate-800">{workingDays}</span></span>
        <span>Leave days: <span className="font-semibold text-slate-800">{leaveDaysInRange}</span></span>
        <span>Total tracked days: <span className="font-semibold text-slate-800">{totalDays}</span></span>
      </div>
    </>
  );
};

export default AttendanceSummaryCards;

