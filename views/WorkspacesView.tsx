import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Filter, Plus, Search } from 'lucide-react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PlanningState, ProjectTeamMember, WorkspaceProject, WorkspaceTask } from '../types';
import ProjectCharterFormModal from '../components/project-charter/ProjectCharterFormModal';
import { ProjectTaskDraft } from '../components/project-charter/ProjectDetails';
import ProjectList from '../components/project-charter/ProjectList';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PageSectionSubnav from '../components/layout/PageSectionSubnav';
import {
  appendActivity,
  buildEmployeeDirectory,
  buildProjectPayload,
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
import { fetchWorkspaceLinkTasks } from '../services/spacesApi';
import { fetchTabEndpoint, hasTabEndpointCache } from '../services/tabSessionCache';
import { useTabKey } from '../hooks/useTabKey';
import { getSocket } from '../realtime/socket';
import {
  getSessionViewerIdentifiers,
  LinkedSpaceTaskRecord,
  normalizeGeneralTask,
  replaceProjectsInState,
  upsertProjectInState,
} from '../components/workspaces/workspaceTaskUtils';
import { ProjectDetailRoute } from '../components/workspaces/ProjectDetailRoute';
import { GeneralTasksDetailRoute } from '../components/workspaces/GeneralTasksDetailRoute';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}

