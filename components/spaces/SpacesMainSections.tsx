import React from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { WeeklyTaskPeriodPicker } from './SpacesFormControls';
import SpacesTaskCreateModal from './SpacesTaskCreateModal';
import SpacesTaskTableSection from './SpacesTaskTableSection';
import SpacesTaskModals from './SpacesTaskModals';

const SpacesMainSections: React.FC<any> = (props) => {
  const {
    me,
    title,
    setTitle,
    assigneeId,
    setAssigneeId,
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
    error,
    isTaskCreateModalOpen,
    openTaskCreateModal,
    closeTaskCreateModal,
    createTaskPlannerEnabled,
    setCreateTaskPlannerEnabled,
    createTaskPlannerWeekId,
    setCreateTaskPlannerWeekId,
    plannerWeekOptions,
    createTaskPlannerDayId,
    setCreateTaskPlannerDayId,
    plannerDayOptions,
    plannerSummary,
    topPriorityTasks,
    patchTask,
    deleteTask,
    weeklyError,
    state,
    updateState,
    selectedWeeklyDay,
    selectedWeeklyTaskGroup,
    weeklyPeriodPicker,
    getWeekBreadcrumb,
    getWeekStartDate,
    getDayDisplay,
    setSelectedDayByWeek,
    tasks,
    toggleDaily,
    canManageWeeklyRows,
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
  const selectedDay = selectedWeeklyDay || currentWeekDays[0] || null;
  const selectedDayIndex = selectedDay ? currentWeekDays.findIndex((day: any) => day.id === selectedDay.id) : -1;
  const selectedDayInfo = selectedDay ? getDayDisplay(currentWeekStart, Math.max(selectedDayIndex, 0)) : null;
  const assignmentsForSelectedDay = selectedDay
    ? tasks.filter((task: any) => String(task?.customFields?.dailyGoalId || '').trim() === selectedDay.id)
    : [];
  const taskProgressByDay = tasks.reduce((summaryMap: Map<string, { total: number; completed: number }>, task: any) => {
    const dailyGoalId = String(task?.customFields?.dailyGoalId || '').trim();
    if (!dailyGoalId) return summaryMap;

    const currentSummary = summaryMap.get(dailyGoalId) || { total: 0, completed: 0 };
    currentSummary.total += 1;
    if (task.status === 'done') {
      currentSummary.completed += 1;
    }
    summaryMap.set(dailyGoalId, currentSummary);
    return summaryMap;
  }, new Map<string, { total: number; completed: number }>());
  const isCompletedPriorityStatus = (status: string) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    return normalizedStatus === 'review' || normalizedStatus === 'done';
  };
  const completedTopPriorities = topPriorityTasks.filter((task: any) => isCompletedPriorityStatus(task.status)).length;
  const completedWeekDays = currentWeekDays.filter((day: any) => day.completed).length;
  const currentWeekCode = String(currentWeeklyGroup?.weekLabel || '').trim().toUpperCase();
  const today = new Date();
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const currentWeekTitle = (() => {
    const weekText = String(currentWeek?.text || '').trim();
    const weekDetails = String(currentWeek?.details || '').trim();

    if (weekText && weekText.toUpperCase() !== currentWeekCode) return weekText;
    if (weekDetails) return weekDetails;
    if (weekText) return weekText;
    return 'Untitled Weekly Goal';
  })();

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-8 rounded-full bg-brand-red" />
            <span className="text-[15px] text-slate-500">Task Hub</span>
          </div>
          <button
            type="button"
            onClick={() => openTaskCreateModal()}
            className="inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-3 text-[15px] font-black text-white shadow-lg transition-colors hover:bg-brand-navy"
          >
            <Plus size={18} />
            Create Task
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_340px]">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 space-y-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-slate-900">Weekly Planner</h4>
                  {currentWeekDays.length ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-600">
                      {completedWeekDays}/{currentWeekDays.length} done
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">Click a day to review planned execution and linked tasks.</p>
              </div>
              {weeklyError ? (
                <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-700">{weeklyError}</div>
              ) : null}
            </div>

            {!state || !updateState ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">Weekly planning data is not available in this view.</div>
            ) : !currentWeek ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">No weekly goals are available yet.</div>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.85),rgba(255,255,255,1))] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div>
                      <h5 className="text-xl font-semibold text-slate-900">{currentWeekTitle}</h5>
                      <p className="mt-1 text-[13px] text-slate-500">
                        {currentWeeklyGroup?.breadcrumbLabel || getWeekBreadcrumb(currentWeek.id)}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,142px)_minmax(0,142px)]">
                    <div className="w-full max-w-[142px]">
                      <WeeklyTaskPeriodPicker {...weeklyPeriodPicker} compactTrigger={true} dropdownAlign="right" />
                    </div>
                    <div className="flex min-h-[56px] flex-col justify-center rounded-[16px] border border-slate-200 bg-white px-2.5 py-1.5">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Schedule Window</div>
                      <div className="mt-0.5 text-[13px] font-semibold text-slate-900">{currentWeeklyGroup?.weekRangeLabel}</div>
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
                          const dayTaskProgress = taskProgressByDay.get(day.id) || { total: 0, completed: 0 };
                          const dayDate = new Date(currentWeekStart);
                          dayDate.setDate(currentWeekStart.getDate() + idx);
                          const normalizedDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
                          const isToday = normalizedDay === normalizedToday;
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => setSelectedDayByWeek((prev: any) => ({ ...prev, [currentWeek.id]: day.id }))}
                              className={`min-w-[86px] rounded-[10px] border px-3 py-2 text-left transition ${
                                isSelected && isToday
                                  ? 'border-amber-300 bg-[linear-gradient(180deg,rgba(255,251,235,1),rgba(255,247,237,1))] text-amber-700 shadow-[0_10px_24px_rgba(245,158,11,0.14)]'
                                  : isSelected
                                  ? 'border-brand-red bg-white text-brand-red'
                                  : isToday
                                    ? 'border-amber-200 bg-amber-50/80 text-amber-700 hover:border-amber-300 hover:bg-amber-50'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em]">{dayInfo.weekday}</div>
                              <div className="mt-0.5 text-[13px] font-medium">{dayInfo.dateText}</div>
                              <div className={`mt-1 text-[11px] font-medium ${
                                isSelected && isToday
                                  ? 'text-amber-600'
                                  : isSelected
                                    ? 'text-brand-red/80'
                                    : isToday
                                      ? 'text-amber-500'
                                      : 'text-slate-400'
                              }`}>
                                {dayTaskProgress.completed}/{dayTaskProgress.total}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedDay ? (
                      <div className="mt-3 rounded-[24px] border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <label className="flex min-w-0 items-center gap-3">
                              <input type="checkbox" checked={selectedDay.completed} onChange={() => toggleDaily(selectedDay.id)} disabled={!canManageWeeklyRows} className="h-4 w-4" />
                              <input type="text" value={selectedDay.text} readOnly className="min-w-0 flex-1 border-b border-slate-200 bg-transparent pb-1 text-[15px] font-medium text-slate-900 outline-none" />
                            </label>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                              {selectedDayInfo ? <span>{selectedDayInfo.weekday} · {selectedDayInfo.dateText}</span> : null}
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{assignmentsForSelectedDay.length} linked task{assignmentsForSelectedDay.length === 1 ? '' : 's'}</span>
                              {selectedDay.completed ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                                  <CheckCircle2 size={12} />
                                  Completed
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openTaskCreateModal({ plannerEnabled: true, weeklyGroup: currentWeeklyGroup, day: selectedDay })}
                            className="inline-flex items-center gap-2 rounded-full bg-brand-red px-5 py-2.5 text-[14px] font-black text-white shadow-lg transition-colors hover:bg-brand-navy"
                          >
                            <Plus size={16} />
                            Create Task
                          </button>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tasks On Selected Day</div>
                          <div className="space-y-2">
                            {assignmentsForSelectedDay.length ? assignmentsForSelectedDay.map((task: any) => (
                              <div key={task.taskId} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="min-w-0">
                                    <div className="truncate text-[14px] font-semibold text-slate-900">{task.title || 'Untitled task'}</div>
                                    <div className="mt-1 text-[12px] text-slate-500">
                                      {employeeNameById.get(task.assigneeId || '') || task.assigneeId || 'Unassigned'}
                                      {task.dueDate ? ` · Due ${task.dueDate}` : ''}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">{task.priority || 'medium'}</span>
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">{task.status || 'todo'}</span>
                                    {task.projectId ? (
                                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">{projectNameById.get(task.projectId) || task.projectId}</span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            )) : (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-[13px] text-slate-500">
                                No tasks planned for this day yet. Use <span className="font-semibold text-slate-700">Create Task</span> to add one from the shared task flow.
                              </div>
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

          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Top Priorities</h4>
                <p className="mt-1 text-[12px] text-slate-500">Priority management for the most important active tasks.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {completedTopPriorities}/{topPriorityTasks.length} done
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {topPriorityTasks.length > 0 ? topPriorityTasks.map((task: any, index: number) => (
                <label
                  key={task.taskId}
                  className={`flex items-start gap-3 rounded-2xl border px-3 py-3 transition-colors ${
                    isCompletedPriorityStatus(task.status)
                      ? 'border-emerald-200 bg-emerald-50/80'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isCompletedPriorityStatus(task.status)}
                    onChange={(e) => patchTask(task.taskId, { status: e.target.checked ? 'done' : 'todo' })}
                    className={`mt-0.5 h-4 w-4 ${isCompletedPriorityStatus(task.status) ? 'accent-emerald-600' : ''}`}
                  />
                  <div className={`min-w-0 ${isCompletedPriorityStatus(task.status) ? '[&>div]:line-through [&>div]:decoration-2 [&>div]:text-emerald-700 [&>div:last-child]:text-emerald-600' : ''}`}>
                    <div className={`truncate text-[13px] font-semibold ${isCompletedPriorityStatus(task.status) ? 'text-emerald-700 line-through decoration-2' : 'text-slate-800'}`}>{index + 1}. {task.title || 'Untitled task'}</div>
                    <div className="mt-1 text-[11px] text-slate-500">Due: {task.dueDate || '-'} · Priority: {task.priority} · Status: {task.status}</div>
                  </div>
                </label>
              )) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[13px] text-slate-500">No active priorities available.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-slate-900">Unified Task Table</h4>
          <p className="mt-1 text-[12px] text-slate-500">Search, filter, and manage all tasks from the same system, including planned weekly work.</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
            <button type="button" onClick={() => setTaskFilterMode('all')} className={`px-4 py-1.5 text-[13px] rounded-full ${taskFilterMode === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>All</button>
            <button type="button" onClick={() => setTaskFilterMode('me')} className={`px-4 py-1.5 text-[13px] rounded-full ${taskFilterMode === 'me' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Me</button>
            <button type="button" onClick={() => setTaskFilterMode('assigned')} className={`px-4 py-1.5 text-[13px] rounded-full ${taskFilterMode === 'assigned' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Assigned</button>
          </div>
          <div className="flex items-center gap-2">
            <input value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} placeholder="Search by employee ID or name..." className="w-full md:w-80 rounded-full border border-slate-200 px-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
            {taskSearch.trim() ? (
              <button type="button" onClick={() => setTaskSearch('')} className="text-[12px] text-slate-500 hover:text-brand-red">Clear</button>
            ) : null}
          </div>
        </div>
      </div>

      <SpacesTaskTableSection columns={columns} isRenamingColumnId={isRenamingColumnId} renameDraft={renameDraft} setRenameDraft={setRenameDraft} setIsRenamingColumnId={setIsRenamingColumnId} setActiveColumnMenuId={setActiveColumnMenuId} sortedTasks={sortedTasks} setColumns={setColumns} setError={setError} activeColumnMenuId={activeColumnMenuId} setColumnToDelete={setColumnToDelete} handleAddColumn={handleAddColumn} spacesLoading={spacesLoading} paginatedTasks={paginatedTasks} canEditTask={canEditTask} isTaskLocked={isTaskLocked} getTaskRowClasses={getTaskRowClasses} patchTask={patchTask} projectNameById={projectNameById} mode={mode} me={me} assigneeOptionsForTask={assigneeOptionsForTask} employeesLoading={employeesLoading} canEditDueDate={canEditDueDate} priorityOptions={priorityOptions} canChangeStatus={canChangeStatus} statusOptions={statusOptions} forceDownloadDocument={forceDownloadDocument} canCommentOnTask={canCommentOnTask} setCommentTaskId={setCommentTaskId} setModalStatus={setModalStatus} canValidateTask={canValidateTask} canDeleteTask={canDeleteTask} handleApproveTask={handleApproveTask} handleRejectTask={handleRejectTask} navigate={navigate} setEditingTask={setEditingTask} setEditingTaskMode={setEditingTaskMode} setEditingTaskDraft={setEditingTaskDraft} setDeleteTaskModal={setDeleteTaskModal} taskPage={taskPage} TASKS_PER_PAGE={TASKS_PER_PAGE} setTaskPage={setTaskPage} visibleTaskPages={visibleTaskPages} totalTaskPages={totalTaskPages} API_BASE={API_BASE} getAuthHeaders={getAuthHeaders} />

      <SpacesTaskCreateModal
        open={isTaskCreateModalOpen}
        onClose={closeTaskCreateModal}
        onSubmit={handleCreate}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        assigneeId={assigneeId}
        setAssigneeId={setAssigneeId}
        createAssigneeOptions={createAssigneeOptions}
        employeesLoading={employeesLoading}
        dueDate={dueDate}
        setDueDate={setDueDate}
        priority={priority}
        setPriority={setPriority}
        priorityOptions={priorityOptions}
        status={status}
        setStatus={setStatus}
        statusOptions={statusOptions}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        projectSelectOptions={projectSelectOptions}
        projectsLoading={projectsLoading}
        taskDocumentFile={taskDocumentFile}
        setTaskDocumentFile={setTaskDocumentFile}
        saving={saving}
        uploadingTaskDocument={uploadingTaskDocument}
        error={error}
        addToWeeklyPlanner={createTaskPlannerEnabled}
        setAddToWeeklyPlanner={setCreateTaskPlannerEnabled}
        plannerWeekOptions={plannerWeekOptions}
        plannerWeekId={createTaskPlannerWeekId}
        setPlannerWeekId={setCreateTaskPlannerWeekId}
        plannerDayOptions={plannerDayOptions}
        plannerDayId={createTaskPlannerDayId}
        setPlannerDayId={setCreateTaskPlannerDayId}
        plannerSummary={plannerSummary}
      />

      <SpacesTaskModals activeCommentTask={activeCommentTask} setCommentTaskId={setCommentTaskId} setCommentDraft={setCommentDraft} commentDraft={commentDraft} me={me} editingCommentId={editingCommentId} setEditingCommentId={setEditingCommentId} editCommentDraft={editCommentDraft} setEditCommentDraft={setEditCommentDraft} API_BASE={API_BASE} getAuthHeaders={getAuthHeaders} setTasks={setTasks} setError={setError} mode={mode} modalStatus={modalStatus} setModalStatus={setModalStatus} handleAddComment={handleAddComment} submittingComment={submittingComment} columnToDelete={columnToDelete} setColumnToDelete={setColumnToDelete} setColumns={setColumns} sortedTasks={sortedTasks} commentToDeleteId={commentToDeleteId} setCommentToDeleteId={setCommentToDeleteId} deleteTaskModal={deleteTaskModal} setDeleteTaskModal={setDeleteTaskModal} rejectTaskModal={rejectTaskModal} rejectFeedbackDraft={rejectFeedbackDraft} setRejectFeedbackDraft={setRejectFeedbackDraft} rejectingTask={rejectingTask} confirmRejectTask={confirmRejectTask} editingTask={editingTask} editingTaskMode={editingTaskMode} editingTaskDraft={editingTaskDraft} setEditingTaskDraft={setEditingTaskDraft} assignableEmployees={assignableEmployees} forceDownloadDocument={forceDownloadDocument} patchTask={patchTask} deleteTask={deleteTask} setEditingTask={setEditingTask} />
    </>
  );
};

export default SpacesMainSections;
