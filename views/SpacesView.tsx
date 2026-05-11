import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../config/api';
import { QUARTER_LABELS } from '../appSeedConstants';
import { Goal, PlanningState, WorkspaceTask } from '../types';
import { saveGoal } from '../services/goalApi';
import { RefreshCw } from 'lucide-react';
import { getSocket } from '../realtime/socket';
import { parseDateValue } from '../components/spaces/SpacesFormControls';
import SpacesMainSections from '../components/spaces/SpacesMainSections';
import {
  BackendRole,
  CreatePanelTab,
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
  getPriorityRowClass,
  getReviewerLabel,
  getSundayStart,
  getWeekBreadcrumb,
  getWeekStartDate,
  canChangeStatusForView,
  canCommentOnTaskForView,
  canDeleteTaskForView,
  canEditDueDateForView,
  canEditTaskForView,
  canValidateTaskForView,
  buildWeeklyTaskCustomFields,
  buildWeeklyTaskGroups,
  createDaysForWeekHelper,
  ensureWeeklyGroupPersistedHelper,
  handleAddColumnHelper,
  getTaskRowClassesForView,
  isTaskLockedForView,
  isSubmittedStatus,
  normalizeRole,
  normalizeTaskForUi,
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

const SpacesView: React.FC<Props> = ({ mode, state, updateState }) => {
  const navigate = useNavigate();
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
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [taskDocumentFile, setTaskDocumentFile] = useState<File | null>(null);
  const [uploadingTaskDocument, setUploadingTaskDocument] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createPanelTab, setCreatePanelTab] = useState<CreatePanelTab>('add-task');
  const [weeklyError, setWeeklyError] = useState('');
  const [assignDraftByDay, setAssignDraftByDay] = useState<
    Record<
      string,
      {
        title: string;
        assigneeId: string;
        dueDate: string;
        priority: string;
        status: string;
        description: string;
        projectId: string;
      }
    >
  >({});
  const [assigningDayTaskId, setAssigningDayTaskId] = useState('');
  const [selectedDayByWeek, setSelectedDayByWeek] = useState<Record<string, string>>({});
  const [weeklyTaskDocumentByDay, setWeeklyTaskDocumentByDay] = useState<Record<string, File | null>>({});
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
  const [taskFilterMode, setTaskFilterMode] = useState<TaskFilterMode>('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPage, setTaskPage] = useState(1);
  const [editingTask, setEditingTask] = useState<SpacesTask | null>(null);
  const [editingTaskMode, setEditingTaskMode] = useState<'view' | 'edit'>('view');
  const [editingTaskDraft, setEditingTaskDraft] = useState<Partial<SpacesTask>>({});
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

  const projectSelectOptions = useMemo(
    () => [
      { value: '', label: 'No project' },
      ...projects.map((project) => ({ value: project.id, label: project.name })),
    ],
    [projects],
  );
  const weeklyProjectOptions = useMemo(
    () =>
      (state?.yearlyGoals || [])
        .filter((goal) => String(goal.id || '').trim())
        .map((goal, index) => ({
          value: goal.id,
          label: String(goal.text || '').trim() || `Vision ${String(index + 1).padStart(2, '0')}`,
          description: String(goal.details || '').trim() || 'Yearly vision',
        })),
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

  const loadSpaces = async () => {
    setSpacesLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load spaces');
      }
      const data = await res.json();
      setColumns(Array.isArray(data?.columns) ? data.columns : []);
      setTasks(
        Array.isArray(data?.tasks)
          ? data.tasks.map((task: SpacesTask) => normalizeTaskForUi(task))
          : [],
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to load spaces');
    } finally {
      setSpacesLoading(false);
    }
  };

  useEffect(() => {
    loadSpaces();
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
          const res = await fetch(`${API_BASE}/project-charters/assigned/${me.id}`, {
            headers: getAuthHeaders(),
          });
          if (!res.ok) {
            setProjects([]);
            return;
          }
          const data = await res.json().catch(() => []);
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
          const res = await fetch(`${API_BASE}/project-charters`, {
            headers: getAuthHeaders(),
          });
          if (!res.ok) {
            setProjects([]);
            return;
          }
          const data = await res.json().catch(() => []);
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
        const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
        if (!res.ok) {
          setEmployees([]);
          return;
        }
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];
        setEmployees(
          list
            .map((e: any) => ({
              empId: e.empId,
              empName: e.empName,
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
    setTasks((prev) =>
      prev.map((t) =>
        t.taskId === taskId ? ({ ...t, ...normalizedUpdates } as SpacesTask) : t,
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

  const deleteTask = async (taskId: string) => {
    setError(null);
    const existing = tasks.find((task) => task.taskId === taskId) || null;
    if (!existing) return true;

    setTasks((prev) => prev.filter((task) => task.taskId !== taskId));

    let backendProject: any = null;
    let existingProjectTasks: any[] = [];

    try {
      if (existing.projectId && existing.projectTaskId) {
        const resProject = await fetch(`${API_BASE}/project-charters/${existing.projectId}`, {
          headers: getAuthHeaders(),
        });
        if (!resProject.ok) {
          throw new Error('Failed to load project details');
        }

        backendProject = await resProject.json().catch(() => ({}));
        existingProjectTasks = Array.isArray(backendProject?.tasks) ? backendProject.tasks : [];
        const updatedProjectTasks = existingProjectTasks.filter(
          (projectTask: any) => String(projectTask?.id || '').trim() !== String(existing.projectTaskId || '').trim(),
        );

        const resSaveProject = await fetch(`${API_BASE}/project-charters`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(projectCharterPayloadFromBackendProject(backendProject, updatedProjectTasks)),
        });
        if (!resSaveProject.ok) {
          const data = await resSaveProject.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to sync project task deletion');
        }
      }

      const res = await fetch(`${API_BASE}/spaces/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (backendProject && existing.projectId && existing.projectTaskId) {
          await fetch(`${API_BASE}/project-charters`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(projectCharterPayloadFromBackendProject(backendProject, existingProjectTasks)),
          }).catch(() => undefined);
        }
        throw new Error(data.message || 'Failed to delete task');
      }

      removeProjectTaskFromState(existing.projectId, existing.projectTaskId);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Failed to delete task');
      loadSpaces();
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

  const handleCreate = async () => {
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    setError(null);

    const now = new Date().toISOString();
    const projectTaskId = `t-${generateId()}`;
    const descriptionText = description.trim();
    const requestedStatus =
      mode === 'employee' && status === 'done' ? ('review' as TaskStatus) : status;
    const project = selectedProjectId
      ? projects.find((p) => p.id === selectedProjectId) || null
      : null;

    try {
      let uploadedDocument: {
        documentUrl: string;
        documentName: string;
        documentMimeType: string;
      } | null = null;

      if (taskDocumentFile) {
        setUploadingTaskDocument(true);
        const formData = new FormData();
        formData.append('file', taskDocumentFile);
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
        uploadedDocument = {
          documentUrl: String(uploaded.documentUrl || ''),
          documentName: String(uploaded.documentName || taskDocumentFile.name || ''),
          documentMimeType: String(uploaded.documentMimeType || taskDocumentFile.type || ''),
        };
      }

      if (project) {
        // Persist to backend project tasks so Team Lead/Admin can see it inside the project.
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
          title: t,
          description: descriptionText,
          status: requestedStatus,
          priority,
          createdBy: me.id || 'employee',
          createdByRole: me.role || 'EMPLOYEE',
          assigneeId: assigneeId || undefined,
          dueDate: dueDate || undefined,
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

      const res = await fetch(`${API_BASE}/spaces/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: t,
          description: descriptionText,
          documentUrl: uploadedDocument?.documentUrl || '',
          documentName: uploadedDocument?.documentName || '',
          documentMimeType: uploadedDocument?.documentMimeType || '',
          projectId: project?.id || '',
          projectTaskId: project ? projectTaskId : undefined,
          assigneeId,
          dueDate,
          priority,
          status: requestedStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create task');
      }

      setTasks((prev) => upsertTaskById(prev, normalizeTaskForUi(data as SpacesTask)));
      setTitle('');
      setDescription('');
      setAssigneeId(me.id || '');
      setDueDate('');
      setPriority('medium');
      setStatus('todo');
      setSelectedProjectId('');
      setTaskDocumentFile(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to create task');
    } finally {
      setUploadingTaskDocument(false);
      setSaving(false);
    }
  };

  const visibleTasks = useMemo(() => tasks, [tasks]);

  const taskBelongsToMe = useCallback(
    (task: SpacesTask) =>
      task.assigneeId === me.id || (!task.assigneeId && task.createdByEmpId === me.id),
    [me.id],
  );

  const filteredTasks = useMemo(() => {
    let list = visibleTasks;

    if (taskFilterMode === 'me' && me.id) {
      list = list.filter((t) => taskBelongsToMe(t));
    }

    if (taskFilterMode === 'assigned' && me.id) {
      list = list.filter(
        (t) => t.assigneeId === me.id && t.createdByEmpId !== me.id,
      );
    }

    const term = taskSearch.trim().toLowerCase();
    if (!term) return list;

    return list.filter((t) => {
      const assigneeName = t.assigneeId ? employeeNameById.get(t.assigneeId) || '' : '';
      const createdByName = t.createdByName || '';
      const createdById = t.createdByEmpId || '';
      const assigneeId = t.assigneeId || '';

      return (
        assigneeId.toLowerCase().includes(term) ||
        assigneeName.toLowerCase().includes(term) ||
        createdById.toLowerCase().includes(term) ||
        createdByName.toLowerCase().includes(term)
      );
    });
  }, [visibleTasks, taskFilterMode, taskSearch, me.id, employeeNameById, taskBelongsToMe]);

  const sortedTasks = useMemo(() => {
    if (filteredTasks.length === 0) return filteredTasks;
    const copy = [...filteredTasks];
    const managerRoles = new Set<BackendRole>(['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD']);
    copy.sort((a, b) => {
      if (mode === 'employee') {
        const aManager = managerRoles.has((a.createdByRole || '').toUpperCase());
        const bManager = managerRoles.has((b.createdByRole || '').toUpperCase());
        if (aManager !== bManager) return aManager ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return copy;
  }, [filteredTasks, mode]);
  const topPriorityTasks = useMemo(() => {
    const activePriorityStatuses = new Set<TaskStatus>(['todo', 'doing']);
    const pending = sortedTasks.filter(
      (task) => taskBelongsToMe(task) && activePriorityStatuses.has(task.status),
    );
    const priorityRank: Record<TaskPriority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    return [...pending]
      .sort((a, b) => {
        const priorityDiff = priorityRank[a.priority] - priorityRank[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        const aDue = parseDateValue(a.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bDue = parseDateValue(b.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 5);
  }, [sortedTasks, taskBelongsToMe]);

  const weeklyTaskGroups = useMemo<WeeklyTaskGroup[]>(
    () => buildWeeklyTaskGroups(state, tasks, parseDateValue),
    [state, tasks],
  );

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

  const weeklyQuarterOptions = useMemo(() => {
    const activeYearId =
      selectedWeeklyProjectId ||
      defaultWeeklyTaskGroup?.yearId ||
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
  }, [defaultWeeklyTaskGroup?.yearId, selectedWeeklyProjectId, state]);

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
        defaultWeeklyTaskGroup?.yearId &&
        weeklyProjectOptions.some((option) => option.value === defaultWeeklyTaskGroup.yearId)
      ) {
        return defaultWeeklyTaskGroup.yearId;
      }
      return weeklyProjectOptions[0]?.value || '';
    });
  }, [defaultWeeklyTaskGroup, weeklyProjectOptions]);

  useEffect(() => {
    if (!weeklyQuarterOptions.length) {
      setSelectedWeeklyQuarterId('');
      return;
    }

    setSelectedWeeklyQuarterId((prev) => {
      if (prev && weeklyQuarterOptions.some((option) => option.value === prev)) {
        return prev;
      }
      return (
        defaultWeeklyTaskGroup?.quarterId ||
        weeklyQuarterOptions[0]?.value ||
        ''
      );
    });
  }, [defaultWeeklyTaskGroup, weeklyQuarterOptions]);

  const weeklyMonthOptions = useMemo(() => {
    const quarterMonths = (state?.monthlyGoals || [])
      .filter((month) => month.parentId === selectedWeeklyQuarterId)
      .sort((a, b) => {
        const aOrder = Number(String(a.timeline || '').replace(/[^0-9]/g, '')) || 0;
        const bOrder = Number(String(b.timeline || '').replace(/[^0-9]/g, '')) || 0;
        return aOrder - bOrder;
      });
    const selectedVision = yearlyVisionMetaById.get(selectedWeeklyProjectId);
    const selectedVisionTitle = selectedVision?.title || 'Selected vision';
    const selectedVisionDetails = selectedVision?.details || selectedVisionTitle;
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
        defaultWeeklyTaskGroup?.quarterId === selectedWeeklyQuarterId &&
        weeklyMonthOptions.some((option) => option.value === defaultWeeklyTaskGroup.monthId)
      ) {
        return defaultWeeklyTaskGroup.monthId;
      }
      return weeklyMonthOptions[0]?.value || '';
    });
  }, [defaultWeeklyTaskGroup, selectedWeeklyQuarterId, weeklyMonthOptions]);

  const weeklyWeekOptions = useMemo(() => {
    const groupsForMonth = weeklyTaskGroups.filter((group) => group.monthId === selectedWeeklyMonthId);
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
  }, [selectedWeeklyMonthId, selectedWeeklyProjectId, weeklyTaskGroups, yearlyVisionMetaById]);

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
        defaultWeeklyTaskGroup?.monthId === selectedWeeklyMonthId &&
        weeklyWeekOptions.some((option) => option.value === defaultWeeklyTaskGroup.weekSelectionKey)
      ) {
        return defaultWeeklyTaskGroup.weekSelectionKey;
      }
      return weeklyWeekOptions[0]?.value || '';
    });
  }, [defaultWeeklyTaskGroup, selectedWeeklyMonthId, weeklyWeekOptions]);

  const selectedWeeklyTaskGroup = useMemo(
    () =>
      weeklyTaskGroups.find(
        (group) => group.monthId === selectedWeeklyMonthId && group.weekSelectionKey === selectedWeeklyWeekId,
      ) ||
      weeklyTaskGroups.find(
        (group) => group.monthId === selectedWeeklyMonthId && group.weekSelectionKey === weeklyWeekOptions[0]?.value,
      ) ||
      null,
    [selectedWeeklyMonthId, selectedWeeklyWeekId, weeklyTaskGroups, weeklyWeekOptions],
  );
  const selectedWeeklyDay = useMemo(() => {
    if (!selectedWeeklyTaskGroup?.days?.length) return null;
    const selectedDayId = selectedDayByWeek[selectedWeeklyTaskGroup.weekId] || selectedWeeklyTaskGroup.days[0]?.id || '';
    return selectedWeeklyTaskGroup.days.find((day) => day.id === selectedDayId) || selectedWeeklyTaskGroup.days[0] || null;
  }, [selectedDayByWeek, selectedWeeklyTaskGroup]);
  const activeQuarterOption = weeklyQuarterOptions.find((option) => option.value === selectedWeeklyQuarterId) || null;
  const activeMonthOption = weeklyMonthOptions.find((option) => option.value === selectedWeeklyMonthId) || null;
  const activeWeekOption = weeklyWeekOptions.find((option) => option.value === selectedWeeklyWeekId) || null;
  useEffect(() => {
    if (!selectedWeeklyDay) return;
    setAssignDraftByDay((prev) => ({
      ...prev,
      [selectedWeeklyDay.id]: {
        title: prev[selectedWeeklyDay.id]?.title ?? selectedWeeklyDay.text ?? '',
        assigneeId: prev[selectedWeeklyDay.id]?.assigneeId || me.id || '',
        dueDate: prev[selectedWeeklyDay.id]?.dueDate || '',
        priority: prev[selectedWeeklyDay.id]?.priority || 'medium',
        status: prev[selectedWeeklyDay.id]?.status || 'todo',
        description: prev[selectedWeeklyDay.id]?.description || '',
        projectId: prev[selectedWeeklyDay.id]?.projectId || '',
      },
    }));
  }, [me.id, selectedWeeklyDay]);

  const handleWeeklyProjectChange = useCallback(
    (visionId: string) => {
      setSelectedWeeklyProjectId(visionId);
      setSelectedWeeklyQuarterId('');
      setSelectedWeeklyMonthId('');
      setSelectedWeeklyGroupId('');
    },
    [],
  );

  const handleWeeklyQuarterChange = useCallback(
    (quarterId: string) => {
      setSelectedWeeklyQuarterId(quarterId);
      setSelectedWeeklyMonthId('');
      setSelectedWeeklyGroupId('');
    },
    [],
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

  const weeklyPeriodPicker = useMemo(
    () => ({
      summary:
        selectedWeeklyTaskGroup?.weekSummaryLabel ||
        `${activeQuarterOption?.label || 'Q?'} / ${activeMonthOption?.label || 'M?'} / ${activeWeekOption?.label || 'W?'}`,
      detail: selectedWeeklyTaskGroup
        ? `${selectedWeeklyTaskGroup.weekRangeLabel} - ${selectedWeeklyTaskGroup.week.text || 'Weekly goal'}`
        : activeMonthOption
          ? `Choose a week inside ${activeQuarterOption?.label || 'selected quarter'} ${activeMonthOption.label}`
          : 'Choose a quarter, month, and week',
      projectOptions: weeklyProjectOptions.map((option) => ({
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
        canManageWeeklyRows,
        saveGoalFn: saveGoal,
        setWeeklyError,
      });
    })();

  const createTaskFromDay = async (day: Goal, weeklyGroup: WeeklyTaskGroup) => {
    const preparedGroup = await ensureWeeklyGroupPersistedHelper({
      weeklyGroup,
      state,
      updateState,
      saveGoalFn: saveGoal,
      setWeeklyError,
    });
    if (!preparedGroup) return;
    const persistedDay = preparedGroup.days.find((item) => item.id === day.id) || day;
    const persistedWeeklyGroup: WeeklyTaskGroup = {
      ...weeklyGroup,
      week: preparedGroup.week,
      days: preparedGroup.days,
    };
    const draft = assignDraftByDay[day.id];
    const titleValue = (draft?.title || persistedDay.text || '').trim();
    const assignee = (draft?.assigneeId || me.id || '').trim();
    const dueDateValue = String(draft?.dueDate || '').trim();
    const priorityValue = String(draft?.priority || 'medium').trim() || 'medium';
    const statusValue = String(draft?.status || 'todo').trim() || 'todo';
    const descriptionValue = String(draft?.description || '').trim();
    const projectIdValue = String(draft?.projectId || '').trim();
    const taskDocumentFile = weeklyTaskDocumentByDay[day.id] || null;
    if (!titleValue || !assignee) {
      setWeeklyError('Task title and assignee are required.');
      return;
    }
    setAssigningDayTaskId(day.id);
    setWeeklyError('');
    try {
      let uploadedDocument: {
        documentUrl: string;
        documentName: string;
        documentMimeType: string;
      } | null = null;

      if (taskDocumentFile) {
        const formData = new FormData();
        formData.append('file', taskDocumentFile);
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
        uploadedDocument = {
          documentUrl: String(uploaded.documentUrl || ''),
          documentName: String(uploaded.documentName || taskDocumentFile.name || ''),
          documentMimeType: String(uploaded.documentMimeType || taskDocumentFile.type || ''),
        };
      }

      const res = await fetch(`${API_BASE}/spaces/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: titleValue,
          description: descriptionValue || `Created from Daily plan: ${persistedWeeklyGroup.week.text || 'Weekly Goal'}`,
          documentUrl: uploadedDocument?.documentUrl || '',
          documentName: uploadedDocument?.documentName || '',
          documentMimeType: uploadedDocument?.documentMimeType || '',
          projectId: projectIdValue || '',
          assigneeId: assignee,
          dueDate: dueDateValue,
          priority: priorityValue,
          status: statusValue,
          customFields: buildWeeklyTaskCustomFields(persistedDay, persistedWeeklyGroup),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create task from daily goal');
      }
      setAssignDraftByDay((prev) => ({
        ...prev,
        [day.id]: {
          title: day.text || '',
          assigneeId: me.id || '',
          dueDate: '',
          priority: 'medium',
          status: 'todo',
          description: '',
          projectId: '',
        },
      }));
      setWeeklyTaskDocumentByDay((prev) => ({
        ...prev,
        [day.id]: null,
      }));
      setTasks((prev) => upsertTaskById(prev, normalizeTaskForUi(data as SpacesTask)));
    } catch (e: any) {
      setWeeklyError(e?.message || 'Failed to create task');
    } finally {
      setAssigningDayTaskId('');
    }
  };
  const TASKS_PER_PAGE = 15;
  const totalTaskPages = Math.max(1, Math.ceil(sortedTasks.length / TASKS_PER_PAGE));
  const paginatedTasks = useMemo(() => {
    const start = (taskPage - 1) * TASKS_PER_PAGE;
    return sortedTasks.slice(start, start + TASKS_PER_PAGE);
  }, [sortedTasks, taskPage]);
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
  }, [taskFilterMode, taskSearch, mode]);

  useEffect(() => {
    setTaskPage((prev) => Math.min(prev, totalTaskPages));
  }, [totalTaskPages]);

  useEffect(() => {
    setSelectedDayByWeek((prev) => {
      if (!weeklyTaskGroups.length) return prev;
      let changed = false;
      const next = { ...prev };
      weeklyTaskGroups.forEach(({ week, days }) => {
        if (!days.length) return;
        const selected = next[week.id];
        if (!selected || !days.some((d) => d.id === selected)) {
          next[week.id] = days[0].id;
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

  const mainSectionsProps = { setCreatePanelTab, createPanelTab, assignmentHint, setAssigneeId, me, title, setTitle, assigneeId, createAssigneeOptions, employeesLoading, employeeNameById, dueDate, setDueDate, priority, setPriority, priorityOptions, status, setStatus, statusOptions, description, setDescription, selectedProjectId, setSelectedProjectId, projectSelectOptions, projectsLoading, setTaskDocumentFile, taskDocumentFile, handleCreate, saving, uploadingTaskDocument, topPriorityTasks, patchTask, deleteTask, weeklyError, state, updateState, selectedWeeklyTaskGroup, weeklyPeriodPicker, getWeekBreadcrumb: getWeekBreadcrumbForView, selectedDayByWeek, getSundayStart, getWeekStartDate: getWeekStartDateForView, getDayDisplay, setSelectedDayByWeek, tasks, toggleDaily, canManageWeeklyRows, assignDraftByDay, setAssignDraftByDay, setWeeklyTaskDocumentByDay, weeklyTaskDocumentByDay, createTaskFromDay, assigningDayTaskId, createDaysForWeek, setTaskFilterMode, taskFilterMode, taskSearch, setTaskSearch, columns, isRenamingColumnId, renameDraft, setRenameDraft, setIsRenamingColumnId, setActiveColumnMenuId, sortedTasks, setColumns, setError, activeColumnMenuId, setColumnToDelete, handleAddColumn, spacesLoading, paginatedTasks, canEditTask, isTaskLocked, getTaskRowClasses, projectNameById, mode, assigneeOptionsForTask, canEditDueDate, canChangeStatus, forceDownloadDocument, canCommentOnTask, setCommentTaskId, setModalStatus, canValidateTask, canDeleteTask, handleApproveTask, handleRejectTask, navigate, setEditingTask, setEditingTaskMode, setEditingTaskDraft, setDeleteTaskModal, taskPage, TASKS_PER_PAGE, setTaskPage, visibleTaskPages, totalTaskPages, API_BASE, getAuthHeaders, activeCommentTask, setCommentDraft, commentDraft, editingCommentId, setEditingCommentId, editCommentDraft, setEditCommentDraft, setTasks, modalStatus, handleAddComment, submittingComment, columnToDelete, commentToDeleteId, setCommentToDeleteId, deleteTaskModal, rejectTaskModal, rejectFeedbackDraft, setRejectFeedbackDraft, rejectingTask, confirmRejectTask, editingTask, editingTaskMode, editingTaskDraft, assignableEmployees };

  return (
    <div ref={taskHubRootRef} className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-8 bg-brand-red rounded-full" />
            <span className="text-[15px] text-slate-500">Task Hub</span>
          </div>
          <h2 className="text-4xl text-slate-900 leading-none">Task Hub</h2>
          <p className="text-slate-500 text-lg mt-3">
            Tasks table with project/no-project support.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSpaces}
          disabled={spacesLoading}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 ${
            spacesLoading ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          title="Refresh"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

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
