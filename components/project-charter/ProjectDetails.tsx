import React, { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, CalendarRange, Check, CheckCheck, Clock3, FileText, MoreVertical, Pencil, Plus, Target, Trash2, UsersRound, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProjectTeamMember, WorkspaceProject, WorkspaceTask } from '../../types';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { fetchWorkspaceLinkTasks } from '../../services/spacesApi';
import { getSocket } from '../../realtime/socket';
import ProgressBar from './ProgressBar';
import TeamHierarchy from './TeamHierarchy';
import {
  flattenProjectMembers,
  computeProjectTaskMetrics,
  countProjectMembers,
  formatProjectDate,
  formatProjectDateTime,
  PROJECT_REVIEW_PHASES,
  getProjectPriorityLabel,
  getProjectStatusLabel,
} from './projectCharterUtils';
import { CREATE_INPUT_CLASS, ThemedDatePicker } from '../spaces/SpacesFormControls';
import {
  canChangeStatusForView,
  canDeleteTaskForView,
  canEditTaskForView,
  getLoggedInEmployee,
  projectCharterPayloadFromBackendProject,
  SpacesMode,
  SpacesTask,
} from '../../views/spacesViewHelpers';

interface LinkedSpaceTaskRecord {
  taskId?: string;
  projectTaskId?: string;
  projectId?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  dueDate?: string;
  assigneeName?: string;
  createdByEmpId?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProjectLinkedTask extends WorkspaceTask {
  spaceTaskId?: string;
  projectTaskId?: string;
  assigneeName?: string;
  createdByEmpId?: string;
  createdByName?: string;
  createdByRole?: string;
}

function normalizeLinkedTaskStatus(status?: string): 'todo' | 'doing' | 'review' | 'done' | 'blocked' {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (['todo', 'to_do', 'pending', 'open'].includes(normalized)) return 'todo';
  if (['doing', 'in_progress', 'progress', 'ongoing'].includes(normalized)) return 'doing';
  if (['review', 'submitted', 'submit', 'for_review'].includes(normalized)) return 'review';
  if (['done', 'completed', 'complete', 'closed'].includes(normalized)) return 'done';
  if (['blocked', 'on_hold', 'hold'].includes(normalized)) return 'blocked';
  return 'todo';
}

export interface ProjectTaskDraft {
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

interface ProjectTaskEditDraft extends ProjectTaskDraft {
  status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
}

interface ProjectDetailsProps {
  project?: WorkspaceProject | null;
  loading?: boolean;
  canManageProject: boolean;
  canDeleteProject?: boolean;
  canCreateTask?: boolean;
  onEditProject: () => void;
  onDeleteProject: () => Promise<void> | void;
  onCreateTask?: (draft: ProjectTaskDraft) => Promise<void> | void;
}

interface ProjectTeamTableRow {
  role: string;
  name: string;
}

function parseTextLines(value?: string): string[] {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-*•\u2022]+/, '').trim())
    .filter(Boolean);
}

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

  const getTaskKey = React.useCallback(
    (task: Pick<ProjectLinkedTask, 'projectTaskId' | 'spaceTaskId' | 'id'>) =>
      String(task.projectTaskId || task.spaceTaskId || task.id || ''),
    [],
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

  const getTaskStatusLabel = (status: ProjectLinkedTask['status']) => {
    if (status === 'review') return 'Submitted';
    if (status === 'todo') return 'Todo';
    if (status === 'doing') return 'Doing';
    if (status === 'done') return 'Done';
    return 'Blocked';
  };

  const getTaskStatusClasses = (status: ProjectLinkedTask['status']) => {
    if (status === 'done') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'review') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (status === 'doing') return 'border-sky-200 bg-sky-50 text-sky-700';
    if (status === 'blocked') return 'border-rose-200 bg-rose-50 text-rose-700';
    return 'border-slate-200 bg-white text-slate-600';
  };

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

  if (loading) {
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
      {isAddTaskOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Add Task</h3>
                <p className="mt-1 text-sm text-slate-500">This task will stay linked to {project.name} and sync to Task Hub.</p>
              </div>
              <button
                type="button"
                onClick={closeAddTaskModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Task title</label>
                <input
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Enter task title"
                  className={CREATE_INPUT_CLASS}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
                  rows={4}
                  placeholder="Add a short task description"
                  className={`${CREATE_INPUT_CLASS} min-h-[110px] resize-none`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Assign to</label>
                <select
                  value={taskAssigneeId}
                  onChange={(event) => setTaskAssigneeId(event.target.value)}
                  className={`${CREATE_INPUT_CLASS} appearance-none bg-white`}
                >
                  <option value="">Unassigned</option>
                  {projectAssignees.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.role && member.role.toLowerCase() !== member.name.toLowerCase()
                        ? `${member.name} - ${member.role}`
                        : member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Due date</label>
                <ThemedDatePicker value={taskDueDate} onChange={setTaskDueDate} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(event) => setTaskPriority(event.target.value as 'low' | 'medium' | 'high')}
                  className={`${CREATE_INPUT_CLASS} appearance-none bg-white`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Project</label>
                <div className={`${CREATE_INPUT_CLASS} flex items-center bg-slate-50 text-slate-500`}>
                  <span className="truncate">{project.name}</span>
                </div>
              </div>

              {taskError ? <p className="md:col-span-2 text-sm text-rose-600">{taskError}</p> : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={closeAddTaskModal}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateTask()}
                disabled={!taskTitle.trim() || taskSubmitting}
                className={`inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-gradient-to-r from-slate-950 via-[#111c44] to-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(29,78,216,0.24)] ${!taskTitle.trim() || taskSubmitting ? 'cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-[0_14px_30px_rgba(15,23,42,0.18)]' : ''}`}
              >
                <Plus size={16} />
                {taskSubmitting ? 'Creating...' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Edit Task</h3>
                <p className="mt-1 text-sm text-slate-500">Update this linked task without leaving the project page.</p>
              </div>
              <button
                type="button"
                onClick={closeEditTaskModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Task title</label>
                <input
                  value={editingTaskDraft.title}
                  onChange={(event) => setEditingTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Enter task title"
                  className={CREATE_INPUT_CLASS}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={editingTaskDraft.description}
                  onChange={(event) => setEditingTaskDraft((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  placeholder="Add a short task description"
                  className={`${CREATE_INPUT_CLASS} min-h-[110px] resize-none`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Assign to</label>
                <select
                  value={editingTaskDraft.assigneeId}
                  onChange={(event) => setEditingTaskDraft((prev) => ({ ...prev, assigneeId: event.target.value }))}
                  className={`${CREATE_INPUT_CLASS} appearance-none bg-white`}
                >
                  <option value="">Unassigned</option>
                  {projectAssignees.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.role && member.role.toLowerCase() !== member.name.toLowerCase()
                        ? `${member.name} - ${member.role}`
                        : member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Due date</label>
                <ThemedDatePicker
                  value={editingTaskDraft.dueDate}
                  onChange={(value) => setEditingTaskDraft((prev) => ({ ...prev, dueDate: value }))}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={editingTaskDraft.priority}
                  onChange={(event) => setEditingTaskDraft((prev) => ({ ...prev, priority: event.target.value as 'low' | 'medium' | 'high' }))}
                  className={`${CREATE_INPUT_CLASS} appearance-none bg-white`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={editingTaskDraft.status}
                  onChange={(event) =>
                    setEditingTaskDraft((prev) => ({
                      ...prev,
                      status: event.target.value as ProjectTaskEditDraft['status'],
                    }))
                  }
                  className={`${CREATE_INPUT_CLASS} appearance-none bg-white`}
                >
                  <option value="todo">To Do</option>
                  <option value="doing">Doing</option>
                  <option value="review">Submitted</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              {taskActionError ? <p className="md:col-span-2 text-sm text-rose-600">{taskActionError}</p> : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={closeEditTaskModal}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleUpdateTask(editingTask, editingTaskDraft)}
                disabled={!editingTaskDraft.title.trim() || taskPendingId === getTaskKey(editingTask)}
                className={`inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-gradient-to-r from-slate-950 via-[#111c44] to-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(29,78,216,0.24)] ${!editingTaskDraft.title.trim() || taskPendingId === getTaskKey(editingTask) ? 'cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-[0_14px_30px_rgba(15,23,42,0.18)]' : ''}`}
              >
                {taskPendingId === getTaskKey(editingTask) ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTaskTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Delete Task</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Delete <span className="font-semibold text-slate-700">{deleteTaskTarget.title}</span> from this project and task hub.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteTaskTarget(null);
                  setTaskActionError(null);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {taskActionError ? <p className="mt-4 text-sm text-rose-600">{taskActionError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTaskTarget(null);
                  setTaskActionError(null);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteTask(deleteTaskTarget)}
                disabled={taskPendingId === getTaskKey(deleteTaskTarget)}
                className={`inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 ${taskPendingId === getTaskKey(deleteTaskTarget) ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <Trash2 size={16} />
                {taskPendingId === getTaskKey(deleteTaskTarget) ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      <div className="space-y-5">
        <div className="flex items-center gap-3 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-brand-red">
            <CalendarRange size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Project Overview</h2>
          </div>
        </div>

        <div className="space-y-5 px-5">
          <div className="rounded-[1.55rem] border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_28px_rgba(15,23,42,0.045)]">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_290px] xl:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-slate-950 via-[#162554] to-[#1f2e68] text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
                  <FileText size={26} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[1.65rem] font-semibold tracking-[-0.02em] text-slate-950">{project.name}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px] text-slate-600">
                    <span>
                      <span className="font-medium text-slate-500">Project Lead:</span>{' '}
                      <span className="font-semibold text-slate-900">{projectLeadName}</span>
                    </span>
                    <span>
                      <span className="font-medium text-slate-500">Created:</span>{' '}
                      <span className="text-slate-900">{formatProjectDate(project.dateCreated)}</span>
                    </span>
                    <span>
                      <span className="font-medium text-slate-500">Last updated:</span>{' '}
                      <span className="text-slate-900">{formatProjectDateTime(latestUpdatedAt)}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.05rem] border border-slate-200 bg-slate-50/65 px-4 py-3">
                  <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Project Lead</p>
                  <p className="mt-2 whitespace-nowrap text-[0.95rem] font-semibold text-slate-950">{projectLeadName}</p>
                </div>
                <div className="rounded-[1.05rem] border border-slate-200 bg-slate-50/65 px-4 py-3">
                  <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Team Members</p>
                  <p className="mt-2 whitespace-nowrap text-[0.95rem] font-semibold text-slate-950">{displayedTeamMemberCount || projectMembers}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-[1.55rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                  <FileText size={18} />
                </div>
                <h3 className="text-lg font-semibold text-slate-950">Business Case</h3>
              </div>

              <div className="mt-5 border-t border-slate-100">
                <div className="pt-6">
                  <p className="text-sm font-semibold text-slate-950">Problem / Opportunity Statement</p>
                  <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                    {problemLines.length > 0 ? problemLines.map((line, index) => <p key={`problem-${index}`}>{line}</p>) : <p>Not provided.</p>}
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6">
                  <p className="text-sm font-semibold text-slate-950">Objective</p>
                  <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                    {objectiveLines.length > 0 ? objectiveLines.map((line, index) => <p key={`objective-${index}`}>{line}</p>) : <p>Not provided.</p>}
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6">
                  <p className="text-sm font-semibold text-slate-950">Key Results</p>
                  {keyResultLines.length > 0 ? (
                    <ul className="mt-3 space-y-2.5 text-sm leading-7 text-slate-600">
                      {keyResultLines.map((line, index) => (
                        <li key={`key-result-${index}`} className="flex items-start gap-2.5">
                          <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check size={12} />
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-slate-600">Not provided.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="flex h-full min-h-[420px] flex-col rounded-[1.55rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                  <UsersRound size={18} />
                </div>
                <h3 className="text-lg font-semibold text-slate-950">Project Team</h3>
              </div>

              <div className="mt-5 min-h-0 flex-1">
                <div className="grid grid-cols-[1.25fr_0.95fr] gap-4 rounded-t-[1rem] bg-slate-50 px-6 py-4 text-[0.92rem] font-semibold text-slate-600">
                  <span>Role</span>
                  <span>Name</span>
                </div>
                <div className="min-h-0 max-h-[292px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {orderedTeamRows.length > 0 ? (
                    orderedTeamRows.map((member, index) => (
                      <div
                        key={`team-row-${member.role}-${member.name}-${index}`}
                        className={`grid grid-cols-[1.25fr_0.95fr] gap-4 px-6 py-4 text-[0.95rem] text-slate-700 ${index === 0 ? 'border-t border-slate-200' : 'border-t border-slate-100'}`}
                      >
                        <span className="font-semibold text-slate-800">{member.role}</span>
                        <span className="font-medium text-slate-900">{member.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="border-t border-slate-200 px-6 py-5 text-sm text-slate-500">No team members added yet.</div>
                  )}
                </div>
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-[1.55rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                    <Target size={18} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">Project Scope</h3>
                </div>

                <div className="mt-5 border-t border-slate-100">
                  <div className="pt-6">
                    <p className="text-sm font-semibold text-slate-950">In Scope</p>
                    {inScopeLines.length > 0 ? (
                      <ul className="mt-3 space-y-2.5 text-sm leading-7 text-slate-600">
                        {inScopeLines.map((line, index) => (
                          <li key={`in-scope-${index}`} className="flex items-start gap-2.5">
                            <span className="mt-2.5 h-2 w-2 rounded-full bg-emerald-400" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-slate-600">Not provided.</p>
                    )}
                  </div>

                  <div className="mt-8 border-t border-slate-100 pt-6">
                    <p className="text-sm font-semibold text-slate-950">Out of Scope</p>
                    {outOfScopeLines.length > 0 ? (
                      <ul className="mt-3 space-y-2.5 text-sm leading-7 text-slate-600">
                        {outOfScopeLines.map((line, index) => (
                          <li key={`out-scope-${index}`} className="flex items-start gap-2.5">
                            <span className="mt-2.5 h-2 w-2 rounded-full bg-rose-400" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-slate-600">Not provided.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-[1.55rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                    <BarChart3 size={18} />
                </div>
                <h3 className="text-lg font-semibold text-slate-950">Project Benefits / Revenue</h3>
              </div>

                <div className="mt-6">
                  {benefitLines.length > 0 ? (
                    <div className="space-y-2 text-sm leading-7 text-slate-600">
                      {benefitLines.map((line, index) => (
                        <p key={`benefit-${index}`}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-7 text-slate-600">Not provided.</p>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-[1.55rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                  <Clock3 size={18} />
                </div>
                <h3 className="text-lg font-semibold text-slate-950">Project Review Timeline</h3>
              </div>

              <div
                className="relative mt-5 max-h-[350px] overflow-y-auto border-t border-slate-100 pt-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {timelineRows.length > 0 ? (
                  <div className="relative">
                    <div className="absolute bottom-[28px] left-[13px] top-[28px] w-px bg-rose-100" />
                    {timelineRows.map((phase, index) => (
                      <div
                        key={`${phase.label}-${index}`}
                        className={`relative flex items-start gap-4 py-3 ${index === timelineRows.length - 1 ? '' : 'border-b border-slate-100/90'}`}
                      >
                        <div className="relative z-[1] w-8 shrink-0">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-[11px] font-semibold text-brand-red shadow-[0_2px_6px_rgba(255,255,255,0.95)]">
                            {index}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-sm leading-7 text-slate-600">
                          <span className="font-semibold text-slate-950">{phase.label}:</span> {phase.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-5 text-sm text-slate-500">No review timeline saved yet.</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.28fr_0.72fr]">
        <div className="space-y-6">
          <TeamHierarchy team={project.team} />

          <section className="rounded-[1.85rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-brand-red">
                  <CheckCheck size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Progress Snapshot</h2>
                  <p className="text-sm text-slate-500">Completion performance and delivery health for this project.</p>
                </div>
              </div>
              {canCreateTask ? (
                <button
                  type="button"
                  onClick={() => setIsAddTaskOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-gradient-to-r from-slate-950 via-[#111c44] to-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(29,78,216,0.22)]"
                >
                  <Plus size={16} />
                  Add Task
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">Completion</p>
                  {isTaskDataLoading ? (
                    <div className="h-7 w-16 animate-pulse rounded-full bg-slate-200" />
                  ) : (
                    <p className="text-lg font-semibold text-slate-950">{taskMetrics.progress}%</p>
                  )}
                </div>
                {isTaskDataLoading ? (
                  <>
                    <div className="mt-4 h-2.5 animate-pulse rounded-full bg-slate-200" />
                    <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-slate-200" />
                  </>
                ) : (
                  <>
                    <ProgressBar value={taskMetrics.progress} className="mt-4" />
                    <p className="mt-3 text-xs text-slate-500">
                      {taskMetrics.completed} of {taskMetrics.total} tasks completed
                    </p>
                  </>
                )}
              </div>
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Completed tasks</p>
                {isTaskDataLoading ? (
                  <div className="mt-2 h-10 w-16 animate-pulse rounded-full bg-slate-200" />
                ) : (
                  <p className="mt-2 text-[2rem] font-semibold leading-none text-slate-950">{taskMetrics.completed}</p>
                )}
              </div>
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Blocked tasks</p>
                {isTaskDataLoading ? (
                  <div className="mt-2 h-10 w-16 animate-pulse rounded-full bg-slate-200" />
                ) : (
                  <p className="mt-2 text-[2rem] font-semibold leading-none text-slate-950">{taskMetrics.blocked}</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[1.85rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-brand-red">
                <UsersRound size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Delivery Pulse</h2>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Project manager</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{project.team?.projectManager?.name || 'Unassigned'}</p>
              </div>
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Lead pods</p>
                <p className="mt-2 text-[2rem] font-semibold leading-none text-slate-950">{project.team?.teamLeads.length || 0}</p>
              </div>
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">Project status</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{getProjectStatusLabel(project.status)}</p>
              </div>
            </div>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">Assigned Tasks</p>
                  {isTaskDataLoading ? (
                    <div className="h-4 w-10 animate-pulse rounded-full bg-slate-200" />
                  ) : (
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{assignedProjectTasks.length}</p>
                  )}
                </div>
                {taskActionError && !editingTask && !deleteTaskTarget ? (
                  <p className="mb-3 text-sm text-rose-600">{taskActionError}</p>
                ) : null}

                {isTaskDataLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={`assigned-task-skeleton-${index}`} className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-4 w-4 animate-pulse rounded border border-slate-200 bg-white" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
                                <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                              </div>
                              <div className="h-8 w-16 animate-pulse rounded-full bg-slate-200" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : assignedProjectTasks.length > 0 ? (
                  <div className="space-y-3">
                    {assignedProjectTasks.map((task) => {
                    const taskKey = getTaskKey(task);
                    const canEditTask = canEditAssignedTask(task);
                    const canDeleteTask = canDeleteAssignedTask(task);
                    const canToggleTask = canToggleAssignedTask(task);
                    const isDone = task.status === 'done';
                    const isTaskPending = taskPendingId === taskKey;

                    return (
                      <div
                        key={taskKey}
                        className={`group relative rounded-[1.2rem] border px-4 py-3 transition-colors ${isDone ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50/80'}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={(event) =>
                              void handleUpdateTask(task, { status: event.target.checked ? 'done' : 'todo' })
                            }
                            disabled={!canToggleTask || isTaskPending}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red/30 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`truncate text-sm font-semibold ${isDone ? 'text-slate-500 line-through' : 'text-slate-950'}`}>
                                  {task.title}
                                </p>
                                <p className={`mt-1 text-xs ${isDone ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {assigneeNameById.get(task.assigneeId || '') || task.assigneeName || task.assigneeId}
                                </p>
                              </div>

                              <div className="relative flex shrink-0 items-start gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getTaskStatusClasses(task.status)}`}>
                                  {getTaskStatusLabel(task.status)}
                                </span>

                                {(canEditTask || canDeleteTask) ? (
                                  <div
                                    className="relative"
                                    onMouseDown={(event) => event.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setTaskActionError(null);
                                        setActiveTaskMenuId((current) => (current === taskKey ? null : taskKey));
                                      }}
                                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${activeTaskMenuId === taskKey ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'}`}
                                    >
                                      <MoreVertical size={15} />
                                    </button>

                                    {activeTaskMenuId === taskKey ? (
                                      <div className="absolute right-0 top-10 z-10 flex min-w-[132px] flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                        {canEditTask ? (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              openEditTaskModal(task);
                                            }}
                                            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                                          >
                                            <Pencil size={14} />
                                            Edit
                                          </button>
                                        ) : null}
                                        {canDeleteTask ? (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setTaskActionError(null);
                                              setActiveTaskMenuId(null);
                                              setDeleteTaskTarget(task);
                                            }}
                                            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                                          >
                                            <Trash2 size={14} />
                                            Delete
                                          </button>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                  No assigned tasks for this project yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
