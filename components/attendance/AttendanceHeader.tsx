import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Calendar, Clock, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { LeaveNotificationItem, Range } from './attendanceUtils';
import { PageHeaderSkeleton, SkeletonBlock } from '../ui/Skeleton';

interface Props {
  range: Range;
  onRangeChange: (range: Range) => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  activeView: 'attendance' | 'leave';
  onActiveViewChange: (view: 'attendance' | 'leave') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  subtitle: string;
  leaveNotifications?: LeaveNotificationItem[];
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  onNotificationClick?: (notificationId: string) => void;
  loading?: boolean;
}

const AttendanceHeader: React.FC<Props> = ({
  range,
  onRangeChange,
  selectedMonth,
  onSelectMonth,
  activeView,
  onActiveViewChange,
  theme,
  onToggleTheme,
  subtitle,
  leaveNotifications = [],
  unreadNotificationCount = 0,
  onOpenNotifications,
  onNotificationClick,
  loading = false,
}) => {
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);
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
    if (!isMonthPickerOpen && !isNotificationOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!monthPickerRef.current?.contains(target)) {
        setIsMonthPickerOpen(false);
      }
      if (!notificationRef.current?.contains(target)) {
        setIsNotificationOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMonthPickerOpen(false);
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);  
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMonthPickerOpen, isNotificationOpen]);

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

  const pageTitle = activeView === 'leave' ? 'Manage Leave' : 'Manage Attendance';
  const pageDescription =
    activeView === 'leave'
      ? 'Plan leave, track approvals, and manage your records in one premium workspace.'
      : 'Login & logout, track hours, and review attendance + leave history in one premium view.';
  const viewToggle = (
    <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onActiveViewChange('attendance')}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
          activeView === 'attendance'
            ? 'bg-brand-red text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        Attendance
      </button>
      <button
        type="button"
        onClick={() => onActiveViewChange('leave')}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
          activeView === 'leave'
            ? 'bg-brand-red text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        Leave
      </button>
    </div>
  );

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
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1.5 w-8 bg-brand-red rounded-full" />
          <span className="text-[15px] text-slate-500">{subtitle}</span>
        </div>
        <div className={`flex flex-col gap-4 ${activeView === 'attendance' ? 'md:flex-row md:items-start md:justify-between' : ''}`}>
          <div className="min-w-0">
            <h2 className="text-3xl md:text-4xl text-slate-900 leading-none">
              {pageTitle}
            </h2>
            <p className="text-slate-500 text-[15px] md:text-lg mt-3">
              {pageDescription}
            </p>
          </div>
          {activeView === 'attendance' ? (
            <div className="hidden md:flex flex-1 justify-center px-6">
              {viewToggle}
            </div>
          ) : null}
          {activeView === 'attendance' ? (
            <div className="md:hidden">
              {viewToggle}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-end gap-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {activeView === 'leave' ? (
            <>
              {viewToggle}
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => {
                    const nextOpen = !isNotificationOpen;
                    setIsNotificationOpen(nextOpen);
                    if (nextOpen) {
                      onOpenNotifications?.();
                    }
                  }}
                  className="group relative inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red transition group-hover:bg-brand-red group-hover:text-white">
                    <Bell size={16} />
                  </span>
                  Notifications
                  {unreadNotificationCount > 0 ? (
                    <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand-red px-1.5 text-[11px] font-semibold text-white">
                      {unreadNotificationCount}
                    </span>
                  ) : null}
                </button>

                {isNotificationOpen && (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-[340px] origin-top-right overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] animate-in fade-in zoom-in-95 duration-200">
                    <div className="border-b border-slate-100 px-5 py-4">
                      <h3 className="text-sm font-semibold text-slate-900">Leave notifications</h3>
                      <p className="mt-1 text-xs text-slate-500">Personalized updates based on the signed-in user.</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-3">
                      {leaveNotifications.length === 0 ? (
                        <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                          No notifications yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {leaveNotifications.map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() => onNotificationClick?.(notification.id)}
                              className={`rounded-2xl border px-4 py-3 ${
                                notification.read
                                  ? 'border-slate-200 bg-white'
                                  : 'border-brand-red/15 bg-brand-red/5'
                              } w-full text-left transition hover:border-slate-300 hover:shadow-sm`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                                  <p className="mt-1 text-xs leading-5 text-slate-500">{notification.description}</p>
                                </div>
                                {!notification.read ? (
                                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-red" />
                                ) : null}
                              </div>
                              <p className="mt-2 text-[11px] text-slate-400">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {activeView === 'attendance' ? (
        <div className="flex flex-col items-end gap-2">
          <div className="mt-4 inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
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
                          {isSelected && <></>}
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
        ) : null}
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

