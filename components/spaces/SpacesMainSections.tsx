import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Eye, FileText, Paperclip, Plus, UploadCloud, WandSparkles } from 'lucide-react';
import { ThemedSelect, WeeklyTaskPeriodCanvas, WeeklyTaskPeriodTrigger } from './SpacesFormControls';
import SpacesTaskCreateModal from './SpacesTaskCreateModal';
import SpacesTaskTableSection from './SpacesTaskTableSection';
import SpacesTaskModals from './SpacesTaskModals';

const CREATE_TASK_COLLAPSED_WIDTH = 44;
const CREATE_TASK_EXPANDED_WIDTH = 142;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export const PremiumCreateTaskButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const prefersReducedMotion = useReducedMotion();
  const shellControls = useAnimationControls();
  const buttonControls = useAnimationControls();
  const labelControls = useAnimationControls();
  const iconControls = useAnimationControls();
  const glowControls = useAnimationControls();
  const idleControls = useAnimationControls();
  const sheenControls = useAnimationControls();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [sheenKey, setSheenKey] = useState(0);
  const [hoverOffset, setHoverOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;

    const runIntro = async () => {
      if (prefersReducedMotion) {
        setIsExpanded(true);
        await buttonControls.set({ width: CREATE_TASK_EXPANDED_WIDTH });
        await labelControls.set({ opacity: 1, x: 0 });
        await iconControls.set({ rotate: 0, x: 0 });
        await glowControls.set({ opacity: 0.42, scale: 1 });
        return;
      }

      setIsExpanded(false);
      await buttonControls.set({ width: CREATE_TASK_COLLAPSED_WIDTH });
      await labelControls.set({ opacity: 0, x: 8 });
      await iconControls.set({ rotate: 0, x: 0 });
      await glowControls.set({ opacity: 0.32, scale: 1 });

      await wait(1650);
      if (cancelled) return;

      idleControls.stop();

      await shellControls.start({
        x: [0, 6, -10, 4, 0],
        scaleX: [1, 0.9, 1.15, 0.97, 1],
        scaleY: [1, 1.08, 0.92, 1.02, 1],
        transition: {
          duration: 0.72,
          times: [0, 0.18, 0.45, 0.76, 1],
          ease: 'easeInOut',
        },
      });
      if (cancelled) return;

      setBurstKey((value) => value + 1);
      setIsExpanded(true);

      await Promise.all([
        buttonControls.start({
          width: CREATE_TASK_EXPANDED_WIDTH,
          transition: { type: 'spring', stiffness: 280, damping: 20, mass: 0.85 },
        }),
        iconControls.start({
          rotate: [0, -14, 18, 0],
          x: [0, -1, 1, 0],
          transition: { duration: 0.68, times: [0, 0.35, 0.72, 1], ease: 'easeInOut' },
        }),
        glowControls.start({
          opacity: [0.32, 0.82, 0.42],
          scale: [0.96, 1.08, 1],
          transition: { duration: 0.7, times: [0, 0.55, 1], ease: 'easeOut' },
        }),
      ]);
      if (cancelled) return;

      await labelControls.start({
        opacity: 1,
        x: 0,
        transition: { delay: 0.05, duration: 0.26, ease: 'easeOut' },
      });
    };

    runIntro();

    return () => {
      cancelled = true;
    };
  }, [buttonControls, glowControls, iconControls, idleControls, labelControls, prefersReducedMotion, shellControls]);

  useEffect(() => {
    if (prefersReducedMotion || isExpanded) {
      idleControls.stop();
      return;
    }

    idleControls.start({
      y: [0, -1.5, 0],
      scale: [1, 1.015, 1],
      transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
    });

    glowControls.start({
      opacity: [0.26, 0.42, 0.26],
      scale: [0.98, 1.05, 0.98],
      transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
    });
  }, [glowControls, idleControls, isExpanded, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!isHovered) {
      setHoverOffset({ x: 0, y: 0 });
      glowControls.start({
        opacity: isExpanded ? 0.42 : 0.32,
        scale: 1,
        transition: { duration: 0.2, ease: 'easeOut' },
      });
      sheenControls.set({ x: '-120%', opacity: 0 });
      iconControls.start({
        rotate: 0,
        x: 0,
        transition: { duration: 0.22, ease: 'easeOut' },
      });
      labelControls.start({
        x: 0,
        transition: { duration: 0.2, ease: 'easeOut' },
      });
      return;
    }

    glowControls.start({
      opacity: [0.48, 0.62, 0.48],
      scale: [1, 1.04, 1],
      transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
    });
    sheenControls.start({
      x: ['-120%', '140%'],
      opacity: [0, 0.4, 0],
      transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.2, ease: 'easeOut' },
    });
    iconControls.start({
      rotate: [0, -10, 0],
      x: [0, -1, 0],
      transition: { duration: 0.55, times: [0, 0.45, 1], repeat: Infinity, repeatDelay: 0.25, ease: 'easeInOut' },
    });
    labelControls.start({
      x: [0, 1.5, 0],
      transition: { duration: 0.55, times: [0, 0.45, 1], repeat: Infinity, repeatDelay: 0.25, ease: 'easeInOut' },
    });
  }, [glowControls, iconControls, isExpanded, isHovered, labelControls, prefersReducedMotion, sheenControls]);

  const handleMouseMove = () => {
    if (prefersReducedMotion) return;
    setHoverOffset({ x: 0, y: 0 });
  };

  const handlePressStart = async () => {
    setIsPressed(true);
    if (prefersReducedMotion) return;

    setSheenKey((value) => value + 1);
    await Promise.all([
      shellControls.start({
        scaleX: 0.965,
        scaleY: 0.94,
        transition: { type: 'spring', stiffness: 520, damping: 24, mass: 0.55 },
      }),
      iconControls.start({
        rotate: isExpanded ? 18 : 30,
        transition: { type: 'spring', stiffness: 520, damping: 20 },
      }),
      labelControls.start({
        x: isExpanded ? 1.5 : 0,
        transition: { type: 'spring', stiffness: 420, damping: 26 },
      }),
      sheenControls.start({
        x: ['-120%', '140%'],
        opacity: [0, 0.45, 0],
        transition: { duration: 0.64, ease: 'easeOut' },
      }),
    ]);
  };

  const handlePressEnd = async () => {
    setIsPressed(false);
    if (prefersReducedMotion) return;

    await Promise.all([
      shellControls.start({
        scaleX: 1,
        scaleY: 1,
        transition: { type: 'spring', stiffness: 420, damping: 22, mass: 0.7 },
      }),
      iconControls.start({
        rotate: 0,
        transition: { type: 'spring', stiffness: 360, damping: 18 },
      }),
      labelControls.start({
        x: 0,
        transition: { type: 'spring', stiffness: 360, damping: 24 },
      }),
    ]);
  };

  return (
    <div
      className="relative flex h-11 items-center justify-end"
      style={{ perspective: 900, width: CREATE_TASK_EXPANDED_WIDTH }}
    >
      <AnimatePresence>
        {burstKey > 0 ? (
          <motion.div
            key={burstKey}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {[
              { left: '26%', top: '50%', dx: -16, dy: -14 },
              { left: '40%', top: '18%', dx: 4, dy: -12 },
              { left: '56%', top: '72%', dx: 12, dy: 10 },
              { left: '70%', top: '36%', dx: 18, dy: -2 },
            ].map((particle, index) => (
              <motion.span
                key={`${burstKey}-${index}`}
                className="absolute h-1.5 w-1.5 rounded-full bg-white/70"
                style={{ left: particle.left, top: particle.top }}
                initial={{ x: 0, y: 0, scale: 0.8, opacity: 0 }}
                animate={{
                  x: particle.dx,
                  y: particle.dy,
                  scale: [0.8, 1, 0.5],
                  opacity: [0, 0.7, 0],
                }}
                transition={{
                  duration: 0.52,
                  delay: index * 0.03,
                  times: [0, 0.35, 1],
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div animate={idleControls} className="relative">
        <motion.button
          type="button"
          aria-label="Create Task"
          onClick={onClick}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          onMouseMove={handleMouseMove}
          onTapStart={handlePressStart}
          onTapCancel={handlePressEnd}
          onTap={handlePressEnd}
          animate={buttonControls}
          initial={false}
          className="group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-full border border-transparent px-2.5 py-1.5 text-[13px] font-semibold"
          style={{
            width: prefersReducedMotion ? CREATE_TASK_EXPANDED_WIDTH : CREATE_TASK_COLLAPSED_WIDTH,
            x: 0,
            y: 0,
            backgroundColor: isHovered ? '#ffffff' : '#dc2626',
            color: isHovered ? '#dc2626' : '#ffffff',
            borderColor: isHovered ? 'rgba(220, 38, 38, 0.18)' : 'transparent',
            boxShadow: 'none',
            transition: 'background-color 180ms ease, color 180ms ease, border-color 180ms ease',
          }}
          whileHover={
            prefersReducedMotion
              ? undefined
              : {
                  scale: 1,
                  transition: { type: 'spring', stiffness: 320, damping: 20 },
                }
          }
        >
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_54%)]"
            animate={glowControls}
            initial={false}
          />
          <motion.span
            key={sheenKey}
            className="pointer-events-none absolute inset-y-0 left-0 w-16 -translate-x-[120%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.34),transparent)]"
            animate={sheenControls}
            initial={{ x: '-120%', opacity: 0 }}
          />
          <motion.span className="relative z-10 inline-flex items-center" animate={shellControls} initial={false}>
            <motion.span className="inline-flex items-center justify-center" animate={iconControls} initial={false}>
              <Plus size={16} strokeWidth={2.4} />
            </motion.span>
            <AnimatePresence initial={false}>
              {(isExpanded || prefersReducedMotion) ? (
                <motion.span
                  key="create-task-label"
                  className="overflow-hidden whitespace-nowrap pl-1.5"
                  initial={{ width: 0, opacity: 0, x: 8 }}
                  animate={{
                    width: 'auto',
                    opacity: 1,
                    x: 0,
                    letterSpacing: isHovered ? '0.02em' : '0em',
                  }}
                  exit={{ width: 0, opacity: 0, x: 8 }}
                  transition={{
                    width: { type: 'spring', stiffness: 280, damping: 24 },
                    opacity: { duration: 0.2 },
                    x: { type: 'spring', stiffness: 320, damping: 24 },
                    letterSpacing: { duration: 0.2 },
                  }}
                >
                  <motion.span className="inline-block" animate={labelControls} initial={false}>
                    Create Task
                  </motion.span>
                </motion.span>
              ) : null}
            </AnimatePresence>
          </motion.span>
        </motion.button>
      </motion.div>
    </div>
  );
};

const SpacesMainSections: React.FC<any> = (props) => {
  const [isWeeklyPlannerCanvasOpen, setIsWeeklyPlannerCanvasOpen] = useState(false);
  const canvasSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isWeeklyPlannerCanvasOpen) return;

    let scrollParent: HTMLElement | null = canvasSectionRef.current;
    while (scrollParent && scrollParent.parentElement) {
      const { overflowY } = window.getComputedStyle(scrollParent);
      if (overflowY === 'auto' || overflowY === 'scroll') break;
      scrollParent = scrollParent.parentElement;
    }

    const previousScrollParentOverflow = scrollParent?.style.overflow ?? '';
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    if (scrollParent) {
      scrollParent.style.overflow = 'hidden';
    }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      if (scrollParent) {
        scrollParent.style.overflow = previousScrollParentOverflow;
      }
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isWeeklyPlannerCanvasOpen]);

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
    emailChecklistEnabled,
    setEmailChecklistEnabled,
    additionalChecklistTitles,
    setAdditionalChecklistTitles,
    reminderIntervalHours,
    setReminderIntervalHours,
    taskRecurrence,
    setTaskRecurrence,
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
    stopTaskRecurrence,
    stoppingRecurrenceTaskId,
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
    taskStatusFilter,
    taskStatusFilterOptions,
    setTaskStatusFilter,
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
    selectedTaskIds,
    selectedTaskCount,
    canBulkManageTasks,
    bulkSaving,
    bulkReminderIntervalHours,
    setBulkReminderIntervalHours,
    checklistNotice,
    sendSelectedTaskChecklist,
    bulkStatus,
    setBulkStatus,
    bulkAssigneeId,
    setBulkAssigneeId,
    bulkDueDate,
    setBulkDueDate,
    bulkTouched,
    setBulkTouched,
    clearSelectedTasks,
    saveBulkTaskChanges,
    setBulkDeleteTaskModalOpen,
    deleteSelectedTasks,
    toggleTaskSelection,
    canSelectTask,
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
  const openTaskDetail = (taskId: string) => {
    navigate(`/spaces/task/${taskId}`);
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
        ref={canvasSectionRef}
        className={`-mx-6 overflow-hidden bg-white transition-all duration-300 ease-out ${
          isWeeklyPlannerCanvasOpen ? '-mt-16 mb-4 pt-5' : 'mb-0 pb-0 pt-0'
        }`}
      >
        <WeeklyTaskPeriodCanvas
          {...weeklyPeriodPicker}
          open={isWeeklyPlannerCanvasOpen}
          onClose={() => setIsWeeklyPlannerCanvasOpen(false)}
        />
      </div>

      <div
        className={`space-y-4 transition-[filter,opacity] duration-300 ease-out ${
          isWeeklyPlannerCanvasOpen ? 'pointer-events-none blur-[6px] opacity-60' : 'blur-0 opacity-100'
        }`}
      >
        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1.7fr)]">
          <div className="order-2 flex h-[37rem] min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
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

          <div className="order-1 flex h-[37rem] min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5">
            <div className="shrink-0 flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Top Priorities</h4>
                <p className="mt-1 text-[12px] text-slate-500">Priority management for the most important active tasks.</p>
              </div>
              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                {completedTopPriorities}/{topPriorityTasks.length} done
              </span>
            </div>
            <div className="mt-4 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
              {topPriorityTasks.length > 0 ? topPriorityTasks.map((task: any, index: number) => (
                <div
                  key={task.taskId}
                  role="button"
                  tabIndex={0}
                  onClick={() => openTaskDetail(task.taskId)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    openTaskDetail(task.taskId);
                  }}
                  className={`flex cursor-pointer items-start gap-2 rounded-2xl px-3 py-2 transition-colors ${getTopPriorityCardClasses(task, index)}`}
                >
                  <input
                    type="checkbox"
                    checked={isCompletedPriorityStatus(task.status)}
                    disabled={!canChangeStatus(task)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(e) => patchTask(task.taskId, { status: e.target.checked ? 'done' : 'todo' })}
                    className={`mt-0.5 h-3 w-3 ${isCompletedPriorityStatus(task.status) ? 'accent-emerald-600' : ''} ${canChangeStatus(task) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`line-clamp-2 text-[12px] font-semibold leading-[1.1rem] ${isCompletedPriorityStatus(task.status) ? 'text-emerald-700 line-through decoration-2' : 'text-slate-800'}`}>
                      {task.title || 'Untitled task'}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getTopPriorityPillClasses('priority', task.priority)}`}>
                        {String(task.priority || 'medium').trim().replace(/^./, (char: string) => char.toUpperCase())}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getTopPriorityPillClasses('status', task.status)}`}>
                        {String(task.status || 'todo').trim().replace(/^./, (char: string) => char.toUpperCase())}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getTopPriorityPillClasses('date', task.dueDate)}`}>
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
                </div>
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
                  {aiAssigning ? `Processing ${aiAssignFileName || 'file'}...` : 'Upload a document or sheet to create and assign TaskHub items.'}
                </p>
              </div>
            </div>
            <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
              aiAssigning
                ? 'bg-slate-100 text-slate-400'
                : 'bg-brand-red text-white hover:bg-brand-red/90'
            }`}>
              <UploadCloud size={16} />
              {aiAssigning ? 'Assigning...' : 'Upload File'}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-44">
              <ThemedSelect
                value={taskStatusFilter}
                onChange={setTaskStatusFilter}
                options={taskStatusFilterOptions}
                compact={true}
                fullWidthCompact={true}
              />
            </div>
            <div className="flex items-center gap-2">
              <input value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} placeholder="Search by employee ID or name..." className="w-full md:w-80 rounded-full border border-slate-200 px-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
              {taskSearch.trim() ? (
                <button type="button" onClick={() => setTaskSearch('')} className="text-[12px] text-slate-500 hover:text-brand-red">Clear</button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {canBulkManageTasks && selectedTaskCount > 0 ? (
        <div className="sticky top-0 z-30 rounded-2xl border border-red-100 bg-red-50/95 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-red text-sm font-semibold text-white">
                {selectedTaskCount}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-slate-900">Selected tasks</div>
                <div className="text-[12px] text-slate-500">Apply changes to all selected rows.</div>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(150px,1fr)_auto_minmax(170px,1fr)_auto_minmax(150px,1fr)_auto_auto_auto] md:items-center">
              <select
                value={bulkStatus}
                onChange={(event) => {
                  setBulkStatus(event.target.value);
                  setBulkTouched((prev: any) => ({ ...prev, status: true }));
                }}
                disabled={bulkSaving}
                className="h-10 rounded-xl border border-red-100 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 disabled:opacity-60"
              >
                {statusOptions.map((option: any) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <div className={`h-10 rounded-xl border px-3 py-2 text-[12px] font-semibold ${bulkTouched?.status ? 'border-red-200 bg-red-100 text-brand-red' : 'border-slate-200 bg-white text-slate-400'}`}>Status</div>
              <select
                value={bulkAssigneeId}
                onChange={(event) => {
                  setBulkAssigneeId(event.target.value);
                  setBulkTouched((prev: any) => ({ ...prev, assigneeId: true }));
                }}
                disabled={bulkSaving || employeesLoading}
                className="h-10 rounded-xl border border-red-100 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {assignableEmployees.map((employee: any) => (
                  <option key={employee.empId} value={employee.empId}>{employee.empId === me.id ? `${employee.empName} (You)` : employee.empName || employee.empId}</option>
                ))}
              </select>
              <div className={`h-10 rounded-xl border px-3 py-2 text-[12px] font-semibold ${bulkTouched?.assigneeId ? 'border-red-200 bg-red-100 text-brand-red' : 'border-slate-200 bg-white text-slate-400'}`}>Assignee</div>
              <input
                type="date"
                value={bulkDueDate}
                onChange={(event) => {
                  setBulkDueDate(event.target.value);
                  setBulkTouched((prev: any) => ({ ...prev, dueDate: true }));
                }}
                disabled={bulkSaving}
                className="h-10 rounded-xl border border-red-100 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 disabled:opacity-60"
              />
              <div className={`h-10 rounded-xl border px-3 py-2 text-[12px] font-semibold ${bulkTouched?.dueDate ? 'border-red-200 bg-red-100 text-brand-red' : 'border-slate-200 bg-white text-slate-400'}`}>
                Due date
              </div>
              <button type="button" onClick={clearSelectedTasks} disabled={bulkSaving} className="h-10 rounded-xl border border-red-100 bg-white px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                Clear
              </button>
              <div className="hidden h-10 w-px bg-red-200 md:block" />
              <button type="button" onClick={saveBulkTaskChanges} disabled={bulkSaving || !bulkTouched || (!bulkTouched.status && !bulkTouched.assigneeId && !bulkTouched.dueDate)} className="h-10 rounded-xl bg-slate-900 px-4 text-[12px] font-semibold text-white transition hover:bg-brand-red disabled:cursor-not-allowed disabled:opacity-60">
                {bulkSaving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setBulkDeleteTaskModalOpen(true)} disabled={bulkSaving} className="h-10 rounded-xl bg-brand-red px-3 text-[12px] font-semibold text-white transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-60">
                Delete
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-red-100 pt-3">
            <span className="text-[12px] font-semibold text-slate-700">Checklist reminder gap</span>
            <select value={bulkReminderIntervalHours} onChange={(event) => setBulkReminderIntervalHours(event.target.value)} disabled={bulkSaving} className="h-10 rounded-xl border border-red-100 bg-white px-3 text-[13px] text-slate-700">
              <option value="1">Every 1 hour</option>
              <option value="6">Every 6 hours</option>
              <option value="12">Every 12 hours</option>
              <option value="24">Every 24 hours</option>
              <option value="48">Every 2 days</option>
              <option value="168">Every 7 days</option>
            </select>
            <button type="button" onClick={sendSelectedTaskChecklist} disabled={bulkSaving} className="h-10 rounded-xl bg-emerald-600 px-4 text-[12px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
              {bulkSaving ? 'Sending...' : 'Send checklist email'}
            </button>
            {checklistNotice ? <span className="text-[12px] text-emerald-700">{checklistNotice}</span> : null}
          </div>
        </div>
      ) : null}

      <SpacesTaskTableSection columns={columns} isRenamingColumnId={isRenamingColumnId} renameDraft={renameDraft} setRenameDraft={setRenameDraft} setIsRenamingColumnId={setIsRenamingColumnId} setActiveColumnMenuId={setActiveColumnMenuId} sortedTasks={sortedTasks} tasks={tasks} setColumns={setColumns} setError={setError} activeColumnMenuId={activeColumnMenuId} setColumnToDelete={setColumnToDelete} handleAddColumn={handleAddColumn} spacesLoading={spacesLoading} paginatedTasks={paginatedTasks} canEditTask={canEditTask} isTaskLocked={isTaskLocked} getTaskRowClasses={getTaskRowClasses} patchTask={patchTask} stopTaskRecurrence={stopTaskRecurrence} stoppingRecurrenceTaskId={stoppingRecurrenceTaskId} projectNameById={projectNameById} mode={mode} me={me} assigneeOptionsForTask={assigneeOptionsForTask} employeesLoading={employeesLoading} canEditDueDate={canEditDueDate} priorityOptions={priorityOptions} canChangeStatus={canChangeStatus} statusOptions={statusOptions} forceDownloadDocument={forceDownloadDocument} canCommentOnTask={canCommentOnTask} setCommentTaskId={setCommentTaskId} setModalStatus={setModalStatus} canValidateTask={canValidateTask} canDeleteTask={canDeleteTask} handleApproveTask={handleApproveTask} handleRejectTask={handleRejectTask} navigate={navigate} setEditingTask={setEditingTask} setEditingTaskMode={setEditingTaskMode} setEditingTaskDraft={setEditingTaskDraft} setDeleteTaskModal={setDeleteTaskModal} selectedTaskIds={selectedTaskIds} canBulkManageTasks={canBulkManageTasks} toggleTaskSelection={toggleTaskSelection} canSelectTask={canSelectTask} taskPage={taskPage} TASKS_PER_PAGE={TASKS_PER_PAGE} setTaskPage={setTaskPage} visibleTaskPages={visibleTaskPages} totalTaskPages={totalTaskPages} API_BASE={API_BASE} getAuthHeaders={getAuthHeaders} />

      <SpacesTaskCreateModal
        open={isTaskCreateModalOpen}
        onClose={closeTaskCreateModal}
        onSubmit={handleCreate}
        canUseEmailChecklist={
          mode === 'manager' ||
          me.role === 'ADMIN' ||
          me.role === 'SUPER_ADMIN' ||
          me.role === 'TEAM_LEAD'
        }
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
        emailChecklistEnabled={emailChecklistEnabled}
        setEmailChecklistEnabled={setEmailChecklistEnabled}
        additionalChecklistTitles={additionalChecklistTitles}
        setAdditionalChecklistTitles={setAdditionalChecklistTitles}
        reminderIntervalHours={reminderIntervalHours}
        setReminderIntervalHours={setReminderIntervalHours}
        taskRecurrence={taskRecurrence}
        setTaskRecurrence={setTaskRecurrence}
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

      <SpacesTaskModals activeCommentTask={activeCommentTask} setCommentTaskId={setCommentTaskId} setCommentDraft={setCommentDraft} commentDraft={commentDraft} me={me} editingCommentId={editingCommentId} setEditingCommentId={setEditingCommentId} editCommentDraft={editCommentDraft} setEditCommentDraft={setEditCommentDraft} API_BASE={API_BASE} getAuthHeaders={getAuthHeaders} setTasks={setTasks} setError={setError} mode={mode} modalStatus={modalStatus} setModalStatus={setModalStatus} handleAddComment={handleAddComment} submittingComment={submittingComment} columnToDelete={columnToDelete} setColumnToDelete={setColumnToDelete} setColumns={setColumns} sortedTasks={sortedTasks} commentToDeleteId={commentToDeleteId} setCommentToDeleteId={setCommentToDeleteId} deleteTaskModal={deleteTaskModal} setDeleteTaskModal={setDeleteTaskModal} bulkDeleteTaskModalOpen={props.bulkDeleteTaskModalOpen} setBulkDeleteTaskModalOpen={props.setBulkDeleteTaskModalOpen} selectedTaskCount={selectedTaskCount} bulkSaving={bulkSaving} deleteSelectedTasks={deleteSelectedTasks} rejectTaskModal={rejectTaskModal} rejectFeedbackDraft={rejectFeedbackDraft} setRejectFeedbackDraft={setRejectFeedbackDraft} rejectingTask={rejectingTask} confirmRejectTask={confirmRejectTask} editingTask={editingTask} editingTaskMode={editingTaskMode} editingTaskDraft={editingTaskDraft} setEditingTaskDraft={setEditingTaskDraft} assignableEmployees={assignableEmployees} forceDownloadDocument={forceDownloadDocument} patchTask={patchTask} deleteTask={deleteTask} setEditingTask={setEditingTask} />
    </>
    
  );
};

export default SpacesMainSections;
