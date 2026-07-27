import { PlanningState, WorkspaceProject, WorkspaceTask } from '../../types';
import { getStoredAuthSession } from '../../config/api';

export interface LinkedSpaceTaskRecord {
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

export function getSessionViewerIdentifiers(currentUserId?: string): string[] {
  const session = getStoredAuthSession();
  const employee = session?.employee || {};
  return [String(employee.empId || '').trim(), String(employee._id || '').trim(), String(currentUserId || '').trim()].filter(Boolean);
}

export function normalizeWorkspaceTaskStatus(status?: string): WorkspaceTask['status'] {
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

export function normalizeGeneralTask(task: LinkedSpaceTaskRecord): WorkspaceTask & { assigneeName?: string } {
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

export function upsertProjectInState(prev: PlanningState, project: WorkspaceProject): PlanningState {
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

export function replaceProjectsInState(prev: PlanningState, projects: WorkspaceProject[]): PlanningState {
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
