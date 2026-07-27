import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import type { WorkspaceTask } from '../../types';
import type { SpacesMode, SpacesTask } from '../../types/spaces';
import {
  canChangeStatusForView,
  canCommentOnTaskForView,
  canDeleteTaskForView,
  canEditDueDateForView,
  canEditTaskForView,
  canValidateTaskForView,
  getReviewerLabel,
  getTaskRowClassesForView,
  isRecurringSeriesActive,
  isRecurringSeriesTask,
  isSubmittedStatus,
  isTaskLockedForView,
  normalizeTaskForUi,
  projectCharterPayloadFromBackendProject,
  upsertTaskByIdHelper,
} from '../../views/spacesViewHelpers';

type LoggedInEmployee = { id: string; name: string; avatar: string; role?: string };

export interface UseSpacesTasksParams {
  mode: SpacesMode;
  me: LoggedInEmployee;
  tasks: SpacesTask[];
  setTasks: Dispatch<SetStateAction<SpacesTask[]>>;
  setPlannerTasks: Dispatch<SetStateAction<SpacesTask[]>>;
  employeeById: Map<string, { empId: string; empName: string; avatar?: string; role?: string }>;
  updateState?: (updater: (prev: any) => any) => any;
  taskPage: number;
  loadSpaces: (options?: { silent?: boolean; force?: boolean; page?: number }) => Promise<void>;
  loadPlannerTasks: (options?: { force?: boolean }) => Promise<void>;
  setError: (message: string | null) => void;
  sortedTasks: SpacesTask[];
  canBulkManageTasks: boolean;
}

/**
 * Owns task CRUD/mutation logic (patch/delete/stop-recurrence/comments),
 * per-task permission helpers, and the approve/reject review flow.
 * Extracted from useSpacesViewController without changing behavior.
 */
