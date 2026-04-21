import React from 'react';
import { ChevronDown } from 'lucide-react';
import AttendanceSummaryCards from './AttendanceSummaryCards';
import AttendancePresenceChart from './AttendancePresenceChart';
import { AttendanceSummaryResponse } from './attendanceUtils';
import { AttendanceEmployeeOption } from './attendanceViewUtils';

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
  selectedEmployeeTodayInfo,
  selectedEmployeeMonthlyAttendance,
  setSelectedEmployeeEmpId,
  setSelectedEmployeeMonth,
}) => {
  if (!canReviewTeamAttendance) return null;

  return (
    <section className="space-y-6">
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
