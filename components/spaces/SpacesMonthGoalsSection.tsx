import React, { useMemo, useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import type { SpacesTask } from '../../views/spacesViewHelpers';
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

type SpacesMonthGoalsSectionProps = {
  tasks: SpacesTask[];
  patchTask: (taskId: string, updates: Record<string, unknown>) => Promise<unknown>;
  onCreateMonthGoalTask: (payload: CreateMonthGoalTaskPayload) => Promise<void>;
  navigate: (path: string) => void;
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

const MONTH_CARD_HEIGHT_CLASS = 'h-[280px]';
const MONTH_CARD_SHELL =
  'flex flex-col rounded-2xl border border-slate-200 bg-slate-50/40 p-4 transition-colors hover:border-brand-red/35 hover:bg-white';

const isCompletedStatus = (status?: string) => {
  const s = String(status || '').trim().toLowerCase();
  return s === 'review' || s === 'done';
};

const getTopPriorityCardClasses = (task: SpacesTask, index: number) => {
  if (isCompletedStatus(task.status)) {
    return 'border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100/70';
  }
  if (index % 2 === 0) {
    return 'border border-slate-200 border-l-[3px] border-l-brand-red bg-white hover:bg-[#f7faff]';
  }
  return 'border border-slate-300 border-l-[3px] border-l-slate-400 bg-white hover:bg-[#f7faff]';
};

const getTopPriorityPillClasses = (type: 'priority' | 'status' | 'date', value?: string) => {
  if (type === 'priority') {
    const p = String(value || 'medium').trim().toLowerCase();
    if (p === 'high') return 'bg-red-50 text-brand-red';
    if (p === 'low') return 'bg-sky-50 text-sky-700';
    return 'bg-amber-50 text-amber-700';
  }
  if (type === 'status') {
    const s = String(value || 'todo').trim().toLowerCase();
    if (s === 'doing') return 'bg-indigo-50 text-indigo-600';
    if (s === 'done' || s === 'review') return 'bg-emerald-50 text-emerald-700';
    if (s === 'blocked') return 'bg-rose-50 text-rose-600';
    return 'bg-slate-100 text-slate-500';
  }
  return 'bg-slate-50 text-slate-400';
};

const formatPillLabel = (value: string) =>
  String(value || '').trim().replace(/^./, (char: string) => char.toUpperCase());

const SpacesMonthGoalsSection: React.FC<SpacesMonthGoalsSectionProps> = ({
  tasks,
  patchTask,
  onCreateMonthGoalTask,
  navigate,
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
  const [detailMonthKey, setDetailMonthKey] = useState<string | null>(null);

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

  const totalTasks = monthGoalTasks.length;
  const completedTasks = monthGoalTasks.filter(isTaskCompleted).length;

  const canChangeStatus = (task: SpacesTask) => canEditTask(task) || canValidateTask(task);

  const openAddFormForMonth = (monthKey?: string) => {
    setError(null);
    setAddFormMonthKey(monthKey);
    setAddFormOpen(true);
  };

  const renderTaskRow = (task: SpacesTask, index: number) => {
    const dayLabel = getTaskDayLabel(task);
    const dateLabel = task.dueDate
      ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : dayLabel || '-';

    return (
      <div
        key={task.taskId}
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          navigate(`/spaces/task/${task.taskId}`);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          navigate(`/spaces/task/${task.taskId}`);
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
              {formatPillLabel(task.priority || 'medium')}
            </span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getTopPriorityPillClasses('status', task.status)}`}>
              {formatPillLabel(task.status || 'todo')}
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

  const renderMonthCard = (entry: MonthWithWeeks) => {
    const { month, tasks: monthTasks } = entry;
    const done = monthTasks.filter(isTaskCompleted).length;
    const pct = getProgressPercent(monthTasks);

    return (
      <article
        key={month.key}
        role="button"
        tabIndex={0}
        onClick={() => setDetailMonthKey(month.key)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          setDetailMonthKey(month.key);
        }}
        className={`${MONTH_CARD_SHELL} ${MONTH_CARD_HEIGHT_CLASS} cursor-pointer`}
      >
        <div className="shrink-0 flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">
            {month.label} {month.yearLabel}
            <span className="ml-2 text-[11px] font-semibold text-brand-red">{pct}%</span>
          </h4>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openAddFormForMonth(month.key);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-brand-red/30 bg-[#fff7f7] px-2.5 py-1 text-[10px] font-semibold text-brand-red transition hover:border-brand-red hover:bg-red-50"
            >
              <Plus size={12} />
              Add
            </button>
            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {done}/{monthTasks.length}
            </span>
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
          {renderWeekSections(entry)}
        </div>

        <div className="mt-2 flex shrink-0 items-center justify-end gap-0.5 text-[10px] font-medium text-slate-400">
          View month
          <ChevronRight size={12} />
        </div>
      </article>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-900">Month Goals</h4>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
            {completedTasks}/{totalTasks} done
          </span>
          <button
            type="button"
            onClick={() => openAddFormForMonth(undefined)}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-red/30 bg-[#fff7f7] px-3 py-1.5 text-[11px] font-semibold text-brand-red transition hover:border-brand-red hover:bg-red-50"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {canUseAssigneeFilter && setTaskAssigneeFilterId ? (
        <div className="mt-2 max-w-[220px] shrink-0">
          <ThemedSelect
            value={taskAssigneeFilterId}
            onChange={setTaskAssigneeFilterId}
            options={taskAssigneeFilterOptions}
            compact
            fullWidthCompact
          />
        </div>
      ) : null}

      <div className="mt-4">
        {monthsWithWeeks.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {monthsWithWeeks.map((entry) => renderMonthCard(entry))}
          </div>
        ) : (
          <div className={`${MONTH_CARD_SHELL} text-[13px] text-slate-500`}>
            No month goals yet. Use Add to create a task.
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
      />
    </div>
  );
};

export default SpacesMonthGoalsSection;
