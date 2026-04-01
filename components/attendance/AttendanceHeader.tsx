import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Clock, BarChart3, ChevronLeft, ChevronRight, Check, Moon, Sparkles, SunMedium } from 'lucide-react';
import { Range } from './attendanceUtils';
import { PageHeaderSkeleton, SkeletonBlock } from '../ui/Skeleton';

interface Props {
  range: Range;
  onRangeChange: (range: Range) => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  subtitle: string;
  loading?: boolean;
}

const AttendanceHeader: React.FC<Props> = ({
  range,
  onRangeChange,
  selectedMonth,
  onSelectMonth,
  theme,
  onToggleTheme,
  subtitle,
  loading = false,
}) => {
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement | null>(null);
  const currentDate = useMemo(() => new Date(), []);
  const parsedSelectedDate = useMemo(() => {
    if (!selectedMonth) return null;
    const parsed = new Date(`${selectedMonth}-01T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [selectedMonth]);
  const initialVisibleYear = parsedSelectedDate?.getFullYear() ?? currentDate.getFullYear();
  const [visibleYear, setVisibleYear] = useState(initialVisibleYear);

  useEffect(() => {
    if (isMonthPickerOpen) {
      setVisibleYear(initialVisibleYear);
    }
  }, [initialVisibleYear, isMonthPickerOpen]);

  useEffect(() => {
    if (!isMonthPickerOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!monthPickerRef.current?.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMonthPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMonthPickerOpen]);

  const monthItems = useMemo(
    () => [
      { label: 'Jan', value: '01' },
      { label: 'Feb', value: '02' },
      { label: 'Mar', value: '03' },
      { label: 'Apr', value: '04' },
      { label: 'May', value: '05' },
      { label: 'Jun', value: '06' },
      { label: 'Jul', value: '07' },
      { label: 'Aug', value: '08' },
      { label: 'Sep', value: '09' },
      { label: 'Oct', value: '10' },
      { label: 'Nov', value: '11' },
      { label: 'Dec', value: '12' },
    ],
    [],
  );

  const selectedMonthLabel = parsedSelectedDate
    ? parsedSelectedDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Select Month';

  const handleMonthSelect = (monthValue: string) => {
    onSelectMonth(`${visibleYear}-${monthValue}`);
    setIsMonthPickerOpen(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <PageHeaderSkeleton />
        <div className="flex flex-col items-end gap-3 animate-pulse">
          <SkeletonBlock className="h-12 w-[280px] rounded-2xl bg-white border border-slate-200 shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1.5 w-8 bg-brand-red rounded-full" />
          <span className="text-[15px] text-slate-500">{subtitle}</span>
        </div>
        <h2 className="text-3xl md:text-4xl text-slate-900 leading-none">
          Manage Attendance
        </h2>
        <p className="text-slate-500 text-[15px] md:text-lg mt-3">
          Login & logout, track hours, and review attendance + leave history in one premium view.
        </p>
      </div>
      <div className="flex flex-col items-end gap-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onRangeChange('day')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm ${
                range === 'day' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Clock size={14} /> Today
            </button>
            <button
              type="button"
              onClick={() => onRangeChange('week')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm ${
                range === 'week' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Calendar size={14} /> Week
            </button>
            <button
              type="button"
              onClick={() => onRangeChange('month')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm ${
                range === 'month' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <BarChart3 size={14} /> Month
            </button>
          </div>
          <div className="relative" ref={monthPickerRef}>
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen((prev) => !prev)}
              aria-expanded={isMonthPickerOpen}
              aria-haspopup="dialog"
              className={`group flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-xs md:text-sm shadow-sm transition-all ${
                isMonthPickerOpen || selectedMonth
                  ? 'border-brand-red/20 bg-gradient-to-br from-white via-rose-50 to-slate-50 text-slate-900 shadow-[0_16px_40px_rgba(230,28,33,0.12)]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                isMonthPickerOpen || selectedMonth
                  ? 'bg-brand-red text-white shadow-md shadow-brand-red/25'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
              }`}>
                <Calendar size={14} />
              </span>
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Timeline
                </span>
                <span className="font-semibold text-slate-800">{selectedMonthLabel}</span>
              </span>
            </button>

            {isMonthPickerOpen && (
              <div
                role="dialog"
                aria-label="Select attendance month"
                className="absolute right-0 top-[calc(100%+12px)] z-30 w-[320px] overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.2)] ring-1 ring-slate-200/70 backdrop-blur-xl"
              >
                <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy px-5 py-4 text-white">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-red/30 blur-2xl" />
                  <div className="absolute -left-6 bottom-0 h-16 w-16 rounded-full bg-white/10 blur-xl" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      {/* <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
                        <Sparkles size={12} />
                        Attendance Window
                      </div> */}
                      <h3 className="text-lg font-semibold">{visibleYear}</h3>
                      <p className="text-xs text-white/70">
                        Pick a month to review attendance insights.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibleYear((year) => year - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/90 transition hover:bg-white/15"
                        aria-label="Previous year"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleYear((year) => year + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/90 transition hover:bg-white/15"
                        aria-label="Next year"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[radial-gradient(circle_at_top_right,_rgba(230,28,33,0.08),_transparent_40%)] px-4 py-4">
                  <div className="grid grid-cols-4 gap-2">
                    {monthItems.map((month) => {
                      const monthKey = `${visibleYear}-${month.value}`;
                      const isSelected = selectedMonth === monthKey;
                      const isCurrentMonth =
                        currentDate.getFullYear() === visibleYear &&
                        currentDate.getMonth() + 1 === Number(month.value);

                      return (
                        <button
                          key={month.value}
                          type="button"
                          onClick={() => handleMonthSelect(month.value)}
                          className={`relative overflow-hidden rounded-2xl border px-3 py-2 text-center transition-all ${
                            isSelected
                              ? 'border-brand-red bg-gradient-to-br from-brand-red to-red-500 text-white shadow-[0_14px_34px_rgba(230,28,33,0.28)]'
                              : isCurrentMonth
                                ? 'border-brand-red/25 bg-rose-50 text-slate-900 shadow-sm hover:border-brand-red/35 hover:bg-rose-100'
                                : 'border-slate-200 bg-white/90 text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block text-sm font-semibold">{month.label}</span>
                          <span className={`mt-1 block text-[10px] ${
                            isSelected ? 'text-white/75' : 'text-slate-400'
                          }`}>
                            {isCurrentMonth ? '' : ''}
                          </span>
                          {isSelected && (
                            // <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-end rounded-full bg-white/18">
                            //   <Check size={12} />
                            // </span>
                            <></>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectMonth('');
                        setIsMonthPickerOpen(false);
                      }}
                      className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const thisMonth = `${currentDate.getFullYear()}-${String(
                          currentDate.getMonth() + 1,
                        ).padStart(2, '0')}`;
                        onSelectMonth(thisMonth);
                        setIsMonthPickerOpen(false);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Calendar size={14} />
                      This month
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {theme === 'light' ? <Moon size={14} /> : <SunMedium size={14} />}
          {theme === 'light' ? 'Night mode' : 'Day mode'}
        </button> */}
      </div>
    </div>
  );
};

export default AttendanceHeader;

