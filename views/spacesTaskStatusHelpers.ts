import type {
  BackendRole,
  EmployeeOption,
  SpacesTask,
  TaskPriority,
  TaskStatus,
} from '../types/spaces';
import { isTaskAssignedToViewer, normalizeRole } from './spacesEmployeeHelpers';
import { shouldHideAdminTaskFromViewer } from './spacesPermissionsHelpers';

export { isSubmittedStatus } from './spacesEmployeeHelpers';

/** Task Hub table: pending first, then submitted (review), then done. */
export function getTaskHubStatusSortRank(status?: string): number {
  const normalized = normalizeTaskStatus(status);
  if (normalized === 'review') return 1;
  if (normalized === 'done') return 2;
  return 0;
}

export function normalizeTaskStatus(status?: string): TaskStatus {
  const normalized = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['todo', 'to_do', 'pending', 'open'].includes(normalized)) return 'todo';
  if (['doing', 'in_progress', 'progress', 'ongoing'].includes(normalized)) return 'doing';
  if (['review', 'submitted', 'submit', 'for_review'].includes(normalized)) return 'review';
  if (['done', 'completed', 'complete', 'closed'].includes(normalized)) return 'done';
  if (['blocked', 'on_hold', 'hold'].includes(normalized)) return 'blocked';
  return 'todo';
}

/** Matches TaskHub sidebar "Top Priorities" (up to 6 active items per assignee). */
export const TASKHUB_TOP_PRIORITY_LIMIT = 6;

/** Command matrix / dashboard task strips — avoid loading unbounded lists. */
export const COMMAND_MATRIX_DISPLAY_LIMIT = 25;

const TOP_PRIORITY_NEARBY_FUTURE_DAYS = 7;

const TOP_PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTopPriorityDueDate(value?: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function isTopPriorityWorkComplete(status?: string) {
  const normalized = normalizeTaskStatus(status);
  return normalized === 'done' || normalized === 'review';
}

function isNearbyTopPriorityDueDate(dueDate?: string, todayValue = getLocalDateKey()) {
  const due = parseTopPriorityDueDate(String(dueDate || '').trim());
  if (!due) return false;
  const today = parseTopPriorityDueDate(todayValue);
  if (!today) return false;
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 0) return true;
  return diffDays <= TOP_PRIORITY_NEARBY_FUTURE_DAYS;
}

export function compareTopPriorityTasks(left: SpacesTask, right: SpacesTask, todayValue = getLocalDateKey()) {
  const leftCompleted = left.status === 'review';
  const rightCompleted = right.status === 'review';
  if (leftCompleted !== rightCompleted) return leftCompleted ? 1 : -1;

  const leftDueDate = String(left.dueDate || '').trim();
  const rightDueDate = String(right.dueDate || '').trim();
  const leftIsToday = Boolean(todayValue && leftDueDate === todayValue);
  const rightIsToday = Boolean(todayValue && rightDueDate === todayValue);
  if (leftIsToday !== rightIsToday) return leftIsToday ? -1 : 1;

  const priorityDiff = TOP_PRIORITY_RANK[left.priority] - TOP_PRIORITY_RANK[right.priority];
  if (priorityDiff !== 0) return priorityDiff;

  const leftDue = parseTopPriorityDueDate(leftDueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
  const rightDue = parseTopPriorityDueDate(rightDueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
  if (leftDue !== rightDue) return leftDue - rightDue;

  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

/** Same selection rules as TaskHub → Top Priorities for one assignee. */
export function buildTopPriorityTasksForAssignee(
  tasks: SpacesTask[],
  assigneeId: string,
  limit = TASKHUB_TOP_PRIORITY_LIMIT,
): SpacesTask[] {
  const assignee = String(assigneeId || '').trim();
  if (!assignee) return [];

  const todayValue = getLocalDateKey();
  const assigneeTasks = tasks.filter((task) => {
    if (String(task.assigneeId || '').trim() !== assignee) return false;
    if (!String(task.title || '').trim()) return false;
    return true;
  });

  const incomplete = assigneeTasks.filter((task) => !isTopPriorityWorkComplete(task.status));
  const nearbyIncomplete = incomplete.filter((task) => isNearbyTopPriorityDueDate(task.dueDate, todayValue));
  const otherIncomplete = incomplete.filter((task) => !isNearbyTopPriorityDueDate(task.dueDate, todayValue));

  const hasNearbyDueTasks = assigneeTasks.some((task) => isNearbyTopPriorityDueDate(task.dueDate, todayValue));
  const allNearbyDueWorkComplete =
    hasNearbyDueTasks &&
    assigneeTasks
      .filter((task) => isNearbyTopPriorityDueDate(task.dueDate, todayValue))
      .every((task) => isTopPriorityWorkComplete(task.status));

  const candidates = allNearbyDueWorkComplete ? incomplete : [...nearbyIncomplete, ...otherIncomplete];

  return [...candidates]
    .sort((left, right) => compareTopPriorityTasks(left, right, todayValue))
    .slice(0, limit);
}

export function buildCommandMatrixTopPriorityTasks(options: {
  tasks: SpacesTask[];
  viewerEmpId: string;
  viewerRole: BackendRole;
  employees: EmployeeOption[];
  teamMemberEmpIds: Set<string>;
  employeeById: Map<string, EmployeeOption>;
  viewScope?: 'individual' | 'team';
}): SpacesTask[] {
  const {
    tasks,
    viewerEmpId,
    viewerRole,
    employees,
    teamMemberEmpIds,
    employeeById,
    viewScope = 'team',
  } = options;
  const role = normalizeRole(viewerRole);
  const viewer = { id: viewerEmpId, role };
  const todayValue = getLocalDateKey();
  const seenTaskIds = new Set<string>();
  const merged: SpacesTask[] = [];

  const pushUnique = (items: SpacesTask[]) => {
    items.forEach((task) => {
      if (!task?.taskId || seenTaskIds.has(task.taskId)) return;
      seenTaskIds.add(task.taskId);
      merged.push(task);
    });
  };

  const visiblePool = tasks.filter((task) => {
    const assigneeId = String(task.assigneeId || '').trim();
    if (!assigneeId) return false;
    if (role === 'TEAM_LEAD') {
      if (!teamMemberEmpIds.has(assigneeId)) return false;
      return !shouldHideAdminTaskFromViewer(task, viewer, employeeById, teamMemberEmpIds);
    }
    return true;
  });

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    const assigneeIds = new Set<string>();
    employees.forEach((employee) => {
      const memberRole = normalizeRole(employee.role || 'EMPLOYEE');
      if (memberRole === 'TEAM_LEAD' || memberRole === 'EMPLOYEE') {
        assigneeIds.add(employee.empId);
      }
    });
    visiblePool.forEach((task) => {
      const assigneeId = String(task.assigneeId || '').trim();
      if (assigneeId) assigneeIds.add(assigneeId);
    });

    Array.from(assigneeIds).forEach((assigneeId) => {
      pushUnique(buildTopPriorityTasksForAssignee(visiblePool, assigneeId));
    });
  } else if (role === 'TEAM_LEAD') {
    Array.from(teamMemberEmpIds).forEach((assigneeId) => {
      pushUnique(buildTopPriorityTasksForAssignee(visiblePool, assigneeId));
    });
  } else if (viewerEmpId) {
    const pool = visiblePool.filter((task) => isTaskAssignedToViewer(task, viewerEmpId));
    pushUnique(buildTopPriorityTasksForAssignee(pool, viewerEmpId));
  }

  return merged.sort((left, right) => compareTopPriorityTasks(left, right, todayValue));
}
