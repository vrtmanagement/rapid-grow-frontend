
import React, { useEffect, useMemo, useState } from 'react';
import { PlanningState, Goal } from '../types';
import { CheckCircle2, UserPlus2, Star } from 'lucide-react';
import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../config/api';
import { Skeleton, SkeletonBlock } from '../components/ui/Skeleton';
import VisionFlowNav from '../components/planning/VisionFlowNav';
import { saveGoal } from '../services/goalApi';
import { Link, useLocation } from 'react-router-dom';

interface Props {
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  loading?: boolean;
}

interface SpacesTaskSummary {
  taskId: string;
  title: string;
  assigneeId: string;
  dueDate: string;
  priority: string;
  status: string;
  customFields?: Record<string, string>;
}

interface EmployeeOption {
  empId: string;
  empName: string;
  role?: string;
}

function getLoggedInEmpId(): string {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed?.employee?.empId || '';
  } catch {
    return '';
  }
}

function getLoggedInEmployeeMeta() {
  const session = getStoredAuthSession();
  const emp = session?.employee || {};
  return {
    empId: String(emp.empId || emp._id || ''),
    empName: String(emp.empName || ''),
    role: String(emp.role || '').toUpperCase(),
  };
}

const DailyView: React.FC<Props> = ({ state, updateState, loading = false }) => {
  const [topTasks, setTopTasks] = useState<SpacesTaskSummary[]>([]);
  const [allSpacesTasks, setAllSpacesTasks] = useState<SpacesTaskSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [assignDraftByDay, setAssignDraftByDay] = useState<
    Record<string, { title: string; assigneeId: string; dueDate: string; priority: string; status: string }>
  >({});
  const [assigningDayTaskId, setAssigningDayTaskId] = useState<string>('');
  const [dailyError, setDailyError] = useState<string>('');
  const [onlySelectedWeek, setOnlySelectedWeek] = useState(false);
  const isAdmin = state.currentUser.role === 'Admin';
  const location = useLocation();
  const selectedWeekId = new URLSearchParams(location.search).get('weekId') || '';
  const me = getLoggedInEmployeeMeta();

  const assignableEmployees = useMemo(() => {
    const map = new Map<string, EmployeeOption>();
    employees.forEach((e) => map.set(e.empId, e));
    if (me.empId) {
      map.set(me.empId, { empId: me.empId, empName: me.empName || 'You', role: me.role || 'EMPLOYEE' });
    }
    const list = Array.from(map.values());
    if (me.role === 'SUPER_ADMIN' || me.role === 'ADMIN') return list;
    if (me.role === 'TEAM_LEAD') {
      return list.filter((e) => {
        const r = String(e.role || '').toUpperCase();
        return e.empId === me.empId || r === 'EMPLOYEE' || !r;
      });
    }
    return list.filter((e) => e.empId === me.empId);
  }, [employees, me.empId, me.empName, me.role]);

  useEffect(() => {
    let active = true;
    const empId = getLoggedInEmpId();

    const loadTasks = async () => {
      try {
        const res = await fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const tasks: SpacesTaskSummary[] = Array.isArray(data?.tasks) ? data.tasks : [];
        if (!active) return;
        setAllSpacesTasks(tasks);
        const meTasks = tasks.filter(
          (t) =>
            t.assigneeId === empId &&
            typeof t.dueDate === 'string' &&
            t.dueDate.trim() &&
            t.status !== 'done',
        );

        const parsed = meTasks
          .map((t) => {
            const dStr = String(t.dueDate).trim();
            const d = new Date(`${dStr}T00:00:00`);
            if (isNaN(d.getTime())) return null;
            return {
              ...t,
              _due: d.getTime(),
            } as SpacesTaskSummary & { _due: number };
          })
          .filter(Boolean) as (SpacesTaskSummary & { _due: number })[];

        parsed.sort((a, b) => a._due - b._due);
        setTopTasks(parsed.slice(0, 5));
      } catch {
        // ignore errors for daily view
      }
    };

    const loadEmployees = async () => {
      try {
        const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];
        if (!active) return;
        setEmployees(
          list.map((e: any) => ({
            empId: String(e.empId || e._id || ''),
            empName: String(e.empName || e.name || ''),
            role: String(e.role || ''),
          })),
        );
      } catch {
        // ignore errors for employee list
      }
    };

    loadTasks();
    loadEmployees();
    const timer = window.setInterval(loadTasks, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  const toggleDaily = (id: string) => {
    if (!isAdmin) return;
    let nextGoal: Goal | null = null;
    updateState((prev) => {
      const nextDaily = prev.dailyGoals.map((d) => {
        if (d.id !== id) return d;
        nextGoal = { ...d, completed: !d.completed };
        return nextGoal;
      });
      return {
        ...prev,
        dailyGoals: nextDaily,
      };
    });
    if (nextGoal) {
      saveGoal(nextGoal).catch((e) => {
        console.error(e);
        setDailyError('Failed to save day progress. Please refresh and retry.');
      });
    }
  };

  const updateDailyText = (id: string, text: string) => {
    if (!isAdmin) return;
    let nextGoal: Goal | null = null;
    updateState((prev) => {
      const nextDaily = prev.dailyGoals.map((d) => {
        if (d.id !== id) return d;
        nextGoal = { ...d, text };
        return nextGoal;
      });
      return {
        ...prev,
        dailyGoals: nextDaily,
      };
    });
    if (nextGoal) {
      saveGoal(nextGoal).catch((e) => {
        console.error(e);
        setDailyError('Failed to save day title. Please refresh and retry.');
      });
    }
  };

  const createDaysForWeek = async (weekId: string) => {
    if (!isAdmin) return;
    const current = state.dailyGoals.filter((d) => d.parentId === weekId);
    if (current.length > 0) return;
    const generated = Array.from({ length: 7 }).map((_, idx) => ({
      id: `d-${weekId}-${idx + 1}`,
      text: `Day ${idx + 1}`,
      completed: false,
      level: 'day' as const,
      parentId: weekId,
    }));
    updateState((prev) => ({
      ...prev,
      dailyGoals: [...prev.dailyGoals, ...generated],
    }));
    try {
      await Promise.all(generated.map((g) => saveGoal(g)));
    } catch (e) {
      console.error(e);
      setDailyError('Failed to persist generated days. Please try again.');
    }
  };

  const createTaskFromDay = async (day: Goal, week: Goal) => {
    const draft = assignDraftByDay[day.id];
    const title = (draft?.title || day.text || '').trim();
    const assigneeId = (draft?.assigneeId || me.empId || '').trim();
    const dueDate = String(draft?.dueDate || '').trim();
    const priority = String(draft?.priority || 'medium').trim() || 'medium';
    const status = String(draft?.status || 'todo').trim() || 'todo';
    if (!title) {
      setDailyError('Task title is required.');
      return;
    }
    if (!assigneeId) {
      setDailyError('Assignee is required.');
      return;
    }
    setAssigningDayTaskId(day.id);
    setDailyError('');
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          assigneeId,
          dueDate,
          priority,
          status,
          description: `Created from Daily plan: ${week.text || 'Weekly Goal'}`,
          customFields: {
            dailyGoalId: day.id,
            weeklyGoalId: week.id,
            dailyGoalText: day.text || '',
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create task from daily goal');
      }
      setAssignDraftByDay((prev) => ({
        ...prev,
        [day.id]: { title: day.text || '', assigneeId: me.empId || '', dueDate: '', priority: 'medium', status: 'todo' },
      }));
      // refresh task linkage immediately
      setAllSpacesTasks((prev) => [data, ...prev]);
    } catch (e: any) {
      setDailyError(e?.message || 'Failed to create task');
    } finally {
      setAssigningDayTaskId('');
    }
  };

  const getWeekBreadcrumb = (weekId: string): string => {
    const week = state.weeklyGoals.find((w) => w.id === weekId);
    const month = week ? state.monthlyGoals.find((m) => m.id === week.parentId) : undefined;
    const quarter = month ? state.quarterlyGoals.find((q) => q.id === month.parentId) : undefined;
    const year = quarter ? state.yearlyGoals.find((y) => y.id === quarter.parentId) : undefined;
    return [year?.text || 'Year', quarter?.timeline || 'Q?', month?.timeline || 'M?', 'Week']
      .filter(Boolean)
      .join(' > ');
  };

  const dailyGroups = state.weeklyGoals.map((week) => ({
    week,
    days: state.dailyGoals.filter((d) => d.parentId === week.id),
  }));
  const orderedGroups = selectedWeekId
    ? [...dailyGroups].sort((a, b) => (a.week.id === selectedWeekId ? -1 : b.week.id === selectedWeekId ? 1 : 0))
    : dailyGroups;
  const visibleGroups = onlySelectedWeek && selectedWeekId
    ? orderedGroups.filter((g) => g.week.id === selectedWeekId)
    : orderedGroups;

  useEffect(() => {
    const doneByDayId = new Map<string, boolean>();
    allSpacesTasks.forEach((task) => {
      const linkedDayId = String(task?.customFields?.dailyGoalId || '').trim();
      if (!linkedDayId) return;
      if (String(task.status || '').toLowerCase() === 'done') {
        doneByDayId.set(linkedDayId, true);
      } else if (!doneByDayId.has(linkedDayId)) {
        doneByDayId.set(linkedDayId, false);
      }
    });
    if (!doneByDayId.size) return;

    const changed: Goal[] = [];
    updateState((prev) => {
      const nextDaily = prev.dailyGoals.map((d) => {
        if (!doneByDayId.has(d.id)) return d;
        const shouldComplete = !!doneByDayId.get(d.id);
        if (d.completed === shouldComplete) return d;
        const next = { ...d, completed: shouldComplete };
        changed.push(next);
        return next;
      });
      if (!changed.length) return prev;
      return { ...prev, dailyGoals: nextDaily };
    });
    if (changed.length) {
      Promise.all(changed.map((g) => saveGoal(g))).catch((e) => {
        console.error(e);
        setDailyError('Task sync happened, but day status save failed.');
      });
    }
  }, [allSpacesTasks, updateState]);

  useEffect(() => {
    setOnlySelectedWeek(!!selectedWeekId);
  }, [selectedWeekId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
        <VisionFlowNav subtitle={state.uiConfig.dailySub} />
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-28" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 p-4">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
          <Skeleton className="h-6 w-56 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 p-4 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <SkeletonBlock className="h-8 w-full rounded-lg" />
                <SkeletonBlock className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalVisibleDays = visibleGroups.reduce((sum, g) => sum + g.days.length, 0);
  const completedVisibleDays = visibleGroups.reduce(
    (sum, g) => sum + g.days.filter((d) => d.completed).length,
    0,
  );
  const mappedWeekCount = visibleGroups.filter((g) => g.days.length > 0).length;
  const completionPercent = totalVisibleDays ? Math.round((completedVisibleDays / totalVisibleDays) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <VisionFlowNav subtitle={state.uiConfig.dailySub} />
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Daily Control Center</h3>
            <p className="text-sm text-slate-500 mt-1">
              Two clear actions: complete day checklist and assign each day to TaskHub.
            </p>
          </div>
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
            <CheckCircle2 size={15} className="text-emerald-500 mr-2" />
            <span className="font-semibold text-slate-800">{completionPercent}%</span>
            <span className="text-slate-500 ml-1">complete</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Visible weeks</div>
            <div className="text-lg font-semibold text-slate-900">{visibleGroups.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Mapped weeks</div>
            <div className="text-lg font-semibold text-slate-900">{mappedWeekCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Daily done</div>
            <div className="text-lg font-semibold text-slate-900">{completedVisibleDays}/{totalVisibleDays}</div>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-red to-rose-500" style={{ width: `${completionPercent}%` }} />
        </div>
        {selectedWeekId && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-brand-red/20 bg-red-50/40 px-3 py-2">
            <div className="text-xs text-slate-700">
              Opened from Weekly focus. Week ID: <span className="font-semibold">{selectedWeekId}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-600 flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={onlySelectedWeek}
                  onChange={(e) => setOnlySelectedWeek(e.target.checked)}
                />
                Show only this week
              </label>
              <Link to="/daily" className="text-xs font-medium text-brand-red hover:underline">
                Clear filter
              </Link>
            </div>
          </div>
        )}
        {dailyError && (
          <div className="mt-3 text-xs rounded-md border border-red-200 bg-red-50 text-red-700 px-2.5 py-2">
            {dailyError}
          </div>
        )}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-amber-500 fill-current" />
            <h5 className="text-sm font-semibold text-slate-800">Top 5 Priorities For Today</h5>
          </div>
          <div className="space-y-2">
            {topTasks.length > 0
              ? topTasks.slice(0, 5).map((t, i) => (
                  <div key={t.taskId} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                    <div className="font-medium text-slate-800">{i + 1}. {t.title}</div>
                    <div className="text-slate-500 mt-0.5">
                      Due: {t.dueDate || '—'} · Priority: {t.priority} · Status: {t.status}
                    </div>
                  </div>
                ))
              : state.dailyPriorities.map((p, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    {i + 1}. {p || 'Set a top priority'}
                  </div>
                ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Daily Execution Rows</h4>
            <p className="text-xs text-slate-500">Check a day when done, or assign it to TaskHub in one click.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
            <UserPlus2 size={14} className="text-brand-red" />
            Task assignment enabled
          </div>
        </div>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {visibleGroups.map(({ week, days }) => (
            <div key={week.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{week.text || 'Untitled Weekly Goal'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{getWeekBreadcrumb(week.id)}</div>
                </div>
                <div className="text-[11px] rounded-full bg-white border border-slate-200 px-2 py-1 text-slate-600">
                  {days.filter((d) => d.completed).length}/{days.length || 7} done
                </div>
              </div>
              <div className="space-y-2.5">
                {days.map((day) => (
                  <div key={day.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={day.completed} onChange={() => toggleDaily(day.id)} disabled={!isAdmin} />
                      <input
                        type="text"
                        value={day.text}
                        onChange={(e) => updateDailyText(day.id, e.target.value)}
                        readOnly={!isAdmin}
                        className="flex-1 bg-transparent border-b border-slate-200 outline-none text-sm"
                      />
                    </label>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={assignDraftByDay[day.id]?.title ?? day.text ?? ''}
                        onChange={(e) =>
                          setAssignDraftByDay((prev) => ({
                            ...prev,
                            [day.id]: {
                              title: e.target.value,
                              assigneeId: prev[day.id]?.assigneeId || me.empId || '',
                              dueDate: prev[day.id]?.dueDate || '',
                              priority: prev[day.id]?.priority || 'medium',
                              status: prev[day.id]?.status || 'todo',
                            },
                          }))
                        }
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none"
                        placeholder="Task title for TaskHub"
                      />
                      <select
                        value={assignDraftByDay[day.id]?.assigneeId ?? me.empId ?? ''}
                        onChange={(e) =>
                          setAssignDraftByDay((prev) => ({
                            ...prev,
                            [day.id]: {
                              title: prev[day.id]?.title ?? day.text ?? '',
                              assigneeId: e.target.value,
                              dueDate: prev[day.id]?.dueDate || '',
                              priority: prev[day.id]?.priority || 'medium',
                              status: prev[day.id]?.status || 'todo',
                            },
                          }))
                        }
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none bg-white"
                      >
                        {assignableEmployees.map((emp) => (
                          <option key={emp.empId} value={emp.empId}>
                            {emp.empName || emp.empId}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={assignDraftByDay[day.id]?.dueDate ?? ''}
                        onChange={(e) =>
                          setAssignDraftByDay((prev) => ({
                            ...prev,
                            [day.id]: {
                              title: prev[day.id]?.title ?? day.text ?? '',
                              assigneeId: prev[day.id]?.assigneeId || me.empId || '',
                              dueDate: e.target.value,
                              priority: prev[day.id]?.priority || 'medium',
                              status: prev[day.id]?.status || 'todo',
                            },
                          }))
                        }
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none bg-white"
                      />
                      <select
                        value={assignDraftByDay[day.id]?.priority ?? 'medium'}
                        onChange={(e) =>
                          setAssignDraftByDay((prev) => ({
                            ...prev,
                            [day.id]: {
                              title: prev[day.id]?.title ?? day.text ?? '',
                              assigneeId: prev[day.id]?.assigneeId || me.empId || '',
                              dueDate: prev[day.id]?.dueDate || '',
                              priority: e.target.value,
                              status: prev[day.id]?.status || 'todo',
                            },
                          }))
                        }
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none bg-white"
                      >
                        <option value="low">Priority: Low</option>
                        <option value="medium">Priority: Medium</option>
                        <option value="high">Priority: High</option>
                      </select>
                      <select
                        value={assignDraftByDay[day.id]?.status ?? 'todo'}
                        onChange={(e) =>
                          setAssignDraftByDay((prev) => ({
                            ...prev,
                            [day.id]: {
                              title: prev[day.id]?.title ?? day.text ?? '',
                              assigneeId: prev[day.id]?.assigneeId || me.empId || '',
                              dueDate: prev[day.id]?.dueDate || '',
                              priority: prev[day.id]?.priority || 'medium',
                              status: e.target.value,
                            },
                          }))
                        }
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none bg-white"
                      >
                        <option value="todo">Status: To Do</option>
                        <option value="doing">Status: Doing</option>
                        <option value="review">Status: Review</option>
                        <option value="blocked">Status: Blocked</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => createTaskFromDay(day, week)}
                        disabled={assigningDayTaskId === day.id}
                        className="rounded-md bg-brand-red text-white text-xs font-medium px-2 py-1.5 disabled:opacity-60 md:col-span-3"
                      >
                        {assigningDayTaskId === day.id ? 'Assigning...' : 'Assign to employee'}
                      </button>
                    </div>
                  </div>
                ))}
                {!days.length && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2.5">
                    <div className="text-xs text-slate-500">No days mapped.</div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => createDaysForWeek(week.id)}
                        className="text-xs px-2.5 py-1 rounded-md bg-brand-red text-white"
                      >
                        Generate 7 days
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {!visibleGroups.length && <div className="text-sm text-slate-500">No weekly goals found.</div>}
        </div>
      </section>
    </div>
  );
};

export default DailyView;