export const useSpacesTasks = ({
  mode,
  me,
  tasks,
  setTasks,
  setPlannerTasks,
  employeeById,
  updateState,
  taskPage,
  loadSpaces,
  loadPlannerTasks,
  setError,
  sortedTasks,
  canBulkManageTasks,
}: UseSpacesTasksParams) => {
  const [stoppingRecurrenceTaskId, setStoppingRecurrenceTaskId] = useState<string | null>(null);
  const [rejectTaskModal, setRejectTaskModal] = useState<SpacesTask | null>(null);
  const [rejectFeedbackDraft, setRejectFeedbackDraft] = useState('');
  const [rejectingTask, setRejectingTask] = useState(false);
  const [commentTaskId, setCommentTaskId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState('');
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [modalStatus, setModalStatus] = useState<SpacesTask['status']>('todo');

  const upsertTaskById = (prev: SpacesTask[], incoming: SpacesTask): SpacesTask[] =>
    upsertTaskByIdHelper(prev, incoming);

  const syncProjectTaskInState = useCallback(
    (projectId: string | undefined, projectTaskId: string | undefined, updates: Partial<WorkspaceTask>) => {
      if (!updateState || !projectId || !projectTaskId) return;

      updateState((prev) => ({
        ...prev,
        workspaces: prev.workspaces.map((workspace) => ({
          ...workspace,
          projects: workspace.projects.map((project) => {
            if (project.id !== projectId) return project;

            let changed = false;
            const nextTasks = (project.tasks || []).map((task) => {
              if (task.id !== projectTaskId) return task;
              changed = true;
              return { ...task, ...updates };
            });

            return changed ? { ...project, tasks: nextTasks } : project;
          }),
        })),
      }));
    },
    [updateState],
  );

  const appendProjectTaskToState = useCallback(
    (projectId: string | undefined, task: WorkspaceTask) => {
      if (!updateState || !projectId) return;

      updateState((prev) => ({
        ...prev,
        workspaces: prev.workspaces.map((workspace) => ({
          ...workspace,
          projects: workspace.projects.map((project) => {
            if (project.id !== projectId) return project;
            if ((project.tasks || []).some((existingTask) => existingTask.id === task.id)) {
              return project;
            }
            return {
              ...project,
              tasks: [...(project.tasks || []), task],
            };
          }),
        })),
      }));
    },
    [updateState],
  );

  const removeProjectTaskFromState = useCallback(
    (projectId: string | undefined, projectTaskId: string | undefined) => {
      if (!updateState || !projectId || !projectTaskId) return;

      updateState((prev) => ({
        ...prev,
        workspaces: prev.workspaces.map((workspace) => ({
          ...workspace,
          projects: workspace.projects.map((project) => {
            if (project.id !== projectId) return project;
            const nextTasks = (project.tasks || []).filter((task) => task.id !== projectTaskId);
            if (nextTasks.length === (project.tasks || []).length) {
              return project;
            }
            return {
              ...project,
              tasks: nextTasks,
            };
          }),
        })),
      }));
    },
    [updateState],
  );

  const patchTask = async (taskId: string, updates: Partial<SpacesTask>) => {
    setError(null);
    const existing = tasks.find((t) => t.taskId === taskId) || null;
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.status === 'done' && mode === 'employee') {
      normalizedUpdates.status = 'review';
    }
    const optimisticUpdates = Object.prototype.hasOwnProperty.call(normalizedUpdates, 'status')
      ? { ...normalizedUpdates, updatedAt: new Date().toISOString() }
      : normalizedUpdates;
    setTasks((prev) =>
      prev.map((t) =>
        t.taskId === taskId ? ({ ...t, ...optimisticUpdates } as SpacesTask) : t,
      ),
    );
    setPlannerTasks((prev) =>
      prev.map((t) =>
        t.taskId === taskId ? ({ ...t, ...optimisticUpdates } as SpacesTask) : t,
      ),
    );
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(normalizedUpdates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update task');
      }
      const updated = await res.json();
      const normalizedUpdated = normalizeTaskForUi(updated as SpacesTask);
      setTasks((prev) => prev.map((t) => (t.taskId === taskId ? normalizedUpdated : t)));
      setPlannerTasks((prev) => prev.map((t) => (t.taskId === taskId ? normalizedUpdated : t)));

      // If this task is linked to a project task, sync updates into the project charter as well
      if (existing?.projectId && existing?.projectTaskId) {
        try {
          const resProj = await fetch(`${API_BASE}/project-charters/${existing.projectId}`, {
            headers: getAuthHeaders(),
          });
          if (resProj.ok) {
            const proj = await resProj.json();
            const existingTasks: any[] = Array.isArray(proj?.tasks) ? proj.tasks : [];
            const updatedTasks = existingTasks.map((pt: any) => {
              if (pt.id !== existing.projectTaskId) return pt;
              return {
                ...pt,
                title: normalizedUpdates.title ?? pt.title,
                status: normalizedUpdates.status ?? pt.status,
                priority: normalizedUpdates.priority ?? pt.priority,
                assigneeId: normalizedUpdates.assigneeId ?? pt.assigneeId,
                dueDate: normalizedUpdates.dueDate ?? pt.dueDate,
                updatedAt: new Date().toISOString(),
              };
            });
            const payload = projectCharterPayloadFromBackendProject(proj, updatedTasks);
            await fetch(`${API_BASE}/project-charters`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload),
            });
          }
        } catch (e) {
          console.error('Failed to sync Spaces task to project charter', e);
        }
      }

      syncProjectTaskInState(
        normalizedUpdated.projectId || existing?.projectId,
        normalizedUpdated.projectTaskId || existing?.projectTaskId,
        {
          title: normalizedUpdated.title,
          description: normalizedUpdated.description,
          status: normalizedUpdated.status,
          priority: normalizedUpdated.priority,
          assigneeId: normalizedUpdated.assigneeId || undefined,
          dueDate: normalizedUpdated.dueDate || undefined,
          updatedAt: normalizedUpdated.updatedAt || new Date().toISOString(),
        },
      );
      return true;
    } catch (e: any) {
      setError(e?.message || 'Failed to update task');
      loadSpaces();
      void loadPlannerTasks({ force: true });
      return false;
    }
  };

  const stopTaskRecurrence = async (task: SpacesTask) => {
    if (!isRecurringSeriesTask(task) || !isRecurringSeriesActive(tasks, task)) return false;
    setStoppingRecurrenceTaskId(task.taskId);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${task.taskId}/recurrence/stop`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to stop repeating task');
      }

      const sourceTaskId = String(data.sourceTaskId || '').trim();
      if (sourceTaskId) {
        setTasks((prev) =>
          prev.map((item) => {
            if (item.taskId !== sourceTaskId) return item;
            return normalizeTaskForUi({
              ...item,
              recurrence: {
                ...(item.recurrence || {}),
                enabled: false,
                nextRunAt: null,
              },
            });
          }),
        );
      } else if (data.task) {
        const normalized = normalizeTaskForUi(data.task as SpacesTask);
        setTasks((prev) => upsertTaskById(prev, normalized));
      }

      return true;
    } catch (e: any) {
      setError(e?.message || 'Failed to stop repeating task');
      await loadSpaces({ silent: true, page: taskPage });
      void loadPlannerTasks();
      return false;
    } finally {
      setStoppingRecurrenceTaskId(null);
    }
  };

  const stopTaskEmailChecklist = async (task: SpacesTask) => {
    const hasChecklist = Boolean(task.emailChecklist?.enabled);
    if (!hasChecklist) return false;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${encodeURIComponent(task.taskId)}/checklist/stop`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to stop checklist reminders');
      }

      await loadSpaces({ silent: true, force: true, page: taskPage });
      void loadPlannerTasks({ force: true });
      return true;
    } catch (e: any) {
      setError(e?.message || 'Failed to stop checklist reminders');
      await loadSpaces({ silent: true, force: true, page: taskPage });
      void loadPlannerTasks({ force: true });
      return false;
    }
  };

  const stopTaskWeeklyRepeat = async (task: SpacesTask) => {
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/spaces/tasks/${encodeURIComponent(task.taskId)}/checklist/stop`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to stop repeating task');
      }

      const stoppedAt =
        data.task?.emailChecklist?.repeatStoppedAt || new Date().toISOString();
      // Only this task's series root — never other repeating tasks.
      const seriesRootId = String(
        task.parentTaskId || task.recurrence?.sourceTaskId || task.taskId || '',
      ).trim();

      setTasks((prev) =>
        prev.map((item) => {
          const itemRootId = String(
            item.parentTaskId || item.recurrence?.sourceTaskId || item.taskId || '',
          ).trim();
          if (!seriesRootId || itemRootId !== seriesRootId) return item;

          const nextChecklist = {
            ...(item.emailChecklist || {}),
            ...(item.taskId === task.taskId ? data.task?.emailChecklist || {} : {}),
            enabled: false,
            repeatEveryWeek: false,
            nextReminderAt: null,
            remainingOccurrences: 0,
            repeatStoppedAt: stoppedAt,
          };

          return normalizeTaskForUi({
            ...item,
            emailChecklist: nextChecklist,
          });
        }),
      );

      await loadSpaces({ silent: true, force: true, page: taskPage });
      void loadPlannerTasks({ force: true });
      return true;
    } catch (e: any) {
      setError(e?.message || 'Failed to stop repeating task');
      await loadSpaces({ silent: true, force: true, page: taskPage });
      void loadPlannerTasks({ force: true });
      return false;
    }
  };

  const deleteTask = async (taskId: string, options?: { bulk?: boolean; deleteScope?: 'single' | 'future' }) => {
    setError(null);
    const normalizedTaskId = String(taskId || '').trim();
    if (!normalizedTaskId) return false;

    const existing = tasks.find((task) => task.taskId === normalizedTaskId) || null;

    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${encodeURIComponent(normalizedTaskId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          deleteScope: options?.deleteScope || 'single',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete task');
      }

      const deletedTaskIds = Array.isArray(data?.deletedTaskIds)
        ? data.deletedTaskIds.map((value: unknown) => String(value || '').trim()).filter(Boolean)
        : [normalizedTaskId];
      const sourceTaskId = String(data?.sourceTaskId || '').trim();

      setTasks((prev) => {
        const next = prev.filter((task) => !deletedTaskIds.includes(task.taskId));
        if (!sourceTaskId || deletedTaskIds.includes(sourceTaskId)) {
          return next;
        }
        return next.map((task) =>
          task.taskId === sourceTaskId
            ? normalizeTaskForUi({
                ...task,
                recurrence: {
                  ...(task.recurrence || {}),
                  enabled: false,
                  nextRunAt: null,
                },
              })
            : task,
        );
      });
      if (existing?.projectId && existing?.projectTaskId) {
        removeProjectTaskFromState(existing.projectId, existing.projectTaskId);
        try {
          const resProject = await fetch(`${API_BASE}/project-charters/${existing.projectId}`, {
            headers: getAuthHeaders(),
          });
          if (resProject.ok) {
            const backendProject = await resProject.json().catch(() => ({}));
            const existingProjectTasks = Array.isArray(backendProject?.tasks) ? backendProject.tasks : [];
            const updatedProjectTasks = existingProjectTasks.filter(
              (projectTask: any) =>
                String(projectTask?.id || '').trim() !== String(existing.projectTaskId || '').trim(),
            );
            await fetch(`${API_BASE}/project-charters`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(
                projectCharterPayloadFromBackendProject(backendProject, updatedProjectTasks),
              ),
            });
          }
        } catch (projectSyncError) {
          console.error('Failed to sync project task deletion', projectSyncError);
        }
      }

      return true;
    } catch (e: any) {
      setError(e?.message || 'Failed to delete task');
      if (!options?.bulk) {
        await loadSpaces({ silent: true, page: taskPage });
      void loadPlannerTasks();
      }
      return false;
    }
  };

  const addTaskComment = async (taskId: string, text: string) => {
    const res = await fetch(`${API_BASE}/spaces/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Failed to add comment');
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.taskId === taskId
          ? { ...t, comments: Array.isArray(data.comments) ? data.comments : [] }
          : t,
      ),
    );
  };

  const isTaskLocked = (t: SpacesTask): boolean => isTaskLockedForView(t, me, mode);
  const getTaskRowClasses = (t: SpacesTask): string => getTaskRowClassesForView(t, me, mode);
  const canEditTask = (t: SpacesTask): boolean => canEditTaskForView(t, me, mode);
  const canValidateTask = (t: SpacesTask): boolean => canValidateTaskForView(t, mode, me, employeeById);
  const canCommentOnTask = (t: SpacesTask): boolean => canCommentOnTaskForView(t, mode, me, canEditTask, canValidateTask);
  const canDeleteTask = (t: SpacesTask): boolean => canDeleteTaskForView(t, me, mode);
  const canEditDueDate = (t: SpacesTask): boolean => canEditDueDateForView(t, isTaskLocked, canEditTask);
  const canChangeStatus = (t: SpacesTask): boolean => canChangeStatusForView(t, mode, me, isTaskLocked, canEditTask);
  const canSelectTask = (t: SpacesTask): boolean =>
    canBulkManageTasks && !isTaskLocked(t) && (canEditTask(t) || canDeleteTask(t) || canChangeStatus(t));

  const handleApproveTask = async (t: SpacesTask) => {
    if (!canValidateTask(t) || t.status === 'done') return;
    await patchTask(t.taskId, { status: 'done' });
  };

  const handleRejectTask = async (t: SpacesTask) => {
    if (!canValidateTask(t)) return;
    setRejectTaskModal(t);
    setRejectFeedbackDraft('');
  };

  const confirmRejectTask = async () => {
    if (!rejectTaskModal || rejectingTask) return;

    const feedback = rejectFeedbackDraft.trim();
    if (!feedback) {
      setError('Please enter rejection feedback before sending the task back.');
      return;
    }

    const fallbackStatus =
      rejectTaskModal.submittedFromStatus && !isSubmittedStatus(rejectTaskModal.submittedFromStatus)
        ? (rejectTaskModal.submittedFromStatus as SpacesTask['status'])
        : ('todo' as SpacesTask['status']);

    try {
      setRejectingTask(true);
      setError(null);
      const updated = await patchTask(rejectTaskModal.taskId, { status: fallbackStatus });
      if (!updated) return;

      await addTaskComment(
        rejectTaskModal.taskId,
        `Task rejected by ${getReviewerLabel(me.role)}: ${feedback}`,
      );
      setRejectTaskModal(null);
      setRejectFeedbackDraft('');
    } catch (e: any) {
      setError(e?.message || 'Failed to reject task');
    } finally {
      setRejectingTask(false);
    }
  };

  const activeCommentTask = useMemo(
    () => sortedTasks.find((t) => t.taskId === commentTaskId) || null,
    [sortedTasks, commentTaskId],
  );

  const handleAddComment = async () => {
    if (!activeCommentTask || !canCommentOnTask(activeCommentTask) || submittingComment) return;
    const text = commentDraft.trim();
    if (!text) return;
    setError(null);
    try {
      setSubmittingComment(true);
      // If employee is viewing their portal, allow status change together with comment
      if (mode === 'employee' && modalStatus && modalStatus !== activeCommentTask.status) {
        await patchTask(activeCommentTask.taskId, { status: modalStatus });
      }

      const res = await fetch(`${API_BASE}/spaces/tasks/${activeCommentTask.taskId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add comment');
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.taskId === activeCommentTask.taskId
            ? { ...t, comments: Array.isArray(data.comments) ? data.comments : [] }
            : t,
        ),
      );
      setCommentDraft('');
    } catch (e: any) {
      setError(e?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  return {
    stoppingRecurrenceTaskId,
    rejectTaskModal,
    setRejectTaskModal,
    rejectFeedbackDraft,
    setRejectFeedbackDraft,
    rejectingTask,
    commentTaskId,
    setCommentTaskId,
    commentDraft,
    setCommentDraft,
    submittingComment,
    editingCommentId,
    setEditingCommentId,
    editCommentDraft,
    setEditCommentDraft,
    commentToDeleteId,
    setCommentToDeleteId,
    modalStatus,
    setModalStatus,
    appendProjectTaskToState,
    patchTask,
    stopTaskRecurrence,
    stopTaskEmailChecklist,
    stopTaskWeeklyRepeat,
    deleteTask,
    addTaskComment,
    isTaskLocked,
    getTaskRowClasses,
    canEditTask,
    canValidateTask,
    canCommentOnTask,
    canDeleteTask,
    canEditDueDate,
    canChangeStatus,
    canSelectTask,
    handleApproveTask,
    handleRejectTask,
    confirmRejectTask,
    activeCommentTask,
    handleAddComment,
  };
};
