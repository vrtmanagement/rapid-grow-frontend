import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE, apiGetJson, getAuthHeaders, getStoredAuthSession } from '../config/api';
import { peekApiCache } from '../services/apiCache';
import {
  fetchSpacesList,
  SPACES_PLANNER_FETCH_LIMIT,
  SPACES_TASKS_PAGE_SIZE,
} from '../services/spacesApi';
import { QUARTER_LABELS } from '../appSeedConstants';
import { Goal, PlanningState, WorkspaceTask } from '../types';
import { saveGoal } from '../services/goalApi';
import { getSocket } from '../realtime/socket';
import PageSectionSubnav from '../components/layout/PageSectionSubnav';
import { parseDateValue } from '../components/spaces/SpacesFormControls';
import type { CreateMonthGoalTaskPayload } from '../components/spaces/SpacesMonthGoalAddForm';
import {
  buildMonthGoalCustomFields,
  MonthGoalContext,
  MonthGoalTaskDraft,
  validateMonthGoalTaskDraft,
} from '../components/spaces/monthGoalsHelpers';
import SpacesMainSections, { PremiumCreateTaskButton } from '../components/spaces/SpacesMainSections';
import {
  BackendRole,
  EmployeeOption,
  ProjectOption,
  SpacesColumn,
  SpacesMode,
  SpacesTask,
  TaskFilterMode,
  TaskPriority,
  TaskStatus,
  WeeklyTaskGroup,
  findScrollableContainer,
  forceDownloadDocument,
  getDayDisplay,
  getLoggedInEmployee,
  getReviewerLabel,
  getWeekBreadcrumb,
  getWeekStartDate,
  canChangeStatusForView,
  canCommentOnTaskForView,
  canDeleteTaskForView,
  canEditDueDateForView,
  canEditTaskForView,
  canValidateTaskForView,
  buildTopPriorityTasksForAssignee,
  buildWeeklyTaskCustomFields,
  buildWeeklyTaskGroups,
  createDaysForWeekHelper,
  ensureWeeklyGroupPersistedHelper,
  handleAddColumnHelper,
  getTaskRowClassesForView,
  isTaskLockedForView,
  shouldHideAdminTaskFromViewer,
  isTaskAssignedToViewer,
  isSubmittedStatus,
  normalizeRole,
  normalizeTaskForUi,
  isRecurringSeriesActive,
  isRecurringSeriesTask,
  projectCharterPayloadFromBackendProject,
  assigneeOptionsForTaskHelper,
  toggleDailyHelper,
  upsertTaskByIdHelper,
} from './spacesViewHelpers';
interface Props {
  mode: SpacesMode;
  state?: PlanningState;
  updateState?: (updater: (prev: PlanningState) => PlanningState) => void;
}

type TaskRecurrenceDraft = {
  enabled: boolean;
  scheduleMode: 'day' | 'date';
  dayOfWeek: string;
  dayOfMonth: string;
  time: string;
  startMonth: string;
  endMonth: string;
  repeatCount: string;
};

const NO_VISION_SELECTOR_VALUE = '__no_vision__';
const EVERYDAY_REPEAT_VALUE = 'everyday';

