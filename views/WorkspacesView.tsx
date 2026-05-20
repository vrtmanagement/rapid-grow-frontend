import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, ListChecks } from 'lucide-react';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import { PlanningState, ProjectTeamMember, WorkspaceProject, WorkspaceTask } from '../types';
import ProjectCharterFormModal from '../components/project-charter/ProjectCharterFormModal';
import ProjectDetails, { ProjectTaskDraft } from '../components/project-charter/ProjectDetails';
import ProjectList from '../components/project-charter/ProjectList';
import { TaskAnalyticsPanel } from './TaskAnalyticsView';
import {
  appendActivity,
  buildEmployeeDirectory,
  buildProjectPayload,
  computeProjectTaskMetrics,
  createActivityEntry,
  createInitialProjectFormState,
  EmployeeDirectoryRecord,
  getProjectPriorityLabel,
  getProjectStatusLabel,
  normalizeProjectPriority,
  normalizeProjectRecord,
  normalizeProjectStatus,
} from '../components/project-charter/projectCharterUtils';
import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../config/api';
import { getSocket } from '../realtime/socket';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}

interface LinkedSpaceTaskRecord {
  taskId?: string;
  projectTaskId?: string;
  projectId?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

function getSessionViewerIdentifiers(currentUserId?: string): string[] {
  const session = getStoredAuthSession();
  const employee = session?.employee || {};
  return [String(employee.empId || '').trim(), String(employee._id || '').trim(), String(currentUserId || '').trim()].filter(Boolean);
}

function normalizeWorkspaceTaskStatus(status?: string): WorkspaceTask['status'] {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (['done', 'completed', 'complete', 'closed'].includes(normalized)) return 'done';
  if (['review', 'submitted', 'submit', 'for_review'].includes(normalized)) return 'review';
  if (['doing', 'in_progress', 'progress', 'ongoing'].includes(normalized)) return 'doing';
  if (['blocked', 'on_hold', 'hold'].includes(normalized)) return 'blocked';
  return 'todo';
}

function normalizeGeneralTask(task: LinkedSpaceTaskRecord): WorkspaceTask & { assigneeName?: string } {
  const taskId = String(task.projectTaskId || task.taskId || '').trim();
  return {
    id: taskId,
    projectId: '',
    title: String(task.title || '').trim() || 'Untitled Task',
    description: String(task.description || '').trim(),
    status: normalizeWorkspaceTaskStatus(task.status),
    priority: task.priority === 'high' || task.priority === 'low' ? task.priority : 'medium',
    assigneeId: String(task.assigneeId || '').trim() || undefined,
    assigneeName: String(task.assigneeName || '').trim() || undefined,
    dueDate: String(task.dueDate || '').trim() || undefined,
    createdAt: String(task.createdAt || '') || new Date().toISOString(),
    updatedAt: String(task.updatedAt || task.createdAt || '') || new Date().toISOString(),
  };
}

function upsertProjectInState(prev: PlanningState, project: WorkspaceProject): PlanningState {
  const nextWorkspaces = [...prev.workspaces];

  if (!nextWorkspaces.length) {
    nextWorkspaces.push({
      id: 'workspace-1',
      name: 'Project Charter Workspace',
      projects: [project],
    });
    return { ...prev, workspaces: nextWorkspaces };
  }

  nextWorkspaces[0] = {
    ...nextWorkspaces[0],
    projects: [
      project,
      ...nextWorkspaces[0].projects.filter((existingProject) => existingProject.id !== project.id),
    ],
  };

  return { ...prev, workspaces: nextWorkspaces };
}

function replaceProjectsInState(prev: PlanningState, projects: WorkspaceProject[]): PlanningState {
  const nextWorkspaces = [...prev.workspaces];
  if (!nextWorkspaces.length) {
    return {
      ...prev,
      workspaces: [{ id: 'workspace-1', name: 'Project Charter Workspace', projects }],
    };
  }

  nextWorkspaces[0] = { ...nextWorkspaces[0], projects };
  return { ...prev, workspaces: nextWorkspaces };
}

function ProjectDetailRoute(props: {
  projects: WorkspaceProject[];
  projectLoading: boolean;
  canManageProject: boolean;
  canDeleteProject: boolean;
  canCreateTask: boolean;
  onEditProject: (project: WorkspaceProject) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onFetchProject: (projectId: string) => Promise<void>;
  onCreateTask: (projectId: string, draft: ProjectTaskDraft) => Promise<void>;
}) {
  const { projectId } = useParams<{ projectId: string }>();
  const [detailLoading, setDetailLoading] = useState(false);

  const activeProject = useMemo(
    () => props.projects.find((project) => project.id === projectId),
    [props.projects, projectId],
  );

  useEffect(() => {
    if (!projectId || activeProject || props.projectLoading) return;

    let mounted = true;
    setDetailLoading(true);
    props
      .onFetchProject(projectId)
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setDetailLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeProject, projectId, props.onFetchProject, props.projectLoading]);

  return (
    <div className="space-y-8">
      <ProjectDetails
        project={activeProject}
        loading={props.projectLoading || detailLoading}
        canManageProject={props.canManageProject}
        canDeleteProject={props.canDeleteProject}
        canCreateTask={props.canCreateTask}
        onEditProject={() => activeProject && props.onEditProject(activeProject)}
        onDeleteProject={() => (activeProject ? props.onDeleteProject(activeProject.id) : Promise.resolve())}
        onCreateTask={(draft) => (activeProject ? props.onCreateTask(activeProject.id, draft) : Promise.resolve())}
      />
      {activeProject ? (
        <TaskAnalyticsPanel projectId={activeProject.id} label={activeProject.name} embedded />
      ) : null}
    </div>
  );
}

function GeneralTasksDetailRoute() {
  const [tasks, setTasks] = useState<Array<WorkspaceTask & { assigneeName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadGeneralTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() });
        if (!response.ok) {
          throw new Error('Failed to load general tasks');
        }

