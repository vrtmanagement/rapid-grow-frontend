import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from 'lucide-react';
import { COMMAND_MATRIX_TASK_LIMIT } from '../services/spacesApi';
import { fetchTabEndpoint, hasTabEndpointCache, readHydratedTabEndpoint } from '../services/tabSessionCache';
import { AttendanceSummaryResponse, getHoursColor } from '../components/attendance/attendanceUtils';

export interface Project {
  clientProjectId: string;
  name: string;
  status?: string;
  problemStatement?: string;
}

export type TrendDirection = 'up' | 'down' | 'stable';
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'blocked';

export interface RecentAttendanceDay {
  dateKey: string;
  label: string;
  shortDate: string;
  fullDate: string;
  minutes: number;
  hours: number;
  barHours: number;
  percentOfTarget: number;
  loginTime: string;
  logoutTime: string;
  isAbsent: boolean;
}

export interface PerformanceSnapshot {
  employeeId: string;
  name: string;
  weeklyScore: number;
  trend: TrendDirection;
  trendDelta: number;
  tasksAssigned: number;
  tasksCompleted: number;
  onTimePercentage: number;
  consistencyScore: number;
  qualityScore: number | null;
}

export interface TaskHubTask {
  taskId: string;
  title: string;
  assigneeId?: string;
  createdByEmpId?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  createdAt: string;
}

export interface CompletedTaskSnapshot extends TaskHubTask {
  completedOn: string;
}

export const ATTENDANCE_TARGET_MINUTES = 8 * 60;

export function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatHours(minutes: number) {
  return Math.round((minutes / 60) * 10) / 10;
}

export function formatAttendanceDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function formatAttendanceTime(value?: string | null) {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export function buildRecentAttendanceDays(summary: AttendanceSummaryResponse | null): RecentAttendanceDay[] {
  const detailsByDate = new Map<
    string,
    {
      minutes: number;
      loginTime: string;
      logoutTime: string;
    }
  >();
  (summary?.days || []).forEach((day) => {
    const sessions = [...(day.sessions || [])].sort(
      (left, right) => new Date(left.loginTime).getTime() - new Date(right.loginTime).getTime(),
    );
    const firstSession = sessions[0];
    const lastSession = sessions[sessions.length - 1];

    detailsByDate.set(String(day.date), {
      minutes: Number(day.minutes || 0),
      loginTime: formatAttendanceTime(firstSession?.loginTime),
      logoutTime: lastSession
        ? formatAttendanceTime(lastSession?.effectiveLogoutTime || lastSession?.logoutTime)
        : '--',
    });
  });

  return Array.from({ length: 5 }).map((_, index, source) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (source.length - 1 - index));

    const dateKey = formatLocalDateKey(date);
    const detail = detailsByDate.get(dateKey);
    const minutes = detail?.minutes || 0;
    const hours = formatHours(minutes);
    const isAbsent = !detail || minutes <= 0;

    return {
      dateKey,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: formatAttendanceDate(dateKey),
      minutes,
      hours,
      barHours: isAbsent ? 9 : hours,
      percentOfTarget: Math.min(100, Math.round((minutes / ATTENDANCE_TARGET_MINUTES) * 100)),
      loginTime: isAbsent ? 'Absent' : detail?.loginTime || '--',
      logoutTime: isAbsent ? 'Absent' : detail?.logoutTime || '--',
      isAbsent,
    };
  });
}

