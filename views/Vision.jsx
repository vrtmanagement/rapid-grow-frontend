import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckSquare,
  CheckCircle2,
  ChevronRight,
  Circle,
  Eye,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Target,
  Trash2,
} from 'lucide-react';
import { removeGoal, saveGoal } from '../services/goalApi';
import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../config/api';
import { PageHeaderSkeleton, Skeleton, SkeletonBlock } from '../components/ui/Skeleton';
import { monthSlotDisplayName, monthSlotSortKey } from '../planning/goalHierarchy';
import { CREATE_INPUT_CLASS, ThemedDatePicker, ThemedSelect } from '../components/spaces/SpacesFormControls';
import {
  buildVisionStageHref,
  resolveVisionStageFromPath,
  VISION_STAGE_CONFIG,
} from '../components/planning/visionNavigation';

const VISION_PROGRESS_SHIMMER_STYLE = `
@keyframes vision-progress-shimmer {
  0% { background-position: 180% 0; }
  100% { background-position: -80% 0; }
}
`;

const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];
const MONTH_LABELS = ['M1', 'M2', 'M3'];
const DAY_SLOT_COUNT = 7;

const GOAL_COLLECTIONS = {
  year: 'yearlyGoals',
  quarter: 'quarterlyGoals',
  month: 'monthlyGoals',
  week: 'weeklyGoals',
  day: 'dailyGoals',
};

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const dayLabel = (index) => `Day ${index + 1}`;

const buildVisionChainKey = ({ yearId = '', quarterId = '', monthId = '', weekId = '', dayId = '' }) =>
  [yearId, quarterId, monthId, weekId, dayId].map((value) => String(value || '').trim()).join('::');

const getLoggedInEmployeeMeta = () => {
  const session = getStoredAuthSession();
  const emp = session?.employee || {};
  return {
    empId: String(emp.empId || emp._id || ''),
    empName: String(emp.empName || ''),
    role: String(emp.role || '').toUpperCase(),
  };
};

const normalizeRole = (role) => {
  const value = String(role || '').toUpperCase();
  if (value === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (value === 'ADMIN') return 'ADMIN';
  if (value === 'TEAM_LEAD') return 'TEAM_LEAD';
  if (value === 'EMPLOYEE') return 'EMPLOYEE';
  return 'UNKNOWN';
};

const averageProgress = (items) => {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => sum + (item.progress || 0), 0);
  return Math.round(total / items.length);
};

const cloneGoal = (goal, overrides = {}) => ({
  id: goal.id,
  text: goal.text || '',
  completed: !!goal.completed,
  level: goal.level,
  parentId: goal.parentId || '',
  details: goal.details || '',
  timeline: goal.timeline || '',
  ...overrides,
});

const findByTimeline = (items, timeline) =>
  items.find((item) => String(item.timeline || '').toUpperCase() === String(timeline).toUpperCase());

const weekSortValue = (timeline) => {
  const value = String(timeline || '').trim().toUpperCase();
  const weekMatch = /^W(\d+)$/.exec(value);
  if (weekMatch) return Number(weekMatch[1]);
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return 100 + parsed;
  return 999999;
};

const daySortValue = (goal, index) => {
  const match = /(\d+)$/.exec(String(goal.id || ''));
  if (match) return Number(match[1]);
  const parsed = Date.parse(String(goal.timeline || '').trim());
  if (!Number.isNaN(parsed)) return parsed;
  return index + 1;
};

// Date helper functions with proper calendar calculations
const getPlanningYearStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
};

const formatDateLabel = (date, options) => date.toLocaleDateString('en-US', options);

const getQuarterMonths = (quarterLabel) => {
  const quarterNum = parseInt(quarterLabel.replace('Q', '')) || 1;
  const startMonth = (quarterNum - 1) * 3;
  return [startMonth, startMonth + 1, startMonth + 2];
};

const addDays = (date, amount) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const isSameCalendarDate = (left, right) => normalizeDate(left).getTime() === normalizeDate(right).getTime();
const isDateWithinRange = (date, start, end) => {
  const value = normalizeDate(date).getTime();
  return value >= normalizeDate(start).getTime() && value <= normalizeDate(end).getTime();
};
const getCurrentQuarterLabel = (date = new Date()) => `Q${Math.floor(date.getMonth() / 3) + 1}`;
const getCurrentMonthTimeline = (date = new Date()) => `M${(date.getMonth() % 3) + 1}`;
const getCalendarMonthNumber = (monthLabel, quarterLabel) => {
  const quarterMonths = getQuarterMonths(quarterLabel);
  const monthIndex = Math.min(Math.max(parseInt(String(monthLabel || '').replace('M', ''), 10) || 1, 1), 3) - 1;
  return (quarterMonths[monthIndex] ?? 0) + 1;
};
const getCalendarMonthLabel = (monthLabel, quarterLabel) => `Month ${getCalendarMonthNumber(monthLabel, quarterLabel)}`;
const getPlanningWeekNumber = (date, startDate = getPlanningYearStart()) => {
  if (!date) return 1;
  const start = normalizeDate(startDate);
  const target = normalizeDate(date);
  const dayOffset = Math.floor((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.floor((dayOffset + start.getDay()) / DAY_SLOT_COUNT) + 1;
};

const getMonthStartDate = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const quarterMonths = getQuarterMonths(quarterLabel);
  const monthIndex = Math.min(Math.max(parseInt(String(monthLabel || '').replace('M', ''), 10) || 1, 1), 3) - 1;
  const year = startDate.getFullYear();
  return new Date(year, quarterMonths[monthIndex], 1);
};

const getMonthEndDate = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const monthStart = getMonthStartDate(monthLabel, quarterLabel, startDate);
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
};

const getDaysInMonth = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) =>
  getMonthEndDate(monthLabel, quarterLabel, startDate).getDate();

const getQuarterDayCount = (quarterLabel, startDate = getPlanningYearStart()) =>
  MONTH_LABELS.reduce((sum, monthLabel) => sum + getDaysInMonth(monthLabel, quarterLabel, startDate), 0);

const getCalendarWeeksForMonth = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const monthStart = getMonthStartDate(monthLabel, quarterLabel, startDate);
  const monthEnd = getMonthEndDate(monthLabel, quarterLabel, startDate);
  const leadingOffset = monthStart.getDay();
  const gridStart = addDays(monthStart, -leadingOffset);
  const totalCalendarCells = leadingOffset + monthEnd.getDate();
  const weekCount = Math.max(1, Math.ceil(totalCalendarCells / DAY_SLOT_COUNT));

  return Array.from({ length: weekCount }, (_, weekIndex) => {
    const weekStart = addDays(gridStart, weekIndex * DAY_SLOT_COUNT);
    const weekEnd = addDays(weekStart, DAY_SLOT_COUNT - 1);
    const visibleStart = weekStart < monthStart ? monthStart : weekStart;
    const visibleEnd = weekEnd > monthEnd ? monthEnd : weekEnd;
    const dayCount = Math.max(
      1,
      Math.floor((visibleEnd.getTime() - visibleStart.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    );
    const days = Array.from({ length: dayCount }, (_, dayIndex) => addDays(visibleStart, dayIndex));
    return {
      slotIndex: weekIndex + 1,
      start: visibleStart,
      end: visibleEnd,
      days,
    };
  });
};

const getWeekPlan = (weekIndex, monthLabel, quarterLabel, startDate = getPlanningYearStart()) =>
  getCalendarWeeksForMonth(monthLabel, quarterLabel, startDate)[Math.max(weekIndex, 1) - 1] || null;

const getWeeksInMonth = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  return getCalendarWeeksForMonth(monthLabel, quarterLabel, startDate).length;
};

const getQuarterWeekCount = (quarterLabel, startDate = getPlanningYearStart()) =>
  MONTH_LABELS.reduce((sum, monthLabel) => sum + getWeeksInMonth(monthLabel, quarterLabel, startDate), 0);

const getYearWeekCount = () => 52;

