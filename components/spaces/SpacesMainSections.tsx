import React from 'react';
import { Plus } from 'lucide-react';
import { CREATE_INPUT_CLASS, ThemedDatePicker, ThemedSelect } from './SpacesFormControls';
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
    weeklyError,
    state,
    updateState,
    setWeeklyRangeFilter,
    weeklyRangeFilter,
    filteredWeeklyTaskGroups,
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
            <div className="space-y-2">{topPriorityTasks.length > 0 ? topPriorityTasks.map((task: any, index: number) => (<label key={task.taskId} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5"><input type="checkbox" checked={task.status === 'done'} onChange={(e) => patchTask(task.taskId, { status: e.target.checked ? 'done' : 'todo' })} className="mt-0.5 h-4 w-4" /><div className="min-w-0"><div className="text-xs font-semibold text-slate-800 truncate">{index + 1}. {task.title || 'Untitled task'}</div><div className="text-[11px] text-slate-500 mt-0.5">Due: {task.dueDate || '—'} · Priority: {task.priority} · Status: {task.status}</div></div></label>)) : (<div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">No active priorities available.</div>)}</div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between mb-2"><div><h4 className="text-lg font-semibold text-slate-900">Daily Execution Rows</h4><p className="text-xs text-slate-500">Check a day when done, or assign it to TaskHub in one click.</p></div></div>
            {weeklyError && <div className="text-xs rounded-md border border-red-200 bg-red-50 text-red-700 px-2.5 py-2">{weeklyError}</div>}
            {!state || !updateState ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">Weekly planning data is not available in this view.</div>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
                  <button type="button" onClick={() => setWeeklyRangeFilter('this-week')} className={`px-3 py-1.5 text-[12px] rounded-full transition-colors ${weeklyRangeFilter === 'this-week' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>This Week</button>
                  <button type="button" onClick={() => setWeeklyRangeFilter('next-week')} className={`px-3 py-1.5 text-[12px] rounded-full transition-colors ${weeklyRangeFilter === 'next-week' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Next Week</button>
                  <button type="button" onClick={() => setWeeklyRangeFilter('two-weeks')} className={`px-3 py-1.5 text-[12px] rounded-full transition-colors ${weeklyRangeFilter === 'two-weeks' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>2 Weeks</button>
                  <button type="button" onClick={() => setWeeklyRangeFilter('month')} className={`px-3 py-1.5 text-[12px] rounded-full transition-colors ${weeklyRangeFilter === 'month' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>This Month</button>
                </div>
                {filteredWeeklyTaskGroups.map(({ week, days }: any) => (
                  <div key={week.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div><div className="text-sm font-semibold text-slate-900">{week.text || 'Untitled Weekly Goal'}</div><div className="text-[11px] text-slate-500 mt-0.5">{getWeekBreadcrumb(week.id)}</div></div>
                      <div className="text-[11px] rounded-full bg-white border border-slate-200 px-2 py-1 text-slate-600">{days.filter((d: any) => d.completed).length}/{days.length || 7} done</div>
                    </div>
                    {!!days.length && (<><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex flex-wrap gap-2.5">{days.slice(0, 7).map((day: any, idx: number) => { const selectedDayId = selectedDayByWeek[week.id] || days[0].id; const isSelected = selectedDayId === day.id; const startDate = getSundayStart(getWeekStartDate(week, days)); const dayInfo = getDayDisplay(startDate, idx); return (<button key={day.id} type="button" onClick={() => setSelectedDayByWeek((prev: any) => ({ ...prev, [week.id]: day.id }))} className={`rounded-md border px-3 py-2 text-left transition ${isSelected ? 'border-brand-red bg-red-50 text-brand-red' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}><div className="text-[11px] font-semibold uppercase tracking-wide">{dayInfo.weekday}</div><div className="text-xs mt-0.5">{dayInfo.dateText}</div></button>); })}</div></div>{(() => { const selectedDayId = selectedDayByWeek[week.id] || days[0].id; const selectedDay = days.find((d: any) => d.id === selectedDayId) || days[0]; const assignmentsForDay = tasks.filter((task: any) => String(task?.customFields?.dailyGoalId || '').trim() === selectedDay.id); return (<div className="mt-2 rounded-xl border border-slate-200 bg-white p-4"><label className="flex items-center gap-2"><input type="checkbox" checked={selectedDay.completed} onChange={() => toggleDaily(selectedDay.id)} disabled={!canManageWeeklyRows} /><input type="text" value={selectedDay.text} readOnly className="flex-1 bg-transparent border-b border-slate-200 outline-none text-sm" /></label><div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3"><div><label className="block text-[13px] font-semibold text-slate-700 mb-2">Task *</label><input type="text" value={assignDraftByDay[selectedDay.id]?.title ?? selectedDay.text ?? ''} onChange={(e) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: e.target.value, assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: prev[selectedDay.id]?.dueDate || '', priority: prev[selectedDay.id]?.priority || 'medium', status: prev[selectedDay.id]?.status || 'todo', description: prev[selectedDay.id]?.description || '', projectId: prev[selectedDay.id]?.projectId || '' } }))} className={CREATE_INPUT_CLASS} placeholder="Task name" /></div><div><label className="block text-[13px] font-semibold text-slate-700 mb-2">Assignee</label><ThemedSelect value={assignDraftByDay[selectedDay.id]?.assigneeId ?? me.id ?? ''} onChange={(value) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: value, dueDate: prev[selectedDay.id]?.dueDate || '', priority: prev[selectedDay.id]?.priority || 'medium', status: prev[selectedDay.id]?.status || 'todo', description: prev[selectedDay.id]?.description || '', projectId: prev[selectedDay.id]?.projectId || '' } }))} options={createAssigneeOptions} placeholder="Unassigned" disabled={employeesLoading} forceOpenDown={true} /></div><div><label className="block text-[13px] font-semibold text-slate-700 mb-2">Due date</label><ThemedDatePicker value={assignDraftByDay[selectedDay.id]?.dueDate ?? ''} onChange={(value) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: value, priority: prev[selectedDay.id]?.priority || 'medium', status: prev[selectedDay.id]?.status || 'todo', description: prev[selectedDay.id]?.description || '', projectId: prev[selectedDay.id]?.projectId || '' } }))} forceOpenDown={true} /></div><div><label className="block text-[13px] font-semibold text-slate-700 mb-2">Priority</label><ThemedSelect value={assignDraftByDay[selectedDay.id]?.priority ?? 'medium'} onChange={(value) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: prev[selectedDay.id]?.dueDate || '', priority: value, status: prev[selectedDay.id]?.status || 'todo', description: prev[selectedDay.id]?.description || '', projectId: prev[selectedDay.id]?.projectId || '' } }))} options={priorityOptions} forceOpenDown={true} /></div><div><label className="block text-[13px] font-semibold text-slate-700 mb-2">Status</label><ThemedSelect value={assignDraftByDay[selectedDay.id]?.status ?? 'todo'} onChange={(value) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: prev[selectedDay.id]?.dueDate || '', priority: prev[selectedDay.id]?.priority || 'medium', status: value, description: prev[selectedDay.id]?.description || '', projectId: prev[selectedDay.id]?.projectId || '' } }))} options={statusOptions} forceOpenDown={true} /></div></div><div className="mt-3"><label className="block text-[13px] font-semibold text-slate-700 mb-2">Description</label><textarea value={assignDraftByDay[selectedDay.id]?.description ?? ''} onChange={(e) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: prev[selectedDay.id]?.dueDate || '', priority: prev[selectedDay.id]?.priority || 'medium', status: prev[selectedDay.id]?.status || 'todo', description: e.target.value, projectId: prev[selectedDay.id]?.projectId || '' } }))} className="w-full min-h-[96px] rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[14px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15" placeholder="Add task description..." /></div><div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end"><div className="md:col-span-2"><label className="block text-[13px] font-semibold text-slate-700 mb-2">Project</label><ThemedSelect value={assignDraftByDay[selectedDay.id]?.projectId ?? ''} onChange={(value) => setAssignDraftByDay((prev: any) => ({ ...prev, [selectedDay.id]: { title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '', assigneeId: prev[selectedDay.id]?.assigneeId || me.id || '', dueDate: prev[selectedDay.id]?.dueDate || '', priority: prev[selectedDay.id]?.priority || 'medium', status: prev[selectedDay.id]?.status || 'todo', description: prev[selectedDay.id]?.description || '', projectId: value } }))} options={projectSelectOptions} placeholder="No project" disabled={projectsLoading} forceOpenDown={true} /></div><div><label className="block text-[13px] font-semibold text-slate-700 mb-2">Document</label><input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(e) => setWeeklyTaskDocumentByDay((prev: any) => ({ ...prev, [selectedDay.id]: e.target.files?.[0] || null }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-brand-red" />{weeklyTaskDocumentByDay[selectedDay.id] ? <p className="mt-1 text-[11px] text-slate-500 truncate">{weeklyTaskDocumentByDay[selectedDay.id]?.name}</p> : null}</div><div className="md:col-span-3"><button type="button" onClick={() => createTaskFromDay(selectedDay, week)} disabled={assigningDayTaskId === selectedDay.id} className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-brand-red text-white text-[15px] font-black shadow-lg hover:bg-brand-navy transition-colors disabled:opacity-60"><Plus size={18} />{assigningDayTaskId === selectedDay.id ? 'Assigning...' : 'Create Task'}</button></div></div><div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2.5"><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Assigned employees and tasks for this day</div><div className="space-y-1.5">{assignmentsForDay.length ? assignmentsForDay.map((task: any) => (<div key={task.taskId} className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"><div className="font-medium text-slate-800">{task.title || 'Untitled task'}</div><div className="text-slate-500 mt-0.5">{employeeNameById.get(task.assigneeId || '') || task.assigneeId || 'Unassigned'} · {task.status || 'todo'} · {task.priority || 'medium'}</div></div>)) : (<div className="text-xs text-slate-500">No task assigned for this day yet.</div>)}</div></div></div>); })()}</>)}
                    {!days.length && (<div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2.5 mt-2"><div className="text-xs text-slate-500">No days mapped.</div>{canManageWeeklyRows && (<button type="button" onClick={() => createDaysForWeek(week.id)} className="text-xs px-2.5 py-1 rounded-md bg-brand-red text-white hover:bg-brand-navy transition-colors">Generate 7 days</button>)}</div>)}
                  </div>
                ))}
                {!filteredWeeklyTaskGroups.length && (<div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">No weekly goals found for selected filter.</div>)}
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

      <SpacesTaskModals activeCommentTask={activeCommentTask} setCommentTaskId={setCommentTaskId} setCommentDraft={setCommentDraft} commentDraft={commentDraft} me={me} editingCommentId={editingCommentId} setEditingCommentId={setEditingCommentId} editCommentDraft={editCommentDraft} setEditCommentDraft={setEditCommentDraft} API_BASE={API_BASE} getAuthHeaders={getAuthHeaders} setTasks={setTasks} setError={setError} mode={mode} modalStatus={modalStatus} setModalStatus={setModalStatus} handleAddComment={handleAddComment} submittingComment={submittingComment} columnToDelete={columnToDelete} setColumnToDelete={setColumnToDelete} setColumns={setColumns} sortedTasks={sortedTasks} commentToDeleteId={commentToDeleteId} setCommentToDeleteId={setCommentToDeleteId} deleteTaskModal={deleteTaskModal} setDeleteTaskModal={setDeleteTaskModal} rejectTaskModal={rejectTaskModal} rejectFeedbackDraft={rejectFeedbackDraft} setRejectFeedbackDraft={setRejectFeedbackDraft} rejectingTask={rejectingTask} confirmRejectTask={confirmRejectTask} editingTask={editingTask} editingTaskMode={editingTaskMode} editingTaskDraft={editingTaskDraft} setEditingTaskDraft={setEditingTaskDraft} assignableEmployees={assignableEmployees} forceDownloadDocument={forceDownloadDocument} patchTask={patchTask} setEditingTask={setEditingTask} />
    </>
  );
};

export default SpacesMainSections;
