import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { SpacesTask } from '../../types/spaces';
import SpacesMonthGoalAddForm, { CreateMonthGoalTaskPayload } from './SpacesMonthGoalAddForm';
import SpacesMonthGoalDetailDrawer from './SpacesMonthGoalDetailDrawer';
import { ThemedSelect } from './SpacesFormControls';
import {
  calendarMonthFromKey,
  CalendarMonth,
  compareCalendarMonthsAsc,
  getProgressPercent,
  getTaskDayLabel,
  getTaskMonthKey,
  getTaskWeekKey,
  getWeeksForMonth,
  isMonthGoalTask,
  isTaskCompleted,
} from './monthGoalsHelpers';
import {
  formatTopPriorityDateLabel,
  formatTopPriorityLabel,
  getTopPriorityCardClasses,
  getTopPriorityPillClasses,
} from '../../utils/spaces/topPriority';
import { openSpacesTaskDetail, prefetchSpacesTaskDetailView } from '../../utils/spaces/taskNavigation';

type SpacesMonthGoalsSectionProps = {
  tasks: SpacesTask[];
  patchTask: (taskId: string, updates: Record<string, unknown>) => Promise<unknown>;
  onCreateMonthGoalTask: (payload: CreateMonthGoalTaskPayload) => Promise<void>;
  navigate: (path: string, options?: { state?: unknown }) => void;
  taskPage?: number;
  taskFilterMode?: import('../../types/spaces').TaskFilterMode;
  taskStatusFilter?: import('../../types/spaces').TaskStatus | '';
  taskSearch?: string;
  canEditTask: (task: SpacesTask) => boolean;
  canValidateTask: (task: SpacesTask) => boolean;
  canPickSchedule: boolean;
  canPickAssignee: boolean;
  employeeId: string;
  allowedAssigneeIds: Set<string>;
  createAssigneeOptions: Array<{ value: string; label: string }>;
  employeesLoading: boolean;
  assignmentHint?: string;
  monthGoalSaving: boolean;
  monthGoalUploading: boolean;
  setError: (value: string | null) => void;
  canUseAssigneeFilter?: boolean;
  taskAssigneeFilterId?: string;
  setTaskAssigneeFilterId?: (value: string) => void;
  taskAssigneeFilterOptions?: Array<{ value: string; label: string }>;
};

type MonthWithWeeks = {
  month: CalendarMonth;
  tasks: SpacesTask[];
  weeks: Array<{
    week: ReturnType<typeof getWeeksForMonth>[number];
    label: string;
    tasks: SpacesTask[];
  }>;
};

const MONTH_BOARD_SHELL = 'bg-white p-0';
const WEEK_COLUMN_SHELL =
  'group flex h-[360px] min-h-[360px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white transition-colors hover:border-brand-red/25';

const isCompletedStatus = (status?: string) => {
  const s = String(status || '').trim().toLowerCase();
  return s === 'review' || s === 'done';
};

const formatWeekDateRange = (week: ReturnType<typeof getWeeksForMonth>[number]) => {
  const startLabel = week.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = week.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
};

