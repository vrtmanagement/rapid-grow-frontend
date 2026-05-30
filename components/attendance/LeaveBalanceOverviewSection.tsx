import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Info, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { LeaveBalanceOverviewResponse } from './attendanceUtils';
import { AttendanceEmployeeOption } from './attendanceViewUtils';
import { Skeleton, SkeletonBlock } from '../ui/Skeleton';
import FilterDropdown from './FilterDropdown';

interface Props {
  overview: LeaveBalanceOverviewResponse | null;
  loading: boolean;
  viewerRole: 'employee' | 'team_lead' | 'admin';
  employeeOptions: AttendanceEmployeeOption[];
  selectedEmployeeEmpId: string;
  selectedPeriod: 'month' | 'year';
  selectedMonth: string;
  selectedYear: number;
  exportLoading?: boolean;
  onEmployeeChange: (value: string) => void;
  onPeriodChange: (value: 'month' | 'year') => void;
  onMonthChange: (value: string) => void;
  onYearChange: (value: number) => void;
  onExport: () => void;
  onRefresh: () => void;
}

const monthOptions = Array.from({ length: 12 }).map((_, index) => {
  const date = new Date(2026, index, 1);
  return {
    value: String(index + 1).padStart(2, '0'),
    label: date.toLocaleDateString('en-US', { month: 'long' }),
  };
});

const yearOptions = Array.from({ length: 5 }).map((_, index) => new Date().getFullYear() - 2 + index);

const statCardMeta = [
  { key: 'totalLeaves', label: 'Total period leaves', tone: 'text-slate-950', bg: 'bg-white' },
  { key: 'usedLeaves', label: 'Used leaves', tone: 'text-rose-600', bg: 'bg-rose-50/70' },
  { key: 'remainingLeaves', label: 'Remaining leaves', tone: 'text-emerald-700', bg: 'bg-emerald-50/80' },
  { key: 'paidLeaves', label: 'Paid leaves used', tone: 'text-sky-700', bg: 'bg-sky-50/75' },
  { key: 'lopDays', label: 'Unpaid / LOP', tone: 'text-amber-700', bg: 'bg-amber-50/80' },
  { key: 'pendingLeaveRequests', label: 'Pending requests', tone: 'text-violet-700', bg: 'bg-violet-50/75' },
  { key: 'approvedLeaveRequests', label: 'Approved requests', tone: 'text-emerald-700', bg: 'bg-emerald-50/65' },
] as const;

function formatDayValue(value: number) {
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return value.toFixed(1);
}

function formatDayLabel(value: number) {
  const formattedValue = formatDayValue(value);
  return `${formattedValue} ${Math.abs(value) === 1 ? 'day' : 'days'}`;
}

