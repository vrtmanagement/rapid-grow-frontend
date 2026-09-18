import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  Minus,
} from 'lucide-react';
import { API_BASE, apiGetJson, getAuthHeaders } from '../config/api';
import { getDisplayAvatarUrl } from '../utils/avatar';
import { ALL_DEPARTMENTS_VALUE, TARGET_SCORE, formatDepartmentDisplay } from '../components/dashboard/executionMatrixUtils';

type TrendDirection = 'up' | 'down' | 'stable';
type DayLabel = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

type DailyBreakdown = {
  date: string;
  score: number;
  tasksAssigned: number;
  tasksCompleted: number;
  onTimeTasks: number;
  onTimePercentage: number;
  consistencyScore: number;
  qualityScore: number | null;
  hasData: boolean;
};

type PerformanceRow = {
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
  dailyBreakdown?: Record<DayLabel, DailyBreakdown>;
  avatar?: string;
};

type EmployeeProfile = {
  _id?: string;
  empId?: string;
  empName?: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  avatar?: string;
  createdAt?: string;
};

const DAY_ORDER: DayLabel[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatPersonName(value?: string | null) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Unknown';
  return normalized
    .split(' ')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(' ');
}

function formatRoleLabel(role?: string | null) {
  return String(role || 'EMPLOYEE')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatJoinedDate(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return 'No recent activity';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No recent activity';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getRankMedal(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function getTrendMeta(trend: TrendDirection) {
  if (trend === 'up') {
    return { icon: ArrowUpRight, className: 'text-emerald-700', label: 'Climbing' };
  }
  if (trend === 'down') {
    return { icon: ArrowDownRight, className: 'text-rose-700', label: 'Cooling' };
  }
  return { icon: Minus, className: 'text-slate-600', label: 'Holding' };
}

function getStatusMeta(score: number) {
  if (score >= TARGET_SCORE) return { label: 'On track', className: 'text-emerald-700' };
  if (score >= 50) return { label: 'Mid pace', className: 'text-amber-700' };
  return { label: 'At risk', className: 'text-rose-700 font-semibold' };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2.5 last:border-b-0 sm:grid-cols-[160px_minmax(0,1fr)]">
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className="text-[13px] font-medium text-slate-900 break-words">{value}</dd>
    </div>
  );
}

