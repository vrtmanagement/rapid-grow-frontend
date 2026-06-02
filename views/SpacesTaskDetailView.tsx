import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Octagon } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../config/api';
import {
  canEditTaskForView,
  getLoggedInEmployee,
  isRecurringSeriesActive,
  isRecurringSeriesTask,
  normalizeTaskForUi,
  type SpacesTask,
} from './spacesViewHelpers';

interface Props {
  mode: 'employee' | 'manager';
}

function getDownloadableUrl(url: string): string {
  return String(url || '').trim();
}

async function downloadWithFallback(url: string, fileName?: string) {
  const href = getDownloadableUrl(url);
  if (!href) {
    throw new Error('Document URL is missing');
  }
  const query = new URLSearchParams({
    url: href,
    name: fileName || 'task-document',
  });
  const response = await fetch(`${API_BASE}/spaces/tasks/document-download?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Download request failed');
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName || 'task-document';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function normalizeStatusLabel(status?: string): string {
  const value = String(status || '')
    .trim()
    .toLowerCase();
  if (value === 'todo') return 'To Do';
  if (value === 'doing') return 'Doing';
  if (value === 'review') return 'Submitted';
  if (value === 'done') return 'Done';
  if (value === 'blocked') return 'Blocked';
  return status || '-';
}

const SpacesTaskDetailView: React.FC<Props> = ({ mode }) => {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();
  const me = useMemo(() => getLoggedInEmployee(), []);
  const [task, setTask] = useState<SpacesTask | null>(null);
  const [allTasks, setAllTasks] = useState<SpacesTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [stoppingRecurrence, setStoppingRecurrence] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTask = async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load task details');
      }
      const data = await res.json().catch(() => ({}));
      const tasks = Array.isArray(data?.tasks)
        ? data.tasks.map((item: SpacesTask) => normalizeTaskForUi(item))
        : [];
      const found = tasks.find((item) => item.taskId === taskId) || null;
      if (!found) {
        throw new Error('Task not found');
      }
      setAllTasks(tasks);
      setTask(found);
    } catch (e: any) {
      setError(e?.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTask();
  }, [taskId]);

  const showRecurringBadge = task ? isRecurringSeriesTask(task) : false;
  const showStopRepeating =
    Boolean(task) &&
    showRecurringBadge &&
    isRecurringSeriesActive(allTasks, task as SpacesTask) &&
    canEditTaskForView(task as SpacesTask, me, mode);

  const handleStopRepeating = async () => {
    if (!task || !showStopRepeating || stoppingRecurrence) return;
    setStoppingRecurrence(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${task.taskId}/recurrence/stop`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to stop repeating task');
      }

      const sourceTaskId = String(data.sourceTaskId || '').trim();
      if (sourceTaskId) {
        setAllTasks((prev) =>
          prev.map((item) => {
            if (item.taskId !== sourceTaskId) return item;
            return normalizeTaskForUi({
              ...item,
              recurrence: {
                ...(item.recurrence || {}),
                enabled: false,
                nextRunAt: null,
              },
            });
          }),
        );
        setTask((prev) => {
          if (!prev) return prev;
          if (prev.taskId === sourceTaskId) {
            return normalizeTaskForUi({
              ...prev,
              recurrence: {
                ...(prev.recurrence || {}),
                enabled: false,
                nextRunAt: null,
              },
            });
          }
          return prev;
        });
      } else if (data.task) {
        const normalized = normalizeTaskForUi(data.task as SpacesTask);
        setTask(normalized);
        setAllTasks((prev) => prev.map((item) => (item.taskId === normalized.taskId ? normalized : item)));
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to stop repeating task');
    } finally {
      setStoppingRecurrence(false);
    }
  };

  const projectLabel = useMemo(() => {
    if (!task?.projectId) return 'No project';
    return task.projectId;
  }, [task?.projectId]);

  const handleDownload = async () => {
    if (!task?.documentUrl) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadWithFallback(task.documentUrl, task.documentName || 'task-document');
    } catch (e: any) {
      setError(e?.message || 'Failed to download document');
    } finally {
      setDownloading(false);
    }
  };

  const dash = (value?: string | null) => {
    const s = String(value ?? '').trim();
    return s ? s : <span className="text-slate-400">-</span>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in duration-500">
      <div className="text-[13px] text-slate-500 flex items-center gap-2">
        <Link to="/spaces" className="hover:text-brand-red">
          Task Hub
        </Link>
        <span>/</span>
        <span className="text-slate-700">Task Details</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Task Details</h2>
        <div className="flex items-center gap-2">
          {showStopRepeating ? (
            <button
              type="button"
              onClick={() => void handleStopRepeating()}
              disabled={stoppingRecurrence}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Octagon size={14} />
              {stoppingRecurrence ? 'Stopping...' : 'Stop repeating'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate('/spaces')}
            className="px-3 py-1.5 rounded-lg border border-brand-red/20 bg-rose-50 text-brand-red text-sm font-semibold hover:bg-rose-100"
          >
            Back
          </button>
        </div>
      </div>

      {loading ? <p className="text-slate-500 text-sm">Loading...</p> : null}
      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

      {!loading && !error && task ? (
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Title</p>
              <div className="flex flex-wrap items-center gap-2 break-words">
                {showRecurringBadge ? (
                  <span
                    className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 px-1 text-[10px] font-bold uppercase tracking-[0.04em] text-brand-red"
                    title="Repeating task"
                  >
                    R
                  </span>
                ) : null}
                <p className="font-bold text-slate-900">{task.title}</p>
              </div>
            </div>
            {showRecurringBadge ? (
              <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
                <p className="text-slate-500">Repeating</p>
                <p className="text-slate-900">
                  {showStopRepeating
                    ? 'This task is part of an active repeat schedule.'
                    : 'This task is part of a repeat schedule that has been stopped.'}
                </p>
              </div>
            ) : null}
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Description</p>
              <div className="text-slate-900 whitespace-pre-wrap break-words">
                {task.description?.trim() ? task.description : <span className="text-slate-400">-</span>}
              </div>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Document</p>
              <div className="text-slate-900 break-words">
                {task.documentUrl ? (
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="text-blue-700 hover:underline text-left disabled:opacity-60 disabled:cursor-not-allowed disabled:no-underline"
                  >
                    {downloading ? 'Downloading...' : `Download ${task.documentName || 'document'}`}
                  </button>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Project</p>
              <p className="text-slate-900 break-words">{projectLabel}</p>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Assignee</p>
              <p className="text-slate-900 break-words">
                {task.assigneeName || task.assigneeId || 'Unassigned'}
              </p>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Due Date</p>
              <p className="text-slate-900 break-words">{dash(task.dueDate)}</p>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Priority</p>
              <p className="text-slate-900 capitalize break-words">{dash(task.priority)}</p>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Status</p>
              <div>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {normalizeStatusLabel(task.status)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Created By</p>
              <p className="text-slate-900 break-words">{dash(task.createdByName || task.createdByEmpId)}</p>
            </div>
          </div>
        </section>
      ) : null}

    </div>
  );
};

export default SpacesTaskDetailView;
