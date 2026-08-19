import React, { useMemo, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProjectTeamMember } from '../../types';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { fetchWorkspaceLinkTasks } from '../../services/spacesApi';
import { getSocket } from '../../realtime/socket';
import {
  flattenProjectMembers,
  computeProjectTaskMetrics,
  countProjectMembers,
  PROJECT_REVIEW_PHASES,
} from './projectCharterUtils';
import {
  canChangeStatusForView,
  canDeleteTaskForView,
  canEditTaskForView,
  getLoggedInEmployee,
  projectCharterPayloadFromBackendProject,
  SpacesMode,
  SpacesTask,
} from '../../views/spacesViewHelpers';
import {
  LinkedSpaceTaskRecord,
  ProjectLinkedTask,
  ProjectTaskDraft,
  ProjectTaskEditDraft,
  ProjectDetailsProps,
  ProjectTeamTableRow,
  normalizeLinkedTaskStatus,
  parseTextLines,
  getTaskKey,
} from './projectDetailsTypes';
import { ProjectDetailsTaskModals } from './ProjectDetailsTaskModals';
import { ProjectDetailsOverview } from './ProjectDetailsOverview';
import { ProjectDetailsDeliveryPanel } from './ProjectDetailsDeliveryPanel';

export type { ProjectTaskDraft };

