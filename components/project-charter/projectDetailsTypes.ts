import { ProjectTeamMember, WorkspaceProject, WorkspaceTask } from '../../types';

export interface LinkedSpaceTaskRecord {
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

export interface ProjectLinkedTask extends WorkspaceTask {
  spaceTaskId?: string;
  projectTaskId?: string;
  assigneeName?: string;
  createdByEmpId?: string;
  createdByName?: string;
  createdByRole?: string;
}

export interface ProjectTaskDraft {
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ProjectTaskEditDraft extends ProjectTaskDraft {
  status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
}

export interface ProjectDetailsProps {
  project?: WorkspaceProject | null;
  loading?: boolean;
  canManageProject: boolean;
  canDeleteProject?: boolean;
  canCreateTask?: boolean;
  onEditProject: () => void;
  onDeleteProject: () => Promise<void> | void;
  onCreateTask?: (draft: ProjectTaskDraft) => Promise<void> | void;
}

export interface ProjectTeamTableRow {
  role: string;
  name: string;
}

export function normalizeLinkedTaskStatus(status?: string): 'todo' | 'doing' | 'review' | 'done' | 'blocked' {
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

export function parseTextLines(value?: string): string[] {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-*•\u2022]+/, '').trim())
    .filter(Boolean);
}

export function getTaskStatusLabel(status: ProjectLinkedTask['status']) {
  if (status === 'review') return 'Submitted';
  if (status === 'todo') return 'Todo';
  if (status === 'doing') return 'Doing';
  if (status === 'done') return 'Done';
  return 'Blocked';
}

export function getTaskStatusClasses(status: ProjectLinkedTask['status']) {
  if (status === 'done') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'review') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'doing') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (status === 'blocked') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-white text-slate-600';
}

export function getTaskKey(task: Pick<ProjectLinkedTask, 'projectTaskId' | 'spaceTaskId' | 'id'>) {
  return String(task.projectTaskId || task.spaceTaskId || task.id || '');
}
