import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';
import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../../config/api';
import type { Goal, WorkspaceTask } from '../../types';
import type {
  ProjectOption,
  SpacesMode,
  SpacesTask,
  TaskCreateRecurrenceDraft,
  TaskPriority,
  TaskStatus,
  WeeklyTaskGroup,
} from '../../types/spaces';
import type { CreateMonthGoalTaskPayload } from '../../components/spaces/SpacesMonthGoalAddForm';
import {
  buildMonthGoalCustomFields,
  type MonthGoalContext,
  MonthGoalTaskDraft,
  validateMonthGoalTaskDraft,
} from '../../components/spaces/monthGoalsHelpers';
import {
  buildCreateTaskRecurrencePayload,
  buildDefaultTaskCreateRecurrenceDraft,
} from '../../utils/spaces/taskRecurrence';
import { getUserTimeZone, normalizeUserTimeZone } from '../../utils/timezone';
import {
  buildWeeklyTaskCustomFields,
  normalizeTaskForUi,
  projectCharterPayloadFromBackendProject,
  upsertTaskByIdHelper,
} from '../../views/spacesViewHelpers';

const generateId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto.randomUUID() as string)
    : Math.random().toString(36).slice(2));

type LoggedInEmployee = { id: string; name: string; avatar: string; role?: string };
type AiAssignProgressState = {
  requestId: string;
  created: number;
  total: number;
  phase: 'uploading' | 'creating' | 'completed';
};

export interface UseSpacesTaskCreateParams {
  mode: SpacesMode;
  me: LoggedInEmployee;
  projects: ProjectOption[];
  appendProjectTaskToState: (projectId: string | undefined, task: WorkspaceTask) => void;
  navigate: NavigateFunction;
  location: Location;
  setTasks: Dispatch<SetStateAction<SpacesTask[]>>;
  canPickMonthGoalAssignee: boolean;
  allowedMonthGoalAssigneeIds: Set<string>;
  aiAssignRequestIdRef: { current: string };
  aiAssignProgress: AiAssignProgressState | null;
  setAiAssignProgress: Dispatch<SetStateAction<AiAssignProgressState | null>>;
  setError: (message: string | null) => void;
  setCreateTaskMonthGoalContext: Dispatch<SetStateAction<MonthGoalContext | null>>;
  weeklyTaskGroups: WeeklyTaskGroup[];
  selectedWeeklyTaskGroup: WeeklyTaskGroup | null;
  selectedWeeklyDay: Goal | null;
  isNoVisionSelected: boolean;
  plannerWeekOptions: Array<{ value: string; label: string }>;
  setCreateTaskPlannerEnabled: Dispatch<SetStateAction<boolean>>;
  setCreateTaskPlannerQuarterId: Dispatch<SetStateAction<string>>;
  setCreateTaskPlannerMonthId: Dispatch<SetStateAction<string>>;
  setCreateTaskPlannerWeekId: Dispatch<SetStateAction<string>>;
  setCreateTaskPlannerDayId: Dispatch<SetStateAction<string>>;
}

/**
 * Owns the "create task" form state and submission flow (single tasks, AI
 * assign PDF uploads, and month-goal tasks). Extracted from
 * useSpacesViewController without changing behavior.
 */
