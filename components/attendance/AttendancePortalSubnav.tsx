import React from 'react';
import { BarChart3, Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import PageSectionSubnav from '../layout/PageSectionSubnav';
import type { LeaveSection } from '../../hooks/attendance/attendanceViewTypes';
import type { Range } from './attendanceUtils';

interface AttendancePortalSubnavProps {
  isEmployeePortal: boolean;
  isHistoryRoute: boolean;
  activeView: 'attendance' | 'leave' | 'late' | 'reports';
  hasExpenseView: boolean;
  showAttendanceSubnavControls: boolean;
  showLeaveSubnavControls: boolean;
  range: Range;
  setRange: (value: Range) => void;
  headerMonthPickerRef: React.RefObject<HTMLDivElement | null>;
  headerMonthPickerOpen: boolean;
  setHeaderMonthPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMonth: string;
  headerSelectedMonthLabel: string;
  headerVisibleYear: number;
  setHeaderVisibleYear: React.Dispatch<React.SetStateAction<number>>;
  headerMonthItems: Array<{ label: string; value: string }>;
  headerCurrentDate: Date;
  handleHeaderMonthSelect: (monthValue: string) => void;
  setSelectedMonth: (value: string) => void;
  availableLeaveSections: Array<{ id: LeaveSection; label: string }>;
  effectiveLeaveSection: LeaveSection;
  handleActiveViewChange: (view: 'attendance' | 'leave' | 'late' | 'reports') => void;
  handleLeaveSectionChange: (section: LeaveSection) => void;
  onNavigateExpense: () => void;
}

const AttendancePortalSubnav: React.FC<AttendancePortalSubnavProps> = ({
  isEmployeePortal,
  isHistoryRoute,
  activeView,
  hasExpenseView,
  showAttendanceSubnavControls,
  showLeaveSubnavControls,
  range,
  setRange,
  headerMonthPickerRef,
  headerMonthPickerOpen,
  setHeaderMonthPickerOpen,
  selectedMonth,
  headerSelectedMonthLabel,
  headerVisibleYear,
  setHeaderVisibleYear,
  headerMonthItems,
  headerCurrentDate,
  handleHeaderMonthSelect,
  setSelectedMonth,
  availableLeaveSections,
  effectiveLeaveSection,
  handleActiveViewChange,
  handleLeaveSectionChange,
  onNavigateExpense,
}) => {
  const tabClass = (isActive: boolean) =>
    `border-b-2 px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors sm:text-[12px] ${
      isActive
        ? 'border-brand-red text-slate-900'
        : 'border-transparent text-slate-500 hover:text-slate-900'
    }`;

  return (
    <PageSectionSubnav
      leading={
        <>
          <span className="h-1.5 w-8 rounded-full bg-brand-red" />
          <span className="truncate text-sm font-medium text-slate-600 sm:text-[15px]">
            {isEmployeePortal ? 'Your Presence Radar' : 'Team Attendance Console'}
          </span>
        </>
      }
      center={
        <>
          <button
            type="button"
            onClick={() => handleActiveViewChange('attendance')}
            className={tabClass((isHistoryRoute ? 'attendance' : activeView) === 'attendance')}
          >
            Attendance
          </button>
          <button
            type="button"
            onClick={() => handleActiveViewChange('late')}
            className={tabClass(activeView === 'late')}
          >
            Late / Requests
          </button>
          <button
            type="button"
            onClick={() => handleActiveViewChange('leave')}
            className={tabClass((isHistoryRoute ? 'attendance' : activeView) === 'leave')}
          >
            Leave
          </button>
          <button
            type="button"
            onClick={() => handleActiveViewChange('reports')}
            className={tabClass(activeView === 'reports')}
          >
            Reports
          </button>
          {hasExpenseView && (
            <button
              type="button"
              onClick={onNavigateExpense}
              className="border-b-2 border-transparent px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 transition-colors hover:text-slate-900 sm:text-[12px]"
            >
              Expense & Travel
            </button>
          )}
        </>
      }
      trailing={
        <div className="flex flex-wrap items-center gap-2">
          <div
            aria-hidden={!showAttendanceSubnavControls}
            className={`flex flex-wrap items-center gap-2 ${
              showAttendanceSubnavControls ? '' : 'invisible pointer-events-none hidden'
            }`}
          >
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setRange('day')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] md:text-[13px] ${
                  range === 'day' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Clock size={13} /> Today
              </button>
              <button
                type="button"
                onClick={() => setRange('week')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] md:text-[13px] ${
                  range === 'week' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Calendar size={13} /> Week
              </button>
              <button
                type="button"
                onClick={() => setRange('month')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] md:text-[13px] ${
                  range === 'month' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <BarChart3 size={13} /> Month
              </button>
            </div>

            <div className="relative" ref={headerMonthPickerRef}>
              <button
                type="button"
                onClick={() => setHeaderMonthPickerOpen((prev) => !prev)}
                aria-expanded={headerMonthPickerOpen}
                aria-haspopup="dialog"
                className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] md:text-[13px] shadow-sm transition-all ${
                  headerMonthPickerOpen || selectedMonth
                    ? 'border-brand-red/20 bg-gradient-to-br from-white via-rose-50 to-slate-50 text-slate-900 shadow-[0_16px_40px_rgba(230,28,33,0.12)]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  headerMonthPickerOpen || selectedMonth
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/25'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                }`}>
                  <Calendar size={13} />
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Timeline
                  </span>
                  <span className="font-semibold text-slate-800">{headerSelectedMonthLabel}</span>
                </span>
              </button>

              {headerMonthPickerOpen && (
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
                        <h3 className="text-lg font-semibold">{headerVisibleYear}</h3>
                        <p className="text-xs text-white/70">
                          Pick a month to review attendance insights.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setHeaderVisibleYear((year) => year - 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/90 transition hover:bg-white/15"
                          aria-label="Previous year"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeaderVisibleYear((year) => year + 1)}
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
                      {headerMonthItems.map((month) => {
                        const monthKey = `${headerVisibleYear}-${month.value}`;
                        const isSelected = selectedMonth === monthKey;
                        const isCurrentMonth =
                          headerCurrentDate.getFullYear() === headerVisibleYear &&
                          headerCurrentDate.getMonth() + 1 === Number(month.value);

                        return (
                          <button
                            key={month.value}
                            type="button"
                            onClick={() => handleHeaderMonthSelect(month.value)}
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
                            }`}
                            >
                              {isCurrentMonth ? '' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMonth('');
                          setHeaderMonthPickerOpen(false);
                        }}
                        className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const thisMonth = `${headerCurrentDate.getFullYear()}-${String(
                            headerCurrentDate.getMonth() + 1,
                          ).padStart(2, '0')}`;
                          setSelectedMonth(thisMonth);
                          setRange('month');
                          setHeaderMonthPickerOpen(false);
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

          <div
            aria-hidden={!showLeaveSubnavControls}
            className={`flex flex-wrap items-center gap-2 ${
              showLeaveSubnavControls ? '' : 'invisible pointer-events-none hidden'
            }`}
          >
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
              {availableLeaveSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleLeaveSectionChange(section.id)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold md:px-4 md:text-[13px] ${
                    effectiveLeaveSection === section.id
                      ? 'bg-brand-red text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
};

export default AttendancePortalSubnav;
