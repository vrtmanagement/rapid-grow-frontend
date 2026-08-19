import { useCallback } from 'react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { saveGoal } from '../../services/goalApi';
import type { Goal, PlanningState } from '../../types';
import type {
  SpacesTaskRecurrence,
  TaskCreateRecurrenceDraft,
  TaskPriority,
  TaskStatus,
  SpacesTask,
  WeeklyTaskGroup,
} from '../../types/spaces';
import type { MonthGoalContext } from '../../components/spaces/monthGoalsHelpers';
import { clampRecurrenceOccurrences } from '../../utils/spaces/taskRecurrence';
import { getUserTimeZone } from '../../utils/timezone';
import { ensureWeeklyGroupPersistedHelper } from '../../views/spacesViewHelpers';

type LoggedInEmployee = { id: string; name: string; avatar: string; role?: string };

export interface UseSpacesTaskSubmitParams {
  me: LoggedInEmployee;
  state?: PlanningState;
  updateState?: (updater: (prev: PlanningState) => PlanningState) => PlanningState;
  taskPage: number;
  loadSpaces: (options?: { silent?: boolean; force?: boolean; page?: number }) => Promise<void>;
  setError: (message: string | null) => void;
  setChecklistNotice: (message: string) => void;
  setWeeklyError: (message: string) => void;
  setSaving: (value: boolean) => void;
  setUploadingTaskDocument: (value: boolean) => void;
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  reminderIntervalHours: string;
  selectedProjectId: string;
  taskDocumentFiles: File[];
  emailChecklistEnabled: boolean;
  emailChecklistExternalPerson: boolean;
  externalAssigneeEmail: string;
  externalAssigneeName: string;
  additionalChecklistTitles: string[];
  taskRecurrence: TaskCreateRecurrenceDraft;
  repeatEveryWeek: boolean;
  repeatCadence: string;
  repeatWeekDays: string[];
  repeatWeekTime: string;
  repeatFromDate: string;
  repeatToDate: string;
  automationTimezone: string;
  createTaskMonthGoalContext: MonthGoalContext | null;
  createTaskPlannerEnabled: boolean;
  createTaskPlannerWeekId: string;
  createTaskPlannerDayId: string;
  activeWeeklyGroups: WeeklyTaskGroup[];
  selectedWeeklyTaskGroup: WeeklyTaskGroup | null;
  isNoVisionSelected: boolean;
  uploadTaskDocuments: (files: File[]) => Promise<Array<{ url: string; name: string; mimeType: string }>>;
  buildTaskRecurrencePayload: () => SpacesTaskRecurrence | undefined;
  createTaskInternal: (params: {
    title: string;
    description: string;
    assigneeId: string;
    dueDate: string;
    priority: TaskPriority;
    status: TaskStatus;
    reminderIntervalHours: string;
    projectId: string;
    uploadedDocuments?: Array<{ url: string; name: string; mimeType: string }>;
    plannerDay?: Goal | null;
    plannerGroup?: WeeklyTaskGroup | null;
    monthGoalContext?: MonthGoalContext | null;
    emailChecklistEnabled?: boolean;
    repeatEveryWeek?: boolean;
    repeatCadence?: string;
    repeatWeekDays?: number[];
    repeatWeekTime?: string;
    repeatFromDate?: string;
    repeatToDate?: string;
    timezone?: string;
    externalAssigneeEmail?: string;
    externalAssigneeName?: string;
    recurrence?: SpacesTaskRecurrence;
  }) => Promise<SpacesTask>;
  closeTaskCreateModal: (options?: { keepError?: boolean }) => void;
}

/**
 * Owns the "create task" submit flow (validation, recurrence + checklist
 * email scheduling). Extracted from useSpacesViewController without
 * changing behavior.
 */
