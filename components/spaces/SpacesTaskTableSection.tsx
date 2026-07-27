import React from 'react';
import { MoreVertical, Plus } from 'lucide-react';
import { TaskHubTableSkeleton } from './SpacesFormControls';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';
import type { SpacesTask } from '../../types/spaces';
import {
  findScrollableContainer,
  isRecurringSeriesActive,
  isRecurringSeriesTask,
} from '../../views/spacesViewHelpers';
import {
  openSpacesTaskDetail,
  prefetchSpacesTaskDetailView,
} from '../../utils/spaces/taskNavigation';
import SpacesTaskTableRow from './SpacesTaskTableRow';
import {
  getAutomatedMailSeriesKey,
  getRepeatingSeriesKey,
  isWeeklyRepeatActive,
  isWeeklyRepeatStopped,
  resolveRowMenuPlacement,
  ROW_MENU_FALLBACK_HEIGHT,
  taskHasAutomatedMailState,
} from './spacesTaskTableHelpers';

type SpacesTaskTableSectionProps = Pick<
  SpacesViewController,
  | 'columns'
  | 'isRenamingColumnId'
  | 'renameDraft'
  | 'setRenameDraft'
  | 'setIsRenamingColumnId'
  | 'setActiveColumnMenuId'
  | 'sortedTasks'
  | 'tasks'
  | 'setColumns'
  | 'setError'
  | 'activeColumnMenuId'
  | 'setColumnToDelete'
  | 'handleAddColumn'
  | 'spacesLoading'
  | 'paginatedTasks'
  | 'canEditTask'
  | 'isTaskLocked'
  | 'getTaskRowClasses'
  | 'patchTask'
  | 'stopTaskRecurrence'
  | 'stopTaskEmailChecklist'
  | 'stopTaskWeeklyRepeat'
  | 'stoppingRecurrenceTaskId'
  | 'projectNameById'
  | 'mode'
  | 'me'
  | 'assigneeOptionsForTask'
  | 'employeesLoading'
  | 'canEditDueDate'
  | 'priorityOptions'
  | 'canChangeStatus'
  | 'statusOptions'
  | 'forceDownloadDocument'
  | 'canCommentOnTask'
  | 'setCommentTaskId'
  | 'setModalStatus'
  | 'canValidateTask'
  | 'canDeleteTask'
  | 'handleApproveTask'
  | 'handleRejectTask'
  | 'navigate'
  | 'setEditingTask'
  | 'setEditingTaskMode'
  | 'setEditingTaskDraft'
  | 'setDeleteTaskModal'
  | 'setBulkDeleteTaskModalOpen'
  | 'selectedTaskIds'
  | 'canBulkManageTasks'
  | 'toggleTaskSelection'
  | 'canSelectTask'
  | 'taskPage'
  | 'TASKS_PER_PAGE'
  | 'taskListTotal'
  | 'setTaskPage'
  | 'visibleTaskPages'
  | 'totalTaskPages'
  | 'taskFilterMode'
  | 'taskStatusFilter'
  | 'taskSearch'
  | 'API_BASE'
  | 'getAuthHeaders'
  | 'focusedTaskId'
>;

