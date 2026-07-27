import type {
  BackendRole,
  SpacesTask,
} from '../types/spaces';

/** True when the task is owned by the viewer via assignee (or unassigned + created by them). */
export function buildEmployeeNameLookup(
  employees: Array<{ empId?: string; empName?: string; _id?: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  employees.forEach((employee) => {
    const empName = String(employee.empName || '').trim();
    if (!empName) return;
    const empId = String(employee.empId || '').trim();
    if (empId) map.set(empId, empName);
    const recordId = String(employee._id || '').trim();
    if (recordId) map.set(recordId, empName);
  });
  return map;
}

export function resolveEmployeeDisplayName(
  id?: string,
  cachedName?: string,
  nameById?: Map<string, string>,
): string {
  const trimmedName = String(cachedName || '').trim();
  if (trimmedName) return trimmedName;
  const key = String(id || '').trim();
  if (!key || !nameById) return '';
  return nameById.get(key) || '';
}

export function resolveAssigneeLabel(
  assigneeId?: string,
  assigneeName?: string,
  nameById?: Map<string, string>,
): string {
  const resolved = resolveEmployeeDisplayName(assigneeId, assigneeName, nameById);
  if (resolved) return resolved;
  const key = String(assigneeId || '').trim();
  if (!key) return 'Unassigned';
  return 'Unknown user';
}

export function enrichTasksWithEmployeeNames<T extends SpacesTask>(
  tasks: T[],
  nameById: Map<string, string>,
): T[] {
  if (!nameById.size) return tasks;
  return tasks.map((task) => {
    const assigneeName = resolveEmployeeDisplayName(task.assigneeId, task.assigneeName, nameById);
    const createdByName = resolveEmployeeDisplayName(
      task.createdByEmpId,
      task.createdByName,
      nameById,
    );
    if (assigneeName === task.assigneeName && createdByName === task.createdByName) {
      return task;
    }
    return {
      ...task,
      assigneeName: assigneeName || task.assigneeName,
      createdByName: createdByName || task.createdByName,
    };
  });
}

export function isTaskAssignedToViewer(task: SpacesTask, viewerId?: string): boolean {
  const viewer = String(viewerId || '').trim();
  if (!viewer) return false;
  const assignee = String(task.assigneeId || '').trim();
  if (assignee) return assignee === viewer;
  return String(task.createdByEmpId || '').trim() === viewer;
}

export function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getLoggedInEmployee() {
  const stored = safeJsonParse<any>(localStorage.getItem('rapidgrow-admin'));
  const emp = stored?.employee || {};
  const id = emp.empId || emp._id || '';
  const name = emp.empName || 'Employee';
  const avatar = String(emp.avatar || '').trim();
  const role: BackendRole = emp.role || 'EMPLOYEE';
  return { id, name, avatar, role };
}

export function normalizeRole(role?: BackendRole): BackendRole {
  return (role || '').toUpperCase() as BackendRole;
}

export function isSubmittedStatus(status?: string): boolean {
  return String(status || '').trim().toLowerCase() === 'review';
}
