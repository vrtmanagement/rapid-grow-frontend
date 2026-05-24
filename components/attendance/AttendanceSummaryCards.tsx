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
  selectedMonthLabel?: string;
  onOpenHistory?: () => void;
  variant?: 'employee' | 'manager';
  loading?: boolean;
}

const AttendanceSummaryCards: React.FC<Props> = ({
  summary,
  range,
  todayMinutes,
  todayColor,
  leaveDaysInRange,
  selectedMonthLabel = '',
  onOpenHistory,
  variant = 'manager',
  loading = false,
}) => {
  const totalHours = summary ? parseFloat((summary.totalMinutes / 60).toFixed(2)) : 0;
  const totalDays = summary?.days.length ?? 0;
  const workingDays = Math.max(0, totalDays - leaveDaysInRange);
  const isEmployeeVariant = variant === 'employee';
  const totalHoursLabel =
    range === 'month'
      ? `Total hours (${selectedMonthLabel ? selectedMonthLabel.split(' ')[0].toLowerCase() : 'month'})`
      : `Total hours (${range})`;

  if (loading) {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`attendance-card-${index}`}
              className={`flex items-center gap-4 border border-slate-200 bg-white p-5 animate-pulse ${
                isEmployeeVariant
                  ? 'rounded-[30px]'
                  : 'rounded-3xl'
              }`}
            >
              <SkeletonBlock className={`w-11 h-11 rounded-2xl ${index === 0 ? 'bg-brand-red/10' : index === 1 ? 'bg-emerald-50' : 'bg-slate-100'}`} />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>

        <div
          className={`flex flex-wrap items-center gap-3 text-[11px] text-slate-600 animate-pulse ${
            isEmployeeVariant
              ? 'rounded-[26px] border border-slate-200 bg-white/80 px-5 py-4'
              : ''
          }`}
        >
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </>
    );
  }

  if (isEmployeeVariant) {
    const cards = [
      {
        key: 'hours',
        icon: <Activity className="text-brand-red" size={20} />,
        iconClassName: 'bg-rose-50 text-brand-red',
        label: totalHoursLabel,
        value: `${totalHours.toFixed(2)}h`,
      },
      {
        key: 'today',
        icon: <Clock className="text-emerald-600" size={20} />,
        iconClassName: 'bg-emerald-50 text-emerald-600',
        label: 'Today status',
        value: formatMinutes(todayMinutes),
      },
      {
        key: 'history',
        icon: <History className="text-white" size={20} />,
        iconClassName: 'bg-slate-900 text-white',
        label: 'Attendance history',
        value: `${(summary?.days.length || 0).toString().padStart(2, '0')} days`,
      },
    ];

    return (
      <>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {cards.map((card) => {
            const content = (
              <>
                <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${card.iconClassName}`}>
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[0.95rem] text-slate-500">{card.label}</p>
                  <p
                    className={`font-semibold leading-none text-slate-950 ${
                      card.key === 'today' ? 'text-[1.35rem]' : 'text-[1.55rem]'
                    }`}
                    style={card.key === 'today' ? { color: todayColor || '#0f172a' } : undefined}
                  >
                    {card.value}
                  </p>
                </div>
              </>
            );

            if (card.key === 'history' && onOpenHistory) {
              return (
                <div
                  key={card.key}
                  role="button"
                  tabIndex={0}
                  onClick={onOpenHistory}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpenHistory();
                    }
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-[28px] border border-slate-200 bg-white px-5 py-4 focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                >
                  {content}
                </div>
              );
            }

            return (
              <div
                key={card.key}
                className="flex items-center gap-3 rounded-[28px] border border-slate-200 bg-white px-5 py-4"
              >
                {content}
              </div>
            );
          })}
        </div>

      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-brand-red/10 flex items-center justify-center">
            <Activity className="text-brand-red" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">{totalHoursLabel}</p>
            <p className="text-2xl font-semibold text-slate-900">
              {totalHours.toFixed(2)}h
            </p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center gap-4">
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
        <button
          type="button"
          onClick={onOpenHistory}
          className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center gap-4 text-left transition-colors hover:border-slate-300 disabled:hover:border-slate-200"
          disabled={!onOpenHistory}
        >
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
        </button>
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

