import { API_BASE, getAuthHeaders } from '../config/api';
import type {
  BackendRole,
  EmployeeOption,
  SpacesColumn,
  SpacesMode,
  SpacesTask,
} from '../types/spaces';
import { isSubmittedStatus, normalizeRole } from './spacesEmployeeHelpers';

const ADMIN_CREATOR_ROLES = new Set<BackendRole>(['SUPER_ADMIN', 'ADMIN']);

/** Hide admin-created TaskHub rows from team leads / employees (still show if assigned to them). */
export function shouldHideAdminTaskFromViewer(
  task: SpacesTask,
  me: { id?: string; role?: BackendRole },
  employeeById: Map<string, EmployeeOption>,
  teamMemberIds?: Set<string>,
): boolean {
  const viewerRole = normalizeRole(me.role);
  if (viewerRole === 'SUPER_ADMIN' || viewerRole === 'ADMIN') return false;

  const createdRole = (task.createdByRole || '').toUpperCase() as BackendRole;
  if (!ADMIN_CREATOR_ROLES.has(createdRole)) return false;

  const assigneeId = String(task.assigneeId || '').trim();
  if (!assigneeId) return true;

  const assigneeRole = normalizeRole(employeeById.get(assigneeId)?.role || 'EMPLOYEE');
  if (assigneeRole === 'SUPER_ADMIN' || assigneeRole === 'ADMIN') return true;

  if (viewerRole === 'EMPLOYEE') {
    return assigneeId !== me.id;
  }

  if (viewerRole === 'TEAM_LEAD') {
    const allowed = new Set(teamMemberIds || []);
    if (me.id) allowed.add(me.id);
    return !allowed.has(assigneeId);
  }

  return true;
}

export function isTaskLockedForView(t: SpacesTask, me: { role?: BackendRole }, mode: SpacesMode): boolean {
  const role = (me.role || '').toUpperCase() as BackendRole;
  const createdRole = (t.createdByRole || '').toUpperCase() as BackendRole;
  if (mode === 'employee') return t.status === 'done';
  if (role === 'TEAM_LEAD' && t.status === 'done' && (createdRole === 'ADMIN' || createdRole === 'SUPER_ADMIN')) {
    return true;
  }
  return false;
}

export function canEditTaskForView(t: SpacesTask, me: { id?: string; role?: BackendRole }, mode: SpacesMode): boolean {
  const role = (me.role || '').toUpperCase() as BackendRole;
  if (mode === 'employee') return t.createdByEmpId === me.id;
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
  if (role === 'TEAM_LEAD') {
    if (t.createdByEmpId === me.id) return true;
    const createdRole = (t.createdByRole || '').toUpperCase();
    return createdRole === 'TEAM_LEAD' || createdRole === 'EMPLOYEE';
  }
  return false;
}

export function canDeleteTaskForView(t: SpacesTask, me: { id?: string; role?: BackendRole }, mode: SpacesMode): boolean {
  const role = (me.role || '').toUpperCase() as BackendRole;
  if (mode === 'employee') {
    return t.createdByEmpId === me.id || t.assigneeId === me.id;
  }
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
  if (role === 'TEAM_LEAD') {
    if (t.createdByEmpId === me.id) return true;
    const createdRole = (t.createdByRole || '').toUpperCase();
    return createdRole === 'TEAM_LEAD' || createdRole === 'EMPLOYEE';
  }
  return false;
}

export function canValidateTaskForView(
  t: SpacesTask,
  mode: SpacesMode,
  me: { id?: string; role?: BackendRole },
  employeeById: Map<string, EmployeeOption>,
): boolean {
  if (mode !== 'manager' || !isSubmittedStatus(t.status)) return false;
  const viewerRole = normalizeRole(me.role);
  if (viewerRole === 'SUPER_ADMIN' || viewerRole === 'ADMIN') return true;
  if (viewerRole === 'TEAM_LEAD') {
    const assigneeRole = normalizeRole(employeeById.get(t.assigneeId || '')?.role || (t.assigneeId === me.id ? me.role : 'EMPLOYEE'));
    return assigneeRole === 'EMPLOYEE';
  }
  return false;
}

export function canCommentOnTaskForView(
  t: SpacesTask,
  mode: SpacesMode,
  me: { id?: string },
  canEditTask: (task: SpacesTask) => boolean,
  canValidateTask: (task: SpacesTask) => boolean,
): boolean {
  if (mode === 'employee') return t.assigneeId === me.id || t.createdByEmpId === me.id;
  return canEditTask(t) || canValidateTask(t);
}

export function canEditDueDateForView(
  t: SpacesTask,
  isTaskLocked: (task: SpacesTask) => boolean,
  canEditTask: (task: SpacesTask) => boolean,
): boolean {
  if (isTaskLocked(t)) return false;
  return canEditTask(t);
}

export function canChangeStatusForView(
  t: SpacesTask,
  mode: SpacesMode,
  me: { id?: string; role?: BackendRole },
  isTaskLocked: (task: SpacesTask) => boolean,
  canEditTask: (task: SpacesTask) => boolean,
): boolean {
  if (isTaskLocked(t)) return false;
  if (mode === 'employee') return t.assigneeId === me.id || t.createdByEmpId === me.id;
  if ((me.role || '').toUpperCase() === 'TEAM_LEAD') return t.assigneeId === me.id || canEditTask(t);
  return canEditTask(t);
}

export function upsertTaskByIdHelper(prev: SpacesTask[], incoming: SpacesTask): SpacesTask[] {
  if (!incoming?.taskId) return prev;
  const idx = prev.findIndex((t) => t.taskId === incoming.taskId);
  if (idx === -1) return [incoming, ...prev];
  const next = [...prev];
  next[idx] = incoming;
  return next;
}

export function assigneeOptionsForTaskHelper(
  assignableEmployees: EmployeeOption[],
  employeeById: Map<string, EmployeeOption>,
  currentAssigneeId?: string,
): EmployeeOption[] {
  const map = new Map<string, EmployeeOption>();
  assignableEmployees.forEach((emp) => map.set(emp.empId, emp));
  const currentId = (currentAssigneeId || '').trim();
  if (currentId && !map.has(currentId)) {
    const currentEmp = employeeById.get(currentId);
    map.set(currentId, currentEmp || { empId: currentId, empName: '', role: 'EMPLOYEE' });
  }
  return Array.from(map.values());
}

export async function handleAddColumnHelper(params: {
  setError: (value: string | null) => void;
  setColumns: (cols: SpacesColumn[]) => void;
}) {
  const { setError, setColumns } = params;
  const name = window.prompt('New field name');
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  setError(null);
  try {
    const res = await fetch(`${API_BASE}/spaces/columns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to add field');
    setColumns(Array.isArray(data.columns) ? data.columns : []);
  } catch (e: any) {
    setError(e?.message || 'Failed to add field');
  }
}