const WorkspacesView: React.FC<Props> = ({ state, updateState, loading = false }) => {
  const tabKey = useTabKey('workspaces');
  const location = useLocation();
  const navigate = useNavigate();
  const [projectLoading, setProjectLoading] = useState(loading);
  const [employees, setEmployees] = useState<ProjectTeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedProject, setSelectedProject] = useState<WorkspaceProject | undefined>(undefined);
  const [deleteTargetProject, setDeleteTargetProject] = useState<WorkspaceProject | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [liveTasksByProject, setLiveTasksByProject] = useState<Record<string, WorkspaceProject['tasks']>>({});
  const [generalTasks, setGeneralTasks] = useState<WorkspaceProject['tasks']>([]);
  const [taskHubLoading, setTaskHubLoading] = useState(true);
  const [taskHubFailed, setTaskHubFailed] = useState(false);

  const canManageProject = state.currentUser.role === 'Admin' || state.currentUser.role === 'Leader';
  const canDeleteProject = state.currentUser.role === 'Admin';
  const canCreateTask = true;
  const isProjectListRoute = location.pathname.startsWith('/workspaces');
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

  const fetchProjectList = useCallback(async (options?: { force?: boolean }) => {
    const session = getStoredAuthSession();
    const employee = session?.employee || {};
    const employeeEmpId = String(employee.empId || '').trim();
    const endpointPath =
      state.currentUser.role === 'Employee' && employeeEmpId
        ? `/project-charters/assigned/${encodeURIComponent(employeeEmpId)}?summary=1`
        : '/project-charters?summary=1';

    const hasCache = !options?.force && hasTabEndpointCache(tabKey, endpointPath);
    if (!hasCache) setProjectLoading(true);

    try {
      const data = await fetchTabEndpoint<unknown[]>(tabKey, endpointPath, { force: options?.force });
      const normalized = (Array.isArray(data) ? data : []).map((project) =>
        normalizeProjectRecord(project, directoryMap),
      );
      updateState((prev) => replaceProjectsInState(prev, normalized));
    } catch (error) {
      console.error('Failed to load project charters', error);
    } finally {
      if (!hasCache) setProjectLoading(false);
    }
  }, [state.currentUser.role, tabKey, updateState, directoryMap]);

  const fetchEmployees = useCallback(async (options?: { force?: boolean }) => {
    try {
      const data = await fetchTabEndpoint<unknown[]>(tabKey, '/employees', { force: options?.force });
      const directory = buildEmployeeDirectory(Array.isArray(data) ? (data as EmployeeDirectoryRecord[]) : []);
      setEmployees(
        Array.from(
          new Map(Array.from(directory.values()).map((member) => [member.id, member])).values(),
        ),
      );
    } catch (error) {
      console.error('Failed to load employees for project charters', error);
    }
  }, [tabKey]);

  const fetchLinkedWorkspaceTasks = useCallback(async (options?: { force?: boolean }) => {
    const tasksPath = '/spaces?scope=workspace-link&sync=0';
    const hasCache = !options?.force && hasTabEndpointCache(tabKey, tasksPath);
    try {
      if (!hasCache) setTaskHubLoading(true);
      const data = await fetchWorkspaceLinkTasks({ tabKey, force: options?.force });
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
      if (!hasCache) setTaskHubLoading(false);
    }
  }, [tabKey]);

  const fetchProjectById = useCallback(
    async (projectId: string) => {
      const path = `/project-charters/${projectId}`;
      const saved = normalizeProjectRecord(
        await fetchTabEndpoint<Record<string, unknown>>(tabKey, path),
        directoryMap,
      );
      updateState((prev) => upsertProjectInState(prev, saved));
    },
    [directoryMap, tabKey, updateState],
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
      void fetchLinkedWorkspaceTasks({ force: true });
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

  const requestDeleteProject = (projectId: string) => {
    const targetProject = projects.find((project) => project.id === projectId);
    if (!targetProject) return;
    setDeleteTargetProject(targetProject);
  };

  const confirmDeleteProject = async () => {
    if (!deleteTargetProject) return;

    setDeletingProject(true);
    try {
      await handleDeleteProject(deleteTargetProject.id);
      if (selectedProject?.id === deleteTargetProject.id) {
        setSelectedProject(undefined);
      }
      if (location.pathname.endsWith(`/${deleteTargetProject.id}`)) {
        navigate('/workspaces');
      }
      setDeleteTargetProject(null);
    } finally {
      setDeletingProject(false);
    }
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
      <PageSectionSubnav
        innerClassName="gap-1.5 py-1 lg:min-h-[46px] lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-3"
        leadingClassName="whitespace-nowrap"
        centerClassName="w-full lg:px-3"
        trailingClassName="lg:min-h-0"
        leading={
          isProjectListRoute ? (
            <>
              <div className="h-1.5 w-8 rounded-full bg-brand-red" />
              <span className="whitespace-nowrap text-[13px] font-medium uppercase tracking-[0.16em] text-brand-red">
                Project Charter Module
              </span>
            </>
          ) : undefined
        }
        center={
          isProjectListRoute ? (
            <div className="relative w-full">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by project name, manager, or description"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-[13px] text-slate-900 outline-none transition-all focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
              />
            </div>
          ) : undefined
        }
        trailing={
          isProjectListRoute ? (
            <div className="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-500 shadow-sm">
                <Filter size={14} />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="bg-transparent font-medium text-slate-700 outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
                <ChevronDown size={14} className="text-slate-400" />
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-500 shadow-sm">
                <Filter size={14} />
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  className="bg-transparent font-medium text-slate-700 outline-none"
                >
                  <option value="all">All priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <ChevronDown size={14} className="text-slate-400" />
              </div>

              {canManageProject ? (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
                >
                  <Plus size={15} />
                  Create Project
                </button>
              ) : null}
            </div>
          ) : undefined
        }
      />
      <ProjectCharterFormModal
        key={`charter-form-${formMode}-${selectedProject?.id || 'new'}`}
        isOpen={isFormOpen}
        mode={formMode}
        initialState={initialFormState}
        employees={employees}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmitForm}
      />
      {deleteTargetProject ? (
        <ConfirmDialog
          title="Delete Project Charter"
          description={`Delete ${deleteTargetProject.name} permanently? This action cannot be undone.`}
          confirmLabel={deletingProject ? 'Deleting...' : 'Delete Project'}
          disabled={deletingProject}
          onCancel={() => {
            if (deletingProject) return;
            setDeleteTargetProject(null);
          }}
          onConfirm={() => void confirmDeleteProject()}
        />
      ) : null}

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
              onDelete={requestDeleteProject}
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
              onDeleteProject={async (projectId) => {
                requestDeleteProject(projectId);
              }}
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
