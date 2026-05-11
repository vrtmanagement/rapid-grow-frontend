import React from 'react';
import { Eye, MessageSquareText, MoreVertical, Pencil, Plus, X } from 'lucide-react';
import { TaskHubTableSkeleton, ThemedDatePicker, ThemedSelect } from './SpacesFormControls';

const SpacesTaskTableSection: React.FC<any> = (props) => {
  const {
    columns,
    isRenamingColumnId,
    renameDraft,
    setRenameDraft,
    setIsRenamingColumnId,
    setActiveColumnMenuId,
    sortedTasks,
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
    taskPage,
    TASKS_PER_PAGE,
    setTaskPage,
    visibleTaskPages,
    totalTaskPages,
    API_BASE,
    getAuthHeaders,
  } = props;
  const [activeRowMenuId, setActiveRowMenuId] = React.useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
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
                      <div className="absolute right-0 z-10 mt-2 w-40 rounded-xl border border-slate-200 bg-white shadow-lg">
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

                return (
                  <tr key={t.taskId} className={getTaskRowClasses(t)}>
                    <td className="px-3 py-3">
                      <input
                        defaultValue={t.title}
                        onBlur={(e) => {
                          if (!canEdit || isLockedDoneRow) return;
                          const next = e.target.value.trim();
                          if (next && next !== t.title) patchTask(t.taskId, { title: next });
                        }}
                        disabled={!canEdit || isLockedDoneRow}
                        className="w-full border-none bg-transparent text-[14px] font-medium text-slate-900 outline-none disabled:text-slate-500"
                      />
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
                      <ThemedSelect
                        value={t.assigneeId || ''}
                        onChange={(value) => canEdit && !isLockedDoneRow && patchTask(t.taskId, { assigneeId: value })}
                        options={[{ value: '', label: 'Unassigned' }, ...assigneeOptionsForTask(t.assigneeId).map((employee: any) => ({ value: employee.empId, label: employee.empId === me.id ? `${employee.empName} (You)` : employee.empName || 'Unknown User' }))]}
                        placeholder="Unassigned"
                        disabled={employeesLoading || !canEdit || isLockedDoneRow}
                        compact={true}
                      />
                    </td>
                    <td className="px-3 py-3"><ThemedDatePicker value={t.dueDate || ''} onChange={(value) => canEditDueDate(t) && patchTask(t.taskId, { dueDate: value })} disabled={!canEditDueDate(t)} compact={true} /></td>
                    <td className="px-3 py-3"><ThemedSelect value={t.priority} onChange={(value) => canEdit && !isLockedDoneRow && patchTask(t.taskId, { priority: value })} options={priorityOptions} disabled={!canEdit || isLockedDoneRow} compact={true} /></td>
                    <td className="px-3 py-3"><ThemedSelect value={t.status} onChange={(value) => canChangeStatus(t) && patchTask(t.taskId, { status: value })} options={statusOptions} disabled={!canChangeStatus(t)} compact={true} /></td>
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
                      {(canValidateTask(t) || canEditTask(t) || canDeleteTask(t)) ? (
                        <div className="inline-flex items-center gap-2">
                          {canValidateTask(t) ? (
                            <>
                              <button type="button" onClick={() => handleApproveTask(t)} className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button>
                              <button type="button" onClick={() => handleRejectTask(t)} className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-100">Reject</button>
                            </>
                          ) : null}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveRowMenuId((prev) => (prev === t.taskId ? null : t.taskId))}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                              title="Task actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {activeRowMenuId === t.taskId ? (
                              <div className="absolute right-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    navigate(`/spaces/task/${t.taskId}`);
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
                                {canDeleteTask(t) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isLockedDoneRow) return;
                                      setActiveRowMenuId(null);
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
          <p className="text-[12px] text-slate-500">Showing {(taskPage - 1) * TASKS_PER_PAGE + 1}-{Math.min(taskPage * TASKS_PER_PAGE, sortedTasks.length)} of {sortedTasks.length}</p>
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
