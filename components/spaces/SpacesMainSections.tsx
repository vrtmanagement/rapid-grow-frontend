import React, { useState } from 'react';
import { CheckCircle2, Eye, FileText, Paperclip, Plus, UploadCloud, WandSparkles } from 'lucide-react';
import { WeeklyTaskPeriodCanvas, WeeklyTaskPeriodTrigger } from './SpacesFormControls';
import SpacesTaskCreateModal from './SpacesTaskCreateModal';
import SpacesTaskTableSection from './SpacesTaskTableSection';
import SpacesTaskModals from './SpacesTaskModals';

const SpacesMainSections: React.FC<any> = (props) => {
  const [isWeeklyPlannerCanvasOpen, setIsWeeklyPlannerCanvasOpen] = useState(false);
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
    aiAssigning,
    aiAssignFileName,
    handleAiAssignPdfUpload,
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
    canToggleWeeklyDay,
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
  const getTopPriorityCardClasses = (task: any, index: number) => {
    if (isCompletedPriorityStatus(task?.status)) {
      return 'border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100/70';
    }
    if (index % 2 === 0) {
      return 'border border-slate-200 border-l-[3px] border-l-brand-red bg-white hover:bg-[#f7faff]';
    }
    return 'border border-slate-300 border-l-[3px] border-l-slate-400 bg-white hover:bg-[#f7faff]';
  };
  const getTopPriorityPillClasses = (type: 'priority' | 'status' | 'date', value?: string) => {
    if (type === 'priority') {
      const normalizedPriority = String(value || 'medium').trim().toLowerCase();
      if (normalizedPriority === 'high') return 'bg-red-50 text-brand-red';
      if (normalizedPriority === 'low') return 'bg-sky-50 text-sky-700';
      return 'bg-amber-50 text-amber-700';
    }

    if (type === 'status') {
      const normalizedStatus = String(value || 'todo').trim().toLowerCase();
      if (normalizedStatus === 'doing') return 'bg-indigo-50 text-indigo-600';
      if (normalizedStatus === 'done' || normalizedStatus === 'review') return 'bg-emerald-50 text-emerald-700';
      if (normalizedStatus === 'blocked') return 'bg-rose-50 text-rose-600';
      return 'bg-slate-100 text-slate-500';
    }

    return 'bg-slate-50 text-slate-400';
  };
  const getWeeklyTaskCardClasses = (priorityValue?: string) => {
    const normalizedPriority = String(priorityValue || 'medium').trim().toLowerCase();
    if (normalizedPriority === 'high') return 'border border-slate-200 border-t-[3px] border-t-brand-red bg-white hover:bg-[#fff7f7]';
    if (normalizedPriority === 'low') return 'border border-slate-200 border-t-[3px] border-t-sky-400 bg-white hover:bg-[#f5fbff]';
    return 'border border-slate-200 border-t-[3px] border-t-amber-400 bg-white hover:bg-[#fffaf2]';
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
  const handleSelectedDayToggle = async () => {
    if (!selectedDay) return;
    const shouldMarkTasksComplete = !selectedDay.completed;
    await toggleDaily(selectedDay.id);
    if (!shouldMarkTasksComplete) return;

    const eligibleTasks = assignmentsForSelectedDay.filter(
      (task: any) => !isCompletedPriorityStatus(task.status) && (canEditTask(task) || canValidateTask(task)),
    );
    await Promise.all(eligibleTasks.map((task: any) => patchTask(task.taskId, { status: 'done' })));
  };

  return (
    <>
      <div
        className={`-mx-6 overflow-hidden bg-white transition-all duration-300 ease-out ${
          isWeeklyPlannerCanvasOpen ? '-mt-16 mb-4 pt-3' : 'mb-0 pt-0'
        }`}
      >
        <WeeklyTaskPeriodCanvas
          {...weeklyPeriodPicker}
          open={isWeeklyPlannerCanvasOpen}
          onClose={() => setIsWeeklyPlannerCanvasOpen(false)}
        />
      </div>

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

        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1.7fr)]">
          <div className="order-2 flex h-[38rem] min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
            {weeklyError ? (
              <div className="mb-2 shrink-0 self-start rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-700">{weeklyError}</div>
            ) : null}

            {!state || !updateState ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">Weekly planning data is not available in this view.</div>
            ) : !currentWeek ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">No weekly goals are available yet.</div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col pt-1">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h5 className="text-xl font-semibold text-slate-900">{currentWeekTitle}</h5>
                        {currentWeekDays.length ? (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-600">
                            {completedWeekDays}/{currentWeekDays.length} done
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[13px] text-slate-500">
                        {currentWeeklyGroup?.breadcrumbLabel || getWeekBreadcrumb(currentWeek.id)}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,228px)_minmax(0,176px)]">
                    <div className="w-full max-w-[228px]">
                      <WeeklyTaskPeriodTrigger
                        summary={weeklyPeriodPicker.summary}
                        detail={weeklyPeriodPicker.detail}
                        disabled={weeklyPeriodPicker.disabled}
                        compactTrigger={true}
                        open={isWeeklyPlannerCanvasOpen}
                        onToggle={() => setIsWeeklyPlannerCanvasOpen((prev) => !prev)}
                      />
                    </div>
                    <div className="flex min-h-[60px] flex-col justify-center rounded-[16px] border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Schedule Window</div>
                      <div className="mt-1 whitespace-nowrap text-[12px] font-semibold leading-none text-slate-900">{currentWeeklyGroup?.weekRangeLabel}</div>
                    </div>
                  </div>
                </div>

                {currentWeekDays.length ? (
                  <>
                    <div className="mt-4">
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
                              className={`min-w-[68px] rounded-[12px] border px-3 py-2 text-center transition ${
                                isSelected && isToday
                                  ? 'border-amber-300 bg-[linear-gradient(180deg,rgba(255,251,235,1),rgba(255,247,237,1))] text-amber-700 shadow-[0_10px_24px_rgba(245,158,11,0.14)]'
                                  : isSelected
                                    ? 'border-brand-red bg-white text-brand-red'
                                    : isToday
                                      ? 'border-amber-200 bg-amber-50/80 text-amber-700 hover:border-amber-300 hover:bg-amber-50'
                                      : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="text-[10px] font-semibold uppercase tracking-[0.08em]">{dayInfo.weekday.slice(0, 3)}</div>
                              <div className="mt-0.5 text-[13px] font-semibold">{dayInfo.dateText.split(' ')[1] || dayInfo.dateText}</div>
                              <div className="mt-1 text-[10px] font-medium leading-none">
                                {dayTaskProgress.completed}/{dayTaskProgress.total}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedDay ? (
                      <div className="mt-3 -mx-6 -mb-6 flex min-h-0 flex-1 flex-col overflow-hidden border-t border-slate-200 bg-white">
                        <div className="flex flex-col gap-3 border-b border-slate-200 bg-[#eef2f8] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <div className="hidden min-w-0 items-center gap-1 text-[15px] font-medium text-slate-800">
                              <span>{selectedDay.text}</span>
                              {selectedDayInfo ? <span className="text-slate-400">·</span> : null}
                              {selectedDayInfo ? <span className="truncate">{selectedDayInfo.weekday}, {selectedDayInfo.dateText}</span> : null}
                            </div>
                            <div className="mt-1 hidden flex-wrap items-center gap-2 text-[12px] text-slate-400">
                              {selectedDayInfo ? <span>{selectedDayInfo.weekday} · {selectedDayInfo.dateText}</span> : null}
                              <span>{assignmentsForSelectedDay.length} linked task{assignmentsForSelectedDay.length === 1 ? '' : 's'}</span>
                              {selectedDay.completed ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] text-emerald-700">
                                  <CheckCircle2 size={12} />
                                  Completed
                                </span>
                              ) : null}
                            </div>
                            <label className={`flex items-center gap-3 ${canToggleWeeklyDay ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                              <input
                                type="checkbox"
                                checked={selectedDay.completed}
                                onChange={handleSelectedDayToggle}
                                disabled={!canToggleWeeklyDay}
                                className="sr-only"
                              />
                              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                                selectedDay.completed ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'
                              }`}>
                                <span className={`h-2.5 w-2.5 rounded-[2px] ${
                                  selectedDay.completed ? 'bg-emerald-500' : 'bg-transparent'
                                }`} />
                              </span>
                              <span className="min-w-0">
                                <span className="text-[15px] font-medium text-slate-800">
                              {selectedDay.text}
                              {selectedDayInfo ? ` · ${selectedDayInfo.weekday}, ${selectedDayInfo.dateText}` : ''}
                            </span>
                                <span className="ml-2 text-[12px] text-slate-400">
                                  {assignmentsForSelectedDay.length} linked task{assignmentsForSelectedDay.length === 1 ? '' : 's'}
                                </span>
                              </span>
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={() => openTaskCreateModal({ plannerEnabled: true, weeklyGroup: currentWeeklyGroup, day: selectedDay })}
                            className="inline-flex items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 py-2 text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            <Plus size={16} />
                            Add task
                          </button>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
                          {assignmentsForSelectedDay.length ? (
                            <div className="grid gap-3 xl:grid-cols-2">
                              {assignmentsForSelectedDay.map((task: any) => (
                              <div key={task.taskId} className={`rounded-[24px] px-4 py-4 transition-colors ${getWeeklyTaskCardClasses(task.priority)}`}>
                                <div className="flex flex-col gap-3">
                                  <div className="flex min-w-0 flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
                                    <label className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${canEditTask(task) || canValidateTask(task) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                                      <input
                                        type="checkbox"
                                        checked={isCompletedPriorityStatus(task.status)}
                                        onChange={(e) => patchTask(task.taskId, { status: e.target.checked ? 'done' : 'todo' })}
                                        disabled={!canEditTask(task) && !canValidateTask(task)}
                                        className="sr-only"
                                      />
                                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                                        isCompletedPriorityStatus(task.status) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'
                                      }`}>
                                        <span className={`h-3.5 w-3.5 rounded-full border ${
                                          isCompletedPriorityStatus(task.status) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-slate-50'
                                        }`} />
                                      </span>
                                    </label>
                                    <div className="min-w-0 flex-1">
                                      <>
                                        <div className="truncate text-[15px] font-semibold text-slate-900">{task.title || 'Untitled task'}</div>
                                        {String(task.description || '').trim() ? (
                                          <div className="mt-0.5 line-clamp-1 text-[12px] text-slate-500">{String(task.description || '').trim()}</div>
                                        ) : null}
                                      </>
                                      {/*
                                      {task.dueDate ? ` · Due ${task.dueDate}` : ''}
                                      */}
                                    </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium lg:justify-end">
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                                      {String(task.status || 'todo').trim().replace(/^./, (char: string) => char.toUpperCase())}
                                    </span>
                                    <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-700">
                                      {String(task.priority || 'medium').trim().replace(/^./, (char: string) => char.toUpperCase())}
                                    </span>
                                  </div>
                                  </div>

                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                    <div className="space-y-1.5 text-[12px] text-slate-700">
                                      <div className="flex items-center gap-2">
                                        <span className="w-[70px] shrink-0 font-semibold text-slate-800">Assignee:</span>
                                        <span className="text-slate-600">{employeeNameById.get(task.assigneeId || '') || task.assigneeId || 'Unassigned'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="w-[70px] shrink-0 font-semibold text-slate-800">Due:</span>
                                        <span className="text-slate-600">{task.dueDate || '-'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="w-[70px] shrink-0 font-semibold text-slate-800">Created by:</span>
                                        <span className="text-slate-600">{task.createdByName || task.createdByEmpId || 'Unknown'}</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2.5">
                                      {String(task.documentName || '').trim() && task.documentUrl ? (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await forceDownloadDocument(task.documentUrl || '', String(task.documentName || '').trim() || undefined);
                                            } catch (e: any) {
                                              setError(e?.message || 'Failed to download document');
                                            }
                                          }}
                                          className="inline-flex max-w-full items-center gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                                        >
                                          <Paperclip size={14} className="shrink-0 text-slate-500" />
                                          <span className="max-w-[180px] truncate">{String(task.documentName || '').trim()}</span>
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() => navigate(`/spaces/task/${task.taskId}`)}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                                        aria-label="View task"
                                      >
                                        <Eye size={15} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-4">
                              <div className="w-full max-w-md shrink-0 rounded-2xl border border-slate-200/70 bg-slate-100/95 px-5 py-6 text-center">
                                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/80">
                                  <FileText size={22} />
                                </div>
                                <div className="max-w-sm text-[13px] text-slate-500">
                                  No tasks planned. Use <span className="font-medium text-slate-600">Add task</span> to get started.
                                </div>
                              </div>
                            </div>
                          )}
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

          <div className="order-1 flex h-[38rem] min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5">
            <div className="shrink-0 flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Top Priorities</h4>
                <p className="mt-1 text-[12px] text-slate-500">Priority management for the most important active tasks.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {completedTopPriorities}/{topPriorityTasks.length} done
              </span>
            </div>
            <div className="mt-4 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5">
              {topPriorityTasks.length > 0 ? topPriorityTasks.map((task: any, index: number) => (
                <label
                  key={task.taskId}
                  className={`flex items-start gap-3 rounded-2xl px-4 py-3 transition-colors ${getTopPriorityCardClasses(task, index)}`}
                >
                  <input
                    type="checkbox"
                    checked={isCompletedPriorityStatus(task.status)}
                    onChange={(e) => patchTask(task.taskId, { status: e.target.checked ? 'done' : 'todo' })}
                    className={`mt-0.5 h-4 w-4 ${isCompletedPriorityStatus(task.status) ? 'accent-emerald-600' : ''}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`line-clamp-2 text-[13px] font-semibold leading-5 ${isCompletedPriorityStatus(task.status) ? 'text-emerald-700 line-through decoration-2' : 'text-slate-800'}`}>
                      {task.title || 'Untitled task'}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getTopPriorityPillClasses('priority', task.priority)}`}>
                        {String(task.priority || 'medium').trim().replace(/^./, (char: string) => char.toUpperCase())}
                      </span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getTopPriorityPillClasses('status', task.status)}`}>
                        {String(task.status || 'todo').trim().replace(/^./, (char: string) => char.toUpperCase())}
                      </span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getTopPriorityPillClasses('date', task.dueDate)}`}>
                        {task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                      </span>
                    </div>
                  </div>
                  {false && (
                    <>
                    <div className={`truncate text-[13px] font-semibold ${isCompletedPriorityStatus(task.status) ? 'text-emerald-700 line-through decoration-2' : 'text-slate-800'}`}>{task.title || 'Untitled task'}</div>
                    <div className="mt-1 text-[11px] text-slate-500">Due: {task.dueDate || '-'} · Priority: {task.priority} · Status: {task.status}</div>
                    </>
                  )}
                </label>
              )) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[13px] text-slate-500">No active priorities available.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {mode === 'manager' ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <WandSparkles size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-semibold text-slate-900">AI Assign</h4>
                <p className="mt-0.5 truncate text-[12px] text-slate-500">
                  {aiAssigning ? `Processing ${aiAssignFileName || 'PDF'}...` : 'Upload a PDF to create and assign TaskHub items.'}
                </p>
              </div>
            </div>
            <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
              aiAssigning
                ? 'bg-slate-100 text-slate-400'
                : 'bg-brand-red text-white hover:bg-brand-red/90'
            }`}>
              <UploadCloud size={16} />
              {aiAssigning ? 'Assigning...' : 'Upload PDF'}
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={aiAssigning}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  event.target.value = '';
                  handleAiAssignPdfUpload(file);
                }}
              />
            </label>
          </div>
        </div>
      ) : null}

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
