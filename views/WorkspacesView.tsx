import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import { PlanningState, ProjectTeamMember, WorkspaceProject } from '../types';
import ProjectCharterFormModal from '../components/project-charter/ProjectCharterFormModal';
import ProjectDetails, { ProjectTaskDraft } from '../components/project-charter/ProjectDetails';
import ProjectList from '../components/project-charter/ProjectList';
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
import { getSocket } from '../realtime/socket';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}

function getSessionViewerIdentifiers(currentUserId?: string): string[] {
  const session = getStoredAuthSession();
  const employee = session?.employee || {};
  return [String(employee.empId || '').trim(), String(employee._id || '').trim(), String(currentUserId || '').trim()].filter(Boolean);
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
      if (!projectId) return;

      refreshProject(projectId);
    };

    socket.on('spaces:changed', onSpacesChanged);
    return () => {
      socket.off('spaces:changed', onSpacesChanged);
    };
  }, [fetchProjectById]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    void fetchProjectList();
  }, [fetchProjectList]);

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
