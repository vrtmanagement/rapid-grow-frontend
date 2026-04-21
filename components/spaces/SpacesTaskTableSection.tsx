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

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto overflow-y-visible border-b border-slate-100 [transform:rotateX(180deg)]">
        <table className="w-full text-left border-collapse [transform:rotateX(180deg)]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-[12px] font-bold text-slate-600 uppercase tracking-[0.12em]">
              <th className="px-4 py-3 min-w-[220px]">Name</th>
              <th className="px-4 py-3 min-w-[180px]">Assignee</th>
              <th className="px-4 py-3 min-w-[140px]">Due date</th>
              <th className="px-4 py-3 min-w-[140px]">Priority</th>
              <th className="px-4 py-3 min-w-[140px]">Status</th>
              <th className="px-4 py-3 min-w-[140px]">Document</th>
              <th className="px-4 py-3 min-w-[120px]">Comments</th>
              {columns.map((c: any) => (
                <th key={c.id} className="px-4 py-3 min-w-[200px]">
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
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-2 py-1 text-[12px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                        autoFocus
                      />
                    ) : (
                      <span>{c.name}</span>
                    )}
                    <button type="button" onClick={() => setActiveColumnMenuId((prev: any) => (prev === c.id ? null : c.id))} className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-100">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                  {activeColumnMenuId === c.id && (
                    <div className="relative">
                      <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-10">
                        <button type="button" onClick={() => { setIsRenamingColumnId(c.id); setRenameDraft(c.name); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50">Rename</button>
                        <button type="button" onClick={() => { setColumnToDelete(c); setActiveColumnMenuId(null); }} className="w-full text-left px-3 py-2 text-[13px] text-red-600 hover:bg-red-50">Remove</button>
                      </div>
                    </div>
                  )}
                </th>
              ))}
              <th className="px-3 py-3 w-[56px] text-right">
                <button type="button" onClick={handleAddColumn} className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" title="Add new field">
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
                return (
                  <tr key={t.taskId} className={getTaskRowClasses(t)}>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={t.title}
                        onBlur={(e) => {
                          if (!canEdit || isLockedDoneRow) return;
                          const next = e.target.value.trim();
                          if (next && next !== t.title) patchTask(t.taskId, { title: next });
                        }}
                        disabled={!canEdit || isLockedDoneRow}
                        className="w-full bg-transparent border-none outline-none text-[14px] text-slate-900 font-medium disabled:text-slate-500"
                      />
                      <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                        {t.projectId ? <div>Project: {projectNameById.get(t.projectId) || t.projectId}</div> : null}
                        {((mode === 'manager') || (mode === 'employee' && t.createdByEmpId !== me.id)) && (t.createdByName || t.createdByEmpId) ? (
                          <div>Created by: {t.createdByName || t.createdByEmpId}</div>
                        ) : null}
                        {t.description ? <div className="text-slate-500 truncate max-w-[360px]" title={t.description}>Description: {t.description}</div> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ThemedSelect
                        value={t.assigneeId || ''}
                        onChange={(value) => canEdit && !isLockedDoneRow && patchTask(t.taskId, { assigneeId: value })}
                        options={[{ value: '', label: 'Unassigned' }, ...assigneeOptionsForTask(t.assigneeId).map((employee: any) => ({ value: employee.empId, label: employee.empId === me.id ? `${employee.empName} (You)` : employee.empName || 'Unknown User' }))]}
                        placeholder="Unassigned"
                        disabled={employeesLoading || !canEdit || isLockedDoneRow}
                        compact={true}
                      />
                    </td>
                    <td className="px-4 py-3"><ThemedDatePicker value={t.dueDate || ''} onChange={(value) => canEditDueDate(t) && patchTask(t.taskId, { dueDate: value })} disabled={!canEditDueDate(t)} compact={true} /></td>
                    <td className="px-4 py-3"><ThemedSelect value={t.priority} onChange={(value) => canEdit && !isLockedDoneRow && patchTask(t.taskId, { priority: value })} options={priorityOptions} disabled={!canEdit || isLockedDoneRow} compact={true} /></td>
                    <td className="px-4 py-3"><ThemedSelect value={t.status} onChange={(value) => canChangeStatus(t) && patchTask(t.taskId, { status: value })} options={statusOptions} disabled={!canChangeStatus(t)} compact={true} /></td>
                    <td className="px-4 py-3">
                      {t.documentUrl ? <button type="button" onClick={async () => { try { await forceDownloadDocument(t.documentUrl || '', t.documentName || undefined); } catch (e: any) { setError(e?.message || 'Failed to download document'); } }} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-brand-red hover:bg-red-50">Download</button> : <span className="text-[12px] text-slate-400">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => { if (!canCommentOnTask(t) || isLockedDoneRow) return; setCommentTaskId(t.taskId); setModalStatus(t.status); }} disabled={!canCommentOnTask(t) || isLockedDoneRow} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white text-slate-700 ${canCommentOnTask(t) && !isLockedDoneRow ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-100 opacity-60 cursor-not-allowed'}`} title="View comments"><MessageSquareText size={16} /><span className="text-[12px] font-semibold">{t.comments?.length || 0}</span></button>
                    </td>
                    {columns.map((c: any) => (
                      <td key={c.id} className="px-4 py-3">
                        <input defaultValue={t.customFields?.[c.id] || ''} onBlur={(e) => { if (!canEdit || isLockedDoneRow) return; const next = e.target.value; const prevVal = t.customFields?.[c.id] || ''; if (next === prevVal) return; const nextCustom = { ...(t.customFields || {}), [c.id]: next }; patchTask(t.taskId, { customFields: nextCustom }); }} disabled={!canEdit || isLockedDoneRow} className="w-full bg-white border border-slate-200 rounded-xl px-4 pr-10 py-2 text-[13px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red disabled:bg-slate-50 disabled:text-slate-500" placeholder="-" />
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right">
                      {(canValidateTask(t) || canEditTask(t) || canDeleteTask(t)) ? (
                        <div className="inline-flex items-center gap-2">
                          {canValidateTask(t) && (
                            <>
                              <button type="button" onClick={() => handleApproveTask(t)} className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button>
                              <button type="button" onClick={() => handleRejectTask(t)} className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-100">Reject</button>
                            </>
                          )}
                          <button type="button" onClick={() => navigate(`/spaces/task/${t.taskId}`)} className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100" title="View task"><Eye size={14} /></button>
                          {canEditTask(t) && <button type="button" onClick={() => { if (!canEditTask(t) || isLockedDoneRow) return; setEditingTask(t); setEditingTaskMode('edit'); setEditingTaskDraft({ title: t.title, description: t.description || '', assigneeId: t.assigneeId || '', dueDate: t.dueDate || '', priority: t.priority, status: t.status, documentUrl: t.documentUrl || '', documentName: t.documentName || '', documentMimeType: t.documentMimeType || '' }); }} disabled={isLockedDoneRow} className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"><Pencil size={14} /></button>}
                          {canDeleteTask(t) && <button type="button" onClick={() => { if (isLockedDoneRow) return; setDeleteTaskModal(t); }} disabled={isLockedDoneRow} className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-100 text-red-500 hover:bg-red-50 text-[18px] disabled:opacity-60 disabled:cursor-not-allowed"><X size={14} strokeWidth={2} /></button>}
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