        const data = await response.json().catch(() => ({}));
        const nextTasks = (Array.isArray(data?.tasks) ? data.tasks : [])
          .filter((task: LinkedSpaceTaskRecord) => !String(task?.projectId || '').trim())
          .map((task: LinkedSpaceTaskRecord) => normalizeGeneralTask(task))
          .filter((task: WorkspaceTask) => task.id)
          .sort((left: WorkspaceTask, right: WorkspaceTask) => {
            const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
            const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
            return rightTime - leftTime;
          });

        if (!cancelled) {
          setTasks(nextTasks);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load general tasks');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadGeneralTasks();

    const socket = getSocket();
    const onSpacesChanged = (payload: any) => {
      const action = String(payload?.action || '').trim();
      const projectId = String(payload?.task?.projectId || payload?.projectId || '').trim();
      if (['task_created', 'task_updated', 'task_deleted'].includes(action) && !projectId) {
        void loadGeneralTasks();
      }
    };

    socket.on('spaces:changed', onSpacesChanged);
    return () => {
      cancelled = true;
      socket.off('spaces:changed', onSpacesChanged);
    };
  }, []);

  const metrics = useMemo(() => computeProjectTaskMetrics(tasks), [tasks]);
  const openTasks = Math.max(metrics.total - metrics.completed, 0);
  const overdueTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.dueDate || task.status === 'done') return false;
        return new Date(task.dueDate).getTime() < Date.now();
      }).length,
    [tasks],
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/workspaces"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
          Back to project list
        </Link>
      </div>

      <section className="overflow-hidden rounded-[2.15rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-brand-red">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">General Tasks</h2>
              <p className="mt-1 text-sm text-slate-500">TaskHub work that is not linked to any project charter.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-5 py-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="rounded-[1.5rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-800 p-4 text-white shadow-sm">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">General task pool</span>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] xl:text-[2rem]">General Tasks</h1>
            <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-200">
              Use this view for standalone work items before they are connected to a project charter.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Latest activity</p>
            <p className="mt-2.5 text-base font-semibold leading-7 text-slate-950">
              {tasks[0] ? new Date(tasks[0].updatedAt || tasks[0].createdAt).toLocaleString() : 'No task activity yet'}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {loading ? 'Loading general tasks...' : `${metrics.completed} of ${metrics.total} tasks completed`}
            </p>
          </div>
        </div>

        <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
          <GeneralMetric icon={<ListChecks size={18} />} label="Total tasks" value={loading ? '...' : metrics.total} />
          <GeneralMetric icon={<CheckCircle2 size={18} />} label="Completed" value={loading ? '...' : metrics.completed} />
          <GeneralMetric icon={<Clock3 size={18} />} label="Open tasks" value={loading ? '...' : openTasks} />
          <GeneralMetric icon={<Clock3 size={18} />} label="Open overdue" value={loading ? '...' : overdueTasks} />
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Progress</p>
              <p className="text-lg font-semibold text-slate-950">{loading ? '...' : `${metrics.progress}%`}</p>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-brand-red transition-all" style={{ width: `${loading ? 0 : metrics.progress}%` }} />
            </div>
          </div>
        </div>

        {error ? (
          <div className="border-t border-slate-100 px-5 py-5">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        ) : null}
      </section>

      <TaskAnalyticsPanel scope="general" label="General tasks" embedded />
    </div>
  );
}

function GeneralMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <span className="text-brand-red">{icon}</span>
      </div>
      <p className="mt-2 text-[2rem] font-semibold leading-none text-slate-950">{value}</p>
    </div>
  );
}

const WorkspacesView: React.FC<Props> = ({ state, updateState, loading = false }) => {
  const [projectLoading, setProjectLoading] = useState(loading);
  const [employees, setEmployees] = useState<ProjectTeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedProject, setSelectedProject] = useState<WorkspaceProject | undefined>(undefined);
  const [liveTasksByProject, setLiveTasksByProject] = useState<Record<string, WorkspaceProject['tasks']>>({});
  const [generalTasks, setGeneralTasks] = useState<WorkspaceProject['tasks']>([]);
  const [taskHubLoading, setTaskHubLoading] = useState(true);
  const [taskHubFailed, setTaskHubFailed] = useState(false);

  const canManageProject = state.currentUser.role === 'Admin' || state.currentUser.role === 'Leader';
  const canDeleteProject = state.currentUser.role === 'Admin';
  const canCreateTask = true;
  const viewerIdentifiers = useMemo(() => getSessionViewerIdentifiers(state.currentUser.id), [state.currentUser.id]);

  const directoryMap = useMemo(() => {
    const map = new Map<string, ProjectTeamMember>();
    employees.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [employees]);

  const projects = useMemo(
    () =>
      state.workspaces
        .flatMap((workspace) => workspace.projects)
        .map((project) => normalizeProjectRecord(project, directoryMap)),
    [directoryMap, state.workspaces],
  );

  const initialFormState = useMemo(
    () => createInitialProjectFormState(selectedProject),
    [selectedProject],
  );

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const statusMatches = statusFilter === 'all' || getProjectStatusLabel(project.status) === statusFilter;
      const priorityMatches = priorityFilter === 'all' || getProjectPriorityLabel(project.priority) === priorityFilter;

      if (!statusMatches || !priorityMatches) return false;
      if (!query) return true;

      const haystack = [
        project.name,
        project.description,
        project.team?.projectManager?.name,
        ...(project.team?.teamLeads.map((group) => group.lead.name) || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [priorityFilter, projects, searchTerm, statusFilter]);

  const persistProject = useCallback(async (project: WorkspaceProject) => {
    const payload = {
      id: project.id,
      name: project.name,
      description: project.description || '',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      status: normalizeProjectStatus(project.status),
      priority: normalizeProjectPriority(project.priority),
      dateCreated: project.dateCreated,
      businessCase: project.businessCase || project.description || '',
      problemStatement: project.problemStatement || project.description || '',
      goalStatement: project.goalStatement || '',
      inScope: project.inScope || '',
      outOfScope: project.outOfScope || '',
      benefits: project.benefits || '',
      champion: project.champion || project.team?.projectManager?.name || '',
      championRole: project.championRole || 'Project Manager',
      lead: project.lead || project.team?.projectManager?.name || '',
      leadRole: project.leadRole || project.team?.projectManager?.role || 'Project Manager',
      smeList: project.smeList || [],
      projectTeam: project.projectTeam || [],
      team: project.team,
      activity: project.activity || [],
      phases: project.phases || {},
      tasks: project.tasks || [],
    };

    const response = await fetch(`${API_BASE}/project-charters`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.message || 'Failed to save project charter.');
    }

    const saved = normalizeProjectRecord(await response.json(), directoryMap);
    updateState((prev) => upsertProjectInState(prev, saved));
  }, [directoryMap, updateState]);

  const fetchProjectList = useCallback(async () => {
    setProjectLoading(true);

    try {
      const session = getStoredAuthSession();
      const employee = session?.employee || {};
      const employeeEmpId = String(employee.empId || '').trim();
      const endpoint =
        state.currentUser.role === 'Employee' && employeeEmpId
          ? `${API_BASE}/project-charters/assigned/${encodeURIComponent(employeeEmpId)}`
          : `${API_BASE}/project-charters`;

      const response = await fetch(endpoint, { headers: getAuthHeaders() });
      if (!response.ok) {
        throw new Error('Failed to load project charters.');
      }

      const data = await response.json().catch(() => []);
      const normalized = (Array.isArray(data) ? data : []).map((project) => normalizeProjectRecord(project, directoryMap));
      updateState((prev) => replaceProjectsInState(prev, normalized));
    } catch (error) {
      console.error('Failed to load project charters', error);
    } finally {
      setProjectLoading(false);
    }
  }, [state.currentUser.role, updateState]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
      if (!response.ok) return;
      const data = await response.json().catch(() => []);
      const directory = buildEmployeeDirectory(Array.isArray(data) ? (data as EmployeeDirectoryRecord[]) : []);
      setEmployees(
        Array.from(
          new Map(Array.from(directory.values()).map((member) => [member.id, member])).values(),
        ),
      );
    } catch (error) {
      console.error('Failed to load employees for project charters', error);
    }
  }, []);

  const fetchLinkedWorkspaceTasks = useCallback(async () => {
    try {
      setTaskHubLoading(true);
      const response = await fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() });
      if (!response.ok) {
        throw new Error('Failed to load linked project tasks');
      }

      const data = await response.json().catch(() => ({}));
      const nextGeneralTasks: WorkspaceProject['tasks'] = [];
      const nextTasksByProject = (Array.isArray(data?.tasks) ? data.tasks : []).reduce(
        (acc: Record<string, WorkspaceProject['tasks']>, task: LinkedSpaceTaskRecord) => {
          const normalizedTask = normalizeGeneralTask(task);
          if (!normalizedTask.id) return acc;

          const projectId = String(task?.projectId || '').trim();
          normalizedTask.projectId = projectId;

          if (!projectId) {
            nextGeneralTasks.push(normalizedTask);
            return acc;
          }

          if (!acc[projectId]) {
            acc[projectId] = [];
          }
          acc[projectId].push(normalizedTask);
          return acc;
        },
        {},
      );

      const sortByLatest = (left: WorkspaceTask, right: WorkspaceTask) => {
        const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
        const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
        return rightTime - leftTime;
      };

      Object.values(nextTasksByProject).forEach((tasks) => tasks.sort(sortByLatest));
      nextGeneralTasks.sort(sortByLatest);

      setLiveTasksByProject(nextTasksByProject);
      setGeneralTasks(nextGeneralTasks);
      setTaskHubFailed(false);
    } catch (error) {
      console.error('Failed to load linked workspace tasks', error);
      setTaskHubFailed(true);
    } finally {
      setTaskHubLoading(false);
    }
  }, []);

  const fetchProjectById = useCallback(
    async (projectId: string) => {
      const response = await fetch(`${API_BASE}/project-charters/${projectId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load project charter.');
      }

      const saved = normalizeProjectRecord(await response.json(), directoryMap);
      updateState((prev) => upsertProjectInState(prev, saved));
    },
    [directoryMap, updateState],
  );

  useEffect(() => {
    const socket = getSocket();
    const refreshingProjectIds = new Set<string>();

    const refreshProject = (projectId: string) => {
      const normalizedProjectId = String(projectId || '').trim();
      if (!normalizedProjectId || refreshingProjectIds.has(normalizedProjectId)) return;

      refreshingProjectIds.add(normalizedProjectId);
      void fetchProjectById(normalizedProjectId)
        .catch((error) => console.error('Failed to refresh project after task update', error))
        .finally(() => {
          refreshingProjectIds.delete(normalizedProjectId);
        });
    };

    const onSpacesChanged = (payload: any) => {
      const action = String(payload?.action || '').trim();
      if (!['task_created', 'task_updated', 'task_deleted'].includes(action)) return;

      const projectId = String(payload?.task?.projectId || payload?.projectId || '').trim();
      if (projectId) {
        refreshProject(projectId);
      }
      void fetchLinkedWorkspaceTasks();
    };

    socket.on('spaces:changed', onSpacesChanged);
    return () => {
      socket.off('spaces:changed', onSpacesChanged);
    };
  }, [fetchLinkedWorkspaceTasks, fetchProjectById]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    void fetchProjectList();
  }, [fetchProjectList]);

  useEffect(() => {
    void fetchLinkedWorkspaceTasks();
  }, [fetchLinkedWorkspaceTasks]);

  const openCreateModal = () => {
    setFormMode('create');
    setSelectedProject(undefined);
    setIsFormOpen(true);
  };

  const openEditModal = (project: WorkspaceProject) => {
    setFormMode('edit');
    setSelectedProject(project);
    setIsFormOpen(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    const response = await fetch(`${API_BASE}/project-charters/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.message || 'Failed to delete project charter.');
    }

    updateState((prev) =>
      replaceProjectsInState(
        prev,
        prev.workspaces.flatMap((workspace) => workspace.projects).filter((project) => project.id !== projectId),
      ),
    );
  };

  const handleSubmitForm = async (form: ReturnType<typeof createInitialProjectFormState>) => {
    const nextId =
      selectedProject?.id ||
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `project-${Date.now()}`);

    const projectRecord = buildProjectPayload(
      { ...form, id: nextId },
      directoryMap,
      selectedProject,
      state.currentUser.name,
    );

    await persistProject(projectRecord as WorkspaceProject);
    setIsFormOpen(false);
    setSelectedProject(undefined);
  };

  const handleCreateProjectTask = useCallback(
    async (projectId: string, draft: ProjectTaskDraft) => {
      const activeProject = projects.find((project) => project.id === projectId);
      if (!activeProject) {
        throw new Error('Project not found');
      }

      const session = getStoredAuthSession();
      const employee = session?.employee || {};
      const creatorId = String(employee.empId || employee._id || state.currentUser.id || '').trim();
      const creatorName = String(employee.empName || state.currentUser.name || 'User').trim();
      const creatorRole = String(employee.role || state.currentUser.role || 'EMPLOYEE').trim();
      const now = new Date().toISOString();
      const taskId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? `t-${crypto.randomUUID()}`
          : `task-${Date.now()}`;

      const newProjectTask = {
        id: taskId,
        projectId,
        title: draft.title.trim(),
        description: draft.description.trim(),
        status: 'todo' as const,
        priority: draft.priority,
        assigneeId: draft.assigneeId || undefined,
        dueDate: draft.dueDate || undefined,
        createdBy: creatorId,
        createdByRole: creatorRole,
        createdAt: now,
        updatedAt: now,
      };

      const updatedProject: WorkspaceProject = {
        ...activeProject,
        tasks: [...(activeProject.tasks || []), newProjectTask],
        activity: appendActivity(
          activeProject.activity,
          createActivityEntry(
            'Task created',
            `${draft.title.trim()} was added to ${activeProject.name}.`,
            creatorName,
            'task_created',
          ),
        ),
      };

      await persistProject(updatedProject);

      try {
        const response = await fetch(`${API_BASE}/spaces/tasks`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title: draft.title.trim(),
            description: draft.description.trim(),
            projectId,
            projectTaskId: taskId,
            assigneeId: draft.assigneeId || '',
            dueDate: draft.dueDate || '',
            priority: draft.priority,
            status: 'todo',
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error?.message || 'Failed to create task');
        }
      } catch (error) {
        await persistProject(activeProject);
        throw error;
      }

      await fetchProjectById(projectId);
    },
    [fetchProjectById, persistProject, projects, state.currentUser.id, state.currentUser.name, state.currentUser.role],
  );

  return (
    <>
      <ProjectCharterFormModal
        key={`charter-form-${formMode}-${selectedProject?.id || 'new'}`}
        isOpen={isFormOpen}
        mode={formMode}
        initialState={initialFormState}
        employees={employees}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmitForm}
      />

      <Routes>
        <Route
          path="/"
          element={
            <ProjectList
              projects={filteredProjects}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
              loading={projectLoading}
              liveTasksByProject={liveTasksByProject}
              generalTasks={generalTasks}
              taskHubLoading={taskHubLoading}
              taskHubFailed={taskHubFailed}
              canCreate={canManageProject}
              canDelete={canDeleteProject}
              onCreate={openCreateModal}
              onDelete={(projectId) => void handleDeleteProject(projectId).catch((error) => console.error(error))}
              onSearchChange={setSearchTerm}
              onStatusFilterChange={setStatusFilter}
              onPriorityFilterChange={setPriorityFilter}
            />
          }
        />
        <Route path="/general-tasks" element={<GeneralTasksDetailRoute />} />
        <Route
          path="/:projectId"
          element={
            <ProjectDetailRoute
              projects={projects}
              projectLoading={projectLoading}
              canManageProject={canManageProject}
              canDeleteProject={canDeleteProject}
              canCreateTask={canCreateTask}
              onEditProject={openEditModal}
              onDeleteProject={handleDeleteProject}
              onFetchProject={fetchProjectById}
              onCreateTask={handleCreateProjectTask}
            />
          }
        />
      </Routes>
    </>
  );
};

export default WorkspacesView;
