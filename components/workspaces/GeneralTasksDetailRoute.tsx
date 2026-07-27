import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WorkspaceTask } from '../../types';
import { TaskAnalyticsPanel } from '../../views/TaskAnalyticsView';
import { computeProjectTaskMetrics } from '../project-charter/projectCharterUtils';
import { fetchGeneralTasks } from '../../services/spacesApi';
import { hasTabEndpointCache } from '../../services/tabSessionCache';
import { getSocket } from '../../realtime/socket';
import { LinkedSpaceTaskRecord, normalizeGeneralTask } from './workspaceTaskUtils';

function GeneralMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <span className="text-brand-red">{icon}</span>
      </div>
      <p className="mt-2 text-[2rem] font-semibold leading-none text-slate-950">{value}</p>
    </div>
  );
}

export function GeneralTasksDetailRoute() {
  const [tasks, setTasks] = useState<Array<WorkspaceTask & { assigneeName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadGeneralTasks = async () => {
      const tasksPath = '/spaces?scope=general-tasks&sync=0';
      const hasCache = hasTabEndpointCache('workspaces', tasksPath);
      try {
        if (!hasCache) {
          setLoading(true);
        }
        setError(null);
        const data = await fetchGeneralTasks({ tabKey: 'workspaces' });
        const nextTasks = (Array.isArray(data?.tasks) ? data.tasks : [])
          .filter((task: LinkedSpaceTaskRecord) => !String(task?.projectId || '').trim())
          .map((task: LinkedSpaceTaskRecord) => normalizeGeneralTask(task))
          .filter((task: WorkspaceTask) => task.id)
          .sort((left: WorkspaceTask, right: WorkspaceTask) => {
            const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
            const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
            return rightTime - leftTime;
          });

        if (!cancelled) {
          setTasks(nextTasks);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load general tasks');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadGeneralTasks();

    const socket = getSocket();
    const onSpacesChanged = (payload: any) => {
      const action = String(payload?.action || '').trim();
      const projectId = String(payload?.task?.projectId || payload?.projectId || '').trim();
      if (['task_created', 'task_updated', 'task_deleted'].includes(action) && !projectId) {
        void loadGeneralTasks();
      }
    };

    socket.on('spaces:changed', onSpacesChanged);
    return () => {
      cancelled = true;
      socket.off('spaces:changed', onSpacesChanged);
    };
  }, []);

  const metrics = useMemo(() => computeProjectTaskMetrics(tasks), [tasks]);
  const openTasks = Math.max(metrics.total - metrics.completed, 0);
  const overdueTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.dueDate || task.status === 'done') return false;
        return new Date(task.dueDate).getTime() < Date.now();
      }).length,
    [tasks],
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/workspaces"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
          Back to project list
        </Link>
      </div>

      <section className="overflow-hidden rounded-[2.15rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-brand-red">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">General Tasks</h2>
              <p className="mt-1 text-sm text-slate-500">TaskHub work that is not linked to any project charter.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-5 py-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="rounded-[1.5rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-800 p-4 text-white shadow-sm">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">General task pool</span>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] xl:text-[2rem]">General Tasks</h1>
            <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-200">
              Use this view for standalone work items before they are connected to a project charter.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Latest activity</p>
            <p className="mt-2.5 text-base font-semibold leading-7 text-slate-950">
              {tasks[0] ? new Date(tasks[0].updatedAt || tasks[0].createdAt).toLocaleString() : 'No task activity yet'}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {loading ? 'Loading general tasks...' : `${metrics.completed} of ${metrics.total} tasks completed`}
            </p>
          </div>
        </div>

        <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
          <GeneralMetric icon={<ListChecks size={18} />} label="Total tasks" value={loading ? '...' : metrics.total} />
          <GeneralMetric icon={<CheckCircle2 size={18} />} label="Completed" value={loading ? '...' : metrics.completed} />
          <GeneralMetric icon={<Clock3 size={18} />} label="Open tasks" value={loading ? '...' : openTasks} />
          <GeneralMetric icon={<Clock3 size={18} />} label="Open overdue" value={loading ? '...' : overdueTasks} />
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Progress</p>
              <p className="text-lg font-semibold text-slate-950">{loading ? '...' : `${metrics.progress}%`}</p>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-brand-red transition-all" style={{ width: `${loading ? 0 : metrics.progress}%` }} />
            </div>
          </div>
        </div>

        {error ? (
          <div className="border-t border-slate-100 px-5 py-5">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        ) : null}
      </section>

      <TaskAnalyticsPanel scope="general" label="General tasks" embedded />
    </div>
  );
}
