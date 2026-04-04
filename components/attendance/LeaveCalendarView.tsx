import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { LeaveRequest } from './attendanceUtils';

interface Props {
  leaves: LeaveRequest[];
  selectedStart?: string;
  selectedEnd?: string;
  showEmployeeDetails?: boolean;
  onVisibleMonthChange?: (monthValue: string) => void;
}

const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isWithinRange(dateKey: string, start?: string, end?: string) {
  if (!start || !end) return false;
  return dateKey >= start && dateKey <= end;
}

const LeaveCalendarView: React.FC<Props> = ({
  leaves,
  selectedStart,
  selectedEnd,
  showEmployeeDetails = false,
  onVisibleMonthChange,
}) => {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);

  useEffect(() => {
    onVisibleMonthChange?.(toMonthValue(visibleMonth));
  }, [onVisibleMonthChange, visibleMonth]);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();

    const items: Array<{ key: string; label: string; date: Date | null }> = [];

    for (let i = 0; i < leadingBlanks; i += 1) {
      items.push({ key: `blank-${i}`, label: '', date: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      items.push({ key: toDateKey(date), label: String(day), date });
    }

    return items;
  }, [visibleMonth]);

  const leaveMap = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();

    leaves.forEach((leave) => {
      const cursor = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      cursor.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      while (cursor <= end) {
        const key = toDateKey(cursor);
        const current = map.get(key) || [];
        current.push(leave);
        map.set(key, current);
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return map;
  }, [leaves]);

  const activeDateLeaves = activeDateKey ? leaveMap.get(activeDateKey) || [] : [];
  const monthLabel = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const getEmployeeLabel = (leave: LeaveRequest) => leave.empName?.trim() || leave.empId?.trim() || 'Employee';

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red">
            <CalendarDays size={14} />
            Calendar view
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">{monthLabel}</h3>
          <p className="mt-1 text-sm text-slate-500">Track selected dates, approved leaves, and pending requests in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2">
        {weekLabels.map((label) => (
          <div key={label} className="px-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </div>
        ))}

        {calendarDays.map((item) => {
          if (!item.date) {
            return <div key={item.key} className="h-12 rounded-2xl bg-transparent" />;
          }

          const dateKey = item.key;
          const dayLeaves = leaveMap.get(dateKey) || [];
          const isToday = dateKey === toDateKey(today);
          const isSelectedRange = isWithinRange(dateKey, selectedStart, selectedEnd);
          const hasApproved = dayLeaves.some((leave) => leave.status === 'APPROVED');
          const hasPending = dayLeaves.some((leave) => leave.status === 'PENDING');
          const hasRejected = dayLeaves.some((leave) => leave.status === 'REJECTED');

          const toneClass = isSelectedRange
            ? 'border-brand-red bg-brand-red/10 text-brand-red'
            : hasApproved
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : hasPending
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : hasRejected
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : isToday
                    ? 'border-slate-300 bg-slate-100 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50';

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setActiveDateKey(dateKey)}
              className={`relative h-12 rounded-2xl border text-sm font-semibold transition-all ${toneClass}`}
            >
              {item.label}
              {showEmployeeDetails && dayLeaves.length > 1 ? (
                <span className="absolute right-1.5 top-1.5 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-slate-900/80 px-1 text-[9px] font-semibold text-white">
                  {dayLeaves.length}
                </span>
              ) : null}
              {(hasApproved || hasPending || hasRejected || isSelectedRange) ? (
                <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-current opacity-80" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-brand-red/80" />Selected</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Approved</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Pending</span>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {activeDateKey ? activeDateKey : 'Date details'}
        </p>
        {activeDateLeaves.length > 0 ? (
          <div className="mt-3 space-y-3">
            {activeDateLeaves.map((leave) => (
              <div key={`${activeDateKey}-${leave._id}`} className="rounded-2xl border border-white bg-white px-3 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{leave.type}</p>
                    {showEmployeeDetails ? (
                      <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{getEmployeeLabel(leave)}</p>
                    ) : null}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    leave.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : leave.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}>
                    {leave.status.toLowerCase()}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{leave.reason || 'No reason added'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            {activeDateKey
              ? 'No leave record on this date.'
              : 'Click a date to review leave details.'}
          </p>
        )}
      </div>
    </section>
  );
};

export default LeaveCalendarView;
