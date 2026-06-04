import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCheck,
  ChevronRight,
  Clock3,
  Gauge,
  LayoutDashboard,
  ListTodo,
  Minus,
} from 'lucide-react';
import { API_BASE, apiGetJson } from '../config/api';
import {
  COMMAND_MATRIX_TASK_LIMIT,
  fetchCommandMatrixTasks,
} from '../services/spacesApi';
import { peekApiCache } from '../services/apiCache';
import { PageHeaderSkeleton, ProjectCardGridSkeleton } from '../components/ui/Skeleton';
import ExecutionMatrix from '../components/dashboard/ExecutionMatrix';
import { usePermissions } from '../context/usePermissions';
import { getSocket } from '../realtime/socket';
import { AttendanceSummaryResponse, getHoursColor } from '../components/attendance/attendanceUtils';
import type { UIConfig } from '../types';
import { DEFAULT_UI_CONFIG } from '../appSeedConstants';

interface Project {
  clientProjectId: string;
  name: string;
  status?: string;
  problemStatement?: string;
}

type TrendDirection = 'up' | 'down' | 'stable';
type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'blocked';

interface RecentAttendanceDay {
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

interface PerformanceSnapshot {
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

interface TaskHubTask {
  taskId: string;
  title: string;
  assigneeId?: string;
  createdByEmpId?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  createdAt: string;
}

interface CompletedTaskSnapshot extends TaskHubTask {
  completedOn: string;
}

const ATTENDANCE_TARGET_MINUTES = 8 * 60;

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHours(minutes: number) {
  return Math.round((minutes / 60) * 10) / 10;
}

function formatAttendanceDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatAttendanceTime(value?: string | null) {
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

function buildRecentAttendanceDays(summary: AttendanceSummaryResponse | null): RecentAttendanceDay[] {
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

function normalizeTaskStatus(status?: string): TaskStatus {
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

function isActiveTodoTask(task: TaskHubTask, empId: string) {
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

function sortTodoTasks(tasks: TaskHubTask[]) {
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

function formatTaskDueDate(value?: string) {
  if (!value) return 'No due date';
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return 'No due date';
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTaskPriority(value?: string) {
  const normalized = String(value || 'medium').trim().toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'low') return 'Low';
  return 'Medium';
}

function getTaskPriorityBadgeClass(value?: string) {
  const normalized = String(value || 'medium').trim().toLowerCase();
  if (normalized === 'high') return 'bg-red-50 text-brand-red';
  if (normalized === 'low') return 'bg-sky-50 text-sky-700';
  return 'bg-amber-50 text-amber-700';
}

function roundMetric(value: number) {
  return Math.round(value * 10) / 10;
}

function getAttendanceFillStyle(hours: number, isAbsent = false) {
  if (isAbsent) {
    return {
      background: 'linear-gradient(180deg, #CBD5E1 0%, #94A3B8 100%)',
    };
  }

  return {
    background: `linear-gradient(180deg, ${getHoursColor(hours)}CC 0%, ${getHoursColor(hours)} 100%)`,
  };
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY - radius * Math.sin(angleInRadians),
  };
}

function getPerformanceGaugeTone(score: number) {
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

function getCompletedTaskStorageKey(empId: string) {
  return `rapidgrow:command-matrix:completed-high-priority:${empId}`;
}

function readCompletedTaskSnapshots(empId: string, todayKey: string): CompletedTaskSnapshot[] {
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

function writeCompletedTaskSnapshots(empId: string, tasks: CompletedTaskSnapshot[]) {
  if (typeof window === 'undefined' || !empId) return;

  try {
    window.localStorage.setItem(getCompletedTaskStorageKey(empId), JSON.stringify(tasks));
  } catch {
    // Ignore local storage failures and keep runtime state working.
  }
}

function reconcileCompletedTaskSnapshots(
  completedTasks: CompletedTaskSnapshot[],
  activeTasks: TaskHubTask[],
  todayKey: string,
) {
  const activeTaskIds = new Set(activeTasks.map((task) => task.taskId));
  return completedTasks.filter(
    (task) => task.completedOn === todayKey && !activeTaskIds.has(task.taskId),
  );
}

async function fetchAssignedProjects(empId: string): Promise<Project[]> {
  const data = await apiGetJson<unknown[]>(`/project-charters/assigned/${empId}`);
  return Array.isArray(data) ? (data as Project[]) : [];
}

async function fetchDashboardInsights(empId: string): Promise<{
  attendanceDays: RecentAttendanceDay[];
  performance: PerformanceSnapshot | null;
  todoTasks: TaskHubTask[];
}> {
  const [attendanceResult, performanceResult, spacesResult] = await Promise.allSettled([
    apiGetJson<AttendanceSummaryResponse | null>('/attendance/me?range=week'),
    apiGetJson<unknown[]>('/performance/weekly'),
    fetchCommandMatrixTasks(COMMAND_MATRIX_TASK_LIMIT),
  ]);

  let attendanceDays = buildRecentAttendanceDays(null);
  if (attendanceResult.status === 'fulfilled') {
    attendanceDays = buildRecentAttendanceDays(attendanceResult.value);
  }

  let performance: PerformanceSnapshot | null = null;
  if (performanceResult.status === 'fulfilled') {
    const rows = Array.isArray(performanceResult.value) ? performanceResult.value : [];
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
  }

  let todoTasks: TaskHubTask[] = [];
  let hasMore = false;
  let totalActive = 0;
  if (spacesResult.status === 'fulfilled') {
    const tasks = Array.isArray(spacesResult.value?.tasks) ? (spacesResult.value.tasks as TaskHubTask[]) : [];
    todoTasks = sortTodoTasks(tasks.filter((task) => isActiveTodoTask(task, empId)));
    hasMore = Boolean(spacesResult.value?.hasMore);
    totalActive = Number(spacesResult.value?.totalActive || todoTasks.length);
  }

  return {
    attendanceDays,
    performance,
    todoTasks,
    hasMore,
    totalActive,
  };
}

function getTrendMeta(trend: TrendDirection) {
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

interface EmployeeDashboardProps {
  uiConfig?: UIConfig;
}

const EmployeeDashboardView: React.FC<EmployeeDashboardProps> = ({ uiConfig = DEFAULT_UI_CONFIG }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [widgetsLoading, setWidgetsLoading] = useState(true);
  const [empId, setEmpId] = useState<string | null>(null);
  const [attendanceDays, setAttendanceDays] = useState<RecentAttendanceDay[]>(() =>
    buildRecentAttendanceDays(null),
  );
  const [hoveredAttendanceDay, setHoveredAttendanceDay] = useState<string | null>(null);
  const [performance, setPerformance] = useState<PerformanceSnapshot | null>(null);
  const [todoTasks, setTodoTasks] = useState<TaskHubTask[]>([]);
  const [todoTasksHasMore, setTodoTasksHasMore] = useState(false);
  const [todoTasksTotalActive, setTodoTasksTotalActive] = useState(0);
  const [completedTodayTasks, setCompletedTodayTasks] = useState<CompletedTaskSnapshot[]>([]);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [currentDayKey, setCurrentDayKey] = useState(() => formatLocalDateKey(new Date()));
  const { hasPermission } = usePermissions();
  const canViewExecutionMatrix = hasPermission('EXECUTION_MATRIX_VIEW');

  useEffect(() => {
    const scheduleNextDayBoundary = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const timeoutMs = nextMidnight.getTime() - now.getTime();

      return window.setTimeout(() => {
        setCurrentDayKey(formatLocalDateKey(new Date()));
      }, timeoutMs);
    };

    const timer = scheduleNextDayBoundary();
    return () => window.clearTimeout(timer);
  }, [currentDayKey]);

  useEffect(() => {
    const stored = localStorage.getItem('rapidgrow-admin');
    if (!stored) {
      setLoading(false);
      setWidgetsLoading(false);
      return;
    }

    try {
      const { employee } = JSON.parse(stored);
      const id = String(employee?.empId || '').trim();
      if (id) {
        setEmpId(id);
      } else {
        setLoading(false);
        setWidgetsLoading(false);
      }
    } catch {
      setLoading(false);
      setWidgetsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!empId) return;
    let active = true;

    const load = async () => {
      const hasCachedDashboard =
        !!peekApiCache(`${API_BASE}/project-charters/assigned/${empId}`) &&
        !!peekApiCache(`${API_BASE}/attendance/me?range=week`) &&
        !!peekApiCache(`${API_BASE}/performance/weekly`) &&
        !!peekApiCache(`${API_BASE}/spaces?scope=command-matrix&limit=${COMMAND_MATRIX_TASK_LIMIT}&sync=0`);
      if (!hasCachedDashboard) {
        setLoading(true);
        setWidgetsLoading(true);
      }
      try {
        const [assignedProjects, insights] = await Promise.all([
          fetchAssignedProjects(empId).catch(() => []),
          fetchDashboardInsights(empId),
        ]);

        if (!active) return;
        setProjects(assignedProjects);
        setAttendanceDays(insights.attendanceDays);
        setPerformance(insights.performance);
        setTodoTasks(insights.todoTasks);
        setTodoTasksHasMore(insights.hasMore);
        setTodoTasksTotalActive(insights.totalActive);
        setCompletedTodayTasks(
          reconcileCompletedTaskSnapshots(
            readCompletedTaskSnapshots(empId, currentDayKey),
            insights.todoTasks,
            currentDayKey,
          ),
        );
      } catch (error) {
        console.error('Failed to load command matrix insights', error);
      } finally {
        if (active) {
          setLoading(false);
          setWidgetsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [currentDayKey, empId]);

  useEffect(() => {
    if (!empId) return;
    setCompletedTodayTasks(readCompletedTaskSnapshots(empId, currentDayKey));
  }, [currentDayKey, empId]);

  useEffect(() => {
    if (!empId) return;
    writeCompletedTaskSnapshots(
      empId,
      completedTodayTasks.filter((task) => task.completedOn === currentDayKey),
    );
  }, [completedTodayTasks, currentDayKey, empId]);

  useEffect(() => {
    if (!empId) return;

    const socket = getSocket();
    let refreshTimer: number | null = null;
    const refresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(async () => {
        refreshTimer = null;
        try {
          const insights = await fetchDashboardInsights(empId);
          setAttendanceDays(insights.attendanceDays);
          setPerformance(insights.performance);
          setTodoTasks(insights.todoTasks);
          setTodoTasksHasMore(insights.hasMore);
          setTodoTasksTotalActive(insights.totalActive);
          setCompletedTodayTasks((prev) =>
            reconcileCompletedTaskSnapshots(prev, insights.todoTasks, currentDayKey),
          );
        } catch (error) {
          console.error('Failed to refresh command matrix insights', error);
        }
      }, 400);
    };

    socket.on('spaces:changed', refresh);
    socket.on('performance:update', refresh);
    socket.on('task:validation', refresh);
    socket.on('taskAssigned', refresh);

    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      socket.off('spaces:changed', refresh);
      socket.off('performance:update', refresh);
      socket.off('task:validation', refresh);
      socket.off('taskAssigned', refresh);
    };
  }, [currentDayKey, empId]);

  const handleCompleteTask = async (taskId: string) => {
    if (!empId || completingTaskId) return;

    const taskToComplete = todoTasks.find((task) => task.taskId === taskId);
    if (!taskToComplete) return;

    setCompletingTaskId(taskId);
    setCompletedTodayTasks((prev) => {
      const next = prev.filter((task) => task.taskId !== taskId);
      return [...next, { ...taskToComplete, status: 'done', completedOn: currentDayKey }];
    });
    setTodoTasks((prev) => prev.filter((task) => task.taskId !== taskId));

    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'done' }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || 'Failed to update task');
      }

      const insights = await fetchDashboardInsights(empId);
      setAttendanceDays(insights.attendanceDays);
      setPerformance(insights.performance);
      setTodoTasks(insights.todoTasks);
      setTodoTasksHasMore(insights.hasMore);
      setTodoTasksTotalActive(insights.totalActive);
      setCompletedTodayTasks((prev) =>
        reconcileCompletedTaskSnapshots(prev, insights.todoTasks, currentDayKey),
      );
    } catch (error) {
      console.error('Failed to complete task from command matrix', error);
      setCompletedTodayTasks((prev) => prev.filter((task) => task.taskId !== taskId));
      setTodoTasks((prev) => sortTodoTasks([...prev, taskToComplete]));
    } finally {
      setCompletingTaskId(null);
    }
  };

  const recentAttendanceHours = useMemo(
    () => roundMetric(attendanceDays.reduce((sum, day) => sum + day.minutes, 0) / 60),
    [attendanceDays],
  );
  const recentAttendanceAverage = useMemo(
    () =>
      attendanceDays.length
        ? roundMetric(attendanceDays.reduce((sum, day) => sum + day.minutes, 0) / attendanceDays.length / 60)
        : 0,
    [attendanceDays],
  );
  const attendanceChartTop = useMemo(() => {
    const highestHours = Math.max(...attendanceDays.map((day) => day.hours), 0);
    return Math.max(16, Math.ceil(highestHours / 2) * 2);
  }, [attendanceDays]);
  const attendanceTicks = useMemo(
    () => Array.from({ length: 5 }, (_, index) => Math.round((attendanceChartTop / 4) * index)),
    [attendanceChartTop],
  );
  const completionRate = useMemo(() => {
    if (!performance || performance.tasksAssigned === 0) return 0;
    return Math.round((performance.tasksCompleted / performance.tasksAssigned) * 100);
  }, [performance]);
  const completedTodayIds = useMemo(
    () => new Set(completedTodayTasks.map((task) => task.taskId)),
    [completedTodayTasks],
  );
  const todoListTasks = useMemo(() => {
    const activeTasks = todoTasks.filter((task) => !completedTodayIds.has(task.taskId));
    return [...activeTasks, ...completedTodayTasks];
  }, [completedTodayIds, completedTodayTasks, todoTasks]);

  if (!empId && !loading) return null;

  const performanceScore = Math.max(0, Math.min(100, Math.round(performance?.weeklyScore || 0)));
  const performanceNeedleAngle = 180 - performanceScore * 1.8;
  const performanceNeedleTip = polarToCartesian(120, 122, 58, performanceNeedleAngle);
  const performanceGaugeTone = getPerformanceGaugeTone(performanceScore);
  const trendMeta = getTrendMeta(performance?.trend || 'stable');
  const TrendIcon = trendMeta.icon;

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div>
        {loading ? (
          <PageHeaderSkeleton />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-8 bg-brand-red rounded-full" />
              <span className="text-[15px] text-slate-500">Your workspace</span>
            </div>
            <h2 className="text-4xl text-slate-900 leading-none">{uiConfig.dashboardTitle}</h2>
            <p className="text-slate-500 text-lg mt-3">{uiConfig.dashboardSub}</p>
            <p className="text-slate-400 text-sm mt-2">
              Project charters you are assigned to as Champion, Lead, or Team Member
            </p>
          </>
        )}
      </div>

      {loading ? (
        <ProjectCardGridSkeleton count={3} />
      ) : (
        <>
          {projects.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 border border-slate-200 shadow-sm text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <LayoutDashboard className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700">No Projects Assigned</h3>
              <p className="text-slate-500 mt-2">
                You have not been assigned to any projects yet. Contact your admin to get assigned.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project) => (
                <Link
                  key={project.clientProjectId}
                  to={`/project/${project.clientProjectId}`}
                  className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-red/30 hover:-translate-y-1 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:bg-brand-red transition-colors">
                      <LayoutDashboard className="w-7 h-7 text-white" />
                    </div>
                    <span className="px-4 py-2 bg-slate-100 text-slate-700 text-[13px] font-semibold rounded-full">
                      {project.status || 'draft'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 group-hover:text-brand-red transition-colors mb-2">
                    {project.name}
                  </h3>
                  <p className="text-slate-500 text-sm line-clamp-2">
                    {project.problemStatement || 'View full project details by clicking this card.'}
                  </p>
                  <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-2 text-brand-red text-sm font-semibold">
                    View details
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="space-y-8">
            <div className="self-start bg-white rounded-[2rem] border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-brand-red">
                      <ListTodo size={18} />
                    </div>
                    <div>
                      <h3 className="text-[20px] leading-none text-slate-900">To do List</h3>
                      <p className="mt-1 text-[13px] text-slate-500">All active TaskHub items sorted by nearest due date</p>
                    </div>
                  </div>
                </div>
                <Link
                  to="/spaces"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:border-brand-red/20 hover:text-brand-red"
                >
                  Open TaskHub
                  <ChevronRight size={14} />
                </Link>
              </div>

              {widgetsLoading ? (
                <div className="mt-5 space-y-2.5 animate-pulse">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`todo-skeleton-${index}`}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-3.5"
                    >
                      <div className="h-5 w-5 rounded-md bg-slate-200" />
                      <div className="min-w-0 flex-1">
                        <div className="h-4 w-40 rounded-full bg-slate-200" />
                        <div className="mt-2 h-3 w-24 rounded-full bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : todoListTasks.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 px-5 py-10 text-center">
                  <CheckCheck className="mx-auto h-10 w-10 text-emerald-500" />
                  <p className="mt-4 text-base font-semibold text-slate-700">No active tasks</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Your TaskHub to-do list is clear right now.
                  </p>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {todoListTasks.map((task) => {
                    const isCompletedToday = completedTodayIds.has(task.taskId);
                    return (
                    <label
                      key={task.taskId}
                      className={`inline-flex max-w-full items-start gap-3 rounded-2xl border px-3.5 py-3 transition ${
                        isCompletedToday
                          ? 'border-emerald-100 bg-emerald-50/60'
                          : 'cursor-pointer border-slate-100 bg-slate-50/80 hover:border-brand-red/20 hover:bg-white'
                      }`}
                      style={{ width: 'fit-content' }}
                    >
                      <input
                        type="checkbox"
                        checked={isCompletedToday}
                        disabled={isCompletedToday || completingTaskId === task.taskId}
                        onChange={() => void handleCompleteTask(task.taskId)}
                        className="mt-1 h-5 w-5 rounded border-slate-300 text-brand-red focus:ring-brand-red"
                      />
                      <div className="min-w-0 max-w-[min(100%,34rem)]">
                        <div className="flex items-start justify-between gap-3">
                          <p
                            className={`line-clamp-2 text-[14px] font-semibold ${
                              isCompletedToday
                                ? 'text-slate-500 underline decoration-slate-400 decoration-2 underline-offset-4'
                                : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                              isCompletedToday
                                ? 'bg-emerald-100 text-emerald-700'
                                : getTaskPriorityBadgeClass(task.priority)
                            }`}
                          >
                            {isCompletedToday ? 'Done' : formatTaskPriority(task.priority)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-[12px] text-slate-500">
                          <Clock3 size={13} />
                          <span>
                            {isCompletedToday ? 'Completed for today' : formatTaskDueDate(task.dueDate)}
                          </span>
                        </div>
                      </div>
                    </label>
                    );
                  })}
                  {todoTasksHasMore ? (
                    <p className="mt-4 w-full text-center text-sm text-slate-500">
                      You have {todoTasksTotalActive} active tasks. Showing the first {COMMAND_MATRIX_TASK_LIMIT}.{' '}
                      <Link to="/spaces" className="font-semibold text-brand-red hover:underline">
                        Open TaskHub
                      </Link>{' '}
                      to see everything.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <Clock3 size={18} />
                    </div>
                    <div>
                      <h3 className="text-[20px] leading-none text-slate-900">Hours Spent</h3>
                      <p className="mt-1 text-[13px] text-slate-500">Attendance for the last five days</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Live attendance
                </div>
              </div>

              {widgetsLoading ? (
                <div className="mt-5 animate-pulse">
                  <div className="grid h-[188px] grid-cols-5 gap-3 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={`attendance-skeleton-${index}`} className="flex flex-col items-center justify-end gap-2">
                        <div className="h-full w-full rounded-[18px] bg-slate-200" />
                        <div className="h-4 w-10 rounded-full bg-slate-200" />
                        <div className="h-3 w-12 rounded-full bg-slate-100" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Attendance Trend
                        </p>
                        <p className="mt-1 text-[13px] text-slate-500">
                          Total {recentAttendanceHours}h • Average {recentAttendanceAverage}h
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Last 5 Days
                        </p>
                        <p className="mt-1 text-[22px] leading-none font-semibold text-slate-900">
                          {recentAttendanceHours}h
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="relative h-[168px] pl-8 pr-2">
                        {attendanceTicks.map((value) => {
                          const offset = attendanceChartTop === 0 ? 0 : (value / attendanceChartTop) * 100;
                          return (
                            <div
                              key={`attendance-grid-${value}`}
                              className="absolute inset-x-0 border-t border-dashed border-slate-200"
                              style={{ bottom: `${offset}%` }}
                            >
                              <span className="absolute -left-8 -translate-y-1/2 text-[11px] font-medium text-slate-400">
                                {value}
                              </span>
                            </div>
                          );
                        })}

                        <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-between gap-4">
                          {attendanceDays.map((day) => {
                            const barHeight =
                              day.barHours <= 0 ? 0 : Math.max(12, (day.barHours / attendanceChartTop) * 100);
                            const isHovered = hoveredAttendanceDay === day.dateKey;
                            return (
                              <div
                                key={day.dateKey}
                                className="relative flex h-full flex-1 items-end justify-center"
                                onMouseEnter={() => setHoveredAttendanceDay(day.dateKey)}
                                onMouseLeave={() => setHoveredAttendanceDay((current) => (current === day.dateKey ? null : current))}
                              >
                                {isHovered && (
                                  <div className="absolute left-1/2 top-4 z-10 w-[160px] -translate-x-1/2 rounded-[16px] border border-slate-200 bg-white px-3.5 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                                    <p className="text-[12px] font-semibold text-slate-900">{day.fullDate}</p>
                                    <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                                      <div className="flex items-center justify-between gap-3">
                                        <span>Hours</span>
                                        <span className="font-semibold text-slate-900">{day.hours.toFixed(1)}h</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3">
                                        <span>Login time</span>
                                        <span className="font-semibold text-slate-900">{day.loginTime}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3">
                                        <span>Logout time</span>
                                        <span className="font-semibold text-slate-900">{day.logoutTime}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <div className="flex h-full w-full items-end justify-center">
                                  <div
                                    className="w-full max-w-[40px] rounded-t-[12px] transition-all duration-500"
                                    style={{
                                      ...getAttendanceFillStyle(day.hours, day.isAbsent),
                                      height: `${barHeight}%`,
                                      minHeight: day.barHours > 0 ? '12px' : '2px',
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-3 ml-8 grid grid-cols-5 gap-4">
                        {attendanceDays.map((day) => (
                          <div key={`attendance-label-${day.dateKey}`} className="text-center leading-tight">
                            <p className="text-[13px] font-semibold text-slate-800">{day.label}</p>
                            <p className="mt-1 text-[11px] text-slate-400">{day.shortDate}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-end gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {'>= 8h'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        {'7.5-8h'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {'< 7.5h'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="self-start bg-white rounded-[2rem] border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[18px] bg-slate-900 text-white">
                      <Gauge size={17} />
                    </div>
                    <div>
                      <h3 className="text-[18px] leading-none text-slate-900">Performance</h3>
                      <p className="mt-1 text-[12px] text-slate-500">Your live score for this week</p>
                    </div>
                  </div>
                </div>
              </div>

              {widgetsLoading ? (
                <div className="mt-4 flex animate-pulse flex-col items-center">
                  <div className="h-32 w-32 rounded-full bg-slate-100" />
                  <div className="mt-3 h-4 w-24 rounded-full bg-slate-200" />
                  <div className="mt-2 h-4 w-40 rounded-full bg-slate-100" />
                </div>
              ) : !performance ? (
                <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-8 text-center">
                  <Activity className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-[15px] font-semibold text-slate-700">No performance data yet</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Your weekly score will appear here once TaskHub activity is available.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex flex-col items-center">
                    <svg
                      className="h-[132px] w-[220px]"
                      viewBox="0 0 240 140"
                      role="img"
                      aria-label={`Performance score ${performanceScore}`}
                    >
                      <defs>
                        <linearGradient id="performanceNeedleGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={performanceGaugeTone.needleStart} stopOpacity="0.18" />
                          <stop offset="70%" stopColor={performanceGaugeTone.needleStart} stopOpacity="0.48" />
                          <stop offset="100%" stopColor={performanceGaugeTone.needleEnd} stopOpacity="0.96" />
                        </linearGradient>
                      </defs>

                      <path
                        d="M 32 122 A 88 88 0 0 1 208 122"
                        fill="none"
                        pathLength="100"
                        stroke={performanceGaugeTone.arcTrack}
                        strokeWidth="14"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 32 122 A 88 88 0 0 1 208 122"
                        fill="none"
                        pathLength="100"
                        stroke={performanceGaugeTone.arc}
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={`${performanceScore} 100`}
                      />

                      {Array.from({ length: 11 }).map((_, index) => {
                        const angle = 180 - index * 18;
                        const inner = polarToCartesian(120, 122, 64, angle);
                        const outer = polarToCartesian(120, 122, 72, angle);
                        return (
                          <line
                            key={`performance-tick-${index}`}
                            x1={inner.x}
                            y1={inner.y}
                            x2={outer.x}
                            y2={outer.y}
                            stroke="#d5d9e2"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        );
                      })}

                      <line
                        x1="120"
                        y1="122"
                        x2={performanceNeedleTip.x}
                        y2={performanceNeedleTip.y}
                        stroke="url(#performanceNeedleGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <circle cx="120" cy="122" r="14" fill="#ffffff" stroke={performanceGaugeTone.ring} strokeWidth="6" />
                      <circle cx="120" cy="122" r="5" fill="#ffffff" />
                    </svg>
                    <div className="mt-1 text-center">
                      <p className={`text-[24px] font-semibold leading-none ${performanceGaugeTone.scoreClass}`}>
                        {performanceScore}
                      </p>
                      <p className="mt-1 text-[12px] text-slate-500">{trendMeta.label}</p>
                    </div>
                  </div>

                  <div className="mt-3.5 grid grid-cols-2 gap-1.5">
                    <div className="rounded-[18px] border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Completion
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-none text-slate-900">{completionRate}%</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {performance.tasksCompleted}/{performance.tasksAssigned} tasks
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        On Time
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-none text-slate-900">
                        {Math.round(performance.onTimePercentage)}%
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">Delivery reliability</p>
                    </div>
                    <div className="rounded-[18px] border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Consistency
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-none text-slate-900">
                        {Math.round(performance.consistencyScore)}%
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">Weekly activity rhythm</p>
                    </div>
                    <div className="rounded-[18px] border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Quality
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-none text-slate-900">
                        {performance.qualityScore === null ? '--' : `${Math.round(performance.qualityScore)}%`}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">Review score</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          </div>

          {canViewExecutionMatrix && (
            <div className="bg-white p-12 rounded-[2rem] shadow-2xl border border-slate-200 relative overflow-visible">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-2xl text-slate-900">Execution Matrix</h3>
                  <p className="text-[15px] text-slate-800 mt-1">Real-Time Performance Throughput</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></div>
                  <span className="text-[15px] text-slate-600">Live Feed Active</span>
                </div>
              </div>
              <ExecutionMatrix />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeDashboardView;
