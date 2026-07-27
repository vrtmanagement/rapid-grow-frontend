import type {
  BackendRole,
  SpacesMode,
  SpacesTask,
  TaskPriority,
} from '../types/spaces';
import { getTaskAttachments } from './spacesAttachmentHelpers';
import { normalizeRole } from './spacesEmployeeHelpers';
import { isTaskLockedForView } from './spacesPermissionsHelpers';
import { normalizeTaskStatus } from './spacesTaskStatusHelpers';

export function normalizeTaskForUi(task: SpacesTask): SpacesTask {
  const documents = getTaskAttachments(task);
  const primary = documents[0];
  return {
    ...task,
    status: normalizeTaskStatus(task?.status),
    submittedFromStatus: task?.submittedFromStatus ? normalizeTaskStatus(task.submittedFromStatus) : task?.submittedFromStatus,
    documents,
    documentUrl: String(task?.documentUrl || primary?.url || '').trim(),
    documentName: String(task?.documentName || primary?.name || '').trim(),
    documentMimeType: String(task?.documentMimeType || primary?.mimeType || '').trim(),
  };
}

export function getRecurringSourceTaskId(task: SpacesTask): string {
  if (task.recurrence?.enabled) return task.taskId;
  const sourceTaskId = String(task.recurrence?.sourceTaskId || '').trim();
  if (!sourceTaskId || sourceTaskId === task.taskId) return '';
  return sourceTaskId;
}

export function isRecurringSeriesTask(task: SpacesTask): boolean {
  if (task.recurrence?.enabled) return true;
  const sourceTaskId = String(task.recurrence?.sourceTaskId || '').trim();
  return Boolean(sourceTaskId && sourceTaskId !== task.taskId);
}

export function isRecurringSeriesActive(tasks: SpacesTask[], task: SpacesTask): boolean {
  const sourceTaskId = getRecurringSourceTaskId(task);
  if (!sourceTaskId) return false;
  if (task.recurrence?.enabled) return true;
  const sourceTask = tasks.find((item) => item.taskId === sourceTaskId);
  return Boolean(sourceTask?.recurrence?.enabled);
}

export function getReviewerLabel(role?: BackendRole): string {
  const normalized = normalizeRole(role);
  if (normalized === 'SUPER_ADMIN' || normalized === 'ADMIN') return 'Admin';
  if (normalized === 'TEAM_LEAD') return 'Team Lead';
  return 'Reviewer';
}

export function getPriorityRowClass(priority?: TaskPriority): string {
  return 'bg-white';
}

export function getTaskRowClassesForView(t: SpacesTask, me: { role?: BackendRole }, mode: SpacesMode): string {
  const highlight = getPriorityRowClass(t.priority);
  const base = 'border-b border-slate-100 transition-colors';
  const isLockedDoneRow = isTaskLockedForView(t, me, mode);
  if (highlight) return `${base} ${highlight}${isLockedDoneRow ? ' opacity-60' : ' hover:bg-[#f7faff]'}`;
  return `${base}${isLockedDoneRow ? ' opacity-60' : ' hover:bg-slate-50/50'}`;
}

export function findScrollableContainer(node: HTMLElement | null): HTMLElement | Window {
  let current = node?.parentElement || null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && current.scrollHeight > current.clientHeight;
    if (isScrollable) return current;
    current = current.parentElement;
  }
  return window;
}

export function projectCharterPayloadFromBackendProject(proj: any, updatedTasks: any[]) {
  return {
    id: proj.clientProjectId,
    name: proj.name,
    status: proj.status,
    dateCreated: proj.dateCreated,
    businessCase: proj.businessCase,
    problemStatement: proj.problemStatement,
    goalStatement: proj.goalStatement,
    inScope: proj.inScope,
    outOfScope: proj.outOfScope,
    benefits: proj.benefits,
    champion: proj.champion,
    championRole: proj.championRole,
    lead: proj.lead,
    leadRole: proj.leadRole,
    smeList: proj.smeList || [],
    projectTeam: proj.projectTeam || [],
    phases: proj.phases || {},
    tasks: updatedTasks,
  };
}
