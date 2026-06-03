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
  vision?: string;
}

export interface EmployeeOption {
  empId: string;
  empName: string;
  avatar?: string;
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
  recurrence?: {
    enabled?: boolean;
    frequency?: 'secondly' | 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly' | '';
    interval?: number;
    maxOccurrences?: number;
    generatedCount?: number;
    nextRunAt?: string | null;
    endDate?: string | null;
    sourceTaskId?: string;
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    startMonth?: number | null;
    endMonth?: number | null;
  };
  emailChecklist?: {
    enabled?: boolean;
    reminderIntervalHours?: number;
    nextReminderAt?: string | null;
    lastSentAt?: string | null;
  };
  submittedFromStatus?: string;
  comments: SpacesComment[];
  customFields: Record<string, string>;
  createdByEmpId?: string;
  createdByName?: string;
  createdByRole?: BackendRole;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyTaskGroup {
  week: Goal;
  days: Goal[];
  month?: Goal;
  quarter?: Goal;
  year?: Goal;
  yearId: string;
  quarterId: string;
  monthId: string;
  weekId: string;
  yearLabel: string;
  quarterLabel: string;
  monthLabel: string;
  weekLabel: string;
  quarterNumber: number;
  calendarMonthNumber: number;
  calendarMonthName: string;
  yearWeekNumber: number;
  breadcrumbLabel: string;
  weekRangeLabel: string;
  weekSummaryLabel: string;
  weekStart: Date;
  weekEnd: Date;
  monthIndexInQuarter: number;
  weekIndexInMonth: number;
  isPlaceholderWeek?: boolean;
  weekSelectionKey: string;
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
  if (!state) return '';
  const week = state.weeklyGoals.find((w) => w.id === weekId);
  const month = week ? state.monthlyGoals.find((m) => m.id === week.parentId) : undefined;
  const quarter = month ? state.quarterlyGoals.find((q) => q.id === month.parentId) : undefined;
  const year = quarter ? state.yearlyGoals.find((y) => y.id === quarter.parentId) : undefined;
  const parts = [year?.text, quarter?.timeline, month?.timeline, week ? 'Week' : ''].filter(
    (value): value is string => !!String(value || '').trim(),
  );
  return parts.join(' > ');
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

function formatMonthDay(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function getQuarterNumber(quarterLabel?: string): number {
  const parsed = Number(String(quarterLabel || '').replace(/[^0-9]/g, ''));
  return parsed >= 1 && parsed <= 4 ? parsed : 1;
}

function getCalendarMonthNumberForQuarter(quarterLabel?: string, monthIndexInQuarter = 1): number {
  return ((getQuarterNumber(quarterLabel) - 1) * 3) + Math.min(Math.max(monthIndexInQuarter, 1), 3);
}

function getCalendarMonthDateRange(
  planningYear: number,
  quarterLabel?: string,
  monthIndexInQuarter = 1,
): { monthStart: Date; monthEnd: Date } {
  const monthNumber = getCalendarMonthNumberForQuarter(quarterLabel, monthIndexInQuarter);
  const monthStart = new Date(planningYear, Math.max(monthNumber - 1, 0), 1);
  const monthEnd = new Date(planningYear, monthStart.getMonth() + 1, 0);
  return { monthStart, monthEnd };
}

function getCalendarWeeksForMonthSlot(
  planningYear: number,
  quarterLabel?: string,
  monthIndexInQuarter = 1,
): Array<{ slotIndex: number; start: Date; end: Date; days: Date[] }> {
  const { monthStart, monthEnd } = getCalendarMonthDateRange(planningYear, quarterLabel, monthIndexInQuarter);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const totalCalendarCells = monthStart.getDay() + monthEnd.getDate();
  const weekCount = Math.max(1, Math.ceil(totalCalendarCells / 7));

  return Array.from({ length: weekCount }, (_, weekIndex) => {
    const weekGridStart = addDays(gridStart, weekIndex * 7);
    const weekGridEnd = addDays(weekGridStart, 6);
    const visibleStart = weekGridStart < monthStart ? monthStart : weekGridStart;
    const visibleEnd = weekGridEnd > monthEnd ? monthEnd : weekGridEnd;
    const dayCount = Math.max(
      1,
      Math.floor((visibleEnd.getTime() - visibleStart.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    );

    return {
      slotIndex: weekIndex + 1,
      start: visibleStart,
      end: visibleEnd,
      days: Array.from({ length: dayCount }, (_, dayIndex) => addDays(visibleStart, dayIndex)),
    };
  });
}

function getPlanningWeekNumber(date: Date, planningYear?: number): number {
  const year = planningYear || date.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const dayOffset = Math.floor((getSundayStart(date).getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000));
  return Math.floor((dayOffset + yearStart.getDay()) / 7) + 1;
}

function getCalendarWeekNumberForSlot(
  quarterLabel?: string,
  monthIndexInQuarter = 1,
  weekIndexInMonth = 1,
  planningYear?: number,
): number {
  const monthNumber = getCalendarMonthNumberForQuarter(quarterLabel, monthIndexInQuarter);
  const year = planningYear || new Date().getFullYear();
  const monthStart = new Date(year, Math.max(monthNumber - 1, 0), 1);
  const firstSunday = getSundayStart(monthStart);
  const slotStart = new Date(firstSunday);
  slotStart.setDate(firstSunday.getDate() + Math.max(weekIndexInMonth - 1, 0) * 7);
  return getPlanningWeekNumber(slotStart, year);
}

function getSiblingIndex(items: Goal[], currentId?: string): number {
  if (!currentId) return 1;
  const foundIndex = items.findIndex((item) => item.id === currentId);
  return foundIndex >= 0 ? foundIndex + 1 : 1;
}

function normalizeGoalForPersistence(goal: Goal): Goal {
  return {
    id: goal.id,
    text: goal.text || '',
    completed: !!goal.completed,
    level: goal.level,
    parentId: goal.parentId || '',
    details: goal.details || '',
    timeline: goal.timeline || '',
  };
}

export function buildWeeklyTaskGroups(
  state: PlanningState | undefined,
  tasks: SpacesTask[],
  parseDateValue: (value?: string) => Date | null,
): WeeklyTaskGroup[] {
  if (!state) return [];

  const years = state.yearlyGoals || [];
  const quarters = state.quarterlyGoals || [];
  const months = state.monthlyGoals || [];
  const weeks = state.weeklyGoals || [];
  const days = state.dailyGoals || [];
  const planningYear = Number(state.currentYear) || new Date().getFullYear();

  const quarterGroupsByYear = new Map<string, Goal[]>();
  quarters.forEach((quarter) => {
    const key = String(quarter.parentId || '__root__');
    const current = quarterGroupsByYear.get(key) || [];
    current.push(quarter);
    quarterGroupsByYear.set(key, current);
  });

  const monthGroupsByQuarter = new Map<string, Goal[]>();
  months.forEach((month) => {
    const key = String(month.parentId || '__root__');
    const current = monthGroupsByQuarter.get(key) || [];
    current.push(month);
    monthGroupsByQuarter.set(key, current);
  });

  const dayGroupsByWeek = new Map<string, Goal[]>();
  days.forEach((day) => {
    const key = String(day.parentId || '__root__');
    const current = dayGroupsByWeek.get(key) || [];
    current.push(day);
    dayGroupsByWeek.set(key, current);
  });

  const weekGroupsByMonth = new Map<string, Goal[]>();
  weeks.forEach((week) => {
    const key = String(week.parentId || '__root__');
    const current = weekGroupsByMonth.get(key) || [];
    current.push(week);
    weekGroupsByMonth.set(key, current);
  });

  const rawGroups = months.flatMap((month) => {
    const quarter = quarters.find((item) => item.id === month.parentId);
    const year = quarter ? years.find((item) => item.id === quarter.parentId) : undefined;
    const siblingQuarters = quarterGroupsByYear.get(String(year?.id || '__root__')) || [];
    const siblingMonths = monthGroupsByQuarter.get(String(quarter?.id || '__root__')) || [];
    const quarterIndex = getSiblingIndex(siblingQuarters, quarter?.id);
    const monthIndexInQuarter = getSiblingIndex(siblingMonths, month.id);
    const quarterLabel = String(quarter?.timeline || `Q${quarterIndex}`).trim() || `Q${quarterIndex}`;
    const monthCalendarWeeks = getCalendarWeeksForMonthSlot(planningYear, quarterLabel, monthIndexInQuarter);
    const realWeeks = (weekGroupsByMonth.get(month.id) || [])
      .slice()
      .sort((left, right) => {
        const leftTimeline = Number(String(left.timeline || '').replace(/[^0-9]/g, '')) || 0;
        const rightTimeline = Number(String(right.timeline || '').replace(/[^0-9]/g, '')) || 0;
        if (leftTimeline !== rightTimeline) return leftTimeline - rightTimeline;
        return left.id.localeCompare(right.id);
      });
    const slotCount = Math.max(monthCalendarWeeks.length, realWeeks.length || 0);

    return Array.from({ length: slotCount }, (_, slotIndex) => {
      const calendarWeek = monthCalendarWeeks[slotIndex];
      const realWeek = realWeeks[slotIndex];
      const weekStart = calendarWeek?.start || getSundayStart(getWeekStartDate(realWeek, dayGroupsByWeek.get(realWeek?.id || '') || [], tasks, parseDateValue));
      const weekEnd = calendarWeek?.end || addDays(weekStart, 6);
      const weekGoal =
        realWeek ||
        ({
          id: `${month.id}-w${slotIndex + 1}`,
          text: '',
          completed: false,
          level: 'week' as const,
          parentId: month.id,
          timeline: `W${slotIndex + 1}`,
          isPlaceholder: true,
        } as Goal & { isPlaceholder: true });
      const realDays = (dayGroupsByWeek.get(weekGoal.id) || [])
        .slice()
        .sort((left, right) => {
          const leftTimeline = Number(String(left.timeline || '').replace(/[^0-9]/g, '')) || 0;
          const rightTimeline = Number(String(right.timeline || '').replace(/[^0-9]/g, '')) || 0;
          if (leftTimeline !== rightTimeline) return leftTimeline - rightTimeline;
          return left.id.localeCompare(right.id);
        });
      const plannedDayCount = Math.max(calendarWeek?.days?.length || 0, realDays.length || 0, 1);
      const weekDays = Array.from({ length: plannedDayCount }, (_, dayIndex) => {
        const realDay = realDays[dayIndex];
        if (realDay) return realDay;
        return {
          id: `d-${weekGoal.id}-${dayIndex + 1}`,
          text: `Day ${dayIndex + 1}`,
          completed: false,
          level: 'day' as const,
          parentId: weekGoal.id,
          timeline: `D${dayIndex + 1}`,
          isPlaceholder: true,
        } as Goal & { isPlaceholder: true };
      });

      return {
        week: weekGoal,
        days: weekDays,
        month,
        quarter,
        year,
        weekStart,
        weekEnd,
        monthIndexInQuarter,
        weekIndexInMonth: slotIndex + 1,
        isPlaceholderWeek: !realWeek,
      };
    });
  });

  return rawGroups
    .map((group) => {
      const quarterIndex = getSiblingIndex(
        quarterGroupsByYear.get(String(group.year?.id || '__root__')) || [],
        group.quarter?.id,
      );
      const yearLabel = (group.year?.text || `Year ${new Date().getFullYear()}`).trim();
      const quarterLabel = String(group.quarter?.timeline || `Q${quarterIndex}`).trim() || `Q${quarterIndex}`;
      const quarterNumber = getQuarterNumber(quarterLabel);
      const calendarMonthNumber = getCalendarMonthNumberForQuarter(quarterLabel, group.monthIndexInQuarter);
      const calendarMonthName = new Date(planningYear, Math.max(calendarMonthNumber - 1, 0), 1).toLocaleDateString(undefined, { month: 'long' });
      const monthLabel = `M${calendarMonthNumber}`;
      const yearWeekNumber = group.weekStart
        ? getPlanningWeekNumber(group.weekStart, planningYear)
        : getCalendarWeekNumberForSlot(quarterLabel, group.monthIndexInQuarter, group.weekIndexInMonth, planningYear);
      const weekLabel = `W${yearWeekNumber}`;
      const weekRangeLabel = `${formatMonthDay(group.weekStart)} - ${formatMonthDay(group.weekEnd)}`;

      return {
        ...group,
        yearId: String(group.year?.id || `year-unlinked-${group.week.id}`),
        quarterId: String(group.quarter?.id || `quarter-unlinked-${group.week.id}`),
        monthId: String(group.month?.id || `month-unlinked-${group.week.id}`),
        weekId: group.week.id,
        yearLabel,
        quarterLabel,
        monthLabel,
        weekLabel,
        quarterNumber,
        calendarMonthNumber,
        calendarMonthName,
        yearWeekNumber,
        breadcrumbLabel: [yearLabel, quarterLabel, monthLabel, weekLabel].join(' > '),
        weekRangeLabel,
        weekSummaryLabel: `${quarterLabel} / ${monthLabel} / ${weekLabel}`,
        weekSelectionKey: [
          String(group.month?.id || `month-unlinked-${group.week.id}`),
          group.week.id,
          weekLabel,
          weekRangeLabel,
        ].join('::'),
      };
    })
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

export function buildWeeklyTaskCustomFields(day: Goal, weeklyGroup: WeeklyTaskGroup): Record<string, string> {
  const weekChainKey = [
    weeklyGroup.yearId,
    weeklyGroup.quarterId,
    weeklyGroup.monthId,
    weeklyGroup.weekId,
  ]
    .map((value) => String(value || '').trim())
    .join('::');
  const dayChainKey = [
    weeklyGroup.yearId,
    weeklyGroup.quarterId,
    weeklyGroup.monthId,
    weeklyGroup.weekId,
    day.id,
  ]
    .map((value) => String(value || '').trim())
    .join('::');

  return {
    dailyGoalId: day.id,
    weeklyGoalId: weeklyGroup.week.id,
    yearlyGoalId: weeklyGroup.yearId,
    quarterlyGoalId: weeklyGroup.quarterId,
    monthlyGoalId: weeklyGroup.monthId,
    dailyGoalText: day.text || '',
    weeklyGoalText: weeklyGroup.week.text || weeklyGroup.weekLabel || '',
    planningYearId: weeklyGroup.yearId,
    planningYearLabel: weeklyGroup.yearLabel,
    planningQuarterId: weeklyGroup.quarterId,
    planningQuarterLabel: weeklyGroup.quarterLabel,
    planningMonthId: weeklyGroup.monthId,
    planningMonthLabel: weeklyGroup.monthLabel,
    planningWeekId: weeklyGroup.weekId,
    planningWeekLabel: weeklyGroup.weekLabel,
    planningWeekRange: weeklyGroup.weekRangeLabel,
    planningBreadcrumb: weeklyGroup.breadcrumbLabel,
    weekChainKey,
    dayChainKey,
  };
}

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

export function getTaskRowClassesForView(t: SpacesTask, me: { role?: BackendRole }, mode: SpacesMode): string {
  const highlight = getPriorityRowClass(t.priority);
  const base = 'border-b border-slate-100 transition-colors';
  const isLockedDoneRow = isTaskLockedForView(t, me, mode);
  if (highlight) return `${base} ${highlight}${isLockedDoneRow ? ' opacity-60' : ' hover:bg-[#f7faff]'}`;
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

export async function ensureWeeklyGroupPersistedHelper(params: {
  weeklyGroup: WeeklyTaskGroup;
  state?: PlanningState;
  updateState?: (updater: (prev: PlanningState) => PlanningState) => void;
  saveGoalFn: (goal: Goal) => Promise<any>;
  setWeeklyError: (value: string) => void;
}) {
  const { weeklyGroup, state, updateState, saveGoalFn, setWeeklyError } = params;
  if (!state || !updateState) return null;

  const weekExists = state.weeklyGoals.some((goal) => goal.id === weeklyGroup.week.id);
  const missingDays = weeklyGroup.days.filter((day) => !state.dailyGoals.some((goal) => goal.id === day.id));

  if (weekExists && missingDays.length === 0) {
    return {
      week: weeklyGroup.week,
      days: weeklyGroup.days,
    };
  }

  const weekGoal = normalizeGoalForPersistence(weeklyGroup.week);
  const dayGoals = missingDays.map((day) => normalizeGoalForPersistence(day));

  updateState((prev) => ({
    ...prev,
    weeklyGoals: prev.weeklyGoals.some((goal) => goal.id === weekGoal.id) ? prev.weeklyGoals : [...prev.weeklyGoals, weekGoal],
    dailyGoals: [
      ...prev.dailyGoals,
      ...dayGoals.filter((day) => !prev.dailyGoals.some((goal) => goal.id === day.id)),
    ],
  }));

  try {
    await Promise.all([
      ...(weekExists ? [] : [saveGoalFn(weekGoal)]),
      ...dayGoals.map((day) => saveGoalFn(day)),
    ]);
    return {
      week: weekGoal,
      days: weeklyGroup.days.map((day) => dayGoals.find((item) => item.id === day.id) || day),
    };
  } catch (e) {
    console.error(e);
    setWeeklyError('Failed to prepare the selected week. Please try again.');
    return null;
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
