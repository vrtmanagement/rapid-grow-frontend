
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PlanningState, Goal } from '../types';
import { CheckCircle2, UserPlus2 } from 'lucide-react';
import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../config/api';
import { fetchSpacesList, SPACES_PLANNER_FETCH_LIMIT } from '../services/spacesApi';
import { fetchTabEndpoint } from '../services/tabSessionCache';
import { getSocket } from '../realtime/socket';
import { Skeleton, SkeletonBlock } from '../components/ui/Skeleton';
import VisionFlowNav from '../components/planning/VisionFlowNav';
import DailyTopPrioritiesCard from '../components/planning/DailyTopPrioritiesCard';
import SelectedWeekFilterBanner from '../components/planning/SelectedWeekFilterBanner';
import { saveGoal } from '../services/goalApi';
import { useLocation } from 'react-router-dom';

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

type NormalizedRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | 'UNKNOWN';

const normalizeRole = (role?: string): NormalizedRole => {
  const value = String(role || '').toUpperCase();
  if (value === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (value === 'ADMIN') return 'ADMIN';
  if (value === 'TEAM_LEAD') return 'TEAM_LEAD';
  if (value === 'EMPLOYEE') return 'EMPLOYEE';
  return 'UNKNOWN';
};

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

const parseDateKey = (raw: string): Date | null => {
  const value = String(raw || '').trim();
  if (!value) return null;
  const isoDateMatch = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = isoDateMatch ? new Date(`${value}T00:00:00`) : new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getSundayStart = (date: Date): Date => {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  normalized.setDate(normalized.getDate() - normalized.getDay());
  return normalized;
};

const getAssignmentStatusBadge = (status?: string): string => {
  switch (String(status || '').toLowerCase()) {
    case 'doing':
      return 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-navy';
    case 'review':
      return 'border-brand-orange/30 bg-brand-orange/10 text-brand-brown';
    case 'blocked':
      return 'border-brand-red/25 bg-brand-red/10 text-brand-red';
    case 'done':
      return 'border-brand-green/30 bg-brand-green/10 text-brand-green';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
};

const getAssignmentPriorityBadge = (priority?: string): string => {
  switch (String(priority || '').toLowerCase()) {
    case 'high':
      return 'border-brand-red/25 bg-brand-red/10 text-brand-red';
    case 'low':
      return 'border-brand-green/25 bg-brand-green/10 text-brand-green';
    default:
      return 'border-brand-orange/25 bg-brand-orange/10 text-brand-brown';
  }
};

const formatAssignmentStatusLabel = (status?: string): string => {
  switch (String(status || '').toLowerCase()) {
    case 'doing':
      return 'In Progress';
    case 'review':
      return 'In Review';
    case 'blocked':
      return 'Blocked';
    case 'done':
      return 'Done';
    default:
      return 'To Do';
  }
};

const formatAssignmentPriorityLabel = (priority?: string): string => {
  switch (String(priority || '').toLowerCase()) {
    case 'high':
      return 'High Priority';
    case 'low':
      return 'Low Priority';
    default:
      return 'Medium Priority';
  }
};

const DailyView: React.FC<Props> = ({ state, updateState, loading = false }) => {
  const [topTasks, setTopTasks] = useState<SpacesTaskSummary[]>([]);
  const [allSpacesTasks, setAllSpacesTasks] = useState<SpacesTaskSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [assignDraftByDay, setAssignDraftByDay] = useState<
    Record<string, { title: string; assigneeId: string; dueDate: string; priority: string; status: string }>
  >({});
  const [assigningDayTaskId, setAssigningDayTaskId] = useState<string>('');
  const [updatingTopTaskId, setUpdatingTopTaskId] = useState<string>('');
  const [dailyError, setDailyError] = useState<string>('');
  const [onlySelectedWeek, setOnlySelectedWeek] = useState(false);
  const [selectedDayByWeek, setSelectedDayByWeek] = useState<Record<string, string>>({});
  const [taskComposerOpenByDay, setTaskComposerOpenByDay] = useState<Record<string, boolean>>({});
  const currentUserRole = String(state.currentUser.role || '').toUpperCase();
  const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';
  const autoSeededWeekIdsRef = useRef<Set<string>>(new Set());
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedWeekId = searchParams.get('weekId') || '';
  const selectedDayIdFromQuery = searchParams.get('dayId') || '';
  const autoComposeFromQuery = searchParams.get('compose') === '1';
  const me = getLoggedInEmployeeMeta();

  const assignableEmployees = useMemo(() => {
    const map = new Map<string, EmployeeOption>();
    employees.forEach((e) => map.set(e.empId, e));
    if (me.empId) {
      map.set(me.empId, { empId: me.empId, empName: me.empName || 'You', role: me.role || 'EMPLOYEE' });
    }
    const list = Array.from(map.values());
    const myRole = normalizeRole(me.role);
    if (myRole === 'SUPER_ADMIN' || myRole === 'ADMIN') {
      // Admin scope: self + team leads + employees.
      return list.filter((e) => {
        const role = normalizeRole(e.role);
        return e.empId === me.empId || role === 'TEAM_LEAD' || role === 'EMPLOYEE' || role === 'UNKNOWN';
      });
    }
    if (myRole === 'TEAM_LEAD') {
      return list.filter((e) => {
        const role = normalizeRole(e.role);
        return e.empId === me.empId || role === 'EMPLOYEE' || role === 'UNKNOWN';
      });
    }
    return list.filter((e) => e.empId === me.empId);
  }, [employees, me.empId, me.empName, me.role]);

  const assignmentScopeLabel = useMemo(() => {
    const myRole = normalizeRole(me.role);
    if (myRole === 'SUPER_ADMIN' || myRole === 'ADMIN') return 'Scope: You, Team Leads, and Employees';
    if (myRole === 'TEAM_LEAD') return 'Scope: You and Employees';
    return 'Scope: Self only';
  }, [me.role]);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    assignableEmployees.forEach((emp) => {
      map.set(emp.empId, emp.empName || emp.empId);
    });
    return map;
  }, [assignableEmployees]);

  useEffect(() => {
    let active = true;
    const empId = getLoggedInEmpId();

    const loadTasks = async () => {
      try {
        const data = await fetchSpacesList(
          {
            filter: 'me',
            sync: '0',
            limit: SPACES_PLANNER_FETCH_LIMIT,
          },
          { tabKey: 'daily' },
        );
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
        const list = await fetchTabEndpoint<unknown[]>('daily', '/employees');
        if (!active) return;
        setEmployees(
          (Array.isArray(list) ? list : []).map((e: any) => ({
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
    const socket = getSocket();
    socket.on('spaces:changed', loadTasks);
    return () => {
      active = false;
      socket.off('spaces:changed', loadTasks);
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
      setTaskComposerOpenByDay((prev) => ({ ...prev, [day.id]: false }));
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

  const getWeekStartDate = (week: Goal, days: Goal[]): Date => {
    const fromTimeline = parseDateKey(String(week.timeline || '').trim());
    if (fromTimeline) return fromTimeline;

    const dayIds = new Set(days.map((d) => d.id));
    const linkedDueDates = allSpacesTasks
      .filter((task) => dayIds.has(String(task?.customFields?.dailyGoalId || '').trim()))
      .map((task) => parseDateKey(task.dueDate || ''))
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());
    if (linkedDueDates.length) return linkedDueDates[0];

    return new Date();
  };

  const getDayDisplay = (startDate: Date, index: number) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      weekday: date.toLocaleDateString(undefined, { weekday: 'long' }),
      dateText: date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
    };
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    const previousTasks = allSpacesTasks;
    setDailyError('');
    setUpdatingTopTaskId(taskId);
    setAllSpacesTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, status } : t)));
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || 'Failed to update task status');
      }
      const updated = await res.json().catch(() => ({}));
      setAllSpacesTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, ...updated } : t)));
    } catch (e: any) {
      setAllSpacesTasks(previousTasks);
      setDailyError(e?.message || 'Failed to update task status');
    } finally {
      setUpdatingTopTaskId('');
    }
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
    setSelectedDayByWeek((prev) => {
      let changed = false;
      const next = { ...prev };
      const todayKey = formatDateKey(new Date());
      visibleGroups.forEach(({ week, days }) => {
        if (!days.length) return;
        const alreadySelected = next[week.id];
        const stillValid = alreadySelected && days.some((d) => d.id === alreadySelected);
        if (!stillValid) {
          const startDate = getSundayStart(getWeekStartDate(week, days));
          const todayIndex = days.findIndex((_, idx) => formatDateKey(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + idx)) === todayKey);
          next[week.id] = todayIndex >= 0 ? days[todayIndex].id : days[0].id;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [visibleGroups]);

  useEffect(() => {
    if (!selectedWeekId || !autoComposeFromQuery) return;
    const targetGroup = visibleGroups.find((group) => group.week.id === selectedWeekId);
    if (!targetGroup || !targetGroup.days.length) return;
    const targetDayId = targetGroup.days.some((day) => day.id === selectedDayIdFromQuery)
      ? selectedDayIdFromQuery
      : targetGroup.days[0].id;
    setSelectedDayByWeek((prev) => ({
      ...prev,
      [selectedWeekId]: targetDayId,
    }));
    setTaskComposerOpenByDay((prev) => ({
      ...prev,
      [targetDayId]: true,
    }));
  }, [selectedWeekId, selectedDayIdFromQuery, autoComposeFromQuery, visibleGroups]);

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

  useEffect(() => {
    if (!isAdmin) return;
    const weeksMissingDays = visibleGroups.filter(
      ({ week, days }) => !days.length && !autoSeededWeekIdsRef.current.has(week.id),
    );
    if (!weeksMissingDays.length) return;

    weeksMissingDays.forEach(({ week }) => {
      autoSeededWeekIdsRef.current.add(week.id);
      createDaysForWeek(week.id).catch(() => {
        autoSeededWeekIdsRef.current.delete(week.id);
      });
    });
  }, [isAdmin, visibleGroups]);

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
        <SelectedWeekFilterBanner
          selectedWeekId={selectedWeekId}
          onlySelectedWeek={onlySelectedWeek}
          onToggleOnlySelectedWeek={setOnlySelectedWeek}
        />
        {dailyError && (
          <div className="mt-3 text-xs rounded-md border border-red-200 bg-red-50 text-red-700 px-2.5 py-2">
            {dailyError}
          </div>
        )}
        <DailyTopPrioritiesCard
          topTasks={topTasks}
          dailyPriorities={state.dailyPriorities}
          updatingTopTaskId={updatingTopTaskId}
          onToggleTaskStatus={(taskId, done) => updateTaskStatus(taskId, done ? 'done' : 'todo')}
        />
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
        <div className="space-y-5">
          {visibleGroups.map(({ week, days }) => (
            <div key={week.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
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
                {days.length > 0 && (
                  <>
                    <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                      <div className="flex flex-wrap gap-2.5">
                        {days.slice(0, 7).map((day, index) => {
                          const selectedDayId = selectedDayByWeek[week.id] || days[0].id;
                          const isSelected = selectedDayId === day.id;
                          const startDate = getSundayStart(getWeekStartDate(week, days));
                          const dayInfo = getDayDisplay(startDate, index);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() =>
                                setSelectedDayByWeek((prev) => ({
                                  ...prev,
                                  [week.id]: day.id,
                                }))
                              }
                              className={`min-w-[92px] rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                                isSelected
                                  ? 'border-brand-red/25 bg-gradient-to-br from-brand-red/10 via-white to-brand-navy/10 text-brand-navy shadow-[0_16px_28px_rgba(230,28,33,0.12)] ring-1 ring-brand-red/10'
                                  : 'border-slate-200/80 bg-white text-slate-600 hover:border-brand-red/20 hover:bg-slate-50'
                              }`}
                            >
                              <div className="text-[11px] font-semibold uppercase tracking-[0.22em]">{dayInfo.weekday}</div>
                              <div className={`mt-1 text-sm font-semibold ${isSelected ? 'text-brand-red' : 'text-slate-700'}`}>{dayInfo.dateText}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {(() => {
                      const selectedDayId = selectedDayByWeek[week.id] || days[0].id;
                      const selectedDay = days.find((d) => d.id === selectedDayId) || days[0];
                      const startDate = getSundayStart(getWeekStartDate(week, days));
                      const selectedIndex = Math.max(0, days.findIndex((d) => d.id === selectedDay.id));
                      const selectedDayInfo = getDayDisplay(startDate, selectedIndex);
                      const assignmentsForDay = allSpacesTasks.filter(
                        (task) => String(task?.customFields?.dailyGoalId || '').trim() === selectedDay.id,
                      );
                      return (
                        <div className="rounded-[30px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-[0_22px_48px_rgba(15,23,42,0.06)]">
                          <label className="flex items-start gap-3 rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-4 shadow-sm">
                            <input
                              type="checkbox"
                              checked={selectedDay.completed}
                              onChange={() => toggleDaily(selectedDay.id)}
                              disabled={!isAdmin}
                              className="mt-1 h-4 w-4 rounded border-slate-300 accent-brand-green"
                            />
                            <input
                              type="text"
                              value={selectedDay.text}
                              onChange={(e) => updateDailyText(selectedDay.id, e.target.value)}
                              readOnly={!isAdmin}
                              className="flex-1 bg-transparent border-b border-slate-200 pb-2 text-base font-semibold text-slate-900 outline-none transition focus:border-brand-red"
                            />
                          </label>
                          <div className="mt-3 inline-flex items-center rounded-full border border-brand-navy/10 bg-brand-navy/[0.04] px-3 py-1 text-[11px] font-medium text-slate-600">
                            {selectedDayInfo.weekday} · {selectedDayInfo.dateText}
                          </div>
                          <div className="mt-4 rounded-[24px] border border-brand-red/10 bg-gradient-to-r from-white via-slate-50 to-brand-red/[0.04] px-4 py-4 shadow-[0_18px_36px_rgba(15,23,42,0.05)]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-red">Task Assignment</div>
                                <div className="mt-1 text-[12px] font-medium text-slate-600">{assignmentScopeLabel}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setTaskComposerOpenByDay((prev) => ({
                                    ...prev,
                                    [selectedDay.id]: !prev[selectedDay.id],
                                  }))
                                }
                                className="rounded-full bg-brand-red px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(230,28,33,0.2)] transition-all duration-200 hover:bg-brand-navy"
                              >
                                {taskComposerOpenByDay[selectedDay.id] ? 'Close Task' : 'Add Task'}
                              </button>
                            </div>
                          </div>
                          {taskComposerOpenByDay[selectedDay.id] ? (
                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                              <input
                                type="text"
                                value={assignDraftByDay[selectedDay.id]?.title ?? selectedDay.text ?? ''}
                                onChange={(e) =>
                                  setAssignDraftByDay((prev) => ({
                                    ...prev,
                                    [selectedDay.id]: {
                                      title: e.target.value,
                                      assigneeId: prev[selectedDay.id]?.assigneeId || me.empId || '',
                                      dueDate: prev[selectedDay.id]?.dueDate || '',
                                      priority: prev[selectedDay.id]?.priority || 'medium',
                                      status: prev[selectedDay.id]?.status || 'todo',
                                    },
                                  }))
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-red/40 focus:ring-4 focus:ring-brand-red/10"
                                placeholder="Task title for TaskHub"
                              />
                              <select
                                value={assignDraftByDay[selectedDay.id]?.assigneeId ?? me.empId ?? ''}
                                onChange={(e) =>
                                  setAssignDraftByDay((prev) => ({
                                    ...prev,
                                    [selectedDay.id]: {
                                      title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '',
                                      assigneeId: e.target.value,
                                      dueDate: prev[selectedDay.id]?.dueDate || '',
                                      priority: prev[selectedDay.id]?.priority || 'medium',
                                      status: prev[selectedDay.id]?.status || 'todo',
                                    },
                                  }))
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-red/40 focus:ring-4 focus:ring-brand-red/10"
                              >
                                {assignableEmployees.map((emp) => (
                                  <option key={emp.empId} value={emp.empId}>
                                    {emp.empName || emp.empId}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="date"
                                value={assignDraftByDay[selectedDay.id]?.dueDate ?? ''}
                                onChange={(e) =>
                                  setAssignDraftByDay((prev) => ({
                                    ...prev,
                                    [selectedDay.id]: {
                                      title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '',
                                      assigneeId: prev[selectedDay.id]?.assigneeId || me.empId || '',
                                      dueDate: e.target.value,
                                      priority: prev[selectedDay.id]?.priority || 'medium',
                                      status: prev[selectedDay.id]?.status || 'todo',
                                    },
                                  }))
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-red/40 focus:ring-4 focus:ring-brand-red/10"
                              />
                              <select
                                value={assignDraftByDay[selectedDay.id]?.priority ?? 'medium'}
                                onChange={(e) =>
                                  setAssignDraftByDay((prev) => ({
                                    ...prev,
                                    [selectedDay.id]: {
                                      title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '',
                                      assigneeId: prev[selectedDay.id]?.assigneeId || me.empId || '',
                                      dueDate: prev[selectedDay.id]?.dueDate || '',
                                      priority: e.target.value,
                                      status: prev[selectedDay.id]?.status || 'todo',
                                    },
                                  }))
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-red/40 focus:ring-4 focus:ring-brand-red/10"
                              >
                                <option value="low">Priority: Low</option>
                                <option value="medium">Priority: Medium</option>
                                <option value="high">Priority: High</option>
                              </select>
                              <select
                                value={assignDraftByDay[selectedDay.id]?.status ?? 'todo'}
                                onChange={(e) =>
                                  setAssignDraftByDay((prev) => ({
                                    ...prev,
                                    [selectedDay.id]: {
                                      title: prev[selectedDay.id]?.title ?? selectedDay.text ?? '',
                                      assigneeId: prev[selectedDay.id]?.assigneeId || me.empId || '',
                                      dueDate: prev[selectedDay.id]?.dueDate || '',
                                      priority: prev[selectedDay.id]?.priority || 'medium',
                                      status: e.target.value,
                                    },
                                  }))
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-red/40 focus:ring-4 focus:ring-brand-red/10"
                              >
                                <option value="todo">Status: To Do</option>
                                <option value="doing">Status: Doing</option>
                                <option value="review">Status: Review</option>
                                <option value="blocked">Status: Blocked</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => createTaskFromDay(selectedDay, week)}
                                disabled={assigningDayTaskId === selectedDay.id}
                                className="rounded-2xl bg-gradient-to-r from-brand-red to-[#c8181d] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(230,28,33,0.24)] transition-all duration-200 hover:from-[#d8191e] hover:to-brand-red disabled:opacity-60 md:col-span-3"
                              >
                                {assigningDayTaskId === selectedDay.id ? 'Assigning...' : 'Create & Assign Task'}
                              </button>
                            </div>
                          ) : null}
                          <div className="mt-4 rounded-[26px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-3.5">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                              Assigned employees and tasks for this day
                            </div>
                            <div className="space-y-2.5">
                              {assignmentsForDay.length ? (
                                assignmentsForDay.map((task) => (
                                  <div
                                    key={task.taskId}
                                    className="rounded-2xl border border-white bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_14px_28px_rgba(15,23,42,0.05)]"
                                  >
                                    <div className="font-semibold text-slate-900">{task.title || 'Untitled task'}</div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 ${getAssignmentStatusBadge(task.status)}`}>
                                        {formatAssignmentStatusLabel(task.status)}
                                      </span>
                                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 ${getAssignmentPriorityBadge(task.priority)}`}>
                                        {formatAssignmentPriorityLabel(task.priority)}
                                      </span>
                                    </div>
                                    <div className="mt-2 inline-flex items-center rounded-full border border-brand-red/10 bg-brand-red/5 px-2.5 py-1 text-[11px] font-semibold text-brand-red">
                                      {employeeNameById.get(task.assigneeId) || task.assigneeId || 'Unassigned'}
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500">
                                      {employeeNameById.get(task.assigneeId) || task.assigneeId || 'Unassigned'} · {task.status || 'todo'} · {task.priority || 'medium'}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-500">No task assigned for this day yet.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
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
