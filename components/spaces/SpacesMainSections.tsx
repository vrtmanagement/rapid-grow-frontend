import React from 'react';
import { Plus } from 'lucide-react';
import { CREATE_INPUT_CLASS, ThemedDatePicker, ThemedSelect, WeeklyTaskPeriodPicker } from './SpacesFormControls';
import SpacesTaskTableSection from './SpacesTaskTableSection';
import SpacesTaskModals from './SpacesTaskModals';

const SpacesMainSections: React.FC<any> = (props) => {
  const {
    setCreatePanelTab,
    createPanelTab,
    assignmentHint,
    setAssigneeId,
    me,
    title,
    setTitle,
    assigneeId,
    createAssigneeOptions,
    employeesLoading,
    employeeNameById,
    dueDate,
    setDueDate,
    priority,
    setPriority,
    priorityOptions,
    status,
    setStatus,
    statusOptions,
    description,
    setDescription,
    selectedProjectId,
    setSelectedProjectId,
    projectSelectOptions,
    projectsLoading,
    setTaskDocumentFile,
    taskDocumentFile,
    handleCreate,
    saving,
    uploadingTaskDocument,
    topPriorityTasks,
    patchTask,
    deleteTask,
    weeklyError,
    state,
    updateState,
    selectedWeeklyTaskGroup,
    weeklyPeriodPicker,
    getWeekBreadcrumb,
    selectedDayByWeek,
    getSundayStart,
    getWeekStartDate,
    getDayDisplay,
    setSelectedDayByWeek,
    tasks,
    toggleDaily,
    canManageWeeklyRows,
    assignDraftByDay,
    setAssignDraftByDay,
    setWeeklyTaskDocumentByDay,
    weeklyTaskDocumentByDay,
    createTaskFromDay,
    assigningDayTaskId,
    createDaysForWeek,
    setTaskFilterMode,
    taskFilterMode,
    taskSearch,
    setTaskSearch,
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
    projectNameById,
    mode,
    assigneeOptionsForTask,
    canEditDueDate,
    canChangeStatus,
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
    activeCommentTask,
    setCommentDraft,
    commentDraft,
    editingCommentId,
    setEditingCommentId,
    editCommentDraft,
    setEditCommentDraft,
    setTasks,
    modalStatus,
    handleAddComment,
    submittingComment,
    columnToDelete,
    commentToDeleteId,
    setCommentToDeleteId,
    deleteTaskModal,
    rejectTaskModal,
    rejectFeedbackDraft,
    setRejectFeedbackDraft,
    rejectingTask,
    confirmRejectTask,
    editingTask,
    editingTaskMode,
    editingTaskDraft,
    assignableEmployees,
  } = props;

  const currentWeeklyGroup = selectedWeeklyTaskGroup || null;
  const currentWeek = currentWeeklyGroup?.week || null;
  const currentWeekDays = currentWeeklyGroup?.days || [];
  const currentWeekStart =
    currentWeeklyGroup?.weekStart
      ? currentWeeklyGroup.weekStart
      : currentWeek && currentWeekDays.length
        ? getWeekStartDate(currentWeek, currentWeekDays)
      : new Date();
  const selectedDayId =
    currentWeek && currentWeekDays.length
      ? selectedDayByWeek[currentWeek.id] || currentWeekDays[0]?.id || ''
      : '';
  const selectedDay =
    currentWeekDays.find((day: any) => day.id === selectedDayId) || currentWeekDays[0] || null;
  const assignmentsForSelectedDay = selectedDay
    ? tasks.filter((task: any) => String(task?.customFields?.dailyGoalId || '').trim() === selectedDay.id)
    : [];

  return (
    <>
      <div className="space-y-4">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          <button type="button" onClick={() => setCreatePanelTab('add-task')} className={`px-4 py-1.5 text-[13px] rounded-full transition-colors ${createPanelTab === 'add-task' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Add Task</button>
          <button type="button" onClick={() => setCreatePanelTab('top-priorities')} className={`px-4 py-1.5 text-[13px] rounded-full transition-colors ${createPanelTab === 'top-priorities' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Top Priorities</button>
          <button type="button" onClick={() => setCreatePanelTab('weekly-tasks')} className={`px-4 py-1.5 text-[13px] rounded-full transition-colors ${createPanelTab === 'weekly-tasks' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Weekly Tasks</button>
        </div>

        {createPanelTab === 'add-task' ? (
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <p className="text-[13px] text-slate-700">{assignmentHint}</p>
              <button type="button" onClick={() => setAssigneeId(me.id || '')} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Assign to me</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2"><label className="block text-[13px] font-semibold text-slate-700 mb-2">Task *</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={CREATE_INPUT_CLASS} placeholder="Task name" /></div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">Assignee</label>
                <ThemedSelect value={assigneeId} onChange={setAssigneeId} options={createAssigneeOptions} placeholder="Unassigned" disabled={employeesLoading} forceOpenDown={true} />
                <div className="mt-1 text-[11px] text-slate-500">{assigneeId ? `Assigned: ${employeeNameById.get(assigneeId) || assigneeId}` : 'Currently unassigned'}</div>
              </div>
              <div><label className="block text-[13px] font-semibold text-slate-700 mb-2">Due date</label><ThemedDatePicker value={dueDate} onChange={setDueDate} forceOpenDown={true} /></div>
              <div><label className="block text-[13px] font-semibold text-slate-700 mb-2">Priority</label><ThemedSelect value={priority} onChange={(value) => setPriority(value as any)} options={priorityOptions} forceOpenDown={true} /></div>
              <div><label className="block text-[13px] font-semibold text-slate-700 mb-2">Status</label><ThemedSelect value={status} onChange={(value) => setStatus(value as any)} options={statusOptions} forceOpenDown={true} /></div>
            </div>
            <div><label className="block text-[13px] font-semibold text-slate-700 mb-2">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-h-[96px] rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[14px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15" placeholder="Add task description..." /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2"><label className="block text-[13px] font-semibold text-slate-700 mb-2">Project</label><ThemedSelect value={selectedProjectId} onChange={setSelectedProjectId} options={projectSelectOptions} placeholder="No project" disabled={projectsLoading} forceOpenDown={true} /></div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">Document</label>
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(e) => setTaskDocumentFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-brand-red" />
                {taskDocumentFile ? <p className="mt-1 text-[11px] text-slate-500 truncate">{taskDocumentFile.name}</p> : null}
              </div>
              <div className="flex justify-end md:justify-start"><button type="button" onClick={handleCreate} disabled={saving || uploadingTaskDocument || !title.trim()} className={`inline-flex items-center gap-2 px-8 py-3 rounded-full bg-brand-red text-white text-[15px] font-black shadow-lg hover:bg-brand-navy transition-colors ${saving || uploadingTaskDocument || !title.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}><Plus size={18} />{uploadingTaskDocument ? 'Uploading...' : saving ? 'Creating...' : 'Create Task'}</button></div>
            </div>
          </div>
        ) : createPanelTab === 'top-priorities' ? (
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between gap-2 mb-3"><p className="text-sm font-semibold text-slate-900">Top 5 Priorities For Today</p><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">{topPriorityTasks.length} active</span></div>
            <div className="space-y-2">{topPriorityTasks.length > 0 ? topPriorityTasks.map((task: any, index: number) => (<label key={task.taskId} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5"><input type="checkbox" checked={task.status === 'done'} onChange={(e) => patchTask(task.taskId, { status: e.target.checked ? 'done' : 'todo' })} className="mt-0.5 h-4 w-4" /><div className="min-w-0"><div className="text-xs font-semibold text-slate-800 truncate">{index + 1}. {task.title || 'Untitled task'}</div><div className="text-[11px] text-slate-500 mt-0.5">Due: {task.dueDate || '-'} - Priority: {task.priority} - Status: {task.status}</div></div></label>)) : (<div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">No active priorities available.</div>)}</div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between mb-2"><div><h4 className="text-lg font-semibold text-slate-900">Daily Execution Rows</h4><p className="text-xs text-slate-500">Check a day when done, or assign it to TaskHub in one click.</p></div></div>
            {weeklyError && <div className="text-xs rounded-md border border-red-200 bg-red-50 text-red-700 px-2.5 py-2">{weeklyError}</div>}
            {!state || !updateState ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">Weekly planning data is not available in this view.</div>
            ) : (
              <div className="space-y-4">
                {!currentWeek ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">No weekly goals are available yet.</div>
                ) : (
                  <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.85),rgba(255,255,255,1))] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-red">
                          {currentWeeklyGroup?.weekSummaryLabel || 'Weekly plan'}
                        </div>
                        <div>
                          <h5 className="text-xl font-semibold text-slate-900">{currentWeek.text || currentWeeklyGroup?.weekLabel || 'Untitled Weekly Goal'}</h5>
                          <p className="mt-1 text-[13px] text-slate-500">{getWeekBreadcrumb(currentWeek.id)}</p>
                        </div>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,190px)_minmax(0,190px)_minmax(0,190px)]">
                        <div className="w-full max-w-[190px]">
                          <WeeklyTaskPeriodPicker {...weeklyPeriodPicker} compactTrigger={true} dropdownAlign="right" />
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Schedule Window</div>
                          <div className="mt-1 text-[15px] font-semibold text-slate-900">{currentWeeklyGroup?.weekRangeLabel}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Weekly Progress</div>
                          <div className="mt-1 text-[15px] font-semibold text-slate-900">{currentWeekDays.filter((day: any) => day.completed).length}/{currentWeekDays.length || 7} days done</div>
                        </div>
                      </div>
                    </div>

                    {currentWeekDays.length ? (
                      <>
                        <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-2.5">
                          <div className="flex flex-wrap gap-2">
                            {currentWeekDays.slice(0, 7).map((day: any, idx: number) => {
                              const isSelected = selectedDay?.id === day.id;
                              const dayInfo = getDayDisplay(currentWeekStart, idx);
                              return (
                                <button
                                  key={day.id}
                                  type="button"
                                  onClick={() => setSelectedDayByWeek((prev: any) => ({ ...prev, [currentWeek.id]: day.id }))}
                                  className={`min-w-[86px] rounded-[10px] border px-3 py-2 text-left transition ${
                                    isSelected
                                      ? 'border-brand-red bg-white text-brand-red'
                                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em]">{dayInfo.weekday}</div>
                                  <div className="mt-0.5 text-[13px] font-medium">{dayInfo.dateText}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {selectedDay ? (
                          <div className="mt-3 rounded-[24px] border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-2.5 border-b border-slate-100 pb-3 md:flex-row md:items-center md:justify-between">
                              <label className="flex min-w-0 items-center gap-3">
                                <input type="checkbox" checked={selectedDay.completed} onChange={() => toggleDaily(selectedDay.id)} disabled={!canManageWeeklyRows} className="h-4 w-4" />
                                <input type="text" value={selectedDay.text} readOnly className="min-w-0 flex-1 border-b border-slate-200 bg-transparent pb-1 text-[15px] font-medium text-slate-900 outline-none" />
                              </label>
                              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-500">
                                {assignmentsForSelectedDay.length} linked task{assignmentsForSelectedDay.length === 1 ? '' : 's'}
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                              <div>
                                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Task *</label>
                                <input type="text" value={assignDraftByDay[selectedDay.id]?.title ?? selectedDay.text ?? ''} onChange={(e) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: e.target.value, assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: prev[selectedDay.id]?.dueDate || '', priority: prev[selectedDay.id]?.priority || 'medium', status: prev[selectedDay.id]?.status || 'todo', description: prev[selectedDay.id]?.description || '', projectId: prev[selectedDay.id]?.projectId || '' } }))} className={CREATE_INPUT_CLASS} placeholder="Task name" />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Assignee</label>
                                <ThemedSelect value={assignDraftByDay[selectedDay.id]?.assigneeId ?? me.id ?? ''} onChange={(value) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: value, dueDate: prev[selectedDay.id]?.dueDate || '', priority: prev[selectedDay.id]?.priority || 'medium', status: prev[selectedDay.id]?.status || 'todo', description: prev[selectedDay.id]?.description || '', projectId: prev[selectedDay.id]?.projectId || '' } }))} options={createAssigneeOptions} placeholder="Unassigned" disabled={employeesLoading} forceOpenDown={true} />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Due date</label>
                                <ThemedDatePicker value={assignDraftByDay[selectedDay.id]?.dueDate ?? ''} onChange={(value) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: value, priority: prev[selectedDay.id]?.priority || 'medium', status: prev[selectedDay.id]?.status || 'todo', description: prev[selectedDay.id]?.description || '', projectId: prev[selectedDay.id]?.projectId || '' } }))} forceOpenDown={true} />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Priority</label>
                                <ThemedSelect value={assignDraftByDay[selectedDay.id]?.priority ?? 'medium'} onChange={(value) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: prev[selectedDay.id]?.dueDate || '', priority: value, status: prev[selectedDay.id]?.status || 'todo', description: prev[selectedDay.id]?.description || '', projectId: prev[selectedDay.id]?.projectId || '' } }))} options={priorityOptions} forceOpenDown={true} />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Status</label>
                                <ThemedSelect value={assignDraftByDay[selectedDay.id]?.status ?? 'todo'} onChange={(value) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: prev[selectedDay.id]?.dueDate || '', priority: prev[selectedDay.id]?.priority || 'medium', status: value, description: prev[selectedDay.id]?.description || '', projectId: prev[selectedDay.id]?.projectId || '' } }))} options={statusOptions} forceOpenDown={true} />
                              </div>
                            </div>

                            <div className="mt-3">
                              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Description</label>
                              <textarea value={assignDraftByDay[selectedDay.id]?.description ?? ''} onChange={(e) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: prev[selectedDay.id]?.dueDate || '', priority: prev[selectedDay.id]?.priority || 'medium', status: prev[selectedDay.id]?.status || 'todo', description: e.target.value, projectId: prev[selectedDay.id]?.projectId || '' } }))} className="w-full min-h-[88px] rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[14px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15" placeholder="Add task description..." />
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
                              <div className="md:col-span-2">
                                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Project</label>
                                <ThemedSelect value={assignDraftByDay[selectedDay.id]?.projectId ?? ''} onChange={(value) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: prev[selectedDay.id]?.dueDate || '', priority: prev[selectedDay.id]?.priority || 'medium', status: prev[selectedDay.id]?.status || 'todo', description: prev[selectedDay.id]?.description || '', projectId: value } }))} options={projectSelectOptions} placeholder="No project" disabled={projectsLoading} forceOpenDown={true} />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Document</label>
                                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(e) => setWeeklyTaskDocumentByDay((prev: any) => ({ ...prev, [selectedDay.id]: e.target.files?.[0] || null }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-brand-red" />
                                {weeklyTaskDocumentByDay[selectedDay.id] ? <p className="mt-1 truncate text-[11px] text-slate-500">{weeklyTaskDocumentByDay[selectedDay.id]?.name}</p> : null}
                              </div>
                              <div className="md:col-span-3">
                                <button type="button" onClick={() => createTaskFromDay(selectedDay, currentWeeklyGroup)} disabled={assigningDayTaskId === selectedDay.id} className="inline-flex items-center gap-2 rounded-full bg-brand-red px-8 py-3 text-[15px] font-black text-white shadow-lg transition-colors hover:bg-brand-navy disabled:opacity-60">
                                  <Plus size={18} />
                                  {assigningDayTaskId === selectedDay.id ? 'Assigning...' : 'Create Task'}
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Assigned employees and tasks for this day</div>
                              <div className="space-y-2">
                                {assignmentsForSelectedDay.length ? assignmentsForSelectedDay.map((task: any) => (
                                  <div key={task.taskId} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700">
                                    <div className="font-medium text-slate-800">{task.title || 'Untitled task'}</div>
                                    <div className="mt-0.5 text-slate-500">{employeeNameById.get(task.assigneeId || '') || task.assigneeId || 'Unassigned'} - {task.status || 'todo'} - {task.priority || 'medium'}</div>
                                  </div>
                                )) : (
                                  <div className="text-xs text-slate-500">No task assigned for this day yet.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3">
                        <div className="text-xs text-slate-500">No days mapped for this selected week.</div>
                        {canManageWeeklyRows ? (
                          <button type="button" onClick={() => createDaysForWeek(currentWeek.id)} className="rounded-md bg-brand-red px-3 py-1.5 text-xs text-white transition-colors hover:bg-brand-navy">Generate 7 days</button>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          <button type="button" onClick={() => setTaskFilterMode('all')} className={`px-4 py-1.5 text-[13px] rounded-full ${taskFilterMode === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>All</button>
          <button type="button" onClick={() => setTaskFilterMode('me')} className={`px-4 py-1.5 text-[13px] rounded-full ${taskFilterMode === 'me' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Me</button>
          <button type="button" onClick={() => setTaskFilterMode('assigned')} className={`px-4 py-1.5 text-[13px] rounded-full ${taskFilterMode === 'assigned' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Assigned</button>
        </div>
        <div className="flex items-center gap-2"><input value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} placeholder="Search by employee ID or name..." className="w-full md:w-80 rounded-full border border-slate-200 px-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />{taskSearch.trim() && (<button type="button" onClick={() => setTaskSearch('')} className="text-[12px] text-slate-500 hover:text-brand-red">Clear</button>)}</div>
      </div>

      <SpacesTaskTableSection columns={columns} isRenamingColumnId={isRenamingColumnId} renameDraft={renameDraft} setRenameDraft={setRenameDraft} setIsRenamingColumnId={setIsRenamingColumnId} setActiveColumnMenuId={setActiveColumnMenuId} sortedTasks={sortedTasks} setColumns={setColumns} setError={setError} activeColumnMenuId={activeColumnMenuId} setColumnToDelete={setColumnToDelete} handleAddColumn={handleAddColumn} spacesLoading={spacesLoading} paginatedTasks={paginatedTasks} canEditTask={canEditTask} isTaskLocked={isTaskLocked} getTaskRowClasses={getTaskRowClasses} patchTask={patchTask} projectNameById={projectNameById} mode={mode} me={me} assigneeOptionsForTask={assigneeOptionsForTask} employeesLoading={employeesLoading} canEditDueDate={canEditDueDate} priorityOptions={priorityOptions} canChangeStatus={canChangeStatus} statusOptions={statusOptions} forceDownloadDocument={forceDownloadDocument} canCommentOnTask={canCommentOnTask} setCommentTaskId={setCommentTaskId} setModalStatus={setModalStatus} canValidateTask={canValidateTask} canDeleteTask={canDeleteTask} handleApproveTask={handleApproveTask} handleRejectTask={handleRejectTask} navigate={navigate} setEditingTask={setEditingTask} setEditingTaskMode={setEditingTaskMode} setEditingTaskDraft={setEditingTaskDraft} setDeleteTaskModal={setDeleteTaskModal} taskPage={taskPage} TASKS_PER_PAGE={TASKS_PER_PAGE} setTaskPage={setTaskPage} visibleTaskPages={visibleTaskPages} totalTaskPages={totalTaskPages} API_BASE={API_BASE} getAuthHeaders={getAuthHeaders} />

      <SpacesTaskModals activeCommentTask={activeCommentTask} setCommentTaskId={setCommentTaskId} setCommentDraft={setCommentDraft} commentDraft={commentDraft} me={me} editingCommentId={editingCommentId} setEditingCommentId={setEditingCommentId} editCommentDraft={editCommentDraft} setEditCommentDraft={setEditCommentDraft} API_BASE={API_BASE} getAuthHeaders={getAuthHeaders} setTasks={setTasks} setError={setError} mode={mode} modalStatus={modalStatus} setModalStatus={setModalStatus} handleAddComment={handleAddComment} submittingComment={submittingComment} columnToDelete={columnToDelete} setColumnToDelete={setColumnToDelete} setColumns={setColumns} sortedTasks={sortedTasks} commentToDeleteId={commentToDeleteId} setCommentToDeleteId={setCommentToDeleteId} deleteTaskModal={deleteTaskModal} setDeleteTaskModal={setDeleteTaskModal} rejectTaskModal={rejectTaskModal} rejectFeedbackDraft={rejectFeedbackDraft} setRejectFeedbackDraft={setRejectFeedbackDraft} rejectingTask={rejectingTask} confirmRejectTask={confirmRejectTask} editingTask={editingTask} editingTaskMode={editingTaskMode} editingTaskDraft={editingTaskDraft} setEditingTaskDraft={setEditingTaskDraft} assignableEmployees={assignableEmployees} forceDownloadDocument={forceDownloadDocument} patchTask={patchTask} deleteTask={deleteTask} setEditingTask={setEditingTask} />
    </>
  );
};

export default SpacesMainSections;
