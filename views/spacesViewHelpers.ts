import { API_BASE, getAuthHeaders } from '../config/api';
import { Goal, PlanningState } from '../types';

export type SpacesMode = 'employee' | 'manager';
export type BackendRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | string;
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskFilterMode = 'all' | 'me' | 'assigned';
export type CreatePanelTab = 'add-task' | 'top-priorities' | 'weekly-tasks';
export type WeeklyRangeFilter = 'this-week' | 'next-week' | 'two-weeks' | 'month';

export interface ProjectOption {
  id: string;
  name: string;
}

export interface EmployeeOption {
  empId: string;
  empName: string;
  role?: BackendRole;
}

export interface SpacesColumn {
  id: string;
  name: string;
}

export interface SpacesComment {
  id: string;
  text: string;
  fromEmpId?: string;
  fromName?: string;
  createdAt: string;
  editedAt?: string;
}

export interface SpacesTask {
  taskId: string;
  title: string;
  description?: string;
  documentUrl?: string;
  documentName?: string;
  documentMimeType?: string;
  projectId?: string;
  projectTaskId?: string;
  assigneeId?: string;
  assigneeName?: string;
  isViewed?: boolean;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  submittedFromStatus?: string;
  comments: SpacesComment[];
  customFields: Record<string, string>;
  createdByEmpId?: string;
  createdByName?: string;
  createdByRole?: BackendRole;
  createdAt: string;
  updatedAt: string;
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
  const role: BackendRole = emp.role || 'EMPLOYEE';
  return { id, name, role };
}

export function normalizeRole(role?: BackendRole): BackendRole {
  return (role || '').toUpperCase() as BackendRole;
}

export function isSubmittedStatus(status?: string): boolean {
  return String(status || '').trim().toLowerCase() === 'review';
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

export function normalizeTaskForUi(task: SpacesTask): SpacesTask {
  return {
    ...task,
    status: normalizeTaskStatus(task?.status),
    submittedFromStatus: task?.submittedFromStatus ? normalizeTaskStatus(task.submittedFromStatus) : task?.submittedFromStatus,
  };
}

export function getReviewerLabel(role?: BackendRole): string {
  const normalized = normalizeRole(role);
  if (normalized === 'SUPER_ADMIN' || normalized === 'ADMIN') return 'Admin';
  if (normalized === 'TEAM_LEAD') return 'Team Lead';
  return 'Reviewer';
}

export function getPriorityRowClass(priority?: TaskPriority): string {
  if (priority === 'high') return 'bg-red-100';
  if (priority === 'medium') return 'bg-red-50';
  return 'bg-green-100';
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

export function getDownloadableUrl(url: string): string {
  return String(url || '').trim();
}

export async function forceDownloadDocument(url: string, fileName?: string) {
  const href = getDownloadableUrl(url);
  if (!href) throw new Error('Document URL is missing');
  const query = new URLSearchParams({ url: href, name: fileName || 'task-document' });
  const response = await fetch(`${API_BASE}/spaces/tasks/document-download?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to download document');
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName || 'task-document';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export function getWeekBreadcrumb(state: PlanningState | undefined, weekId: string): string {
  if (!state) return 'Year > Q? > M? > Week';
  const week = state.weeklyGoals.find((w) => w.id === weekId);
  const month = week ? state.monthlyGoals.find((m) => m.id === week.parentId) : undefined;
  const quarter = month ? state.quarterlyGoals.find((q) => q.id === month.parentId) : undefined;
  const year = quarter ? state.yearlyGoals.find((y) => y.id === quarter.parentId) : undefined;
  return [year?.text || 'Year', quarter?.timeline || 'Q?', month?.timeline || 'M?', 'Week'].filter(Boolean).join(' > ');
}

export function getSundayStart(date: Date): Date {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  normalized.setDate(normalized.getDate() - normalized.getDay());
  return normalized;
}

export function getDayDisplay(startDate: Date, index: number) {
  const date = new Date(startDate);
  date.setDate(startDate.getDate() + index);
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: 'long' }),
    dateText: date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
  };
}

export function getWeekStartDate(week: Goal, days: Goal[], tasks: SpacesTask[], parseDateValue: (value?: string) => Date | null): Date {
  const fromTimeline = parseDateValue(String(week.timeline || '').trim());
  if (fromTimeline) return fromTimeline;
  const dayIds = new Set(days.map((d) => d.id));
  const earliestDue = tasks
    .filter((task) => dayIds.has(String(task?.customFields?.dailyGoalId || '').trim()))
    .map((task) => parseDateValue(task.dueDate))
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return earliestDue || new Date();
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

export function getTaskRowClassesForView(t: SpacesTask, me: { role?: BackendRole }, mode: SpacesMode): string {
  const highlight = getPriorityRowClass(t.priority);
  const base = 'border-b border-slate-100';
  const isLockedDoneRow = isTaskLockedForView(t, me, mode);
  if (highlight) return `${base} ${highlight}${isLockedDoneRow ? ' opacity-60' : ''}`;
  return `${base}${isLockedDoneRow ? ' opacity-60' : ' hover:bg-slate-50/50'}`;
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
  if (mode === 'employee') return t.createdByEmpId === me.id;
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

export async function createDaysForWeekHelper(params: {
  weekId: string;
  state?: PlanningState;
  updateState?: (updater: (prev: PlanningState) => PlanningState) => void;
  canManageWeeklyRows: boolean;
  saveGoalFn: (goal: Goal) => Promise<any>;
  setWeeklyError: (value: string) => void;
}) {
  const { weekId, state, updateState, canManageWeeklyRows, saveGoalFn, setWeeklyError } = params;
  if (!state || !updateState || !canManageWeeklyRows) return;
  const current = state.dailyGoals.filter((d) => d.parentId === weekId);
  if (current.length > 0) return;
  const generated = Array.from({ length: 7 }).map((_, idx) => ({
    id: `d-${weekId}-${idx + 1}`,
    text: `Day ${idx + 1}`,
    completed: false,
    level: 'day' as const,
    parentId: weekId,
  }));
  updateState((prev) => ({ ...prev, dailyGoals: [...prev.dailyGoals, ...generated] }));
  try {
    await Promise.all(generated.map((g) => saveGoalFn(g)));
  } catch (e) {
    console.error(e);
    setWeeklyError('Failed to persist generated days. Please try again.');
  }
}

export function toggleDailyHelper(params: {
  id: string;
  state?: PlanningState;
  updateState?: (updater: (prev: PlanningState) => PlanningState) => void;
  canManageWeeklyRows: boolean;
  saveGoalFn: (goal: Goal) => Promise<any>;
  setWeeklyError: (value: string) => void;
}) {
  const { id, state, updateState, canManageWeeklyRows, saveGoalFn, setWeeklyError } = params;
  if (!state || !updateState || !canManageWeeklyRows) return;
  let nextGoal: Goal | null = null;
  updateState((prev) => {
    const nextDaily = prev.dailyGoals.map((d) => {
      if (d.id !== id) return d;
      nextGoal = { ...d, completed: !d.completed };
      return nextGoal;
    });
    return { ...prev, dailyGoals: nextDaily };
  });
  if (nextGoal) {
    saveGoalFn(nextGoal).catch((e) => {
      console.error(e);
      setWeeklyError('Failed to save day progress. Please refresh and retry.');
    });
  }
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