const SpacesTaskTableSection: React.FC<SpacesTaskTableSectionProps> = (props) => {
  const {
    columns,
    isRenamingColumnId,
    renameDraft,
    setRenameDraft,
    setIsRenamingColumnId,
    setActiveColumnMenuId,
    sortedTasks,
    tasks = [],
    setColumns,
    setError,
    activeColumnMenuId,
    setColumnToDelete,
    handleAddColumn,
    spacesLoading,
    paginatedTasks,
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
    navigate,
    setEditingTask,
    setEditingTaskMode,
    setEditingTaskDraft,
    setDeleteTaskModal,
    setBulkDeleteTaskModalOpen,
    selectedTaskIds = [],
    canBulkManageTasks,
    toggleTaskSelection,
    canSelectTask,
    taskPage,
    TASKS_PER_PAGE,
    taskListTotal = 0,
    setTaskPage,
    visibleTaskPages,
    totalTaskPages,
    taskFilterMode,
    taskStatusFilter,
    taskSearch,
    API_BASE,
    getAuthHeaders,
    focusedTaskId = '',
  } = props;
  const [activeRowMenuId, setActiveRowMenuId] = React.useState<string | null>(null);
  const [activeFilesDropdownId, setActiveFilesDropdownId] = React.useState<string | null>(null);
  const [activeRowMenuPlacement, setActiveRowMenuPlacement] = React.useState<'top' | 'bottom'>('bottom');
  const [stoppingEmailChecklistTaskId, setStoppingEmailChecklistTaskId] = React.useState<string | null>(null);
  const [stoppingWeeklyRepeatTaskId, setStoppingWeeklyRepeatTaskId] = React.useState<string | null>(null);
  const tableCardRef = React.useRef<HTMLDivElement | null>(null);
  const activeRowMenuRef = React.useRef<HTMLDivElement | null>(null);
  const activeRowMenuButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const hasSelectedTasks = selectedTaskIds.length > 0;
  const mailIndicatorTaskIdBySeries = React.useMemo(() => {
    const owners = new Map<string, string>();
    paginatedTasks.forEach((task: SpacesTask) => {
      if (!taskHasAutomatedMailState(task)) return;
      const seriesKey = getAutomatedMailSeriesKey(task);
      if (!seriesKey) return;
      const existingTaskId = owners.get(seriesKey);
      if (!existingTaskId || task.recurrence?.enabled) {
        owners.set(seriesKey, task.taskId);
      }
    });
    return owners;
  }, [paginatedTasks]);

  const repeatingSeriesState = React.useMemo(() => {
    const activeSeries = new Set<string>();
    const stoppedSeries = new Set<string>();
    (tasks as SpacesTask[]).forEach((task) => {
      const seriesKey = getRepeatingSeriesKey(task);
      if (!seriesKey) return;
      const recurrenceActive = isRecurringSeriesActive(tasks as SpacesTask[], task);
      if (isWeeklyRepeatActive(task) || recurrenceActive || task.recurrence?.enabled) {
        activeSeries.add(seriesKey);
      }
      if (isWeeklyRepeatStopped(task)) {
        stoppedSeries.add(seriesKey);
      }
      if (isRecurringSeriesTask(task) && !recurrenceActive && !task.recurrence?.enabled) {
        stoppedSeries.add(seriesKey);
      }
    });
    // If any occurrence in the series is still active, the series is not stopped.
    stoppedSeries.forEach((key) => {
      if (activeSeries.has(key)) stoppedSeries.delete(key);
    });
    return { activeSeries, stoppedSeries };
  }, [tasks]);
  const openTaskDetail = (task: SpacesTask) => {
    prefetchSpacesTaskDetailView();
    openSpacesTaskDetail(navigate, task, {
      page: taskPage,
      filterMode: taskFilterMode,
      statusFilter: taskStatusFilter,
      search: taskSearch,
      scrollContainer: findScrollableContainer(tableCardRef.current),
    });
  };

  const stopEmailChecklistForTask = async (task: SpacesTask) => {
    if (stoppingEmailChecklistTaskId === task.taskId) return false;
    if (typeof stopTaskEmailChecklist !== 'function') {
      setError('Unable to stop automated mail right now. Please refresh and try again.');
      return false;
    }
    setStoppingEmailChecklistTaskId(task.taskId);
    try {
      const result = await stopTaskEmailChecklist(task);
      if (!result) {
        setError('Failed to stop automated mail for this task.');
      }
      return result;
    } catch (error: any) {
      setError(error?.message || 'Failed to stop automated mail for this task.');
      return false;
    } finally {
      setStoppingEmailChecklistTaskId(null);
    }
  };

  const handleRowMenuToggle = (taskId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    setActiveRowMenuId((prev) => {
      if (prev === taskId) {
        setActiveRowMenuPlacement('bottom');
        activeRowMenuButtonRef.current = null;
        return null;
      }

      activeRowMenuButtonRef.current = event.currentTarget;
      setActiveRowMenuPlacement(resolveRowMenuPlacement(event.currentTarget, tableCardRef.current));
      return taskId;
    });
  };

  React.useEffect(() => {
    if (!activeRowMenuId) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (activeRowMenuRef.current?.contains(target) || activeRowMenuButtonRef.current?.contains(target)) {
        return;
      }
      setActiveRowMenuId(null);
      setActiveRowMenuPlacement('bottom');
      activeRowMenuButtonRef.current = null;
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeRowMenuId]);

  React.useLayoutEffect(() => {
    if (!activeRowMenuId || !activeRowMenuButtonRef.current) return undefined;

    const updatePlacement = () => {
      setActiveRowMenuPlacement(
        resolveRowMenuPlacement(
          activeRowMenuButtonRef.current,
          tableCardRef.current,
          activeRowMenuRef.current?.offsetHeight || ROW_MENU_FALLBACK_HEIGHT,
        ),
      );
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);

    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [activeRowMenuId]);

  return (
    <div ref={tableCardRef} className="overflow-visible rounded-3xl border border-slate-200 bg-white">
      <div className="overflow-x-visible overflow-y-visible border-b border-slate-100 [transform:rotateX(180deg)]">
        <table className="w-full table-fixed border-collapse text-left [transform:rotateX(180deg)]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-600">
              <th className="w-[29%] px-3 py-3">Name</th>
              <th className="w-[13%] px-3 py-3">Assignee</th>
              <th className="w-[11%] px-3 py-3">Due date</th>
              <th className="w-[10%] px-3 py-3">Priority</th>
              <th className="w-[10%] px-3 py-3">Status</th>
              <th className="w-[8%] px-3 py-3">Document</th>
              <th className="w-[5%] px-3 py-3">Comments</th>
              {columns.map((c: any) => (
                <th key={c.id} className="min-w-[200px] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    {isRenamingColumnId === c.id ? (
                      <input
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={async () => {
                          const next = renameDraft.trim();
                          setIsRenamingColumnId(null);
                          setActiveColumnMenuId(null);
                          if (!next || next === c.name) return;
                          try {
                            const res = await fetch(`${API_BASE}/spaces/columns`, {
                              method: 'POST',
                              headers: getAuthHeaders(),
                              body: JSON.stringify({ name: next }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(data.message || 'Failed to rename field');
                            setColumns(Array.isArray(data.columns) ? data.columns : []);
                          } catch (e: any) {
                            setError(e?.message || 'Failed to rename field');
                          }
                        }}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                        autoFocus
                      />
                    ) : (
                      <span>{c.name}</span>
                    )}
                    <button type="button" onClick={() => setActiveColumnMenuId((prev: any) => (prev === c.id ? null : c.id))} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-100">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                  {activeColumnMenuId === c.id ? (
                    <div className="relative">
                      <div className="absolute right-0 z-10 mt-2 w-40 rounded-xl border border-slate-200 bg-white">
                        <button type="button" onClick={() => { setIsRenamingColumnId(c.id); setRenameDraft(c.name); }} className="w-full px-3 py-2 text-left text-[13px] hover:bg-slate-50">Rename</button>
                        <button type="button" onClick={() => { setColumnToDelete(c); setActiveColumnMenuId(null); }} className="w-full px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50">Remove</button>
                      </div>
                    </div>
                  ) : null}
                </th>
              ))}
              <th className="w-[44px] px-2 py-3 text-right">
                <button type="button" onClick={handleAddColumn} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title="Add new field">
                  <Plus size={18} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {spacesLoading ? (
              <TaskHubTableSkeleton customColumnCount={columns.length} />
            ) : sortedTasks.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-slate-500" colSpan={8 + columns.length}>No tasks yet.</td>
              </tr>
            ) : (
              paginatedTasks.map((t: any) => (
                <SpacesTaskTableRow
                  key={t.taskId}
                  task={t}
                  columns={columns}
                  tasks={tasks as SpacesTask[]}
                  canEditTask={canEditTask}
                  isTaskLocked={isTaskLocked}
                  getTaskRowClasses={getTaskRowClasses}
                  patchTask={patchTask}
                  stopTaskRecurrence={stopTaskRecurrence}
                  stopTaskEmailChecklist={stopTaskEmailChecklist}
                  stopTaskWeeklyRepeat={stopTaskWeeklyRepeat}
                  stoppingRecurrenceTaskId={stoppingRecurrenceTaskId}
                  projectNameById={projectNameById}
                  mode={mode}
                  me={me}
                  assigneeOptionsForTask={assigneeOptionsForTask}
                  employeesLoading={employeesLoading}
                  canChangeStatus={canChangeStatus}
                  statusOptions={statusOptions}
                  forceDownloadDocument={forceDownloadDocument}
                  canCommentOnTask={canCommentOnTask}
                  setCommentTaskId={setCommentTaskId}
                  setModalStatus={setModalStatus}
                  canValidateTask={canValidateTask}
                  canDeleteTask={canDeleteTask}
                  handleApproveTask={handleApproveTask}
                  handleRejectTask={handleRejectTask}
                  setEditingTask={setEditingTask}
                  setEditingTaskMode={setEditingTaskMode}
                  setEditingTaskDraft={setEditingTaskDraft}
                  setDeleteTaskModal={setDeleteTaskModal}
                  setBulkDeleteTaskModalOpen={setBulkDeleteTaskModalOpen}
                  selectedTaskIds={selectedTaskIds}
                  canBulkManageTasks={canBulkManageTasks}
                  toggleTaskSelection={toggleTaskSelection}
                  canSelectTask={canSelectTask}
                  focusedTaskId={focusedTaskId}
                  hasSelectedTasks={hasSelectedTasks}
                  mailIndicatorTaskIdBySeries={mailIndicatorTaskIdBySeries}
                  repeatingSeriesState={repeatingSeriesState}
                  activeRowMenuId={activeRowMenuId}
                  activeRowMenuPlacement={activeRowMenuPlacement}
                  activeRowMenuRef={activeRowMenuRef}
                  activeRowMenuButtonRef={activeRowMenuButtonRef}
                  activeFilesDropdownId={activeFilesDropdownId}
                  setActiveFilesDropdownId={setActiveFilesDropdownId}
                  stoppingEmailChecklistTaskId={stoppingEmailChecklistTaskId}
                  stoppingWeeklyRepeatTaskId={stoppingWeeklyRepeatTaskId}
                  setStoppingWeeklyRepeatTaskId={setStoppingWeeklyRepeatTaskId}
                  setActiveRowMenuId={setActiveRowMenuId}
                  setActiveRowMenuPlacement={setActiveRowMenuPlacement}
                  handleRowMenuToggle={handleRowMenuToggle}
                  openTaskDetail={openTaskDetail}
                  stopEmailChecklistForTask={stopEmailChecklistForTask}
                  setError={setError}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {!spacesLoading && sortedTasks.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3">
          <p className="text-[12px] text-slate-500">Showing {(taskPage - 1) * TASKS_PER_PAGE + 1}-{Math.min(taskPage * TASKS_PER_PAGE, taskListTotal)} of {taskListTotal}</p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setTaskPage((prev: number) => Math.max(1, prev - 1))} disabled={taskPage === 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Prev</button>
            {visibleTaskPages.map((page: number) => (
              <button key={`task-page-${page}`} type="button" onClick={() => setTaskPage(page)} className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${page === taskPage ? 'border-brand-red bg-brand-red text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{page}</button>
            ))}
            <button type="button" onClick={() => setTaskPage((prev: number) => Math.min(totalTaskPages, prev + 1))} disabled={taskPage === totalTaskPages} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SpacesTaskTableSection;
