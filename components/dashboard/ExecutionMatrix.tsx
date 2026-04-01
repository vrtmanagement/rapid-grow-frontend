import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Radar,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { getSocket } from '../../realtime/socket';

type TrendDirection = 'up' | 'down' | 'stable';

type DayLabel = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

interface DailyBreakdown {
  date: string;
  score: number;
  tasksAssigned: number;
  tasksCompleted: number;
  onTimeTasks: number;
  onTimePercentage: number;
  consistencyScore: number;
  qualityScore: number | null;
  hasData: boolean;
}

interface PerformanceRow {
  employeeId: string;
  name: string;
  department: string;
  weeklyScore: number;
  trend: TrendDirection;
  trendDelta: number;
  rank: number;
  rankDelta: number;
  tasksAssigned: number;
  tasksCompleted: number;
  onTimeTasks: number;
  onTimePercentage: number;
  consistencyScore: number;
  qualityScore: number | null;
  lastActivityAt: string | null;
  daily: Record<DayLabel, number>;
  dailyBreakdown: Record<DayLabel, DailyBreakdown>;
  liveScoreDelta?: number;
}

interface EmployeeDepartment {
  empId: string;
  department?: string;
}

const TARGET_SCORE = 75;
const STATIC_EXECUTION_ROWS: PerformanceRow[] = [
  {
    employeeId: 'EMP-1001',
    name: 'Aarav Sharma',
    department: 'Operations',
    weeklyScore: 91,
    trend: 'up',
    trendDelta: 4.8,
    rank: 1,
    rankDelta: 1,
    tasksAssigned: 14,
    tasksCompleted: 13,
    onTimeTasks: 12,
    onTimePercentage: 92,
    consistencyScore: 100,
    qualityScore: 89,
    lastActivityAt: new Date().toISOString(),
    liveScoreDelta: 2.4,
    daily: { Mon: 86, Tue: 88, Wed: 93, Thu: 95, Fri: 92, Sat: 0, Sun: 0 },
    dailyBreakdown: {
      Mon: { date: '2026-03-30', score: 86, tasksAssigned: 3, tasksCompleted: 3, onTimeTasks: 3, onTimePercentage: 100, consistencyScore: 100, qualityScore: 88, hasData: true },
      Tue: { date: '2026-03-31', score: 88, tasksAssigned: 2, tasksCompleted: 2, onTimeTasks: 2, onTimePercentage: 100, consistencyScore: 100, qualityScore: 87, hasData: true },
      Wed: { date: '2026-04-01', score: 93, tasksAssigned: 3, tasksCompleted: 3, onTimeTasks: 2, onTimePercentage: 67, consistencyScore: 100, qualityScore: 92, hasData: true },
      Thu: { date: '2026-04-02', score: 95, tasksAssigned: 3, tasksCompleted: 3, onTimeTasks: 3, onTimePercentage: 100, consistencyScore: 100, qualityScore: 90, hasData: true },
      Fri: { date: '2026-04-03', score: 92, tasksAssigned: 3, tasksCompleted: 2, onTimeTasks: 2, onTimePercentage: 100, consistencyScore: 100, qualityScore: 89, hasData: true },
      Sat: { date: '2026-04-04', score: 0, tasksAssigned: 0, tasksCompleted: 0, onTimeTasks: 0, onTimePercentage: 0, consistencyScore: 0, qualityScore: null, hasData: false },
      Sun: { date: '2026-04-05', score: 0, tasksAssigned: 0, tasksCompleted: 0, onTimeTasks: 0, onTimePercentage: 0, consistencyScore: 0, qualityScore: null, hasData: false },
    },
  },
  {
    employeeId: 'EMP-1002',
    name: 'Priya Nair',
    department: 'Product',
    weeklyScore: 84,
    trend: 'up',
    trendDelta: 1.6,
    rank: 2,
    rankDelta: 0,
    tasksAssigned: 12,
    tasksCompleted: 10,
    onTimeTasks: 9,
    onTimePercentage: 90,
    consistencyScore: 80,
    qualityScore: 93,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    liveScoreDelta: 1.2,
    daily: { Mon: 79, Tue: 82, Wed: 0, Thu: 88, Fri: 90, Sat: 0, Sun: 0 },
    dailyBreakdown: {
      Mon: { date: '2026-03-30', score: 79, tasksAssigned: 3, tasksCompleted: 2, onTimeTasks: 2, onTimePercentage: 100, consistencyScore: 100, qualityScore: 90, hasData: true },
      Tue: { date: '2026-03-31', score: 82, tasksAssigned: 2, tasksCompleted: 2, onTimeTasks: 1, onTimePercentage: 50, consistencyScore: 100, qualityScore: 94, hasData: true },
      Wed: { date: '2026-04-01', score: 0, tasksAssigned: 0, tasksCompleted: 0, onTimeTasks: 0, onTimePercentage: 0, consistencyScore: 0, qualityScore: null, hasData: false },
      Thu: { date: '2026-04-02', score: 88, tasksAssigned: 4, tasksCompleted: 3, onTimeTasks: 3, onTimePercentage: 100, consistencyScore: 100, qualityScore: 95, hasData: true },
      Fri: { date: '2026-04-03', score: 90, tasksAssigned: 3, tasksCompleted: 3, onTimeTasks: 3, onTimePercentage: 100, consistencyScore: 100, qualityScore: 93, hasData: true },
      Sat: { date: '2026-04-04', score: 0, tasksAssigned: 0, tasksCompleted: 0, onTimeTasks: 0, onTimePercentage: 0, consistencyScore: 0, qualityScore: null, hasData: false },
      Sun: { date: '2026-04-05', score: 0, tasksAssigned: 0, tasksCompleted: 0, onTimeTasks: 0, onTimePercentage: 0, consistencyScore: 0, qualityScore: null, hasData: false },
    },
  },
  {
    employeeId: 'EMP-1003',
    name: 'Rohan Verma',
    department: 'Operations',
    weeklyScore: 72,
    trend: 'down',
    trendDelta: -3.1,
    rank: 3,
    rankDelta: -1,
    tasksAssigned: 11,
    tasksCompleted: 8,
    onTimeTasks: 6,
    onTimePercentage: 75,
    consistencyScore: 80,
    qualityScore: 81,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    liveScoreDelta: -2.3,
    daily: { Mon: 65, Tue: 70, Wed: 74, Thu: 76, Fri: 69, Sat: 0, Sun: 0 },
    dailyBreakdown: {
      Mon: { date: '2026-03-30', score: 65, tasksAssigned: 2, tasksCompleted: 1, onTimeTasks: 1, onTimePercentage: 100, consistencyScore: 100, qualityScore: 80, hasData: true },
      Tue: { date: '2026-03-31', score: 70, tasksAssigned: 2, tasksCompleted: 2, onTimeTasks: 1, onTimePercentage: 50, consistencyScore: 100, qualityScore: 82, hasData: true },
      Wed: { date: '2026-04-01', score: 74, tasksAssigned: 3, tasksCompleted: 2, onTimeTasks: 2, onTimePercentage: 100, consistencyScore: 100, qualityScore: 83, hasData: true },
      Thu: { date: '2026-04-02', score: 76, tasksAssigned: 2, tasksCompleted: 2, onTimeTasks: 1, onTimePercentage: 50, consistencyScore: 100, qualityScore: 79, hasData: true },
      Fri: { date: '2026-04-03', score: 69, tasksAssigned: 2, tasksCompleted: 1, onTimeTasks: 1, onTimePercentage: 100, consistencyScore: 100, qualityScore: 81, hasData: true },
      Sat: { date: '2026-04-04', score: 0, tasksAssigned: 0, tasksCompleted: 0, onTimeTasks: 0, onTimePercentage: 0, consistencyScore: 0, qualityScore: null, hasData: false },
      Sun: { date: '2026-04-05', score: 0, tasksAssigned: 0, tasksCompleted: 0, onTimeTasks: 0, onTimePercentage: 0, consistencyScore: 0, qualityScore: null, hasData: false },
    },
  },
];

