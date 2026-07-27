import React from 'react';
import { CheckSquare, Eye, MessageSquareText, MoreVertical, Octagon, Pencil, X } from 'lucide-react';
import { ThemedSelect } from './SpacesFormControls';
import TaskAttachmentsCell from './TaskAttachmentsCell';
import { getDisplayAvatarUrl } from '../../utils/avatar';
import type { SpacesTask } from '../../types/spaces';
import {
  isRecurringSeriesActive,
  isRecurringSeriesTask,
} from '../../views/spacesViewHelpers';
import {
  prefetchSpacesTaskDetailView,
  spacesTaskRowElementId,
} from '../../utils/spaces/taskNavigation';
import {
  formatCreatedAtLabel,
  formatDueDateLabel,
  formatOccurrenceDateTimeLabel,
  getAutomatedMailSeriesKey,
  getPriorityLabel,
  getPriorityPillClass,
  getRepeatingSeriesKey,
  hasAutomatedMailEnabled,
  hasStoppedAutomatedMail,
  isAutoCarriedForwardTask,
  isRowInteractiveTarget,
  isUpcomingScheduledMailTask,
  isWeeklyRepeatActive,
} from './spacesTaskTableHelpers';

export type SpacesTaskTableRowProps = {
  task: any;
  columns: any[];
  tasks: SpacesTask[];
  canEditTask: (task: any) => boolean;
  isTaskLocked: (task: any) => boolean;
  getTaskRowClasses: (task: any) => string;
  patchTask: (taskId: string, patch: any) => void;
  stopTaskRecurrence?: (task: any) => Promise<boolean> | boolean;
  stopTaskEmailChecklist?: (task: SpacesTask) => Promise<boolean> | boolean;
  stopTaskWeeklyRepeat?: (task: SpacesTask) => Promise<boolean> | boolean;
  stoppingRecurrenceTaskId?: string | null;
  projectNameById: Map<string, string>;
  mode: string;
  me: { id: string };
  assigneeOptionsForTask: (assigneeId?: string) => any[];
  employeesLoading: boolean;
  canChangeStatus: (task: any) => boolean;
  statusOptions: any[];
  forceDownloadDocument: (doc: any) => void;
  canCommentOnTask: (task: any) => boolean;
  setCommentTaskId: (id: string) => void;
  setModalStatus: (status: any) => void;
  canValidateTask: (task: any) => boolean;
  canDeleteTask: (task: any) => boolean;
  handleApproveTask: (task: any) => void;
  handleRejectTask: (task: any) => void;
  setEditingTask: (task: any) => void;
  setEditingTaskMode: (mode: string) => void;
  setEditingTaskDraft: (draft: any) => void;
  setDeleteTaskModal: (task: any) => void;
  setBulkDeleteTaskModalOpen?: (open: boolean) => void;
  selectedTaskIds: string[];
  canBulkManageTasks?: boolean;
  toggleTaskSelection?: (task: any) => void;
  canSelectTask?: (task: any) => boolean;
  focusedTaskId: string;
  hasSelectedTasks: boolean;
  mailIndicatorTaskIdBySeries: Map<string, string>;
  repeatingSeriesState: { activeSeries: Set<string>; stoppedSeries: Set<string> };
  activeRowMenuId: string | null;
  activeRowMenuPlacement: 'top' | 'bottom';
  activeRowMenuRef: React.RefObject<HTMLDivElement | null>;
  activeRowMenuButtonRef: React.MutableRefObject<HTMLButtonElement | null>;
  activeFilesDropdownId: string | null;
  setActiveFilesDropdownId: (id: string | null) => void;
  stoppingEmailChecklistTaskId: string | null;
  stoppingWeeklyRepeatTaskId: string | null;
  setStoppingWeeklyRepeatTaskId: (id: string | null) => void;
  setActiveRowMenuId: (id: string | null) => void;
  setActiveRowMenuPlacement: (placement: 'top' | 'bottom') => void;
  handleRowMenuToggle: (taskId: string, event: React.MouseEvent<HTMLButtonElement>) => void;
  openTaskDetail: (task: SpacesTask) => void;
  stopEmailChecklistForTask: (task: SpacesTask) => Promise<boolean>;
  setError: (message: string | null) => void;
};