const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  project,
  loading = false,
  canManageProject,
  canDeleteProject = false,
  canCreateTask = false,
  onEditProject,
  onDeleteProject,
  onCreateTask,
}) => {
  const viewer = useMemo(() => getLoggedInEmployee(), []);
  const viewerMode = useMemo<SpacesMode>(
    () => ((viewer.role || '').toUpperCase() === 'EMPLOYEE' ? 'employee' : 'manager'),
    [viewer.role],
  );
  const projectAssignees = useMemo<ProjectTeamMember[]>(() => {
    const seen = new Map<string, ProjectTeamMember>();

    const addMember = (member?: Partial<ProjectTeamMember> | null, fallbackRole = 'Team Member') => {
      const id = String(member?.id || '').trim();
      const name = String(member?.name || '').trim();
      const normalizedName = name.toLowerCase();
      const key = normalizedName || id;
      if (!key) return;

      if (seen.has(key)) {
        const existing = seen.get(key)!;
        seen.set(key, {
          ...existing,
          id: existing.id || id || key,
          role: existing.role || String(member?.role || '').trim() || fallbackRole,
          avatar: existing.avatar || String(member?.avatar || '').trim(),
          email: existing.email || String(member?.email || '').trim(),
          designation: existing.designation || String(member?.designation || '').trim(),
          department: existing.department || String(member?.department || '').trim(),
        });
        return;
      }

      seen.set(key, {
        id: id || key,
        name: name || id || key,
        role: String(member?.role || '').trim() || fallbackRole,
        avatar: String(member?.avatar || '').trim(),
        email: String(member?.email || '').trim(),
        designation: String(member?.designation || '').trim(),
        department: String(member?.department || '').trim(),
      });
    };

    flattenProjectMembers(project?.team).forEach((member) => addMember(member, member.role || 'Team Member'));
    (project?.projectTeam || []).forEach((member) => addMember(member, member.role || 'Team Member'));
    (project?.smeList || []).forEach((member) => addMember(member, member.role || 'Team Lead'));
    addMember(project?.team?.projectManager || null, 'Project Manager');

    if (project?.lead) {
      addMember(
        {
          id: project.team?.projectManager?.id || project.lead,
          name: project.lead,
          role: project.leadRole || 'Project Manager',
        },
        'Project Manager',
      );
    }

    if (project?.champion) {
      addMember(
        {
          id: project.team?.projectManager?.id || project.champion,
          name: project.champion,
          role: project.championRole || 'Project Sponsor',
        },
        'Project Sponsor',
      );
    }

    return Array.from(seen.values());
  }, [project]);

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [linkedSpaceTasks, setLinkedSpaceTasks] = useState<ProjectLinkedTask[] | null>(null);
  const [linkedSpaceTasksResolved, setLinkedSpaceTasksResolved] = useState(false);
  const [taskActionError, setTaskActionError] = useState<string | null>(null);
  const [activeTaskMenuId, setActiveTaskMenuId] = useState<string | null>(null);
  const [taskPendingId, setTaskPendingId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<ProjectLinkedTask | null>(null);
  const [editingTaskDraft, setEditingTaskDraft] = useState<ProjectTaskEditDraft>({
    title: '',
    description: '',
    assigneeId: '',
    dueDate: '',
    priority: 'medium',
    status: 'todo',
  });
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<ProjectLinkedTask | null>(null);

  const normalizeIncomingTask = React.useCallback((task: LinkedSpaceTaskRecord): ProjectLinkedTask => ({
    id: String(task.projectTaskId || task.taskId || ''),
    spaceTaskId: String(task.taskId || '').trim() || undefined,
    projectTaskId: String(task.projectTaskId || task.taskId || '').trim() || undefined,
    projectId: project?.id,
    title: String(task.title || '').trim() || 'Untitled Task',
    description: String(task.description || '').trim(),
    status: normalizeLinkedTaskStatus(task.status),
    priority: task.priority === 'high' || task.priority === 'low' ? task.priority : 'medium',
    assigneeId: String(task.assigneeId || '').trim() || undefined,
    assigneeName: String(task.assigneeName || '').trim() || undefined,
    dueDate: String(task.dueDate || '').trim() || undefined,
    createdByEmpId: String(task.createdByEmpId || '').trim() || undefined,
    createdByName: String(task.createdByName || '').trim() || undefined,
    createdByRole: String(task.createdByRole || '').trim() || undefined,
    createdAt: String(task.createdAt || '') || new Date().toISOString(),
    updatedAt: String(task.updatedAt || task.createdAt || '') || new Date().toISOString(),
  }), [project?.id]);

  React.useEffect(() => {
    let cancelled = false;

    const loadLinkedSpaceTasks = async (options?: { preserveExisting?: boolean }) => {
      if (!project?.id) {
        if (!cancelled) {
          setLinkedSpaceTasks([]);
          setLinkedSpaceTasksResolved(true);
        }
        return;
      }

      if (!options?.preserveExisting && !cancelled) {
        setLinkedSpaceTasksResolved(false);
      }

      try {
        const data = await fetchWorkspaceLinkTasks();
        const linkedTasks = (Array.isArray(data?.tasks) ? data.tasks : [])
          .filter((task: LinkedSpaceTaskRecord) => String(task?.projectId || '').trim() === project.id)
          .map((task: LinkedSpaceTaskRecord) => normalizeIncomingTask(task))
          .filter((task) => task.id);

        if (!cancelled) {
          setLinkedSpaceTasks(linkedTasks);
          setLinkedSpaceTasksResolved(true);
        }
      } catch {
        if (!cancelled) {
          setLinkedSpaceTasks(null);
          setLinkedSpaceTasksResolved(true);
        }
      }
    };

    void loadLinkedSpaceTasks();

    const socket = getSocket();
    const onSpacesChanged = (payload: any) => {
      const action = String(payload?.action || '').trim();
      const payloadProjectId = String(payload?.task?.projectId || payload?.projectId || '').trim();
      const shouldRefreshForDelete = action === 'task_deleted';
      const shouldRefreshForProject = payloadProjectId === project?.id;
      if (!['task_created', 'task_updated', 'task_deleted'].includes(action) || (!shouldRefreshForDelete && !shouldRefreshForProject)) {
        return;
      }

      void loadLinkedSpaceTasks({ preserveExisting: true });
    };

    socket.on('spaces:changed', onSpacesChanged);
    const onWindowRefresh = () => {
      void loadLinkedSpaceTasks({ preserveExisting: true });
    };
    window.addEventListener('rapidgrow:spaces-refresh', onWindowRefresh);
    return () => {
      cancelled = true;
      socket.off('spaces:changed', onSpacesChanged);
      window.removeEventListener('rapidgrow:spaces-refresh', onWindowRefresh);
    };
  }, [project?.id]);

  React.useEffect(() => {
    if (!activeTaskMenuId) return;

    const closeMenu = () => setActiveTaskMenuId(null);
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [activeTaskMenuId]);

  const fallbackProjectTasks = useMemo<ProjectLinkedTask[]>(
    () =>
      (project?.tasks || [])
        .filter((task) => task.projectId === project?.id)
        .map((task) => ({
          ...task,
          projectTaskId: task.id,
        })),
    [project?.id, project?.tasks],
  );

  const isTaskDataLoading = Boolean(project?.id) && !linkedSpaceTasksResolved;

  const scopedTasks = useMemo<ProjectLinkedTask[]>(
    () => {
      if (isTaskDataLoading) return [];
      return linkedSpaceTasks ?? fallbackProjectTasks;
    },
    [fallbackProjectTasks, isTaskDataLoading, linkedSpaceTasks],
  );

  const taskMetrics = useMemo(() => computeProjectTaskMetrics(scopedTasks), [scopedTasks]);
  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>();
    projectAssignees.forEach((member) => {
      if (member.id) {
        map.set(member.id, member.name);
      }
    });
    return map;
  }, [projectAssignees]);
  const assignedProjectTasks = useMemo(
    () =>
      scopedTasks.filter((task) => task.assigneeId).sort((left, right) => {
        const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
        const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
        return rightTime - leftTime;
      }),
    [scopedTasks],
  );

  const toSpacesPermissionTask = React.useCallback(
    (task: ProjectLinkedTask): SpacesTask => ({
      taskId: task.spaceTaskId || task.projectTaskId || task.id,
      title: task.title,
      description: task.description,
      projectId: task.projectId,
      projectTaskId: task.projectTaskId || task.id,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      comments: [],
      customFields: {},
      createdByEmpId: task.createdByEmpId,
      createdByName: task.createdByName,
      createdByRole: task.createdByRole,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }),
    [],
  );

  const canEditAssignedTask = React.useCallback(
    (task: ProjectLinkedTask) => canEditTaskForView(toSpacesPermissionTask(task), viewer, viewerMode),
    [toSpacesPermissionTask, viewer, viewerMode],
  );

  const canDeleteAssignedTask = React.useCallback(
    (task: ProjectLinkedTask) => canDeleteTaskForView(toSpacesPermissionTask(task), viewer, viewerMode),
    [toSpacesPermissionTask, viewer, viewerMode],
  );

  const canToggleAssignedTask = React.useCallback(
    (task: ProjectLinkedTask) =>
      canChangeStatusForView(
        toSpacesPermissionTask(task),
        viewerMode,
        viewer,
        () => false,
        (candidateTask) => canEditTaskForView(candidateTask, viewer, viewerMode),
      ),
    [toSpacesPermissionTask, viewer, viewerMode],
  );

  const closeEditTaskModal = () => {
    setEditingTask(null);
    setTaskActionError(null);
    setTaskPendingId(null);
    setEditingTaskDraft({
      title: '',
      description: '',
      assigneeId: '',
      dueDate: '',
      priority: 'medium',
      status: 'todo',
    });
  };

  const openEditTaskModal = (task: ProjectLinkedTask) => {
    setTaskActionError(null);
    setActiveTaskMenuId(null);
    setEditingTask(task);
    setEditingTaskDraft({
      title: task.title,
      description: task.description || '',
      assigneeId: task.assigneeId || '',
      dueDate: task.dueDate || '',
      priority: task.priority,
      status: task.status,
    });
  };

  const updateTaskInCollections = (
    source: ProjectLinkedTask[],
    task: ProjectLinkedTask,
    updates: Partial<ProjectLinkedTask>,
    updatedAt: string,
  ) =>
    source.map((item) =>
      getTaskKey(item) === getTaskKey(task)
        ? {
            ...item,
            ...updates,
            assigneeId: updates.assigneeId === '' ? undefined : updates.assigneeId ?? item.assigneeId,
            dueDate: updates.dueDate === '' ? undefined : updates.dueDate ?? item.dueDate,
            updatedAt,
          }
        : item,
    );

  const handleUpdateTask = async (task: ProjectLinkedTask, updates: Partial<ProjectTaskEditDraft>) => {
    if (!project?.id) return;

    const taskKey = getTaskKey(task);
    const updatedAt = new Date().toISOString();
    const previousLocalTasks = linkedSpaceTasks;
    const sourceTasks = (linkedSpaceTasks ?? scopedTasks).map((item) => ({ ...item }));
    const nextLocalTasks = updateTaskInCollections(sourceTasks, task, updates, updatedAt);
    const targetProjectTaskId = String(task.projectTaskId || task.id || '').trim();

    setTaskActionError(null);
    setTaskPendingId(taskKey);
    setLinkedSpaceTasks(nextLocalTasks);

    try {
      const projectResponse = await fetch(`${API_BASE}/project-charters/${project.id}`, {
        headers: getAuthHeaders(),
      });
      if (!projectResponse.ok) {
        throw new Error('Failed to load project details');
      }

      const backendProject = await projectResponse.json().catch(() => ({}));
      const existingProjectTasks = Array.isArray(backendProject?.tasks) ? backendProject.tasks : [];
      const updatedProjectTasks = existingProjectTasks.map((projectTask: any) =>
        String(projectTask?.id || '').trim() === targetProjectTaskId
          ? {
              ...projectTask,
              ...(updates.title !== undefined ? { title: updates.title } : {}),
              ...(updates.description !== undefined ? { description: updates.description } : {}),
              ...(updates.status !== undefined ? { status: updates.status } : {}),
              ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
              ...(updates.assigneeId !== undefined ? { assigneeId: updates.assigneeId || undefined } : {}),
              ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate || undefined } : {}),
              updatedAt,
            }
          : projectTask,
      );

      const saveProjectResponse = await fetch(`${API_BASE}/project-charters`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(projectCharterPayloadFromBackendProject(backendProject, updatedProjectTasks)),
      });
      if (!saveProjectResponse.ok) {
        const error = await saveProjectResponse.json().catch(() => ({}));
        throw new Error(error?.message || 'Failed to update task');
      }

      if (task.spaceTaskId) {
        const patchResponse = await fetch(`${API_BASE}/spaces/tasks/${task.spaceTaskId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...(updates.title !== undefined ? { title: updates.title } : {}),
            ...(updates.description !== undefined ? { description: updates.description } : {}),
            ...(updates.status !== undefined ? { status: updates.status } : {}),
            ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
            ...(updates.assigneeId !== undefined ? { assigneeId: updates.assigneeId || '' } : {}),
            ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate || '' } : {}),
          }),
        });

        if (!patchResponse.ok) {
          const error = await patchResponse.json().catch(() => ({}));
          await fetch(`${API_BASE}/project-charters`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(projectCharterPayloadFromBackendProject(backendProject, existingProjectTasks)),
          }).catch(() => undefined);
          throw new Error(error?.message || 'Failed to update task');
        }

        const updatedSpaceTask = await patchResponse.json().catch(() => null);
        if (updatedSpaceTask) {
          setLinkedSpaceTasks((current) =>
            updateTaskInCollections(
              current ?? nextLocalTasks,
              task,
              normalizeIncomingTask(updatedSpaceTask as LinkedSpaceTaskRecord),
              updatedAt,
            ),
          );
        }
      }

      if (editingTask && getTaskKey(editingTask) === taskKey) {
        closeEditTaskModal();
      }
    } catch (error: any) {
      setLinkedSpaceTasks(previousLocalTasks);
      setTaskActionError(error?.message || 'Failed to update task');
    } finally {
      setTaskPendingId(null);
    }
  };

  const handleDeleteTask = async (task: ProjectLinkedTask) => {
    if (!project?.id) return;

    const taskKey = getTaskKey(task);
    const previousLocalTasks = linkedSpaceTasks;
    const sourceTasks = (linkedSpaceTasks ?? scopedTasks).map((item) => ({ ...item }));
    const targetProjectTaskId = String(task.projectTaskId || task.id || '').trim();

    setTaskActionError(null);
    setTaskPendingId(taskKey);
    setLinkedSpaceTasks(sourceTasks.filter((item) => getTaskKey(item) !== taskKey));

    try {
      const projectResponse = await fetch(`${API_BASE}/project-charters/${project.id}`, {
        headers: getAuthHeaders(),
      });
      if (!projectResponse.ok) {
        throw new Error('Failed to load project details');
      }

      const backendProject = await projectResponse.json().catch(() => ({}));
      const existingProjectTasks = Array.isArray(backendProject?.tasks) ? backendProject.tasks : [];
      const updatedProjectTasks = existingProjectTasks.filter(
        (projectTask: any) => String(projectTask?.id || '').trim() !== targetProjectTaskId,
      );

      const saveProjectResponse = await fetch(`${API_BASE}/project-charters`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(projectCharterPayloadFromBackendProject(backendProject, updatedProjectTasks)),
      });
      if (!saveProjectResponse.ok) {
        const error = await saveProjectResponse.json().catch(() => ({}));
        throw new Error(error?.message || 'Failed to delete task');
      }

      if (task.spaceTaskId) {
        const deleteResponse = await fetch(`${API_BASE}/spaces/tasks/${task.spaceTaskId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        if (!deleteResponse.ok) {
          const error = await deleteResponse.json().catch(() => ({}));
          await fetch(`${API_BASE}/project-charters`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(projectCharterPayloadFromBackendProject(backendProject, existingProjectTasks)),
          }).catch(() => undefined);
          throw new Error(error?.message || 'Failed to delete task');
        }
      }

      setDeleteTaskTarget(null);
      setActiveTaskMenuId(null);
    } catch (error: any) {
      setLinkedSpaceTasks(previousLocalTasks);
      setTaskActionError(error?.message || 'Failed to delete task');
    } finally {
      setTaskPendingId(null);
    }
  };

  const closeAddTaskModal = () => {
    setIsAddTaskOpen(false);
    setTaskTitle('');
    setTaskDescription('');
    setTaskAssigneeId('');
    setTaskDueDate('');
    setTaskPriority('medium');
    setTaskError(null);
    setTaskSubmitting(false);
  };

  const handleCreateTask = async () => {
    const title = taskTitle.trim();
    if (!title || !onCreateTask) return;

    setTaskSubmitting(true);
    setTaskError(null);

    try {
      await onCreateTask({
        title,
        description: taskDescription.trim(),
        assigneeId: taskAssigneeId,
        dueDate: taskDueDate,
        priority: taskPriority,
      });
      closeAddTaskModal();
    } catch (error: any) {
      setTaskError(error?.message || 'Failed to create task');
      setTaskSubmitting(false);
    }
  };

  if (loading && !project) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-32 rounded-full bg-slate-200" />
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-10 w-80 rounded-full bg-slate-200" />
          <div className="mt-4 h-4 w-full rounded-full bg-slate-100" />
          <div className="mt-2 h-4 w-5/6 rounded-full bg-slate-100" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`detail-stat-${index}`} className="rounded-[1.5rem] bg-slate-50 p-5">
                <div className="h-4 w-24 rounded-full bg-slate-200" />
                <div className="mt-4 h-8 w-16 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Project not found</h2>
        <p className="mt-2 text-sm text-slate-500">We could not locate this charter in the current workspace scope.</p>
        <Link
          to="/workspaces"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <ArrowLeft size={16} />
          Back to project list
        </Link>
      </div>
    );
  }

  const projectMembers = countProjectMembers(project);
  const latestUpdatedAt = project.activity?.[0]?.createdAt || `${project.dateCreated}T00:00:00.000Z`;
  const problemLines = parseTextLines(project.problemStatement || project.description);
  const objectiveLines = parseTextLines(project.goalStatement);
  const keyResultLines = parseTextLines(project.businessCase);
  const inScopeLines = parseTextLines(project.inScope);
  const outOfScopeLines = parseTextLines(project.outOfScope);
  const benefitLines = parseTextLines(project.benefits);
  const timelineRows = (() => {
    const defaultKeys = new Set(PROJECT_REVIEW_PHASES.map((phase) => phase.key));
    const defaultRows = PROJECT_REVIEW_PHASES.filter((phase) => String(project.phases?.[phase.key] || '').trim()).map((phase) => ({
      label: phase.label,
      value: String(project.phases?.[phase.key] || '').trim(),
    }));
    const extraRows = Object.entries(project.phases || {})
      .filter(([key, value]) => !defaultKeys.has(key) && String(value || '').trim())
      .sort(([leftKey], [rightKey]) => {
        const leftNumber = Number.parseInt(leftKey.replace('phase', ''), 10);
        const rightNumber = Number.parseInt(rightKey.replace('phase', ''), 10);
        return leftNumber - rightNumber;
      })
      .map(([key, value]) => ({
        label: `Phase ${Number.parseInt(key.replace('phase', ''), 10)}`,
        value: String(value || '').trim(),
      }));

    return [...defaultRows, ...extraRows];
  })();
  const projectLeadName = project.lead || project.team?.projectManager?.name || 'Unassigned';
  const orderedTeamRows: ProjectTeamTableRow[] = [];
  const seenTeamMembers = new Set<string>();

  const pushTeamRow = (role: string, name?: string) => {
    const cleanName = String(name || '').trim();
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    if (seenTeamMembers.has(key)) return;
    seenTeamMembers.add(key);
    orderedTeamRows.push({ role, name: cleanName });
  };

  pushTeamRow(project.championRole || 'Project Champion', project.champion);
  pushTeamRow(project.leadRole || 'Project Lead', projectLeadName);
  (project.smeList || []).forEach((member) => pushTeamRow(member.role || 'Project Team Member (SME)', member.name));
  (project.projectTeam || []).forEach((member) => pushTeamRow(member.role || 'Project Team Member', member.name));

  const displayedTeamMemberCount = orderedTeamRows.filter((member) => {
    const role = member.role.toLowerCase();
    return !role.includes('champion') && !role.includes('project lead');
  }).length;

  return (
    <div className="space-y-6">
      <ProjectDetailsTaskModals
        projectName={project.name}
        projectAssignees={projectAssignees}
        isAddTaskOpen={isAddTaskOpen}
        taskTitle={taskTitle}
        setTaskTitle={setTaskTitle}
        taskDescription={taskDescription}
        setTaskDescription={setTaskDescription}
        taskAssigneeId={taskAssigneeId}
        setTaskAssigneeId={setTaskAssigneeId}
        taskDueDate={taskDueDate}
        setTaskDueDate={setTaskDueDate}
        taskPriority={taskPriority}
        setTaskPriority={setTaskPriority}
        taskError={taskError}
        taskSubmitting={taskSubmitting}
        closeAddTaskModal={closeAddTaskModal}
        onCreateTask={() => void handleCreateTask()}
        editingTask={editingTask}
        editingTaskDraft={editingTaskDraft}
        setEditingTaskDraft={setEditingTaskDraft}
        closeEditTaskModal={closeEditTaskModal}
        onUpdateTask={(task, updates) => void handleUpdateTask(task, updates)}
        taskPendingId={taskPendingId}
        taskActionError={taskActionError}
        deleteTaskTarget={deleteTaskTarget}
        setDeleteTaskTarget={setDeleteTaskTarget}
        setTaskActionError={setTaskActionError}
        onDeleteTask={(task) => void handleDeleteTask(task)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/workspaces"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
          Back to project list
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {canManageProject ? (
            <button
              type="button"
              onClick={onEditProject}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
            >
              Edit Charter
            </button>
          ) : null}
          {canDeleteProject ? (
            <button
              type="button"
              onClick={() => void onDeleteProject()}
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100"
            >
              <Trash2 size={16} />
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <ProjectDetailsOverview
        project={project}
        projectLeadName={projectLeadName}
        latestUpdatedAt={latestUpdatedAt}
        displayedTeamMemberCount={displayedTeamMemberCount}
        projectMembers={projectMembers}
        problemLines={problemLines}
        objectiveLines={objectiveLines}
        keyResultLines={keyResultLines}
        orderedTeamRows={orderedTeamRows}
        inScopeLines={inScopeLines}
        outOfScopeLines={outOfScopeLines}
        benefitLines={benefitLines}
        timelineRows={timelineRows}
      />

      <ProjectDetailsDeliveryPanel
        team={project.team}
        canCreateTask={canCreateTask}
        onAddTask={() => setIsAddTaskOpen(true)}
        isTaskDataLoading={isTaskDataLoading}
        taskMetrics={taskMetrics}
        projectManagerName={project.team?.projectManager?.name || 'Unassigned'}
        leadPodsCount={project.team?.teamLeads.length || 0}
        projectStatus={project.status}
        assignedProjectTasks={assignedProjectTasks}
        assigneeNameById={assigneeNameById}
        taskActionError={taskActionError}
        editingTask={editingTask}
        deleteTaskTarget={deleteTaskTarget}
        activeTaskMenuId={activeTaskMenuId}
        setActiveTaskMenuId={setActiveTaskMenuId}
        taskPendingId={taskPendingId}
        canEditAssignedTask={canEditAssignedTask}
        canDeleteAssignedTask={canDeleteAssignedTask}
        canToggleAssignedTask={canToggleAssignedTask}
        onToggleDone={(task, done) => void handleUpdateTask(task, { status: done ? 'done' : 'todo' })}
        onOpenEdit={openEditTaskModal}
        onRequestDelete={(task) => {
          setTaskActionError(null);
          setActiveTaskMenuId(null);
          setDeleteTaskTarget(task);
        }}
        setTaskActionError={setTaskActionError}
      />
    </div>
  );
};

export default ProjectDetails;