export const useSpacesTaskSubmit = ({
  me,
  state,
  updateState,
  taskPage,
  loadSpaces,
  setError,
  setChecklistNotice,
  setWeeklyError,
  setSaving,
  setUploadingTaskDocument,
  title,
  description,
  assigneeId,
  dueDate,
  priority,
  status,
  reminderIntervalHours,
  selectedProjectId,
  taskDocumentFiles,
  emailChecklistEnabled,
  emailChecklistExternalPerson,
  externalAssigneeEmail,
  externalAssigneeName,
  additionalChecklistTitles,
  taskRecurrence,
  repeatEveryWeek,
  repeatCadence,
  repeatWeekDays,
  repeatWeekTime,
  repeatFromDate,
  repeatToDate,
  automationTimezone,
  createTaskMonthGoalContext,
  createTaskPlannerEnabled,
  createTaskPlannerWeekId,
  createTaskPlannerDayId,
  activeWeeklyGroups,
  selectedWeeklyTaskGroup,
  isNoVisionSelected,
  uploadTaskDocuments,
  buildTaskRecurrencePayload,
  createTaskInternal,
  closeTaskCreateModal,
}: UseSpacesTaskSubmitParams) => {
  const handleCreate = useCallback(async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    if (taskDocumentFiles.length > 10) {
      setError('Only 10 files are allowed.');
      return;
    }
    const oversizedFile = taskDocumentFiles.find((file) => file.size > 10 * 1024 * 1024);
    if (oversizedFile) {
      setError(`"${oversizedFile.name}" file size is more than 10 MB.`);
      return;
    }
    setSaving(true);
    setError(null);
    setWeeklyError('');
    try {
      let plannerDay: Goal | null = null;
      let plannerGroup: WeeklyTaskGroup | null = null;
      const monthGoalContext = createTaskMonthGoalContext;

      if (!monthGoalContext && createTaskPlannerEnabled) {
        const selectedGroup =
          activeWeeklyGroups.find((group) => group.weekSelectionKey === createTaskPlannerWeekId) ||
          selectedWeeklyTaskGroup ||
          null;
        if (!selectedGroup) {
          throw new Error('Select a planner week before creating this task.');
        }
        if (isNoVisionSelected) {
          plannerGroup = selectedGroup;
        } else {
          const preparedGroup = await ensureWeeklyGroupPersistedHelper({
            weeklyGroup: selectedGroup,
            state,
            updateState,
            saveGoalFn: saveGoal,
            setWeeklyError,
          });
          if (!preparedGroup) return;
          plannerGroup = {
            ...selectedGroup,
            week: preparedGroup.week,
            days: preparedGroup.days,
          };
        }
        plannerDay =
          plannerGroup?.days.find((day) => day.id === createTaskPlannerDayId) ||
          plannerGroup?.days[0] ||
          null;
        if (!plannerDay) {
          throw new Error('Select a planner day before creating this task.');
        }
      }

      if (emailChecklistEnabled && emailChecklistExternalPerson) {
        const normalizedEmail = externalAssigneeEmail.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
          throw new Error('Enter a valid email address for the external assignee.');
        }
      } else if (emailChecklistEnabled && !assigneeId) {
        throw new Error('Select an assignee before enabling checklist email reminders.');
      }

      const resolvedAssigneeId = emailChecklistEnabled && emailChecklistExternalPerson
        ? externalAssigneeEmail.trim().toLowerCase()
        : assigneeId;
      const resolvedExternalName = emailChecklistEnabled && emailChecklistExternalPerson
        ? externalAssigneeName.trim()
        : '';

      const checklistTitles = emailChecklistEnabled
        ? [cleanTitle, ...additionalChecklistTitles.map((item) => item.trim()).filter(Boolean)].slice(0, 5)
        : [cleanTitle];
      const recurrence = buildTaskRecurrencePayload();
      if (taskRecurrence.enabled && taskRecurrence.frequency === 'weekly' && !taskRecurrence.weekDays.length) {
        throw new Error('Select at least one day for a weekly repeating task.');
      }
      if (
        recurrence?.enabled &&
        recurrence.ends?.type === 'after' &&
        recurrence.ends.occurrences != null &&
        clampRecurrenceOccurrences(recurrence.ends.occurrences) < 1
      ) {
        throw new Error('Enter at least one occurrence for the recurrence end rule.');
      }
      if (
        emailChecklistEnabled &&
        repeatEveryWeek &&
        (!repeatFromDate || !repeatToDate)
      ) {
        throw new Error('Select from and to dates for the repeat schedule.');
      }
      if (
        emailChecklistEnabled &&
        repeatEveryWeek &&
        repeatFromDate &&
        repeatToDate &&
        repeatToDate < repeatFromDate
      ) {
        throw new Error('To date must be on or after the from date.');
      }
      if (
        emailChecklistEnabled &&
        repeatEveryWeek &&
        repeatCadence === 'week' &&
        (!Array.isArray(repeatWeekDays) || repeatWeekDays.length < 1)
      ) {
        throw new Error('Select at least one week day for the repeat schedule.');
      }
      const normalizedRepeatWeekDays = (Array.isArray(repeatWeekDays) ? repeatWeekDays : [])
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .slice(0, 6);
      const createdTasks: SpacesTask[] = [];
      let checklistEmailWarning = '';
      let checklistEmailSuccess = '';

      const uploadedDocuments = await uploadTaskDocuments(taskDocumentFiles);

      for (let index = 0; index < checklistTitles.length; index += 1) {
        const createdTask = await createTaskInternal({
          title: checklistTitles[index],
          description,
          assigneeId: resolvedAssigneeId,
          externalAssigneeEmail: emailChecklistEnabled && emailChecklistExternalPerson
            ? resolvedAssigneeId
            : undefined,
          externalAssigneeName: resolvedExternalName || undefined,
          dueDate,
          priority,
          status,
          reminderIntervalHours,
          projectId: selectedProjectId,
          uploadedDocuments,
          plannerDay,
          plannerGroup,
          monthGoalContext,
          emailChecklistEnabled: false,
          repeatEveryWeek,
          repeatCadence,
          repeatWeekDays: normalizedRepeatWeekDays,
          repeatWeekTime,
          repeatFromDate,
          repeatToDate,
          timezone: automationTimezone,
          recurrence,
        });
        createdTasks.push(createdTask);
      }

      if (emailChecklistEnabled && createdTasks.length > 0) {
        try {
          const response = await fetch(`${API_BASE}/spaces/tasks/send-checklist`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              taskIds: createdTasks.map((task) => task.taskId),
              taskDetails: createdTasks.map((task) => ({
                taskId: task.taskId,
                title: task.title,
                description: String(task.description || description || '').trim(),
                dueDate: String(task.dueDate || dueDate || '').trim(),
                priority: task.priority || priority,
                status: task.status || status,
                assigneeId: task.assigneeId || resolvedAssigneeId,
                assigneeName: String(task.assigneeName || resolvedExternalName || '').trim(),
                projectId: String(task.projectId || selectedProjectId || '').trim(),
                createdByName: String(task.createdByName || me.name || '').trim(),
                estimatedHours: Number((task as any).estimatedHours || 0),
                actualHours: Number((task as any).actualHours || 0),
                documentUrl: task.documentUrl || uploadedDocuments[0]?.url || '',
                documentName: task.documentName || uploadedDocuments[0]?.name || '',
                documentMimeType: task.documentMimeType || uploadedDocuments[0]?.mimeType || '',
                documents:
                  Array.isArray(task.documents) && task.documents.length
                    ? task.documents
                    : uploadedDocuments,
              })),
              reminderIntervalHours: Number(reminderIntervalHours),
              repeatEveryWeek,
              repeatCadence,
              repeatWeekDay: normalizedRepeatWeekDays[0],
              repeatWeekDays: normalizedRepeatWeekDays,
              repeatWeekTime,
              repeatFromDate,
              repeatToDate,
              timezone: automationTimezone,
              repeatOccurrences: null,
              scheduleOnly: repeatEveryWeek === true,
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            checklistEmailWarning =
              data.message || 'Tasks were created, but the checklist email could not be scheduled.';
          } else if (repeatEveryWeek) {
            const nextAt = data.nextReminderAt
              ? new Date(data.nextReminderAt).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: getUserTimeZone(),
                })
              : '';
            checklistEmailSuccess =
              createdTasks.length === 1
                ? `Task scheduled. Mail will send${nextAt ? ` on ${nextAt}` : ' at the selected time'}.`
                : `${createdTasks.length} tasks scheduled. Mail will send${nextAt ? ` starting ${nextAt}` : ' at the selected times'}.`;
          } else if (!data.emailsSent) {
            checklistEmailWarning =
              data.message ||
              'Tasks were created, but no checklist email was sent. Check the assignee email address and mail credentials.';
          } else {
            checklistEmailSuccess =
              createdTasks.length === 1
                ? 'Checklist email sent to the assignee. Reminder emails will follow at your selected interval.'
                : `Checklist email sent for ${data.emailsSent} assignee(s). Reminder emails will follow at your selected interval.`;
          }
        } catch (emailErr: any) {
          checklistEmailWarning =
            emailErr?.message || 'Tasks were created, but the checklist email could not be scheduled.';
        }
      }

      closeTaskCreateModal({ keepError: !!checklistEmailWarning });
      if (checklistEmailWarning) setError(checklistEmailWarning);
      else if (checklistEmailSuccess) setChecklistNotice(checklistEmailSuccess);

      if (emailChecklistEnabled && createdTasks.length > 0) {
        await loadSpaces({ silent: true, force: true, page: taskPage });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to create task');
    } finally {
      setUploadingTaskDocument(false);
      setSaving(false);
    }
  }, [
    title,
    taskDocumentFiles,
    setError,
    setSaving,
    setWeeklyError,
    createTaskMonthGoalContext,
    createTaskPlannerEnabled,
    activeWeeklyGroups,
    createTaskPlannerWeekId,
    selectedWeeklyTaskGroup,
    isNoVisionSelected,
    state,
    updateState,
    createTaskPlannerDayId,
    emailChecklistEnabled,
    emailChecklistExternalPerson,
    externalAssigneeEmail,
    assigneeId,
    externalAssigneeName,
    additionalChecklistTitles,
    buildTaskRecurrencePayload,
    taskRecurrence,
    repeatEveryWeek,
    repeatFromDate,
    repeatToDate,
    repeatCadence,
    repeatWeekDays,
    uploadTaskDocuments,
    createTaskInternal,
    description,
    dueDate,
    priority,
    status,
    reminderIntervalHours,
    selectedProjectId,
    repeatWeekTime,
    automationTimezone,
    me.name,
    closeTaskCreateModal,
    setChecklistNotice,
    loadSpaces,
    taskPage,
    setUploadingTaskDocument,
  ]);

  return { handleCreate };
};