const LeaveBalanceOverviewSection: React.FC<Props> = ({
  overview,
  loading,
  viewerRole,
  employeeOptions,
  selectedEmployeeEmpId,
  selectedPeriod,
  selectedMonth,
  selectedYear,
  exportLoading = false,
  onEmployeeChange,
  onPeriodChange,
  onMonthChange,
  onYearChange,
  onExport,
  onRefresh,
}) => {
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [policyHelpOpen, setPolicyHelpOpen] = useState(false);
  const employeePickerRef = useRef<HTMLDivElement | null>(null);
  const monthPickerRef = useRef<HTMLDivElement | null>(null);
  const yearPickerRef = useRef<HTMLDivElement | null>(null);
  const showEmployeeFilter = viewerRole !== 'employee';
  const selectedEmployee = employeeOptions.find((employee) => employee.empId === selectedEmployeeEmpId);
  const displayEmployeeName =
    (showEmployeeFilter && selectedEmployee?.empName) || overview?.employee?.empName || 'Leave insights';
  const displayEmployeeDesignation =
    (showEmployeeFilter && selectedEmployee?.designation) || overview?.employee?.designation || '';
  const policyNotesText = overview?.policy?.notes?.trim() || 'No custom policy notes were added for this leave policy.';
  const employeeDropdownOptions = useMemo(
    () =>
      employeeOptions.map((employee) => ({
        value: employee.empId,
        label: `${employee.empName} (${employee.empId})`,
      })),
    [employeeOptions],
  );
  const selectedEmployeeLabel =
    employeeDropdownOptions.find((option) => option.value === selectedEmployeeEmpId)?.label
    || (overview?.employee?.empId ? `${overview.employee.empName} (${overview.employee.empId})` : 'Select employee');
  const selectedMonthLabel =
    monthOptions.find((option) => option.value === selectedMonth)?.label || 'Select month';
  const yearDropdownOptions = useMemo(
    () =>
      yearOptions.map((option) => ({
        value: String(option),
        label: String(option),
      })),
    [],
  );

  useEffect(() => {
    if (!employeePickerOpen && !monthPickerOpen && !yearPickerOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (employeePickerRef.current && !employeePickerRef.current.contains(target)) {
        setEmployeePickerOpen(false);
      }
      if (monthPickerRef.current && !monthPickerRef.current.contains(target)) {
        setMonthPickerOpen(false);
      }
      if (yearPickerRef.current && !yearPickerRef.current.contains(target)) {
        setYearPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEmployeePickerOpen(false);
        setMonthPickerOpen(false);
        setYearPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [employeePickerOpen, monthPickerOpen, yearPickerOpen]);

  if (loading && !overview) {
    return (
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/8 px-3 py-1">
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-[28rem] max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={`leave-overview-filter-${index}`} className="h-12 w-full rounded-[20px]" />
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={`leave-stat-${index}`} className="flex min-h-[102px] flex-col rounded-[18px] border border-slate-200 bg-white px-3.5 py-3.5">
              <div className="flex h-[34px] items-start">
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex flex-1 items-center justify-center">
                <Skeleton className="h-7 w-12" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SkeletonBlock className="h-[320px] rounded-[28px]" />
          <SkeletonBlock className="h-[320px] rounded-[28px]" />
        </div>
      </section>
    );
  }

  const summary = overview?.summary;
  const badges = overview?.badges || [];
  const showDataSkeleton = loading;
  const policyLeaveTypes = overview?.policy?.leaveTypes || [];
  const policyAllocationRows = (overview?.byType || []).map((entry) => {
    const policyType = policyLeaveTypes.find((policyEntry) => policyEntry.type === entry.type);
    return {
      type: entry.label,
      monthlyAllocation: policyType?.monthlyAllocation ?? 0,
      yearlyAllocation: policyType?.yearlyAllocation ?? 0,
      allocated: entry.allocated ?? 0,
      used: entry.used ?? 0,
      remaining: entry.remaining ?? 0,
    };
  });

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red whitespace-nowrap">
              <ShieldCheck size={14} />
              Leave Balance Overview
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h3 className="text-[1.55rem] font-semibold tracking-[-0.03em] text-slate-950">
                {displayEmployeeName}
              </h3>
              {displayEmployeeDesignation ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {displayEmployeeDesignation}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                onClick={onRefresh}
                whileTap={{ scale: 0.97 }}
                className={`inline-flex h-[50px] items-center justify-center gap-2 rounded-[20px] border px-4 text-sm font-semibold transition ${
                  loading
                    ? 'border-brand-red/20 bg-brand-red/5 text-brand-red ring-4 ring-brand-red/10'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950'
                }`}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </motion.button>
              <button
                type="button"
                onClick={onExport}
                disabled={exportLoading}
                className={`inline-flex h-[50px] items-center justify-center gap-2 rounded-[20px] px-4 text-sm font-semibold text-white transition ${
                  exportLoading ? 'cursor-not-allowed bg-slate-300' : 'bg-brand-red hover:bg-red-600'
                }`}
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {showEmployeeFilter ? (
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Employee</span>
              <FilterDropdown
                value={selectedEmployeeEmpId}
                selectedLabel={selectedEmployeeLabel}
                options={employeeDropdownOptions}
                open={employeePickerOpen}
                onToggle={() => {
                  setEmployeePickerOpen((prev) => !prev);
                  setMonthPickerOpen(false);
                  setYearPickerOpen(false);
                }}
                onSelect={(value) => {
                  onEmployeeChange(value);
                  setEmployeePickerOpen(false);
                }}
                containerRef={employeePickerRef}
                maxHeightClass="max-h-60"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">View</span>
            <div className="grid grid-cols-2 rounded-[20px] border border-slate-200 bg-slate-50 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              {(['month', 'year'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onPeriodChange(option)}
                  className={`rounded-[16px] px-4 py-2.5 text-sm font-semibold capitalize transition ${
                    selectedPeriod === option
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </label>

          {selectedPeriod === 'month' ? (
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Month</span>
              <FilterDropdown
                value={selectedMonth}
                selectedLabel={selectedMonthLabel}
                options={monthOptions}
                open={monthPickerOpen}
                onToggle={() => {
                  setMonthPickerOpen((prev) => !prev);
                  setEmployeePickerOpen(false);
                  setYearPickerOpen(false);
                }}
                onSelect={(value) => {
                  onMonthChange(value);
                  setMonthPickerOpen(false);
                }}
                containerRef={monthPickerRef}
                maxHeightClass="max-h-60"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Year</span>
            <FilterDropdown
              value={String(selectedYear)}
              selectedLabel={String(selectedYear)}
              options={yearDropdownOptions}
              open={yearPickerOpen}
              onToggle={() => {
                setYearPickerOpen((prev) => !prev);
                setEmployeePickerOpen(false);
                setMonthPickerOpen(false);
              }}
              onSelect={(value) => {
                onYearChange(Number(value));
                setYearPickerOpen(false);
              }}
              containerRef={yearPickerRef}
              maxHeightClass="max-h-56"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {badges.length ? (
          badges.map((badge) => (
            <span
              key={badge}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                badge === 'LOP Applied'
                  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                  : badge === 'No Paid Leaves Left'
                    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                    : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
              }`}
            >
              <TriangleAlert size={13} />
              {badge}
            </span>
          ))
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <ShieldCheck size={13} />
            Leave balance healthy
          </span>
        )}

        <button
          type="button"
          onClick={() => setPolicyHelpOpen((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            policyHelpOpen
              ? 'bg-slate-200 text-slate-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Info size={13} />
          {policyHelpOpen ? 'Hide policy help' : 'Policy help'}
        </button>
      </div>

      {policyHelpOpen && overview ? (
        <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50/40">
          <div className="border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Policy document</p>
              <h3 className="mt-2 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-950">
                {overview.policy.name}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {displayEmployeeName} • {selectedPeriod === 'year' ? String(selectedYear) : selectedMonthLabel}
              </p>
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Monthly paid</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{formatDayLabel(overview.policy.monthlyPaidLeaves)}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Carry forward max</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{formatDayLabel(overview.policy.maxCarryForward)}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Expiry month</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{overview.policy.carryForwardExpiryMonth}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Half-day deduction</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{formatDayLabel(overview.policy.halfDayDeduction)}</p>
            </div>
          </div>

          <div className="mx-5 rounded-[24px] border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Employee allocation</p>
              <h4 className="mt-1 text-lg font-semibold text-slate-950">Allocated leave details</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Leave type</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Monthly</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Yearly</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Allocated</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Used</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {policyAllocationRows.map((row) => (
                    <tr key={row.type} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">{row.type}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{formatDayLabel(row.monthlyAllocation)}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{formatDayLabel(row.yearlyAllocation)}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{formatDayLabel(row.allocated)}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{formatDayLabel(row.used)}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">{formatDayLabel(row.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-5 py-5">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/60 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Policy notes</p>
              <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                {policyNotesText}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showDataSkeleton ? (
        <div className="mt-4">
          <SkeletonBlock className="h-[72px] w-full rounded-[24px]" />
        </div>
      ) : overview?.warningState === 'critical' ? (
        <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm text-rose-700">
          Paid leave balance is exhausted for the current cycle. New approvals can automatically move into LOP based on policy rules.
        </div>
      ) : overview?.warningState === 'warning' ? (
        <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-amber-700">
          Leave balance is running low. Plan upcoming requests carefully to avoid unplanned unpaid leave deductions.
        </div>
      ) : null}

      {showDataSkeleton ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={`leave-overview-skeleton-stat-${index}`} className="flex min-h-[102px] flex-col rounded-[18px] border border-slate-200 bg-white px-3.5 py-3.5">
                <div className="flex h-[34px] items-start">
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <Skeleton className="h-7 w-12" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <SkeletonBlock className="h-[720px] rounded-[28px]" />
            <SkeletonBlock className="h-[720px] rounded-[28px]" />
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {statCardMeta.map((card, index) => {
              const value = summary?.[card.key] ?? 0;
              const showLopDeductionNote =
                card.key === 'usedLeaves' &&
                (summary?.calendarLeaveDays ?? 0) > 0 &&
                (summary?.balanceDeductedDays ?? value) > (summary?.calendarLeaveDays ?? 0);
              return (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  className={`flex min-h-[102px] flex-col rounded-[18px] border border-slate-200 px-3.5 py-3.5 shadow-[0_10px_22px_rgba(15,23,42,0.05)] ${card.bg}`}
                >
                  <div className="flex h-[34px] items-start">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {card.label}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center gap-1">
                    <p className={`text-center text-[1.35rem] font-semibold leading-none tracking-[-0.04em] ${card.tone}`}>
                      {formatDayValue(value)}
                    </p>
                    {showLopDeductionNote ? (
                      <p className="text-center text-[10px] font-medium leading-snug text-rose-700/90">
                        {formatDayValue(summary?.calendarLeaveDays ?? 0)} leave ·{' '}
                        {formatDayValue(summary?.balanceDeductedDays ?? value)} deducted
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold text-slate-950">Leave type allocation</h4>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Progress</p>
              <p className="mt-0.5 text-base font-semibold text-slate-950">{overview?.progressPercent || 0}%</p>
            </div>
          </div>

          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.byType || []} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={56} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(241,245,249,0.8)' }}
                  contentStyle={{
                    borderRadius: 18,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 18px 45px rgba(15,23,42,0.12)',
                  }}
                />
                <Bar dataKey="allocated" radius={[10, 10, 0, 0]} fill="#cbd5e1" name="Allocated" />
                <Bar dataKey="used" radius={[10, 10, 0, 0]} fill="#ef4444" name="Used" />
                <Bar dataKey="remaining" radius={[10, 10, 0, 0]} fill="#22c55e" name="Remaining" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(overview?.byType || []).map((entry) => {
              const allocation = entry.allocated || 0;
              const usedPercent = allocation > 0 ? Math.min(100, Math.round((entry.used / allocation) * 100)) : 0;

              return (
                <div key={entry.type} className="rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
                      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {entry.paid ? 'Paid' : 'LOP'}
                      </span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {formatDayValue(entry.remaining)} left
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${usedPercent}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: entry.color || '#ef4444' }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>{formatDayValue(entry.used)} used</span>
                    <span>{formatDayValue(entry.allocated)} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold text-slate-950">Monthly leave trend</h4>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Carry forward</p>
              <p className="mt-0.5 text-base font-semibold text-slate-950">{formatDayLabel(summary?.carryForward || 0)}</p>
            </div>
          </div>

          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.trend || []} margin={{ top: 10, right: 12, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="leaveTrendUsed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="leaveTrendPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 18,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 18px 45px rgba(15,23,42,0.12)',
                  }}
                />
                <Area type="monotone" dataKey="used" stroke="#ef4444" strokeWidth={2.5} fill="url(#leaveTrendUsed)" />
                <Area type="monotone" dataKey="pending" stroke="#a855f7" strokeWidth={2} fill="url(#leaveTrendPending)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/75 px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Yearly allocation</p>
              <p className="mt-2.5 text-2xl font-semibold text-slate-950">{formatDayLabel(summary?.yearlyAllocated || 0)}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/75 px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Yearly remaining</p>
              <p className="mt-2.5 text-2xl font-semibold text-emerald-700">{formatDayLabel(summary?.yearlyRemaining || 0)}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/75 px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Bonus leaves</p>
              <p className="mt-2.5 text-2xl font-semibold text-sky-700">{formatDayLabel(summary?.bonusLeaves || 0)}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/75 px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Expired carry forward</p>
              <p className="mt-2.5 text-2xl font-semibold text-amber-700">{formatDayLabel(summary?.expiredCarryForward || 0)}</p>
            </div>
          </div>
        </div>
          </div>
        </>
      )}

    </section>
  );
};

export default LeaveBalanceOverviewSection;