const ExecutionMatrixEmployeeView: React.FC = () => {
  const navigate = useNavigate();
  const { employeeId: employeeIdParam } = useParams<{ employeeId: string }>();
  const [searchParams] = useSearchParams();
  const employeeId = String(employeeIdParam || '').trim();
  const weekId = String(searchParams.get('weekId') || '').trim();
  const department = String(searchParams.get('department') || ALL_DEPARTMENTS_VALUE).trim() || ALL_DEPARTMENTS_VALUE;
  const periodLabel = String(searchParams.get('period') || 'Selected period').trim() || 'Selected period';

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [row, setRow] = useState<PerformanceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setError('Employee not found');
      setLoading(false);
      return;
    }

    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const performancePath = (() => {
          const params = new URLSearchParams();
          if (weekId) params.set('weekId', weekId);
          if (department !== ALL_DEPARTMENTS_VALUE) params.set('department', department);
          const query = params.toString();
          return `/performance/weekly${query ? `?${query}` : ''}`;
        })();

        const [profileResult, performanceResult] = await Promise.allSettled([
          fetch(`${API_BASE}/employees/${encodeURIComponent(employeeId)}`, {
            headers: getAuthHeaders(),
          }).then(async (response) => {
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload?.message || 'Failed to load employee');
            return payload as EmployeeProfile;
          }),
          apiGetJson<PerformanceRow[]>(performancePath, {}, { force: true }),
        ]);

        if (ignore) return;

        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value);
        } else {
          setProfile(null);
        }

        if (performanceResult.status === 'fulfilled') {
          const matched =
            (Array.isArray(performanceResult.value) ? performanceResult.value : []).find(
              (entry) => String(entry.employeeId) === employeeId,
            ) || null;
          setRow(matched);
        } else {
          setRow(null);
        }

        if (profileResult.status === 'rejected' && performanceResult.status === 'rejected') {
          setError('Unable to load employee details');
        }
      } catch (loadError: any) {
        if (!ignore) {
          setError(loadError?.message || 'Unable to load employee details');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [department, employeeId, weekId]);

  const displayName = formatPersonName(profile?.empName || row?.name || employeeId);
  const avatarUrl = getDisplayAvatarUrl(profile?.avatar || row?.avatar, displayName);
  const medal = row ? getRankMedal(row.rank) : null;
  const trendMeta = getTrendMeta(row?.trend || 'stable');
  const TrendIcon = trendMeta.icon;
  const statusMeta = getStatusMeta(row?.weeklyScore || 0);
  const departmentLabel = formatDepartmentDisplay(profile?.department || row?.department);
  const completionRate = row
    ? row.tasksAssigned > 0
      ? Math.round((row.tasksCompleted / row.tasksAssigned) * 100)
      : row.tasksCompleted > 0
        ? 100
        : 0
    : 0;

  const profileRows = useMemo(
    () => [
      { label: 'Employee ID', value: String(profile?.empId || employeeId) },
      { label: 'Department', value: departmentLabel },
      { label: 'Designation', value: profile?.designation || 'Not set' },
      { label: 'Role', value: formatRoleLabel(profile?.role) },
      { label: 'Email', value: profile?.email || 'Not set' },
      { label: 'Phone', value: profile?.phone || 'Not set' },
      { label: 'Joined', value: formatJoinedDate(profile?.createdAt) },
      {
        label: 'Account status',
        value: String(profile?.status || 'active').toLowerCase() === 'active' ? 'Active' : 'Inactive',
      },
      { label: 'Last activity', value: formatDateTime(row?.lastActivityAt) },
    ],
    [departmentLabel, employeeId, profile, row?.lastActivityAt],
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pt-5 sm:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <p className="text-[13px] text-slate-500">{periodLabel}</p>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Loading employee details…
        </div>
      ) : error && !profile && !row ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-[14px] text-rose-700">
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h1 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
                      {displayName}
                    </h1>
                    {row ? (
                      <span className="inline-flex items-center gap-1 text-[13px] text-slate-500">
                        {medal ? <span aria-hidden="true">{medal}</span> : null}
                        #{row.rank}
                      </span>
                    ) : null}
                    <span className={`inline-flex items-center gap-1 text-[13px] ${trendMeta.className}`}>
                      <TrendIcon size={13} />
                      {trendMeta.label}
                    </span>
                    <span className={`whitespace-nowrap text-[13px] ${statusMeta.className}`}>
                      · {statusMeta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {profile?.designation || 'Team member'} · {departmentLabel}
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-[12px] text-slate-500">Weekly score</p>
                <p className="mt-0.5 text-[2rem] font-semibold leading-none text-slate-950">
                  {row ? Math.round(row.weeklyScore) : '—'}
                </p>
                <p className="mt-1 text-[12px] text-slate-500">{TARGET_SCORE}% target</p>
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="border-b border-slate-100 px-5 py-5 sm:px-7 lg:border-b-0 lg:border-r">
              <h2 className="text-[15px] font-semibold text-slate-900">Profile</h2>
              <p className="mt-0.5 text-[12px] text-slate-500">Employee details from their staff record</p>
              <dl className="mt-3">
                {profileRows.map((item) => (
                  <DetailRow key={item.label} label={item.label} value={item.value} />
                ))}
              </dl>
            </section>

            <section className="px-5 py-5 sm:px-7">
              <h2 className="text-[15px] font-semibold text-slate-900">Task completion</h2>
              <p className="mt-0.5 text-[12px] text-slate-500">Throughput for the selected period</p>

              {row ? (
                <>
                  <dl className="mt-3">
                    <DetailRow label="Tasks assigned" value={String(row.tasksAssigned)} />
                    <DetailRow
                      label="Tasks completed"
                      value={`${row.tasksCompleted} (${completionRate}% completion)`}
                    />
                    <DetailRow
                      label="On-time tasks"
                      value={`${row.onTimeTasks} (${Math.round(row.onTimePercentage)}% on-time)`}
                    />
                    <DetailRow
                      label="Consistency"
                      value={`${Math.round(row.consistencyScore)}%`}
                    />
                    <DetailRow
                      label="Quality"
                      value={
                        typeof row.qualityScore === 'number'
                          ? `${Math.round(row.qualityScore)}`
                          : 'Pending'
                      }
                    />
                  </dl>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px] text-slate-500">
                      <span>Progress to target</span>
                      <span>
                        {Math.round(row.weeklyScore)}% / {TARGET_SCORE}%
                      </span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="absolute inset-y-0 left-[75%] z-10 w-px bg-brand-red/60" />
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300"
                        style={{ width: `${Math.max(4, Math.min(100, row.weeklyScore))}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-[13px] text-slate-500">
                  No performance data found for this period.
                </p>
              )}
            </section>
          </div>

          {row?.dailyBreakdown ? (
            <section className="border-t border-slate-100 px-5 py-5 sm:px-7">
              <h2 className="text-[15px] font-semibold text-slate-900">Daily breakdown</h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                Day-by-day score and completion for this period
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[640px] w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[12px] text-slate-500">
                      <th className="py-2.5 pr-3 font-medium">Day</th>
                      <th className="py-2.5 pr-3 font-medium">Date</th>
                      <th className="py-2.5 pr-3 font-medium text-right">Score</th>
                      <th className="py-2.5 pr-3 font-medium text-right">Assigned</th>
                      <th className="py-2.5 pr-3 font-medium text-right">Completed</th>
                      <th className="py-2.5 font-medium text-right">On-time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAY_ORDER.map((day) => {
                      const cell = row.dailyBreakdown?.[day];
                      return (
                        <tr key={day} className="border-b border-slate-100 last:border-b-0">
                          <td className="py-2.5 pr-3 text-[13px] font-medium text-slate-800">{day}</td>
                          <td className="py-2.5 pr-3 text-[13px] text-slate-500">
                            {cell?.date
                              ? new Date(cell.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  timeZone: 'UTC',
                                })
                              : '—'}
                          </td>
                          <td className="py-2.5 pr-3 text-right text-[13px] font-semibold text-slate-900">
                            {cell?.hasData ? Math.round(cell.score) : '—'}
                          </td>
                          <td className="py-2.5 pr-3 text-right text-[13px] text-slate-600">
                            {cell?.hasData ? cell.tasksAssigned : '—'}
                          </td>
                          <td className="py-2.5 pr-3 text-right text-[13px] text-slate-600">
                            {cell?.hasData ? cell.tasksCompleted : '—'}
                          </td>
                          <td className="py-2.5 text-right text-[13px] text-slate-600">
                            {cell?.hasData ? `${Math.round(cell.onTimePercentage)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ExecutionMatrixEmployeeView;