export const useSpacesTaskCreate = ({
  mode,
  me,
  projects,
  appendProjectTaskToState,
  navigate,
  location,
  setTasks,
  canPickMonthGoalAssignee,
  allowedMonthGoalAssigneeIds,
  aiAssignRequestIdRef,
  aiAssignProgress,
  setAiAssignProgress,
  setError,
  setCreateTaskMonthGoalContext,
  weeklyTaskGroups,
  selectedWeeklyTaskGroup,
  selectedWeeklyDay,
  isNoVisionSelected,
  plannerWeekOptions,
  setCreateTaskPlannerEnabled,
  setCreateTaskPlannerQuarterId,
  setCreateTaskPlannerMonthId,
  setCreateTaskPlannerWeekId,
  setCreateTaskPlannerDayId,
}: UseSpacesTaskCreateParams) => {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState(me.id || '');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [emailChecklistEnabled, setEmailChecklistEnabled] = useState(false);
  const [emailChecklistExternalPerson, setEmailChecklistExternalPerson] = useState(false);
  const [externalAssigneeEmail, setExternalAssigneeEmail] = useState('');
  const [externalAssigneeName, setExternalAssigneeName] = useState('');
  const [additionalChecklistTitles, setAdditionalChecklistTitles] = useState<string[]>([]);
  const [reminderIntervalHours, setReminderIntervalHours] = useState('24');
  const [repeatEveryWeek, setRepeatEveryWeek] = useState(false);
  const [repeatCadence, setRepeatCadence] = useState('week');
  const [repeatWeekDays, setRepeatWeekDays] = useState<string[]>([String(new Date().getDay())]);
  const [repeatWeekTime, setRepeatWeekTime] = useState('09:00');
  const [repeatFromDate, setRepeatFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [repeatToDate, setRepeatToDate] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() + 28);
    return end.toISOString().slice(0, 10);
  });
  const [automationTimezone, setAutomationTimezone] = useState(() => getUserTimeZone());
  const [taskRecurrence, setTaskRecurrence] = useState<TaskCreateRecurrenceDraft>(() => buildDefaultTaskCreateRecurrenceDraft());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [taskDocumentFiles, setTaskDocumentFiles] = useState<File[]>([]);
  const [aiAssigning, setAiAssigning] = useState(false);
  const [aiAssignFileName, setAiAssignFileName] = useState('');
  const [uploadingTaskDocument, setUploadingTaskDocument] = useState(false);
  const [saving, setSaving] = useState(false);
  const [monthGoalSaving, setMonthGoalSaving] = useState(false);
  const [isTaskCreateModalOpen, setIsTaskCreateModalOpen] = useState(false);

  const upsertTaskById = (prev: SpacesTask[], incoming: SpacesTask): SpacesTask[] =>
    upsertTaskByIdHelper(prev, incoming);

  const resetCreateTaskForm = useCallback(
    (plannerDefaults?: { plannerEnabled?: boolean; quarterId?: string; monthId?: string; weekId?: string; dayId?: string }) => {
      setTitle('');
      setDescription('');
      setAssigneeId(me.id || '');
      setDueDate('');
      setPriority('medium');
      setStatus('todo');
      setEmailChecklistEnabled(false);
      setEmailChecklistExternalPerson(false);
      setExternalAssigneeEmail('');
      setExternalAssigneeName('');
      setAdditionalChecklistTitles([]);
      setReminderIntervalHours('24');
      setRepeatEveryWeek(false);
      setRepeatCadence('week');
      setRepeatWeekDays([String(new Date().getDay())]);
      setRepeatWeekTime('09:00');
      {
        const today = new Date().toISOString().slice(0, 10);
        const end = new Date();
        end.setDate(end.getDate() + 28);
        setRepeatFromDate(today);
        setRepeatToDate(end.toISOString().slice(0, 10));
      }
      setAutomationTimezone(getUserTimeZone());
      setTaskRecurrence(buildDefaultTaskCreateRecurrenceDraft());
      setSelectedProjectId('');
      setTaskDocumentFiles([]);
      setCreateTaskPlannerEnabled(Boolean(plannerDefaults?.plannerEnabled));
      setCreateTaskPlannerQuarterId(plannerDefaults?.quarterId || '');
      setCreateTaskPlannerMonthId(plannerDefaults?.monthId || '');
      setCreateTaskPlannerWeekId(plannerDefaults?.weekId || '');
      setCreateTaskPlannerDayId(plannerDefaults?.dayId || '');
      setCreateTaskMonthGoalContext(null);
    },
    [me.id],
  );

  const uploadTaskDocument = useCallback(async (file: File | null) => {
    if (!file) return null;
    const maxDocumentBytes = 10 * 1024 * 1024;
    if (file.size > maxDocumentBytes) {
      throw new Error(`"${file.name}" file size is more than 10 MB.`);
    }
    setUploadingTaskDocument(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const session = getStoredAuthSession();
      const token = typeof session?.token === 'string' ? session.token : '';
      const resUpload = await fetch(`${API_BASE}/spaces/tasks/upload-document`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      const uploaded = await resUpload.json().catch(() => ({}));
      if (!resUpload.ok) {
        const errorText = String(uploaded.error || uploaded.message || 'Failed to upload task document');
        if (/file size too large|more than 10/i.test(errorText)) {
          throw new Error(`"${file.name}" file size is more than 10 MB.`);
        }
        throw new Error(uploaded.message || errorText);
      }
      return {
        documentUrl: String(uploaded.documentUrl || ''),
        documentName: String(uploaded.documentName || file.name || ''),
        documentMimeType: String(uploaded.documentMimeType || file.type || ''),
      };
    } finally {
      setUploadingTaskDocument(false);
    }
  }, []);

  const uploadTaskDocuments = useCallback(async (files: File[]) => {
    const normalized = Array.isArray(files) ? files.slice(0, 10) : [];
    const uploaded: Array<{ url: string; name: string; mimeType: string }> = [];
    for (const file of normalized) {
      const doc = await uploadTaskDocument(file);
      if (!doc) continue;
      uploaded.push({
        url: String(doc.documentUrl || ''),
        name: String(doc.documentName || file.name || ''),
        mimeType: String(doc.documentMimeType || file.type || ''),
      });
    }
    return uploaded;
  }, [uploadTaskDocument]);

  const buildTaskRecurrencePayload = useCallback(() => {
    if (!taskRecurrence.enabled) return undefined;
    return {
      ...buildCreateTaskRecurrencePayload(taskRecurrence),
      timezone: normalizeUserTimeZone(automationTimezone),
    };
  }, [automationTimezone, taskRecurrence]);

  const handleAiAssignPdfUpload = useCallback(async (file: File | null) => {
    if (!file || aiAssigning) return;
    const requestId = generateId();
    setError(null);
    setAiAssigning(true);
    setAiAssignFileName(file.name || 'PDF');
    aiAssignRequestIdRef.current = requestId;
    setAiAssignProgress({
      requestId,
      created: 0,
      total: 0,
      phase: 'uploading',
    });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('requestId', requestId);
      const session = getStoredAuthSession();
      const token = typeof session?.token === 'string' ? session.token : '';
      const response = await fetch(`${API_BASE}/ai-assign/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to run AI Assign');
      }

      const createdTasks = Array.isArray(data?.tasks)
        ? data.tasks.map((task: SpacesTask) => normalizeTaskForUi(task))
        : [];
      setAiAssignProgress((prev) =>
        prev?.requestId === requestId
          ? {
              requestId,
              created: createdTasks.length,
              total: prev.total || createdTasks.length,
              phase: 'completed',
            }
          : prev
      );
      setTasks((prev) => createdTasks.reduce((next, task) => upsertTaskById(next, task), prev));
      if (!createdTasks.length && data?.message) {
        setError(String(data.message));
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to run AI Assign');
    } finally {
      setAiAssigning(false);
      setAiAssignFileName('');
      setAiAssignProgress(null);
      aiAssignRequestIdRef.current = '';
    }
  }, [aiAssigning]);

  const createTaskInternal = useCallback(async (params: {
    title: string;
    description: string;
    assigneeId: string;
    dueDate: string;
    priority: TaskPriority;
    status: TaskStatus;
    reminderIntervalHours: string;
    projectId: string;
    taskDocumentFiles?: File[];
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
    recurrence?: Record<string, unknown>;
  }) => {
    const cleanTitle = params.title.trim();
    if (!cleanTitle) {
      throw new Error('Task title is required.');
    }
    const now = new Date().toISOString();
    const projectTaskId = `t-${generateId()}`;
    const descriptionText = params.description.trim();
    const requestedStatus =
      mode === 'employee' && params.status === 'done' ? ('review' as TaskStatus) : params.status;
    const project = params.projectId
      ? projects.find((p) => p.id === params.projectId) || null
      : null;

    const uploadedDocuments =
      Array.isArray(params.uploadedDocuments) && params.uploadedDocuments.length
        ? params.uploadedDocuments
        : await uploadTaskDocuments(params.taskDocumentFiles || []);
    const primaryDocument = uploadedDocuments[0] || null;

    if (project) {
      const resProj = await fetch(`${API_BASE}/project-charters/${project.id}`, {
        headers: getAuthHeaders(),
      });
      if (!resProj.ok) {
        throw new Error('Failed to load project details');
      }
      const proj = await resProj.json();
      const existingTasks: any[] = Array.isArray(proj?.tasks) ? proj.tasks : [];
      const newWorkspaceTask = {
        id: projectTaskId,
        title: cleanTitle,
        description: descriptionText,
        status: requestedStatus,
        reminderIntervalHours: Number(params.reminderIntervalHours),
        priority: params.priority,
        createdBy: me.id || 'employee',
        createdByRole: me.role || 'EMPLOYEE',
        assigneeId: params.assigneeId || undefined,
        dueDate: params.dueDate || undefined,
        createdAt: now,
        updatedAt: now,
      };
      const updatedTasks = [...existingTasks, newWorkspaceTask];
      const payload = projectCharterPayloadFromBackendProject(proj, updatedTasks);

      const resSave = await fetch(`${API_BASE}/project-charters`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!resSave.ok) {
        const data = await resSave.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create task under project');
      }

      appendProjectTaskToState(project.id, newWorkspaceTask);
    }

    const plannerDescription =
      descriptionText ||
      (params.monthGoalContext
        ? `Created from Month goal: ${params.monthGoalContext.monthLabel} > ${params.monthGoalContext.weekLabel} > ${params.monthGoalContext.dayLabel}`
        : params.plannerGroup
          ? `Created from Daily plan: ${params.plannerGroup.week.text || 'Weekly Goal'}`
          : '');

    const customFields = {
      ...(params.monthGoalContext
        ? buildMonthGoalCustomFields(params.monthGoalContext)
        : params.plannerDay && params.plannerGroup
          ? buildWeeklyTaskCustomFields(params.plannerDay, params.plannerGroup)
          : {}),
      ...(params.externalAssigneeName
        ? { externalAssigneeName: params.externalAssigneeName.trim() }
        : {}),
    };

    const resolvedAssigneeId = params.externalAssigneeEmail?.trim()
      ? params.externalAssigneeEmail.trim().toLowerCase()
      : params.assigneeId;

    const res = await fetch(`${API_BASE}/spaces/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: cleanTitle,
        description: plannerDescription,
        documentUrl: primaryDocument?.url || '',
        documentName: primaryDocument?.name || '',
        documentMimeType: primaryDocument?.mimeType || '',
        documents: uploadedDocuments,
        projectId: project?.id || '',
        projectTaskId: project ? projectTaskId : undefined,
        assigneeId: resolvedAssigneeId,
        externalAssigneeEmail: params.externalAssigneeEmail?.trim().toLowerCase() || undefined,
        externalAssigneeName: params.externalAssigneeName?.trim() || undefined,
        dueDate: params.dueDate,
        priority: params.priority,
        status: requestedStatus,
        emailChecklistEnabled: params.emailChecklistEnabled === true,
        repeatEveryWeek: params.repeatEveryWeek === true,
        repeatCadence: params.repeatCadence,
        repeatWeekDay: Array.isArray(params.repeatWeekDays) && params.repeatWeekDays.length
          ? params.repeatWeekDays[0]
          : undefined,
        repeatWeekDays: params.repeatWeekDays,
        repeatWeekTime: params.repeatWeekTime,
        repeatFromDate: params.repeatFromDate,
        repeatToDate: params.repeatToDate,
        timezone: params.timezone,
        reminderIntervalHours: Number(params.reminderIntervalHours) || 24,
        recurrence: params.recurrence,
        customFields: Object.keys(customFields).length ? customFields : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create task');
    }

    const checklistEmail = data?.checklistEmail;
    const normalizedTask = normalizeTaskForUi(data as SpacesTask);
    setTasks((prev) => upsertTaskById(prev, normalizedTask));
    return checklistEmail ? { ...normalizedTask, checklistEmail } : normalizedTask;
  }, [appendProjectTaskToState, me.id, me.role, mode, projects, uploadTaskDocuments]);

  const createMonthGoalTask = useCallback(
    async (params: CreateMonthGoalTaskPayload) => {
      const draft: MonthGoalTaskDraft = {
        title: params.title,
        description: params.description,
        assigneeId: canPickMonthGoalAssignee ? params.assigneeId : me.id || '',
        taskDocumentFile: params.taskDocumentFile,
        monthKey: params.context.monthKey,
        weekKey: params.context.weekKey,
        dayKey: params.context.dayKey,
      };

      const validationErrors = validateMonthGoalTaskDraft(draft, {
        canPickSchedule: true,
        canPickAssignee: canPickMonthGoalAssignee,
        employeeId: me.id || '',
        allowedAssigneeIds: allowedMonthGoalAssigneeIds,
      });
      if (validationErrors.length) {
        throw new Error(validationErrors[0]);
      }

      setMonthGoalSaving(true);
      setError(null);
      try {
        await createTaskInternal({
          title: params.title.trim(),
          description: params.description.trim(),
          assigneeId: canPickMonthGoalAssignee ? params.assigneeId : me.id || '',
          dueDate: params.context.dayDate,
          priority: 'medium',
          status: 'todo',
          reminderIntervalHours: '24',
          projectId: '',
          taskDocumentFiles: params.taskDocumentFile ? [params.taskDocumentFile] : [],
          monthGoalContext: params.context,
        });
      } finally {
        setMonthGoalSaving(false);
      }
    },
    [allowedMonthGoalAssigneeIds, canPickMonthGoalAssignee, createTaskInternal, me.id],
  );

  const openTaskCreateModal = useCallback(
    (plannerDefaults?: {
      plannerEnabled?: boolean;
      weeklyGroup?: WeeklyTaskGroup | null;
      day?: Goal | null;
      monthGoalContext?: MonthGoalContext;
    }) => {
      setError(null);
      if (plannerDefaults?.monthGoalContext) {
        setCreateTaskMonthGoalContext(plannerDefaults.monthGoalContext);
        resetCreateTaskForm({ plannerEnabled: false });
        setDueDate(plannerDefaults.monthGoalContext.dayDate || '');
        setIsTaskCreateModalOpen(true);
        return;
      }

      setCreateTaskMonthGoalContext(null);
      const defaultWeekId =
        plannerDefaults?.weeklyGroup?.weekSelectionKey ||
        selectedWeeklyTaskGroup?.weekSelectionKey ||
        plannerWeekOptions[0]?.value ||
        '';
      const selectedGroup =
        weeklyTaskGroups.find((group) => group.weekSelectionKey === defaultWeekId) || selectedWeeklyTaskGroup || null;
      const defaultDayId =
        plannerDefaults?.day?.id ||
        (selectedGroup?.days.find((day) => day.id === selectedWeeklyDay?.id)?.id || selectedGroup?.days[0]?.id || '');
      resetCreateTaskForm({
        plannerEnabled: Boolean(plannerDefaults?.plannerEnabled) && !isNoVisionSelected,
        weekId: defaultWeekId,
        dayId: defaultDayId,
      });
      setIsTaskCreateModalOpen(true);
    },
    [isNoVisionSelected, plannerWeekOptions, resetCreateTaskForm, selectedWeeklyDay?.id, selectedWeeklyTaskGroup, weeklyTaskGroups],
  );

  const closeTaskCreateModal = useCallback((options?: { keepError?: boolean }) => {
    setIsTaskCreateModalOpen(false);
    if (!options?.keepError) setError(null);
    resetCreateTaskForm();
    setUploadingTaskDocument(false);
    setSaving(false);
  }, [resetCreateTaskForm]);

  useEffect(() => {
    if (!location.state || !(location.state as { openCreateTask?: boolean }).openCreateTask) return;
    openTaskCreateModal();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate, openTaskCreateModal]);

  return {
    title,
    setTitle,
    assigneeId,
    setAssigneeId,
    dueDate,
    setDueDate,
    description,
    setDescription,
    priority,
    setPriority,
    status,
    setStatus,
    emailChecklistEnabled,
    setEmailChecklistEnabled,
    emailChecklistExternalPerson,
    setEmailChecklistExternalPerson,
    externalAssigneeEmail,
    setExternalAssigneeEmail,
    externalAssigneeName,
    setExternalAssigneeName,
    additionalChecklistTitles,
    setAdditionalChecklistTitles,
    reminderIntervalHours,
    setReminderIntervalHours,
    repeatEveryWeek,
    setRepeatEveryWeek,
    repeatCadence,
    setRepeatCadence,
    repeatWeekDays,
    setRepeatWeekDays,
    repeatWeekTime,
    setRepeatWeekTime,
    repeatFromDate,
    setRepeatFromDate,
    repeatToDate,
    setRepeatToDate,
    automationTimezone,
    setAutomationTimezone,
    taskRecurrence,
    setTaskRecurrence,
    selectedProjectId,
    setSelectedProjectId,
    taskDocumentFiles,
    setTaskDocumentFiles,
    aiAssigning,
    aiAssignFileName,
    aiAssignProgress,
    uploadingTaskDocument,
    saving,
    monthGoalSaving,
    setMonthGoalSaving,
    isTaskCreateModalOpen,
    setSaving,
    setUploadingTaskDocument,
    uploadTaskDocuments,
    buildTaskRecurrencePayload,
    createTaskInternal,
    handleAiAssignPdfUpload,
    openTaskCreateModal,
    closeTaskCreateModal,
    createMonthGoalTask,
  };
};
