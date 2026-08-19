import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Gauge,
  LayoutDashboard,
  ListTodo,
} from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config/api';
import { COMMAND_MATRIX_TASK_LIMIT } from '../services/spacesApi';
import { fetchTabEndpoint } from '../services/tabSessionCache';
import { PageHeaderSkeleton, ProjectCardGridSkeleton } from '../components/ui/Skeleton';
import ExecutionMatrix from '../components/dashboard/ExecutionMatrix';
import { usePermissions } from '../context/usePermissions';
import { getSocket } from '../realtime/socket';
import type { UIConfig } from '../types';
import { DEFAULT_UI_CONFIG } from '../appSeedConstants';
import {
  type Project,
  type PerformanceSnapshot,
  type TaskHubTask,
  type CompletedTaskSnapshot,
  type RecentAttendanceDay,
  buildRecentAttendanceDays,
  formatLocalDateKey,
  normalizeTaskStatus,
  isActiveTodoTask,
  sortTodoTasks,
  formatTaskDueDate,
  formatTaskPriority,
  getTaskPriorityBadgeClass,
  getCommandMatrixTodoCardClasses,
  roundMetric,
  getAttendanceFillStyle,
  polarToCartesian,
  getPerformanceGaugeTone,
  readCompletedTaskSnapshots,
  writeCompletedTaskSnapshots,
  reconcileCompletedTaskSnapshots,
  fetchAssignedProjects,
  HOME_TAB,
  getEmployeeDashboardPaths,
  isEmployeeDashboardCached,
  readEmployeeDashboardFromCache,
  fetchDashboardInsights,
  getTrendMeta,
} from './employeeDashboardHelpers';

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
  const [pendingCompletedTasks, setPendingCompletedTasks] = useState<
    Record<string, { task: CompletedTaskSnapshot; index: number }>
  >({});
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [currentDayKey, setCurrentDayKey] = useState(() => formatLocalDateKey(new Date()));
  const completionTimeoutsRef = useRef<Record<string, number>>({});
  const { hasPermission } = usePermissions();
  const canViewExecutionMatrix = hasPermission('EXECUTION_MATRIX_VIEW');

  useEffect(() => {
    return () => {
      Object.values(completionTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
      completionTimeoutsRef.current = {};
    };
  }, []);

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

    const applyDashboardData = (
      assignedProjects: Project[],
      insights: Awaited<ReturnType<typeof fetchDashboardInsights>>,
    ) => {
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
    };

    const cachedBundle = readEmployeeDashboardFromCache(empId);
    if (cachedBundle) {
      applyDashboardData(cachedBundle.projects, cachedBundle);
      setLoading(false);
      setWidgetsLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      setWidgetsLoading(true);
      try {
        const [assignedProjects, insights] = await Promise.all([
          fetchAssignedProjects(empId).catch(() => []),
          fetchDashboardInsights(empId),
        ]);

        if (!active) return;
        applyDashboardData(assignedProjects, insights);
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

  const handleCompleteTask = async (taskId: string, index: number) => {
    if (!empId || completingTaskId) return;

    const taskToComplete = todoTasks.find((task) => task.taskId === taskId);
    if (!taskToComplete) return;

    setCompletingTaskId(taskId);
    if (completionTimeoutsRef.current[taskId]) {
      window.clearTimeout(completionTimeoutsRef.current[taskId]);
      delete completionTimeoutsRef.current[taskId];
    }
    const pendingCompletedTask = { ...taskToComplete, status: 'review', completedOn: currentDayKey };
    setPendingCompletedTasks((prev) => ({
      ...prev,
      [taskId]: {
        task: pendingCompletedTask,
        index,
      },
    }));
    setCompletedTodayTasks((prev) => {
      const next = prev.filter((task) => task.taskId !== taskId);
      return [...next, pendingCompletedTask];
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

      completionTimeoutsRef.current[taskId] = window.setTimeout(() => {
        setPendingCompletedTasks((prev) => {
          if (!prev[taskId]) return prev;
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        delete completionTimeoutsRef.current[taskId];
      }, 1000);

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
      setPendingCompletedTasks((prev) => {
        if (!prev[taskId]) return prev;
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
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
  const pendingCompletedIds = useMemo(
    () => new Set(Object.keys(pendingCompletedTasks)),
    [pendingCompletedTasks],
  );
  const todoListTasks = useMemo(() => {
    const activeTasks = todoTasks.filter(
      (task) => !completedTodayIds.has(task.taskId) && !pendingCompletedIds.has(task.taskId),
    );
    const mergedTasks = [...activeTasks];
    const activeTaskIds = new Set(activeTasks.map((task) => task.taskId));

    Object.values(pendingCompletedTasks).forEach(({ task, index }) => {
      if (activeTaskIds.has(task.taskId)) return;
      const insertAt = Math.min(Math.max(index, 0), mergedTasks.length);
      mergedTasks.splice(insertAt, 0, task);
    });

    return mergedTasks;
  }, [completedTodayIds, pendingCompletedIds, pendingCompletedTasks, todoTasks]);

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
        {loading && projects.length === 0 ? (
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

      {loading && projects.length === 0 ? (
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

              {widgetsLoading && attendanceDays.every((day) => !day.minutes) ? (
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

              {widgetsLoading && !performance ? (
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