function getDefaultRepeatTime() {
  const now = new Date();
  now.setSeconds(0, 0);
  const roundedMinutes = Math.ceil(now.getMinutes() / 30) * 30;
  if (roundedMinutes >= 60) {
    now.setHours(now.getHours() + 1, 0, 0, 0);
  } else {
    now.setMinutes(roundedMinutes, 0, 0);
  }
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function buildDefaultTaskRecurrenceDraft(): TaskRecurrenceDraft {
  const now = new Date();
  return {
    enabled: false,
    scheduleMode: 'day',
    dayOfWeek: String(now.getDay()),
    dayOfMonth: String(now.getDate()),
    time: getDefaultRepeatTime(),
    startMonth: String(now.getMonth() + 1),
    endMonth: '12',
    repeatCount: '0',
  };
}

function parseTimeValue(timeValue: string) {
  const [rawHours = '9', rawMinutes = '0'] = String(timeValue || '').split(':');
  const hours = Math.max(0, Math.min(23, Number(rawHours) || 0));
  const minutes = Math.max(0, Math.min(59, Number(rawMinutes) || 0));
  return { hours, minutes };
}

function clampLocalDayOfMonth(year: number, monthIndex: number, dayOfMonth: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.max(1, Math.min(lastDay, dayOfMonth));
}

function buildLocalScheduledDate(year: number, monthIndex: number, dayOfMonth: number, timeValue: string) {
  const safeDay = clampLocalDayOfMonth(year, monthIndex, dayOfMonth);
  const { hours, minutes } = parseTimeValue(timeValue);
  return new Date(year, monthIndex, safeDay, hours, minutes, 0, 0);
}

function buildNextDayModeRun(dayOfWeek: string, timeValue: string, fromDate = new Date()) {
  const now = new Date(fromDate);
  const candidate = new Date(now);
  const { hours, minutes } = parseTimeValue(timeValue);
  candidate.setSeconds(0, 0);
  candidate.setHours(hours, minutes, 0, 0);

  if (dayOfWeek === EVERYDAY_REPEAT_VALUE) {
    if (candidate.getTime() <= now.getTime()) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  const targetDay = Number(dayOfWeek);
  const safeTargetDay = Number.isInteger(targetDay) ? Math.max(0, Math.min(6, targetDay)) : now.getDay();
  let offset = (safeTargetDay - now.getDay() + 7) % 7;
  if (offset === 0 && candidate.getTime() <= now.getTime()) {
    offset = 7;
  }
  candidate.setDate(candidate.getDate() + offset);
  return candidate;
}

function buildNextDateModeRun(
  dayOfMonth: string,
  startMonth: string,
  endMonth: string,
  timeValue: string,
  fromDate = new Date(),
) {
  const now = new Date(fromDate);
  const targetDay = Math.max(1, Math.min(31, Number(dayOfMonth) || 1));
  const start = Math.max(1, Math.min(12, Number(startMonth) || now.getMonth() + 1));
  const end = Math.max(start, Math.min(12, Number(endMonth) || start));

  for (let yearOffset = 0; yearOffset < 3; yearOffset += 1) {
    const year = now.getFullYear() + yearOffset;
    for (let month = start; month <= end; month += 1) {
      const candidate = buildLocalScheduledDate(year, month - 1, targetDay, timeValue);
      if (candidate.getTime() > now.getTime()) {
        return candidate;
      }
    }
  }

  return buildLocalScheduledDate(now.getFullYear() + 1, start - 1, targetDay, timeValue);
}

function formatChecklistIntervalLabel(value: string | number) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return '1 hour';
  const minutes = Math.round(hours * 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  if (minutes % 60 === 0) {
    const wholeHours = minutes / 60;
    return `${wholeHours} hour${wholeHours === 1 ? '' : 's'}`;
  }
  return `${minutes} minutes`;
}

const SpacesView: React.FC<Props> = ({ mode, state, updateState }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const taskHubRootRef = useRef<HTMLDivElement | null>(null);
  const generateId = () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto.randomUUID() as string)
      : Math.random().toString(36).slice(2));
  const me = useMemo(() => getLoggedInEmployee(), []);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [columns, setColumns] = useState<SpacesColumn[]>([]);
  const [tasks, setTasks] = useState<SpacesTask[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [markingTasksViewed, setMarkingTasksViewed] = useState(false);
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState(me.id || '');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [emailChecklistEnabled, setEmailChecklistEnabled] = useState(false);
  const [additionalChecklistTitles, setAdditionalChecklistTitles] = useState<string[]>([]);
  const [reminderIntervalHours, setReminderIntervalHours] = useState('24');
  const [taskRecurrence, setTaskRecurrence] = useState<TaskRecurrenceDraft>(() => buildDefaultTaskRecurrenceDraft());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [taskDocumentFile, setTaskDocumentFile] = useState<File | null>(null);
  const [aiAssigning, setAiAssigning] = useState(false);
  const [aiAssignFileName, setAiAssignFileName] = useState('');
  const [uploadingTaskDocument, setUploadingTaskDocument] = useState(false);
  const [saving, setSaving] = useState(false);
  const [monthGoalSaving, setMonthGoalSaving] = useState(false);
  const [stoppingRecurrenceTaskId, setStoppingRecurrenceTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTaskCreateModalOpen, setIsTaskCreateModalOpen] = useState(false);
  const [createTaskPlannerEnabled, setCreateTaskPlannerEnabled] = useState(false);
  const [createTaskPlannerQuarterId, setCreateTaskPlannerQuarterId] = useState('');
  const [createTaskPlannerMonthId, setCreateTaskPlannerMonthId] = useState('');
  const [createTaskPlannerWeekId, setCreateTaskPlannerWeekId] = useState('');
  const [createTaskPlannerDayId, setCreateTaskPlannerDayId] = useState('');
  const [createTaskMonthGoalContext, setCreateTaskMonthGoalContext] = useState<MonthGoalContext | null>(null);
  const [weeklyError, setWeeklyError] = useState('');
  const [selectedDayByWeek, setSelectedDayByWeek] = useState<Record<string, string>>({});
  const [selectedWeeklyProjectId, setSelectedWeeklyProjectId] = useState('');
  const [selectedWeeklyQuarterId, setSelectedWeeklyQuarterId] = useState('');
  const [selectedWeeklyMonthId, setSelectedWeeklyMonthId] = useState('');
  const [selectedWeeklyGroupId, setSelectedWeeklyGroupId] = useState('');
  const [commentTaskId, setCommentTaskId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState('');
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');
  const [activeColumnMenuId, setActiveColumnMenuId] = useState<string | null>(null);
  const [isRenamingColumnId, setIsRenamingColumnId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [columnToDelete, setColumnToDelete] = useState<SpacesColumn | null>(null);
  const [deleteTaskModal, setDeleteTaskModal] = useState<SpacesTask | null>(null);
  const [rejectTaskModal, setRejectTaskModal] = useState<SpacesTask | null>(null);
  const [rejectFeedbackDraft, setRejectFeedbackDraft] = useState('');
  const [rejectingTask, setRejectingTask] = useState(false);
  const [taskFilterMode, setTaskFilterMode] = useState<TaskFilterMode>('me');
  const [taskAssigneeFilterId, setTaskAssigneeFilterId] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | ''>('');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPage, setTaskPage] = useState(1);
  const [taskListTotal, setTaskListTotal] = useState(0);
  const [taskListTotalPages, setTaskListTotalPages] = useState(1);
  const [plannerTasks, setPlannerTasks] = useState<SpacesTask[]>([]);
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
  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const yearlyVisionMetaById = useMemo(() => {
    const map = new Map<string, { title: string; details: string }>();
    (state?.yearlyGoals || []).forEach((goal, index) => {
      const title = String(goal.text || '').trim() || `Vision ${String(index + 1).padStart(2, '0')}`;
      const details = String(goal.details || '').trim();
      map.set(goal.id, { title, details });
    });
    return map;
  }, [state]);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => map.set(e.empId, e.empName));
    if (me.id && me.name) {
      map.set(me.id, me.name);
    }
    return map;
  }, [employees, me.id, me.name]);

  const canAssignTo = (emp: EmployeeOption | null): boolean => {
    if (!emp) return true;
    if (emp.empId === me.id) return true;
    const viewerRole = normalizeRole(me.role);
    const targetRole = normalizeRole(emp.role || 'EMPLOYEE');

    if (viewerRole === 'EMPLOYEE') {
      // Employee: can only assign tasks to themselves.
      return false;
    }

    if (viewerRole === 'TEAM_LEAD') {
      // Team lead: cannot assign tasks to admins / super admins
      return targetRole !== 'ADMIN' && targetRole !== 'SUPER_ADMIN';
    }

    // Admin / Super Admin: can assign to anyone
    return true;
  };

  const assignableEmployees = useMemo(() => {
    const map = new Map<string, EmployeeOption>();
    employees.forEach((emp) => {
      map.set(emp.empId, emp);
    });
    if (me.id) {
      map.set(me.id, {
        empId: me.id,
        empName: me.name || 'You',
        avatar: me.avatar || '',
        role: me.role || 'EMPLOYEE',
      });
    }
    return Array.from(map.values()).filter((emp) => canAssignTo(emp));
  }, [employees, me.id, me.name, me.role]);

  const employeeById = useMemo(() => {
    const map = new Map<string, EmployeeOption>();
    employees.forEach((emp) => map.set(emp.empId, emp));
    if (me.id) {
      map.set(me.id, {
        empId: me.id,
        empName: me.name || 'You',
        avatar: me.avatar || '',
        role: me.role || 'EMPLOYEE',
      });
    }
    return map;
  }, [employees, me.id, me.name, me.role]);

  const createAssigneeOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...assignableEmployees.map((employee) => ({
        value: employee.empId,
        label: employee.empId === me.id ? `${employee.empName} (You)` : employee.empName || 'Unknown User',
      })),
    ],
    [assignableEmployees, me.id],
  );
  const viewerRole = normalizeRole(me.role);
  const canManageWeeklyRows = viewerRole === 'SUPER_ADMIN' || viewerRole === 'ADMIN' || viewerRole === 'TEAM_LEAD';
  const canPickMonthGoalSchedule = true;
  const canPickMonthGoalAssignee = canManageWeeklyRows;
  const allowedMonthGoalAssigneeIds = useMemo(
    () => new Set(assignableEmployees.map((employee) => employee.empId)),
    [assignableEmployees],
  );
  const canBulkManageTasks = mode === 'manager' && canManageWeeklyRows;
  const canToggleWeeklyDay = canManageWeeklyRows || mode === 'employee';
  const assignmentHint =
    viewerRole === 'SUPER_ADMIN' || viewerRole === 'ADMIN'
      ? 'Admin: you can assign tasks to anyone.'
      : viewerRole === 'TEAM_LEAD'
        ? 'Team Lead: assign to yourself or employees.'
        : 'Employee: assign tasks only to yourself.';

  const priorityOptions = useMemo(
    () => [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ],
    [],
  );

  const statusOptions = useMemo(() => {
    const baseOptions = [
      { value: 'todo', label: 'To Do' },
      { value: 'doing', label: 'Doing' },
      { value: 'review', label: 'Submitted' },
      { value: 'blocked', label: 'Blocked' },
    ];

    if (mode === 'employee') {
      return baseOptions;
    }

    return [
      ...baseOptions.slice(0, 3),
      { value: 'done', label: 'Done' },
      baseOptions[3],
    ];
  }, [mode]);

  const taskStatusFilterOptions = useMemo(
    () => [
      { value: '', label: 'All statuses' },
      { value: 'todo', label: 'To Do' },
      { value: 'doing', label: 'Doing' },
      { value: 'review', label: 'Submitted' },
      { value: 'done', label: 'Done' },
      { value: 'blocked', label: 'Blocked' },
    ],
    [],
  );

  const projectSelectOptions = useMemo(
    () => [
      { value: '', label: 'No project' },
      ...projects.map((project) => ({ value: project.id, label: project.name })),
    ],
    [projects],
  );
  const weeklyProjectOptions = useMemo(
    () => [
      {
        value: NO_VISION_SELECTOR_VALUE,
        label: 'No vision',
        description: 'Create and manage task hub work without linking it to the Vision planner.',
      },
      ...(state?.yearlyGoals || [])
        .filter((goal) => String(goal.id || '').trim())
        .map((goal, index) => ({
          value: goal.id,
          label: String(goal.text || '').trim() || `Vision ${String(index + 1).padStart(2, '0')}`,
          description: String(goal.details || '').trim() || 'Yearly vision',
        })),
    ],
    [state],
  );

  const assigneeOptionsForTask = (currentAssigneeId?: string): EmployeeOption[] =>
    assigneeOptionsForTaskHelper(assignableEmployees, employeeById, currentAssigneeId);

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

  const buildSpacesListQuery = useCallback(
    (page: number) => ({
      page,
      limit: SPACES_TASKS_PAGE_SIZE,
      filter: taskFilterMode,
      status: taskStatusFilter || undefined,
      search: taskSearch.trim() || undefined,
      assigneeId:
        mode === 'manager' && canManageWeeklyRows && taskAssigneeFilterId
          ? taskAssigneeFilterId
          : undefined,
      mode,
      scope: 'list' as const,
      sync: page === 1 ? ('1' as const) : ('0' as const),
    }),
    [taskFilterMode, taskStatusFilter, taskSearch, taskAssigneeFilterId, canManageWeeklyRows, mode],
  );

  const loadSpaces = async (options: { silent?: boolean; force?: boolean; page?: number } = {}) => {
    const force = options.force === true;
    const page = options.page ?? taskPage;
    const query = buildSpacesListQuery(page);
    const cacheKey = `${API_BASE}/spaces?page=${query.page}&limit=${query.limit}&filter=${query.filter || ''}&status=${query.status || ''}&search=${query.search || ''}&assigneeId=${query.assigneeId || ''}&mode=${query.mode}&scope=list`;
    const hasCache = !force && !!peekApiCache(cacheKey);
    if (!options.silent && !hasCache) setSpacesLoading(true);
    setError(null);
    try {
      const data = await fetchSpacesList(query, { force });
      setColumns(Array.isArray(data?.columns) ? data.columns : []);
      setTasks(
        Array.isArray(data?.tasks)
          ? data.tasks.map((task: SpacesTask) => normalizeTaskForUi(task))
          : [],
      );
      setTaskListTotal(Number(data?.total || 0));
      setTaskListTotalPages(Math.max(1, Number(data?.totalPages || 1)));
    } catch (e: any) {
      if (!options.silent) setError(e?.message || 'Failed to load spaces');
    } finally {
      if (!options.silent) setSpacesLoading(false);
    }
  };

  const loadPlannerTasks = async (options: { force?: boolean } = {}) => {
    try {
      const data = await fetchSpacesList(
        {
          page: 1,
          limit: SPACES_PLANNER_FETCH_LIMIT,
          scope: 'planner',
          mode,
          sync: '0',
        },
        { force: options.force },
      );
      setPlannerTasks(
        Array.isArray(data?.tasks)
          ? data.tasks.map((task: SpacesTask) => normalizeTaskForUi(task))
          : [],
      );
    } catch {
      setPlannerTasks([]);
    }
  };

  useEffect(() => {
    void loadPlannerTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    void loadSpaces({ page: taskPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskPage, taskFilterMode, taskStatusFilter, taskSearch, taskAssigneeFilterId, mode]);

  useEffect(() => {
    const onRefresh = () => {
      void loadSpaces({ force: true });
      void loadPlannerTasks({ force: true });
    };
    const onAiTasksCreated = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (Array.isArray(detail) && detail.length) {
        const incoming = detail.map((task: SpacesTask) => normalizeTaskForUi(task));
        setTasks((prev) => incoming.reduce((next, task) => upsertTaskById(next, task), prev));
        return;
      }
      void loadSpaces();
    };
    window.addEventListener('rapidgrow:spaces-refresh', onRefresh);
    window.addEventListener('rapidgrow:ai-tasks-created', onAiTasksCreated as EventListener);
    return () => {
      window.removeEventListener('rapidgrow:spaces-refresh', onRefresh);
      window.removeEventListener('rapidgrow:ai-tasks-created', onAiTasksCreated as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me.id) return;
    const unreadCount = tasks.filter(
      (task) => task.assigneeId === me.id && task.isViewed === false && task.status !== 'done',
    ).length;
    window.dispatchEvent(
      new CustomEvent('rapidgrow:task-count-sync', {
        detail: { userId: me.id, unreadCount },
      }),
    );
  }, [tasks, me.id]);

  useEffect(() => {
    const hasUnreadAssignedTasks = tasks.some(
      (task) => task.assigneeId === me.id && task.isViewed === false,
    );

    if (!me.id || !hasUnreadAssignedTasks || markingTasksViewed) return;

    let cancelled = false;

    const markAssignedTasksAsViewed = async () => {
      setMarkingTasksViewed(true);
      try {
        const res = await fetch(`${API_BASE}/tasks/mark-as-viewed`, {
          method: 'PUT',
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          throw new Error('Failed to mark tasks as viewed');
        }
        if (!cancelled) {
          setTasks((prev) =>
            prev.map((task) =>
              task.assigneeId === me.id ? { ...task, isViewed: true } : task,
            ),
          );
        }
      } catch (e) {
        console.error('Failed to mark assigned tasks as viewed', e);
      } finally {
        if (!cancelled) {
          setMarkingTasksViewed(false);
        }
      }
    };

    markAssignedTasksAsViewed();

    return () => {
      cancelled = true;
    };
  }, [tasks, me.id, markingTasksViewed]);

  useEffect(() => {
    const socket = getSocket();
    const onSpacesChanged = (payload: any) => {
      const action = payload?.action as string | undefined;

      if (payload?.columns && (action === 'column_added' || action === 'column_deleted')) {
        const cols = Array.isArray(payload.columns) ? payload.columns : [];
        setColumns(cols);
        if (action === 'column_deleted' && payload?.columnId) {
          const deletedId = String(payload.columnId);
          setTasks((prev) =>
            prev.map((t) => {
              const cf = t.customFields || {};
              if (!(deletedId in cf)) return t;
              const { [deletedId]: _omit, ...rest } = cf;
              return { ...t, customFields: rest };
            }),
          );
        }
        return;
      }

      if (action === 'ai_assign_tasks_created' && Array.isArray(payload?.tasks)) {
        const incoming = payload.tasks.map((task: SpacesTask) => normalizeTaskForUi(task));
        setTasks((prev) => incoming.reduce((next, task) => upsertTaskById(next, task), prev));
        return;
      }

      if (action === 'task_created' && payload?.task) {
        const task = normalizeTaskForUi(payload.task as SpacesTask);
        setTasks((prev) => upsertTaskById(prev, task));
        return;
      }

      if (action === 'task_updated' && payload?.task) {
        const task = normalizeTaskForUi(payload.task as SpacesTask);
        setTasks((prev) => prev.map((t) => (t.taskId === task.taskId ? task : t)));
        return;
      }

      if (action === 'task_deleted' && payload?.taskId) {
        const taskId = String(payload.taskId);
        setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
        return;
      }

      if (
        (action === 'comment_added' || action === 'comment_updated' || action === 'comment_deleted') &&
        payload?.taskId &&
        payload?.comments
      ) {
        const taskId = String(payload.taskId);
        const comments = Array.isArray(payload.comments) ? payload.comments : [];
        setTasks((prev) =>
          prev.map((t) => (t.taskId === taskId ? ({ ...t, comments } as SpacesTask) : t)),
        );
        return;
      }
    };

    // Keep legacy event (no payload) but no API refresh: we'll ignore it.
    const noop = () => {};
    socket.on('spaces:task_created', noop);
    socket.on('spaces:changed', onSpacesChanged);
    return () => {
      socket.off('spaces:task_created', noop);
      socket.off('spaces:changed', onSpacesChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      setProjectsLoading(true);
      try {
        if (mode === 'employee') {
          if (!me.id) {
            setProjects([]);
            return;
          }
          const data = await apiGetJson<unknown[]>(`/project-charters/assigned/${me.id}`).catch(() => []);
          if (!data) {
            setProjects([]);
            return;
          }
          const list = Array.isArray(data) ? data : [];
          setProjects(
            list
              .map((p: any) => ({
                id: p.clientProjectId,
                name: p.name,
                vision: String(p.goalStatement || p.description || p.problemStatement || p.businessCase || '').trim(),
              }))
              .filter((p: ProjectOption) => p.id && p.name),
          );
        } else {
          const data = await apiGetJson<unknown[]>('/project-charters').catch(() => []);
          if (!data) {
            setProjects([]);
            return;
          }
          const list = Array.isArray(data) ? data : [];
          setProjects(
            list
              .map((p: any) => ({
                id: p.clientProjectId,
                name: p.name,
                vision: String(p.goalStatement || p.description || p.problemStatement || p.businessCase || '').trim(),
              }))
              .filter((p: ProjectOption) => p.id && p.name),
          );
        }
      } catch (e) {
        console.error('Failed to load projects for Spaces', e);
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    loadProjects();
  }, [mode, me.id]);

  useEffect(() => {
    const loadEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const data = await apiGetJson<unknown[]>('/employees').catch(() => []);
        if (!data) {
          setEmployees([]);
          return;
        }
        const list = Array.isArray(data) ? data : [];
        setEmployees(
          list
            .map((e: any) => ({
              empId: e.empId,
              empName: e.empName,
              avatar: String(e.avatar || '').trim(),
              role: (e.role || 'EMPLOYEE') as BackendRole,
            }))
            .filter((e: EmployeeOption) => e.empId && e.empName),
        );
      } catch (e) {
        console.error('Failed to load employees for Spaces', e);
        setEmployees([]);
      } finally {
        setEmployeesLoading(false);
      }
    };

    loadEmployees();
  }, []);

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

  const deleteTask = async (taskId: string, options?: { bulk?: boolean }) => {
    setError(null);
    const normalizedTaskId = String(taskId || '').trim();
    if (!normalizedTaskId) return false;

    const existing = tasks.find((task) => task.taskId === normalizedTaskId) || null;

    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${encodeURIComponent(normalizedTaskId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete task');
      }

      setTasks((prev) => prev.filter((task) => task.taskId !== normalizedTaskId));
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

  const handleAddColumn = async () => handleAddColumnHelper({ setError, setColumns });

  const resetCreateTaskForm = useCallback(
    (plannerDefaults?: { plannerEnabled?: boolean; quarterId?: string; monthId?: string; weekId?: string; dayId?: string }) => {
      setTitle('');
      setDescription('');
      setAssigneeId(me.id || '');
      setDueDate('');
      setPriority('medium');
      setStatus('todo');
      setEmailChecklistEnabled(false);
      setAdditionalChecklistTitles([]);
      setReminderIntervalHours('24');
      setTaskRecurrence(buildDefaultTaskRecurrenceDraft());
      setSelectedProjectId('');
      setTaskDocumentFile(null);
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
    setUploadingTaskDocument(true);
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
      throw new Error(uploaded.message || 'Failed to upload task document');
    }
    return {
      documentUrl: String(uploaded.documentUrl || ''),
      documentName: String(uploaded.documentName || file.name || ''),
      documentMimeType: String(uploaded.documentMimeType || file.type || ''),
    };
  }, []);

  const buildTaskRecurrencePayload = useCallback(() => {
    if (!taskRecurrence.enabled) return undefined;
    const repeatCount = Number(taskRecurrence.repeatCount || 0);
    const recurrenceLimit = Number.isFinite(repeatCount) && repeatCount > 0 ? { maxOccurrences: repeatCount } : {};

    if (taskRecurrence.scheduleMode === 'day') {
      const nextRunAt = buildNextDayModeRun(taskRecurrence.dayOfWeek, taskRecurrence.time).toISOString();
      if (taskRecurrence.dayOfWeek === EVERYDAY_REPEAT_VALUE) {
        return {
          enabled: true,
          frequency: 'daily',
          interval: 1,
          intervalUnit: 'day',
          nextRunAt,
          ...recurrenceLimit,
        };
      }
      return {
        enabled: true,
        frequency: 'weekly',
        interval: 1,
        intervalUnit: 'week',
        dayOfWeek: Number(taskRecurrence.dayOfWeek || 0),
        nextRunAt,
        ...recurrenceLimit,
      };
    }

    return {
      enabled: true,
      frequency: 'monthly',
      interval: 1,
      intervalUnit: 'month',
      dayOfMonth: Number(taskRecurrence.dayOfMonth || 1),
      startMonth: Number(taskRecurrence.startMonth || 1),
      endMonth: Number(taskRecurrence.endMonth || taskRecurrence.startMonth || 1),
      nextRunAt: buildNextDateModeRun(
        taskRecurrence.dayOfMonth,
        taskRecurrence.startMonth,
        taskRecurrence.endMonth,
        taskRecurrence.time,
      ).toISOString(),
      ...recurrenceLimit,
    };
  }, [taskRecurrence]);

  const handleAiAssignPdfUpload = useCallback(async (file: File | null) => {
    if (!file || aiAssigning) return;
    setError(null);
    setAiAssigning(true);
    setAiAssignFileName(file.name || 'PDF');
    try {
      const formData = new FormData();
      formData.append('file', file);
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
      setTasks((prev) => createdTasks.reduce((next, task) => upsertTaskById(next, task), prev));
      if (!createdTasks.length && data?.message) {
        setError(String(data.message));
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to run AI Assign');
    } finally {
      setAiAssigning(false);
      setAiAssignFileName('');
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
    taskDocumentFile: File | null;
    plannerDay?: Goal | null;
    plannerGroup?: WeeklyTaskGroup | null;
    monthGoalContext?: MonthGoalContext | null;
    emailChecklistEnabled?: boolean;
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

    const uploadedDocument = await uploadTaskDocument(params.taskDocumentFile);

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

    const res = await fetch(`${API_BASE}/spaces/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: cleanTitle,
        description: plannerDescription,
        documentUrl: uploadedDocument?.documentUrl || '',
        documentName: uploadedDocument?.documentName || '',
        documentMimeType: uploadedDocument?.documentMimeType || '',
        projectId: project?.id || '',
        projectTaskId: project ? projectTaskId : undefined,
        assigneeId: params.assigneeId,
        dueDate: params.dueDate,
        priority: params.priority,
        status: requestedStatus,
        emailChecklistEnabled: params.emailChecklistEnabled === true,
        reminderIntervalHours: Number(params.reminderIntervalHours) || 24,
        recurrence: params.recurrence,
        customFields: params.monthGoalContext
          ? buildMonthGoalCustomFields(params.monthGoalContext)
          : params.plannerDay && params.plannerGroup
            ? buildWeeklyTaskCustomFields(params.plannerDay, params.plannerGroup)
            : undefined,
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
  }, [appendProjectTaskToState, me.id, me.role, mode, projects, uploadTaskDocument]);

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
          taskDocumentFile: params.taskDocumentFile,
          monthGoalContext: params.context,
        });
      } finally {
        setMonthGoalSaving(false);
      }
    },
    [allowedMonthGoalAssigneeIds, canPickMonthGoalAssignee, createTaskInternal, me.id],
  );

  const teamMemberIds = useMemo(
    () => new Set(assignableEmployees.map((emp) => emp.empId)),
    [assignableEmployees],
  );

  const visibleTasks = useMemo(
    () => plannerTasks.filter((t) => !shouldHideAdminTaskFromViewer(t, me, employeeById, teamMemberIds)),
    [plannerTasks, me, employeeById, teamMemberIds],
  );

  const visibleListTasks = useMemo(
    () => tasks.filter((t) => !shouldHideAdminTaskFromViewer(t, me, employeeById, teamMemberIds)),
    [tasks, me, employeeById, teamMemberIds],
  );

  const taskBelongsToMe = useCallback(
    (task: SpacesTask) => isTaskAssignedToViewer(task, me.id),
    [me.id],
  );
  const canUseAssigneeFilter = mode === 'manager' && canManageWeeklyRows;
  const taskAssigneeFilterOptions = useMemo(
    () =>
      assignableEmployees.map((employee) => ({
        value: employee.empId,
        label: employee.empId === me.id ? `${employee.empName} (You)` : employee.empName || 'Unknown User',
      })),
    [assignableEmployees, me.id],
  );

  useEffect(() => {
    if (!canUseAssigneeFilter || !me.id) return;
    setTaskAssigneeFilterId((current) => (current ? current : me.id));
  }, [canUseAssigneeFilter, me.id]);

  const filteredTasks = visibleListTasks;

  const monthGoalSourceTasks = useMemo(() => {
    let list = visibleTasks;
    if (mode === 'employee' && me.id) {
      list = list.filter((task) => isTaskAssignedToViewer(task, me.id));
    } else if (canUseAssigneeFilter && taskAssigneeFilterId) {
      list = list.filter((task) => String(task.assigneeId || '').trim() === taskAssigneeFilterId);
    }
    return list;
  }, [visibleTasks, mode, me.id, canUseAssigneeFilter, taskAssigneeFilterId]);

  const sortedTasks = filteredTasks;
  const topPriorityTasks = useMemo(() => {
    const assigneeTarget =
      canUseAssigneeFilter && taskAssigneeFilterId ? taskAssigneeFilterId : me.id;
    if (!assigneeTarget) return [];

    const pool = visibleTasks.filter((task) => {
      if (canUseAssigneeFilter && taskAssigneeFilterId) {
        return String(task.assigneeId || '').trim() === taskAssigneeFilterId;
      }
      return taskBelongsToMe(task);
    });

    return buildTopPriorityTasksForAssignee(pool, assigneeTarget);
  }, [visibleTasks, me.id, taskBelongsToMe, canUseAssigneeFilter, taskAssigneeFilterId]);

  const weeklyTaskGroups = useMemo<WeeklyTaskGroup[]>(
    () => buildWeeklyTaskGroups(state, visibleTasks, parseDateValue),
    [state, visibleTasks],
  );
  const isNoVisionSelected = selectedWeeklyProjectId === NO_VISION_SELECTOR_VALUE;
  const noVisionWeeklyGroups = useMemo<WeeklyTaskGroup[]>(() => {
    if (!weeklyTaskGroups.length) return [];
    const uniqueGroups = new Map<string, WeeklyTaskGroup>();

    weeklyTaskGroups.forEach((group) => {
      const baseKey = [
        group.quarterLabel,
        group.monthLabel,
        group.weekLabel,
        group.weekRangeLabel,
      ].join('::');
      if (uniqueGroups.has(baseKey)) return;

      const quarterId = group.quarterId;
      const monthId = group.monthId;
      const syntheticWeekId = `${NO_VISION_SELECTOR_VALUE}::${quarterId}::${monthId}::${group.weekLabel}::${group.weekRangeLabel}`;
      const syntheticWeek = {
        ...group.week,
        id: syntheticWeekId,
        parentId: monthId,
        text: String(group.week.text || '').trim() || 'Weekly goal',
      };
      const syntheticDays = group.days.map((day, index) => ({
        ...day,
        id: `${syntheticWeekId}::day-${index + 1}`,
        parentId: syntheticWeekId,
        text: String(day.text || '').trim() || `Day ${index + 1}`,
      }));

      uniqueGroups.set(baseKey, {
        ...group,
        year: undefined,
        quarter: undefined,
        month: undefined,
        yearId: NO_VISION_SELECTOR_VALUE,
        quarterId,
        monthId,
        weekId: syntheticWeekId,
        week: syntheticWeek,
        days: syntheticDays,
        breadcrumbLabel: [group.quarterLabel, group.monthLabel, group.weekLabel].join(' > '),
        weekSelectionKey: syntheticWeekId,
      });
    });

    return Array.from(uniqueGroups.values()).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }, [weeklyTaskGroups]);
  const activeWeeklyGroups = isNoVisionSelected ? noVisionWeeklyGroups : weeklyTaskGroups;

  const defaultNoVisionWeeklyTaskGroup = useMemo(() => {
    if (!noVisionWeeklyGroups.length) return null;
    const today = new Date();
    return (
      noVisionWeeklyGroups.find((group) => group.weekEnd.getTime() >= today.getTime()) ||
      noVisionWeeklyGroups[noVisionWeeklyGroups.length - 1] ||
      noVisionWeeklyGroups[0]
    );
  }, [noVisionWeeklyGroups]);

  const getWeekBreadcrumbForView = (weekId: string): string => getWeekBreadcrumb(state, weekId);
  const getWeekStartDateForView = (week: Goal, days: Goal[]): Date =>
    getWeekStartDate(week, days, tasks, parseDateValue);

  const defaultWeeklyTaskGroup = useMemo(() => {
    if (!weeklyTaskGroups.length) return null;
    const today = new Date();
    return (
      weeklyTaskGroups.find((group) => group.weekEnd.getTime() >= today.getTime()) ||
      weeklyTaskGroups[weeklyTaskGroups.length - 1] ||
      weeklyTaskGroups[0]
    );
  }, [weeklyTaskGroups]);

  const defaultWeeklyTaskGroupForSelectedProject = useMemo(() => {
    if (selectedWeeklyProjectId === NO_VISION_SELECTOR_VALUE) {
      return (
        noVisionWeeklyGroups.find(
          (group) =>
            (!selectedWeeklyQuarterId || group.quarterId === selectedWeeklyQuarterId) &&
            (!selectedWeeklyMonthId || group.monthId === selectedWeeklyMonthId) &&
            (!selectedWeeklyGroupId || group.weekSelectionKey === selectedWeeklyGroupId),
        ) ||
        defaultNoVisionWeeklyTaskGroup ||
        defaultWeeklyTaskGroup
      );
    }
    const activeYearId =
      selectedWeeklyProjectId ||
      defaultWeeklyTaskGroup?.yearId ||
      state?.yearlyGoals?.[0]?.id ||
      '';
    const scopedGroups = weeklyTaskGroups.filter((group) => group.yearId === activeYearId);
    if (!scopedGroups.length) return defaultWeeklyTaskGroup;
    const today = new Date();
    return (
      scopedGroups.find((group) => group.weekEnd.getTime() >= today.getTime()) ||
      scopedGroups[scopedGroups.length - 1] ||
      scopedGroups[0]
    );
  }, [defaultNoVisionWeeklyTaskGroup, defaultWeeklyTaskGroup, noVisionWeeklyGroups, selectedWeeklyGroupId, selectedWeeklyMonthId, selectedWeeklyProjectId, selectedWeeklyQuarterId, state, weeklyTaskGroups]);

  const weeklyQuarterOptions = useMemo(() => {
    const selectedQuarterGoal = (state?.quarterlyGoals || []).find((quarter) => quarter.id === selectedWeeklyQuarterId);
    const activeYearId =
      selectedWeeklyProjectId === NO_VISION_SELECTOR_VALUE
        ? String(selectedQuarterGoal?.parentId || defaultWeeklyTaskGroup?.yearId || state?.yearlyGoals?.[0]?.id || '')
        : selectedWeeklyProjectId ||
      defaultWeeklyTaskGroupForSelectedProject?.yearId ||
      state?.yearlyGoals?.[0]?.id ||
      '';
    const quarterGoals = (state?.quarterlyGoals || []).filter((quarter) => quarter.parentId === activeYearId);
    return QUARTER_LABELS.map((quarterLabel, index) => {
      const quarter = quarterGoals.find((item) => String(item.timeline || '').trim().toUpperCase() === quarterLabel);
      const label = quarterLabel;
      const quarterNumber = index + 1;
      const startMonth = ((quarterNumber - 1) * 3) + 1;
      const endMonth = startMonth + 2;
      const quarterSummary = String(quarter?.text || quarter?.details || '').trim() || 'Quarter plan';
      return {
        value: quarter?.id || `${activeYearId || 'year'}-${quarterLabel.toLowerCase()}`,
        label,
        caption: `Months ${startMonth}-${endMonth}`,
        description: quarterSummary,
      };
    });
  }, [defaultWeeklyTaskGroup?.yearId, defaultWeeklyTaskGroupForSelectedProject?.yearId, selectedWeeklyProjectId, selectedWeeklyQuarterId, state]);

  useEffect(() => {
    if (!weeklyProjectOptions.length) {
      setSelectedWeeklyProjectId('');
      return;
    }

    setSelectedWeeklyProjectId((prev) => {
      if (prev && weeklyProjectOptions.some((option) => option.value === prev)) {
        return prev;
      }
      if (
        defaultWeeklyTaskGroupForSelectedProject?.yearId &&
        weeklyProjectOptions.some((option) => option.value === defaultWeeklyTaskGroupForSelectedProject.yearId)
      ) {
        return defaultWeeklyTaskGroupForSelectedProject.yearId;
      }
      return weeklyProjectOptions[0]?.value || '';
    });
  }, [defaultWeeklyTaskGroupForSelectedProject, weeklyProjectOptions]);

  useEffect(() => {
    if (!weeklyQuarterOptions.length) {
      setSelectedWeeklyQuarterId('');
      return;
    }

    setSelectedWeeklyQuarterId((prev) => {
      if (prev && weeklyQuarterOptions.some((option) => option.value === prev)) {
        return prev;
      }
      if (
        defaultWeeklyTaskGroupForSelectedProject?.quarterId &&
        weeklyQuarterOptions.some((option) => option.value === defaultWeeklyTaskGroupForSelectedProject.quarterId)
      ) {
        return defaultWeeklyTaskGroupForSelectedProject.quarterId;
      }
      return weeklyQuarterOptions[0]?.value || '';
    });
  }, [defaultWeeklyTaskGroupForSelectedProject, weeklyQuarterOptions]);

  const weeklyMonthOptions = useMemo(() => {
    const quarterMonths = (state?.monthlyGoals || [])
      .filter((month) => month.parentId === selectedWeeklyQuarterId)
      .sort((a, b) => {
        const aOrder = Number(String(a.timeline || '').replace(/[^0-9]/g, '')) || 0;
        const bOrder = Number(String(b.timeline || '').replace(/[^0-9]/g, '')) || 0;
        return aOrder - bOrder;
      });
    const selectedVision = yearlyVisionMetaById.get(selectedWeeklyProjectId);
    const selectedVisionTitle =
      selectedWeeklyProjectId === NO_VISION_SELECTOR_VALUE ? 'No vision' : selectedVision?.title || 'Selected vision';
    const selectedVisionDetails =
      selectedWeeklyProjectId === NO_VISION_SELECTOR_VALUE
        ? 'Not linked to the Vision planner'
        : selectedVision?.details || selectedVisionTitle;
    const selectedQuarterLabel =
      weeklyQuarterOptions.find((option) => option.value === selectedWeeklyQuarterId)?.label || 'Q1';
    const selectedQuarterNumber = Number(String(selectedQuarterLabel).replace(/[^0-9]/g, '')) || 1;
    return quarterMonths.slice(0, 3).map((month, index) => {
      const absoluteMonthNumber = ((selectedQuarterNumber - 1) * 3) + index + 1;
      const calendarMonthName = new Date(Number(state?.currentYear) || new Date().getFullYear(), absoluteMonthNumber - 1, 1).toLocaleDateString(undefined, { month: 'long' });
      return {
        value: month.id,
        label: `M${absoluteMonthNumber}`,
        caption: calendarMonthName,
        description: selectedVisionDetails || selectedVisionTitle,
      };
    });
  }, [selectedWeeklyProjectId, selectedWeeklyQuarterId, state, weeklyQuarterOptions, yearlyVisionMetaById]);

  useEffect(() => {
    if (!weeklyMonthOptions.length) {
      setSelectedWeeklyMonthId('');
      return;
    }

    setSelectedWeeklyMonthId((prev) => {
      if (prev && weeklyMonthOptions.some((option) => option.value === prev)) {
        return prev;
      }
      if (
        defaultWeeklyTaskGroupForSelectedProject?.quarterId === selectedWeeklyQuarterId &&
        weeklyMonthOptions.some((option) => option.value === defaultWeeklyTaskGroupForSelectedProject.monthId)
      ) {
        return defaultWeeklyTaskGroupForSelectedProject.monthId;
      }
      return weeklyMonthOptions[0]?.value || '';
    });
  }, [defaultWeeklyTaskGroupForSelectedProject, selectedWeeklyQuarterId, weeklyMonthOptions]);

  const weeklyWeekOptions = useMemo(() => {
    const groupsForMonth = activeWeeklyGroups.filter((group) => group.monthId === selectedWeeklyMonthId);
    const uniqueOptions = new Map<
      string,
      { value: string; label: string; caption: string; description: string; isPlaceholderWeek?: boolean }
    >();

    groupsForMonth.forEach((group) => {
      const optionKey = `${group.weekLabel}::${group.weekRangeLabel}`;
      const nextOption = {
        value: group.weekSelectionKey,
        label: group.weekLabel,
        caption: group.weekRangeLabel,
        description: group.week.text || yearlyVisionMetaById.get(selectedWeeklyProjectId)?.details || 'Weekly goal',
        isPlaceholderWeek: group.isPlaceholderWeek,
      };
      const existingOption = uniqueOptions.get(optionKey);

      if (
        !existingOption ||
        (existingOption.isPlaceholderWeek && !nextOption.isPlaceholderWeek) ||
        (existingOption.description === 'Weekly goal' && nextOption.description !== 'Weekly goal')
      ) {
        uniqueOptions.set(optionKey, nextOption);
      }
    });

    return Array.from(uniqueOptions.values()).map(({ isPlaceholderWeek: _omit, ...option }) => option);
  }, [activeWeeklyGroups, selectedWeeklyMonthId, selectedWeeklyProjectId, yearlyVisionMetaById]);

  const selectedWeeklyWeekId = useMemo(() => {
    if (!weeklyWeekOptions.length) return '';
    if (selectedWeeklyGroupId && weeklyWeekOptions.some((option) => option.value === selectedWeeklyGroupId)) {
      return selectedWeeklyGroupId;
    }
    return weeklyWeekOptions[0]?.value || '';
  }, [selectedWeeklyGroupId, weeklyWeekOptions]);

  useEffect(() => {
    if (!weeklyWeekOptions.length) {
      setSelectedWeeklyGroupId('');
      return;
    }

    setSelectedWeeklyGroupId((prev) => {
      if (prev && weeklyWeekOptions.some((option) => option.value === prev)) {
        return prev;
      }
      if (
        defaultWeeklyTaskGroupForSelectedProject?.monthId === selectedWeeklyMonthId &&
        weeklyWeekOptions.some((option) => option.value === defaultWeeklyTaskGroupForSelectedProject.weekSelectionKey)
      ) {
        return defaultWeeklyTaskGroupForSelectedProject.weekSelectionKey;
      }
      return weeklyWeekOptions[0]?.value || '';
    });
  }, [defaultWeeklyTaskGroupForSelectedProject, selectedWeeklyMonthId, weeklyWeekOptions]);

  const selectedWeeklyTaskGroup = useMemo(
    () =>
      activeWeeklyGroups.find(
        (group) =>
          (isNoVisionSelected || group.yearId === selectedWeeklyProjectId) &&
          group.quarterId === selectedWeeklyQuarterId &&
          group.monthId === selectedWeeklyMonthId &&
          group.weekSelectionKey === selectedWeeklyWeekId,
      ) ||
      activeWeeklyGroups.find(
        (group) =>
          (isNoVisionSelected || group.yearId === selectedWeeklyProjectId) &&
          group.quarterId === selectedWeeklyQuarterId &&
          group.monthId === selectedWeeklyMonthId &&
          group.weekSelectionKey === weeklyWeekOptions[0]?.value,
      ) ||
      null,
    [activeWeeklyGroups, isNoVisionSelected, selectedWeeklyMonthId, selectedWeeklyProjectId, selectedWeeklyQuarterId, selectedWeeklyWeekId, weeklyWeekOptions],
  );
  const selectedWeeklyDay = useMemo(() => {
    if (!selectedWeeklyTaskGroup?.days?.length) return null;
    const explicitSelectedDayId = selectedDayByWeek[selectedWeeklyTaskGroup.weekId] || '';
    const today = new Date();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayDay =
      selectedWeeklyTaskGroup.days.find((day, index) => {
        const dayDate = new Date(selectedWeeklyTaskGroup.weekStart);
        dayDate.setDate(selectedWeeklyTaskGroup.weekStart.getDate() + index);
        const normalizedDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
        return normalizedDay === normalizedToday;
      }) || null;
    const selectedDayId = explicitSelectedDayId || todayDay?.id || selectedWeeklyTaskGroup.days[0]?.id || '';
    return selectedWeeklyTaskGroup.days.find((day) => day.id === selectedDayId) || todayDay || selectedWeeklyTaskGroup.days[0] || null;
  }, [selectedDayByWeek, selectedWeeklyTaskGroup]);
  const activeQuarterOption = weeklyQuarterOptions.find((option) => option.value === selectedWeeklyQuarterId) || null;
  const activeMonthOption = weeklyMonthOptions.find((option) => option.value === selectedWeeklyMonthId) || null;
  const activeWeekOption = weeklyWeekOptions.find((option) => option.value === selectedWeeklyWeekId) || null;

  const handleWeeklyProjectChange = useCallback(
    (visionId: string) => {
      setSelectedWeeklyProjectId(visionId);
      if (visionId === NO_VISION_SELECTOR_VALUE) return;
      setSelectedWeeklyQuarterId('');
      setSelectedWeeklyMonthId('');
      setSelectedWeeklyGroupId('');
    },
    [],
  );

  const handleWeeklyQuarterChange = useCallback(
    (quarterId: string) => {
      if (quarterId === selectedWeeklyQuarterId) return;
      setSelectedWeeklyQuarterId(quarterId);
      setSelectedWeeklyMonthId('');
      setSelectedWeeklyGroupId('');
    },
    [selectedWeeklyQuarterId],
  );

  const handleWeeklyMonthChange = useCallback(
    (monthId: string) => {
      setSelectedWeeklyMonthId(monthId);
      setSelectedWeeklyGroupId('');
    },
    [],
  );

  const handleWeeklyWeekChange = useCallback((weekId: string) => {
    setSelectedWeeklyGroupId(weekId);
  }, []);

  const plannerWeekOptions = useMemo(
    () =>
      activeWeeklyGroups.map((group) => ({
        value: group.weekSelectionKey,
        label: `${group.weekSummaryLabel} · ${group.weekRangeLabel}`,
      })),
    [activeWeeklyGroups],
  );

  const selectedPlannerWeekGroup = useMemo(
    () => activeWeeklyGroups.find((group) => group.weekSelectionKey === createTaskPlannerWeekId) || null,
    [activeWeeklyGroups, createTaskPlannerWeekId],
  );

  const plannerDayOptions = useMemo(() => {
    if (!selectedPlannerWeekGroup?.days?.length) return [];
    return selectedPlannerWeekGroup.days.map((day, idx) => {
      const info = getDayDisplay(selectedPlannerWeekGroup.weekStart, idx);
      return {
        value: day.id,
        label: `${info.weekday} · ${info.dateText}`,
      };
    });
  }, [getDayDisplay, selectedPlannerWeekGroup]);

  const plannerSummary = useMemo(() => {
    if (createTaskMonthGoalContext) {
      return `${createTaskMonthGoalContext.monthLabel} · ${createTaskMonthGoalContext.weekLabel} · ${createTaskMonthGoalContext.dayLabel}`;
    }
    if (!selectedPlannerWeekGroup) return '';
    const selectedPlannerDay =
      selectedPlannerWeekGroup.days.find((day) => day.id === createTaskPlannerDayId) ||
      selectedPlannerWeekGroup.days[0] ||
      null;
    if (!selectedPlannerDay) return `${selectedPlannerWeekGroup.weekSummaryLabel} · ${selectedPlannerWeekGroup.weekRangeLabel}`;
    const dayIndex = selectedPlannerWeekGroup.days.findIndex((day) => day.id === selectedPlannerDay.id);
    const dayInfo = getDayDisplay(selectedPlannerWeekGroup.weekStart, Math.max(dayIndex, 0));
    return `${selectedPlannerWeekGroup.weekSummaryLabel} · ${dayInfo.weekday} ${dayInfo.dateText}`;
  }, [createTaskMonthGoalContext, createTaskPlannerDayId, getDayDisplay, selectedPlannerWeekGroup]);

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

  useEffect(() => {
    if (!createTaskPlannerEnabled) return;
    if (!plannerWeekOptions.length) {
      setCreateTaskPlannerWeekId('');
      setCreateTaskPlannerDayId('');
      return;
    }
    setCreateTaskPlannerWeekId((prev) => prev || selectedWeeklyTaskGroup?.weekSelectionKey || plannerWeekOptions[0]?.value || '');
  }, [createTaskPlannerEnabled, plannerWeekOptions, selectedWeeklyTaskGroup]);

  useEffect(() => {
    if (!createTaskPlannerEnabled) return;
    if (!selectedPlannerWeekGroup?.days?.length) {
      setCreateTaskPlannerDayId('');
      return;
    }
    setCreateTaskPlannerDayId((prev) => {
      if (prev && selectedPlannerWeekGroup.days.some((day) => day.id === prev)) {
        return prev;
      }
      return selectedPlannerWeekGroup.days[0]?.id || '';
    });
  }, [createTaskPlannerEnabled, selectedPlannerWeekGroup]);

  const formatWeeklyPeriodSummaryLabel = (label: string | undefined, type: 'quarter' | 'month' | 'week') => {
    const trimmed = String(label || '').trim();
    if (!trimmed) {
      if (type === 'quarter') return 'Quarter ?';
      if (type === 'month') return 'Month ?';
      return 'Week ?';
    }

    const prefix = type === 'quarter' ? 'Q' : type === 'month' ? 'M' : 'W';
    const match = trimmed.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
    if (!match) return trimmed;

    const word = type === 'quarter' ? 'Quarter' : type === 'month' ? 'Month' : 'Week';
    return `${word} ${match[1]}`;
  };

  const weeklyPeriodPicker = useMemo(
    () => ({
      summary:
        `${formatWeeklyPeriodSummaryLabel(activeQuarterOption?.label, 'quarter')} / ${formatWeeklyPeriodSummaryLabel(activeMonthOption?.label, 'month')} / ${formatWeeklyPeriodSummaryLabel(activeWeekOption?.label, 'week')}`,
      detail: selectedWeeklyTaskGroup
        ? `${selectedWeeklyTaskGroup.weekRangeLabel} - ${selectedWeeklyTaskGroup.week.text || 'Weekly goal'}`
        : activeMonthOption
          ? `Choose a week inside ${activeQuarterOption?.label || 'selected quarter'} ${activeMonthOption.label}`
          : 'Choose a quarter, month, and week',
      projectOptions: weeklyProjectOptions
        .filter((option) => option.value !== NO_VISION_SELECTOR_VALUE)
        .map((option) => ({
          value: option.value,
          label: option.label,
          description: option.description,
        })),
      selectedProject: selectedWeeklyProjectId,
      onProjectChange: handleWeeklyProjectChange,
      quarterOptions: weeklyQuarterOptions,
      selectedQuarter: selectedWeeklyQuarterId,
      onQuarterChange: handleWeeklyQuarterChange,
      monthOptions: weeklyMonthOptions,
      selectedMonth: selectedWeeklyMonthId,
      onMonthChange: handleWeeklyMonthChange,
      weekOptions: weeklyWeekOptions,
      selectedWeek: selectedWeeklyWeekId,
      onWeekChange: handleWeeklyWeekChange,
      disabled: !weeklyQuarterOptions.length,
    }),
    [
      activeMonthOption,
      activeQuarterOption,
      activeWeekOption,
      formatWeeklyPeriodSummaryLabel,
      handleWeeklyProjectChange,
      handleWeeklyMonthChange,
      handleWeeklyQuarterChange,
      handleWeeklyWeekChange,
      weeklyProjectOptions,
      selectedWeeklyProjectId,
      selectedWeeklyDay,
      selectedWeeklyTaskGroup,
      selectedWeeklyWeekId,
      selectedWeeklyMonthId,
      selectedWeeklyQuarterId,
      weeklyMonthOptions,
      weeklyProjectOptions,
      weeklyQuarterOptions,
      weeklyWeekOptions,
    ],
  );

  const createDaysForWeek = async (weekId: string) =>
    createDaysForWeekHelper({
      weekId,
      state,
      updateState,
      canManageWeeklyRows,
      saveGoalFn: saveGoal,
      setWeeklyError,
    });

  const toggleDaily = (id: string) =>
    (async () => {
      if (!selectedWeeklyTaskGroup) return;
      const prepared = await ensureWeeklyGroupPersistedHelper({
        weeklyGroup: selectedWeeklyTaskGroup,
        state,
        updateState,
        saveGoalFn: saveGoal,
        setWeeklyError,
      });
      if (!prepared) return;
      toggleDailyHelper({
        id,
        state,
        updateState,
        canManageWeeklyRows: canToggleWeeklyDay,
        saveGoalFn: saveGoal,
        setWeeklyError,
      });
    })();

  const handleCreate = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
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

      if (emailChecklistEnabled && !assigneeId) {
        throw new Error('Select an assignee before enabling checklist email reminders.');
      }

      const checklistTitles = emailChecklistEnabled
        ? [cleanTitle, ...additionalChecklistTitles.map((item) => item.trim()).filter(Boolean)].slice(0, 5)
        : [cleanTitle];
      const recurrence = buildTaskRecurrencePayload();
      const createdTasks: SpacesTask[] = [];
      let checklistEmailWarning = '';
      let checklistEmailSuccess = '';
      const sendEmailOnCreate = emailChecklistEnabled && checklistTitles.length === 1;

      for (let index = 0; index < checklistTitles.length; index += 1) {
        const createdTask = await createTaskInternal({
          title: checklistTitles[index],
          description,
          assigneeId,
          dueDate,
          priority,
          status,
          reminderIntervalHours,
          projectId: selectedProjectId,
          taskDocumentFile: index === 0 ? taskDocumentFile : null,
          plannerDay,
          plannerGroup,
          monthGoalContext,
          emailChecklistEnabled: sendEmailOnCreate,
          recurrence,
        });
        createdTasks.push(createdTask);

        if (sendEmailOnCreate) {
          const checklistEmail = (createdTask as SpacesTask & { checklistEmail?: { emailsSent?: number; message?: string } })
            .checklistEmail;
          if (checklistEmail?.emailsSent) {
            checklistEmailSuccess = 'Checklist email sent to the assignee. They can mark the task done from the email link.';
          } else if (checklistEmail?.message) {
            checklistEmailWarning = checklistEmail.message;
          }
        }
      }

      if (emailChecklistEnabled && !sendEmailOnCreate) {
        try {
          const response = await fetch(`${API_BASE}/spaces/tasks/send-checklist`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              taskIds: createdTasks.map((task) => task.taskId),
              reminderIntervalHours: Number(reminderIntervalHours),
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            checklistEmailWarning =
              data.message || 'Tasks were created, but the checklist email could not be sent.';
          } else if (!data.emailsSent) {
            checklistEmailWarning =
              data.message ||
              'Tasks were created, but no checklist email was sent. Check the assignee email address and mail credentials.';
          } else {
            checklistEmailSuccess = `Checklist email sent for ${data.emailsSent} assignee(s).`;
          }
        } catch (emailErr: any) {
          checklistEmailWarning =
            emailErr?.message || 'Tasks were created, but the checklist email could not be sent.';
        }
      }

      closeTaskCreateModal({ keepError: !!checklistEmailWarning });
      if (checklistEmailWarning) setError(checklistEmailWarning);
      else if (checklistEmailSuccess) setChecklistNotice(checklistEmailSuccess);
    } catch (e: any) {
      setError(e?.message || 'Failed to create task');
    } finally {
      setUploadingTaskDocument(false);
      setSaving(false);
    }
  };
  const TASKS_PER_PAGE = SPACES_TASKS_PAGE_SIZE;
  const totalTaskPages = taskListTotalPages;
  const paginatedTasks = sortedTasks;
  const visibleTaskPages = useMemo(() => {
    const radius = 2;
    const start = Math.max(1, taskPage - radius);
    const end = Math.min(totalTaskPages, taskPage + radius);
    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) pages.push(page);
    return pages;
  }, [taskPage, totalTaskPages]);

  useEffect(() => {
    setTaskPage(1);
  }, [taskFilterMode, taskStatusFilter, taskSearch, taskAssigneeFilterId, mode]);

  useEffect(() => {
    setTaskPage((prev) => Math.min(prev, totalTaskPages));
  }, [totalTaskPages]);

  useEffect(() => {
    setSelectedDayByWeek((prev) => {
      if (!weeklyTaskGroups.length) return prev;
      const today = new Date();
      const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      let changed = false;
      const next = { ...prev };
      weeklyTaskGroups.forEach(({ week, weekStart, days }) => {
        if (!days.length) return;
        const selected = next[week.id];
        if (!selected || !days.some((d) => d.id === selected)) {
          const todayDay =
            days.find((day, index) => {
              const dayDate = new Date(weekStart);
              dayDate.setDate(weekStart.getDate() + index);
              const normalizedDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
              return normalizedDay === normalizedToday;
            }) || null;
          next[week.id] = todayDay?.id || days[0].id;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [weeklyTaskGroups]);

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
    setBulkSaving(true);
    setError(null);

    let failedCount = 0;
    try {
      for (const task of deletableTasks) {
        const ok = await deleteTask(task.taskId, { bulk: true });
        if (!ok) failedCount += 1;
      }
      if (failedCount > 0) {
        throw new Error(
          failedCount === deletableTasks.length
            ? 'Failed to delete selected tasks.'
            : `Failed to delete ${failedCount} of ${deletableTasks.length} selected task(s).`,
        );
      }
      clearSelectedTasks();
      setBulkDeleteTaskModalOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete selected tasks');
      await loadSpaces({ silent: true, page: taskPage });
      void loadPlannerTasks();
    } finally {
      setBulkSaving(false);
    }
  };

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
        ? (rejectTaskModal.submittedFromStatus as TaskStatus)
        : ('todo' as TaskStatus);

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

  useEffect(() => {
    const runScrollReset = () => {
      const scrollContainer = findScrollableContainer(taskHubRootRef.current);
      if (scrollContainer === window) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
      }
    };

    runScrollReset();
    const rafId = window.requestAnimationFrame(runScrollReset);
    return () => window.cancelAnimationFrame(rafId);
  }, [mode]);

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

  const mainSectionsProps = {
    assignmentHint,
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
    hideWeeklyPlannerInCreateModal: Boolean(createTaskMonthGoalContext),
    topPriorityTasks,
    patchTask,
    onCreateMonthGoalTask: createMonthGoalTask,
    canPickMonthGoalSchedule,
    canPickMonthGoalAssignee,
    employeeId: me.id || '',
    allowedAssigneeIds: allowedMonthGoalAssigneeIds,
    monthGoalSaving,
    monthGoalUploading: uploadingTaskDocument,
    stopTaskRecurrence,
    stoppingRecurrenceTaskId,
    deleteTask,
    weeklyError,
    state,
    updateState,
    selectedWeeklyDay,
    selectedWeeklyTaskGroup,
    weeklyPeriodPicker,
    getWeekBreadcrumb: getWeekBreadcrumbForView,
    getWeekStartDate: getWeekStartDateForView,
    getDayDisplay,
    setSelectedDayByWeek,
    tasks,
    monthGoalSourceTasks,
    canUseAssigneeFilter,
    taskAssigneeFilterId,
    setTaskAssigneeFilterId,
    taskAssigneeFilterOptions,
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
    selectedTaskCount: selectedTasks.length,
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
    toggleTaskSelection,
    clearSelectedTasks,
    saveBulkTaskChanges,
    bulkDeleteTaskModalOpen,
    setBulkDeleteTaskModalOpen,
    deleteSelectedTasks,
    canSelectTask,
    taskPage,
    TASKS_PER_PAGE,
    taskListTotal,
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
  };

  return (
    <div ref={taskHubRootRef} className="-mx-16 -mb-16 mt-0 min-h-full overflow-x-hidden space-y-6 px-6 pb-8 pt-0 animate-in fade-in duration-700">
      <PageSectionSubnav
        outerClassName="px-6 sm:px-10 lg:px-14"
        innerClassName="gap-2 py-1.5 lg:min-h-[50px] lg:gap-3.5"
        leading={
          <>
            <div className="h-1.5 w-8 rounded-full bg-brand-red" />
            <span className="text-[14px] font-medium text-slate-900">Task Hub</span>
          </>
        }
        center={
          mode === 'manager' ? (
            <>
              <button
                type="button"
                className="border-b-2 border-brand-red px-1 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-900"
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => navigate('/spaces/ai-agent')}
                className="border-b-2 border-transparent px-1 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 transition-colors hover:text-slate-900"
              >
                AI Agent
              </button>
            </>
          ) : undefined
        }
        trailing={<PremiumCreateTaskButton onClick={() => openTaskCreateModal()} />}
      />
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-[15px]">
          {error}
        </div>
      )}
      <SpacesMainSections {...mainSectionsProps} />
    </div>
  );
};
export default SpacesView;