const SpacesTaskTableRow: React.FC<SpacesTaskTableRowProps> = ({
  task: t,
  columns,
  tasks,
  canEditTask,
  isTaskLocked,
  getTaskRowClasses,
  patchTask,
  stopTaskRecurrence,
  stopTaskEmailChecklist,
  stopTaskWeeklyRepeat,
  stoppingRecurrenceTaskId,
  projectNameById,
  mode,
  me,
  assigneeOptionsForTask,
  employeesLoading,
  canChangeStatus,
  statusOptions,
  forceDownloadDocument,
  canCommentOnTask,
  setCommentTaskId,
  setModalStatus,
  canValidateTask,
  canDeleteTask,
  handleApproveTask,
  handleRejectTask,
  setEditingTask,
  setEditingTaskMode,
  setEditingTaskDraft,
  setDeleteTaskModal,
  setBulkDeleteTaskModalOpen,
  selectedTaskIds,
  canBulkManageTasks,
  toggleTaskSelection,
  canSelectTask,
  focusedTaskId,
  hasSelectedTasks,
  mailIndicatorTaskIdBySeries,
  repeatingSeriesState,
  activeRowMenuId,
  activeRowMenuPlacement,
  activeRowMenuRef,
  activeRowMenuButtonRef,
  activeFilesDropdownId,
  setActiveFilesDropdownId,
  stoppingEmailChecklistTaskId,
  stoppingWeeklyRepeatTaskId,
  setStoppingWeeklyRepeatTaskId,
  setActiveRowMenuId,
  setActiveRowMenuPlacement,
  handleRowMenuToggle,
  openTaskDetail,
  stopEmailChecklistForTask,
  setError,
}) => {
  const canEdit = canEditTask(t);
  const isLockedDoneRow = isTaskLocked(t);
  const planningVisionLabel = String(t.customFields?.planningYearLabel || '').trim();
  const planningWeekLabel = String(t.customFields?.planningWeekLabel || '').trim();
  const planningDayText = String(t.customFields?.dailyGoalText || '').trim();
  const planningMonthLabel = String(t.customFields?.planningMonthLabel || '').trim();
  const planningTag = [planningMonthLabel, planningWeekLabel, planningDayText].filter(Boolean).join(' · ');

  const isSelected = selectedTaskIds.includes(t.taskId);
  const assignee = assigneeOptionsForTask(t.assigneeId).find((employee: any) => employee.empId === t.assigneeId);
  const fallbackAssigneeName = String(t.assigneeName || '').trim();
  const assigneeName = t.assigneeId
    ? assignee?.empName ||
      fallbackAssigneeName ||
      (t.assigneeId.includes('@') ? t.assigneeId : 'Unknown User')
    : 'Unassigned';
  const assigneeAvatar = getDisplayAvatarUrl(assignee?.avatar, assigneeName);
  const showRecurringBadge = isRecurringSeriesTask(t as SpacesTask);
  const showAutoCarryForwardBadge = isAutoCarriedForwardTask(t as SpacesTask);
  const createdAtLabel = formatCreatedAtLabel(t.createdAt);
  const showStopOccurrences =
    Boolean(t.recurrence?.enabled) &&
    isRecurringSeriesActive(tasks as SpacesTask[], t as SpacesTask) &&
    canEditTask(t) &&
    typeof stopTaskRecurrence === 'function';
  const isStoppingRecurrence = stoppingRecurrenceTaskId === t.taskId;
  const hasAutomatedMail = hasAutomatedMailEnabled(t as SpacesTask);
  const hasStoppedMail = hasStoppedAutomatedMail(t as SpacesTask);
  const seriesKey = getAutomatedMailSeriesKey(t as SpacesTask);
  const isMailIndicatorTask =
    Boolean(seriesKey) && mailIndicatorTaskIdBySeries.get(seriesKey) === t.taskId;
  const isWeeklyMailTask = Boolean(
    t.emailChecklist?.repeatEveryWeek || t.emailChecklist?.repeatStoppedAt,
  );
  const showMailActive = hasAutomatedMail && isMailIndicatorTask && !isWeeklyMailTask;
  const showMailStopped = hasStoppedMail && isMailIndicatorTask && !isWeeklyMailTask;
  const showStopEmailChecklist = (showMailActive || showMailStopped) && canEditTask(t);
  const isStoppingEmailChecklist = stoppingEmailChecklistTaskId === t.taskId;
  const canStopRepeating =
    canEditTask(t) &&
    (typeof stopTaskWeeklyRepeat === 'function' || typeof stopTaskRecurrence === 'function');
  const weeklyMailStopped = isWeeklyMailTask && !t.emailChecklist?.repeatEveryWeek;
  const repeatingSeriesKey = getRepeatingSeriesKey(t as SpacesTask);
  const seriesHasActiveRepeating = Boolean(
    repeatingSeriesKey && repeatingSeriesState.activeSeries.has(repeatingSeriesKey),
  );
  const seriesHasStoppedRepeating = Boolean(
    repeatingSeriesKey && repeatingSeriesState.stoppedSeries.has(repeatingSeriesKey),
  );
  const taskHasActiveRepeating =
    isWeeklyRepeatActive(t as SpacesTask) ||
    Boolean(t.recurrence?.enabled) ||
    showStopOccurrences;
  // Disable only for THIS series after it was stopped — never for other repeating series.
  const isRepeatingAlreadyStopped =
    seriesHasStoppedRepeating && !seriesHasActiveRepeating && !taskHasActiveRepeating;
  const showStopRepeatingTask =
    canStopRepeating &&
    (taskHasActiveRepeating || seriesHasActiveRepeating || isRepeatingAlreadyStopped);
  const isStopRepeatingDisabled = isRepeatingAlreadyStopped;
  const isStoppingWeeklyRepeat = stoppingWeeklyRepeatTaskId === t.taskId;
  const isUpcomingMail = isUpcomingScheduledMailTask(t as SpacesTask);
  const upcomingMailLabel = isUpcomingMail
    ? formatOccurrenceDateTimeLabel(t.emailChecklist?.nextReminderAt)
    : '';
  const repeatMailLabel =
    t.emailChecklist?.repeatCadence === '2_minutes' || t.emailChecklist?.repeatCadence === '5_minutes'
      ? '2 Min Mail'
      : t.emailChecklist?.repeatCadence === 'hour'
        ? 'Hourly Mail'
        : 'Weekly Mail';

  const isFocusedReturn = focusedTaskId && focusedTaskId === t.taskId;

  return (
    <tr
      id={spacesTaskRowElementId(t.taskId)}
      onMouseEnter={() => prefetchSpacesTaskDetailView()}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (isRowInteractiveTarget(target)) return;
        if (hasSelectedTasks && canSelectTask?.(t)) {
          toggleTaskSelection?.(t);
          return;
        }
        openTaskDetail(t);
      }}
      className={`${getTaskRowClasses(t)} cursor-pointer transition-colors ${
        showMailActive ? 'bg-emerald-50' : showMailStopped ? 'bg-rose-50' : isWeeklyMailTask && !weeklyMailStopped ? 'bg-violet-50/60' : weeklyMailStopped ? 'bg-slate-50' : ''
      } ${
        isSelected
          ? '!bg-gradient-to-r !from-red-50/90 !to-rose-50/70 ring-1 ring-inset ring-brand-red/25 shadow-[inset_3px_0_0_0_rgba(220,38,38,0.85)]'
          : ''
      } ${
        isFocusedReturn
          ? 'ring-2 ring-inset ring-brand-red/40 !bg-red-50/80'
          : ''
      }`}
    >
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {showRecurringBadge ? (
            <span
              className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 px-1 text-[10px] font-bold uppercase tracking-[0.04em] text-brand-red"
              title="Repeating task"
            >
              R
            </span>
          ) : null}
          {showMailActive ? (
            <span
              className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-emerald-700"
              title="Automated checklist mail is active"
            >
              Mail Active
            </span>
          ) : showMailStopped ? (
            <span
              className="inline-flex shrink-0 items-center rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-rose-700"
              title="Automated checklist mail has been stopped"
            >
              Mail Stopped
            </span>
          ) : null}
          <input
            defaultValue={t.title}
            onBlur={(e) => {
              if (!canEdit || isLockedDoneRow) return;
              const next = e.target.value.trim();
              if (next && next !== t.title) patchTask(t.taskId, { title: next });
            }}
            disabled={!canEdit || isLockedDoneRow}
            className="min-w-0 flex-1 border-none bg-transparent text-[14px] font-medium text-slate-900 outline-none disabled:text-slate-500"
          />
        </div>
        <div className="mt-1 space-y-0.5 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-1.5">
            {t.projectId ? <span>Project: {projectNameById.get(t.projectId) || t.projectId}</span> : null}
            {planningVisionLabel ? <span>Vision: {planningVisionLabel}</span> : null}
            {planningTag ? <span className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-brand-red">{planningTag}</span> : null}
          </div>
          {showAutoCarryForwardBadge ? (
            <div>
              Source: Review Matrix{createdAtLabel ? ` - Created ${createdAtLabel}` : ''}
            </div>
          ) : null}
          {((mode === 'manager') || (mode === 'employee' && t.createdByEmpId !== me.id)) && (t.createdByName || t.createdByEmpId) ? (
            <div>Created by: {t.createdByName || t.createdByEmpId}</div>
          ) : null}
          {(isWeeklyMailTask || isUpcomingMail) ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {isWeeklyMailTask ? (
                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] ${
                    weeklyMailStopped
                      ? 'border-slate-200 bg-slate-100 text-slate-600'
                      : 'border-violet-200 bg-violet-50 text-violet-700'
                  }`}
                  title={
                    weeklyMailStopped
                      ? 'Automated repeat mail has been stopped'
                      : `Automated mail repeats every ${t.emailChecklist?.repeatCadence === '2_minutes' || t.emailChecklist?.repeatCadence === '5_minutes' ? '2 minutes' : t.emailChecklist?.repeatCadence || 'week'}`
                  }
                >
                  {weeklyMailStopped ? 'Mail Stopped' : repeatMailLabel}
                </span>
              ) : null}
              {isUpcomingMail ? (
                <span
                  className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-amber-800"
                  title={
                    upcomingMailLabel
                      ? `Mail will send on ${upcomingMailLabel}`
                      : 'Mail is scheduled and has not been sent yet'
                  }
                >
                  Upcoming{upcomingMailLabel ? ` · ${upcomingMailLabel}` : ''}
                </span>
              ) : null}
            </div>
          ) : null}
          {t.description ? <div className="truncate text-slate-500" title={t.description}>Description: {t.description}</div> : null}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="inline-flex items-center gap-3 rounded-2xl px-2 py-1.5 text-[14px] text-slate-700 transition-colors hover:bg-[#f7faff]">
          <img
            src={assigneeAvatar}
            alt={assigneeName}
            className="h-9 w-9 rounded-full object-cover"
          />
          <span className="truncate font-medium text-slate-600">
            {employeesLoading ? 'Loading...' : assigneeName}
          </span>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="text-[14px] font-medium text-slate-500">
          {formatOccurrenceDateTimeLabel(
            t.emailChecklist?.occurrenceScheduledAt ||
              (isUpcomingScheduledMailTask(t as SpacesTask)
                ? t.emailChecklist?.nextReminderAt
                : null) ||
              (t.emailChecklist?.repeatCadence ? t.emailChecklist?.assignmentSentAt : null) ||
              (t.isRecurring && t.parentTaskId ? t.createdAt : null),
          ) || formatDueDateLabel(t.dueDate)}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold tracking-[-0.01em] ${getPriorityPillClass(t.priority)}`}>
          {getPriorityLabel(t.priority)}
        </span>
      </td>
      <td className="px-3 py-3">
        {t.status === 'done' ? (
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-[12px] font-semibold tracking-[-0.01em] text-emerald-700">
            Done
          </span>
        ) : (
          <ThemedSelect
            value={t.status}
            onChange={(value) => canChangeStatus(t) && patchTask(t.taskId, { status: value })}
            options={statusOptions}
            disabled={!canChangeStatus(t)}
            compact={true}
          />
        )}
      </td>
      <td className="px-3 py-3">
        <TaskAttachmentsCell
          task={t}
          forceDownloadDocument={forceDownloadDocument}
          onError={(message) => setError(message)}
          dropdownId={t.taskId}
          activeDropdownId={activeFilesDropdownId}
          onToggleDropdown={setActiveFilesDropdownId}
        />
      </td>
      <td className="px-3 py-3">
        <button type="button" onClick={() => { if (!canCommentOnTask(t) || isLockedDoneRow) return; setCommentTaskId(t.taskId); setModalStatus(t.status); }} disabled={!canCommentOnTask(t) || isLockedDoneRow} className={`inline-flex items-center gap-1.5 rounded-xl border bg-white px-2.5 py-2 text-slate-700 ${canCommentOnTask(t) && !isLockedDoneRow ? 'border-slate-200 hover:bg-slate-50' : 'cursor-not-allowed border-slate-100 opacity-60'}`} title="View comments"><MessageSquareText size={16} /><span className="text-[12px] font-semibold">{t.comments?.length || 0}</span></button>
      </td>
      {columns.map((c: any) => (
        <td key={c.id} className="px-4 py-3">
          <input defaultValue={t.customFields?.[c.id] || ''} onBlur={(e) => { if (!canEdit || isLockedDoneRow) return; const next = e.target.value; const prevVal = t.customFields?.[c.id] || ''; if (next === prevVal) return; const nextCustom = { ...(t.customFields || {}), [c.id]: next }; patchTask(t.taskId, { customFields: nextCustom }); }} disabled={!canEdit || isLockedDoneRow} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 disabled:bg-slate-50 disabled:text-slate-500" placeholder="-" />
        </td>
      ))}
      <td className="px-2 py-3 text-right">
        {(canValidateTask(t) || canEditTask(t) || canDeleteTask(t) || showStopOccurrences || showStopRepeatingTask || showStopEmailChecklist || (canBulkManageTasks && canSelectTask?.(t))) ? (
          <div className="inline-flex items-center gap-2">
            {canValidateTask(t) ? (
              <>
                <button type="button" onClick={() => handleApproveTask(t)} className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button>
                <button type="button" onClick={() => handleRejectTask(t)} className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-100">Reject</button>
              </>
            ) : null}
            <div className="relative">
              <button
                ref={activeRowMenuId === t.taskId ? activeRowMenuButtonRef : undefined}
                type="button"
                onClick={(event) => handleRowMenuToggle(t.taskId, event)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                title="Task actions"
              >
                <MoreVertical size={16} />
              </button>
              {activeRowMenuId === t.taskId ? (
                <div
                  ref={activeRowMenuRef}
                  className={`absolute right-0 z-[80] w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-lg ${
                    activeRowMenuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRowMenuId(null);
                      setActiveRowMenuPlacement('bottom');
                      activeRowMenuButtonRef.current = null;
                      openTaskDetail(t);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Eye size={14} />
                    View task
                  </button>
                  {canEditTask(t) ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canEditTask(t) || isLockedDoneRow) return;
                        setActiveRowMenuId(null);
                        setActiveRowMenuPlacement('bottom');
                        activeRowMenuButtonRef.current = null;
                        setEditingTask(t);
                        setEditingTaskMode('edit');
                        setEditingTaskDraft({
                          title: t.title,
                          description: t.description || '',
                          assigneeId: t.assigneeId || '',
                          dueDate: t.dueDate || '',
                          priority: t.priority,
                          status: t.status,
                          documentUrl: t.documentUrl || '',
                          documentName: t.documentName || '',
                          documentMimeType: t.documentMimeType || '',
                        });
                      }}
                      disabled={isLockedDoneRow}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Pencil size={14} />
                      Edit task
                    </button>
                  ) : null}
                  {canBulkManageTasks && canSelectTask?.(t) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRowMenuId(null);
                        setActiveRowMenuPlacement('bottom');
                        activeRowMenuButtonRef.current = null;
                        toggleTaskSelection?.(t);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium transition ${
                        isSelected
                          ? 'bg-red-50 text-brand-red hover:bg-red-100'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CheckSquare size={14} />
                      {isSelected ? 'Unselect' : 'Select'}
                    </button>
                  ) : null}
                  {showStopRepeatingTask ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          isStoppingWeeklyRepeat ||
                          isStoppingRecurrence ||
                          isStopRepeatingDisabled
                        ) {
                          return;
                        }
                        setStoppingWeeklyRepeatTaskId(t.taskId);
                        setError(null);
                        try {
                          let stopped = false;
                          if (
                            (Boolean(t.recurrence?.enabled) || showStopOccurrences) &&
                            typeof stopTaskRecurrence === 'function'
                          ) {
                            stopped = (await stopTaskRecurrence(t)) || stopped;
                          }
                          if (typeof stopTaskWeeklyRepeat === 'function') {
                            stopped = (await stopTaskWeeklyRepeat(t as SpacesTask)) || stopped;
                          }
                          if (
                            !stopped &&
                            typeof stopTaskEmailChecklist === 'function' &&
                            t.emailChecklist?.enabled
                          ) {
                            stopped =
                              (await stopTaskEmailChecklist(t as SpacesTask)) || stopped;
                          }
                          setActiveRowMenuId(null);
                          setActiveRowMenuPlacement('bottom');
                          activeRowMenuButtonRef.current = null;
                          if (!stopped) {
                            setError(
                              'Could not turn off repeating for this task. Refresh and try again.',
                            );
                          }
                        } finally {
                          setStoppingWeeklyRepeatTaskId(null);
                        }
                      }}
                      disabled={
                        isStoppingWeeklyRepeat ||
                        isStoppingRecurrence ||
                        isStopRepeatingDisabled
                      }
                      title={
                        isRepeatingAlreadyStopped || isStopRepeatingDisabled
                          ? 'Repeating is already stopped for this task series'
                          : 'Stop repeating for this task series'
                      }
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isStopRepeatingDisabled
                          ? 'text-slate-400 hover:bg-transparent'
                          : 'text-violet-700 hover:bg-violet-50'
                      }`}
                    >
                      <Octagon size={14} />
                      {isStoppingWeeklyRepeat || isStoppingRecurrence
                        ? 'Stopping...'
                        : isRepeatingAlreadyStopped || isStopRepeatingDisabled
                          ? 'Repeating stopped'
                          : 'Stop repeating task'}
                    </button>
                  ) : null}
                  {showStopEmailChecklist ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isStoppingEmailChecklist || showMailStopped || !showMailActive) return;
                        setActiveRowMenuId(null);
                        setActiveRowMenuPlacement('bottom');
                        activeRowMenuButtonRef.current = null;
                        void stopEmailChecklistForTask(t as SpacesTask);
                      }}
                      disabled={isStoppingEmailChecklist || showMailStopped || !showMailActive}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        showMailStopped
                          ? 'text-rose-700 hover:bg-rose-50'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      <X size={14} strokeWidth={2.5} />
                      {isStoppingEmailChecklist ? 'Stopping...' : showMailStopped ? 'Mail stopped' : 'Stop mail'}
                    </button>
                  ) : null}
                  {canDeleteTask(t) ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isLockedDoneRow) return;
                        setActiveRowMenuId(null);
                        setActiveRowMenuPlacement('bottom');
                        activeRowMenuButtonRef.current = null;
                        if (selectedTaskIds.length > 1 && setBulkDeleteTaskModalOpen) {
                          setDeleteTaskModal(null);
                          setBulkDeleteTaskModalOpen(true);
                          return;
                        }
                        setDeleteTaskModal(t);
                      }}
                      disabled={isLockedDoneRow}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X size={14} strokeWidth={2} />
                      Delete task
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </td>
    </tr>
  );
};

export default SpacesTaskTableRow;
