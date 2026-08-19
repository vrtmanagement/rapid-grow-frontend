import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { peekApiCache } from '../../services/apiCache';
import { fetchTabEndpoint } from '../../services/tabSessionCache';
import { fetchSpacesList, SPACES_PLANNER_FETCH_LIMIT, SPACES_TASKS_PAGE_SIZE } from '../../services/spacesApi';
import { getSocket } from '../../realtime/socket';
import { NO_VISION_SELECTOR_VALUE } from '../../utils/spaces/taskRecurrence';
import type { PlanningState } from '../../types';
import type {
  BackendRole,
  EmployeeOption,
  ProjectOption,
  SpacesColumn,
  SpacesMode,
  SpacesTask,
  TaskFilterMode,
  TaskStatus,
} from '../../types/spaces';
import {
  assigneeOptionsForTaskHelper,
  getLoggedInEmployee,
  handleAddColumnHelper,
  normalizeRole,
  normalizeTaskForUi,
  upsertTaskByIdHelper,
} from '../../views/spacesViewHelpers';

type LoggedInEmployee = ReturnType<typeof getLoggedInEmployee>;

export interface UseSpacesBootstrapParams {
  mode: SpacesMode;
  state?: PlanningState;
  me: LoggedInEmployee;
  taskPage: number;
  taskFilterMode: TaskFilterMode;
  taskStatusFilter: TaskStatus | '';
  debouncedTaskSearch: string;
  taskAssigneeFilterId: string;
  setError: (message: string | null) => void;
  aiAssignRequestIdRef: { current: string };
}

/**
 * Owns the Spaces "source of truth" data: projects, employees, columns, tasks,
 * planner tasks, realtime sync, and the employee/project option lists derived
 * from that data. Extracted from useSpacesViewController without changing behavior.
 */
export const useSpacesBootstrap = ({
  mode,
  state,
  me,
  taskPage,
  taskFilterMode,
  taskStatusFilter,
  debouncedTaskSearch,
  taskAssigneeFilterId,
  setError,
  aiAssignRequestIdRef,
}: UseSpacesBootstrapParams) => {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [columns, setColumns] = useState<SpacesColumn[]>([]);
  const [tasks, setTasks] = useState<SpacesTask[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [markingTasksViewed, setMarkingTasksViewed] = useState(false);
  const [taskListTotal, setTaskListTotal] = useState(0);
  const [taskListTotalPages, setTaskListTotalPages] = useState(1);
  const [plannerTasks, setPlannerTasks] = useState<SpacesTask[]>([]);
  const [aiAssignProgress, setAiAssignProgress] = useState<{
    requestId: string;
    created: number;
    total: number;
    phase: 'uploading' | 'creating' | 'completed';
  } | null>(null);

  const upsertTaskById = (prev: SpacesTask[], incoming: SpacesTask): SpacesTask[] =>
    upsertTaskByIdHelper(prev, incoming);

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
  const canBulkManageTasks = (mode === 'manager' && canManageWeeklyRows) || mode === 'employee';
  const canToggleWeeklyDay = canManageWeeklyRows || mode === 'employee';
  const canUseAssigneeFilter = mode === 'manager' && canManageWeeklyRows;
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

  const buildSpacesListQuery = useCallback(
    (page: number) => ({
      page,
      limit: SPACES_TASKS_PAGE_SIZE,
      filter: taskFilterMode,
      status: taskStatusFilter || undefined,
      search: debouncedTaskSearch || undefined,
      assigneeId: undefined,
      mode,
      scope: 'list' as const,
      sync: '0' as const,
    }),
    [taskFilterMode, taskStatusFilter, debouncedTaskSearch, taskAssigneeFilterId, canManageWeeklyRows, mode],
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
      const data = await fetchSpacesList(query, { force, tabKey: 'spaces' });
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
    const timer = window.setTimeout(() => {
      void loadPlannerTasks();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    void loadSpaces({ page: taskPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskPage, taskFilterMode, taskStatusFilter, debouncedTaskSearch, taskAssigneeFilterId, mode]);

  useEffect(() => {
    if (taskListTotalPages <= 1 || taskPage >= taskListTotalPages) return;

    void fetchSpacesList(buildSpacesListQuery(taskPage + 1)).catch(() => {
      // Best-effort prefetch only; keep the current UX unchanged on failure.
    });
  }, [buildSpacesListQuery, taskPage, taskListTotalPages]);

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

      if (action === 'ai_assign_progress') {
        const requestId = String(payload?.requestId || '').trim();
        if (!requestId || requestId !== aiAssignRequestIdRef.current) {
          return;
        }

        const total = Number(payload?.total || 0);
        const created = Number(payload?.created || 0);
        const phase =
          payload?.phase === 'completed'
            ? 'completed'
            : payload?.phase === 'progress'
              ? 'creating'
              : 'uploading';

        setAiAssignProgress((prev) => ({
          requestId,
          total: total > 0 ? total : prev?.total || 0,
          created: Math.max(created, prev?.created || 0),
          phase,
        }));
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
          const data = await fetchTabEndpoint<unknown[]>(
            'spaces',
            `/project-charters/assigned/${me.id}?summary=1`,
          ).catch(() => []);
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
          const data = await fetchTabEndpoint<unknown[]>('spaces', '/project-charters?summary=1').catch(() => []);
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
        const data = await fetchTabEndpoint<unknown[]>('spaces', '/employees').catch(() => []);
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

  const handleAddColumn = async () => handleAddColumnHelper({ setError, setColumns });

  return {
    projects,
    projectsLoading,
    employees,
    employeesLoading,
    columns,
    setColumns,
    tasks,
    setTasks,
    spacesLoading,
    markingTasksViewed,
    taskListTotal,
    taskListTotalPages,
    plannerTasks,
    setPlannerTasks,
    aiAssignProgress,
    setAiAssignProgress,
    projectNameById,
    yearlyVisionMetaById,
    employeeNameById,
    assignableEmployees,
    employeeById,
    createAssigneeOptions,
    viewerRole,
    canManageWeeklyRows,
    canPickMonthGoalSchedule,
    canPickMonthGoalAssignee,
    allowedMonthGoalAssigneeIds,
    canBulkManageTasks,
    canToggleWeeklyDay,
    canUseAssigneeFilter,
    assignmentHint,
    priorityOptions,
    statusOptions,
    taskStatusFilterOptions,
    projectSelectOptions,
    weeklyProjectOptions,
    assigneeOptionsForTask,
    buildSpacesListQuery,
    loadSpaces,
    loadPlannerTasks,
    handleAddColumn,
    upsertTaskById,
  };
};
