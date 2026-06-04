import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PlanningState } from '../types';
import { Target, TrendingUp, Award, Users, CheckCircle2, Zap, User, UserPlus, Shield, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../config/api';
import { fetchSpacesList, SPACES_PLANNER_FETCH_LIMIT } from '../services/spacesApi';
import { AdminCardGridSkeleton, SkeletonBlock } from '../components/ui/Skeleton';
import ExecutionMatrix from '../components/dashboard/ExecutionMatrix';
import PageSectionSubnav from '../components/layout/PageSectionSubnav';
import { usePermissions } from '../context/usePermissions';
import { getSocket } from '../realtime/socket';
import {
  buildCommandMatrixTopPriorityTasks,
  buildEmployeeNameLookup,
  enrichTasksWithEmployeeNames,
  isTaskAssignedToViewer,
  normalizeRole,
  resolveAssigneeLabel,
  TASKHUB_TOP_PRIORITY_LIMIT,
  COMMAND_MATRIX_DISPLAY_LIMIT,
  type BackendRole,
  type EmployeeOption,
  type SpacesTask,
  type TaskStatus,
} from './spacesViewHelpers';

interface Props {
  state: PlanningState;
  loading?: boolean;
}

interface EmployeeRow {
  _id: string;
  empId: string;
  empName: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
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

function buildAssignableTeamMemberIds(
  employees: EmployeeOption[],
  viewerEmpId: string,
  viewerRole: BackendRole,
) {
  const ids = new Set<string>();
  if (viewerEmpId) ids.add(viewerEmpId);

  const role = normalizeRole(viewerRole);
  employees.forEach((employee) => {
    const empId = String(employee.empId || '').trim();
    if (!empId) return;
    const memberRole = normalizeRole(employee.role || 'EMPLOYEE');
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      if (memberRole === 'TEAM_LEAD' || memberRole === 'EMPLOYEE' || empId === viewerEmpId) {
        ids.add(empId);
      }
      return;
    }
    if (role === 'TEAM_LEAD') {
      if (memberRole === 'EMPLOYEE' || empId === viewerEmpId) {
        ids.add(empId);
      }
    }
  });

  return ids;
}

const DashboardView: React.FC<Props> = ({ state, loading = false }) => {
  const backendRole = String(getStoredAuthSession()?.employee?.role || '').toUpperCase();
  const defaultScope: 'individual' | 'team' =
    backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN' || backendRole === 'TEAM_LEAD' ? 'team' : 'individual';
  const [viewScope, setViewScope] = useState<'individual' | 'team'>(defaultScope);
  const [allAdmins, setAllAdmins] = useState<EmployeeRow[]>([]);
  const [adminsLoaded, setAdminsLoaded] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<EmployeeRow | null>(null);
  const [taskHubTasks, setTaskHubTasks] = useState<SpacesTask[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const isSuperAdmin = state.currentUser.role === 'Admin' && state.currentUser.powers?.includes('EDIT_STRATEGY');
  const canViewExecutionMatrix = state.currentUser.role === 'Admin' || hasPermission('EXECUTION_MATRIX_VIEW');
  const viewerEmpId = String(getStoredAuthSession()?.employee?.empId || '').trim();

  useEffect(() => {
    if (!isSuperAdmin) return;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const list: EmployeeRow[] = Array.isArray(data) ? data : [];
          const adminsOnly = list.filter(
            (e) => (e.role || '').toUpperCase() === 'SUPER_ADMIN' || (e.role || '').toUpperCase() === 'ADMIN'
          );
          setAllAdmins(adminsOnly);
        }
      } catch (e) {
        console.error('Failed to load employees', e);
      } finally {
        setAdminsLoaded(true);
      }
    };
    load();
  }, [isSuperAdmin]);

  const loadTaskHubTasks = useCallback(async (options: { silent?: boolean } = {}) => {
    if (isSuperAdmin) return;
    if (!options.silent) {
      setTasksLoading(true);
      setTasksError(null);
    }
    try {
      const [spacesPayload, employeesRes] = await Promise.all([
        fetchSpacesList({
          scope: 'planner',
          page: 1,
          limit: SPACES_PLANNER_FETCH_LIMIT,
          filter: 'all',
          sync: '1',
        }),
        fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() }),
      ]);

      const tasks = Array.isArray(spacesPayload?.tasks) ? (spacesPayload.tasks as SpacesTask[]) : [];
      setTaskHubTasks(tasks);

      if (employeesRes.ok) {
        const employeePayload = await employeesRes.json().catch(() => []);
        const list = Array.isArray(employeePayload) ? employeePayload : [];
        setEmployees(
          list
            .map((entry: any) => ({
              empId: String(entry.empId || entry._id || '').trim(),
              empName: String(entry.empName || entry.name || '').trim(),
              role: (entry.role || 'EMPLOYEE') as BackendRole,
              _id: entry._id ? String(entry._id) : undefined,
            }))
            .filter((entry: EmployeeOption & { _id?: string }) => entry.empId),
        );
      } else {
        setEmployees([]);
      }
    } catch (error: any) {
      setTasksError(error?.message || 'Failed to load TaskHub tasks');
      setTaskHubTasks([]);
      setEmployees([]);
    } finally {
      if (!options.silent) setTasksLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) return;
    void loadTaskHubTasks();
  }, [isSuperAdmin, loadTaskHubTasks]);

  useEffect(() => {
    if (isSuperAdmin) return;
    const socket = getSocket();
    const refresh = () => void loadTaskHubTasks({ silent: true });
    socket.on('spaces:changed', refresh);
    socket.on('taskAssigned', refresh);
    socket.on('task:validation', refresh);
    socket.on('performance:update', refresh);
    return () => {
      socket.off('spaces:changed', refresh);
      socket.off('taskAssigned', refresh);
      socket.off('task:validation', refresh);
      socket.off('performance:update', refresh);
    };
  }, [isSuperAdmin, loadTaskHubTasks]);

  const scopedTasks = useMemo(() => {
    if (viewScope === 'team') return taskHubTasks;
    return taskHubTasks.filter((task) => isTaskAssignedToViewer(task, viewerEmpId));
  }, [taskHubTasks, viewScope, viewerEmpId]);

  const completedCount = scopedTasks.filter((task) => normalizeTaskStatus(task.status) === 'done').length;
  const openCount = scopedTasks.filter((task) => normalizeTaskStatus(task.status) !== 'done').length;
  const highPriorityCount = scopedTasks.filter(
    (task) => task.priority === 'high' && normalizeTaskStatus(task.status) !== 'done',
  ).length;
  const totalCount = scopedTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const teamMemberEmpIds = useMemo(
    () => buildAssignableTeamMemberIds(employees, viewerEmpId, backendRole as BackendRole),
    [employees, viewerEmpId, backendRole],
  );

  const employeeById = useMemo(() => {
    const map = new Map<string, EmployeeOption>();
    employees.forEach((employee) => map.set(employee.empId, employee));
    return map;
  }, [employees]);

  const employeeNameById = useMemo(() => buildEmployeeNameLookup(employees), [employees]);

  const taskHubTasksWithNames = useMemo(
    () => enrichTasksWithEmployeeNames(taskHubTasks, employeeNameById),
    [taskHubTasks, employeeNameById],
  );

  const priorityPanelTasksAll = useMemo(
    () =>
      buildCommandMatrixTopPriorityTasks({
        tasks: taskHubTasksWithNames,
        viewerEmpId,
        viewerRole: backendRole as BackendRole,
        employees,
        teamMemberEmpIds,
        employeeById,
        viewScope,
      }),
    [
      taskHubTasksWithNames,
      viewerEmpId,
      backendRole,
      employees,
      teamMemberEmpIds,
      employeeById,
      viewScope,
    ],
  );

  const priorityPanelTasks = useMemo(
    () => priorityPanelTasksAll.slice(0, COMMAND_MATRIX_DISPLAY_LIMIT),
    [priorityPanelTasksAll],
  );

  const priorityPanelHasMore = priorityPanelTasksAll.length > COMMAND_MATRIX_DISPLAY_LIMIT;

  const priorityPanelSubtitle = useMemo(() => {
    const count = priorityPanelTasks.length;
    const label = count === 1 ? 'task' : 'tasks';
    const limitNote = `up to ${TASKHUB_TOP_PRIORITY_LIMIT} per person`;
    if (backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN') {
      return `${count} TaskHub Top Priorities ${label} · everyone in your org`;
    }
    if (backendRole === 'TEAM_LEAD') {
      return `${count} TaskHub Top Priorities ${label} · your team`;
    }
    return `${count} TaskHub Top Priorities ${label} · yours`;
  }, [priorityPanelTasks.length, backendRole]);

  const showScopeToggle = backendRole !== 'ADMIN' && backendRole !== 'SUPER_ADMIN' && backendRole !== 'TEAM_LEAD';

  function formatStatusLabel(status: TaskStatus) {
    if (status === 'todo') return 'To do';
    if (status === 'doing') return 'In progress';
    if (status === 'review') return 'In review';
    if (status === 'done') return 'Done';
    if (status === 'blocked') return 'Blocked';
    return status;
  }
  const showTaskHubSkeleton = loading || tasksLoading;

  if (loading) {
    return isSuperAdmin ? (
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 animate-pulse">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-slate-200" />
              <div className="h-4 w-40 rounded-full bg-slate-100" />
            </div>
            <div className="h-10 w-48 rounded-full bg-slate-200" />
            <div className="h-5 w-72 max-w-full rounded-full bg-slate-100" />
          </div>
          <SkeletonBlock className="h-12 w-40 rounded-xl" />
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200 space-y-6 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-200" />
            <div className="space-y-2">
              <div className="h-5 w-48 rounded-full bg-slate-200" />
              <div className="h-4 w-32 rounded-full bg-slate-100" />
            </div>
          </div>
          <AdminCardGridSkeleton count={3} />
        </div>
      </div>
    ) : (
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 animate-pulse">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-slate-200" />
              <div className="h-4 w-40 rounded-full bg-slate-100" />
            </div>
            <div className="h-10 w-64 rounded-full bg-slate-200" />
            <div className="h-5 w-80 max-w-full rounded-full bg-slate-100" />
          </div>
          <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xl">
            <SkeletonBlock className="h-12 w-32 rounded-xl" />
            <SkeletonBlock className="h-12 w-36 rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`dashboard-stat-skeleton-${index}`} className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 flex items-start gap-8 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 shrink-0" />
              <div className="space-y-3 flex-1">
                <div className="h-4 w-28 rounded-full bg-slate-100" />
                <div className="h-9 w-24 rounded-full bg-slate-200" />
                <div className="h-4 w-24 rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white p-12 rounded-[2rem] shadow-2xl border border-slate-200 animate-pulse">
            <div className="flex items-center justify-between mb-12">
              <div className="space-y-3">
                <div className="h-8 w-52 rounded-full bg-slate-200" />
                <div className="h-4 w-56 rounded-full bg-slate-100" />
              </div>
              <SkeletonBlock className="h-10 w-40 rounded-xl" />
            </div>
            <div className="h-[380px] w-full rounded-[2rem] bg-slate-50 border border-slate-100 p-8">
              <div className="h-full flex items-end gap-6">
                {[28, 44, 36, 58, 42, 64].map((height, index) => (
                  <div key={`dashboard-bar-skeleton-${index}`} className="flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-2xl bg-slate-200"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-slate-900 p-12 rounded-[2rem] shadow-2xl animate-pulse">
            <div className="flex items-center justify-between mb-10">
              <div className="h-6 w-32 rounded-full bg-white/10" />
              <div className="w-8 h-8 rounded-full bg-white/10" />
            </div>
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`ops-skeleton-${index}`} className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                    <div className="h-4 w-32 rounded-full bg-white/10" />
                  </div>
                  <div className="h-3 w-10 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
            <div className="mt-10 pt-10 border-t border-white/10">
              <div className="h-14 w-full rounded-xl bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageSectionSubnav
        innerClassName="gap-1.5 py-1 lg:min-h-[46px] lg:gap-3"
        leading={
          <>
            <div className="h-1.5 w-8 rounded-full bg-brand-red" />
            <span className="text-[14px] font-medium text-slate-600">Executive Performance Hub</span>
          </>
        }
        trailing={
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <Link
              to="/employees/add"
              className="flex items-center gap-2.5 rounded-xl bg-brand-red px-5 py-2 text-[13px] font-bold text-white shadow-lg transition-all hover:bg-brand-navy"
            >
              <UserPlus size={16} /> {isSuperAdmin ? 'Add Branch' : 'Add Emp'}
            </Link>
            {!isSuperAdmin && showScopeToggle ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button
                  onClick={() => setViewScope('individual')}
                  className={`flex items-center gap-2.5 rounded-lg px-5 py-2 text-[13px] transition-all ${
                    viewScope === 'individual' ? 'bg-brand-red text-white shadow-lg' : 'text-slate-800 hover:text-brand-red'
                  }`}
                >
                  <User size={15} /> Individual
                </button>
                <button
                  onClick={() => setViewScope('team')}
                  className={`flex items-center gap-2.5 rounded-lg px-5 py-2 text-[13px] transition-all ${
                    viewScope === 'team' ? 'bg-brand-red text-white shadow-lg' : 'text-slate-800 hover:text-brand-red'
                  }`}
                >
                  <Users size={15} /> Team Dynamics
                </button>
              </div>
            ) : null}
          </div>
        }
      />
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      {isSuperAdmin && (
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-red/10 flex items-center justify-center">
              <Shield className="text-brand-red" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Admins & Super Admins</h3>
              <p className="text-sm text-slate-500">Super Admins and Admins only</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {!adminsLoaded && (
              <div className="col-span-full">
                <AdminCardGridSkeleton count={3} />
              </div>
            )}
            {adminsLoaded && allAdmins.length === 0 && (
              <p className="col-span-full text-slate-500 py-8 text-center">No admins found.</p>
            )}
            {allAdmins.map((emp) => (
              <button
                key={emp._id}
                type="button"
                onClick={() => setSelectedAdmin(emp)}
                className="w-full text-left flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-brand-red/30 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-red/30"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-brand-red font-bold text-lg shrink-0">
                  {(emp.empName || emp.empId || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">{emp.empName || emp.empId}</p>
                  <p className="text-xs text-slate-500 truncate">{emp.empId}</p>
                  {(emp.role || emp.designation) && (
                    <p className="text-xs text-brand-red font-medium mt-0.5">{emp.role || emp.designation}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isSuperAdmin && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedAdmin(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Admin Details</h3>
              <button
                type="button"
                onClick={() => setSelectedAdmin(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red font-bold text-2xl">
                  {(selectedAdmin.empName || selectedAdmin.empId || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{selectedAdmin.empName || selectedAdmin.empId}</p>
                  <p className="text-sm text-brand-red font-semibold">{selectedAdmin.role || '—'}</p>
                </div>
              </div>
              {[
                { label: 'Employee ID', value: selectedAdmin.empId },
                { label: 'Email', value: selectedAdmin.email },
                { label: 'Phone', value: selectedAdmin.phone },
                { label: 'Designation', value: selectedAdmin.designation },
                { label: 'Department', value: selectedAdmin.department },
                { label: 'Status', value: selectedAdmin.status },
                { label: 'Created At', value: selectedAdmin.createdAt ? new Date(selectedAdmin.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true }) : null },
              ].filter((r) => r.value).map((row) => (
                <div key={row.label} className="flex justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{row.label}</span>
                  <span className="text-sm font-medium text-slate-900 text-right">{String(row.value)}</span>
                </div>
              ))}
              {Object.entries(selectedAdmin)
                .filter(([k]) => !['_id', 'empId', 'empName', 'email', 'phone', 'designation', 'department', 'role', 'status', 'createdAt'].includes(k))
                .filter(([, v]) => v != null && v !== '')
                .map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-500">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</span>
                    <span className="text-sm font-medium text-slate-900 text-right">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {!isSuperAdmin && (
        <>
          <div>
            <h2 className="text-3xl text-slate-900 leading-none">{state.uiConfig.dashboardTitle}</h2>
            <p className="text-slate-500 text-lg mt-3">{state.uiConfig.dashboardSub}</p>
            <p className="text-slate-400 text-sm mt-2">
              Stats from TaskHub. The list below mirrors each person&apos;s TaskHub Top Priorities
              {backendRole === 'TEAM_LEAD'
                ? ' for your team.'
                : backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN'
                  ? ' across your organization.'
                  : viewScope === 'team'
                    ? ' for your team.'
                    : ' assigned to you.'}
            </p>
          </div>

          {tasksError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
              {tasksError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {showTaskHubSkeleton ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`dashboard-stat-skeleton-${index}`}
                  className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 flex items-start gap-8 animate-pulse"
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 shrink-0" />
                  <div className="space-y-3 flex-1">
                    <div className="h-4 w-28 rounded-full bg-slate-100" />
                    <div className="h-9 w-16 rounded-full bg-slate-200" />
                    <div className="h-4 w-24 rounded-full bg-slate-100" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <StatCard icon={<CheckCircle2 className="text-brand-red" />} label="Tasks completed" value={completedCount} sub="Marked done in TaskHub" color="bg-red-50" />
                <StatCard icon={<TrendingUp className="text-slate-600" />} label="Open tasks" value={openCount} sub="Still in progress" color="bg-slate-100" />
                <StatCard icon={<Award className="text-brand-red" />} label="High priority" value={highPriorityCount} sub="Open high-priority items" color="bg-red-50" />
                <StatCard icon={<Zap className="text-amber-500" />} label="Completion rate" value={`${progressPercent}%`} sub="Done vs total" color="bg-amber-50" />
              </>
            )}
          </div>

          <div className="grid gap-8">
            <div className="bg-slate-900 p-8 sm:p-10 rounded-[2rem] text-white shadow-2xl relative overflow-hidden flex flex-col group">
               <div className="absolute top-0 right-0 w-full h-1.5 bg-brand-red"></div>
               <div className="relative z-10 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4 mb-6">
                   <div>
                     <h3 className="text-xl tracking-tight text-white">TaskHub Top Priorities</h3>
                     {!showTaskHubSkeleton && (
                       <p className="mt-1 text-sm text-slate-400">{priorityPanelSubtitle}</p>
                     )}
                   </div>
                   <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-brand-red shrink-0">
                      <Target size={16} />
                   </div>
                 </div>
                 <div className="max-h-[min(520px,65vh)] overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                   {showTaskHubSkeleton &&
                     Array.from({ length: 6 }).map((_, index) => (
                       <div key={`recent-task-skeleton-${index}`} className="flex items-start gap-3 border-b border-white/5 py-3 animate-pulse">
                         <div className="mt-2 h-2 w-2 rounded-full bg-white/10 shrink-0" />
                         <div className="flex-1 space-y-2">
                           <div className="h-4 w-full max-w-md rounded-full bg-white/10" />
                           <div className="h-3 w-24 rounded-full bg-white/10" />
                         </div>
                       </div>
                     ))}
                   {!showTaskHubSkeleton &&
                     priorityPanelTasks.map((task) => {
                       const status = normalizeTaskStatus(task.status);
                       const showAssignee =
                         backendRole === 'ADMIN' ||
                         backendRole === 'SUPER_ADMIN' ||
                         backendRole === 'TEAM_LEAD';
                       return (
                         <Link
                           key={task.taskId}
                           to={`/spaces/task/${task.taskId}`}
                           className="flex items-start gap-3 border-b border-white/5 py-3 last:border-b-0 hover:bg-white/5 rounded-lg px-1 -mx-1 transition-colors"
                         >
                           <div className="mt-2 h-2 w-2 rounded-full shrink-0 bg-brand-red" />
                           <div className="min-w-0 flex-1">
                             <p className="text-[15px] leading-snug text-slate-100 break-words">
                               {task.title}
                             </p>
                             {(showAssignee && task.assigneeId) || task.dueDate ? (
                               <p className="mt-1 text-xs text-slate-500">
                                 {showAssignee && task.assigneeId
                                   ? resolveAssigneeLabel(task.assigneeId, task.assigneeName, employeeNameById)
                                   : null}
                                 {showAssignee && task.assigneeId && task.dueDate ? ' · ' : null}
                                 {task.dueDate ? `Due ${task.dueDate}` : null}
                               </p>
                             ) : null}
                           </div>
                           <span
                             className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${
                               task.priority === 'high'
                                 ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                                 : task.priority === 'medium'
                                   ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
                                   : 'border-white/10 bg-white/5 text-slate-300'
                             }`}
                           >
                             {task.priority}
                           </span>
                           <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                             {formatStatusLabel(status)}
                           </span>
                         </Link>
                       );
                     })}
                   {!showTaskHubSkeleton && priorityPanelHasMore ? (
                     <p className="border-t border-white/10 pt-4 text-center text-sm text-slate-400">
                       Many tasks in TaskHub.{' '}
                       <Link to="/spaces" className="font-semibold text-brand-red hover:text-white">
                         Open TaskHub
                       </Link>{' '}
                       to see the full list.
                     </p>
                   ) : null}
                   {!showTaskHubSkeleton && priorityPanelTasks.length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-slate-400 text-md">No Top Priorities right now</p>
                      <p className="text-slate-500 text-sm mt-2">
                        {backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN'
                          ? 'Shows the same tasks as each person’s TaskHub Top Priorities section.'
                          : backendRole === 'TEAM_LEAD'
                            ? 'Your team has no active items in their Top Priorities lists.'
                            : 'You have no active items in your TaskHub Top Priorities.'}
                      </p>
                    </div>
                   )}
                 </div>
               </div>
               <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
                  <Link
                    to="/spaces"
                    className="block w-full py-5 bg-brand-red text-white rounded-xl text-center text-[15px] shadow-xl hover:bg-white hover:text-brand-red transition-all"
                  >
                     Open TaskHub
                  </Link>
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
          </div>
        </>
      )}
      </div>
    </>
  );
};

const StatCard = ({ icon, label, value, sub, color }: any) => (
      <div className={`bg-white p-10 rounded-3xl shadow-sm border border-slate-200 flex items-start gap-8 transition-all hover:shadow-2xl hover:border-brand-red group`}>
    <div className={`p-5 ${color} rounded-2xl group-hover:scale-110 transition-transform`}>{icon}</div>
      <div className="flex flex-col">
      <p className="text-[15px] text-slate-800 mb-3">{label}</p>
      <p className="text-3xl text-slate-900 leading-none">{value}</p>
      <p className="text-[15px] font-bold text-slate-500 mt-3">{sub}</p>
    </div>
  </div>
);

export default DashboardView;
