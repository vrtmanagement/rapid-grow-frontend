import React from 'react';
import { CheckSquare, Eye, MessageSquareText, MoreVertical, Octagon, Pencil, Plus, X } from 'lucide-react';
import { TaskHubTableSkeleton, ThemedSelect } from './SpacesFormControls';
import { getDisplayAvatarUrl } from '../../utils/avatar';
import {
  isRecurringSeriesActive,
  isRecurringSeriesTask,
  type SpacesTask,
} from '../../views/spacesViewHelpers';

function getPriorityPillClass(priority?: string) {
  const normalized = String(priority || 'medium').trim().toLowerCase();
  if (normalized === 'high') return 'border border-rose-200 bg-rose-100 text-rose-700';
  if (normalized === 'low') return 'border border-sky-200 bg-sky-100 text-sky-700';
  return 'border border-amber-200 bg-amber-100 text-amber-700';
}

function getPriorityLabel(priority?: string) {
  const normalized = String(priority || 'medium').trim().toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'low') return 'Low';
  return 'Medium';
}

function getAssigneeInitials(name?: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'UN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function formatDueDateLabel(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return '—';
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ROW_MENU_OFFSET = 8;
const ROW_MENU_FALLBACK_HEIGHT = 192;
const ROW_MENU_VIEWPORT_PADDING = 12;

const SpacesTaskTableSection: React.FC<any> = (props) => {
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
    stoppingRecurrenceTaskId,
    projectNameById,
    mode,
    me,
    assigneeOptionsForTask,
    employeesLoading,
    canEditDueDate,
    priorityOptions,
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
    API_BASE,
    getAuthHeaders,
  } = props;
  const [activeRowMenuId, setActiveRowMenuId] = React.useState<string | null>(null);
  const [activeRowMenuPlacement, setActiveRowMenuPlacement] = React.useState<'top' | 'bottom'>('bottom');
  const tableCardRef = React.useRef<HTMLDivElement | null>(null);
  const activeRowMenuRef = React.useRef<HTMLDivElement | null>(null);
  const activeRowMenuButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const hasSelectedTasks = selectedTaskIds.length > 0;
  const openTaskDetail = (taskId: string) => {
    navigate(`/spaces/task/${taskId}`);
  };
  const isRowInteractiveTarget = (target: HTMLElement) =>
    Boolean(target.closest('button, select, textarea, input, a, [role="button"]'));

  const resolveRowMenuPlacement = (triggerEl: HTMLButtonElement | null, menuHeight = ROW_MENU_FALLBACK_HEIGHT) => {
    if (!triggerEl) return 'bottom' as const;

    const triggerRect = triggerEl.getBoundingClientRect();
    const cardRect = tableCardRef.current?.getBoundingClientRect();
    const lowerBoundary = Math.min(window.innerHeight - ROW_MENU_VIEWPORT_PADDING, cardRect?.bottom ?? window.innerHeight);
    const upperBoundary = Math.max(ROW_MENU_VIEWPORT_PADDING, cardRect?.top ?? 0);
    const spaceBelow = lowerBoundary - triggerRect.bottom;
    const spaceAbove = triggerRect.top - upperBoundary;

    if (spaceBelow >= menuHeight + ROW_MENU_OFFSET) return 'bottom' as const;
    if (spaceAbove >= menuHeight + ROW_MENU_OFFSET) return 'top' as const;
    return spaceAbove > spaceBelow ? 'top' as const : 'bottom' as const;
  };

  const handleRowMenuToggle = (taskId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    setActiveRowMenuId((prev) => {
      if (prev === taskId) {
        setActiveRowMenuPlacement('bottom');
        activeRowMenuButtonRef.current = null;
        return null;
      }

      activeRowMenuButtonRef.current = event.currentTarget;
      setActiveRowMenuPlacement(resolveRowMenuPlacement(event.currentTarget));
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
    <div ref={tableCardRef} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
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
              paginatedTasks.map((t: any) => {
                const canEdit = canEditTask(t);
                const isLockedDoneRow = isTaskLocked(t);
                const planningVisionLabel = String(t.customFields?.planningYearLabel || '').trim();
                const planningWeekLabel = String(t.customFields?.planningWeekLabel || '').trim();
                const planningDayText = String(t.customFields?.dailyGoalText || '').trim();
                const planningMonthLabel = String(t.customFields?.planningMonthLabel || '').trim();
                const planningTag = [planningMonthLabel, planningWeekLabel, planningDayText].filter(Boolean).join(' · ');

                const isSelected = selectedTaskIds.includes(t.taskId);
                const assignee = assigneeOptionsForTask(t.assigneeId).find((employee: any) => employee.empId === t.assigneeId);
                const assigneeName = assignee ? assignee.empName || 'Unknown User' : 'Unassigned';
                const assigneeAvatar = getDisplayAvatarUrl(assignee?.avatar, assigneeName);
                const showRecurringBadge = isRecurringSeriesTask(t as SpacesTask);
                const showStopRepeating =
                  showRecurringBadge &&
                  isRecurringSeriesActive(tasks as SpacesTask[], t as SpacesTask) &&
                  canEditTask(t) &&
                  typeof stopTaskRecurrence === 'function';
                const isStoppingRecurrence = stoppingRecurrenceTaskId === t.taskId;

                return (
                  <tr
                    key={t.taskId}
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (isRowInteractiveTarget(target)) return;
                      if (hasSelectedTasks && !isSelected && canSelectTask?.(t)) {
                        toggleTaskSelection?.(t);
                        return;
                      }
                      openTaskDetail(t.taskId);
                    }}
                    className={`${getTaskRowClasses(t)} cursor-pointer ${isSelected ? '!bg-red-50/80 ring-1 ring-inset ring-red-200' : ''}`}
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
                        {((mode === 'manager') || (mode === 'employee' && t.createdByEmpId !== me.id)) && (t.createdByName || t.createdByEmpId) ? (
                          <div>Created by: {t.createdByName || t.createdByEmpId}</div>
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
                        {formatDueDateLabel(t.dueDate)}
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
                      {t.documentUrl ? (
                        <button type="button" onClick={async () => { try { await forceDownloadDocument(t.documentUrl || '', t.documentName || undefined); } catch (e: any) { setError(e?.message || 'Failed to download document'); } }} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] font-semibold text-brand-red hover:bg-red-50">Download</button>
                      ) : (
                        <span className="text-[12px] text-slate-400">-</span>
                      )}
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
                      {(canValidateTask(t) || canEditTask(t) || canDeleteTask(t) || showStopRepeating || (canBulkManageTasks && canSelectTask?.(t))) ? (
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
                                className={`absolute right-0 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-lg ${
                                  activeRowMenuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    setActiveRowMenuPlacement('bottom');
                                    activeRowMenuButtonRef.current = null;
                                    openTaskDetail(t.taskId);
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
                                {showStopRepeating ? (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (isStoppingRecurrence) return;
                                      setActiveRowMenuId(null);
                                      setActiveRowMenuPlacement('bottom');
                                      activeRowMenuButtonRef.current = null;
                                      await stopTaskRecurrence(t);
                                    }}
                                    disabled={isStoppingRecurrence}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <Octagon size={14} />
                                    {isStoppingRecurrence ? 'Stopping...' : 'Stop repeating'}
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
              })
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
