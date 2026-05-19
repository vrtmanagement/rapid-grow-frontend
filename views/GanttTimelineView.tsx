import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProjectGantt, fetchProjectOptions, type ProjectOption } from '../services/p4Api';

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const GanttTimelineView: React.FC = () => {
  const [params, setSearchParams] = useSearchParams();
  const initialProjectId = params.get('projectId') || '';
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [projectId, setProjectId] = useState(initialProjectId);
  const [data, setData] = useState<any>(null);
  const [ganttLoading, setGanttLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedProject = projects.find((p) => p.id === projectId);
  const tasks = data?.tasks || [];

  const chart = useMemo(() => {
    const dated = tasks
      .map((t: any) => ({ ...t, due: parseDate(t.dueDate) }))
      .filter((t: any) => t.due);
    if (dated.length === 0) return null;

    const min = new Date(Math.min(...dated.map((t: any) => t.due!.getTime())));
    const max = new Date(Math.max(...dated.map((t: any) => t.due!.getTime())));
    const span = Math.max(max.getTime() - min.getTime(), 24 * 60 * 60 * 1000);

    return {
      min,
      max,
      rows: dated.map((t: any) => {
        const start = min.getTime();
        const end = t.due!.getTime();
        const left = ((end - start) / span) * 100;
        return { task: t, left: Math.min(Math.max(left, 2), 98) };
      }),
    };
  }, [tasks]);

  const loadGantt = useCallback(async (id: string) => {
    if (!id.trim()) {
      setData(null);
      return;
    }
    setGanttLoading(true);
    setError('');
    try {
      const res = await fetchProjectGantt(id.trim());
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load timeline');
      setData(null);
    } finally {
      setGanttLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProjectsLoading(true);
      setProjectsError('');
      try {
        const list = await fetchProjectOptions();
        if (cancelled) return;
        setProjects(list);
        if (!initialProjectId && list.length > 0) setProjectId(list[0].id);
      } catch (e: any) {
        if (!cancelled) setProjectsError(e.message || 'Failed to load projects');
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialProjectId]);

  useEffect(() => {
    if (!projectId || projectsLoading) return;
    setSearchParams(projectId ? { projectId } : {}, { replace: true });
    void loadGantt(projectId);
  }, [projectId, projectsLoading, loadGantt, setSearchParams]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Project timeline</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Visual schedule by due date. Select a project from the list.
        </p>
      </header>

      <section className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 min-w-[280px] flex-1 max-w-md">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Project</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={projectsLoading || projects.length === 0}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 disabled:opacity-60"
          >
            {projectsLoading && <option value="">Loading projects…</option>}
            {!projectsLoading && projects.length === 0 && <option value="">No projects found</option>}
            {!projectsLoading &&
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
      </section>

      {projectsError && <p className="text-sm text-red-600">{projectsError}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ganttLoading && <p className="text-sm text-slate-500">Loading timeline…</p>}

      {!ganttLoading && data?.budget && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Budget: {data.budget.actual} / {data.budget.planned} {data.budget.currency}
        </p>
      )}

      {!ganttLoading && projectId && (
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 dark:border-slate-700">
          {selectedProject && (
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">{selectedProject.name}</h2>
          )}

          {chart && (
            <section className="mb-8 overflow-x-auto">
              <p className="text-xs text-slate-500 mb-2">
                Timeline {chart.min.toLocaleDateString()} — {chart.max.toLocaleDateString()}
              </p>
              <div className="min-w-[520px] space-y-2">
                {chart.rows.map((row: any) => (
                  <article key={row.task.taskId || row.task._id} className="grid grid-cols-[140px_1fr] gap-2 items-center">
                    <p className="text-xs font-medium truncate text-slate-700 dark:text-slate-300" title={row.task.title}>
                      {row.task.title}
                    </p>
                    <div className="relative h-7 rounded-full bg-slate-100 dark:bg-slate-800">
                      <span
                        className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-indigo-500 shadow"
                        style={{ left: `calc(${row.left}% - 8px)` }}
                        title={row.task.dueDate}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <ul className="space-y-3">
            {tasks.map((task: any) => (
              <li key={task.taskId || task._id} className="relative pl-4 border-l-2 border-indigo-300">
                <p className="font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                <p className="text-xs text-slate-500">
                  {task.status}
                  {task.dueDate ? ` · due ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                  {task.blockedByTaskIds?.length ? ` · blocked by ${task.blockedByTaskIds.length}` : ''}
                </p>
              </li>
            ))}
            {tasks.length === 0 && data && (
              <li className="text-sm text-slate-500">No tasks linked to this project yet.</li>
            )}
          </ul>
        </section>
      )}
    </section>
  );
};

export default GanttTimelineView;