const getYearlyDateRange = (startDate = getPlanningYearStart()) => {
  const year = startDate.getFullYear();
  const startStr = formatDateLabel(startDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const endDate = new Date(year + 1, 0, 0); // Last day of Dec
  const endStr = formatDateLabel(endDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return `${startStr} - ${endStr}`;
};

const getQuarterlyDateRange = (quarterLabel, startDate = getPlanningYearStart()) => {
  const months = getQuarterMonths(quarterLabel);
  const year = startDate.getFullYear();
  const startMonth = new Date(year, months[0], 1);
  const endMonth = new Date(year, months[2] + 1, 0); // Last day of last month in quarter
  const startStr = formatDateLabel(startMonth, { weekday: 'short', day: 'numeric', month: 'short' });
  const endStr = formatDateLabel(endMonth, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${startStr} - ${endStr}`;
};

const getMonthlyDate = (monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const monthStart = getMonthStartDate(monthLabel, quarterLabel, startDate);
  const monthEnd = getMonthEndDate(monthLabel, quarterLabel, startDate);
  const startStr = formatDateLabel(monthStart, { weekday: 'short', day: 'numeric', month: 'short' });
  const endStr = formatDateLabel(monthEnd, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${startStr} - ${endStr}`;
};

const getWeeklyDateRange = (weekIndex, monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const weekPlan = getWeekPlan(weekIndex, monthLabel, quarterLabel, startDate);
  if (!weekPlan) return '';
  const startStr = formatDateLabel(weekPlan.start, { weekday: 'short', day: 'numeric', month: 'short' });
  const endStr = formatDateLabel(weekPlan.end, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${startStr} - ${endStr}`;
};

const getDailyDate = (dayIndex, weekIndex, monthLabel, quarterLabel, startDate = getPlanningYearStart()) => {
  const weekPlan = getWeekPlan(weekIndex, monthLabel, quarterLabel, startDate);
  const dayDate = weekPlan?.days?.[Math.max(dayIndex, 1) - 1];
  if (!dayDate) return '';
  return formatDateLabel(dayDate, { weekday: 'short', day: 'numeric', month: 'short' });
};

const buildVisionTree = (state) =>
  state.yearlyGoals.map((yearGoal, yearIndex) => {
    const yearQuarterGoals = state.quarterlyGoals.filter((goal) => goal.parentId === yearGoal.id);

    const quarters = QUARTER_LABELS.map((quarterLabel) => {
      const quarterGoal =
        findByTimeline(yearQuarterGoals, quarterLabel) ||
        cloneGoal(
          {
            id: `${String(yearGoal.id || '').toLowerCase()}-${quarterLabel.toLowerCase()}`,
            text: '',
            completed: false,
            level: 'quarter',
            parentId: yearGoal.id,
            timeline: quarterLabel,
          },
          { isPlaceholder: true },
        );

      const quarterMonthGoals = state.monthlyGoals
        .filter((goal) => goal.parentId === quarterGoal.id)
        .sort((left, right) => monthSlotSortKey(left.timeline) - monthSlotSortKey(right.timeline) || left.id.localeCompare(right.id));

      const usedMonthIds = new Set();
      const baseMonths = MONTH_LABELS.map((monthLabel) => {
        const monthGoal =
          findByTimeline(quarterMonthGoals, monthLabel) ||
          cloneGoal(
            {
              id: `${String(quarterGoal.id || '').toLowerCase()}-${monthLabel.toLowerCase()}`,
              text: '',
              completed: false,
              level: 'month',
              parentId: quarterGoal.id,
              timeline: monthLabel,
            },
            { isPlaceholder: true },
          );
        usedMonthIds.add(monthGoal.id);
        return monthGoal;
      });

      const extraMonths = quarterMonthGoals.filter((goal) => !usedMonthIds.has(goal.id));
      const months = [...baseMonths, ...extraMonths].map((monthGoal, monthIndex) => {
        const monthWeekGoals = state.weeklyGoals
          .filter((goal) => goal.parentId === monthGoal.id)
          .sort((left, right) => weekSortValue(left.timeline) - weekSortValue(right.timeline) || left.id.localeCompare(right.id));

        const monthCalendarWeeks = getCalendarWeeksForMonth(monthGoal.timeline, quarterGoal.timeline);
        const defaultWeekCount = monthCalendarWeeks.length;
        const weekCount = Math.max(defaultWeekCount, monthWeekGoals.length || 0);
        const weeks = Array.from({ length: weekCount }, (_, slotIndex) => {
          const calendarWeek = monthCalendarWeeks[slotIndex] || null;
          const weekGoal =
            monthWeekGoals[slotIndex] ||
            cloneGoal(
              {
                id: `${String(monthGoal.id || '').toLowerCase()}-w${slotIndex + 1}`,
                text: '',
                completed: false,
                level: 'week',
                parentId: monthGoal.id,
                timeline: `W${slotIndex + 1}`,
              },
              { isPlaceholder: true },
            );

          const weekDays = state.dailyGoals
            .filter((goal) => goal.parentId === weekGoal.id)
            .sort((left, right) => daySortValue(left, 0) - daySortValue(right, 0) || left.id.localeCompare(right.id));

          const plannedDayCount = Math.max(1, calendarWeek?.days?.length || 0);
          const days = Array.from({ length: plannedDayCount }, (_, dayIndex) =>
            weekDays[dayIndex] ||
            cloneGoal(
              {
                id: `d-${weekGoal.id}-${dayIndex + 1}`,
                text: dayLabel(dayIndex),
                completed: false,
                level: 'day',
                parentId: weekGoal.id,
                timeline: `D${dayIndex + 1}`,
              },
              { isPlaceholder: true },
            ),
          );

          const progress = days.length ? Math.round((days.filter((day) => day.completed).length / days.length) * 100) : 0;

          return {
            ...weekGoal,
            slotIndex: slotIndex + 1,
            yearWeekNumber: calendarWeek ? getPlanningWeekNumber(calendarWeek.start) : slotIndex + 1,
            progress,
            days,
            dateRange: calendarWeek ? getWeeklyDateRange(slotIndex + 1, monthGoal.timeline, quarterGoal.timeline) : '',
          };
        });

        return {
          ...monthGoal,
          order: monthIndex + 1,
          calendarMonthNumber: getCalendarMonthNumber(monthGoal.timeline, quarterGoal.timeline),
          progress: averageProgress(weeks),
          weeks,
        };
      });

      return {
        ...quarterGoal,
        progress: averageProgress(months),
        months,
      };
    });

    return {
      ...yearGoal,
      visionIndex: yearIndex + 1,
      progress: averageProgress(quarters),
      quarters,
    };
  });

const ProgressBar = ({ progress, tone = 'red', loading = false }) => {
  const shimmerClass =
    tone === 'emerald'
      ? 'bg-[linear-gradient(90deg,#f1f5f9_0%,#d1fae5_35%,#10b981_50%,#d1fae5_65%,#f1f5f9_100%)]'
      : tone === 'navy'
        ? 'bg-[linear-gradient(90deg,#f1f5f9_0%,#cbd5e1_35%,#334155_50%,#cbd5e1_65%,#f1f5f9_100%)]'
        : 'bg-[linear-gradient(90deg,#f1f5f9_0%,#fecdd3_35%,#ef4444_50%,#fecdd3_65%,#f1f5f9_100%)]';
  const fillClass =
    tone === 'navy'
      ? 'from-slate-900 to-slate-700'
      : tone === 'emerald'
        ? 'from-emerald-500 to-emerald-400'
        : 'from-brand-red to-rose-500';

  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
      {loading ? (
        <div
          className={`absolute inset-0 rounded-full ${shimmerClass}`}
          style={{
            animation: 'vision-progress-shimmer 1.05s ease-in-out infinite',
            backgroundSize: '220% 100%',
          }}
        />
      ) : (
        <div
          className={`h-full rounded-full bg-gradient-to-r ${fillClass} transition-all duration-500`}
          style={{ width: `${Math.max(0, Math.min(100, progress || 0))}%` }}
        />
      )}
    </div>
  );
};

const SmallActionButton = ({ children, onClick, variant = 'default', disabled = false }) => {
  const variantClass =
    variant === 'primary'
      ? 'border-brand-red bg-brand-red text-white hover:bg-red-600'
      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass}`}
    >
      {children}
    </button>
  );
};

const DrillBreadcrumb = ({ items }) => (
  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
    {items.map((item, index) => (
      <React.Fragment key={item.label}>
        {index > 0 ? <ChevronRight size={14} className="text-slate-300" /> : null}
        {item.to ? (
          <Link to={item.to} className="transition hover:text-slate-900">
            {item.label}
          </Link>
        ) : (
          <span className="font-medium text-slate-900">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </div>
);

const MetricCard = ({ label, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
  </div>
);

const GridCard = ({ badge, title, subtitle, progress, onOpen, children, tone = 'red' }) => (
  <button
    type="button"
    onClick={onOpen}
    className="group flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_50px_rgba(15,23,42,0.09)]"
  >
    <div className="flex items-start justify-between gap-3">
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {badge}
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition group-hover:text-slate-600">
        Open
        <ArrowRight size={13} />
      </span>
    </div>
    <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
    <p className="mt-2 min-h-[44px] text-sm leading-6 text-slate-500">{subtitle}</p>
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Completion</span>
        <span>{progress}%</span>
      </div>
      <ProgressBar progress={progress} tone={tone} />
    </div>
    {children ? <div className="mt-5">{children}</div> : null}
  </button>
);

const visionTitleStyle = (title) => {
  const length = String(title || '').trim().length;
  if (length > 60) return { fontSize: '1.2rem' };
  if (length > 48) return { fontSize: '1.35rem' };
  if (length > 36) return { fontSize: '1.55rem' };
  return { fontSize: '1.8rem' };
};

const cardIconByStage = {
  year: Target,
  quarter: BarChart3,
  month: Calendar,
  week: CheckSquare,
};

const VisionHierarchyCard = ({
  item,
  stageKey,
  stageLabel,
  badge,
  title,
  details,
  progress,
  footerLabel,
  linkTo,
  infoRows,
  onOpen,
  onEdit,
  onDelete,
  isAdmin,
  isProgressLoading = false,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  dateRange,
  isCurrentPeriod = false,
}) => {
  const Icon = cardIconByStage[stageKey] || Target;

  return (
  <div
    className={`group relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-white transition hover:-translate-y-1 ${
      isCurrentPeriod
        ? 'border-red-200 shadow-none ring-1 ring-red-100 hover:shadow-none'
        : 'border-slate-200 shadow-[0_20px_55px_rgba(15,23,42,0.07)] hover:border-slate-300 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)]'
    }`}
    onMouseLeave={onMenuClose}
  >
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 transition group-hover:from-brand-red group-hover:via-rose-400 group-hover:to-orange-300" />
    <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-transparent blur-2xl transition" />
    {isAdmin ? (
      <div className="absolute right-5 top-5 z-20">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onMenuToggle();
          }}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900 ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label="Open card actions"
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 mt-2 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
                onMenuClose();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
                onMenuClose();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        ) : null}
      </div>
    ) : null}

      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className="relative flex w-full flex-1 cursor-pointer flex-col p-6 text-left"
    >
        <div className="flex items-start justify-between gap-4 pr-14">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] shadow-none transition-all duration-300 ${
            isCurrentPeriod
              ? 'bg-slate-900 text-brand-red group-hover:bg-gradient-to-br group-hover:from-brand-red group-hover:to-red-500 group-hover:text-white'
              : 'bg-slate-900 text-brand-red group-hover:bg-gradient-to-br group-hover:from-brand-red group-hover:to-red-500 group-hover:text-white'
          }`}>
          <Icon size={24} />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <div className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
              Planning
            </div>
            <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-brand-red">
            {stageLabel}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {badge}
          </div>
          {dateRange && (
            <div className={`rounded-full border px-3 py-1 text-xs font-medium ${
              isCurrentPeriod ? 'border-slate-200 bg-slate-50 text-slate-500 transition group-hover:border-red-200 group-hover:bg-red-50 group-hover:text-brand-red' : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}>
              {dateRange}
            </div>
          )}
        </div>

        <div
        className="mt-5 overflow-hidden font-semibold leading-[1.08] tracking-[-0.04em] text-slate-900"
        style={{
          ...visionTitleStyle(title),
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
        }}
        title={title}
      >
        {title}
      </div>

      {details ? <p className="mt-4 text-sm leading-7 text-slate-500">{details}</p> : null}

      <div className={`mt-5 flex items-center justify-between text-sm text-slate-500 ${details ? '' : 'pt-1'}`}>
        <span>Vision progress</span>
        <span className="text-2xl font-semibold text-slate-900">{progress}%</span>
      </div>
      <div className="mt-3">
        <ProgressBar progress={progress} tone="red" loading={isProgressLoading} />
      </div>

      <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-slate-50/85 p-4 shadow-none">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-sm text-slate-500">
          {infoRows.map((row) => (
            <React.Fragment key={row.label}>
              <span>{row.label}</span>
              <span className="font-semibold text-slate-900">{row.value}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>

    <div className="relative flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5">
      <div className="text-sm font-semibold text-slate-900">
        {progress}% complete
      </div>
      <Link
        to={linkTo}
        className="inline-flex items-center gap-2 text-base font-semibold text-brand-red transition hover:text-red-600"
      >
        {footerLabel}
        <ArrowRight size={16} />
      </Link>
    </div>
  </div>
  );
};

const EditorPanel = ({
  title,
  goal,
  draft,
  setDraft,
  onSave,
  onCancel,
  showDetails = true,
  placeholder = 'Write here',
  detailsPlaceholder = 'Add notes, metrics, or execution detail',
}) => (
  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</div>
        <div className="mt-1 text-sm text-slate-500">Edit the selected item without leaving this stage.</div>
      </div>
      <div className="flex items-center gap-2">
        <SmallActionButton variant="primary" onClick={onSave}>
          Save
        </SmallActionButton>
        <SmallActionButton onClick={onCancel}>Cancel</SmallActionButton>
      </div>
    </div>
    <textarea
      value={draft?.text ?? goal?.text ?? ''}
      onChange={(event) => setDraft({ text: event.target.value })}
      rows={3}
      placeholder={placeholder}
      className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-red/30"
    />
    {showDetails ? (
      <textarea
        value={draft?.details ?? goal?.details ?? ''}
        onChange={(event) => setDraft({ details: event.target.value })}
        rows={3}
        placeholder={detailsPlaceholder}
        className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none transition focus:border-brand-red/30"
      />
    ) : null}
  </div>
);

const DailyRow = ({ day, index, isAdmin, onEdit, dateStr }) => (
  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {dateStr || dayLabel(index)}
          </span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${day.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-brand-red'}`}>
            {day.completed ? 'Completed' : 'Active'}
          </span>
        </div>
        {!/^day\s+\d+$/i.test(String(day.text || '').trim()) ? (
          <h4 className="mt-4 text-base font-semibold text-slate-900">{day.text}</h4>
        ) : null}
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {day.details || 'Use this day slot to define the exact action, output, or checkpoint for the selected week.'}
        </p>
      </div>
      {isAdmin ? (
        <div className="shrink-0">
          <SmallActionButton onClick={() => onEdit(day)}>
            <Pencil size={12} />
            Edit
          </SmallActionButton>
        </div>
      ) : null}
    </div>
  </div>
);

const Vision = ({ state, updateState, loading = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stage = resolveVisionStageFromPath(location.pathname);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(String(state?.currentUser?.role || '').toUpperCase());

  const [draftById, setDraftById] = useState({});
  const [editingId, setEditingId] = useState('');
  const [openCardMenuId, setOpenCardMenuId] = useState('');
  const [showVisionComposer, setShowVisionComposer] = useState(false);
  const [newVisionTitle, setNewVisionTitle] = useState('');
  const [newVisionDetails, setNewVisionDetails] = useState('');
  const [spacesTasks, setSpacesTasks] = useState([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressDataReady, setProgressDataReady] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [taskDraftByDay, setTaskDraftByDay] = useState({});
  const [taskDocumentByDay, setTaskDocumentByDay] = useState({});
  const [editingTaskId, setEditingTaskId] = useState('');
  const [openTaskMenuId, setOpenTaskMenuId] = useState('');
  const [viewingTaskId, setViewingTaskId] = useState('');
  const [savingTaskDayId, setSavingTaskDayId] = useState('');
  const [uploadingTaskDocument, setUploadingTaskDocument] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState('');
  const [taskError, setTaskError] = useState('');

  const visions = useMemo(() => buildVisionTree(state), [state]);
  const yearIdFromQuery = searchParams.get('yearId') || '';
  const quarterIdFromQuery = searchParams.get('quarterId') || '';
  const monthIdFromQuery = searchParams.get('monthId') || '';
  const weekIdFromQuery = searchParams.get('weekId') || '';
  const weekSlotFromQuery = Number(searchParams.get('weekSlot') || 0);
  const dayIdFromQuery = searchParams.get('dayId') || '';

  const selectedYear = visions.find((item) => item.id === yearIdFromQuery) || visions[0] || null;
  const selectedQuarter =
    (selectedYear?.quarters || []).find((item) => item.id === quarterIdFromQuery) ||
    selectedYear?.quarters?.[0] ||
    null;
  const selectedMonth =
    (selectedQuarter?.months || []).find((item) => item.id === monthIdFromQuery) ||
    selectedQuarter?.months?.[0] ||
    null;
  const selectedWeek =
    (selectedMonth?.weeks || []).find(
      (item) => item.id === weekIdFromQuery && (!weekSlotFromQuery || Number(item.slotIndex || 0) === weekSlotFromQuery),
    ) ||
    (selectedMonth?.weeks || []).find((item) => weekSlotFromQuery && Number(item.slotIndex || 0) === weekSlotFromQuery) ||
    selectedMonth?.weeks?.[0] ||
    null;
  const [activeDayId, setActiveDayId] = useState('');
  const me = getLoggedInEmployeeMeta();
  const today = useMemo(() => new Date(), []);
  const currentPlanningYear = useMemo(() => getPlanningYearStart().getFullYear(), []);
  const isCurrentPlanningYear = today.getFullYear() === currentPlanningYear;
  const currentQuarterTimeline = useMemo(() => getCurrentQuarterLabel(today), [today]);
  const currentMonthTimeline = useMemo(() => getCurrentMonthTimeline(today), [today]);
  const currentWeekSlotIndex = useMemo(() => {
    if (!selectedQuarter?.timeline || !selectedMonth?.timeline) return 0;
    if (!isCurrentPlanningYear || selectedQuarter.timeline !== currentQuarterTimeline || selectedMonth.timeline !== currentMonthTimeline) {
      return 0;
    }
    const matchingWeek = getCalendarWeeksForMonth(selectedMonth.timeline, selectedQuarter.timeline).find((week) =>
      isDateWithinRange(today, week.start, week.end),
    );
    return matchingWeek?.slotIndex || 0;
  }, [today, isCurrentPlanningYear, currentQuarterTimeline, currentMonthTimeline, selectedQuarter?.timeline, selectedMonth?.timeline]);
  const selectedMonthDisplayLabel = useMemo(
    () => (selectedMonth?.timeline && selectedQuarter?.timeline ? getCalendarMonthLabel(selectedMonth.timeline, selectedQuarter.timeline) : 'Month'),
    [selectedMonth?.timeline, selectedQuarter?.timeline],
  );
  const selectedWeekDisplayLabel = useMemo(
    () => `Week ${selectedWeek?.yearWeekNumber || selectedWeek?.slotIndex || 1}`,
    [selectedWeek?.yearWeekNumber, selectedWeek?.slotIndex],
  );

  const assignableEmployees = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => map.set(String(emp.empId || ''), emp));
    if (me.empId) {
      map.set(me.empId, { empId: me.empId, empName: me.empName || 'You', role: me.role || 'EMPLOYEE' });
    }
    const all = Array.from(map.values()).filter((emp) => String(emp.empId || '').trim());
    const myRole = normalizeRole(me.role);
    if (myRole === 'SUPER_ADMIN' || myRole === 'ADMIN') {
      return all.filter((emp) => {
        const role = normalizeRole(emp.role);
        return emp.empId === me.empId || role === 'TEAM_LEAD' || role === 'EMPLOYEE' || role === 'UNKNOWN';
      });
    }
    if (myRole === 'TEAM_LEAD') {
      return all.filter((emp) => {
        const role = normalizeRole(emp.role);
        return emp.empId === me.empId || role === 'EMPLOYEE' || role === 'UNKNOWN';
      });
    }
    return all.filter((emp) => emp.empId === me.empId);
  }, [employees, me.empId, me.empName, me.role]);

  const taskAssigneeOptions = useMemo(
    () =>
      assignableEmployees.map((employee) => ({
        value: employee.empId,
        label: employee.empId === me.empId ? `${employee.empName || employee.empId} (You)` : employee.empName || employee.empId,
      })),
    [assignableEmployees, me.empId],
  );

  const taskPriorityOptions = useMemo(
    () => [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ],
    [],
  );

  const taskStatusOptions = useMemo(
    () => [
      { value: 'todo', label: 'To Do' },
      { value: 'doing', label: 'Doing' },
      { value: 'review', label: 'Review' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'done', label: 'Done' },
    ],
    [],
  );

  useEffect(() => {
    if (!selectedWeek?.days?.length) return;
    const preferredId = dayIdFromQuery && selectedWeek.days.some((item) => item.id === dayIdFromQuery)
      ? dayIdFromQuery
      : selectedWeek.days[0].id;
    setActiveDayId(preferredId);
  }, [selectedWeek, dayIdFromQuery]);

  useEffect(() => {
    if (loading) {
      setProgressLoading(true);
      setProgressDataReady(false);
      return undefined;
    }

    let active = true;
    const loadContext = async () => {
      setProgressLoading(true);
      setProgressDataReady(false);
      try {
        const [tasksRes, employeesRes] = await Promise.all([
          fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() }),
        ]);
        if (!active) return;
        if (tasksRes.ok) {
          const payload = await tasksRes.json().catch(() => ({}));
          setSpacesTasks(Array.isArray(payload?.tasks) ? payload.tasks : []);
        }
        if (employeesRes.ok) {
          const payload = await employeesRes.json().catch(() => []);
          setEmployees(
            (Array.isArray(payload) ? payload : []).map((emp) => ({
              empId: String(emp.empId || emp._id || ''),
              empName: String(emp.empName || emp.name || ''),
              role: String(emp.role || ''),
            })),
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setProgressDataReady(true);
        }
      }
    };
    loadContext();
    return () => {
      active = false;
    };
  }, [loading]);

  useEffect(() => {
    if (!progressDataReady) return undefined;
    const frame = window.requestAnimationFrame(() => {
      setProgressLoading(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [progressDataReady, spacesTasks]);

  const stageMeta = VISION_STAGE_CONFIG.find((item) => item.key === stage) || VISION_STAGE_CONFIG[0];
  const isDailyStage = stage === 'day' && !!selectedWeek;
  const heroBadgeLabel = 'Vision Management';
  const heroTitle = isDailyStage
    ? selectedWeek.text || `Weekly plan for ${selectedMonthDisplayLabel}`
    : stageMeta.label;
  const heroDescription = isDailyStage
    ? selectedWeek.details || 'This daily board shows the entire week clearly so the team can execute without confusion.'
    : '';
  const heroStatLabel =
    stage === 'quarter'
      ? 'Active quarters'
      : stage === 'month'
        ? 'Active months'
        : stage === 'week'
          ? 'Active weeks'
          : stage === 'day'
            ? 'Active days'
            : 'Active visions';
  const heroStatValue =
    stage === 'quarter'
      ? selectedYear?.quarters?.length || 0
      : stage === 'month'
        ? selectedQuarter?.months?.length || 0
        : stage === 'week'
          ? selectedMonth?.weeks?.length || 0
          : stage === 'day'
            ? selectedWeek?.days?.length || 0
            : visions.length;
  const heroStatBadge =
    stage === 'quarter'
      ? 'Quarter map'
      : stage === 'month'
        ? 'Monthly plan'
        : stage === 'week'
          ? 'Weekly flow'
          : stage === 'day'
            ? 'Daily execution'
            : 'Strategic focus';

  const selection = {
    yearId: selectedYear?.id || '',
    quarterId: selectedQuarter?.id || '',
    monthId: selectedMonth?.id || '',
    weekId: selectedWeek?.id || '',
  };

  const goalContextMaps = useMemo(() => {
    const weekContextById = new Map();
    const dayContextById = new Map();

    const markContext = (map, id, context) => {
      const key = String(id || '').trim();
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        map.set(key, { ...existing, ambiguous: true });
        return;
      }
      map.set(key, { ...context, ambiguous: false });
    };

    (visions || []).forEach((yearNode) => {
      (yearNode?.quarters || []).forEach((quarterNode) => {
        (quarterNode?.months || []).forEach((monthNode) => {
          (monthNode?.weeks || []).forEach((weekNode) => {
            const weekContext = {
              yearId: String(yearNode?.id || '').trim(),
              quarterId: String(quarterNode?.id || '').trim(),
              monthId: String(monthNode?.id || '').trim(),
              weekId: String(weekNode?.id || '').trim(),
            };
            markContext(weekContextById, weekNode?.id, weekContext);

            (weekNode?.days || []).forEach((dayNode) => {
              markContext(dayContextById, dayNode?.id, {
                ...weekContext,
                dayId: String(dayNode?.id || '').trim(),
              });
            });
          });
        });
      });
    });

    return { weekContextById, dayContextById };
  }, [visions]);

  const overallProgress = useMemo(() => averageProgress(visions), [visions]);
  const totalWeeks = useMemo(
    () =>
      visions.reduce(
        (sum, year) =>
          sum +
          year.quarters.reduce(
            (quarterSum, quarter) => quarterSum + quarter.months.reduce((monthSum, month) => monthSum + month.weeks.length, 0),
            0,
          ),
        0,
      ),
    [visions],
  );
  const totalCompletedDays = useMemo(
    () =>
      visions.reduce(
        (sum, year) =>
          sum +
          year.quarters.reduce(
            (quarterSum, quarter) =>
              quarterSum +
              quarter.months.reduce(
                (monthSum, month) => monthSum + month.weeks.reduce((weekSum, week) => weekSum + week.days.filter((day) => day.completed).length, 0),
                0,
              ),
            0,
          ),
        0,
      ),
    [visions],
  );
  const totalDays = useMemo(
    () =>
      visions.reduce(
        (sum, year) =>
          sum +
          year.quarters.reduce(
            (quarterSum, quarter) =>
              quarterSum + quarter.months.reduce((monthSum, month) => monthSum + month.weeks.reduce((weekSum, week) => weekSum + week.days.length, 0), 0),
            0,
          ),
        0,
      ),
    [visions],
  );

  const persistGoal = async (goal) => {
    await saveGoal({
      id: goal.id,
      text: goal.text || '',
      completed: !!goal.completed,
      level: goal.level,
      parentId: goal.parentId || '',
      details: goal.details || '',
      timeline: goal.timeline || '',
    });
  };

  const upsertGoalIntoState = (prev, goal) => {
    const collectionKey = GOAL_COLLECTIONS[goal.level];
    const collection = Array.isArray(prev[collectionKey]) ? prev[collectionKey] : [];
    const existingIndex = collection.findIndex((item) => item.id === goal.id);
    const nextCollection =
      existingIndex >= 0
        ? collection.map((item) => (item.id === goal.id ? { ...item, ...goal } : item))
        : [...collection, goal];
    return {
      ...prev,
      [collectionKey]: nextCollection,
    };
  };

  const upsertManyGoalsIntoState = (prev, goals) =>
    goals.reduce((next, goal) => upsertGoalIntoState(next, goal), prev);

  const setDraft = (goal, updates = {}) => {
    setDraftById((prev) => ({
      ...prev,
      [goal.id]: {
        text: prev[goal.id]?.text ?? goal.text ?? '',
        details: prev[goal.id]?.details ?? goal.details ?? '',
        ...updates,
      },
    }));
  };

  const openEditor = (goal) => {
    if (!isAdmin || !goal) return;
    setDraft(goal);
    setEditingId(goal.id);
  };

  const closeEditor = () => setEditingId('');

  const saveNode = async (goal) => {
    if (!isAdmin || !goal) return;
    const draft = draftById[goal.id] || {};
    const nextGoal = {
      id: goal.id,
      text: String(draft.text ?? goal.text ?? '').trim(),
      details: String(draft.details ?? goal.details ?? '').trim(),
      completed: !!goal.completed,
      level: goal.level,
      parentId: goal.parentId || '',
      timeline: goal.timeline || '',
    };
    updateState((prev) => upsertGoalIntoState(prev, nextGoal));
    try {
      await persistGoal(nextGoal);
      closeEditor();
    } catch (error) {
      console.error(error);
    }
  };

  const addVision = async () => {
    if (!isAdmin) return;
    const text = newVisionTitle.trim();
    if (!text || state.yearlyGoals.length >= 5) return;

    const goal = {
      id: `y-${createId()}`,
      text,
      details: newVisionDetails.trim(),
      completed: false,
      level: 'year',
    };

    updateState((prev) => ({
      ...prev,
      yearlyGoals: [...prev.yearlyGoals, goal],
    }));

    try {
      await persistGoal(goal);
      setNewVisionTitle('');
      setNewVisionDetails('');
      setShowVisionComposer(false);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteVision = async (vision) => {
    if (!isAdmin || !vision) return;
    const collectNodeIds = (node) => {
      if (!node) return [];
      return [
        node.id,
        ...((node.quarters || []).flatMap((child) => collectNodeIds(child))),
        ...((node.months || []).flatMap((child) => collectNodeIds(child))),
        ...((node.weeks || []).flatMap((child) => collectNodeIds(child))),
        ...((node.days || []).flatMap((child) => collectNodeIds(child))),
      ];
    };

    const idsToRemove = collectNodeIds(vision);
    const idSet = new Set(idsToRemove);

    updateState((prev) => ({
      ...prev,
      yearlyGoals: (prev.yearlyGoals || []).filter((goal) => !idSet.has(goal.id)),
      quarterlyGoals: (prev.quarterlyGoals || []).filter((goal) => !idSet.has(goal.id)),
      monthlyGoals: (prev.monthlyGoals || []).filter((goal) => !idSet.has(goal.id)),
      weeklyGoals: (prev.weeklyGoals || []).filter((goal) => !idSet.has(goal.id)),
      dailyGoals: (prev.dailyGoals || []).filter((goal) => !idSet.has(goal.id)),
    }));

    if (editingId && idSet.has(editingId)) {
      setEditingId('');
    }

    try {
      await Promise.all(idsToRemove.map((id) => removeGoal(id)));
    } catch (error) {
      console.error(error);
    }
  };

  const deleteHierarchyItem = async (item) => {
    if (!isAdmin || !item) return;
    await deleteVision(item);
  };

  const addWeekGoal = async (month) => {
    if (!isAdmin || !month) return;
    const monthWeekLimit = getWeeksInMonth(month.timeline, selectedQuarter?.timeline);
    const existingRealWeeks = month.weeks.filter((week) => !week.isPlaceholder);
    if (existingRealWeeks.length >= monthWeekLimit) {
      const firstEditableWeek = month.weeks.find((week) => !week.text && !week.details) || month.weeks[0];
      openEditor(firstEditableWeek);
      return;
    }

    const targetWeek = month.weeks.find((week) => week.isPlaceholder) || month.weeks[existingRealWeeks.length];
    if (!targetWeek) return;

    const weekGoal = {
      id: targetWeek.id,
      text: '',
      details: '',
      completed: false,
      level: 'week',
      parentId: month.id,
      timeline: targetWeek.timeline || `W${targetWeek.slotIndex || existingRealWeeks.length + 1}`,
    };

    const plannedDayCount = Math.max(
      1,
      getWeekPlan(targetWeek.slotIndex || existingRealWeeks.length + 1, month.timeline, selectedQuarter?.timeline)?.days?.length || 0,
    );

    const seededDays = Array.from({ length: plannedDayCount }, (_, index) => ({
      id: `d-${weekGoal.id}-${index + 1}`,
      text: dayLabel(index),
      completed: false,
      level: 'day',
      parentId: weekGoal.id,
      timeline: `D${index + 1}`,
    }));

    updateState((prev) => upsertManyGoalsIntoState(prev, [weekGoal, ...seededDays]));
    setDraft(weekGoal, { text: '', details: '' });
    setEditingId(weekGoal.id);

    try {
      await Promise.all([persistGoal(weekGoal), ...seededDays.map((day) => persistGoal(day))]);
    } catch (error) {
      console.error(error);
    }
  };

  const ensureWeekDays = async (week) => {
    if (!isAdmin || !week) return;
    const existingRealDays = week.days.filter((day) => !day.isPlaceholder);
    const dayLimit = Math.max(1, week.days.length || 0);
    if (existingRealDays.length >= dayLimit) {
      const firstEditableDay = week.days.find((day) => !day.text || day.text.startsWith('Day ')) || week.days[0];
      openEditor(firstEditableDay);
      return;
    }

    const missingDays = Array.from({ length: dayLimit - existingRealDays.length }, (_, index) => {
      const slot = existingRealDays.length + index + 1;
      return {
        id: `d-${week.id}-${slot}`,
        text: dayLabel(slot - 1),
        details: '',
        completed: false,
        level: 'day',
        parentId: week.id,
        timeline: `D${slot}`,
      };
    });

    updateState((prev) => upsertManyGoalsIntoState(prev, missingDays));
    if (missingDays[0]) {
      setDraft(missingDays[0], { text: missingDays[0].text, details: '' });
      setEditingId(missingDays[0].id);
    }

    try {
      await Promise.all(missingDays.map((day) => persistGoal(day)));
    } catch (error) {
      console.error(error);
    }
  };

  const toggleDayComplete = async (goal) => {
    if (!isAdmin || !goal) return;
    const nextGoal = {
      id: goal.id,
      text: goal.text || '',
      details: goal.details || '',
      completed: !goal.completed,
      level: 'day',
      parentId: goal.parentId || '',
      timeline: goal.timeline || '',
    };
    updateState((prev) => upsertGoalIntoState(prev, nextGoal));
    try {
      await persistGoal(nextGoal);
    } catch (error) {
      console.error(error);
    }
  };

  const selectedDayIndex = Math.max(
    0,
    (selectedWeek?.days || []).findIndex((item) => item.id === (activeDayId || selectedWeek?.days?.[0]?.id)),
  );
  const selectedDay = selectedWeek?.days?.[selectedDayIndex] || selectedWeek?.days?.[0] || null;
  const doesTaskBelongToWeekNode = useMemo(() => {
    const matchesWeekContext = (context, target) =>
      !!context &&
      context.yearId === target.yearId &&
      context.quarterId === target.quarterId &&
      context.monthId === target.monthId &&
      context.weekId === target.weekId;

    return (task, weekNode, context = {}) => {
      const cf = task?.customFields || {};
      const target = {
        yearId: String(context.yearId || '').trim(),
        quarterId: String(context.quarterId || '').trim(),
        monthId: String(context.monthId || '').trim(),
        weekId: String(weekNode?.id || '').trim(),
      };

      const taskYearId = String(cf.yearlyGoalId || cf.planningYearId || '').trim();
      const taskQuarterId = String(cf.quarterlyGoalId || cf.planningQuarterId || '').trim();
      const taskMonthId = String(cf.monthlyGoalId || cf.planningMonthId || '').trim();
      const weeklyGoalId = String(cf.weeklyGoalId || cf.planningWeekId || '').trim();
      const dailyGoalId = String(cf.dailyGoalId || '').trim();
      const explicitWeekChainKey = String(cf.weekChainKey || '').trim();
      const explicitDayChainKey = String(cf.dayChainKey || '').trim();
      const targetWeekChainKey = buildVisionChainKey(target);

      if (explicitWeekChainKey) {
        return explicitWeekChainKey === targetWeekChainKey;
      }

      if (explicitDayChainKey) {
        return explicitDayChainKey.startsWith(`${targetWeekChainKey}::`);
      }

      if (taskYearId && taskQuarterId && taskMonthId && weeklyGoalId) {
        return (
          taskYearId === target.yearId &&
          taskQuarterId === target.quarterId &&
          taskMonthId === target.monthId &&
          weeklyGoalId === target.weekId
        );
      }

      if (weeklyGoalId) {
        const weekContext = goalContextMaps.weekContextById.get(weeklyGoalId);
        if (weekContext && !weekContext.ambiguous) {
          return matchesWeekContext(weekContext, target);
        }
      }

      if (dailyGoalId) {
        const dayContext = goalContextMaps.dayContextById.get(dailyGoalId);
        if (dayContext && !dayContext.ambiguous) {
          return matchesWeekContext(dayContext, target);
        }
      }

      return false;
    };
  }, [goalContextMaps]);

  const doesTaskBelongToDayNode = useMemo(() => {
    const matchesDayContext = (context, target) =>
      !!context &&
      context.yearId === target.yearId &&
      context.quarterId === target.quarterId &&
      context.monthId === target.monthId &&
      context.weekId === target.weekId &&
      context.dayId === target.dayId;

    return (task, dayNode, context = {}) => {
      const cf = task?.customFields || {};
      const target = {
        yearId: String(context.yearId || '').trim(),
        quarterId: String(context.quarterId || '').trim(),
        monthId: String(context.monthId || '').trim(),
        weekId: String(context.weekId || '').trim(),
        dayId: String(dayNode?.id || '').trim(),
      };

      const taskYearId = String(cf.yearlyGoalId || cf.planningYearId || '').trim();
      const taskQuarterId = String(cf.quarterlyGoalId || cf.planningQuarterId || '').trim();
      const taskMonthId = String(cf.monthlyGoalId || cf.planningMonthId || '').trim();
      const weeklyGoalId = String(cf.weeklyGoalId || cf.planningWeekId || '').trim();
      const dailyGoalId = String(cf.dailyGoalId || '').trim();
      const explicitDayChainKey = String(cf.dayChainKey || '').trim();
      const targetDayChainKey = buildVisionChainKey(target);

      if (explicitDayChainKey) {
        return explicitDayChainKey === targetDayChainKey;
      }

      if (taskYearId && taskQuarterId && taskMonthId && weeklyGoalId && dailyGoalId) {
        return (
          taskYearId === target.yearId &&
          taskQuarterId === target.quarterId &&
          taskMonthId === target.monthId &&
          weeklyGoalId === target.weekId &&
          dailyGoalId === target.dayId
        );
      }

      if (dailyGoalId) {
        const dayContext = goalContextMaps.dayContextById.get(dailyGoalId);
        if (dayContext && !dayContext.ambiguous) {
          return matchesDayContext(dayContext, target);
        }
      }

      return false;
    };
  }, [goalContextMaps]);

  const isTaskLinkedToSelectedWeek = useMemo(() => {
    return (task) => {
      return doesTaskBelongToWeekNode(task, selectedWeek, {
        yearId: selectedYear?.id,
        quarterId: selectedQuarter?.id,
        monthId: selectedMonth?.id,
      });
    };
  }, [doesTaskBelongToWeekNode, selectedYear?.id, selectedQuarter?.id, selectedMonth?.id, selectedWeek]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDay) return [];
    return spacesTasks.filter((task) =>
      doesTaskBelongToDayNode(task, selectedDay, {
        yearId: selectedYear?.id,
        quarterId: selectedQuarter?.id,
        monthId: selectedMonth?.id,
        weekId: selectedWeek?.id,
      }),
    );
  }, [spacesTasks, selectedYear?.id, selectedQuarter?.id, selectedMonth?.id, selectedWeek?.id, selectedDay, doesTaskBelongToDayNode]);

  const weekCardProgressById = useMemo(() => {
    const map = new Map();
    const weeks = selectedMonth?.weeks || [];
    if (!weeks.length) return map;

    weeks.forEach((week) => {
      const linkedTasks = spacesTasks.filter((task) => {
        return doesTaskBelongToWeekNode(task, week, {
          yearId: selectedYear?.id,
          quarterId: selectedQuarter?.id,
          monthId: selectedMonth?.id,
        });
      });
      const total = linkedTasks.length;
      const done = linkedTasks.filter((task) => String(task.status || '').toLowerCase() === 'done').length;
      map.set(String(week?.id || '').trim(), total ? Math.round((done / total) * 100) : 0);
    });

    return map;
  }, [selectedMonth?.weeks, selectedYear?.id, selectedQuarter?.id, selectedMonth?.id, spacesTasks, doesTaskBelongToWeekNode]);

  const hierarchyProgressById = useMemo(() => {
    const yearMap = new Map();
    const quarterMap = new Map();
    const monthMap = new Map();

    const percentFromTasksForWeekNode = (weekNode, context) => {
      const linkedTasks = spacesTasks.filter((task) => {
        return doesTaskBelongToWeekNode(task, weekNode, context);
      });
      const total = linkedTasks.length;
      const done = linkedTasks.filter((task) => String(task.status || '').toLowerCase() === 'done').length;
      return total ? Math.round((done / total) * 100) : 0;
    };

    const avg = (values) => {
      if (!values.length) return 0;
      const sum = values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
      return Math.round(sum / values.length);
    };

    (visions || []).forEach((yearNode) => {
      const quarterPercents = (yearNode?.quarters || []).map((quarterNode) => {
        const monthPercents = (quarterNode?.months || []).map((monthNode) => {
          const weekPercents = (monthNode?.weeks || []).map((weekNode) =>
            percentFromTasksForWeekNode(weekNode, {
              yearId: yearNode?.id,
              quarterId: quarterNode?.id,
              monthId: monthNode?.id,
            }),
          );
          const monthPercent = avg(weekPercents);
          monthMap.set(String(monthNode.id || '').trim(), monthPercent);
          return monthPercent;
        });
        const quarterPercent = avg(monthPercents);
        quarterMap.set(String(quarterNode.id || '').trim(), quarterPercent);
        return quarterPercent;
      });
      const yearPercent = avg(quarterPercents);
      yearMap.set(String(yearNode.id || '').trim(), yearPercent);
    });

    return { yearMap, quarterMap, monthMap };
  }, [visions, spacesTasks, doesTaskBelongToWeekNode]);

  const weekProgress = useMemo(() => {
    if (!selectedWeek?.days?.length || !selectedMonth?.timeline || !selectedQuarter?.timeline) {
      return { percent: 0, doneTasks: 0, totalTasks: 0 };
    }

    const tasksForThisWeek = spacesTasks.filter((task) => isTaskLinkedToSelectedWeek(task));
    const totalTasks = tasksForThisWeek.length;
    const doneTasks = tasksForThisWeek.filter((task) => String(task.status || '').toLowerCase() === 'done').length;
    const percent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    return { percent, doneTasks, totalTasks };
  }, [selectedWeek, selectedMonth?.timeline, selectedQuarter?.timeline, spacesTasks, isTaskLinkedToSelectedWeek]);

  const getDefaultTaskDraft = (day, week) => ({
    title: day?.text || '',
    description: `Created from Daily plan: ${week?.text || 'Weekly Goal'}`,
    assigneeId: me.empId || '',
    dueDate: '',
    priority: 'medium',
    status: 'todo',
  });

  const getTaskDraftForDay = (day, week = selectedWeek) => {
    const fallback = getDefaultTaskDraft(day, week);
    if (!day) return fallback;
    return {
      ...fallback,
      ...(taskDraftByDay[day.id] || {}),
    };
  };

  const updateSelectedDayTaskDraft = (patch) => {
    if (!selectedDay) return;
    setTaskDraftByDay((prev) => ({
      ...prev,
      [selectedDay.id]: {
        ...getDefaultTaskDraft(selectedDay, selectedWeek),
        ...(prev[selectedDay.id] || {}),
        ...patch,
      },
    }));
  };

  const closeTaskComposer = () => {
    setShowTaskComposer(false);
    setEditingTaskId('');
    setTaskError('');
  };

  const selectedTaskDraft = selectedDay ? getTaskDraftForDay(selectedDay, selectedWeek) : getDefaultTaskDraft(null, selectedWeek);
  const selectedTaskDocument = selectedDay ? taskDocumentByDay[selectedDay.id] || null : null;
  const editingTask = editingTaskId ? spacesTasks.find((task) => task.taskId === editingTaskId) || null : null;
  const viewingTask = viewingTaskId ? spacesTasks.find((task) => task.taskId === viewingTaskId) || null : null;
  const editingTaskDocumentUrl = String(editingTask?.documentUrl || '').trim();
  const editingTaskDocumentName = String(editingTask?.documentName || '').trim() || 'Current document';

  const syncDayCompletionFromTasks = async (day, tasksForDay) => {
    if (!day) return;
    const done = tasksForDay.length > 0 && tasksForDay.every((task) => String(task.status || '').toLowerCase() === 'done');
    if (!!day.completed === done) return;
    const nextGoal = {
      id: day.id,
      text: day.text || '',
      details: day.details || '',
      completed: done,
      level: 'day',
      parentId: day.parentId || '',
      timeline: day.timeline || '',
    };
    updateState((prev) => upsertGoalIntoState(prev, nextGoal));
    try {
      await persistGoal(nextGoal);
    } catch (error) {
      console.error(error);
    }
  };

  const createTaskForSelectedDay = async () => {
    if (!selectedDay || !selectedWeek) return;
    const draft = getTaskDraftForDay(selectedDay, selectedWeek);
    const taskDocumentFile = taskDocumentByDay[selectedDay.id] || null;
    const existingTask = editingTaskId ? spacesTasks.find((task) => task.taskId === editingTaskId) || null : null;
    const title = String(draft.title || selectedDay.text || '').trim();
    const assigneeId = String(draft.assigneeId || me.empId || '').trim();
    const dueDate = String(draft.dueDate || '').trim();
    const priority = String(draft.priority || 'medium').trim() || 'medium';
    const status = String(draft.status || 'todo').trim() || 'todo';
    const description = String(draft.description || `Created from Daily plan: ${selectedWeek.text || 'Weekly Goal'}`).trim();
    if (!title) {
      setTaskError('Task title is required.');
      return;
    }
    if (!assigneeId) {
      setTaskError('Assignee is required.');
      return;
    }
    setSavingTaskDayId(selectedDay.id);
    setTaskError('');
    try {
      let uploadedDocument = existingTask
        ? {
            documentUrl: String(existingTask.documentUrl || ''),
            documentName: String(existingTask.documentName || ''),
            documentMimeType: String(existingTask.documentMimeType || ''),
          }
        : null;

      if (taskDocumentFile) {
        setUploadingTaskDocument(true);
        const formData = new FormData();
        formData.append('file', taskDocumentFile);
        const session = getStoredAuthSession();
        const token = typeof session?.token === 'string' ? session.token : '';
        const uploadRes = await fetch(`${API_BASE}/spaces/tasks/upload-document`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });
        const uploaded = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          throw new Error(uploaded?.message || 'Failed to upload task document');
        }
        uploadedDocument = {
          documentUrl: String(uploaded?.documentUrl || ''),
          documentName: String(uploaded?.documentName || taskDocumentFile.name || ''),
          documentMimeType: String(uploaded?.documentMimeType || taskDocumentFile.type || ''),
        };
      }

      const requestBody = {
        title,
        assigneeId,
        dueDate,
        priority,
        status,
        description,
        documentUrl: uploadedDocument?.documentUrl || '',
        documentName: uploadedDocument?.documentName || '',
        documentMimeType: uploadedDocument?.documentMimeType || '',
        customFields: {
          yearlyGoalId: selectedYear?.id || '',
          quarterlyGoalId: selectedQuarter?.id || '',
          monthlyGoalId: selectedMonth?.id || '',
          dailyGoalId: selectedDay.id,
          weeklyGoalId: selectedWeek.id,
          weekChainKey: buildVisionChainKey({
            yearId: selectedYear?.id,
            quarterId: selectedQuarter?.id,
            monthId: selectedMonth?.id,
            weekId: selectedWeek?.id,
          }),
          dayChainKey: buildVisionChainKey({
            yearId: selectedYear?.id,
            quarterId: selectedQuarter?.id,
            monthId: selectedMonth?.id,
            weekId: selectedWeek?.id,
            dayId: selectedDay?.id,
          }),
          dailyGoalText: selectedDay.text || '',
        },
      };

      const res = await fetch(existingTask ? `${API_BASE}/spaces/tasks/${existingTask.taskId}` : `${API_BASE}/spaces/tasks`, {
        method: existingTask ? 'PATCH' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.message || (existingTask ? 'Failed to update task' : 'Failed to create task'));
      }
      const nextTasks = existingTask
        ? spacesTasks.map((item) =>
            item.taskId === existingTask.taskId
              ? {
                  ...item,
                  ...payload,
                  taskId: payload?.taskId || item.taskId,
                  customFields: payload?.customFields || item.customFields,
                }
              : item,
          )
        : [payload, ...spacesTasks];
      setSpacesTasks(nextTasks);
      const tasksForDay = nextTasks.filter((item) =>
        doesTaskBelongToDayNode(item, selectedDay, {
          yearId: selectedYear?.id,
          quarterId: selectedQuarter?.id,
          monthId: selectedMonth?.id,
          weekId: selectedWeek?.id,
        }),
      );
      await syncDayCompletionFromTasks(selectedDay, tasksForDay);
      closeTaskComposer();
      setTaskDraftByDay((prev) => ({
        ...prev,
        [selectedDay.id]: getDefaultTaskDraft(selectedDay, selectedWeek),
      }));
      setTaskDocumentByDay((prev) => ({
        ...prev,
        [selectedDay.id]: null,
      }));
      setOpenTaskMenuId('');
    } catch (error) {
      setTaskError(error?.message || (existingTask ? 'Failed to update task' : 'Failed to create task'));
    } finally {
      setUploadingTaskDocument(false);
      setSavingTaskDayId('');
    }
  };

  const updateTaskStatus = async (task, checked) => {
    if (!task?.taskId || !selectedDay) return;
    const nextStatus = checked ? 'done' : 'todo';
    setTaskError('');
    const previous = spacesTasks;
    const optimistic = previous.map((item) => (item.taskId === task.taskId ? { ...item, status: nextStatus } : item));
    setSpacesTasks(optimistic);
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${task.taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || 'Failed to update task status');
      }
      const updated = await res.json().catch(() => ({}));
      const nextTasks = optimistic.map((item) => {
        if (item.taskId !== task.taskId) return item;
        return {
          ...item,
          ...updated,
          // Preserve linking fields if patch response omits them.
          taskId: updated?.taskId || item.taskId,
          customFields: updated?.customFields || item.customFields,
        };
      });
      setSpacesTasks(nextTasks);
      const nextDayTasks = nextTasks.filter((item) => {
        return doesTaskBelongToDayNode(item, selectedDay, {
          yearId: selectedYear?.id,
          quarterId: selectedQuarter?.id,
          monthId: selectedMonth?.id,
          weekId: selectedWeek?.id,
        });
      });
      await syncDayCompletionFromTasks(selectedDay, nextDayTasks);
    } catch (error) {
      setSpacesTasks(previous);
      setTaskError(error?.message || 'Failed to update task status');
    }
  };

  const deleteTaskFromDay = async (task) => {
    if (!isAdmin || !task?.taskId || !selectedDay) return;
    setDeletingTaskId(task.taskId);
    setOpenTaskMenuId('');
    setTaskError('');
    const previous = spacesTasks;
    const optimistic = previous.filter((item) => item.taskId !== task.taskId);
    setSpacesTasks(optimistic);
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${task.taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || 'Failed to delete task');
      }
      const nextDayTasks = optimistic.filter((item) => {
        return doesTaskBelongToDayNode(item, selectedDay, {
          yearId: selectedYear?.id,
          quarterId: selectedQuarter?.id,
          monthId: selectedMonth?.id,
          weekId: selectedWeek?.id,
        });
      });
      await syncDayCompletionFromTasks(selectedDay, nextDayTasks);
    } catch (error) {
      setSpacesTasks(previous);
      setTaskError(error?.message || 'Failed to delete task');
    } finally {
      setDeletingTaskId('');
    }
  };

  const openTaskEditor = (task) => {
    if (!selectedDay || !task?.taskId) return;
    setTaskDraftByDay((prev) => ({
      ...prev,
      [selectedDay.id]: {
        title: String(task.title || selectedDay.text || ''),
        description: String(task.description || `Created from Daily plan: ${selectedWeek?.text || 'Weekly Goal'}`),
        assigneeId: String(task.assigneeId || me.empId || ''),
        dueDate: String(task.dueDate || ''),
        priority: String(task.priority || 'medium'),
        status: String(task.status || 'todo'),
      },
    }));
    setTaskDocumentByDay((prev) => ({
      ...prev,
      [selectedDay.id]: null,
    }));
    setEditingTaskId(task.taskId);
    setOpenTaskMenuId('');
    setTaskError('');
    setShowTaskComposer(true);
  };

  const openTaskViewer = (task) => {
    if (!task?.taskId) return;
    setViewingTaskId(task.taskId);
    setOpenTaskMenuId('');
  };

  const breadcrumbItems = [
    { label: 'Vision', to: '/yearly' },
    selectedYear ? { label: selectedYear.text || 'Yearly vision', to: buildVisionStageHref('quarter', { yearId: selectedYear.id }) } : null,
    stage === 'month' || stage === 'week' || stage === 'day'
      ? selectedQuarter
        ? {
            label: selectedQuarter.timeline || 'Quarter',
            to: buildVisionStageHref('month', { yearId: selectedYear?.id, quarterId: selectedQuarter.id }),
          }
        : null
      : null,
    stage === 'week' || stage === 'day'
      ? selectedMonth
        ? {
            label: selectedMonthDisplayLabel,
            to: buildVisionStageHref('week', {
              yearId: selectedYear?.id,
              quarterId: selectedQuarter?.id,
              monthId: selectedMonth.id,
            }),
          }
        : null
      : null,
    stage === 'day'
      ? selectedWeek
        ? { label: selectedWeekDisplayLabel }
        : null
      : null,
  ].filter(Boolean);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`metric-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-16" />
                <Skeleton className="mt-3 h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
        <PageHeaderSkeleton />
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`card-${index}`} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="mt-5 h-8 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
              <SkeletonBlock className="mt-6 h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <style>{VISION_PROGRESS_SHIMMER_STYLE}</style>
      <section className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-3 shadow-[0_16px_36px_rgba(15,23,42,0.07)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-[0_8px_16px_rgba(239,68,68,0.10)] ring-1 ${
                isDailyStage
                  ? 'bg-slate-900 text-brand-red ring-slate-900/10'
                  : 'bg-gradient-to-br from-red-50 via-white to-red-100 text-brand-red ring-red-100'
              }`}
            >
              {isDailyStage ? <Sun size={16} /> : <Sparkles size={16} />}
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-brand-red">
                {heroBadgeLabel}
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {heroTitle}
              </h1>
              {heroDescription ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{heroDescription}</p> : null}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {stage === 'year' && isAdmin ? (
              <SmallActionButton variant="primary" onClick={() => setShowVisionComposer((prev) => !prev)} disabled={state.yearlyGoals.length >= 5}>
                <Plus size={14} />
                Add Vision
              </SmallActionButton>
            ) : null}
            <div className="min-w-[170px] rounded-[1.2rem] border border-slate-200 bg-white px-3.5 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              {isDailyStage ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Week completion</div>
                      <div className="mt-1 text-2xl font-semibold leading-none text-slate-900">{weekProgress.percent}%</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-center shadow-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Days</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">{selectedWeek.days.length}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar progress={weekProgress.percent} tone="emerald" loading={progressLoading} />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{heroStatLabel}</div>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <div className="text-2xl font-semibold leading-none text-slate-900">{heroStatValue}</div>
                    <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-brand-red">
                      {heroStatBadge}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {showVisionComposer && isAdmin ? (
          <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">New yearly vision</label>
                <textarea
                  value={newVisionTitle}
                  onChange={(event) => setNewVisionTitle(event.target.value)}
                  rows={2}
                  placeholder="Example: Achieve category leadership in AI operations"
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-red/30"
                />
                <textarea
                  value={newVisionDetails}
                  onChange={(event) => setNewVisionDetails(event.target.value)}
                  rows={2}
                  placeholder="Add a short strategic explanation or outcome note"
                  className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 outline-none transition focus:border-brand-red/30"
                />
              </div>
              <div className="flex gap-2">
                <SmallActionButton variant="primary" onClick={addVision} disabled={!newVisionTitle.trim() || state.yearlyGoals.length >= 5}>
                  Save Vision
                </SmallActionButton>
                <SmallActionButton
                  onClick={() => {
                    setShowVisionComposer(false);
                    setNewVisionTitle('');
                    setNewVisionDetails('');
                  }}
                >
                  Cancel
                </SmallActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {stage === 'year' ? (
        visions.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visions.map((vision) => (
              <div key={vision.id} className="space-y-3">
                <VisionHierarchyCard
                  item={vision}
                  stageKey="year"
                  stageLabel="Yearly"
                  badge={`Vision ${String(vision.visionIndex).padStart(2, '0')}`}
                  title={vision.text || 'Untitled yearly vision'}
                  details={vision.details}
                  progress={hierarchyProgressById.yearMap.get(String(vision.id || '').trim()) ?? vision.progress}
                  footerLabel="Open vision"
                  linkTo={buildVisionStageHref('quarter', { yearId: vision.id })}
                  dateRange={getYearlyDateRange()}
                  infoRows={[
                    { label: 'Execution structure', value: '4 quarters' },
                    { label: 'Monthly depth', value: '12 months' },
                    { label: 'Weekly capacity', value: `${getYearWeekCount()} weeks` },
                  ]}
                  onOpen={() => navigate(buildVisionStageHref('quarter', { yearId: vision.id }))}
                  onEdit={() => openEditor(vision)}
                  onDelete={() => deleteHierarchyItem(vision)}
                  isAdmin={isAdmin}
                  isProgressLoading={progressLoading}
                  menuOpen={openCardMenuId === vision.id}
                  onMenuToggle={() => setOpenCardMenuId((current) => (current === vision.id ? '' : vision.id))}
                  onMenuClose={() => setOpenCardMenuId('')}
                  isCurrentPeriod={isCurrentPlanningYear}
                  currentLabel="Current year"
                />
                {editingId === vision.id ? (
                  <EditorPanel
                    title="Edit yearly vision"
                    goal={vision}
                    draft={draftById[vision.id]}
                    setDraft={(updates) => setDraft(vision, updates)}
                    onSave={() => saveNode(vision)}
                    onCancel={closeEditor}
                    placeholder="Define the yearly strategic vision"
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-brand-red">
              <Target size={24} />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">No yearly visions yet</h3>
            <p className="mt-2 text-sm text-slate-500">Create a yearly vision first, then drill into quarters, months, weeks, and daily execution.</p>
          </div>
        )
      ) : null}

      {stage === 'quarter' ? (
        selectedYear ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {selectedYear.quarters.map((quarter) => (
              <div key={quarter.id} className="space-y-3">
                <VisionHierarchyCard
                  item={quarter}
                  stageKey="quarter"
                  stageLabel="Quarterly"
                  badge={quarter.timeline}
                  title={quarter.text || `${quarter.timeline} outcome`}
                  details={quarter.details}
                  progress={hierarchyProgressById.quarterMap.get(String(quarter.id || '').trim()) ?? quarter.progress}
                  footerLabel="Open quarter"
                  linkTo={buildVisionStageHref('month', { yearId: selectedYear.id, quarterId: quarter.id })}
                  dateRange={getQuarterlyDateRange(quarter.timeline)}
                  infoRows={[
                    { label: 'Monthly depth', value: '3 months' },
                    { label: 'Weekly capacity', value: `${getQuarterWeekCount(quarter.timeline)} weeks` },
                    { label: 'Daily runway', value: `${getQuarterDayCount(quarter.timeline)} days` },
                  ]}
                  onOpen={() =>
                    navigate(
                      buildVisionStageHref('month', {
                        yearId: selectedYear.id,
                        quarterId: quarter.id,
                      }),
                    )
                  }
                  onEdit={() => openEditor(quarter)}
                  onDelete={() => deleteHierarchyItem(quarter)}
                  isAdmin={isAdmin}
                  isProgressLoading={progressLoading}
                  menuOpen={openCardMenuId === quarter.id}
                  onMenuToggle={() => setOpenCardMenuId((current) => (current === quarter.id ? '' : quarter.id))}
                  onMenuClose={() => setOpenCardMenuId('')}
                  isCurrentPeriod={isCurrentPlanningYear && quarter.timeline === currentQuarterTimeline}
                  currentLabel="Current quarter"
                />
                {editingId === quarter.id ? (
                  <EditorPanel
                    title={`Edit ${quarter.timeline}`}
                    goal={quarter}
                    draft={draftById[quarter.id]}
                    setDraft={(updates) => setDraft(quarter, updates)}
                    onSave={() => saveNode(quarter)}
                    onCancel={closeEditor}
                    placeholder={`Define the outcome for ${quarter.timeline}`}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm text-slate-500">
            Choose a yearly vision first to open its quarterly cards.
          </div>
        )
      ) : null}

      {stage === 'month' ? (
        selectedQuarter ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {selectedQuarter.months.map((month) => (
              <div key={month.id} className="space-y-3">
                <VisionHierarchyCard
                  item={month}
                  stageKey="month"
                  stageLabel="Monthly"
                  badge={`Month ${month.calendarMonthNumber || getCalendarMonthNumber(month.timeline, selectedQuarter.timeline)}`}
                  title={month.text || `Month ${month.calendarMonthNumber || getCalendarMonthNumber(month.timeline, selectedQuarter.timeline)} milestone`}
                  details={month.details}
                  progress={hierarchyProgressById.monthMap.get(String(month.id || '').trim()) ?? month.progress}
                  footerLabel="Open month"
                  linkTo={buildVisionStageHref('week', {
                    yearId: selectedYear?.id,
                    quarterId: selectedQuarter.id,
                    monthId: month.id,
                  })}
                  dateRange={getMonthlyDate(month.timeline, selectedQuarter.timeline)}
                  infoRows={[
                    { label: 'Weekly capacity', value: `${getWeeksInMonth(month.timeline, selectedQuarter.timeline)} weeks` },
                    { label: 'Daily actions', value: `${getDaysInMonth(month.timeline, selectedQuarter.timeline)} days` },
                    { label: 'Quarter context', value: selectedQuarter.timeline || 'Quarter' },
                  ]}
                  onOpen={() =>
                    navigate(
                      buildVisionStageHref('week', {
                        yearId: selectedYear?.id,
                        quarterId: selectedQuarter.id,
                        monthId: month.id,
                      }),
                    )
                  }
                  onEdit={() => openEditor(month)}
                  onDelete={() => deleteHierarchyItem(month)}
                  isAdmin={isAdmin}
                  isProgressLoading={progressLoading}
                  menuOpen={openCardMenuId === month.id}
                  onMenuToggle={() => setOpenCardMenuId((current) => (current === month.id ? '' : month.id))}
                  onMenuClose={() => setOpenCardMenuId('')}
                  isCurrentPeriod={
                    isCurrentPlanningYear &&
                    selectedQuarter?.timeline === currentQuarterTimeline &&
                    month.timeline === currentMonthTimeline
                  }
                  currentLabel="Current month"
                />
                {editingId === month.id ? (
                  <EditorPanel
                    title={`Edit Month ${month.calendarMonthNumber || getCalendarMonthNumber(month.timeline, selectedQuarter.timeline)}`}
                    goal={month}
                    draft={draftById[month.id]}
                    setDraft={(updates) => setDraft(month, updates)}
                    onSave={() => saveNode(month)}
                    onCancel={closeEditor}
                    placeholder="Define the monthly milestone"
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm text-slate-500">
            Choose a quarter first to open its monthly cards.
          </div>
        )
      ) : null}

      {stage === 'week' ? (
        selectedMonth ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {selectedMonth.weeks.map((week) => (
              <div key={week.id} className="space-y-3">
                <VisionHierarchyCard
                  item={week}
                  stageKey="week"
                  stageLabel="Weekly"
                  badge={`Week ${week.yearWeekNumber || week.slotIndex}`}
                  title={week.text || `Week ${week.yearWeekNumber || week.slotIndex} commitment`}
                  details={week.details}
                  progress={weekCardProgressById.get(String(week.id || '').trim()) ?? week.progress}
                  footerLabel="Open week"
                  linkTo={buildVisionStageHref('day', {
                    yearId: selectedYear?.id,
                    quarterId: selectedQuarter?.id,
                    monthId: selectedMonth.id,
                    weekId: week.id,
                    weekSlot: week.slotIndex,
                  })}
                  dateRange={getWeeklyDateRange(week.slotIndex, selectedMonth.timeline, selectedQuarter.timeline)}
                  infoRows={[
                    { label: 'Daily actions', value: `${week.days.length} days` },
                    { label: 'Month context', value: selectedMonthDisplayLabel },
                    { label: 'Quarter context', value: selectedQuarter?.timeline || 'Quarter' },
                  ]}
                  onOpen={() =>
                    navigate(
                      buildVisionStageHref('day', {
                        yearId: selectedYear?.id,
                        quarterId: selectedQuarter?.id,
                        monthId: selectedMonth.id,
                        weekId: week.id,
                        weekSlot: week.slotIndex,
                      }),
                    )
                  }
                  onEdit={() => openEditor(week)}
                  onDelete={() => deleteHierarchyItem(week)}
                  isAdmin={isAdmin}
                  isProgressLoading={progressLoading}
                  menuOpen={openCardMenuId === week.id}
                  onMenuToggle={() => setOpenCardMenuId((current) => (current === week.id ? '' : week.id))}
                  onMenuClose={() => setOpenCardMenuId('')}
                  isCurrentPeriod={
                    isCurrentPlanningYear &&
                    selectedQuarter?.timeline === currentQuarterTimeline &&
                    selectedMonth?.timeline === currentMonthTimeline &&
                    week.slotIndex === currentWeekSlotIndex
                  }
                  currentLabel="This week"
                />
                {editingId === week.id ? (
                  <EditorPanel
                    title={`Edit Week ${week.yearWeekNumber || week.slotIndex}`}
                    goal={week}
                    draft={draftById[week.id]}
                    setDraft={(updates) => setDraft(week, updates)}
                    onSave={() => saveNode(week)}
                    onCancel={closeEditor}
                    placeholder="Define the weekly task or commitment"
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm text-slate-500">
            Choose a month first to open its weekly cards.
          </div>
        )
      ) : null}

      {stage === 'day' ? (
        selectedWeek ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-slate-900">Task Assignment</p>
                  <Link
                    to="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (!selectedDay) return;
                      setTaskDraftByDay((prev) => ({
                        ...prev,
                        [selectedDay.id]: prev[selectedDay.id] || {
                          title: selectedDay.text || '',
                          description: `Created from Daily plan: ${selectedWeek.text || 'Weekly Goal'}`,
                          assigneeId: me.empId || '',
                          dueDate: '',
                          priority: 'medium',
                          status: 'todo',
                        },
                      }));
                      setEditingTaskId('');
                      setOpenTaskMenuId('');
                      setTaskError('');
                      setShowTaskComposer(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                  >
                    <Plus size={14} />
                    Add Task
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {selectedWeek.days.map((day, index) => {
                    const weekPlan = getWeekPlan(selectedWeek.slotIndex, selectedMonth.timeline, selectedQuarter.timeline);
                    const dayDate = weekPlan?.days?.[index] || null;
                    const dateLabel = getDailyDate(index + 1, selectedWeek.slotIndex, selectedMonth.timeline, selectedQuarter.timeline);
                    const [weekday, rest] = String(dateLabel).split(',');
                    const isActive = (activeDayId || selectedWeek.days[0]?.id) === day.id;
                    const isToday = !!dayDate && isSameCalendarDate(dayDate, today);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => setActiveDayId(day.id)}
                        className={`rounded-md border px-4 py-2 text-left transition ${
                          isActive
                            ? 'border-brand-red bg-red-50 text-brand-red shadow-sm ring-1 ring-red-100'
                            : isToday
                              ? 'border-red-200 bg-gradient-to-br from-red-50 to-amber-50 text-brand-red shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-wide">{(weekday || '').trim()}</div>
                        <div className="text-xs mt-0.5">{(rest || '').trim()}</div>
                        {isToday ? <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em]">Today</div> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {selectedDay ? (
            <div className="grid max-w-6xl gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tasks on selected date</div>
                  {taskError ? (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
                      {taskError}
                    </div>
                  ) : null}
                  <div className="mt-4 max-w-[980px] space-y-3">
                    {selectedDayTasks.length ? (
                      selectedDayTasks.map((task) => {
                        const status = String(task.status || 'todo').toLowerCase();
                        const priority = String(task.priority || 'medium').toLowerCase();
                        const assignee = assignableEmployees.find((emp) => emp.empId === task.assigneeId);
                        const descriptionText = String(task.description || '').trim();
                        const documentUrl = String(task.documentUrl || '').trim();
                        const documentName = String(task.documentName || '').trim() || 'View document';
                        const createdByLabel = String(task.createdByName || task.createdByEmpId || task.createdBy || '').trim() || '—';
                        const statusLabel =
                          status === 'todo'
                            ? 'To Do'
                            : status === 'doing'
                              ? 'Doing'
                              : status === 'review'
                                ? 'Review'
                                : status === 'blocked'
                                  ? 'Blocked'
                                  : status === 'done'
                                    ? 'Done'
                                    : String(task.status || 'To Do');
                        const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
                        const statusPillClass =
                          status === 'done'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : status === 'blocked'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : status === 'review'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : status === 'doing'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200';
                        const priorityPillClass =
                          priority === 'high'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : priority === 'low'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200';
                        return (
                          <div key={task.taskId} className="mr-auto w-full max-w-[620px] rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:w-fit sm:min-w-[520px]">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => updateTaskStatus(task, status !== 'done')}
                                  className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                                  aria-label={status === 'done' ? 'Mark as not done' : 'Mark as done'}
                                >
                                  {status === 'done' ? (
                                    <CheckCircle2 size={18} className="text-emerald-600" />
                                  ) : (
                                    <Circle size={18} className="text-slate-400" />
                                  )}
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className={`text-sm font-semibold ${status === 'done' ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>
                                        {task.title || 'Untitled task'}
                                      </div>
                                      {descriptionText ? (
                                        <p className="mt-1 overflow-hidden text-xs leading-5 text-slate-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                                          {descriptionText}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass}`}>
                                        {statusLabel}
                                      </span>
                                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityPillClass}`}>
                                        {priorityLabel}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {isAdmin ? (
                                <div className="relative shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setOpenTaskMenuId((current) => (current === task.taskId ? '' : task.taskId))}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                                    aria-label="Task actions"
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                  {openTaskMenuId === task.taskId ? (
                                    <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
                                      <button
                                        type="button"
                                        onClick={() => openTaskEditor(task)}
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                      >
                                        <Pencil size={14} />
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteTaskFromDay(task)}
                                        disabled={deletingTaskId === task.taskId}
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        <Trash2 size={14} />
                                        {deletingTaskId === task.taskId ? 'Deleting...' : 'Delete'}
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <div className="mt-4 flex items-end justify-between gap-4">
                              <div className="grid max-w-[360px] grid-cols-1 gap-2.5 text-xs text-slate-500">
                                <div className="flex items-start gap-2">
                                  <span className="min-w-[74px] font-semibold text-slate-600">Assignee:</span>
                                  <span>{assignee?.empName || task.assigneeId || 'Unassigned'}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="min-w-[74px] font-semibold text-slate-600">Due:</span>
                                  <span>{String(task.dueDate || '').trim() || 'Not set'}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="min-w-[74px] font-semibold text-slate-600">Created by:</span>
                                  <span>{createdByLabel}</span>
                                </div>
                              </div>
                              <div className="flex min-w-[160px] shrink-0 flex-col items-end gap-3">
                                {documentUrl ? (
                                  <a
                                    href={documentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                                  >
                                    <Paperclip size={14} className="shrink-0 text-slate-500" />
                                    <span className="max-w-[180px] truncate">{documentName}</span>
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => openTaskViewer(task)}
                                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                >
                                  <Eye size={14} />
                                 
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-slate-500">No tasks for this date yet. Click Add Task to create one.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
            {showTaskComposer && selectedDay ? (
              <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/35 p-4">
                <div className="w-full max-w-[56rem] rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl md:p-5">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <p className="text-[1.75rem] font-semibold leading-none text-slate-900">{editingTask ? 'Edit task' : 'Add task'}</p>
                      <p className="text-[13px] text-slate-500">
                        {getDailyDate(selectedDayIndex + 1, selectedWeek.slotIndex, selectedMonth.timeline, selectedQuarter.timeline)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeTaskComposer}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-4 space-y-3.5">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Title</label>
                      <input
                        type="text"
                        value={selectedTaskDraft.title}
                        onChange={(event) => updateSelectedDayTaskDraft({ title: event.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] text-slate-700 outline-none shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
                        placeholder="Task title"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Description</label>
                      <textarea
                        value={selectedTaskDraft.description}
                        onChange={(event) => updateSelectedDayTaskDraft({ description: event.target.value })}
                        rows={2}
                        className="w-full min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
                        placeholder="Add task description..."
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Assignee</label>
                        <ThemedSelect
                          value={selectedTaskDraft.assigneeId}
                          onChange={(value) => updateSelectedDayTaskDraft({ assigneeId: value })}
                          options={taskAssigneeOptions}
                          placeholder="Select assignee"
                          compact={true}
                          fullWidthCompact={true}
                          denseMenu={true}
                          forceOpenDown={true}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Due date</label>
                        <ThemedDatePicker
                          value={selectedTaskDraft.dueDate}
                          onChange={(value) => updateSelectedDayTaskDraft({ dueDate: value })}
                          compact={true}
                          fullWidthCompact={true}
                          forceOpenDown={true}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Priority</label>
                        <ThemedSelect
                          value={selectedTaskDraft.priority}
                          onChange={(value) => updateSelectedDayTaskDraft({ priority: value })}
                          options={taskPriorityOptions}
                          compact={true}
                          fullWidthCompact={true}
                          denseMenu={true}
                          forceOpenDown={true}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Status</label>
                        <ThemedSelect
                          value={selectedTaskDraft.status}
                          onChange={(value) => updateSelectedDayTaskDraft({ status: value })}
                          options={taskStatusOptions}
                          compact={true}
                          fullWidthCompact={true}
                          denseMenu={true}
                          forceOpenDown={true}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Document</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                        onChange={(event) =>
                          setTaskDocumentByDay((prev) => ({
                            ...prev,
                            [selectedDay.id]: event.target.files?.[0] || null,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1 file:text-[12px] file:font-semibold file:text-brand-red"
                      />
                      {selectedTaskDocument ? (
                        <p className="mt-1 text-[11px] text-slate-500 truncate">{selectedTaskDocument.name}</p>
                      ) : editingTaskDocumentUrl ? (
                        <a
                          href={editingTaskDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[11px] font-medium text-slate-500 transition hover:text-slate-900"
                        >
                          <Paperclip size={12} />
                          <span className="truncate">{editingTaskDocumentName}</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={closeTaskComposer}
                      className="rounded-full border border-slate-200 px-5 py-2 text-[14px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={createTaskForSelectedDay}
                      disabled={savingTaskDayId === selectedDay.id || uploadingTaskDocument || !selectedTaskDraft.title.trim()}
                      className="rounded-full bg-brand-red px-6 py-2 text-[14px] font-semibold text-white transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploadingTaskDocument ? 'Uploading...' : savingTaskDayId === selectedDay.id ? 'Saving...' : editingTask ? 'Save Changes' : 'Save Task'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {viewingTask ? (
              <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/35 p-4">
                <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <p className="text-[1.65rem] font-semibold leading-none text-slate-900">{viewingTask.title || 'Untitled task'}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          {String(viewingTask.status || 'todo').toLowerCase() === 'todo'
                            ? 'To Do'
                            : String(viewingTask.status || 'todo').toLowerCase() === 'doing'
                              ? 'Doing'
                              : String(viewingTask.status || 'todo').toLowerCase() === 'review'
                                ? 'Review'
                                : String(viewingTask.status || 'todo').toLowerCase() === 'blocked'
                                  ? 'Blocked'
                                  : String(viewingTask.status || 'todo').toLowerCase() === 'done'
                                    ? 'Done'
                                    : String(viewingTask.status || 'To Do')}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          {String(viewingTask.priority || 'medium').charAt(0).toUpperCase() + String(viewingTask.priority || 'medium').slice(1)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingTaskId('')}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Description</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {String(viewingTask.description || '').trim() || 'No description added for this task.'}
                      </p>
                    </div>
                    <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Assignee</span>
                        <p className="mt-1 font-medium text-slate-900">
                          {assignableEmployees.find((emp) => emp.empId === viewingTask.assigneeId)?.empName || viewingTask.assigneeId || 'Unassigned'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Due date</span>
                        <p className="mt-1 font-medium text-slate-900">{String(viewingTask.dueDate || '').trim() || 'Not set'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Created by</span>
                        <p className="mt-1 font-medium text-slate-900">
                          {String(viewingTask.createdByName || viewingTask.createdByEmpId || viewingTask.createdBy || '').trim() || '—'}
                        </p>
                      </div>
                    </div>
                    {String(viewingTask.documentUrl || '').trim() ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Document</div>
                        <a
                          href={String(viewingTask.documentUrl || '').trim()}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Paperclip size={15} className="shrink-0 text-slate-500" />
                          <span className="truncate">{String(viewingTask.documentName || '').trim() || 'View document'}</span>
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm text-slate-500">
            Choose a week first to open the daily execution board.
          </div>
        )
      ) : null}
    </div>
  );
};

export default Vision;