export function normalizeTaskStatus(status?: string): TaskStatus {
  const normalized = String(status || 'todo')
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

export function isActiveTodoTask(task: TaskHubTask, empId: string) {
  const belongsToEmployee =
    String(task.assigneeId || '').trim() === empId ||
    (!String(task.assigneeId || '').trim() && String(task.createdByEmpId || '').trim() === empId);
  const status = normalizeTaskStatus(task.status);
  return (
    belongsToEmployee &&
    status !== 'done' &&
    status !== 'review'
  );
}

export function sortTodoTasks(tasks: TaskHubTask[]) {
  return [...tasks].sort((left, right) => {
    const leftHasDueDate = !!left.dueDate;
    const rightHasDueDate = !!right.dueDate;
    if (leftHasDueDate !== rightHasDueDate) {
      return leftHasDueDate ? -1 : 1;
    }
    if (left.dueDate && right.dueDate) {
      return left.dueDate.localeCompare(right.dueDate);
    }
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function formatTaskDueDate(value?: string) {
  if (!value) return 'No due date';
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return 'No due date';
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTaskPriority(value?: string) {
  const normalized = String(value || 'medium').trim().toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'low') return 'Low';
  return 'Medium';
}

export function getTaskPriorityBadgeClass(value?: string) {
  const normalized = String(value || 'medium').trim().toLowerCase();
  if (normalized === 'high') return 'bg-red-50 text-brand-red';
  if (normalized === 'low') return 'bg-sky-50 text-sky-700';
  return 'bg-amber-50 text-amber-700';
}

export function getCommandMatrixTodoCardClasses(isCompleted: boolean, index: number) {
  if (isCompleted) {
    return 'border border-emerald-200 border-l-[3px] border-l-emerald-500 bg-emerald-50/80';
  }
  if (index % 2 === 0) {
    return 'border border-slate-200 border-l-[3px] border-l-brand-red bg-white hover:bg-[#f7faff]';
  }
  return 'border border-slate-300 border-l-[3px] border-l-slate-400 bg-white hover:bg-[#f7faff]';
}

export function roundMetric(value: number) {
  return Math.round(value * 10) / 10;
}

export function getAttendanceFillStyle(hours: number, isAbsent = false) {
  if (isAbsent) {
    return {
      background: 'linear-gradient(180deg, #CBD5E1 0%, #94A3B8 100%)',
    };
  }

  return {
    background: `linear-gradient(180deg, ${getHoursColor(hours)}CC 0%, ${getHoursColor(hours)} 100%)`,
  };
}

export function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY - radius * Math.sin(angleInRadians),
  };
}

export function getPerformanceGaugeTone(score: number) {
  if (score >= 75) {
    return {
      arc: '#22c55e',
      arcTrack: '#dcfce7',
      needleStart: '#86efac',
      needleEnd: '#16a34a',
      ring: '#22c55e',
      scoreClass: 'text-emerald-600',
    };
  }
  if (score >= 50) {
    return {
      arc: '#f97316',
      arcTrack: '#ffedd5',
      needleStart: '#fdba74',
      needleEnd: '#ea580c',
      ring: '#f97316',
      scoreClass: 'text-orange-600',
    };
  }
  return {
    arc: '#ef4444',
    arcTrack: '#fee2e2',
    needleStart: '#fda4af',
    needleEnd: '#dc2626',
    ring: '#ef4444',
    scoreClass: 'text-rose-600',
  };
}

export function getCompletedTaskStorageKey(empId: string) {
  return `rapidgrow:command-matrix:completed-high-priority:${empId}`;
}

export function readCompletedTaskSnapshots(empId: string, todayKey: string): CompletedTaskSnapshot[] {
  if (typeof window === 'undefined' || !empId) return [];

  try {
    const raw = window.localStorage.getItem(getCompletedTaskStorageKey(empId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.completedOn === todayKey);
  } catch {
    return [];
  }
}

export function writeCompletedTaskSnapshots(empId: string, tasks: CompletedTaskSnapshot[]) {
  if (typeof window === 'undefined' || !empId) return;

  try {
    window.localStorage.setItem(getCompletedTaskStorageKey(empId), JSON.stringify(tasks));
  } catch {
    // Ignore local storage failures and keep runtime state working.
  }
}

export function reconcileCompletedTaskSnapshots(
  completedTasks: CompletedTaskSnapshot[],
  activeTasks: TaskHubTask[],
  todayKey: string,
) {
  const activeTaskIds = new Set(activeTasks.map((task) => task.taskId));
  return completedTasks.filter(
    (task) => task.completedOn === todayKey && !activeTaskIds.has(task.taskId),
  );
}

export async function fetchAssignedProjects(empId: string): Promise<Project[]> {
  const data = await fetchTabEndpoint<unknown[]>('home', `/project-charters/assigned/${empId}?summary=1`);
  return Array.isArray(data) ? (data as Project[]) : [];
}

export const HOME_TAB = 'home';

export function getEmployeeDashboardPaths(empId: string) {
  return {
    projects: `/project-charters/assigned/${empId}?summary=1`,
    attendance: '/attendance/me?range=week',
    performance: '/performance/weekly',
    commandMatrix: `/spaces?scope=command-matrix&limit=${COMMAND_MATRIX_TASK_LIMIT}&sync=0`,
  };
}

export function isEmployeeDashboardCached(empId: string) {
  const paths = getEmployeeDashboardPaths(empId);
  return Object.values(paths).every((path) => hasTabEndpointCache(HOME_TAB, path));
}

export function parseDashboardInsights(
  empId: string,
  attendance: AttendanceSummaryResponse | null | undefined,
  performanceRows: unknown[] | undefined,
  spacesPayload: { tasks?: TaskHubTask[]; hasMore?: boolean; totalActive?: number } | undefined,
) {
  let attendanceDays = buildRecentAttendanceDays(attendance ?? null);

  let performance: PerformanceSnapshot | null = null;
  const rows = Array.isArray(performanceRows) ? performanceRows : [];
  const matched = rows.find(
    (row: any) => String(row?.employeeId || '').trim() === String(empId).trim(),
  );
  if (matched) {
    performance = {
      employeeId: String(matched.employeeId || ''),
      name: String(matched.name || ''),
      weeklyScore: Number(matched.weeklyScore || 0),
      trend: (String(matched.trend || 'stable').toLowerCase() as TrendDirection) || 'stable',
      trendDelta: Number(matched.trendDelta || 0),
      tasksAssigned: Number(matched.tasksAssigned || 0),
      tasksCompleted: Number(matched.tasksCompleted || 0),
      onTimePercentage: Number(matched.onTimePercentage || 0),
      consistencyScore: Number(matched.consistencyScore || 0),
      qualityScore:
        matched.qualityScore === null || matched.qualityScore === undefined
          ? null
          : Number(matched.qualityScore || 0),
    };
  }

  const tasks = Array.isArray(spacesPayload?.tasks) ? (spacesPayload.tasks as TaskHubTask[]) : [];
  const todoTasks = sortTodoTasks(tasks.filter((task) => isActiveTodoTask(task, empId)));

  return {
    attendanceDays,
    performance,
    todoTasks,
    hasMore: Boolean(spacesPayload?.hasMore),
    totalActive: Number(spacesPayload?.totalActive || todoTasks.length),
  };
}

export function readEmployeeDashboardFromCache(empId: string) {
  if (!isEmployeeDashboardCached(empId)) return null;

  const paths = getEmployeeDashboardPaths(empId);
  const projects = readHydratedTabEndpoint<Project[]>(HOME_TAB, paths.projects);
  const attendance = readHydratedTabEndpoint<AttendanceSummaryResponse | null>(HOME_TAB, paths.attendance);
  const performanceRows = readHydratedTabEndpoint<unknown[]>(HOME_TAB, paths.performance);
  const spaces = readHydratedTabEndpoint<{ tasks?: TaskHubTask[]; hasMore?: boolean; totalActive?: number }>(
    HOME_TAB,
    paths.commandMatrix,
  );

  return {
    projects: Array.isArray(projects) ? projects : [],
    ...parseDashboardInsights(empId, attendance, performanceRows, spaces),
  };
}

export async function fetchDashboardInsights(empId: string): Promise<{
  attendanceDays: RecentAttendanceDay[];
  performance: PerformanceSnapshot | null;
  todoTasks: TaskHubTask[];
  hasMore: boolean;
  totalActive: number;
}> {
  const paths = getEmployeeDashboardPaths(empId);
  const [attendance, performanceRows, spaces] = await Promise.all([
    fetchTabEndpoint<AttendanceSummaryResponse | null>(HOME_TAB, paths.attendance),
    fetchTabEndpoint<unknown[]>(HOME_TAB, paths.performance),
    fetchTabEndpoint<{ tasks?: TaskHubTask[]; hasMore?: boolean; totalActive?: number }>(
      HOME_TAB,
      paths.commandMatrix,
    ),
  ]);

  return parseDashboardInsights(empId, attendance, performanceRows, spaces);
}

export function getTrendMeta(trend: TrendDirection) {
  if (trend === 'up') {
    return {
      icon: ArrowUpRight,
      wrapperClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      deltaPrefix: '+',
      label: 'Improving',
    };
  }
  if (trend === 'down') {
    return {
      icon: ArrowDownRight,
      wrapperClass: 'border-rose-200 bg-rose-50 text-rose-700',
      deltaPrefix: '',
      label: 'Cooling',
    };
  }
  return {
    icon: Minus,
    wrapperClass: 'border-slate-200 bg-slate-100 text-slate-600',
    deltaPrefix: '',
    label: 'Stable',
  };
}