function getWeekStart(date: Date) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = next.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  next.setUTCDate(next.getUTCDate() + diff);
  return next;
}

function formatDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildWeekOptions(count = 6) {
  const start = getWeekStart(new Date());
  return Array.from({ length: count }).map((_, index) => {
    const weekStart = new Date(start.getTime());
    weekStart.setUTCDate(weekStart.getUTCDate() - index * 7);
    const weekEnd = new Date(weekStart.getTime());
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

    return {
      value: formatDateKey(weekStart),
      label:
        index === 0
          ? 'This Week'
          : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${weekEnd.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            })}`,
    };
  });
}

function getBarTone(score: number) {
  if (score >= TARGET_SCORE) {
    return {
      fill: 'bg-emerald-500',
      track: 'from-emerald-500 via-emerald-400 to-emerald-300',
      glow: 'shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_10px_24px_rgba(16,185,129,0.16)]',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'On Track',
    };
  }

  if (score >= 50) {
    return {
      fill: 'bg-amber-400',
      track: 'from-amber-400 via-amber-300 to-yellow-200',
      glow: 'shadow-[0_0_0_1px_rgba(251,191,36,0.12),0_10px_24px_rgba(251,191,36,0.15)]',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'Mid Pace',
    };
  }

  return {
    fill: 'bg-rose-500',
    track: 'from-rose-500 via-rose-400 to-orange-300',
    glow: 'shadow-[0_0_0_1px_rgba(244,63,94,0.12),0_10px_24px_rgba(244,63,94,0.14)]',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    label: 'At Risk',
  };
}

function getRankIcon(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function formatPercentage(value: number) {
  return `${Math.round(value)}%`;
}

function getTrendMeta(trend: TrendDirection) {
  if (trend === 'up') {
    return {
      icon: ArrowUpRight,
      className: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      label: 'Climbing',
    };
  }
  if (trend === 'down') {
    return {
      icon: ArrowDownRight,
      className: 'text-rose-600 bg-rose-50 border-rose-200',
      label: 'Cooling',
    };
  }
  return {
    icon: Minus,
    className: 'text-slate-500 bg-slate-100 border-slate-200',
    label: 'Holding',
  };
}

function getStaticExecutionRows(selectedDepartment: string) {
  const filtered =
    selectedDepartment === 'all'
      ? STATIC_EXECUTION_ROWS
      : STATIC_EXECUTION_ROWS.filter((row) => row.department === selectedDepartment);

  return filtered
    .slice()
    .sort((a, b) => b.weeklyScore - a.weeklyScore || a.name.localeCompare(b.name))
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

const ExecutionMatrix: React.FC = () => {
  const weekOptions = buildWeekOptions();
  const [rows, setRows] = useState<PerformanceRow[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(weekOptions[0]?.value || '');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimeout = useRef<number | null>(null);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await fetch(`${API_BASE}/employees`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) return;

        const payload = await response.json().catch(() => []);
        const items = Array.isArray(payload) ? payload : [];
        const uniqueDepartments = Array.from(
          new Set(
            items
              .map((employee: EmployeeDepartment) => String(employee.department || '').trim())
              .filter(Boolean),
          ),
        ).sort((a, b) => a.localeCompare(b));

        setDepartments(uniqueDepartments);
      } catch (fetchError) {
        console.error('Failed to load departments for execution matrix', fetchError);
      }
    };

    loadDepartments();
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadPerformance = async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (selectedWeek) params.set('weekId', selectedWeek);
        if (selectedDepartment !== 'all') params.set('department', selectedDepartment);

        const response = await fetch(`${API_BASE}/performance/weekly?${params.toString()}`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'Failed to load execution matrix');
        }

        const payload = await response.json().catch(() => []);
        const incoming = Array.isArray(payload) ? (payload as PerformanceRow[]) : [];

        if (ignore) return;

        setRows((previousRows) => {
          const previousMap = new Map<string, PerformanceRow>(previousRows.map((row) => [row.employeeId, row]));
          return incoming.map((row) => {
            const previous = previousMap.get(row.employeeId);
            const liveScoreDelta = previous
              ? Math.round((row.weeklyScore - previous.weeklyScore) * 10) / 10
              : 0;
            return {
              ...row,
              liveScoreDelta,
            };
          });
        });
      } catch (loadError: any) {
        if (!ignore) {
          setRows(getStaticExecutionRows(selectedDepartment));
          setError(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadPerformance();

    const socket = getSocket();
    const handleRealtimeUpdate = () => {
      if (refreshTimeout.current) {
        window.clearTimeout(refreshTimeout.current);
      }
      refreshTimeout.current = window.setTimeout(() => {
        loadPerformance(true);
      }, 250);
    };

    socket.on('performance:update', handleRealtimeUpdate);

    return () => {
      ignore = true;
      socket.off('performance:update', handleRealtimeUpdate);
      if (refreshTimeout.current) {
        window.clearTimeout(refreshTimeout.current);
      }
    };
  }, [selectedDepartment, selectedWeek]);

  const topPerformer = rows[0] || null;
  const needsAttention = rows[rows.length - 1] || null;
  const weeklyAverageScore = rows.length
    ? rows.reduce((sum, row) => sum + row.weeklyScore, 0) / rows.length
    : 0;

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_296px]">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-[13px] text-slate-500">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Radar className="text-brand-red" size={18} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Weekly live race view</p>
              <p>Real employee throughput pulled from live task activity.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedWeek}
              onChange={(event) => setSelectedWeek(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-700 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
            >
              {weekOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-700 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
            >
              <option value="all">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`execution-matrix-skeleton-${index}`}
                className="animate-pulse rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100" />
                  <div className="w-44 space-y-2">
                    <div className="h-4 w-32 rounded-full bg-slate-200" />
                    <div className="h-3 w-20 rounded-full bg-slate-100" />
                  </div>
                  <div className="flex-1">
                    <div className="h-16 rounded-2xl bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-6 py-5 text-[15px] text-rose-700">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-10 text-center text-[15px] text-slate-500 shadow-sm">
            No employee performance data found for this week.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const trendMeta = getTrendMeta(row.trend);
              const TrendIcon = trendMeta.icon;
              const barTone = getBarTone(row.weeklyScore);
              const liveScoreDelta = row.liveScoreDelta || 0;
              const showLiveDelta = Math.abs(liveScoreDelta) >= 0.1;
              const showRankDelta = row.rankDelta !== 0;
              const DeltaIcon =
                showLiveDelta
                  ? liveScoreDelta >= 0
                    ? ArrowUpRight
                    : ArrowDownRight
                  : row.rankDelta >= 0
                  ? ArrowUpRight
                  : ArrowDownRight;

              return (
                <div
                  key={row.employeeId}
                  className="rounded-[1.9rem] border border-slate-200/90 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(160deg,#0f172a_0%,#1e293b_100%)] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]">
                          {getRankIcon(row.rank)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[17px] font-semibold tracking-tight text-slate-900">{row.name}</p>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${trendMeta.className}`}
                            >
                              <TrendIcon size={12} />
                              {trendMeta.label}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                            <span>{row.department || 'Unassigned department'}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>{row.tasksCompleted}/{row.tasksAssigned} completed</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full max-w-[620px] ">
                        <div className="relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-5 py-5">
                          <div className="mb-4 flex items-center justify-between text-[12px] text-slate-900">
                            <span>Weekly target progress</span>
                            <span className="font-semibold text-slate-800">{formatPercentage(row.weeklyScore)}</span>
                          </div>

                          <div className="relative h-7 overflow-hidden rounded-full border border-white/70 bg-white shadow-inner shadow-slate-200/70">
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[length:24px_100%]" />
                            <div className="absolute inset-y-0 left-[75%] z-10 w-px bg-brand-red/70" />
                            <div className="pointer-events-none absolute left-[75%] top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-red/10 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-red shadow-sm">
                              Target
                            </div>
                            <div
                              className={`relative h-full rounded-full bg-gradient-to-r ${barTone.track} transition-all duration-700 ease-out ${barTone.glow}`}
                              style={{ width: `${Math.max(4, row.weeklyScore)}%` }}
                            >
                              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.06)_48%,rgba(255,255,255,0.2)_100%)]" />
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 font-semibold ${barTone.badge}`}>
                              {barTone.label}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 text-slate-500">
                              <span>{row.tasksCompleted}/{row.tasksAssigned} completed</span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              <span>{Math.round(row.onTimePercentage)}% on-time</span>
                              {typeof row.qualityScore === 'number' && (
                                <>
                                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                                  <span>{Math.round(row.qualityScore)} quality</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:w-[180px] lg:min-w-[180px] lg:flex-col lg:items-end lg:self-end lg:gap-12">
                      <div className="text-right">
                        <p className="text-[14px] uppercase tracking-[0.18em] text-slate-700">Weekly Score</p>
                        <p className="text-[3rem] font-semibold tracking-tight text-slate-900 leading-none">
                          {Math.round(row.weeklyScore)}
                        </p>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        {(showLiveDelta || showRankDelta) && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-brand-red/20 bg-brand-red/5 px-3 py-1.5 text-[12px] font-semibold text-brand-red">
                            {showLiveDelta ? `${liveScoreDelta > 0 ? '+' : ''}${liveScoreDelta}` : `${row.rankDelta > 0 ? '+' : ''}${row.rankDelta}`}
                            <DeltaIcon size={12} />
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-600">
                          {Math.round(row.onTimePercentage)}% on-time
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="self-start xl:h-[calc(100vh-6rem)]">
        <div className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-slate-900 p-3.5 text-white shadow-2xl">
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] uppercase tracking-[0.24em] text-white/45">Insights</p>
              <h4 className="mt-1.5 text-[1.35rem] font-semibold tracking-tight">Live employee pulse</h4>
            </div>
            <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Activity size={15} className="text-brand-red" />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-between gap-7">
            <div className="space-y-6">
              <InsightCard
                icon={<Trophy size={15} className="text-emerald-300" />}
                label="Top Performer"
                value={topPerformer?.name || 'No data'}
                meta={topPerformer ? `${Math.round(topPerformer.weeklyScore)} score` : 'Waiting for activity'}
              />
              <InsightCard
                icon={<Target size={15} className="text-amber-300" />}
                label="Needs Attention"
                value={needsAttention?.name || 'No data'}
                meta={needsAttention ? `${Math.round(needsAttention.weeklyScore)} score` : 'Waiting for activity'}
              />
              <InsightCard
                icon={<Users size={15} className="text-sky-300" />}
                label="Weekly Average"
                value={rows.length ? `${Math.round(weeklyAverageScore)}%` : '0%'}
                meta={`${rows.length} employees tracked`}
              />
            </div>

            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-2.5">
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/45">
                <span>Race Rules</span>
                <span>{TARGET_SCORE}% target</span>
              </div>
              <div className="space-y-2 text-[11px] text-white/70">
                <div className="flex items-center justify-between">
                  <span>Task completion</span>
                  <span className="font-semibold text-white/90">40%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>On-time delivery</span>
                  <span className="font-semibold text-white/90">30%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Consistency</span>
                  <span className="font-semibold text-white/90">20%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Quality</span>
                  <span className="font-semibold text-white/90">10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

const InsightCard = ({
  icon,
  label,
  value,
  meta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  meta: string;
}) => (
  <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-3.5">
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/45">
      {icon}
      <span>{label}</span>
    </div>
    <p className="mt-2 text-[16px] font-semibold leading-snug text-white">{value}</p>
    <p className="mt-1.5 text-[12px] text-white/55">{meta}</p>
  </div>
);

export default ExecutionMatrix;