const SpacesMonthGoalsSection: React.FC<SpacesMonthGoalsSectionProps> = ({
  tasks,
  patchTask,
  onCreateMonthGoalTask,
  navigate,
  taskPage,
  taskFilterMode = 'me',
  taskStatusFilter = '',
  taskSearch = '',
  canEditTask,
  canValidateTask,
  canPickSchedule,
  canPickAssignee,
  employeeId,
  allowedAssigneeIds,
  createAssigneeOptions,
  employeesLoading,
  assignmentHint,
  monthGoalSaving,
  monthGoalUploading,
  setError,
  canUseAssigneeFilter = false,
  taskAssigneeFilterId = '',
  setTaskAssigneeFilterId,
  taskAssigneeFilterOptions = [],
}) => {
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addFormMonthKey, setAddFormMonthKey] = useState<string | undefined>();
  const [addFormWeekKey, setAddFormWeekKey] = useState<string | undefined>();
  const [detailMonthKey, setDetailMonthKey] = useState<string | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState('');
  const [selectedWeekKey, setSelectedWeekKey] = useState('');
  const [weekNavDirection, setWeekNavDirection] = useState(1);

  const monthGoalTasks = useMemo(() => tasks.filter(isMonthGoalTask), [tasks]);

  const monthsWithWeeks = useMemo<MonthWithWeeks[]>(() => {
    const map = new Map<string, { month: CalendarMonth; tasks: SpacesTask[] }>();
    monthGoalTasks.forEach((task) => {
      const key = getTaskMonthKey(task);
      if (!key) return;
      const month = calendarMonthFromKey(key);
      if (!month) return;
      const row = map.get(key) || { month, tasks: [] };
      row.tasks.push(task);
      map.set(key, row);
    });

    return Array.from(map.values())
      .sort((a, b) => compareCalendarMonthsAsc(a.month, b.month))
      .map(({ month, tasks: monthTasks }) => {
        const weeks = getWeeksForMonth(month)
          .map((week) => ({
            week,
            label: week.label,
            tasks: monthTasks
              .filter((t) => getTaskWeekKey(t) === week.key)
              .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))),
          }))
          .filter((entry) => entry.tasks.length > 0)
          .sort((a, b) => a.week.weekIndex - b.week.weekIndex);
        return { month, tasks: monthTasks, weeks };
      });
  }, [monthGoalTasks]);

  const detailMonthEntry = useMemo(
    () => monthsWithWeeks.find((entry) => entry.month.key === detailMonthKey) || null,
    [monthsWithWeeks, detailMonthKey],
  );

  const monthSelectorOptions = useMemo(
    () =>
      monthsWithWeeks.map((entry) => ({
        value: entry.month.key,
        label: `${entry.month.label} ${entry.month.yearLabel}`,
      })),
    [monthsWithWeeks],
  );

  const selectedMonthEntry = useMemo(
    () => monthsWithWeeks.find((entry) => entry.month.key === selectedMonthKey) || null,
    [monthsWithWeeks, selectedMonthKey],
  );

  useEffect(() => {
    if (!monthSelectorOptions.length) {
      if (selectedMonthKey) setSelectedMonthKey('');
      return;
    }
    if (monthSelectorOptions.some((option) => option.value === selectedMonthKey)) return;
    setSelectedMonthKey(monthSelectorOptions[0].value);
  }, [monthSelectorOptions, selectedMonthKey]);

  useEffect(() => {
    if (!selectedMonthEntry) {
      setSelectedWeekKey('');
      return;
    }
    const firstWeekKey = getWeeksForMonth(selectedMonthEntry.month)[0]?.key || '';
    setSelectedWeekKey(firstWeekKey);
    setWeekNavDirection(1);
  }, [selectedMonthEntry?.month.key]);

  const canChangeStatus = (task: SpacesTask) => canEditTask(task) || canValidateTask(task);

  const openAddFormForMonth = (monthKey?: string, weekKey?: string) => {
    setError(null);
    setAddFormMonthKey(monthKey);
    setAddFormWeekKey(weekKey);
    setAddFormOpen(true);
  };

  const monthProgressPercent = selectedMonthEntry ? getProgressPercent(selectedMonthEntry.tasks) : 0;

  const renderTaskRow = (task: SpacesTask, index: number) => {
    const dayLabel = getTaskDayLabel(task);
    const dateLabel = task.dueDate ? formatTopPriorityDateLabel(task.dueDate) : dayLabel || '-';

    return (
      <div
        key={task.taskId}
        role="button"
        tabIndex={0}
        onMouseEnter={() => prefetchSpacesTaskDetailView()}
        onClick={(event) => {
          event.stopPropagation();
          openSpacesTaskDetail(navigate, task, {
            page: taskPage,
            filterMode: taskFilterMode,
            statusFilter: taskStatusFilter,
            search: taskSearch,
          });
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          openSpacesTaskDetail(navigate, task, {
            page: taskPage,
            filterMode: taskFilterMode,
            statusFilter: taskStatusFilter,
            search: taskSearch,
          });
        }}
        className={`flex cursor-pointer items-start gap-2 rounded-2xl px-3 py-2 transition-colors ${getTopPriorityCardClasses(task, index)}`}
      >
        <input
          type="checkbox"
          checked={isCompletedStatus(task.status)}
          disabled={!canChangeStatus(task)}
          onClick={(event) => event.stopPropagation()}
          onChange={(e) => patchTask(task.taskId, { status: e.target.checked ? 'done' : 'todo' })}
          className={`mt-0.5 h-3 w-3 shrink-0 ${isCompletedStatus(task.status) ? 'accent-emerald-600' : ''} ${canChangeStatus(task) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
        />
        <div className="min-w-0 flex-1">
          <div
            className={`line-clamp-2 text-[12px] font-semibold leading-[1.1rem] ${isCompletedStatus(task.status) ? 'text-emerald-700 line-through decoration-2' : 'text-slate-800'}`}
          >
            {task.title || 'Untitled task'}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getTopPriorityPillClasses('priority', task.priority)}`}>
              {formatTopPriorityLabel(task.priority || 'medium')}
            </span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getTopPriorityPillClasses('status', task.status)}`}>
              {formatTopPriorityLabel(task.status || 'todo')}
            </span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getTopPriorityPillClasses('date', task.dueDate)}`}>
              {dateLabel}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderWeekSections = (entry: MonthWithWeeks, spacious = false) => {
    let taskIndex = 0;

    if (!entry.weeks.length) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[12px] text-slate-500">
          No tasks in this month yet.
        </div>
      );
    }

    return (
      <div className={spacious ? 'space-y-5' : 'space-y-3'}>
        {entry.weeks.map(({ week, label, tasks: weekTasks }) => (
          <section key={week.key} className={spacious ? 'rounded-2xl border border-slate-200 bg-slate-50/60 p-4' : ''}>
            <div
              className={`mb-1.5 font-semibold uppercase tracking-[0.12em] text-slate-500 ${
                spacious ? 'text-[12px]' : 'text-[11px]'
              }`}
            >
              {label || week.label}
            </div>
            <div className={spacious ? 'space-y-2' : 'space-y-1.5'}>
              {weekTasks.map((task) => {
                const row = renderTaskRow(task, taskIndex);
                taskIndex += 1;
                return row;
              })}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const renderWeekColumn = (
    weekEntry: MonthWithWeeks['weeks'][number],
    monthKey: string,
    highlightPercent?: number,
  ) => {
    const done = weekEntry.tasks.filter(isTaskCompleted).length;

    return (
      <article key={weekEntry.week.key} className={`${WEEK_COLUMN_SHELL} w-full`}>
        <div className="flex items-start justify-between gap-3 bg-slate-100 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <h5 className="text-[14px] font-semibold text-slate-900">{weekEntry.label}</h5>
              {typeof highlightPercent === 'number' ? (
                <span className="text-[11px] font-semibold text-brand-red">{highlightPercent}%</span>
              ) : null}
              <span className="text-[11px] font-medium text-slate-500">{formatWeekDateRange(weekEntry.week)}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => openAddFormForMonth(monthKey, weekEntry.week.key)}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-brand-red/30 bg-[#fff7f7] px-2.5 py-0.5 text-[10px] font-semibold text-brand-red transition hover:border-brand-red hover:bg-red-50"
            >
              <Plus size={12} />
              Add
            </button>
            {weekEntry.tasks.length ? (
              <span className="inline-flex h-7 items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {done}/{weekEntry.tasks.length}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className={
            weekEntry.tasks.length
              ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3.5 pr-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              : 'flex min-h-0 flex-1 items-center justify-center px-3.5 py-3.5'
          }
        >
          {weekEntry.tasks.length ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {weekEntry.tasks.map((task, index) => renderTaskRow(task, index))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAddFormForMonth(monthKey, weekEntry.week.key)}
              className="flex min-h-[168px] min-w-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-100/80 px-6 text-center text-[13px] font-medium text-slate-500 transition hover:border-brand-red/25 hover:bg-slate-50 hover:text-slate-700"
            >
              Add task for {weekEntry.label}
            </button>
          )}
        </div>
      </article>
    );
  };

  const renderMonthBoard = (entry: MonthWithWeeks) => {
    const { month, tasks: monthTasks } = entry;
    const pct = getProgressPercent(monthTasks);
    const weekColumns = getWeeksForMonth(month).map((week) => ({
      week,
      label: week.label,
      tasks: monthTasks
        .filter((task) => getTaskWeekKey(task) === week.key)
        .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))),
    }));
    const visibleWeekColumns = selectedWeekKey
      ? weekColumns.filter((weekEntry) => weekEntry.week.key === selectedWeekKey)
      : weekColumns;
    const activeWeekEntry = visibleWeekColumns[0] || weekColumns[0] || null;
    const activeWeekIndex = weekColumns.findIndex((weekEntry) => weekEntry.week.key === activeWeekEntry?.week.key);

    if (!activeWeekEntry) {
      return null;
    }

    return (
      <div className={`${MONTH_BOARD_SHELL} relative`}>
        <button
          type="button"
          onClick={() => {
            if (activeWeekIndex <= 0) return;
            setWeekNavDirection(-1);
            setSelectedWeekKey(weekColumns[activeWeekIndex - 1].week.key);
          }}
          disabled={activeWeekIndex <= 0}
          className="absolute left-0 top-1/2 z-10 inline-flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-red text-white shadow-[0_10px_30px_rgba(239,68,68,0.25)] transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous week"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (activeWeekIndex >= weekColumns.length - 1) return;
            setWeekNavDirection(1);
            setSelectedWeekKey(weekColumns[activeWeekIndex + 1].week.key);
          }}
          disabled={activeWeekIndex >= weekColumns.length - 1}
          className="absolute right-0 top-1/2 z-10 inline-flex h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-red text-white shadow-[0_10px_30px_rgba(239,68,68,0.25)] transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next week"
        >
          <ChevronRight size={18} />
        </button>
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeWeekEntry.week.key}
              initial={{ opacity: 0, x: weekNavDirection > 0 ? 56 : -56 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: weekNavDirection > 0 ? -56 : 56 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {renderWeekColumn(
                activeWeekEntry,
                month.key,
                activeWeekEntry.week.weekIndex === 1 ? pct : undefined,
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900">Month Goals</h4>
            {selectedMonthEntry ? (
              <span className="text-[11px] font-semibold text-brand-red">{monthProgressPercent}%</span>
            ) : null}
          </div>
          {canUseAssigneeFilter && setTaskAssigneeFilterId ? (
            <div className="w-full xl:max-w-[320px]">
              <ThemedSelect
                value={taskAssigneeFilterId}
                onChange={setTaskAssigneeFilterId}
                options={taskAssigneeFilterOptions}
                compact
                fullWidthCompact
              />
            </div>
          ) : null}
          {monthSelectorOptions.length ? (
            <div className="w-full xl:max-w-[240px]">
              <ThemedSelect
                value={selectedMonthKey}
                onChange={setSelectedMonthKey}
                options={monthSelectorOptions}
                placeholder="Select month"
                disabled={!monthSelectorOptions.length}
                compact
                fullWidthCompact
              />
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end xl:self-auto">
          <button
            type="button"
            onClick={() => {
              if (selectedMonthEntry) setDetailMonthKey(selectedMonthEntry.month.key);
            }}
            disabled={!selectedMonthEntry}
            className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => openAddFormForMonth(selectedMonthEntry?.month.key)}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-red/30 bg-[#fff7f7] px-3 py-1.5 text-[11px] font-semibold text-brand-red transition hover:border-brand-red hover:bg-red-50"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      <div className="mt-4">
        {selectedMonthEntry ? (
          <div className="w-full">
            {renderMonthBoard(selectedMonthEntry)}
          </div>
        ) : (
          <div
            className={`${MONTH_BOARD_SHELL} flex h-[360px] min-h-[360px] items-center justify-center rounded-[24px] border border-slate-200 bg-white p-6`}
          >
            <button
              type="button"
              onClick={() => openAddFormForMonth()}
              className="flex min-h-[160px] w-full max-w-[420px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-100 px-6 text-center text-[15px] font-medium text-slate-500 transition hover:border-brand-red/25 hover:bg-slate-50 hover:text-slate-700"
            >
              No month goals yet. Use Add to create a task.
            </button>
          </div>
        )}
      </div>

      <SpacesMonthGoalDetailDrawer
        open={Boolean(detailMonthEntry)}
        onClose={() => setDetailMonthKey(null)}
        title={
          detailMonthEntry
            ? `${detailMonthEntry.month.label} ${detailMonthEntry.month.yearLabel}`
            : ''
        }
        progressPercent={detailMonthEntry ? getProgressPercent(detailMonthEntry.tasks) : 0}
        doneCount={detailMonthEntry ? detailMonthEntry.tasks.filter(isTaskCompleted).length : 0}
        totalCount={detailMonthEntry?.tasks.length || 0}
        onAddTask={() => {
          if (!detailMonthEntry) return;
          openAddFormForMonth(detailMonthEntry.month.key);
        }}
      >
        {detailMonthEntry ? renderWeekSections(detailMonthEntry, true) : null}
      </SpacesMonthGoalDetailDrawer>

      <SpacesMonthGoalAddForm
        open={addFormOpen}
        onClose={() => setAddFormOpen(false)}
        onSubmit={onCreateMonthGoalTask}
        canPickSchedule={canPickSchedule}
        canPickAssignee={canPickAssignee}
        employeeId={employeeId}
        allowedAssigneeIds={allowedAssigneeIds}
        createAssigneeOptions={createAssigneeOptions}
        employeesLoading={employeesLoading}
        assignmentHint={assignmentHint}
        saving={monthGoalSaving}
        uploadingDocument={monthGoalUploading}
        initialMonthKey={addFormMonthKey}
        initialWeekKey={addFormWeekKey}
      />
    </div>
  );
};

export default SpacesMonthGoalsSection;
