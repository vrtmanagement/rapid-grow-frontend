import { useEffect, useMemo, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { formatChecklistIntervalLabel } from '../../utils/spaces/taskRecurrence';
import type { EmployeeOption, SpacesColumn, SpacesTask, TaskStatus } from '../../types/spaces';

type LoggedInEmployee = { id: string; name: string; avatar: string; role?: string };

export interface UseSpacesModalsParams {
  me: LoggedInEmployee;
  tasks: SpacesTask[];
  assignableEmployees: EmployeeOption[];
  employeeById: Map<string, EmployeeOption>;
  canBulkManageTasks: boolean;
  canSelectTask: (task: SpacesTask) => boolean;
  canChangeStatus: (task: SpacesTask) => boolean;
  canEditTask: (task: SpacesTask) => boolean;
  canEditDueDate: (task: SpacesTask) => boolean;
  canDeleteTask: (task: SpacesTask) => boolean;
  patchTask: (taskId: string, updates: Partial<SpacesTask>) => Promise<boolean>;
  deleteTask: (taskId: string, options?: { bulk?: boolean; deleteScope?: 'single' | 'future' }) => Promise<boolean>;
  loadSpaces: (options?: { silent?: boolean; force?: boolean; page?: number }) => Promise<void>;
  loadPlannerTasks: (options?: { force?: boolean }) => Promise<void>;
  taskPage: number;
  setError: (message: string | null) => void;
}

/**
 * Owns column management UI state, the edit/delete task modals, and bulk
 * task-selection actions (status/assignee/due-date updates, checklist
 * sends, bulk delete). Extracted from useSpacesViewController without
 * changing behavior.
 */
export const useSpacesModals = ({
  me,
  tasks,
  assignableEmployees,
  employeeById,
  canBulkManageTasks,
  canSelectTask,
  canChangeStatus,
  canEditTask,
  canEditDueDate,
  canDeleteTask,
  patchTask,
  deleteTask,
  loadSpaces,
  loadPlannerTasks,
  taskPage,
  setError,
}: UseSpacesModalsParams) => {
  const [activeColumnMenuId, setActiveColumnMenuId] = useState<string | null>(null);
  const [isRenamingColumnId, setIsRenamingColumnId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [columnToDelete, setColumnToDelete] = useState<SpacesColumn | null>(null);
  const [deleteTaskModal, setDeleteTaskModal] = useState<SpacesTask | null>(null);
  const [editingTask, setEditingTask] = useState<SpacesTask | null>(null);
  const [editingTaskMode, setEditingTaskMode] = useState<'view' | 'edit'>('view');
  const [editingTaskDraft, setEditingTaskDraft] = useState<Partial<SpacesTask>>({});
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<TaskStatus>('todo');
  const [bulkAssigneeId, setBulkAssigneeId] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [bulkTouched, setBulkTouched] = useState({ status: false, assigneeId: false, dueDate: false });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkReminderIntervalHours, setBulkReminderIntervalHours] = useState('24');
  const [checklistNotice, setChecklistNotice] = useState('');
  const [bulkDeleteTaskModalOpen, setBulkDeleteTaskModalOpen] = useState(false);

  useEffect(() => {
    setSelectedTaskIds((prev) => {
      if (!prev.length) return prev;
      const availableIds = new Set(tasks.map((task) => task.taskId));
      const next = prev.filter((taskId) => availableIds.has(taskId));
      return next.length === prev.length ? prev : next;
    });
  }, [tasks]);

  useEffect(() => {
    if (canBulkManageTasks) return;
    setSelectedTaskIds([]);
  }, [canBulkManageTasks]);

  const selectedTasks = useMemo(
    () => selectedTaskIds.map((taskId) => tasks.find((task) => task.taskId === taskId)).filter((task): task is SpacesTask => !!task),
    [selectedTaskIds, tasks],
  );

  const bulkAssigneeOptions = useMemo(() => {
    const optionMap = new Map<string, EmployeeOption>();
    assignableEmployees.forEach((employee) => optionMap.set(employee.empId, employee));
    selectedTasks.forEach((task) => {
      const assigneeId = String(task.assigneeId || '').trim();
      if (!assigneeId || optionMap.has(assigneeId)) return;
      const employee = employeeById.get(assigneeId);
      optionMap.set(
        assigneeId,
        employee || { empId: assigneeId, empName: task.assigneeName || assigneeId, role: 'EMPLOYEE' },
      );
    });
    return [
      { value: '', label: 'Unassigned' },
      ...Array.from(optionMap.values()).map((employee) => ({
        value: employee.empId,
        label: employee.empId === me.id ? `${employee.empName || 'You'} (You)` : employee.empName || employee.empId,
      })),
    ];
  }, [assignableEmployees, employeeById, me.id, selectedTasks]);

  useEffect(() => {
    if (!selectedTaskIds.length) {
      setBulkStatus('todo');
      setBulkAssigneeId('');
      setBulkDueDate('');
      setBulkTouched({ status: false, assigneeId: false, dueDate: false });
      return;
    }

    const currentSelected = selectedTaskIds
      .map((taskId) => tasks.find((task) => task.taskId === taskId))
      .filter((task): task is SpacesTask => !!task);

    const pickSharedValue = <T,>(getter: (task: SpacesTask) => T): T | undefined => {
      if (!currentSelected.length) return undefined;
      const firstValue = getter(currentSelected[0]);
      return currentSelected.every((task) => getter(task) === firstValue) ? firstValue : undefined;
    };

    setBulkStatus((pickSharedValue((task) => task.status || 'todo') ?? 'todo') as TaskStatus);
    setBulkAssigneeId(pickSharedValue((task) => task.assigneeId || '') ?? '');
    setBulkDueDate(pickSharedValue((task) => task.dueDate || '') ?? '');
    setBulkTouched({ status: false, assigneeId: false, dueDate: false });
  }, [selectedTaskIds]);

  const toggleTaskSelection = (task: SpacesTask) => {
    if (!canSelectTask(task)) return;
    setSelectedTaskIds((prev) =>
      prev.includes(task.taskId)
        ? prev.filter((taskId) => taskId !== task.taskId)
        : [...prev, task.taskId],
    );
  };

  const clearSelectedTasks = () => {
    setSelectedTaskIds([]);
    setBulkAssigneeId('');
    setBulkDueDate('');
    setBulkStatus('todo');
    setBulkTouched({ status: false, assigneeId: false, dueDate: false });
    setChecklistNotice('');
  };

  const applyBulkTaskUpdate = async (updates: Partial<SpacesTask>) => {
    if (!selectedTasks.length || bulkSaving) return;

    const hasStatusUpdate = Object.prototype.hasOwnProperty.call(updates, 'status');
    const hasAssigneeUpdate = Object.prototype.hasOwnProperty.call(updates, 'assigneeId');
    const hasDueDateUpdate = Object.prototype.hasOwnProperty.call(updates, 'dueDate');
    const eligibleTasks = selectedTasks
      .filter((task) => canSelectTask(task))
      .map((task) => {
        const taskUpdates: Partial<SpacesTask> = {};
        if (hasStatusUpdate && canChangeStatus(task)) taskUpdates.status = updates.status;
        if (hasAssigneeUpdate && canEditTask(task)) taskUpdates.assigneeId = updates.assigneeId;
        if (hasDueDateUpdate && canEditDueDate(task)) taskUpdates.dueDate = updates.dueDate;
        return { task, updates: taskUpdates };
      })
      .filter((entry) => Object.keys(entry.updates).length > 0);

    if (!eligibleTasks.length) {
      setError('No selected tasks can receive these changes.');
      return;
    }

    setBulkSaving(true);
    setError(null);
    try {
      for (const entry of eligibleTasks) {
        const ok = await patchTask(entry.task.taskId, entry.updates);
        if (!ok) {
          throw new Error('One or more selected tasks could not be updated.');
        }
      }
      clearSelectedTasks();
    } catch (e: any) {
      setError(e?.message || 'Failed to update selected tasks');
    } finally {
      setBulkSaving(false);
    }
  };

  const saveBulkTaskChanges = async () => {
    const updates: Partial<SpacesTask> = {};
    if (bulkTouched.status) updates.status = bulkStatus;
    if (bulkTouched.assigneeId) updates.assigneeId = bulkAssigneeId;
    if (bulkTouched.dueDate) updates.dueDate = bulkDueDate;

    if (!Object.keys(updates).length) {
      setError('Choose a status, assignee, or due date change before saving.');
      return;
    }

    await applyBulkTaskUpdate(updates);
  };

  const sendSelectedTaskChecklist = async () => {
    if (!selectedTasks.length || bulkSaving) return;
    const taskIds = selectedTasks
      .filter((task) => canSelectTask(task) && task.assigneeId && task.status !== 'done')
      .map((task) => task.taskId);
    if (!taskIds.length) {
      setError('Choose unfinished tasks that have an assignee before sending a checklist.');
      return;
    }

    setBulkSaving(true);
    setError(null);
    setChecklistNotice('');
    try {
      const response = await fetch(`${API_BASE}/spaces/tasks/send-checklist`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          taskIds,
          reminderIntervalHours: Number(bulkReminderIntervalHours),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to send task checklist');
      setChecklistNotice(data.emailsSent > 0
        ? `Sent ${data.emailsSent} checklist email(s) for ${data.tasksScheduled || taskIds.length} task(s). Reminders repeat every ${formatChecklistIntervalLabel(data.reminderIntervalHours || bulkReminderIntervalHours)} for unfinished tasks.`
        : (data.message || `Checklist reminders were scheduled for ${data.tasksScheduled || taskIds.length} task(s), but no email was sent. Check the employee email address and mail credentials.`),
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to send task checklist');
    } finally {
      setBulkSaving(false);
    }
  };

  const deleteSelectedTasks = async () => {
    if (!selectedTasks.length || bulkSaving) return;

    const deletableTasks = selectedTasks.filter((task) => canDeleteTask(task));
    if (!deletableTasks.length) {
      setError('No selected tasks can be deleted.');
      return;
    }

    setDeleteTaskModal(null);
    setBulkDeleteTaskModalOpen(false);
    setBulkSaving(true);
    setError(null);
    setChecklistNotice(`Deleting ${deletableTasks.length} selected task${deletableTasks.length === 1 ? '' : 's'} in background...`);

    let failedCount = 0;
    try {
      // Process deletions in small batches so requests run in parallel without overwhelming the API.
      const CONCURRENCY = 6;
      for (let index = 0; index < deletableTasks.length; index += CONCURRENCY) {
        const chunk = deletableTasks.slice(index, index + CONCURRENCY);
        const results = await Promise.all(
          chunk.map((task) => deleteTask(task.taskId, { bulk: true })),
        );
        failedCount += results.filter((ok) => !ok).length;
      }

      if (failedCount > 0) {
        throw new Error(
          failedCount === deletableTasks.length
            ? 'Failed to delete selected tasks.'
            : `Failed to delete ${failedCount} of ${deletableTasks.length} selected task(s).`,
        );
      }
      clearSelectedTasks();
      setChecklistNotice(
        `Deleted ${deletableTasks.length} selected task${deletableTasks.length === 1 ? '' : 's'}.`,
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to delete selected tasks');
      await loadSpaces({ silent: true, page: taskPage });
      void loadPlannerTasks();
    } finally {
      setBulkSaving(false);
    }
  };

  return {
    activeColumnMenuId,
    setActiveColumnMenuId,
    isRenamingColumnId,
    setIsRenamingColumnId,
    renameDraft,
    setRenameDraft,
    columnToDelete,
    setColumnToDelete,
    deleteTaskModal,
    setDeleteTaskModal,
    editingTask,
    setEditingTask,
    editingTaskMode,
    setEditingTaskMode,
    editingTaskDraft,
    setEditingTaskDraft,
    selectedTaskIds,
    bulkStatus,
    setBulkStatus,
    bulkAssigneeId,
    setBulkAssigneeId,
    bulkDueDate,
    setBulkDueDate,
    bulkTouched,
    setBulkTouched,
    bulkSaving,
    bulkReminderIntervalHours,
    setBulkReminderIntervalHours,
    checklistNotice,
    setChecklistNotice,
    bulkDeleteTaskModalOpen,
    setBulkDeleteTaskModalOpen,
    selectedTasks,
    bulkAssigneeOptions,
    toggleTaskSelection,
    clearSelectedTasks,
    saveBulkTaskChanges,
    sendSelectedTaskChecklist,
    deleteSelectedTasks,
  };
};
